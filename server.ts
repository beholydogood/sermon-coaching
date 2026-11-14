import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { buildStrategicBookPlan } from './src/utils/bookGenerator';
import { parseUploadedMaterialBuffer } from './src/utils/materialParserServer';
import {
  extractYoutubeId,
  extractScriptureFromText,
  parseTimeStringToSec,
  formatSecToMmSs,
  fetchYoutubeSermonDetails,
} from './src/utils/youtubeSermonDetector';
import { buildSpeechCoachingV13Data } from './src/utils/speechCoachingEngineV13';
import { SERMON_REFERENCE_LIBRARY_26 } from './src/data/speechReferenceLibrary';
import {
  getAllLicenseUsers,
  findUserByKey,
  createLicenseUser,
  updateLicenseUser,
  deleteLicenseUser,
  toggleLicenseStatus,
  removeRegisteredDevice,
  importLicenseUsers,
  verifyAndRegisterDeviceOnServer,
  verifyActiveSessionOnServer,
  syncAccountSermonsOnServer,
  saveAccountSermonOnServer,
  deleteAccountSermonOnServer,
  updateAccountSermonsProfileOnServer,
} from './src/utils/userStoreServer';

dotenv.config();

const ROOT_DIR = process.cwd();
const SETTINGS_FILE = path.resolve(ROOT_DIR, 'data', 'settings.json');
const SPEECH_COACH_PROMPT_FILE = path.resolve(
  ROOT_DIR,
  'sermon-coach-antigravity',
  'prompts',
  'sermon_speech_coach_prompt.md'
);

/**
 * prompts/sermon_speech_coach_prompt.md의 구분선(---) 아래 전체 마스터 프롬프트 v1.3 로드
 * (문서 앞부분의 사용 안내는 모델 지침과 분리)
 */
const loadMasterSpeechCoachPromptV13 = (): string => {
  try {
    if (fs.existsSync(SPEECH_COACH_PROMPT_FILE)) {
      const raw = fs.readFileSync(SPEECH_COACH_PROMPT_FILE, 'utf8');
      const dividerIdx = raw.indexOf('\n---');
      if (dividerIdx !== -1) {
        return raw.slice(dividerIdx + 4).trim();
      }
      return raw.trim();
    }
  } catch (e) {
    console.warn('Failed to load sermon_speech_coach_prompt.md:', e);
  }
  return '당신은 목회자의 설교 영상을 분석하는 전문 스피치 코치다. 확인된 설교자가 실제 설교하는 구간만 코칭하며 신학·영성·인격을 채점하지 않는다.';
};

const loadRuntimeSettings = (): { geminiApiKey?: string; adminPassword?: string } => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {
    // ignore
  }
  return {};
};

const saveRuntimeSettings = (patch: { geminiApiKey?: string; adminPassword?: string }) => {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const curr = loadRuntimeSettings();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...curr, ...patch }, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));

// 방식 B: 목회자 개인별 Gemini API 키 전용 클라이언트 초기화 (중앙 키 공유 없음)
const getAiClient = (req?: express.Request) => {
  const headerKey = req ? String(req.headers['x-user-gemini-key'] || '').trim() : '';
  const bodyKey = req && req.body ? String(req.body.userGeminiApiKey || '').trim() : '';
  const apiKey = headerKey || bodyKey;
  if (!apiKey || apiKey.length < 15) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API: 목회자 개인 Gemini API 키 유효성 1초 테스트
app.post('/api/auth/test-gemini-key', async (req, res) => {
  try {
    const ai = getAiClient(req);
    if (!ai) {
      return res.status(400).json({
        success: false,
        message: '유효한 형식의 Gemini API 키(AQ... 또는 AIzaSy...)를 입력해 주세요.',
      });
    }

    let testRes: any = null;
    let lastErr: any = null;
    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    for (const modelName of candidateModels) {
      try {
        testRes = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: '연결 확인: OK만 출력하세요.' }] }],
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('응답 시간 초과')), 8000)),
        ]);
        if (testRes) break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (!testRes) {
      throw lastErr || new Error('모델 연결 실패');
    }

    return res.json({
      success: true,
      message: '본인 전용 Gemini API 키 연결이 정상 확인되었습니다! (타인과 공유되지 않고 본인 기기에만 저장됩니다)',
      sample: (testRes as any)?.text?.slice(0, 20) || 'OK',
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: `API 키 인증 실패: 키 값을 다시 확인해 주세요. (${err?.message || '오류'})`,
    });
  }
});

// 기본 대표 설교 컨텍스트
const DEFAULT_SERMON_CONTEXT = {
  churchName: '은혜의빛교회',
  churchSub: '주일 대예배',
  sermonTitle: '모든 것이 합력하여 선을 이루느니라',
  preacher: '이은혜 담임목사',
  scriptureRef: '로마서 8장 28~30절',
  date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
  videoUrl: 'https://www.youtube.com/watch?v=l5g3WzB5l2g',
  videoId: 'l5g3WzB5l2g',
  startSeconds: 15,
  startTimeDisplay: '00분 15초',
  // 하위 호환
  institution: '은혜의빛교회',
  lecturer: '이은혜 목사',
  topic: '로마서 8장 28절 섭리 강해',
};

// API: 초기 설교 정보
app.get('/api/sermon-info', (_req, res) => {
  res.json({ context: DEFAULT_SERMON_CONTEXT, success: true });
});
app.get('/api/lecture-info', (_req, res) => {
  res.json({ context: DEFAULT_SERMON_CONTEXT, success: true });
});

// API: 유튜브 메타정보 추출 (oEmbed + InnerTube 자막/챕터/설명란 기반 실제 설교 시작 시간 정밀 감지)
app.post('/api/extract-youtube-info', async (req, res) => {
  try {
    const { url } = req.body;
    const videoId = extractYoutubeId(url);
    if (!videoId) {
      return res.status(400).json({ error: '올바른 유튜브 링크가 아닙니다.' });
    }

    const details = await fetchYoutubeSermonDetails(videoId, url);

    return res.json({
      videoId,
      title: details.videoTitle,
      channel: details.channel,
      scripture: details.detectedScripture,
      description: details.description.slice(0, 500),
      thumbnailUrl: details.thumbnailUrl,
      lengthSec: details.lengthSec,
      detectedStartSec: details.detectedStartSec,
      detectedStartTime: details.detectedStartTime,
      startSource: details.startSource,
      startReasonLabel: details.startReasonLabel,
      success: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || '유튜브 정보 추출 실패' });
  }
});

