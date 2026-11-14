import { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
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
  ArrowLeft,
  BookMarked,
  Printer,
  Library,
  PenTool,
  FileUp,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  SermonRecord,
  BookProject,
  UploadedMaterial,
  BookChapterDraft,
} from '../types/sermon';
import { buildStrategicBookPlan } from '../utils/bookGenerator';
import { getPersonalGeminiApiKey, getDeviceAuthInfo } from '../utils/auth';

export interface SavedBookProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  bookType: BookProject['bookType'];
  writingStyle: BookProject['writingStyle'];
  authorName: string;
  churchName: string;
  selectedSermonIds: string[];
  uploadedMaterials: UploadedMaterial[];
  proposal: BookProject['proposal'];
  chapters: BookChapterDraft[];
}

interface BookWritingStudioProps {
  isOpen: boolean;
  onClose: () => void;
  isSidebarOpen?: boolean;
  sermons: SermonRecord[];
  activeSermonId?: string;
  defaultAuthorName?: string;
  defaultChurchName?: string;
}

const getBookProjectsStorageKey = (): string => {
  try {
    const auth = getDeviceAuthInfo();
    const key = (auth.licenseKey || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (key) return `sermon_coaching_book_projects_v1_${key}`;
  } catch {
    // ignore
  }
  return 'sermon_coaching_book_projects_v1_default';
};

export const BookWritingStudio: React.FC<BookWritingStudioProps> = ({
  isOpen,
  onClose,
  isSidebarOpen = true,
  sermons,
  activeSermonId,
  defaultAuthorName,
  defaultChurchName,
}) => {
  const createDefaultProjects = (): SavedBookProject[] => {
    const author = defaultAuthorName || sermons[0]?.meta.preacher || '이은혜 담임목사';
    const church = defaultChurchName || sermons[0]?.meta.churchName || '은혜의빛교회';
    const firstIds = sermons.length > 0 ? [sermons[0].meta.id] : [];
    const allIds = sermons.map((s) => s.meta.id);

    const plan1 = buildStrategicBookPlan({
      bookType: '에세이/신앙성숙',
      writingStyle: '따뜻한 감성 에세이체',
      authorName: author,
      churchName: church,
      sermons: sermons.length > 0 ? [sermons[0]] : [],
      materials: [],
    });

    const plan2 = buildStrategicBookPlan({
      bookType: '강해설교집',
      writingStyle: '깊이 있는 강해·신학체',
      authorName: author,
      churchName: church,
      sermons: sermons.length > 1 ? sermons.slice(0, 3) : sermons,
      materials: [],
    });

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return [
      {
        id: 'book-proj-1',
        createdAt: today,
        updatedAt: today,
        bookType: '에세이/신앙성숙',
        writingStyle: '따뜻한 감성 에세이체',
        authorName: author,
        churchName: church,
        selectedSermonIds: firstIds,
        uploadedMaterials: [],
        proposal: plan1.proposal,
        chapters: plan1.chapters,
      },
      {
        id: 'book-proj-2',
        createdAt: today,
        updatedAt: today,
        bookType: '강해설교집',
        writingStyle: '깊이 있는 강해·신학체',
        authorName: author,
        churchName: church,
        selectedSermonIds: allIds.length > 0 ? allIds : firstIds,
        uploadedMaterials: [],
        proposal: {
          ...plan2.proposal,
          mainTitle:
            plan2.proposal.mainTitle === plan1.proposal.mainTitle
              ? '강단에서 피어나는 언약의 복음'
              : plan2.proposal.mainTitle,
        },
        chapters: plan2.chapters,
      },
    ];
  };

  const [projects, setProjects] = useState<SavedBookProject[]>(() => {
    try {
      const raw = localStorage.getItem(getBookProjectsStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return createDefaultProjects();
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => projects[0]?.id || 'book-proj-1');
  const [activeStep, setActiveStep] = useState<'materials' | 'proposal' | 'chapters' | 'export'>('materials');

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // 현재 선택된 프로젝트의 상태들
  const [bookType, setBookType] = useState<BookProject['bookType']>(
    activeProject?.bookType || '에세이/신앙성숙'
  );
  const [writingStyle, setWritingStyle] = useState<BookProject['writingStyle']>(
    activeProject?.writingStyle || '따뜻한 감성 에세이체'
  );
  const [authorName, setAuthorName] = useState(
    activeProject?.authorName || defaultAuthorName || '이은혜 담임목사'
  );
  const [churchName, setChurchName] = useState(
    activeProject?.churchName || defaultChurchName || '은혜의빛교회'
  );
  const [selectedSermonIds, setSelectedSermonIds] = useState<string[]>(
    activeProject?.selectedSermonIds || (activeSermonId ? [activeSermonId] : sermons.map((s) => s.meta.id))
  );
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>(
    activeProject?.uploadedMaterials || []
  );
  const [proposal, setProposal] = useState<BookProject['proposal']>(
    activeProject?.proposal || {
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
    }
  );
  const [chapters, setChapters] = useState<BookChapterDraft[]>(activeProject?.chapters || []);

  const [isExtractingFiles, setIsExtractingFiles] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [manualNoteTitle, setManualNoteTitle] = useState('');
  const [manualNoteText, setManualNoteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(0);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // 프로젝트 목록 localStorage 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(getBookProjectsStorageKey(), JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  // 현재 편집 중인 내용을 activeProject에 동기화
  useEffect(() => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              bookType,
              writingStyle,
              authorName,
              churchName,
              selectedSermonIds,
              uploadedMaterials,
              proposal,
              chapters,
            }
          : p
      )
    );
  }, [
    activeProjectId,
    bookType,
    writingStyle,
    authorName,
    churchName,
    selectedSermonIds,
    uploadedMaterials,
    proposal,
    chapters,
  ]);

  // 좌측 사이드바에서 다른 도서 프로젝트를 클릭했을 때 로드
  const handleSelectProject = (proj: SavedBookProject) => {
    setActiveProjectId(proj.id);
    setBookType(proj.bookType);
    setWritingStyle(proj.writingStyle);
    setAuthorName(proj.authorName);
    setChurchName(proj.churchName);
    setSelectedSermonIds(proj.selectedSermonIds);
    setUploadedMaterials(proj.uploadedMaterials);
    setProposal(proj.proposal);
    setChapters(proj.chapters);
    setSelectedChapterIdx(0);
  };

  // 새 도서 집필 프로젝트 생성
  const handleCreateNewProject = () => {
    const author = defaultAuthorName || authorName || '이은혜 담임목사';
    const church = defaultChurchName || churchName || '은혜의빛교회';
    const initialSermonIds = activeSermonId
      ? [activeSermonId]
      : sermons.length > 0
      ? [sermons[0].meta.id]
      : [];
    const targetSermons = sermons.filter((s) => initialSermonIds.includes(s.meta.id));

    const strategicPlan = buildStrategicBookPlan({
      bookType: '에세이/신앙성숙',
      writingStyle: '따뜻한 감성 에세이체',
      authorName: author,
      churchName: church,
      sermons: targetSermons.length > 0 ? targetSermons : sermons.slice(0, 1),
      materials: [],
    });

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const newProjNumber = projects.length + 1;
    const newProj: SavedBookProject = {
      id: `book-proj-${Date.now()}`,
      createdAt: today,
      updatedAt: today,
      bookType: '에세이/신앙성숙',
      writingStyle: '따뜻한 감성 에세이체',
      authorName: author,
      churchName: church,
      selectedSermonIds: initialSermonIds,
      uploadedMaterials: [],
      proposal: {
        ...strategicPlan.proposal,
        mainTitle: `새 도서 프로젝트 #${newProjNumber}: ${strategicPlan.proposal.mainTitle}`,
      },
      chapters: strategicPlan.chapters,
    };

    setProjects((prev) => [newProj, ...prev]);
    handleSelectProject(newProj);
    setActiveStep('materials');
  };

  // 도서 프로젝트 삭제
  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      alert('최소 1개의 도서 집필 프로젝트는 유지되어야 합니다.');
      return;
    }
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeProjectId === id && remaining[0]) {
      handleSelectProject(remaining[0]);
    }
  };

  if (!isOpen) return null;

  // 설교 선택 토글 및 전략 기획안 자동 재편성
  const recalculatePlan = (
    nextSermonIds: string[],
    nextMaterials: UploadedMaterial[],
    nextBookType = bookType,
    nextWritingStyle = writingStyle,
    nextAuthor = authorName,
    nextChurch = churchName
  ) => {
    const selectedSermonsData = sermons.filter((s) => nextSermonIds.includes(s.meta.id));
    if (selectedSermonsData.length === 0) return;

    const strategicPlan = buildStrategicBookPlan({
      bookType: nextBookType,
      writingStyle: nextWritingStyle,
      authorName: nextAuthor,
      churchName: nextChurch,
      sermons: selectedSermonsData,
      materials: nextMaterials,
    });

    setProposal(strategicPlan.proposal);
    setChapters(strategicPlan.chapters);
    setSelectedChapterIdx(0);
  };

  const handleToggleSermon = (id: string) => {
    const nextIds = selectedSermonIds.includes(id)
      ? selectedSermonIds.filter((item) => item !== id)
      : [...selectedSermonIds, id];
    setSelectedSermonIds(nextIds);
    recalculatePlan(nextIds, uploadedMaterials);
  };

  // 자료 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsExtractingFiles(true);
    const fileArray = Array.from(files);

    try {
      const parsedItems: UploadedMaterial[] = [];

      for (const file of fileArray) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let fileType: UploadedMaterial['fileType'] = 'other';
        if (ext === 'pdf') fileType = 'pdf';
        else if (ext === 'ppt' || ext === 'pptx') fileType = 'ppt';
        else if (ext === 'doc' || ext === 'docx' || ext === 'hwpx') fileType = 'docx';
        else if (ext === 'txt' || ext === 'md' || ext === 'csv') fileType = 'txt';

        let extractedText = '';
        let summaryPoint = '';

        if (ext === 'txt' || ext === 'md' || ext === 'csv') {
          const raw = await file.text();
          extractedText = raw.trim().slice(0, 2500);
          summaryPoint = raw.trim().split('\n')[0]?.slice(0, 140) || `${file.name} 핵심 원문`;
        } else {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('파일 읽기 오류'));
            reader.readAsDataURL(file);
          });

          try {
            const res = await fetch('/api/book/extract-material', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-gemini-key': getPersonalGeminiApiKey(),
              },
              body: JSON.stringify({ fileName: file.name, base64Data }),
            });
            if (res.ok) {
              const data = await res.json();
              extractedText = data.extractedText || '';
              summaryPoint = data.summaryPoint || '';
            }
          } catch (err) {
            console.warn('Server material parser fallback:', err);
          }
        }

        if (!extractedText) {
          const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
          extractedText = `[${cleanTitle}] 문서 주제를 바탕으로 성경 주해 및 목회 적용 내용을 반영합니다. (아래 입력창에서 핵심 메모를 추가로 보완하실 수 있습니다.)`;
          summaryPoint = `${cleanTitle} 핵심 주제 및 목회 연구 포인트`;
        }

        const sizeKb = file.size / 1024;
        const sizeLabel =
          sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKb))} KB`;

        parsedItems.push({
          id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fileName: file.name,
          fileType,
          fileSizeLabel: sizeLabel,
          extractedText,
          summaryPoint: summaryPoint || `${file.name} 핵심 요약`,
          uploadedAt: new Date().toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }

      const nextMaterials = [...parsedItems, ...uploadedMaterials];
      setUploadedMaterials(nextMaterials);
      recalculatePlan(selectedSermonIds, nextMaterials);
    } finally {
      setIsExtractingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 직접 텍스트/주해 메모 추가 핸들러
  const handleAddManualNote = () => {
    if (!manualNoteText.trim()) return;
    const titleLabel = (manualNoteTitle.trim() || '목회 주해 및 집필 메모') + '.txt';
    const cleanText = manualNoteText.trim();
    const newMat: UploadedMaterial = {
      id: `mat-note-${Date.now()}`,
      fileName: titleLabel,
      fileType: 'txt',
      fileSizeLabel: `${Math.max(1, Math.round(cleanText.length / 500))} KB`,
      extractedText: cleanText,
      summaryPoint: cleanText.split('\n')[0].slice(0, 140),
      uploadedAt: new Date().toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    const nextMaterials = [newMat, ...uploadedMaterials];
    setUploadedMaterials(nextMaterials);
    recalculatePlan(selectedSermonIds, nextMaterials);
    setManualNoteTitle('');
    setManualNoteText('');
    setIsAddingNote(false);
  };

  // 업로드 자료의 추출 본문 직접 수정
  const handleUpdateMaterialText = (id: string, nextText: string) => {
    const nextMaterials = uploadedMaterials.map((m) =>
      m.id === id
        ? {
            ...m,
            extractedText: nextText,
            summaryPoint: nextText.trim().split('\n')[0]?.slice(0, 140) || m.summaryPoint,
          }
        : m
    );
    setUploadedMaterials(nextMaterials);
  };

  // AI 도서 기획안 생성/업데이트
  const handleGenerateProposal = async () => {
    setIsGeneratingProposal(true);
    const selectedSermonsData = sermons.filter((s) => selectedSermonIds.includes(s.meta.id));

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
        headers: {
          'Content-Type': 'application/json',
          'x-user-gemini-key': getPersonalGeminiApiKey(),
        },
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
        headers: {
          'Content-Type': 'application/json',
          'x-user-gemini-key': getPersonalGeminiApiKey(),
        },
        body: JSON.stringify({
          chapter: targetChapter,
          writingStyle,
          authorName,
          proposal,
          materials: uploadedMaterials,
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

  const currentChapter = chapters[selectedChapterIdx] || chapters[0] || {
    chapterNum: 1,
    partTitle: '제1부',
    chapterTitle: '첫 번째 챕터',
    subtitle: '부제',
    scriptureFocus: '성경 본문',
    coreMessage: '',
    subSections: [],
    manuscriptDraft: '',
    reflectionQuestions: [],
    closingPrayer: '',
    wordCount: 0,
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isSidebarOpen ? '340px 1fr' : '1fr',
        gap: 20,
        alignItems: 'start',
        minHeight: 0,
      }}
    >
      {/* ══ 좌측: 도서 집필 프로젝트 아카이브 사이드바 (설교 피드백 아카이브와 동일 구조) ══ */}
      {isSidebarOpen && (
        <aside style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            {/* 상단 헤더 */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BookMarked className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>도서 집필 프로젝트</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        {projects.length}권 집필 중
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">여러 권의 책을 동시에 기획·집필합니다</p>
                  </div>
                </div>
              </div>

              {/* 새 도서 프로젝트 만들기 버튼 */}
              <button
                type="button"
                onClick={handleCreateNewProject}
                style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
                className="w-full py-2.5 px-3 rounded-xl font-extrabold text-xs border border-amber-300 shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>새 도서 집필 프로젝트 만들기</span>
              </button>
            </div>

            {/* 도서 프로젝트 리스트 */}
            <div className="p-3 space-y-2.5">
              {projects.map((proj, index) => {
                const isActive = proj.id === activeProjectId;
                const totalNum = projects.length - index;
                const totalChars = proj.chapters.reduce((acc, c) => acc + (c.wordCount || 800), 0);

                return (
                  <div
                    key={proj.id}
                    onClick={() => handleSelectProject(proj)}
                    className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-950/60 via-slate-800/90 to-slate-800/80 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          #{totalNum}권
                        </span>
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{proj.updatedAt}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          {proj.chapters.length}개 챕터
                        </span>
                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                            title="도서 프로젝트 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3
                      className={`text-xs font-bold mt-2 line-clamp-1 ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {proj.proposal.mainTitle}
                    </h3>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-amber-300/90 font-medium truncate max-w-[165px]">
                        {proj.bookType} • 설교 {proj.selectedSermonIds.length}편
                      </span>
                      <div className="flex items-center space-x-2 text-slate-400">
                        <span>약 {totalChars.toLocaleString()}자</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 하단: 설교 코칭 스튜디오 복귀 버튼 */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/90">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span>설교 코칭 스튜디오로 돌아가기</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ══ 우측: 선택한 도서 프로젝트 집필 스테이지 ══ */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 min-w-0">
        {/* ─── 상단 프로젝트 헤더 ─── */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  AI 출판 &amp; 도서 집필 스튜디오
                </span>
                <span className="text-xs text-slate-400">• {bookType} ({writingStyle})</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
                <span>{proposal.mainTitle}</span>
                <span className="text-xs font-normal text-slate-400">({authorName})</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? '복사 완료!' : '원고 복사'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>원고 다운로드 (.md)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-xs font-bold text-indigo-200 border border-indigo-500/40 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>설교 코칭 화면으로</span>
            </button>
          </div>
        </div>

        {/* ─── 4단계 프로세스 네비게이션 탭 ─── */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'materials', stepNum: '1단계', label: '자료 수집 & 설교 선택', count: `${selectedSermonIds.length}편 / ${uploadedMaterials.length}개 자료` },
            { id: 'proposal',  stepNum: '2단계', label: '도서 기획안 & 목차',    count: `${chapters.length}개 챕터 구성` },
            { id: 'chapters',  stepNum: '3단계', label: '챕터별 원고 집필·윤문', count: `제${currentChapter?.chapterNum || 1}장 편집 중` },
            { id: 'export',    stepNum: '4단계', label: '전체 원고 인쇄·내보내기', count: '완성본 출력' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStep(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeStep === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  activeStep === tab.id
                    ? 'bg-slate-950/30 text-slate-950 font-extrabold'
                    : 'bg-slate-800 text-amber-400 font-bold'
                }`}
              >
                {tab.stepNum}
              </span>
              <span>{tab.label}</span>
              <span
                className={`text-[10px] opacity-80 ${
                  activeStep === tab.id ? 'text-slate-900 font-medium' : 'text-slate-400'
                }`}
              >
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        {/* ─── 메인 바디 컨텐츠 ─── */}
        <div className="p-4 sm:p-6 bg-slate-950/40">
          {/* ════════════════════════════════════════════════════════════
              1단계: 자료 수집 및 설교 선택 (MATERIALS)
             ════════════════════════════════════════════════════════════ */}
          {activeStep === 'materials' && (
            <div className="space-y-6">
              {/* 도서 장르 및 저자 설정 바 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">도서 장르 / 출판 형태</label>
                  <select
                    value={bookType}
                    onChange={(e) => {
                      const nextType = e.target.value as BookProject['bookType'];
                      setBookType(nextType);
                      recalculatePlan(selectedSermonIds, uploadedMaterials, nextType, writingStyle);
                    }}
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
                    onChange={(e) => {
                      const nextStyle = e.target.value as BookProject['writingStyle'];
                      setWritingStyle(nextStyle);
                      recalculatePlan(selectedSermonIds, uploadedMaterials, bookType, nextStyle);
                    }}
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
                      <span>
                        이 책에 포함할 설교 영상 선택 ({selectedSermonIds.length}편 선택됨 → 총 {chapters.length}개 챕터 자동 편성)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      1편 선택 시 해당 설교를 4개 장으로 심층 확장하며, 여러 편 선택 시 모든 설교의 본문과 대지를 부(Part)별로 엮어 통합 기획합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = sermons.map((s) => s.meta.id);
                        setSelectedSermonIds(allIds);
                        recalculatePlan(allIds, uploadedMaterials);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-bold text-amber-300 cursor-pointer"
                    >
                      전체 설교 선택 ({sermons.length}편)
                    </button>
                    {selectedSermonIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const firstOnly = [sermons[0]?.meta.id].filter(Boolean);
                          setSelectedSermonIds(firstOnly);
                          recalculatePlan(firstOnly, uploadedMaterials);
                        }}
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

              {/* 외부 참고자료 업로드 (PDF, PPTX, DOCX, HWPX, TXT) 및 직접 메모 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-indigo-400" />
                      <span>설교 준비 참고자료 &amp; 원고 메모 업로드 ({uploadedMaterials.length}건 추가됨)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      업로드하신 파일(PDF, PPTX, DOCX, HWPX, TXT)의 실제 본문 텍스트를 추출하여 도서 기획안과 각 장 원고에 직접 반영합니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(!isAddingNote)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-300 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>직접 메모·원고 입력</span>
                    </button>

                    <button
                      type="button"
                      disabled={isExtractingFiles}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {isExtractingFiles ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isExtractingFiles ? '문서 본문 추출 중...' : '자료 파일 올리기'}</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.hwpx,.txt,.md,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* 직접 메모 붙여넣기 인라인 폼 */}
                {isAddingNote && (
                  <div className="mb-3 p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-2.5">
                    <input
                      type="text"
                      value={manualNoteTitle}
                      onChange={(e) => setManualNoteTitle(e.target.value)}
                      placeholder="자료 제목 (예: 로마서 원어 주해 노트, 특별 새벽기도 강의안)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                    <textarea
                      rows={4}
                      value={manualNoteText}
                      onChange={(e) => setManualNoteText(e.target.value)}
                      placeholder="설교 원고 초안, 성경 주석 발췌, 예화, 소그룹 질문 등 책 기획과 원고에 포함할 내용을 자유롭게 붙여넣으세요..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-hidden focus:border-amber-400"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleAddManualNote}
                        style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#020617' }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                      >
                        자료 목록에 추가 및 기획안 반영
                      </button>
                    </div>
                  </div>
                )}

                {/* 자료 목록 */}
                {uploadedMaterials.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-950/40 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-1.5 opacity-80" />
                    <p className="text-xs font-semibold text-slate-300">
                      현재 추가된 외부 자료가 없습니다 (클릭하여 PDF, PPTX, DOCX, TXT 파일 업로드)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      자료를 올리시면 파일 안의 실제 텍스트를 읽어와 선택한 설교 영상들과 함께 책 기획안 및 심화 챕터로 구성합니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {uploadedMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-3 rounded-xl bg-slate-800/60 border border-indigo-500/30 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start space-x-2.5 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 font-bold uppercase text-[10px]">
                            {mat.fileType}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                              <span>{mat.fileName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({mat.fileSizeLabel})</span>
                              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                                본문 추출 &amp; 기획안 연동됨
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              value={mat.extractedText}
                              onChange={(e) => handleUpdateMaterialText(mat.id, e.target.value)}
                              className="w-full text-slate-200 text-[11px] mt-1.5 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-700 focus:outline-hidden focus:border-indigo-400"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const nextMats = uploadedMaterials.filter((m) => m.id !== mat.id);
                            setUploadedMaterials(nextMats);
                            recalculatePlan(selectedSermonIds, nextMats);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          title="자료 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 기획안 생성 버튼 */}
              <div className="text-center pt-2">
                <button
                  type="button"
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
            <div className="space-y-6">
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
                        <strong className="text-amber-400 font-mono">설교 {i + 1}</strong>
                        <span>{s.meta.sermonTitle}</span>
                        <span className="text-indigo-400 font-mono text-[10px]">({s.meta.scriptureRef})</span>
                      </span>
                    ))}
                  {uploadedMaterials.map((m, idx) => (
                    <span
                      key={m.id}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 flex items-center gap-1.5"
                    >
                      <strong className="text-emerald-400 font-mono">자료 {idx + 1}</strong>
                      <span>{m.fileName}</span>
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
                    type="button"
                    onClick={() => setActiveStep('chapters')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
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
                    type="button"
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
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
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
                        type="button"
                        onClick={() => {
                          setSelectedChapterIdx(idx);
                          setActiveStep('chapters');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white flex items-center gap-1 shrink-0 cursor-pointer"
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
                    type="button"
                    onClick={() => setSelectedChapterIdx(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
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
                    type="button"
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
            <div className="space-y-6">
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

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAll ? '클립보드 복사됨' : '전체 원고 복사'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>마크다운(.md) 저장</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>인쇄 / PDF 출력</span>
                  </button>
                </div>
              </div>

              {/* 출판 원고 프리뷰 영역 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 font-serif text-slate-200 leading-relaxed text-xs sm:text-sm space-y-6 shadow-inner">
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
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>다중 도서 프로젝트 동시 집필 지원 • 선택한 프로젝트마다 기획안과 원고가 자동 저장됩니다.</span>
          </span>
          <span className="font-mono text-slate-500">v2.5.2 Book Studio</span>
        </div>
      </section>
    </div>
  );
};
