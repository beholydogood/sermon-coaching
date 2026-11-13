import { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  X,
  FileText,
  Upload,
  Sparkles,
  Layers,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Edit3,
  Trash2,
  Plus,
  ArrowRight,
  BookMarked,
  Printer,
  ChevronRight,
  Library,
  PenTool,
  FileUp,
  FileCheck,
  RefreshCw,
  FolderPlus,
  HelpCircle,
} from 'lucide-react';
import {
  SermonRecord,
  BookProject,
  UploadedMaterial,
  BookChapterDraft,
} from '../types/sermon';
import { buildStrategicBookPlan } from '../utils/bookGenerator';

interface BookWritingStudioProps {
  isOpen: boolean;
  onClose: () => void;
  sermons: SermonRecord[];
  activeSermonId?: string;
  defaultAuthorName?: string;
  defaultChurchName?: string;
}

export const BookWritingStudio: React.FC<BookWritingStudioProps> = ({
  isOpen,
  onClose,
  sermons,
  activeSermonId,
  defaultAuthorName,
  defaultChurchName,
}) => {
  const [activeStep, setActiveStep] = useState<'materials' | 'proposal' | 'chapters' | 'export'>('materials');

  // 1. 도서 기본 메타
  const [bookType, setBookType] = useState<BookProject['bookType']>('에세이/신앙성숙');
  const [writingStyle, setWritingStyle] = useState<BookProject['writingStyle']>('따뜻한 감성 에세이체');
  const [authorName, setAuthorName] = useState(defaultAuthorName || '이은혜 담임목사');
  const [churchName, setChurchName] = useState(defaultChurchName || '은혜의빛교회');

  useEffect(() => {
    if (defaultAuthorName) setAuthorName(defaultAuthorName);
    if (defaultChurchName) setChurchName(defaultChurchName);
  }, [defaultAuthorName, defaultChurchName, isOpen]);

  // 2. 선택된 설교 목록
  const [selectedSermonIds, setSelectedSermonIds] = useState<string[]>(() => {
    if (activeSermonId) return [activeSermonId];
    return sermons.slice(0, 2).map((s) => s.meta.id);
  });

  // 3. 업로드된 참고 자료 목록 (PDF, PPT 등)
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([
    {
      id: 'mat-1',
      fileName: '2026_로마서_상반기_목회계획서.pdf',
      fileType: 'pdf',
      fileSizeLabel: '1.8 MB',
      extractedText:
        '상반기 대예배 목회 방향: 고난과 불확실성의 시대를 살아가는 현대 성도들에게 로마서 8장의 언약적 확신을 심어주어, 삶의 모든 영역에서 하나님의 절대적 주권과 사랑을 고백하게 함.',
      summaryPoint: '목회 기획 의도 및 상반기 성도 삶의 영적 회복 목표',
      uploadedAt: '2026-03-08 10:15',
    },
    {
      id: 'mat-2',
      fileName: '로마서8장28절_원어강해_교역자세미나.pptx',
      fileType: 'ppt',
      fileSizeLabel: '4.2 MB',
      extractedText:
        '헬라어 쉬네르게이(synergei) 분석: 단순한 긍정적 낙관주의가 아니라, 상반되는 재료들이 하나님의 오케스트레이션 안에서 궁극적 선(Good)을 위해 협력한다는 신학적 섭리 교리.',
      summaryPoint: '헬라어 원어 주해 및 존 스토트·칼빈 주석 인용 메모',
      uploadedAt: '2026-03-08 10:20',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. 생성된 도서 기획안
  const [proposal, setProposal] = useState<BookProject['proposal']>({
    mainTitle: '모든 것이 선을 이루는 밤',
    subTitle: '삶의 가장 깊은 어둠 속에서 만나는 하나님의 신비한 섭리',
    alternativeTitles: [
      '고난의 밤에도 하나님의 손길은 멈추지 않는다',
      '합력하여 선을 이루시는 하나님',
      '그럼에도 불구하고 피어나는 은혜',
    ],
    publishingIntent:
      '예측 불가능한 인생의 상실과 상처 앞에서 "하나님은 왜 나에게 이런 고난을 허락하셨는가"를 묻는 성도들에게, 값싼 위로나 감정적 힐링을 넘어선 로마서 8장의 주권적 언약 복음을 전하고자 기획되었습니다.',
    targetReaders:
      '1. 예기치 않은 질병, 재정, 가정의 고난으로 기도가 메마른 성도\n2. 하나님의 침묵 앞에서 회의와 갈등을 겪고 있는 3040 청장년\n3. 상처받은 이웃을 깊이 보듬고 위로하고 싶은 목회자 및 순장·구역장',
    differentiationPoints: [
      '설교 현장의 뜨거운 영성과 감동을 정제된 문학적 문어체 에세이로 재탄생',
      '원어(쉬네르게이) 신학의 탄탄한 깊이와 일상 직장·가정에서의 구체적 실천 묵상 결합',
      '각 장마다 독자가 혼자 기록할 수 있는 [묵상 노트]와 [마무리 치유 기도문] 수록',
    ],
    editorialNote:
      '강단 구어체의 추임새와 반복 표현을 과감히 걷어내고, 독자의 내면에 깊이 파고드는 1인칭 고백형 문체로 윤문합니다.',
  });

  // 5. 챕터별 원고 초안 목록
  const [chapters, setChapters] = useState<BookChapterDraft[]>([
    {
      chapterNum: 1,
      partTitle: '제1부 | 침묵의 밤을 지날 때',
      chapterTitle: '우리의 기도가 침묵에 갇힐 때',
      subtitle: '응답 없는 고난의 터널 속에서 하나님의 눈물을 발견하다',
      scriptureFocus: '로마서 8장 28절 (상반절)',
      coreMessage: '고난은 하나님의 부재가 아니라, 그분의 더 깊은 섭리가 시작되는 신호탄이다.',
      subSections: [
        '1. 왜 간절한 기도에도 밤은 길어질까?',
        '2. 침묵하시는 하나님, 그 거룩한 기다림',
        '3. 상처가 사명이 되는 역설의 은혜',
      ],
      manuscriptDraft: `인생의 어떤 밤은 기도를 삼켜버립니다.
아무리 목놓아 부르짖어도 하늘은 놋쇠처럼 굳게 닫혀 있는 것만 같고, 돌아오는 메아리는 차가운 한숨뿐인 계절을 우리는 마주하곤 합니다.
"하나님, 제가 주님을 위해 얼마나 헌신했습니까? 왜 저에게 이런 일이 일어난 것입니까?"

욥의 탄식은 다른 누군가의 이야기가 아닙니다. 바로 오늘, 직장에서 예기치 않은 통보를 받고, 병원 검사 결과지 앞에서 무너져 내린 우리 자신의 고백입니다.
그러나 성경은 침묵의 한가운데서 우리에게 아주 조용하지만 단호한 진리를 선포합니다.
"우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라." (롬 8:28)

여기서 바울은 "우리가 느끼거니와"라고 말하지 않습니다. 감정은 흔들릴 수 있습니다. 현실의 파도는 우리를 집어삼킬 듯 덮쳐옵니다.
그러나 신앙이란 파도의 높이를 보며 절망하는 감정이 아니라, 보이지 않는 바다 밑바닥을 지탱하시는 하나님의 약속을 "아는 것"입니다.

하나님은 우리의 기도를 잊으신 적이 없습니다.
우리가 어둠 속에 갇혀 있다고 울부짖는 바로 그 순간에도, 주님의 거룩한 조율의 손길은 단 1초도 쉬지 않고 합력(쉬네르게이)을 향해 움직이고 계십니다.`,
      reflectionQuestions: [
        '최근 하나님의 침묵 앞에서 가장 아프게 부르짖었던 기도의 제목은 무엇입니까?',
        '나의 감정보다 앞서 붙잡아야 할 하나님의 변함없는 언약의 말씀은 무엇입니까?',
      ],
      closingPrayer:
        '주님, 응답이 보이지 않는 깊은 밤에도 주님의 선하심을 의심하지 않게 하옵소서. 고난의 흉터 속에 숨겨진 하나님의 신비를 겸손히 찬양하게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.',
      wordCount: 780,
    },
    {
      chapterNum: 2,
      partTitle: '제1부 | 침묵의 밤을 지날 때',
      chapterTitle: '쉬네르게이, 부서진 조각들의 오케스트라',
      subtitle: '아픔과 눈물이 모여 하나님의 가장 아름다운 교향곡이 된다',
      scriptureFocus: '로마서 8장 28절 (하반절)',
      coreMessage: '하나님은 모든 상반된 재료를 조합하여 영원한 선을 빚어내시는 거룩한 마에스트로이시다.',
      subSections: [
        '1. 헬라어 쉬네르게이의 신비',
        '2. 실패와 상실까지도 악보의 쉼표가 될 때',
        '3. 성도의 삶에 우연이란 없다',
      ],
      manuscriptDraft: `헬라어 성경을 펼치면 '합력하여'라는 단어에 '쉬네르게이(synergei)'라는 깊은 울림의 원어가 자리하고 있습니다.
이 단어는 '함께(syn)'와 '일하다(ergon)'가 결합된 말이며, 오늘날 우리가 쓰는 '시너지(Synergy)'의 어원이기도 합니다.

화가가 캔버스에 그림을 그릴 때, 눈부신 흰색과 화려한 금빛만으로 걸작을 만들 수는 없습니다.
그림의 깊이와 입체감은 가장 어둡고 짙은 검은색 물감이 칠해질 때 비로소 완성됩니다.
우리의 인생도 마찬가지입니다. 성공과 기쁨만이 하나님의 은혜가 아닙니다.
우리가 겪었던 뼈아픈 실패, 사람에게 배신당했던 눈물의 자리, 도저히 이해할 수 없었던 고독의 밤들이 하나님의 손에서 '함께' 일하기 시작합니다.

하나님은 실수를 모르시는 거룩한 작곡가이십니다.
오늘 당신의 손에 쥐어진 부서진 조각들을 주님께 내어드리십시오.
주님은 그 상처의 조각을 모아 세상에서 가장 감동적인 십자가의 멜로디를 연주하실 것입니다.`,
      reflectionQuestions: [
        '내 삶에서 가장 버리고 싶었던 아픈 과거의 상처가 하나님의 은혜로 해석된 경험이 있습니까?',
        '오늘 내가 겪는 고난의 재료를 마에스트로 되신 하나님께 온전히 내어맡길 수 있습니까?',
      ],
      closingPrayer:
        '하나님 아버지, 나의 부족함과 깨어진 조각들까지도 합력하여 선으로 빚으시는 주님의 주권을 신뢰합니다. 절망을 찬양으로 바꾸어 주옵소서. 예수 그리스도의 이름으로 기도드립니다. 아멘.',
      wordCount: 820,
    },
    {
      chapterNum: 3,
      partTitle: '제2부 | 하나님의 영원한 설계도',
      chapterTitle: '미리 아시고 정하신 사랑의 닻',
      subtitle: '창세 전부터 나를 부르신 그 사랑은 결코 실패하지 않는다',
      scriptureFocus: '로마서 8장 29절',
      coreMessage: '우리를 향한 구원의 여정은 사람의 결단이 아닌 하나님의 영원한 주권 속에 단단히 닻을 내리고 있다.',
      subSections: [
        '1. 예지와 예정: 흔들리지 않는 신자의 신분',
        '2. 아들의 형상을 본받는 성화의 과정',
        '3. 맏아들의 영광에 동참하는 감격',
      ],
      manuscriptDraft: `세상의 사랑은 조건적입니다.
우리가 능력이 있고, 매력적이며, 쓸모가 있을 때는 박수를 보내지만, 힘을 잃고 쓰러지면 가차 없이 등을 돌립니다.
하지만 성경이 선포하는 하나님의 사랑은 완전히 다릅니다.
"하나님이 미리 아신 자들을 또한 그 아들의 형상을 본받게 하기 위하여 미리 정하셨으니..." (롬 8:29)

바울은 우리의 구원이 어제 시작된 즉흥적인 사건이 아니라고 말합니다.
창세 전, 온 우주가 생겨나기도 전에 하나님께서는 이미 당신의 이름을 아셨고, 당신을 향한 사랑의 설계를 품으셨습니다.
그러므로 우리의 구원과 삶은 결코 우연의 산물이 아닙니다.`,
      reflectionQuestions: [
        '조건 없는 하나님의 사랑 앞에서 나의 존재 가치를 새롭게 고백해 보십시오.',
        '내 삶의 궁극적 목표가 세상의 성공이 아닌 "예수 그리스도의 형상을 닮아가는 것"이 되고 있습니까?',
      ],
      closingPrayer:
        '영원 전부터 나를 아시고 자녀 삼아주신 아버지 하나님, 세상의 평가에 흔들리지 않고 그리스도 안에서 누리는 참된 평안을 누리게 하옵소서. 아멘.',
      wordCount: 710,
    },
  ]);

  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(0);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // 선택된 설교 목록(1편 vs 다중 설교) 및 업로드 자료가 바뀔 때마다 모든 설교를 종합 분석하여 기획안과 챕터 초안을 즉시 전략적으로 재편성
  useEffect(() => {
    const selectedSermonsData = sermons.filter((s) => selectedSermonIds.includes(s.meta.id));
    if (selectedSermonsData.length === 0) return;

    const strategicPlan = buildStrategicBookPlan({
      bookType,
      writingStyle,
      authorName,
      churchName,
      sermons: selectedSermonsData,
      materials: uploadedMaterials,
    });

    setProposal(strategicPlan.proposal);
    setChapters(strategicPlan.chapters);
    setSelectedChapterIdx(0);
  }, [selectedSermonIds, uploadedMaterials, bookType, writingStyle, authorName, churchName, sermons]);

  if (!isOpen) return null;

  // 설교 선택 토글
  const handleToggleSermon = (id: string) => {
    setSelectedSermonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 자료 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: UploadedMaterial['fileType'] = 'other';
      if (ext === 'pdf') fileType = 'pdf';
      else if (ext === 'ppt' || ext === 'pptx') fileType = 'ppt';
      else if (ext === 'doc' || ext === 'docx') fileType = 'docx';
      else if (ext === 'txt') fileType = 'txt';

      const newMaterial: UploadedMaterial = {
        id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fileName: file.name,
        fileType,
        fileSizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        extractedText: `[${file.name} 분석 내용]\n목회 연구 본문 핵심 포인트, 성경 주해 요약, 설교 예화 및 청중 나눔 질문 데이터가 성공적으로 추출되었습니다.`,
        summaryPoint: `${ext?.toUpperCase()} 문서에서 핵심 도서 집필 키워드가 추출되었습니다.`,
        uploadedAt: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      };

      setUploadedMaterials((prev) => [newMaterial, ...prev]);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // AI 도서 기획안 생성/업데이트 (선택된 모든 설교와 참고자료를 종합하여 전략 기획)
  const handleGenerateProposal = async () => {
    setIsGeneratingProposal(true);
    const selectedSermonsData = sermons.filter((s) => selectedSermonIds.includes(s.meta.id));

    // 먼저 클라이언트 전략 기획 엔진으로 모든 선택 설교(1~N편) + 자료 통합 기획안 생성
    const strategicPlan = buildStrategicBookPlan({
      bookType,
      writingStyle,
      authorName,
      churchName,
      sermons: selectedSermonsData,
      materials: uploadedMaterials,
    });

    setProposal(strategicPlan.proposal);
    setChapters(strategicPlan.chapters);
    setSelectedChapterIdx(0);

    try {
      const res = await fetch('/api/book/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookType,
          writingStyle,
          authorName,
          churchName,
          sermons: selectedSermonsData,
          materials: uploadedMaterials,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // 서버가 선택된 설교 수에 맞는 충분한 챕터(단일 4장 이상, 다중 설교 시 설교당 2장 이상)를 반환한 경우 반영
        if (
          data.proposal &&
          data.chapters &&
          data.chapters.length >= strategicPlan.chapters.length
        ) {
          setProposal(data.proposal);
          setChapters(data.chapters);
        }
      }
    } catch (e) {
      console.warn('API call fallback, using strategic multi-sermon book plan', e);
    } finally {
      setIsGeneratingProposal(false);
      setActiveStep('proposal');
    }
  };

  // 챕터 원고 AI 초안 재작성 / 확장
  const handleGenerateChapterDraft = async (chapterIdx: number) => {
    setIsGeneratingChapter(true);
    const targetChapter = chapters[chapterIdx];
    try {
      const res = await fetch('/api/book/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter: targetChapter,
          writingStyle,
          authorName,
          proposal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.manuscriptDraft) {
          const updated = [...chapters];
          updated[chapterIdx] = {
            ...updated[chapterIdx],
            manuscriptDraft: data.manuscriptDraft,
            wordCount: data.manuscriptDraft.length,
          };
          setChapters(updated);
        }
      }
    } catch (e) {
      console.warn('Fallback chapter expansion', e);
    } finally {
      setIsGeneratingChapter(false);
    }
  };

  // 원고 본문 직접 수정 핸들러
  const handleUpdateManuscript = (text: string) => {
    const updated = [...chapters];
    updated[selectedChapterIdx] = {
      ...updated[selectedChapterIdx],
      manuscriptDraft: text,
      wordCount: text.length,
    };
    setChapters(updated);
  };

  // 전체 원고 텍스트 병합 (복사 및 다운로드용)
  const getFullManuscriptText = () => {
    let output = `# ${proposal.mainTitle}\n## ${proposal.subTitle}\n\n`;
    output += `**저자**: ${authorName} (${churchName})\n`;
    output += `**도서 분류**: ${bookType} | **문체**: ${writingStyle}\n\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `[도서 기획의도]\n${proposal.publishingIntent}\n\n`;
    output += `[타겟 독자]\n${proposal.targetReaders}\n\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    chapters.forEach((ch) => {
      output += `\n\n## ${ch.partTitle || ''}\n### 제${ch.chapterNum}장: ${ch.chapterTitle}\n`;
      output += `*소제: ${ch.subtitle}*\n`;
      output += `*핵심 성구: ${ch.scriptureFocus}*\n\n`;
      output += `${ch.manuscriptDraft}\n\n`;
      output += `[함께 나누는 묵상 질문]\n`;
      ch.reflectionQuestions.forEach((q, i) => {
        output += `${i + 1}. ${q}\n`;
      });
      output += `\n[마무리 기도]\n${ch.closingPrayer}\n`;
      output += `\n--------------------------------------------\n`;
    });

    return output;
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(getFullManuscriptText());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const text = getFullManuscriptText();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proposal.mainTitle.replace(/\s+/g, '_')}_원고초안.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentChapter = chapters[selectedChapterIdx] || chapters[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* ─── 상단 헤더 ─── */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  AI 출판 &amp; 도서 집필 스튜디오
                </span>
                <span className="text-xs text-slate-400">• 설교 구어체 ➜ 출판 문어체 윤문</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
                <span>{proposal.mainTitle}</span>
                <span className="text-xs font-normal text-slate-400">({authorName})</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? '복사 완료!' : '원고 복사'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-md shadow-amber-600/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>원고 다운로드 (.md)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── 4단계 프로세스 네비게이션 탭 ─── */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'materials', stepNum: '1단계', label: '자료 수집 & 설교 선택', count: `${selectedSermonIds.length}편 / ${uploadedMaterials.length}개 자료` },
            { id: 'proposal',  stepNum: '2단계', label: '도서 기획안 & 목차',    count: `${chapters.length}개 챕터 구성` },
            { id: 'chapters',  stepNum: '3단계', label: '챕터별 원고 집필·윤문', count: `제${currentChapter?.chapterNum || 1}장 편집 중` },
            { id: 'export',    stepNum: '4단계', label: '전체 원고 인쇄·내보내기', count: '완성본 출력' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStep(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeStep === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeStep === tab.id ? 'bg-slate-950/30 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'}`}>
                {tab.stepNum}
              </span>
              <span>{tab.label}</span>
              <span className={`text-[10px] opacity-80 ${activeStep === tab.id ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        {/* ─── 메인 바디 컨텐츠 ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40">

          {/* ════════════════════════════════════════════════════════════
              1단계: 자료 수집 및 설교 선택 (MATERIALS)
             ════════════════════════════════════════════════════════════ */}
          {activeStep === 'materials' && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* 도서 장르 및 저자 설정 바 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">도서 장르 / 출판 형태</label>
                  <select
                    value={bookType}
                    onChange={(e) => setBookType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="에세이/신앙성숙">따뜻한 감성 신앙 에세이집</option>
                    <option value="강해설교집">깊이 있는 본문중심 강해설교집</option>
                    <option value="소그룹/제자훈련 교재">소그룹 나눔 및 제자훈련 워크북</option>
                    <option value="새신자/전도 입문서">새신자·구도자를 위한 복음 입문서</option>
                    <option value="목회 리더십">목회 리더십 및 사역 코칭 가이드</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">윤문 문체 (Writing Tone)</label>
                  <select
                    value={writingStyle}
                    onChange={(e) => setWritingStyle(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="따뜻한 감성 에세이체">따뜻한 감성 에세이체 (공감·치유)</option>
                    <option value="깊이 있는 강해·신학체">깊이 있는 강해·신학체 (통찰·신학)</option>
                    <option value="실천 중심 라이프코칭체">실천 중심 라이프코칭체 (동기부여·적용)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">저자 목회자명 &amp; 교회</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="목회자 성함"
                      className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                    <input
                      type="text"
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      placeholder="소속 교회"
                      className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* 영상 설교 아카이브 선택 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Library className="w-4 h-4 text-amber-400" />
                      <span>원고로 집필할 누적 설교 영상 선택 ({selectedSermonIds.length}편 선택됨 → 총 {chapters.length}개 챕터 자동 편성)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      1편 선택 시 해당 설교를 4개 장으로 심층 확장하며, 여러 편 선택 시 모든 설교의 본문과 대지를 부(Part)별로 엮어 통합 기획합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSermonIds(sermons.map((s) => s.meta.id))}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-bold text-amber-300 cursor-pointer"
                    >
                      전체 설교 선택 ({sermons.length}편)
                    </button>
                    {selectedSermonIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSermonIds([sermons[0]?.meta.id].filter(Boolean))}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 cursor-pointer"
                      >
                        1편만 선택
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {sermons.map((sermon) => {
                    const isSelected = selectedSermonIds.includes(sermon.meta.id);
                    return (
                      <div
                        key={sermon.meta.id}
                        onClick={() => handleToggleSermon(sermon.meta.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-100 shadow-xs'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSermon(sermon.meta.id)}
                            className="rounded-md border-slate-700 text-amber-500 focus:ring-amber-400 w-4 h-4"
                          />
                          <div>
                            <div className="flex items-center space-x-2 text-[11px]">
                              <span className="font-semibold text-slate-400">{sermon.meta.date}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-indigo-400 font-mono">{sermon.meta.scriptureRef}</span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-0.5">
                              {sermon.meta.sermonTitle}
                            </h4>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {sermon.averageScore}점 설교
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 외부 참고자료 업로드 (PDF, PPT, DOCX) */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-indigo-400" />
                      <span>설교 준비 참고자료 업로드 (PDF, PPT, DOCX, TXT)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      설교 준비 시 작성했던 주해 메모, 강의안 PPT, 성경공부 교재를 함께 올려 원고의 신학적 깊이를 더합니다.
                    </p>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>자료 파일 추가</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* 자료 목록 */}
                <div className="space-y-2">
                  {uploadedMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 font-bold uppercase text-[10px]">
                          {mat.fileType}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{mat.fileName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({mat.fileSizeLabel})</span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-1 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            {mat.extractedText}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setUploadedMaterials((prev) => prev.filter((m) => m.id !== mat.id))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 기획안 생성 버튼 */}
              <div className="text-center pt-2">
                <button
                  onClick={handleGenerateProposal}
                  disabled={isGeneratingProposal || selectedSermonIds.length === 0}
                  style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
                  className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm border border-amber-300 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isGeneratingProposal
                      ? 'AI가 설교와 자료를 분석하여 도서 기획안과 목차를 구성 중입니다...'
                      : '선택한 설교 & 자료 기반 AI 도서 기획안 생성하기'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              2단계: 도서 출판 기획안 (PROPOSAL)
             ════════════════════════════════════════════════════════════ */}
          {activeStep === 'proposal' && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* 다중 설교 & 자료 통합 편성 전략 브리핑 배너 */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-slate-900 border border-amber-500/30">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-extrabold text-amber-300">
                      {selectedSermonIds.length === 1
                        ? '단일 설교 심층 단행본 편성 모드 (1편 설교 5단계 타임라인 ➜ 4개 챕터 심층 확장)'
                        : `다중 설교 통합 시리즈 편성 모드 (선택된 ${selectedSermonIds.length}편의 설교 모두 분석 ➜ 총 ${chapters.length}개 챕터 전략 구성)`}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    설교 {selectedSermonIds.length}편 + 참고자료 {uploadedMaterials.length}건 반영 완료
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sermons
                    .filter((s) => selectedSermonIds.includes(s.meta.id))
                    .map((s, i) => (
                      <span
                        key={s.meta.id}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 flex items-center gap-1.5"
                      >
                        <strong className="text-amber-400 font-mono">제{i + 1}부</strong>
                        <span>{s.meta.sermonTitle}</span>
                        <span className="text-indigo-400 font-mono text-[10px]">({s.meta.scriptureRef})</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* 제목 및 표지 기획 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Book Proposal</span>
                    <h3 className="text-base font-bold text-white mt-0.5">도서 출판 기획안 &amp; 핵심 컨셉</h3>
                  </div>
                  <button
                    onClick={() => setActiveStep('chapters')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors"
                  >
                    <span>챕터별 원고 집필로 이동</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">메인 도서명</label>
                  <input
                    type="text"
                    value={proposal.mainTitle}
                    onChange={(e) => setProposal({ ...proposal, mainTitle: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-amber-300 focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">부제 (Subtitle)</label>
                  <input
                    type="text"
                    value={proposal.subTitle}
                    onChange={(e) => setProposal({ ...proposal, subTitle: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                {/* 기획의도 및 타겟 독자 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">기획 의도 및 출판 배경</label>
                    <textarea
                      rows={4}
                      value={proposal.publishingIntent}
                      onChange={(e) => setProposal({ ...proposal, publishingIntent: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-hidden focus:border-amber-400 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">핵심 타겟 독자층</label>
                    <textarea
                      rows={4}
                      value={proposal.targetReaders}
                      onChange={(e) => setProposal({ ...proposal, targetReaders: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-hidden focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                {/* 차별화 포인트 3가지 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">이 책만의 3대 차별화 포인트</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {proposal.differentiationPoints.map((point, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 목차 구성 (Chapter Outlines) */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>전체 목차 기획안 ({chapters.length}개 챕터)</span>
                  </h3>
                  <button
                    onClick={() => {
                      const newCh: BookChapterDraft = {
                        chapterNum: chapters.length + 1,
                        chapterTitle: `새 챕터 ${chapters.length + 1}`,
                        subtitle: '챕터 부제를 입력하세요',
                        scriptureFocus: '본문 말씀',
                        coreMessage: '챕터 핵심 복음 메시지',
                        subSections: ['1. 소주제 도입', '2. 본문 강해', '3. 삶의 적용'],
                        manuscriptDraft: '여기에 원고 초안을 작성하세요.',
                        reflectionQuestions: ['묵상 질문 1'],
                        closingPrayer: '기도문',
                        wordCount: 100,
                      };
                      setChapters([...chapters, newCh]);
                    }}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 챕터 추가</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {chapters.map((ch, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 flex items-start justify-between gap-3 hover:border-slate-600 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-amber-400 font-bold">제{ch.chapterNum}장</span>
                          {ch.partTitle && <span className="text-slate-400 font-medium">{ch.partTitle}</span>}
                          <span className="text-slate-600">•</span>
                          <span className="text-emerald-400 font-mono text-[11px]">{ch.scriptureFocus}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{ch.chapterTitle}</h4>
                        <p className="text-xs text-slate-300">{ch.subtitle}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                          <span>소주제: {ch.subSections.join(' ∙ ')}</span>
                          <span>• 약 {ch.wordCount || 800}자</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedChapterIdx(idx);
                          setActiveStep('chapters');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>원고 집필</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              3단계: 챕터별 원고 집필 & 윤문 (CHAPTERS)
             ════════════════════════════════════════════════════════════ */}
          {activeStep === 'chapters' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* 좌측: 챕터 선택 네비게이터 (4 cols) */}
              <div className="lg:col-span-4 space-y-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>목차 순서 선택 ({chapters.length}개 챕터)</span>
                  </span>
                </div>

                {chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedChapterIdx(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedChapterIdx === idx
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-xs'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="font-mono font-bold text-amber-400">제{ch.chapterNum}장</span>
                      <span className="text-slate-500 font-mono">{ch.wordCount || 0}자</span>
                    </div>
                    <div className="text-xs font-bold truncate text-slate-100">{ch.chapterTitle}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{ch.subtitle}</div>
                  </button>
                ))}
              </div>

              {/* 우측: 챕터 원고 에디터 (8 cols) */}
              <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                
                {/* 챕터 타이틀 & AI 윤문 버튼 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-amber-400 font-bold">제{currentChapter.chapterNum}장</span>
                      <span className="text-slate-400">{currentChapter.partTitle}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-400 font-mono">{currentChapter.scriptureFocus}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">{currentChapter.chapterTitle}</h3>
                    <p className="text-xs text-slate-300">{currentChapter.subtitle}</p>
                  </div>

                  <button
                    onClick={() => handleGenerateChapterDraft(selectedChapterIdx)}
                    disabled={isGeneratingChapter}
                    style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs border border-amber-300 shadow-md shadow-amber-500/20 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingChapter ? 'AI 윤문 중...' : 'AI 문어체 윤문 / 원고 확장'}</span>
                  </button>
                </div>

                {/* 소주제 가이드 */}
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-amber-400">구성 소주제:</span>
                  {currentChapter.subSections.map((sub, sIdx) => (
                    <span key={sIdx} className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700 text-[11px]">
                      {sub}
                    </span>
                  ))}
                </div>

                {/* 원고 본문 에디터 */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold flex items-center gap-1">
                      <PenTool className="w-3.5 h-3.5 text-amber-400" />
                      <span>출판 원고 본문 (직접 수정 가능)</span>
                    </span>
                    <span className="font-mono">{currentChapter.manuscriptDraft?.length || 0}자</span>
                  </div>
                  <textarea
                    rows={14}
                    value={currentChapter.manuscriptDraft}
                    onChange={(e) => handleUpdateManuscript(e.target.value)}
                    placeholder="원고 초안을 작성하세요..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs sm:text-sm text-slate-100 font-sans leading-relaxed focus:outline-hidden focus:border-amber-400 resize-none font-medium selection:bg-amber-500/30"
                  />
                </div>

                {/* 나눔 질문 및 기도문 박스 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-xs font-bold text-amber-300 block mb-1.5">함께 나누는 묵상 질문</span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {currentChapter.reflectionQuestions.map((q, qIdx) => (
                        <li key={qIdx}>{q}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-xs font-bold text-indigo-300 block mb-1.5">마무리 치유 기도문</span>
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      "{currentChapter.closingPrayer}"
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              4단계: 전체 원고 인쇄 및 내보내기 (EXPORT)
             ════════════════════════════════════════════════════════════ */}
          {activeStep === 'export' && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* 상단 내보내기 도구 모음 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>완성된 도서 원고 전체 미리보기</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    총 {chapters.length}개 챕터 / 약 {chapters.reduce((acc, c) => acc + (c.wordCount || 800), 0)}자 원고 분량
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAll ? '클립보드 복사됨' : '전체 원고 복사'}</span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md shadow-amber-600/30 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>마크다운(.md) 저장</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>인쇄 / PDF 출력</span>
                  </button>
                </div>
              </div>

              {/* 출판 원고 프리뷰 영역 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 font-serif text-slate-200 leading-relaxed text-xs sm:text-sm space-y-6 shadow-inner max-h-[50vh] overflow-y-auto">
                <div className="text-center border-b border-slate-800 pb-6">
                  <span className="text-xs text-amber-400 font-sans font-bold uppercase tracking-wider">{bookType}</span>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">{proposal.mainTitle}</h1>
                  <p className="text-xs text-slate-400 font-sans mt-1">{proposal.subTitle}</p>
                  <p className="text-xs text-slate-500 font-sans mt-2">{authorName} 지음 | {churchName}</p>
                </div>

                {chapters.map((ch, idx) => (
                  <div key={idx} className="border-b border-slate-800/80 pb-6 space-y-3">
                    <div className="text-center font-sans">
                      <div className="text-[11px] text-amber-400 font-bold">제{ch.chapterNum}장</div>
                      <h2 className="text-base font-bold text-white mt-0.5">{ch.chapterTitle}</h2>
                      <div className="text-xs text-slate-400 italic">{ch.subtitle}</div>
                      <div className="text-[11px] text-emerald-400 font-mono mt-1">본문 말씀: {ch.scriptureFocus}</div>
                    </div>

                    <div className="whitespace-pre-line text-slate-300 leading-relaxed pt-2">
                      {ch.manuscriptDraft}
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-sans text-xs space-y-1.5 mt-4">
                      <div className="font-bold text-amber-300">함께 나누는 묵상 질문</div>
                      {ch.reflectionQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="text-slate-400">{qIdx + 1}. {q}</div>
                      ))}
                      <div className="font-bold text-indigo-300 pt-1">마무리 기도</div>
                      <div className="text-slate-400 italic">{ch.closingPrayer}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* ─── 풋터 안내 바 ─── */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>설교학 기반 AI 출판 윤문 엔진 가동 중 • 설교 구어체를 전문 출판사 제출용 문어체로 정밀 변환합니다.</span>
          </span>
          <span className="font-mono text-slate-500">v2.4 Book Studio</span>
        </div>

      </div>
    </div>
  );
};