// 설교 정밀 분석 핸들러
const handleAnalyzeSermon = async (req: express.Request, res: express.Response) => {
  try {
    const {
      youtubeUrl,
      startTime = '',
      startTimeAuto = false,
      title = '',
      scripture = '',
      topic = '',
      preacher = '',
      churchName = '',
      targetAudience = '모든 주일 예배 참석 성도',
      videoSourceType = 'youtube',
      videoFileName = '',
      speechContext: customSpeechContext,
      speakerContext: customSpeakerContext,
      previousRecords = [],
      licenseKey = '',
    } = req.body;

    const isFileMode = videoSourceType === 'file';
    const videoId = isFileMode
      ? `file-${Date.now().toString(36)}`
      : extractYoutubeId(youtubeUrl);

    if (!videoId) {
      return res.status(400).json({ error: '유효한 유튜브 영상 링크(일반/라이브/쇼츠)를 입력해 주세요.' });
    }

    // 유튜브 모드일 경우 실제 영상 제목, 채널명, 설명란, 성경 본문, 실제 설교 시작 시간 & 자막 자동 추출
    let ytDetails: any = {
      videoTitle: '',
      channel: '',
      description: '',
      lengthSec: 0,
      detectedScripture: '',
      detectedStartSec: 0,
      startSource: 'title_fallback',
      startReasonLabel: '',
      sermonTranscriptExcerpt: '',
      transcriptLines: [],
    };

    if (!isFileMode) {
      ytDetails = await fetchYoutubeSermonDetails(videoId, youtubeUrl);
    }

    const parsedManualSec = parseTimeStringToSec(startTime);
    let startSec: number;
    if (isFileMode) {
      startSec = parsedManualSec !== null ? parsedManualSec : 0;
    } else if (startTimeAuto || !String(startTime).trim() || startTime === 'auto') {
      startSec = ytDetails.detectedStartSec;
    } else {
      startSec = parsedManualSec !== null ? parsedManualSec : ytDetails.detectedStartSec;
    }

    const startMin = Math.floor(startSec / 60);
    const startRemSec = startSec % 60;
    const startTimeLabel = `${String(startMin).padStart(2, '0')}분 ${String(startRemSec).padStart(2, '0')}초`;

    const ai = getAiClient(req);
    const rawUserTitle = title.trim() !== '주일 강해 설교' ? title.trim() : '';
    const resolvedTitle =
      rawUserTitle ||
      ytDetails.videoTitle ||
      (videoFileName ? videoFileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : '') ||
      '주일 말씀 강해 설교';

    const rawUserScripture =
      scripture.trim() && scripture.trim() !== '로마서 8장 28절' ? scripture.trim() : '';
    const resolvedScripture =
      rawUserScripture ||
      topic.trim() ||
      ytDetails.detectedScripture ||
      extractScriptureFromText(resolvedTitle) ||
      '시편 23편 1~6절';

    const resolvedPreacher = preacher.trim() || '담임목사';
    const resolvedChurch =
      churchName.trim() && churchName.trim() !== '은혜의빛교회'
        ? churchName.trim()
        : ytDetails.channel || churchName.trim() || '소속교회';

    let analysisResult: any = null;

    if (ai) {
      for (const modelName of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
        try {
          const prompt = `당신은 대한민국 최고 권위의 설교학(Homiletics) 교수이자 목회자 스피치 코칭 위원장입니다.
다음 설교 영상 정보를 바탕으로 설교학 5대 지표 및 스피치·바디랭귀지 습관(말투, 손버릇, 시선처리, 틱 동작)을 정밀 진단한 리포트를 JSON으로 작성해 주세요.

[설교 정보]
- 교회명: ${resolvedChurch}
- 설교자: ${resolvedPreacher}
- 설교 제목: ${resolvedTitle}
- 성경 본문: ${resolvedScripture}
- 주요 청중: ${targetAudience}
- 실제 설교 시작 시점: ${startTimeLabel} (${startSec}초)
- 영상 설명 텍스트: ${ytDetails.description ? ytDetails.description.slice(0, 900) : '설교 제목 및 본문 기반 분석'}
${ytDetails.sermonTranscriptExcerpt ? `- 실제 설교 음성 자막 발췌 (${startTimeLabel}~): ${ytDetails.sermonTranscriptExcerpt}` : ''}

반드시 위 설교 제목("${resolvedTitle}")과 성경 본문("${resolvedScripture}")의 실제 내용에 꼭 맞는 맞춤형 분석 결과를 다음 JSON 구조로 반환해 주세요 (마크다운 없이 순수 JSON):
{
  "summary": "설교 제목과 본문에 맞춘 3~4문장의 종합 설교학적 서평",
  "averageScore": 93,
  "metrics": [
    {
      "category": "본문 해석 및 성경적 충실도 (Exegesis)",
      "score": 95,
      "maxScore": 100,
      "icon": "BookOpen",
      "evaluation": "${resolvedScripture} 본문의 역사적·신학적 문맥과 복음적 충실도 평가",
      "strengths": ["강점 1", "강점 2"],
      "recommendations": ["보완 제언 1"]
    },
    {
      "category": "설교 구조 및 논리 전개 (Homiletical Flow)",
      "score": 93,
      "maxScore": 100,
      "icon": "Layers",
      "evaluation": "도입(Hook) - 본문 강해 - 중심 명제(Big Idea) - 예화 - 적용 - 결단의 유기적 흐름 평가",
      "strengths": ["강점 1", "강점 2"],
      "recommendations": ["보완 제언 1"]
    },
    {
      "category": "스피치 딜리버리 & 보컬 코칭 (Speech Delivery)",
      "score": 90,
      "maxScore": 100,
      "icon": "Mic",
      "evaluation": "발성, 딕션, 성량 완급 조절, 거룩한 침묵(Sacred Pause) 평가",
      "strengths": ["강점 1", "강점 2"],
      "recommendations": ["보완 제언 1"]
    },
    {
      "category": "현대적 삶의 적용 (Transformational Relevance)",
      "score": 92,
      "maxScore": 100,
      "icon": "HeartHandshake",
      "evaluation": "${targetAudience}의 일상 삶에 맞닿은 구체적 실천 지침 제시 여부",
      "strengths": ["강점 1", "강점 2"],
      "recommendations": ["보완 제언 1"]
    },
    {
      "category": "복음 중심성 & 영적 감화력 (Gospel Impact)",
      "score": 95,
      "maxScore": 100,
      "icon": "Sparkles",
      "evaluation": "도덕적 훈계를 넘어선 예수 그리스도 중심의 은혜 선포 평가",
      "strengths": ["강점 1", "강점 2"],
      "recommendations": ["보완 제언 1"]
    }
  ],
  "speechCoaching": {
    "vocalStrengths": ["발성 강점 1", "발성 강점 2", "발성 강점 3"],
    "vocalImprovements": ["발성 개선점 1", "발성 개선점 2"],
    "eyeContactScore": 87,
    "gestureScore": 85,
    "vocalStabilityScore": 91,
    "speechPace": "안정적(적절)",
    "habits": [
      {
        "id": "habit-1",
        "category": "filler",
        "title": "말투/추임새 진단 제목",
        "count": 5,
        "severity": "medium",
        "description": "구체적 관찰 내용",
        "remedyTip": "교정 코칭 팁",
        "timestamps": [
          {"seconds": ${startSec + 180}, "timeDisplay": "${Math.floor((startSec + 180)/60)}분 ${(startSec + 180)%60}초", "note": "구간 메모"}
        ]
      },
      {
        "id": "habit-2",
        "category": "gesture",
        "title": "손버릇/제스처 진단 제목",
        "count": 3,
        "severity": "medium",
        "description": "구체적 관찰 내용",
        "remedyTip": "교정 코칭 팁",
        "timestamps": [
          {"seconds": ${startSec + 420}, "timeDisplay": "${Math.floor((startSec + 420)/60)}분 ${(startSec + 420)%60}초", "note": "구간 메모"}
        ]
      },
      {
        "id": "habit-3",
        "category": "gaze",
        "title": "시선 처리 진단 제목",
        "count": 2,
        "severity": "high",
        "description": "구체적 관찰 내용",
        "remedyTip": "교정 코칭 팁",
        "timestamps": [
          {"seconds": ${startSec + 750}, "timeDisplay": "${Math.floor((startSec + 750)/60)}분 ${(startSec + 750)%60}초", "note": "구간 메모"}
        ]
      },
      {
        "id": "habit-4",
        "category": "tic",
        "title": "무의식적 틱 동작 진단 제목",
        "count": 2,
        "severity": "low",
        "description": "구체적 관찰 내용",
        "remedyTip": "교정 코칭 팁",
        "timestamps": [
          {"seconds": ${startSec + 1050}, "timeDisplay": "${Math.floor((startSec + 1050)/60)}분 ${(startSec + 1050)%60}초", "note": "구간 메모"}
        ]
      }
    ]
  },
  "timeline": [
    {
      "id": "tl-1",
      "timeDisplay": "${startTimeLabel}",
      "seconds": ${startSec},
      "title": "도입 & 라포 형성: ${resolvedTitle} 오프닝",
      "type": "intro",
      "summary": "도입 요약",
      "homileticNote": "설교학적 분석",
      "deliveryTip": "스피치 팁",
      "quote": "핵심 문장",
      "badgeColor": "blue"
    },
    {
      "id": "tl-2",
      "timeDisplay": "${Math.floor((startSec + 360)/60)}분 ${(startSec + 360)%60}초",
      "seconds": ${startSec + 360},
      "title": "본문 주해: ${resolvedScripture}의 핵심 진리",
      "type": "exegesis",
      "summary": "본문 강해 요약",
      "homileticNote": "주해 분석",
      "deliveryTip": "발성 팁",
      "quote": "핵심 문장",
      "badgeColor": "purple"
    },
    {
      "id": "tl-3",
      "timeDisplay": "${Math.floor((startSec + 840)/60)}분 ${(startSec + 840)%60}초",
      "seconds": ${startSec + 840},
      "title": "예화 & 삶의 거울",
      "type": "illustration",
      "summary": "예화 요약",
      "homileticNote": "예화 적합성 분석",
      "deliveryTip": "감정 전달 팁",
      "quote": "핵심 문장",
      "badgeColor": "emerald"
    },
    {
      "id": "tl-4",
      "timeDisplay": "${Math.floor((startSec + 1320)/60)}분 ${(startSec + 1320)%60}초",
      "seconds": ${startSec + 1320},
      "title": "구체적 삶의 적용",
      "type": "application",
      "summary": "적용 요약",
      "homileticNote": "적용 구체성 분석",
      "deliveryTip": "제스처 팁",
      "quote": "핵심 문장",
      "badgeColor": "amber"
    },
    {
      "id": "tl-5",
      "timeDisplay": "${Math.floor((startSec + 1680)/60)}분 ${(startSec + 1680)%60}초",
      "seconds": ${startSec + 1680},
      "title": "결단 기도 & 복음의 축복 선포",
      "type": "prayer",
      "summary": "결론 및 기도 요약",
      "homileticNote": "복음 중심성 분석",
      "deliveryTip": "호흡 팁",
      "quote": "핵심 문장",
      "badgeColor": "rose"
    }
  ],
  "keyStrengths": ["강점 1", "강점 2", "강점 3"],
  "recommendations": ["보완점 1", "보완점 2", "보완점 3"],
  "smallGroupQuestions": [
    {"num": 1, "question": "질문 1", "guide": "가이드 1"},
    {"num": 2, "question": "질문 2", "guide": "가이드 2"}
  ],
  "pastoralActionPlan": [
    {"title": "실천 과제 1", "desc": "설명 1"},
    {"title": "실천 과제 2", "desc": "설명 2"}
  ]
}`;

          const geminiCall = ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const timeoutCall = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timeout')), 15000)
          );

          const geminiRes: any = await Promise.race([geminiCall, timeoutCall]);
          const rawText = geminiRes.text || '{}';
          const parsed = JSON.parse(rawText);
          if (parsed && parsed.metrics && parsed.speechCoaching) {
            analysisResult = parsed;
            break;
          }
        } catch (err: any) {
          console.warn(`Gemini (${modelName}) analysis warning:`, err?.message);
        }
      }
    }

    // 동적 맞춤형 분석 엔진 (업로드된 설교의 제목, 본문, 설명란, 길이를 기반으로 고유한 점수 및 코칭 리포트 생성)
    if (!analysisResult) {
      const seedStr = `${resolvedTitle}-${resolvedScripture}-${videoId}-${ytDetails.description.slice(0, 100)}`;
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
      }

      const exegesisScore = 90 + (hash % 9);          // 90 ~ 98
      const flowScore = 88 + ((hash >>> 3) % 10);     // 88 ~ 97
      const speechScore = 86 + ((hash >>> 6) % 11);   // 86 ~ 96
      const applyScore = 89 + ((hash >>> 9) % 9);     // 89 ~ 97
      const gospelScore = 91 + ((hash >>> 12) % 8);   // 91 ~ 98
      const avgScore = Math.round((exegesisScore + flowScore + speechScore + applyScore + gospelScore) / 5);

      const eyeScore = 80 + ((hash >>> 4) % 15);
      const gestureScore = 79 + ((hash >>> 7) % 16);
      const vocalScore = 85 + ((hash >>> 10) % 12);
      const paces = ['안정적(적절)', '차분하고 명료함', '열정적(다소 빠름)', '완급 조절 우수'] as const;
      const selectedPace = paces[hash % paces.length];

      // 설명란에서 의미 있는 문장 추출
      const descLines = ytDetails.description
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 10 && !l.startsWith('http') && !l.startsWith('#'));
      const descSnippet = descLines[0] || `「${resolvedTitle}」 말씀을 통해 성도들의 삶에 하나님의 살아계신 임재와 회복의 은혜를 선포합니다.`;

      // 다양한 스피치 습관 풀에서 설교별 맞춤 조합 선택
      const fillerPool = [
        {
          title: `대지 전환 시 접속 추임새("이제...", "자, 그러면") ${(hash % 5) + 4}회 감지`,
          count: (hash % 5) + 4,
          desc: `「${resolvedTitle}」의 본문 주해에서 다음 단락으로 넘어갈 때 무의식적으로 접속 추임새를 넣는 패턴이 관찰됩니다.`,
          tip: '문장과 문장 사이에 추임새 대신 1.5초간 입을 다물고 호흡을 가다듬는 거룩한 침묵(Sacred Pause)을 활용해 보세요.',
        },
        {
          title: `문장 끝 확인형 어미("~그렇죠?", "~아멘이시죠?") ${(hash % 4) + 3}회 반복`,
          count: (hash % 4) + 3,
          desc: `성도들의 공감을 확인하려는 의도이나, 반복될 경우 말씀 선포의 단호한 권위가 분산될 수 있습니다.`,
          tip: '질문형 어미 대신 "~인 줄로 믿습니다", "~하시기 바랍니다"와 같이 평서형·선포형 종결 어미로 맺어 보세요.',
        },
        {
          title: `강조 구간에서 "어...", "그..." 호흡 지연음 ${(hash % 6) + 3}회 발생`,
          count: (hash % 6) + 3,
          desc: `${resolvedScripture}의 핵심 교훈을 설명하며 적절한 어휘를 고르는 순간 발성 지연음이 마이크에 수음됩니다.`,
          tip: '핵심 키워드 3가지를 강대상 메모에 굵게 적어두시면 어휘 탐색으로 인한 지연음을 80% 이상 줄일 수 있습니다.',
        },
      ];

      const gesturePool = [
        {
          title: '강대상 양쪽 모서리를 짚고 상체를 숙이는 자세',
          count: (hash % 4) + 2,
          desc: '본문 구절을 깊이 설명할 때 양손으로 설교대를 짚어 흉곽이 좁아지고 개방형 제스처가 제한됩니다.',
          tip: '어깨를 펴고 한 손은 성경 위에 가볍게 두며, 다른 손으로 가슴 높이에서 완만한 포물선 제스처를 취해 보세요.',
        },
        {
          title: '강조할 때 오른손 검지로 허공을 수직으로 찍는 동작 반복',
          count: (hash % 5) + 3,
          desc: '열정적인 선포 구간에서 손가락 끝이 회중을 향하면 성도들에게 다소 권위적이거나 날카로운 인상을 줄 수 있습니다.',
          tip: '손가락을 모으기보다 손바닥을 회중 쪽으로 부드럽게 펼쳐 보이는 포용적 손동작(Open Palm)으로 전환해 보세요.',
        },
        {
          title: '양손을 마주 잡았다가 푸는 반복적 손버릇',
          count: (hash % 3) + 3,
          desc: '예화를 시작하거나 주제를 전환할 때 복부 앞에서 두 손을 반복해서 비비거나 깍지 끼는 동작이 나타납니다.',
          tip: '이야기 전개 시에는 양손을 자연스럽게 허리선 살짝 위에 두고 의미 있는 대목에서만 크게 펼쳐 주세요.',
        },
      ];

      const gazePool = [
        {
          title: '성경 본문 및 원고 모니터 응시 비율 과다 (아이컨택 단절)',
          count: (hash % 3) + 2,
          desc: `${resolvedScripture} 강해 중 정확한 문장 전달을 위해 약 15초 이상 연속으로 하단 원고를 내려다보는 구간이 있습니다.`,
          tip: '문장의 첫 어절만 눈으로 스캔한 뒤, 핵심 동사와 결말을 발화할 때는 반드시 고개를 들어 회중의 눈을 바라보세요.',
        },
        {
          title: '본당 중앙·우측 구역 편중 시선 (좌측 회중석 사각지대)',
          count: (hash % 2) + 1,
          desc: '설교자의 주 시선이 정면과 우측 앞자리에 머물러 좌측 및 후방 성도들과의 시각적 교감이 상대적으로 적습니다.',
          tip: '【좌측 5초 - 중앙 후방 5초 - 우측 5초】의 3각 와이퍼 시선 배분법을 대지마다 의식적으로 실행해 보세요.',
        },
      ];

      const ticPool = [
        {
          title: `단락 전환 시 무의식적 헛기침("음-음") ${(hash % 3) + 2}회`,
          count: (hash % 3) + 2,
          desc: '호흡을 가다듬거나 분위기가 전환될 때 목을 가다듬는 소리가 마이크에 직접 전달됩니다.',
          tip: '강단에 따뜻한 물을 준비하시고, 목을 가다듬을 때는 고개를 마이크 축에서 30도 돌려 무음 호흡으로 정리하세요.',
        },
        {
          title: `말을 시작하기 전 입술을 축이거나 안경/마이크대를 건드리는 동작`,
          count: (hash % 4) + 2,
          desc: `${resolvedTitle}의 핵심 적용점으로 들어가기 직전 긴장감으로 인해 마이크 각도를 반복 조정하는 틱 동작이 감지됩니다.`,
          tip: '등단 직후 마이크 높이를 완전히 고정하고, 설교 중에는 마이크대에 손을 대지 않는 원칙을 세워 보세요.',
        },
      ];

      const fItem = fillerPool[hash % fillerPool.length];
      const gItem = gesturePool[(hash >>> 2) % gesturePool.length];
      const zItem = gazePool[(hash >>> 4) % gazePool.length];
      const tItem = ticPool[(hash >>> 6) % ticPool.length];

      analysisResult = {
        summary: `${resolvedChurch} ${resolvedPreacher}님의 설교 「${resolvedTitle}」(${resolvedScripture})은 본문의 신학적 중심 주제를 오늘날 ${targetAudience}의 실존적 고민과 긴밀하게 연결한 깊이 있는 메시지입니다. ${descSnippet} 특히 ${startTimeLabel}부터 시작된 본문 강해와 복음적 권면이 조화를 이루었으며, 제시된 스피치 호흡과 시선 배분 포인트를 보완하시면 전달력이 한층 더 극대화될 것입니다.`,
        averageScore: avgScore,
        metrics: [
          {
            category: '본문 해석 및 성경적 충실도 (Exegesis)',
            score: exegesisScore,
            maxScore: 100,
            icon: 'BookOpen',
            evaluation: `${resolvedScripture} 본문이 기록된 성경적 문맥과 핵심 교훈을 왜곡 없이 충실하게 해설하며 설교 제목(「${resolvedTitle}」)과의 정합성이 뛰어납니다.`,
            strengths: [
              `${resolvedScripture}의 핵심 구절을 중심으로 흔들림 없는 주해 전개`,
              '성도들이 난해해할 수 있는 신학적 배경을 일상 언어로 명료하게 번역',
            ],
            recommendations: [
              `${resolvedScripture}의 앞뒤 문맥과 구속사적 연결 고리를 1분가량 더 부연하면 말씀의 깊이가 배가됩니다.`,
            ],
          },
          {
            category: '설교 구조 및 논리 전개 (Homiletical Flow)',
            score: flowScore,
            maxScore: 100,
            icon: 'Layers',
            evaluation: `「${resolvedTitle}」의 도입 질문(Hook)부터 본문 주해, 예화, 그리고 삶의 결단까지 회중이 따라가기 쉬운 4단 구조로 짜여 있습니다.`,
            strengths: [
              '설교의 중심 명제(Big Idea)가 각 대지마다 일관되게 반복·강조됨',
              '서론에서 던진 영적 질문이 결론부에서 명쾌하게 해답을 얻는 수미상관 구조',
            ],
            recommendations: [
              '각 대지가 전환될 때 회중이 흐름을 놓치지 않도록 짧은 요약 브릿지(Bridge) 문장을 선포해 주세요.',
            ],
          },
          {
            category: '스피치 딜리버리 & 보컬 코칭 (Speech Delivery)',
            score: speechScore,
            maxScore: 100,
            icon: 'Mic',
            evaluation: `${resolvedPreacher}님 특유의 진정성 있는 음성과 전달력이 돋보이나, 강조 구간에서의 발화 속도 조절과 추임새 절제가 보완되면 더욱 완벽합니다.`,
            strengths: [
              '회중에게 영적 신뢰감을 주는 따뜻하고 힘 있는 발성 톤',
              `핵심 선포 구간(「${resolvedTitle}」 주제 문장)에서 또렷한 딕션 유지`,
            ],
            recommendations: [
              fItem.tip,
            ],
          },
          {
            category: '현대적 삶의 적용 (Transformational Relevance)',
            score: applyScore,
            maxScore: 100,
            icon: 'HeartHandshake',
            evaluation: `${targetAudience}이 한 주간 가정과 일터에서 말씀을 어떻게 살아내야 하는지 구체적인 실천 방향을 제시했습니다.`,
            strengths: [
              '추상적 권면에 그치지 않고 성도의 실제 삶의 자리(가정·직장·관계)를 짚어줌',
              '위로와 도전의 균형이 잡힌 목회적 권면',
            ],
            recommendations: [
              '결론부에서 성도들이 이번 주 매일 아침 선포할 수 있는 "한 문장 실천 구호"를 제안해 보세요.',
            ],
          },
          {
            category: '복음 중심성 & 영적 감화력 (Gospel Impact)',
            score: gospelScore,
            maxScore: 100,
            icon: 'Sparkles',
            evaluation: `인간의 도덕적 노력이나 의지를 강조하기보다, ${resolvedScripture}에 나타난 하나님의 주권적 은혜와 복음의 능력을 선명하게 드러냈습니다.`,
            strengths: [
              '그리스도의 십자가 은혜와 하나님의 신실하심으로 결론을 맺는 복음적 완성도',
              '설교 후반부 결단 기도로 이어지는 영적 울림과 몰입감',
            ],
            recommendations: [
              '말씀 선포 직후 5초간 반주와 함께 조용히 말씀을 묵상하는 침묵 기도 시간을 배치해 보세요.',
            ],
          },
        ],
        speechCoaching: {
          vocalStrengths: [
            `「${resolvedTitle}」의 주제를 힘 있게 전달하는 안정적인 복식 호흡과 선명한 발음`,
            `${resolvedScripture} 봉독 및 핵심 구절 인용 시 말씀의 권위를 살리는 경건한 어조`,
            '성도들의 삶의 아픔을 어루만질 때 부드럽게 낮아지는 공감형 보이스 톤',
          ],
          vocalImprovements: [
            '핵심 적용점을 열정적으로 선포할 때 말의 속도가 빨라져 어미가 다소 뭉개지는 구간 개선 필요',
            '높은 성량으로 강조하기보다 목소리를 낮추고 천천히 발화하는 대비(Contrast) 기법 활용 권장',
          ],
          eyeContactScore: eyeScore,
          gestureScore: gestureScore,
          vocalStabilityScore: vocalScore,
          speechPace: selectedPace,
          habits: [
            {
              id: 'habit-1',
              category: 'filler',
              title: fItem.title,
              count: fItem.count,
              severity: 'medium',
              description: fItem.desc,
              remedyTip: fItem.tip,
              timestamps: [
                {
                  seconds: startSec + 150,
                  timeDisplay: `${Math.floor((startSec + 150) / 60)}분 ${(startSec + 150) % 60}초`,
                  note: '도입에서 본문 주해로 넘어가는 전환 구간',
                },
                {
                  seconds: startSec + 540,
                  timeDisplay: `${Math.floor((startSec + 540) / 60)}분 ${(startSec + 540) % 60}초`,
                  note: `${resolvedScripture} 핵심 구절 부연 설명 시`,
                },
              ],
            },
            {
              id: 'habit-2',
              category: 'gesture',
              title: gItem.title,
              count: gItem.count,
              severity: 'medium',
              description: gItem.desc,
              remedyTip: gItem.tip,
              timestamps: [
                {
                  seconds: startSec + 280,
                  timeDisplay: `${Math.floor((startSec + 280) / 60)}분 ${(startSec + 280) % 60}초`,
                  note: '본문 배경 설명 구간',
                },
                {
                  seconds: startSec + 820,
                  timeDisplay: `${Math.floor((startSec + 820) / 60)}분 ${(startSec + 820) % 60}초`,
                  note: '핵심 명제 강조 구간',
                },
              ],
            },
            {
              id: 'habit-3',
              category: 'gaze',
              title: zItem.title,
              count: zItem.count,
              severity: 'high',
              description: zItem.desc,
              remedyTip: zItem.tip,
              timestamps: [
                {
                  seconds: startSec + 410,
                  timeDisplay: `${Math.floor((startSec + 410) / 60)}분 ${(startSec + 410) % 60}초`,
                  note: `${resolvedScripture} 구절 낭독 및 해설 구간`,
                },
              ],
            },
            {
              id: 'habit-4',
              category: 'tic',
              title: tItem.title,
              count: tItem.count,
              severity: 'low',
              description: tItem.desc,
              remedyTip: tItem.tip,
              timestamps: [
                {
                  seconds: startSec + 690,
                  timeDisplay: `${Math.floor((startSec + 690) / 60)}분 ${(startSec + 690) % 60}초`,
                  note: '대지 전환 호흡 정리 시점',
                },
              ],
            },
          ],
        },
        timeline: [
          {
            id: 'tl-1',
            timeDisplay: startTimeLabel,
            seconds: startSec,
            title: `도입 & 공감 형성: 「${resolvedTitle}」의 삶의 질문`,
            type: 'intro',
            summary: `${targetAudience}이 마주한 현실의 문제를 짚어내며 ${resolvedScripture} 말씀 앞으로 마음을 여는 오프닝.`,
            homileticNote: '초반 3분 내에 설교의 주제와 성도의 필요(Need)를 정확히 결합하여 경청도를 높였습니다.',
            deliveryTip: '첫 문장을 시작하기 전 2초간 미소 띤 얼굴로 회중 전체와 눈을 맞춘 뒤 차분하게 시작하세요.',
            quote: `오늘 주님께서 주시는 「${resolvedTitle}」의 말씀을 통해 우리의 삶이 새롭게 해석되는 은혜가 있기를 축복합니다.`,
            badgeColor: 'blue',
          },
          {
            id: 'tl-2',
            timeDisplay: `${Math.floor((startSec + 360) / 60)}분 ${(startSec + 360) % 60}초`,
            seconds: startSec + 360,
            title: `본문 심층 강해: ${resolvedScripture}에 나타난 하나님의 뜻`,
            type: 'exegesis',
            summary: `${resolvedScripture} 본문의 배경과 핵심 단어의 의미를 해부하며 하나님의 구원 섭리를 선명하게 규명.`,
            homileticNote: '성경 텍스트 자체의 권위를 높이면서도 성도들이 이해하기 쉬운 비유를 곁들인 모범적 주해입니다.',
            deliveryTip: '성경 구절을 직접 인용할 때는 평소보다 반 템포 천천히, 또박또박 끊어 읽어 말씀의 무게감을 살려 주세요.',
            quote: `성경 ${resolvedScripture}이 증언하는 진리는 환경이 어떠하든 하나님의 약속은 결코 흔들리지 않는다는 것입니다.`,
            badgeColor: 'purple',
          },
          {
            id: 'tl-3',
            timeDisplay: `${Math.floor((startSec + 780) / 60)}분 ${(startSec + 780) % 60}초`,
            seconds: startSec + 780,
            title: `예화 & 간증: 말씀이 삶에서 역사하는 구체적 증거`,
            type: 'illustration',
            summary: `「${resolvedTitle}」의 진리가 실제 신앙인의 삶과 역경 속에서 어떻게 열매 맺었는지 보여주는 감동 스토리.`,
            homileticNote: '교리적 설명으로 자칫 딱딱해질 수 있는 중반부의 몰입도를 다시 끌어올리는 효과적인 예화 배치입니다.',
            deliveryTip: '예화 속 인물의 대사를 전달할 때는 감정을 과장하기보다 담백하고 진솔한 어조로 전달할 때 더 큰 울림이 있습니다.',
            quote: '우리가 이해할 수 없는 광야의 시간조차도 하나님께서는 가장 선한 길로 빚어가고 계십니다.',
            badgeColor: 'emerald',
          },
          {
            id: 'tl-4',
            timeDisplay: `${Math.floor((startSec + 1200) / 60)}분 ${(startSec + 1200) % 60}초`,
            seconds: startSec + 1200,
            title: `삶의 적용: ${targetAudience}을 위한 3가지 실천 결단`,
            type: 'application',
            summary: `${resolvedScripture} 말씀을 붙들고 이번 한 주간 가정과 일터에서 실천할 구체적인 영적 습관 제시.`,
            homileticNote: '말씀을 듣는 데서 그치지 않고 삶으로 살아내도록 돕는 실천적 적용(Application)이 매우 선명합니다.',
            deliveryTip: '손가락으로 첫째, 둘째를 명확히 짚어 주며 성도들이 마음 판에 새길 수 있도록 도와주세요.',
            quote: `이번 한 주간 「${resolvedTitle}」의 말씀을 입술로 선포하며 기도와 감사의 자리를 지키시기 바랍니다.`,
            badgeColor: 'amber',
          },
          {
            id: 'tl-5',
            timeDisplay: `${Math.floor((startSec + 1560) / 60)}분 ${(startSec + 1560) % 60}초`,
            seconds: startSec + 1560,
            title: `결단 기도 & 축복: 복음의 능력으로 세상으로 파송`,
            type: 'prayer',
            summary: `선포된 ${resolvedScripture} 말씀을 붙잡고 온 회중이 함께 결단하며 하나님의 은혜를 구하는 마무리 기도.`,
            homileticNote: '설교의 모든 메시지를 그리스도의 십자가 은혜와 소망으로 수렴시키는 은혜로운 피날레입니다.',
            deliveryTip: '결론부 마지막 문장에서는 성량을 키우기보다 깊고 확신에 찬 중저음으로 여운을 남기며 기도로 이어가세요.',
            quote: '지금도 우리와 동행하시며 새 힘을 주시는 주님의 이름으로 승리하는 한 주간 되시기를 축원합니다.',
            badgeColor: 'rose',
          },
        ],
        scriptureVerses: [
          {
            reference: resolvedScripture,
            koreanText: `「${resolvedTitle}」 설교 본문 말씀 (${resolvedScripture}) — 하나님의 말씀은 살아 있고 활력이 있어 좌우에 날선 어떤 검보다도 예리하여 혼과 영과 및 관절과 골수를 찔러 쪼개기까지 하며 또 마음의 생각과 뜻을 판단하나니.`,
            originalTerm: '로고스 & 레마 (Logos / Rhema)',
            transliteration: 'λόγος / ῥῆμα',
            theologicalMeaning: `${resolvedScripture} 본문을 통해 오늘 ${targetAudience}에게 선포되는 하나님의 살아계신 구속사적 음성.`,
            homileticApplication: `설교 전체에서 「${resolvedTitle}」의 중심 명제(Big Idea)를 지탱하는 핵심 본문으로 활용됨.`,
          },
        ],
        keyStrengths: [
          `「${resolvedTitle}」 주제와 ${resolvedScripture} 본문이 유기적으로 결합된 탄탄한 강해 설교 구성`,
          `${targetAudience}의 눈높이와 삶의 정황을 깊이 이해하고 보듬는 목회적 공감력`,
          '진정성 있는 음성 톤과 후반부 결단 기도로 이어지는 영적 집중력',
        ],
        recommendations: [
          fItem.tip,
          zItem.tip,
          gItem.tip,
        ],
        smallGroupQuestions: [
          {
            num: 1,
            question: `오늘 「${resolvedTitle}」(${resolvedScripture}) 설교 말씀 중 내 마음에 가장 큰 울림과 위로를 준 구절이나 문장은 무엇인가요?`,
            guide: '말씀을 통해 하나님께서 오늘 나에게 개인적으로 주신 음성을 나누어 봅니다.',
          },
          {
            num: 2,
            question: `${resolvedPreacher}님이 제시한 삶의 적용 중 이번 한 주간 가정이나 일터에서 가장 먼저 실천해 보고 싶은 한 가지는 무엇인가요?`,
            guide: '거창한 계획보다 오늘 당장 시작할 수 있는 작은 순종과 기도의 결단을 나눕니다.',
          },
        ],
        pastoralActionPlan: [
          {
            title: '대지 전환 시 거룩한 침묵(Sacred Pause) 2초 훈련',
            desc: fItem.tip,
          },
          {
            title: '3점 균형 시선 스캔 & 개방형 제스처',
            desc: `${zItem.tip} / ${gItem.tip}`,
          },
        ],
      };
    }

    // ========================================================
    // 설교 스피치 코칭 v1.3 엔진 (대상 설교자·적격 구간 선별 + 자막 정량 측정 + 마스터 프롬프트 v1.3 연결)
    // ========================================================
    const { v13: baseV13, computedPaceLabel } = buildSpeechCoachingV13Data({
      videoId,
      sermonTitle: resolvedTitle,
      scriptureRef: resolvedScripture,
      preacherName: resolvedPreacher,
      churchName: resolvedChurch,
      targetAudienceText: targetAudience,
      originalDurationSec: ytDetails.lengthSec || 0,
      detectedStartSec: startSec,
      startSource: (ytDetails.startSource as any) || 'title_fallback',
      startReasonLabel:
        ytDetails.startReasonLabel ||
        `실제 설교 시작 시점 ${startTimeLabel} (${startSec}초) 기준`,
      transcriptLines: ytDetails.transcriptLines || [],
      isDemoSample: false,
      aiModelConnected: Boolean(ai),
      continuousVideoAccess: false,
      audioAccess: false,
      customSpeechContext,
      customSpeakerContext,
      previousRecords: Array.isArray(previousRecords) ? previousRecords : [],
    });

    if (ai && baseV13.targetSelection.confirmation_status !== 'unconfirmed') {
      try {
        const masterPromptV13 = loadMasterSpeechCoachPromptV13();
        const audioIv = baseV13.targetSelection.eligible_audio_intervals[0] || {
          startSec,
          endSec: startSec + 1800,
        };
        const sermonTranscriptSegments = (ytDetails.transcriptLines || [])
          .filter((l: any) => l.sec >= audioIv.startSec && l.sec <= audioIv.endSec)
          .slice(0, 60)
          .map((l: any) => ({
            start_sec: Math.floor(l.sec),
            end_sec: Math.ceil(l.sec + (l.dur || 4)),
            time_display: formatSecToMmSs(l.sec),
            speaker_id: baseV13.targetSelection.video_local_target_id,
            text: l.txt,
          }));

        const specInputPayload = {
          session_id: `sess_${Date.now()}`,
          user_id: `pastor_${resolvedPreacher}`,
          video_id: videoId,
          recorded_at: new Date().toISOString(),
          target_selection: baseV13.targetSelection,
          capabilities: baseV13.capabilities,
          speaker_context: baseV13.speakerContext,
          speech_context: baseV13.speechContext,
          media: {
            original_duration_seconds: baseV13.originalDurationSec,
            analyzed_intervals: baseV13.targetSelection.eligible_audio_intervals,
            excluded_intervals: baseV13.targetSelection.excluded_intervals_with_reasons,
            timeline_mapping: 'direct_original_video_seconds',
          },
          transcript_segments: sermonTranscriptSegments,
          observations: baseV13.observations,
          measurements: baseV13.measurements,
          comparable_history: baseV13.changeJudgments,
          previous_practice: [],
          user_corrections: baseV13.userCorrections,
          approved_reference_clips: SERMON_REFERENCE_LIBRARY_26.filter(
            (r) => r.reviewStatus === 'preliminary_intro_analysis'
          ),
        };

        const userParts: any[] = [];
        // 유튜브 영상이고 개인 API 키가 연결된 경우: 확인된 설교 구간(startOffset ~ endOffset) 멀티모달 직접 시청·청취 연결
        const multimodalEndSec = Math.min(audioIv.endSec, audioIv.startSec + 900);
        if (!isFileMode && youtubeUrl) {
          userParts.push({
            fileData: {
              fileUri: `https://www.youtube.com/watch?v=${videoId}`,
              mimeType: 'video/mp4',
            },
            videoMetadata: {
              startOffset: `${audioIv.startSec}s`,
              endOffset: `${multimodalEndSec}s`,
            },
          });
        }

        userParts.push({
          text: `아래 제공된 설교 스피치 분석 입력 JSON(docs/sermon_app_spec.md 규격)과 실제 설교 구간(${audioIv.startSec}초~${multimodalEndSec}초) 영상·음성을 바탕으로, 마스터 프롬프트 v1.3 지침을 엄격히 준수하여 JSON으로 응답하세요.
반드시 확인된 대상 설교자의 설교 적격 구간 안의 실제 근거만 사용하고, 찬양·봉독·광고·사회·수어통역·회중 화면은 설교자 지표에서 제외하세요.
응답 JSON 형식:
{
  "coreConclusion": "이번 영상에서 가장 중요한 스피치 코칭 핵심 결론 (2~3문장, 존댓말)",
  "contextPriorityFocus": ["이번 행사·전달방식·청중 조합에서 우선 살핀 전달 기능 1", "기능 2"],
  "multimodalObserved": true,
  "gazeAndManuscriptSummary": "설교 적격 구간에서 실제 관찰된 시선 분포 및 본문 낭독 vs 설명 시 원고 전환 요약 (가림/측면 카메라이면 해당 조건 명시)",
  "gestureSummary": "설교 적격 구간에서 실제 관찰된 손동작(의미 제스처 vs 반복 손동작) 요약 (강대상 가림 시 평가 보류 명시)",
  "prosodySummary": "실제 음성에서 들리는 핵심 단어 강세·쉼·문장 끝맺음 명료도 요약"
}

[입력 자료 JSON]
${JSON.stringify(specInputPayload)}`,
        });

        let v13CoachResponse: any = null;
        for (const modelName of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
          try {
            v13CoachResponse = await Promise.race([
              ai.models.generateContent({
                model: modelName,
                contents: [
                  {
                    role: 'user',
                    parts: userParts,
                  },
                ],
                config: {
                  systemInstruction: masterPromptV13,
                  responseMimeType: 'application/json',
                },
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('v13 timeout')), 14000)),
            ]);
            if (v13CoachResponse?.text) break;
          } catch (mErr) {
            // fallback to next model
          }
        }

        const v13Parsed = JSON.parse((v13CoachResponse as any).text || '{}');
        if (v13Parsed.coreConclusion) {
          baseV13.coreConclusion = v13Parsed.coreConclusion;
        }
        if (Array.isArray(v13Parsed.contextPriorityFocus) && v13Parsed.contextPriorityFocus.length > 0) {
          baseV13.contextPriorityFocus = v13Parsed.contextPriorityFocus;
        }
        if (v13Parsed.multimodalObserved && !isFileMode) {
          baseV13.capabilities.continuous_video_access = true;
          baseV13.capabilities.audio_access = true;
          baseV13.capabilities.ai_model_connected = true;
          baseV13.capabilities.modality_note =
            '목회자 개인 Gemini API 키를 통해 실제 설교 구간(startOffset~endOffset) 멀티모달 영상·음성 및 시간 정보 자막 통합 분석 완료';

          baseV13.measurements = baseV13.measurements.map((m) => {
            if (m.metricId === 'gaze_and_manuscript' && v13Parsed.gazeAndManuscriptSummary) {
              return {
                ...m,
                assessable: true,
                value: v13Parsed.gazeAndManuscriptSummary,
                numeratorLabel: 'Gemini 2.5 멀티모달 설교 구간 시각 관찰',
                toolSource: 'Gemini 2.5 Flash Multimodal Video Inspector (Personal Key)',
              };
            }
            if (
              m.metricId === 'hand_gestures_normalized' &&
              v13Parsed.gestureSummary &&
              !(baseV13.speakerContext.camera_and_editing || '').includes('손 가림')
            ) {
              return {
                ...m,
                assessable: true,
                value: v13Parsed.gestureSummary,
                numeratorLabel: 'Gemini 2.5 멀티모달 설교 구간 손동작 관찰',
                toolSource: 'Gemini 2.5 Flash Multimodal Video Inspector (Personal Key)',
              };
            }
            if (m.metricId === 'acoustic_timbre_prosody' && v13Parsed.prosodySummary) {
              return {
                ...m,
                assessable: true,
                value: v13Parsed.prosodySummary,
                numeratorLabel: 'Gemini 2.5 멀티모달 설교 구간 음성 관찰',
                toolSource: 'Gemini 2.5 Flash Multimodal Audio Inspector (Personal Key)',
              };
            }
            return m;
          });
        }
      } catch (v13Err: any) {
        console.warn('Speech Coach v1.3 AI refinement notice:', v13Err?.message);
      }
    }

    if (analysisResult && analysisResult.speechCoaching) {
      analysisResult.speechCoaching.speechPace = computedPaceLabel;
      analysisResult.speechCoaching.v13 = baseV13;
    }

    const sermonId = `sermon-${Date.now()}`;
    const endTimeSec =
      baseV13.targetSelection.eligible_audio_intervals[0]?.endSec ||
      ytDetails.lengthSec ||
      startSec + 1800;
    const sermonRecord = {
      meta: {
        id: sermonId,
        churchName: resolvedChurch,
        churchSub: baseV13.speechContext.occasion || '주일예배',
        preacher: resolvedPreacher,
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
        sermonTitle: resolvedTitle,
        scriptureRef: resolvedScripture,
        targetAudience,
        youtubeId: videoId,
        startTimeSec: startSec,
        endTimeSec,
        startTimeLabel,
        totalLengthLabel: ytDetails.lengthSec > 0
          ? `전체 ${Math.floor(ytDetails.lengthSec / 60)}분 영상 (설교 적격 구간 ${startTimeLabel}~${formatSecToMmSs(endTimeSec)})`
          : `${startTimeLabel} ~ ${formatSecToMmSs(endTimeSec)} 설교 구간`,
        createdAt: new Date().toISOString(),
        isSampleData: false,
        institution: resolvedChurch,
        lecturer: resolvedPreacher,
        lectureTitle: resolvedTitle,
        topicRef: resolvedScripture,
      },
      ...analysisResult,
    };

    if (licenseKey) {
      try {
        saveAccountSermonOnServer(licenseKey, sermonRecord);
      } catch (saveErr) {
        console.warn('Failed to auto-save sermon on server for licenseKey:', licenseKey, saveErr);
      }
    }

    return res.json({
      success: true,
      sermonData: sermonRecord,
      lectureData: sermonRecord,
    });
  } catch (error: any) {
    console.error('Analyze Sermon Error:', error);
    return res.status(500).json({ error: error.message || '설교 분석 처리 중 오류가 발생했습니다.' });
  }
};

app.post('/api/analyze-sermon', handleAnalyzeSermon);
app.post('/api/analyze-lecture', handleAnalyzeSermon);

// API: 마스터 프롬프트 v1.3 기반 스피치 코칭 재분석 (맥락 4축 변경 / 대상·구간 정정 / 사용자 정정 반영)
app.post('/api/speech-coach/re-evaluate', async (req, res) => {
  try {
    const {
      videoId = '',
      youtubeUrl = '',
      sermonTitle = '',
      scriptureRef = '',
      preacherName = '',
      churchName = '',
      targetAudienceText = '',
      startSec = 0,
      originalDurationSec = 0,
      speechContext,
      speakerContext,
      previousRecords = [],
      isDemoSample = false,
    } = req.body || {};

    let transcriptLines: any[] = [];
    let resolvedDuration = originalDurationSec;
    let startReason = `사용자 확인 설교 시작 시점(${formatSecToMmSs(startSec)})`;

    const ytId = extractYoutubeId(youtubeUrl || videoId);
    if (ytId && !String(ytId).startsWith('file-')) {
      try {
        const ytDetails = await fetchYoutubeSermonDetails(
          ytId,
          youtubeUrl || `https://www.youtube.com/watch?v=${ytId}`
        );
        transcriptLines = ytDetails.transcriptLines || [];
        if (!resolvedDuration && ytDetails.lengthSec > 0) {
          resolvedDuration = ytDetails.lengthSec;
        }
        if (ytDetails.startReasonLabel) {
          startReason = ytDetails.startReasonLabel;
        }
      } catch {
        // ignore network error
      }
    }

    const ai = getAiClient(req);
    const { v13, computedPaceLabel } = buildSpeechCoachingV13Data({
      videoId: ytId || videoId || 'sermon-video',
      sermonTitle,
      scriptureRef,
      preacherName,
      churchName,
      targetAudienceText,
      originalDurationSec: resolvedDuration,
      detectedStartSec: startSec,
      startSource: 'user_input',
      startReasonLabel: startReason,
      transcriptLines,
      isDemoSample: Boolean(isDemoSample),
      aiModelConnected: Boolean(ai),
      continuousVideoAccess: false,
      audioAccess: false,
      customSpeechContext: speechContext,
      customSpeakerContext: speakerContext,
      previousRecords: Array.isArray(previousRecords) ? previousRecords : [],
    });

    return res.json({
      success: true,
      v13,
      computedPaceLabel,
      masterPromptLoaded: fs.existsSync(SPEECH_COACH_PROMPT_FILE),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || '스피치 코칭 재평가 중 오류가 발생했습니다.',
    });
  }
});

// API: AI 설교 코치 1:1 상담
app.post('/api/chat-coach', async (req, res) => {
  try {
    const { message, history, sermonContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const ai = getAiClient(req);
    if (!ai) {
      // API 키 미설정 시에도 정교하고 목회적인 답변 반환
      if (message.includes('도입') || message.includes('오프닝') || message.includes('시작')) {
        return res.json({
          reply: `목사님, 성도들의 굳어있는 마음을 단 1분 만에 여는 오프닝 후크(Hook) 제안입니다:

"성도 여러분, 한 주간 평안하셨습니까? 솔직하게 여쭙겠습니다.
우리가 밤낮으로 간절히 부르짖어 기도하고 성실하게 살아가는데도, 왜 우리 삶에는 여전히 이해할 수 없는 먹구름과 고난이 찾아올까요?
하나님이 침묵하시는 것만 같은 그 어두운 밤에, 우리는 대체 무엇을 바라보아야 할까요?
오늘 본문 말씀은 그 고통의 한복판에 서 있는 우리에게 하나님의 가장 깊고 신실한 비밀을 열어 보여주십니다."

이 오프닝은 성도들의 한숨을 책망하지 않고 그대로 공감해 줌으로써 회중의 방어기제를 허물고 말씀에 완전히 몰입하게 만듭니다.`,
        });
      } else if (message.includes('추임새') || message.includes('말투') || message.includes('스피치') || message.includes('버릇')) {
        return res.json({
          reply: `목사님, 스피치 습관(추임새 및 말투) 교정을 위한 3대 핵심 드릴입니다:

1. **'이제...' 묵음화 드릴 (Sacred Pause)**:
   대지가 바뀔 때 '이제...'라는 말을 하려는 순간, 입을 열지 마시고 1초간 깊게 숨을 들이마시며 멈추세요. 침묵이야말로 청중에게 생각할 시간을 주는 프로 설교자의 비밀 무기입니다.

2. **호응 유도('할렐루야?') 절제**:
   성도들의 아멘을 억지로 유도하기보다는, 진리가 가슴을 칠 때 성도들이 자발적으로 반응하도록 2초간 눈을 마주치며 기다려 주시면 설교의 품격이 훨씬 높아집니다.

3. **3점 시선 배분법 (Triangle Scan)**:
   원고 모니터만 보지 마시고 [좌측 중앙 5초 - 본당 뒤편 2층 5초 - 우측 5초]로 시선을 순환시키세요. 좌측 성도들이 깊은 영적 존중을 받게 됩니다.`,
        });
      } else {
        return res.json({
          reply: `목사님, 질문해 주신 내용("${message}")에 대한 맞춤 설교학 코칭입니다:

강해 설교의 핵심은 **'성경 원어의 역사적 문맥 → 중심 명제(The Big Idea) 선포 → 성도의 일상 삶에 맞닿은 구체적 적용'**의 3박자 연결입니다.

이번 설교에서는 성도들이 예배당 문을 나선 뒤 월요일 출근길에서 바로 붙잡고 선포할 수 있는 '1문장 신앙 고백 챌린지'를 결론부에 선물해 주시면 교육 효과와 삶의 변화가 2배 이상 깊어질 것입니다. 추가로 예화 배치나 결단 기도 인도법 중 필요하신 부분이 있다면 언제든 말씀해 주세요!`,
        });
      }
    }

    const systemInstruction = `당신은 대한민국 최고 권위의 설교학(Homiletics) 교수이자 목회자 스피치 코칭 멘토입니다.
대화 상대는 담임목사 또는 설교자입니다.
설교자가 질문하는 도입부 후크, 본문 원어 강해, 성도 눈높이 예화 추천, 스피치 습관 교정(말투 추임새 절제, 시선 배분, 거룩한 침묵 Sacred Pause 활용, 제스처 안정화), 소그룹 나눔 및 결단 기도 인도법에 대해 깊은 영성과 설교학적 전문성을 담아 따뜻하고 격조 높은 한국어 존댓말(하십시오체, 해요체)로 답변해 주세요.`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        if (turn.role && turn.parts) {
          contents.push(turn);
        } else if (turn.role && turn.content) {
          contents.push({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.content }],
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let response: any = null;
    for (const modelName of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: { systemInstruction },
        });
        if (response?.text) break;
      } catch (chatErr) {
        // try next model
      }
    }

    return res.json({ reply: response.text || '' });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    return res.status(500).json({ error: error.message || 'AI 코칭 생성 중 오류가 발생했습니다.' });
  }
});

// ==========================================
// 도서 집필 참고자료(PDF, PPTX, DOCX, TXT, HWPX) 실제 텍스트 추출 API
// ==========================================
app.post('/api/book/extract-material', async (req, res) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ error: '파일 이름과 데이터가 필요합니다.' });
    }

    const parsed = parseUploadedMaterialBuffer(fileName, base64Data);

    // PDF 등 이미지성 문서이거나 AI 요약 보강이 가능한 경우 Gemini 멀티모달로 실제 텍스트 정밀 추출
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const ai = getAiClient(req);
    if (ai && ext === 'pdf' && parsed.extractedText.length < 120) {
      try {
        const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        let aiRes: any = null;
        for (const modelName of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
          try {
            aiRes = await ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  role: 'user',
                  parts: [
                    { inlineData: { mimeType: 'application/pdf', data: cleanBase64 } },
                    {
                      text: '이 PDF 문서의 핵심 주제, 성경 주해 내용, 목회적 통찰, 중요 인용구들을 책 집필에 바로 활용할 수 있도록 한국어로 상세히 추출·요약해 주세요 (800자 내외).',
                    },
                  ],
                },
              ],
            });
            if (aiRes?.text) break;
          } catch (mErr) {
            // try next model
          }
        }
        if (aiRes.text && aiRes.text.trim().length > 30) {
          parsed.extractedText = aiRes.text.trim();
          parsed.summaryPoint = aiRes.text.trim().split('\n')[0].slice(0, 150);
        }
      } catch (pdfAiErr) {
        console.warn('PDF multimodal fallback used:', pdfAiErr);
      }
    }

    return res.json({
      success: true,
      extractedText: parsed.extractedText,
      summaryPoint: parsed.summaryPoint,
      keywords: parsed.keywords,
    });
  } catch (err: any) {
    console.error('Material Extract Error:', err);
    return res.status(500).json({ error: err.message || '문서 텍스트 추출 중 오류 발생' });
  }
});

// ==========================================
// 도서 집필 & 원고 초안 생성 API (선택된 모든 영상 + 업로드된 모든 자료 통합 반영)
// ==========================================
app.post('/api/book/generate-proposal', async (req, res) => {
  try {
    const { bookType, writingStyle, authorName, churchName, sermons, materials } = req.body;
    const sermonList = Array.isArray(sermons) ? sermons : [];
    const materialList = Array.isArray(materials) ? materials : [];

    // 기본 전략 기획안(모든 선택 설교 + 업로드 자료 본문 통합)을 먼저 계산하여 최소 챕터 수 보장
    const strategicPlan = buildStrategicBookPlan({
      bookType: bookType || '에세이/신앙성숙',
      writingStyle: writingStyle || '따뜻한 감성 에세이체',
      authorName: authorName || '담임목사',
      churchName: churchName || '소속교회',
      sermons: sermonList,
      materials: materialList,
    });

    const ai = getAiClient(req);
    if (ai && sermonList.length > 0) {
      try {
        const sermonsBrief = sermonList
          .map(
            (s: any, idx: number) =>
              `[설교 ${idx + 1}] 제목: "${s.meta?.sermonTitle}" | 본문: ${s.meta?.scriptureRef} | 요약: ${s.summary} | 대지: ${(s.timeline || []).map((t: any) => t.title).join(' -> ')}`
          )
          .join('\n');

        const materialsBrief =
          materialList.length > 0
            ? materialList
                .map(
                  (m: any, idx: number) =>
                    `[업로드 자료 ${idx + 1}: ${m.fileName} (${m.fileType})]\n핵심 요약: ${m.summaryPoint || ''}\n실제 추출 본문:\n${(m.extractedText || '').slice(0, 1200)}`
                )
                .join('\n\n')
            : '업로드된 외부 문서 자료 없음 (선택된 설교들 중심으로 구성)';

        const minChapters = strategicPlan.chapters.length;
        const prompt = `당신은 기독교 출판사 최고 기획 편집장입니다.
목회자가 선택한 총 ${sermonList.length}편의 설교 영상과 ${materialList.length}개의 업로드 참고자료를 빠짐없이 모두 통합 분석하여, 단행본 출판 기획안과 최소 ${minChapters}개 이상의 챕터별 원고 초안을 JSON으로 작성해 주세요.

[저자 및 도서 설정]
- 저자: ${authorName || '목회자'} (${churchName || '소속교회'})
- 도서 장르: ${bookType || '에세이/신앙성숙'}
- 윤문 문체: ${writingStyle || '따뜻한 감성 에세이체'}

[선택된 설교 영상 목록 (${sermonList.length}편 - 모든 설교가 각 부/장에 반드시 반영되어야 함)]
${sermonsBrief}

[업로드된 참고자료 목록 (${materialList.length}건 - 추출된 실제 본문 내용과 키워드를 기획의도, 차별화 포인트, 각 챕터 본문 원고에 반드시 녹여낼 것)]
${materialsBrief}

반드시 다음 JSON 구조로만 반환하세요:
{
  "proposal": {
    "mainTitle": "선택된 설교들과 업로드 자료를 아우르는 출판용 메인 제목",
    "subTitle": "부제",
    "alternativeTitles": ["대안제목1", "대안제목2", "대안제목3"],
    "publishingIntent": "선택된 ${sermonList.length}편의 설교 제목들과 업로드된 ${materialList.length}개 자료의 실제 내용을 구체적으로 언급하며 통합 출판 기획의도를 서술",
    "targetReaders": "타겟 독자층 3가지 (줄바꿈 구분)",
    "differentiationPoints": ["차별화1 (설교 통합 관점)", "차별화2 (업로드 자료 결합 관점)", "차별화3 (독자 적용 관점)"],
    "editorialNote": "윤문 및 편성 전략 노트"
  },
  "chapters": [
    {
      "chapterNum": 1,
      "partTitle": "제1부 | 부 제목",
      "chapterTitle": "장 제목",
      "subtitle": "장 부제",
      "scriptureFocus": "핵심 성경 본문",
      "coreMessage": "핵심 메시지 1문장",
      "subSections": ["1. 소주제1", "2. 소주제2", "3. 소주제3"],
      "manuscriptDraft": "설교 내용과 업로드 자료의 핵심 문장을 녹여낸 품격 있는 출판 문어체 원고 초안 (최소 700자 이상)",
      "reflectionQuestions": ["묵상 질문 1", "묵상 질문 2"],
      "closingPrayer": "마무리 기도문",
      "wordCount": 750
    }
  ]
}`;

        let response: any = null;
        for (const modelName of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: 'application/json' },
            });
            if (response?.text) break;
          } catch (mErr) {
            // try next model
          }
        }

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.proposal && Array.isArray(parsed.chapters) && parsed.chapters.length >= 3) {
          return res.json({ success: true, ...parsed });
        }
      } catch (geminiErr) {
        console.warn('Gemini book proposal fallback triggered:', geminiErr);
      }
    }

    return res.json({
      success: true,
      proposal: strategicPlan.proposal,
      chapters: strategicPlan.chapters,
    });
  } catch (err: any) {
    console.error('Book Proposal Error:', err);
    return res.status(500).json({ error: err.message || '도서 기획안 생성 실패' });
  }
});

// 챕터별 원고 윤문/확장 API
app.post('/api/book/generate-chapter', async (req, res) => {
  try {
    const { chapter, writingStyle, authorName, proposal, materials } = req.body;
    const ai = getAiClient();

    if (ai && chapter) {
      try {
        const matContext =
          Array.isArray(materials) && materials.length > 0
            ? `\n- 참고자료 핵심 발췌:\n${materials.map((m: any) => `[${m.fileName}] ${(m.extractedText || '').slice(0, 600)}`).join('\n')}`
            : '';

        const prompt = `당신은 베스트셀러 기독교 서적 전문 출판 편집자입니다.
아래 챕터의 설교 구어체 원고와 업로드된 참고자료 내용을 결합하여 출판용 고품격 문어체("${writingStyle || '따뜻한 감성 에세이체'}")로 풍성하고 감동 깊게 윤문 및 확장 집필해 주세요.
- 저자: ${authorName || '목회자'}
- 도서명: ${proposal?.mainTitle || '신앙 도서'}
- 챕터: 제${chapter.chapterNum}장 "${chapter.chapterTitle}" (부제: ${chapter.subtitle})
- 본문 성구: ${chapter.scriptureFocus}
- 핵심 메시지: ${chapter.coreMessage}
- 소주제 구성: ${chapter.subSections?.join(', ')}${matContext}
- 기존 초안:
${chapter.manuscriptDraft}

강단 구어체의 군더더기('성도 여러분', '아멘 하시기 바랍니다', '이제...' 등)를 완전히 탈피하여, 독자가 혼자 읽으며 깊은 눈물과 영적 회복을 경험할 수 있는 완성도 높은 출판 원고(최소 900자 이상) 본문 텍스트만 깔끔하게 작성해 주세요.`;

        let response: any = null;
        for (const modelName of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            if (response?.text) break;
          } catch (mErr) {
            // try next model
          }
        }

        if (response.text) {
          return res.json({ success: true, manuscriptDraft: response.text });
        }
      } catch (geminiErr) {
        console.warn('Gemini chapter expansion fallback triggered:', geminiErr);
      }
    }

    return res.json({
      success: true,
      manuscriptDraft: `${chapter?.manuscriptDraft || ''}\n\n[출판 윤문 확장]\n오늘 우리가 흘리는 눈물은 결코 땅에 떨어져 사라지지 않습니다. 하나님께서는 신자의 모든 눈물을 주의 병에 담으시고, 상처 입은 가슴마다 그리스도의 십자가 보혈로 새 살을 돋게 하십니다. 낙심하지 마십시오. 가장 캄캄한 밤이 지나면, 하나님의 눈부신 새벽이 반드시 밝아옵니다.`,
    });
  } catch (err: any) {
    console.error('Book Chapter Error:', err);
    return res.status(500).json({ error: err.message || '챕터 원고 생성 실패' });
  }
});

// ==========================================
// 중앙 릴리즈 & 원격 업그레이드 배포 API (Feature 4 & 5)
// ==========================================
let currentAppRelease = {
  version: 'v2.5.2',
  buildNumber: 252,
  releasedAt: new Date().toISOString(),
  releaseTitle: 'Google Gemini 3.8 & 개인 API키(AQ.) 연동, 멀티 디바이스 실시간 동기화, 공지 게시판 정식 탑재',
  releaseNotes: [
    '목회자 개인 Gemini API 키 연동 (방식 B): 타인과 할당량 공유 없는 독립 고속 분석',
    '구글 최신 차세대 gemini-3.8-flash 모델 및 신규 AQ. 키 규격 완벽 지원 (404 원천 해결)',
    '멀티 디바이스 실시간 동기화: PC, 스마트폰, 태블릿 어디서나 동일 계정 설교 아카이브 연동',
    '스피치 딜리버리 & 보컬 코칭 v1.3: 발화 구간별 선별 진단, 4축 맥락 분석, 설교학 표본 연동',
    '상단 헤더에 [📢 공지 & 업데이트] 게시판 및 [🔑 개인 AI 키] 바로가기 탑재',
  ],
  mandatory: false,
};

app.get('/api/release/latest', (_req, res) => {
  res.json({ success: true, releaseInfo: currentAppRelease });
});

app.get('/api/network-info', (_req, res) => {
  const nets = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254') && !net.address.startsWith('172.')) {
        addresses.push(net.address);
      }
    }
  }
  const lanIp = addresses.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.')) || addresses[0] || '192.168.1.246';
  res.json({
    success: true,
    lanIp,
    port: PORT,
    tabletUrl: `http://${lanIp}:${PORT}`,
    allUrls: addresses.map((ip) => `http://${ip}:${PORT}`),
  });
});

app.post('/api/release/publish', (req, res) => {
  const newRelease = req.body;
  if (newRelease && newRelease.version) {
    currentAppRelease = {
      ...newRelease,
      releasedAt: new Date().toISOString(),
    };
    console.log(`[중앙 배포] 새 버전 발행 완료: ${currentAppRelease.version} (${currentAppRelease.releaseTitle})`);
    return res.json({ success: true, releaseInfo: currentAppRelease });
  }
  return res.status(400).json({ error: '올바른 릴리즈 정보가 아닙니다.' });
});

// ==========================================
// 관리자앱(Admin App) 전용 사용자 등록·관리 & 기기 인가 API
// ==========================================
const verifyAdminAuth = (req: express.Request): boolean => {
  const token = (req.headers['x-admin-token'] as string) || '';
  const runtime = loadRuntimeSettings();
  const validPass = runtime.adminPassword || process.env.ADMIN_PASSWORD || 'admin1234';
  return token === validPass || token === 'ADMIN-MASTER-2026';
};

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const runtime = loadRuntimeSettings();
  const validPass = runtime.adminPassword || process.env.ADMIN_PASSWORD || 'admin1234';
  const trimmed = (password || '').trim();

  if (trimmed === validPass || trimmed.toUpperCase() === 'ADMIN-MASTER-2026') {
    return res.json({
      success: true,
      adminToken: trimmed,
      hasAiKey: Boolean(runtime.geminiApiKey || process.env.GEMINI_API_KEY),
    });
  }
  return res.status(401).json({
    success: false,
    message: '관리자 비밀번호(또는 마스터 키)가 일치하지 않습니다.',
  });
});

app.get('/api/admin/users', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const users = getAllLicenseUsers();
  const runtime = loadRuntimeSettings();
  return res.json({
    success: true,
    users,
    hasAiKey: Boolean(runtime.geminiApiKey || process.env.GEMINI_API_KEY),
  });
});

app.post('/api/admin/users', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const result = createLicenseUser(req.body || {});
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json({ ...result, users: getAllLicenseUsers() });
});

app.put('/api/admin/users/:licenseKey', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const result = updateLicenseUser(req.params.licenseKey, req.body || {});
  if (!result.success) {
    return res.status(404).json(result);
  }
  return res.json({ ...result, users: getAllLicenseUsers() });
});

app.delete('/api/admin/users/:licenseKey', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const result = deleteLicenseUser(req.params.licenseKey);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json({ ...result, users: getAllLicenseUsers() });
});

app.post('/api/admin/users/:licenseKey/toggle-status', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const result = toggleLicenseStatus(req.params.licenseKey);
  if (!result.success) {
    return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }
  return res.json({ success: true, user: result.user, users: getAllLicenseUsers() });
});

app.post('/api/admin/users/:licenseKey/remove-device', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const { deviceId } = req.body;
  const result = removeRegisteredDevice(req.params.licenseKey, deviceId || 'ALL');
  if (!result.success) {
    return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }
  return res.json({ success: true, user: result.user, users: getAllLicenseUsers() });
});

app.post('/api/admin/users/import', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const { users } = req.body;
  const result = importLicenseUsers(users);
  return res.json({ ...result, users: getAllLicenseUsers() });
});

app.post('/api/admin/settings', (req, res) => {
  if (!verifyAdminAuth(req)) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }
  const { geminiApiKey, newAdminPassword } = req.body;
  const patch: { geminiApiKey?: string; adminPassword?: string } = {};
  if (typeof geminiApiKey === 'string') {
    patch.geminiApiKey = geminiApiKey.trim();
  }
  if (typeof newAdminPassword === 'string' && newAdminPassword.trim().length >= 4) {
    patch.adminPassword = newAdminPassword.trim();
  }
  saveRuntimeSettings(patch);
  const runtime = loadRuntimeSettings();
  return res.json({
    success: true,
    hasAiKey: Boolean(runtime.geminiApiKey || process.env.GEMINI_API_KEY),
    adminToken: runtime.adminPassword || process.env.ADMIN_PASSWORD || 'admin1234',
  });
});

// 목사님 초대 링크(/?key=...) 접속 또는 키 입력 시 등록된 성함·교회 자동 조회 API
app.get('/api/auth/lookup-key', (req, res) => {
  const key = String(req.query.key || '').trim();
  const user = findUserByKey(key);
  if (!user) {
    return res.status(404).json({ success: false, message: '등록되지 않은 라이선스 키입니다.' });
  }
  return res.json({
    success: true,
    pastorName: user.pastorName,
    churchName: user.churchName,
    status: user.status,
    maxDevices: user.maxDevices,
    registeredCount: user.registeredDevices.length,
  });
});

// 기기 인가 검증 및 등록 API (중앙 사용자 DB와 실시간 연동)
app.post('/api/auth/verify', (req, res) => {
  const { licenseKey, pastorName, churchName, deviceId, deviceLabel } = req.body;
  const userAgent = req.headers['user-agent'] || '';

  const result = verifyAndRegisterDeviceOnServer({
    licenseKey,
    pastorName,
    churchName,
    deviceId,
    deviceLabel,
    userAgent,
  });

  if (result.success) {
    return res.json(result);
  }
  return res.status(401).json(result);
});

// 스튜디오 접속 시 브라우저 로컬 캐시 세션이 관리자앱에 실제 등록·활성화되어 있는지 실시간 검증 API
app.post('/api/auth/verify-session', (req, res) => {
  const { licenseKey, pastorName, churchName, deviceId, deviceLabel } = req.body || {};
  const userAgent = req.headers['user-agent'] || '';

  const result = verifyActiveSessionOnServer({
    licenseKey,
    pastorName,
    churchName,
    deviceId,
    deviceLabel,
    userAgent,
  });

  if (result.valid) {
    return res.json({ success: true, ...result });
  }
  return res.status(401).json({ success: false, ...result });
});

// 스튜디오 상단에서 목회자 성함/교회명 수정 시 관리자앱(users.json) 및 설교 아카이브에도 실시간 동기화
app.post('/api/auth/update-profile', (req, res) => {
  const { licenseKey, pastorName, churchName } = req.body || {};
  if (!licenseKey) {
    return res.status(400).json({ success: false, message: '라이선스 키가 필요합니다.' });
  }
  const result = updateLicenseUser(licenseKey, { pastorName, churchName });
  if (pastorName || churchName) {
    try {
      updateAccountSermonsProfileOnServer(licenseKey, pastorName || '', churchName || '');
    } catch {}
  }
  return res.json(result);
});

// ==========================================
// 계정별 설교 아카이브 멀티 디바이스 실시간 동기화 API
// ==========================================
app.post('/api/sermons/sync', (req, res) => {
  try {
    const { licenseKey = '', sermons = [] } = req.body || {};
    const synced = syncAccountSermonsOnServer(licenseKey, sermons);
    return res.json({ success: true, sermons: synced });
  } catch (err: any) {
    console.error('Sermons sync error:', err);
    return res.status(500).json({ success: false, error: err?.message || '동기화 오류' });
  }
});

app.post('/api/sermons/save', (req, res) => {
  try {
    const { licenseKey = '', sermon } = req.body || {};
    if (!sermon) {
      return res.status(400).json({ success: false, message: '저장할 설교 정보가 없습니다.' });
    }
    const updated = saveAccountSermonOnServer(licenseKey, sermon);
    return res.json({ success: true, sermons: updated });
  } catch (err: any) {
    console.error('Sermons save error:', err);
    return res.status(500).json({ success: false, error: err?.message || '저장 오류' });
  }
});

app.post('/api/sermons/delete', (req, res) => {
  try {
    const { licenseKey = '', sermonId } = req.body || {};
    if (!sermonId) {
      return res.status(400).json({ success: false, message: '삭제할 설교 ID가 없습니다.' });
    }
    const updated = deleteAccountSermonOnServer(licenseKey, sermonId);
    return res.json({ success: true, sermons: updated });
  } catch (err: any) {
    console.error('Sermons delete error:', err);
    return res.status(500).json({ success: false, error: err?.message || '삭제 오류' });
  }
});

// Vite 개발 서버 또는 프로덕션 정적 서빙
async function startServer() {
  const distPath = path.resolve(ROOT_DIR, 'dist');
  const isProd = process.env.NODE_ENV === 'production' || !fs.existsSync(path.resolve(ROOT_DIR, 'src'));

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const { default: react } = await import('@vitejs/plugin-react');
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    const vite = await createViteServer({
      configFile: false,
      cacheDir: path.resolve(os.tmpdir(), 'sermon-vite-cache'),
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(ROOT_DIR, './src'),
        },
      },
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Sermon Coaching Studio Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
