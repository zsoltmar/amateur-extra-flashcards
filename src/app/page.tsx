'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Question, FlashcardMode, FlashcardStats } from '@/types/question';
import { Flashcard } from '@/components/Flashcard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionPool } from '@/components/QuestionPool';
// import { Stats } from '@/components/Stats';
import { loadQuestions, shuffleArray, calculateAccuracy } from '@/lib/questions';
import { ChevronLeft, ChevronRight, Menu, PanelLeftClose, Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const STORAGE_KEY = 'amxtra-progress-v1';
  const UI_STORAGE_KEY = 'amxtra-ui-v1';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<FlashcardMode>('multiple-choice');
  const [stats, setStats] = useState<FlashcardStats>({
    totalQuestions: 0,
    answeredQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  // const [showQuestionPool, setShowQuestionPool] = useState(false);
  // const [showStats, setShowStats] = useState(false);
  const [seenQuestionIds, setSeenQuestionIds] = useState<Set<string>>(new Set());
  const [answerResults, setAnswerResults] = useState<Record<string, boolean>>({});
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return true;
      const raw = localStorage.getItem('amxtra-ui-v1');
      if (!raw) return true;
      const ui = JSON.parse(raw);
      return typeof ui?.showSidebar === 'boolean' ? ui.showSidebar : true;
    } catch {
      return true;
    }
  });

  // Hard marks and pool filter
  const HARD_STORAGE_KEY = 'amxtra-hard-v1';
  const [hardQuestionIds, setHardQuestionIds] = useState<Set<string>>(() => {
    try {
      if (typeof window === 'undefined') return new Set<string>();
      const raw = localStorage.getItem(HARD_STORAGE_KEY);
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set<string>(arr) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [poolFilter, setPoolFilter] = useState<'all' | 'seen' | 'correct' | 'wrong' | 'hard'>(() => {
    try {
      if (typeof window === 'undefined') return 'all';
      const raw = localStorage.getItem(UI_STORAGE_KEY);
      if (!raw) return 'all';
      const ui = JSON.parse(raw);
      return ui?.poolFilter === 'seen' || ui?.poolFilter === 'correct' || ui?.poolFilter === 'wrong' || ui?.poolFilter === 'hard' ? ui.poolFilter : 'all';
    } catch {
      return 'all';
    }
  });

  // Navigation and advance mode
  const [advanceMode, setAdvanceMode] = useState<'random' | 'random-unique' | 'sequential'>('random');
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navPos, setNavPos] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}
  };

  useEffect(() => {
    loadQuestions().then((loadedQuestions) => {
      // Try to restore from localStorage
      type SavedState = {
        orderIds?: string[];
        currentId?: string;
        seenIds?: string[];
        answerResults?: Record<string, boolean>;
        mode?: FlashcardMode;
        advanceMode?: 'random' | 'random-unique' | 'sequential';
        navHistory?: string[];
        navPos?: number;
      };
      let saved: SavedState | null = null;
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (raw) saved = JSON.parse(raw);
      } catch {}
      // Preserve original order for the pool grid and build a lookup map
      setOriginalQuestions(loadedQuestions);
      const byId = new Map(loadedQuestions.map((q) => [q.id, q] as const));
      const allIds = new Set(loadedQuestions.map((q) => q.id));

      let nextQuestions = shuffleArray(loadedQuestions);
      let nextCurrentIndex = 0;
      let nextSeen = new Set<string>();
      let nextAnswerResults: Record<string, boolean> = {};
      let nextMode: FlashcardMode = 'multiple-choice';
      let nextAdvanceMode: 'random' | 'random-unique' | 'sequential' = 'random';
      let nextHistory: string[] = [];
      let nextHistoryPos = 0;

      const validSavedOrder = Array.isArray(saved?.orderIds)
        && saved.orderIds.length === loadedQuestions.length
        && saved.orderIds.every((id: string) => allIds.has(id));

      if (saved && validSavedOrder) {
        const s = saved as SavedState;
        nextQuestions = s.orderIds!.map((id: string) => byId.get(id)!) as Question[];
        const currId = s.currentId as string | undefined;
        const idx = currId ? nextQuestions.findIndex((q) => q.id === currId) : 0;
        nextCurrentIndex = idx >= 0 ? idx : 0;
        if (Array.isArray(s.seenIds)) nextSeen = new Set<string>(s.seenIds);
        if (s.answerResults && typeof s.answerResults === 'object') nextAnswerResults = s.answerResults as Record<string, boolean>;
        if (s.mode) nextMode = s.mode as FlashcardMode;
        if (s.advanceMode) {
          const m = s.advanceMode as string;
          if (m === 'random' || m === 'sequential' || m === 'random-unique') {
            nextAdvanceMode = m;
          } else {
            nextAdvanceMode = 'random';
          }
        }
        if (Array.isArray(s.navHistory)) nextHistory = s.navHistory.filter((id: string) => allIds.has(id));
        if (typeof s.navPos === 'number') nextHistoryPos = Math.min(Math.max(0, s.navPos), Math.max(0, nextHistory.length - 1));
      } else {
        // Fresh session fallback: mark first as seen
        if (nextQuestions.length > 0) {
          const firstId = nextQuestions[0].id;
          nextSeen = new Set([firstId]);
          nextHistory = [firstId];
          nextHistoryPos = 0;
        }
      }

      setQuestions(nextQuestions);
      setCurrentIndex(nextCurrentIndex);
      setSeenQuestionIds(nextSeen);
      setAnswerResults(nextAnswerResults);
      setMode(nextMode);
      setAdvanceMode(nextAdvanceMode);
      if (!nextHistory.length && nextQuestions.length) {
        const currId = nextQuestions[nextCurrentIndex]?.id;
        if (currId) {
          nextHistory = [currId];
          nextHistoryPos = 0;
        }
      }
      setNavHistory(nextHistory);
      setNavPos(nextHistoryPos);
      // Derive stats from answerResults
      const right = Object.values(nextAnswerResults).filter((v) => v === true).length;
      const answered = Object.keys(nextAnswerResults).length;
      setStats({
        totalQuestions: nextQuestions.length,
        answeredQuestions: answered,
        correctAnswers: right,
        wrongAnswers: answered - right,
        accuracy: calculateAccuracy(right, answered),
      });

      setIsLoading(false);
    });
  }, []);

  // Persist progress to localStorage
  useEffect(() => {
    if (!questions.length) return;
    try {
      const data = {
        version: 1,
        orderIds: questions.map((q) => q.id),
        currentId: questions[currentIndex]?.id,
        seenIds: Array.from(seenQuestionIds),
        answerResults,
        mode,
        advanceMode,
        navHistory,
        navPos,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [questions, currentIndex, seenQuestionIds, answerResults, mode, advanceMode, navHistory, navPos]);

  // Persist UI prefs (sidebar + poolFilter)
  useEffect(() => {
    try {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ showSidebar, poolFilter }));
    } catch {}
  }, [showSidebar, poolFilter]);

  // Persist hard marks
  useEffect(() => {
    try {
      localStorage.setItem(HARD_STORAGE_KEY, JSON.stringify(Array.from(hardQuestionIds)));
    } catch {}
  }, [hardQuestionIds]);

  const currentQuestion = questions[currentIndex];
  const canGoBack = navPos > 0 && navHistory.length > 0;

  const handleAnswer = (isCorrect: boolean) => {
    setStats(prev => {
      const newStats = {
        ...prev,
        answeredQuestions: prev.answeredQuestions + 1,
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
        wrongAnswers: prev.wrongAnswers + (isCorrect ? 0 : 1),
        accuracy: 0
      };
      newStats.accuracy = calculateAccuracy(newStats.correctAnswers, newStats.answeredQuestions);
      return newStats;
    });
    // Track per-question result in quiz mode
    if (currentQuestion) {
      setAnswerResults(prev => ({ ...prev, [currentQuestion.id]: isCorrect }));
    }
  };

  const toggleHardCurrent = () => {
    const id = currentQuestion?.id;
    if (!id) return;
    setHardQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleNext = useCallback(() => {
    // Mark current as seen
    if (currentQuestion) {
      setSeenQuestionIds(prev => new Set([...prev, currentQuestion.id]));
    }

    // If we're not at the tip of history, move forward within history
    if (navPos < navHistory.length - 1) {
      const nextIdInHistory = navHistory[navPos + 1];
      const idx = questions.findIndex(q => q.id === nextIdInHistory);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setNavPos(navPos + 1);
        // Ensure destination counts as seen as well
        setSeenQuestionIds(prev => new Set([...prev, nextIdInHistory]));
        return;
      }
    }

    const activePool = (() => {
      switch (poolFilter) {
        case 'hard':
          return originalQuestions.filter(q => hardQuestionIds.has(q.id));
        case 'seen':
          return originalQuestions.filter(q => seenQuestionIds.has(q.id));
        case 'correct':
          return originalQuestions.filter(q => answerResults[q.id] === true);
        case 'wrong':
          return originalQuestions.filter(q => answerResults[q.id] === false);
        default:
          return originalQuestions;
      }
    })();
    if (!currentQuestion || activePool.length === 0) {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % Math.max(questions.length, 1);
        const destId = questions[next]?.id;
        if (destId) setSeenQuestionIds(p => new Set([...p, destId]));
        return next;
      });
      return;
    }

    if (advanceMode === 'sequential') {
      // Follow the pool (originalQuestions) order
      const pool = activePool;
      const idxOrig = pool.findIndex(q => q.id === currentQuestion.id);
      const nextOrig = (idxOrig + 1 + pool.length) % pool.length;
      const nextId = pool[nextOrig]?.id;
      const newIdx = questions.findIndex(q => q.id === nextId);
      const destIdx = newIdx >= 0 ? newIdx : (currentIndex + 1) % questions.length;
      const destId = questions[destIdx]?.id;
      if (destId) {
        // Mark destination as seen immediately on open
        setSeenQuestionIds(prev => new Set([...prev, destId]));
        setCurrentIndex(destIdx);
        setNavHistory((prev) => {
          const base = prev.slice(0, navPos + 1);
          const updated = [...base, destId];
          setNavPos(updated.length - 1);
          return updated;
        });
      }
    } else if (advanceMode === 'random') {
      // Random advance: jump to any question id from the pool
      const pool = activePool;
      let nextIdxOrig = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && pool[nextIdxOrig].id === currentQuestion.id) {
        nextIdxOrig = (nextIdxOrig + 1) % pool.length;
      }
      const nextId = pool[nextIdxOrig].id;
      const newIdx = questions.findIndex(q => q.id === nextId);
      const destIdx = newIdx >= 0 ? newIdx : (currentIndex + 1) % questions.length;
      const destId = questions[destIdx]?.id;
      if (destId) {
        // Mark destination as seen immediately on open
        setSeenQuestionIds(prev => new Set([...prev, destId]));
        setCurrentIndex(destIdx);
        setNavHistory((prev) => {
          const base = prev.slice(0, navPos + 1);
          const updated = [...base, destId];
          setNavPos(updated.length - 1);
          return updated;
        });
      }
    } else {
      // Random unique advance: pick only from unseen questions; when exhaust, fall back to random
      const pool = activePool;
      const seenNow = new Set(seenQuestionIds);
      if (currentQuestion?.id) seenNow.add(currentQuestion.id);
      const unseen = pool.filter(q => !seenNow.has(q.id));
      let nextId: string | undefined;
      if (unseen.length > 0) {
        const pick = unseen[Math.floor(Math.random() * unseen.length)];
        nextId = pick.id;
      } else {
        // All seen: fall back to random among all
        nextId = pool[Math.floor(Math.random() * pool.length)]?.id;
      }
      if (nextId) {
        const newIdx = questions.findIndex(q => q.id === nextId);
        const destIdx = newIdx >= 0 ? newIdx : (currentIndex + 1) % questions.length;
        const destId = questions[destIdx]?.id;
        if (destId) {
          setSeenQuestionIds(prev => new Set([...prev, destId]));
          setCurrentIndex(destIdx);
          setNavHistory((prev) => {
            const base = prev.slice(0, navPos + 1);
            const updated = [...base, destId];
            setNavPos(updated.length - 1);
            return updated;
          });
        }
      }
    }
  }, [currentQuestion, navPos, navHistory, questions, currentIndex, originalQuestions, advanceMode, seenQuestionIds, hardQuestionIds, poolFilter, answerResults]);

  const toggleAdvanceMode = () => setAdvanceMode(m => (m === 'random' ? 'sequential' : m === 'sequential' ? 'random-unique' : 'random'));

  const handlePrev = useCallback(() => {
    if (navPos > 0 && navHistory.length) {
      const newPos = navPos - 1;
      const prevId = navHistory[newPos];
      const idx = questions.findIndex(q => q.id === prevId);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setNavPos(newPos);
        setSeenQuestionIds(prev => new Set([...prev, prevId]));
        return;
      }
    }
    // Fallback to previous index in current order
    const newIndex = currentIndex === 0 ? questions.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    const targetId = questions[newIndex]?.id;
    if (targetId) {
      setSeenQuestionIds(prev => new Set([...prev, targetId]));
    }
  }, [navPos, navHistory, questions, currentIndex]);

  // Keyboard navigation: Left/Right arrows navigate cards
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePrev, handleNext]);

  const handleRandomize = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const shuffled = shuffleArray(originalQuestions);
    setQuestions(shuffled);
    setCurrentIndex(0);
    // Reset stats but keep total
    setStats(prev => ({
      ...prev,
      answeredQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      accuracy: 0
    }));
    // Immediately mark the first visible card as seen and reset history
    const firstId = shuffled.length ? shuffled[0].id : undefined;
    setSeenQuestionIds(new Set(firstId ? [firstId] : []));
    setNavHistory(firstId ? [firstId] : []);
    setNavPos(0);
    setAnswerResults({});
    setShowConfirmDialog(false);
  };

  // (unit helper removed; not used)

  

  const totalCount = originalQuestions.length || 0;
  const rightCount = Object.values(answerResults).filter((v) => v === true).length;
  const wrongCount = Object.values(answerResults).filter((v) => v === false).length;
  const seenCount = seenQuestionIds.size;
  const pctTotal = (n: number) => (totalCount ? Math.round((n / totalCount) * 100) : 0);
  const pctSeen = (n: number) => (seenCount ? Math.round((n / seenCount) * 100) : 0);
  const answeredCount = stats.answeredQuestions || 0;
  const correctPctAnswered = answeredCount ? Math.round((stats.correctAnswers / answeredCount) * 100) : 0;
  const wrongPctAnswered = answeredCount ? 100 - correctPctAnswered : 0;

  const handleQuestionClick = (originalIndex: number) => {
    const targetId = originalQuestions[originalIndex]?.id;
    if (!targetId) return;
    // When filtered, the grid only renders matching items; extra guard not needed
    const newIndex = questions.findIndex(q => q.id === targetId);
    if (newIndex !== -1) {
      setCurrentIndex(newIndex);
      setNavHistory(prev => {
        const base = prev.slice(0, navPos + 1);
        const updated = [...base, targetId];
        setNavPos(updated.length - 1);
        return updated;
      });
    }
    // Mark navigated-to question as seen
    setSeenQuestionIds(prev => new Set([...prev, targetId]));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen noise-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen noise-bg flex flex-col">
      {/* Sidebar toggle button when collapsed */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          aria-label="Open sidebar"
          className="fixed top-3 left-3 z-40 text-slate-800 dark:text-white p-2 rounded-md bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/20 hover:opacity-80 cursor-pointer hidden md:block"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Fullscreen toggle (always visible) */}
      <Tooltip content={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="fixed top-3 right-3 z-40 text-slate-800 dark:text-white p-2 rounded-md bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/20 hover:opacity-80 cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </Tooltip>

      {/* Left Sidebar */}
      <aside className={`order-last md:order-none md:fixed md:inset-y-0 md:left-0 z-40 md:w-[330px] w-full backdrop-blur-md border-t md:border-t-0 md:border-r border-black/10 dark:border-white/10 transition-transform bg-white/80 dark:bg-black/70 md:overflow-y-auto overflow-x-hidden ${showSidebar ? 'md:translate-x-0' : 'md:-translate-x-full'}`}>
        <div className="h-full flex flex-col p-4 gap-1">
          {/* Top bar: theme + close */}
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle inline />
            <button
              onClick={() => setShowSidebar(false)}
              aria-label="Close sidebar"
              className="p-1 rounded-md text-slate-800 dark:text-white hover:opacity-80 cursor-pointer hidden md:inline-flex"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Centered content (allow tooltips to escape) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 overflow-visible">
            {/* Mode Selector */}
            <div className="space-y-2 mt-2">
              <Tabs value={mode} onValueChange={(value) => setMode(value as FlashcardMode)}>
                <TabsList className="inline-flex items-center gap-1 rounded-md bg-black/5 border border-black/10 p-1 dark:bg-white/10 dark:border-white/20">
                  <TabsTrigger value="highlighted" className="text-xs px-2 py-1 rounded text-slate-800 dark:text-white data-[state=active]:bg-black/10 dark:data-[state=active]:bg-white/20 cursor-pointer">Answer only</TabsTrigger>
                  <TabsTrigger value="answer-highlighted" className="text-xs px-2 py-1 rounded text-slate-800 dark:text-white data-[state=active]:bg-black/10 dark:data-[state=active]:bg-white/20 cursor-pointer">Answer highlighted</TabsTrigger>
                  <TabsTrigger value="multiple-choice" className="text-xs px-2 py-1 rounded text-slate-800 dark:text-white data-[state=active]:bg-black/10 dark:data-[state=active]:bg-white/20 cursor-pointer">Quiz</TabsTrigger>
                </TabsList>
              </Tabs>
              
            </div>

            {/* Pool Grid */}
            <div className="w-full space-y-2 h-full flex flex-col items-center justify-center pb-5">
              {/* Header: left title, right stats */}
              <div className="w-full flex items-center justify-between text-[11px] text-slate-600 dark:text-white/60 px-2">
                <div className="font-medium text-slate-700 dark:text-white/40">Question pool grid</div>
                <div>
                  {seenCount}/{totalCount} seen
                  {mode === 'multiple-choice' && (
                    <span>
                      <span className="text-slate-300 dark:text-white/20 mx-1">•</span>
                      {stats.accuracy}% accuracy
                    </span>
                  )}
                </div>
              </div>
              <div className="relative w-full flex items-center justify-center">
                <QuestionPool
                  questions={originalQuestions}
                  currentQuestionId={currentQuestion?.id}
                  seenQuestionIds={seenQuestionIds}
                  answerResults={answerResults}
                  onQuestionClick={handleQuestionClick}
                  hardQuestionIds={hardQuestionIds}
                  filter={poolFilter}
                />
              </div>
              {/* Progress: Seen over Total */}
              <div className="w-full max-w-[280px] mx-auto mt-4 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-white/60">
                  <span>
                    <span className="font-medium text-slate-700 dark:text-white/70">{seenCount}</span> seen of <span className="font-medium text-slate-700 dark:text-white/70">{totalCount}</span>
                  </span>
                  <span>{pctTotal(seenCount)}% seen</span>
                </div>
                <div className="relative h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-blue-600/80"
                    style={{ width: `${pctTotal(seenCount)}%` }}
                  />
                </div>
              </div>

              {/* Progress: Right vs Wrong among answered */}
              <div className="w-full max-w-[280px] mx-auto space-y-1">
                <div className="relative h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  {/* Right on the left (green) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-600"
                    style={{ width: `${correctPctAnswered}%` }}
                  />
                  {/* Wrong on the right (red) */}
                  <div
                    className="absolute right-0 top-0 h-full bg-rose-600"
                    style={{ width: `${wrongPctAnswered}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-white/60">
                  <span>{correctPctAnswered}%</span>
                  <span>{wrongPctAnswered}%</span>
                </div>
              </div>
              <div className="flex items-stretch w-full gap-2 px-2 text-[11px]">
                <Tooltip content={`Seen — ${seenCount} of ${totalCount} (${pctTotal(seenCount)}%)`} className="w-full">
                  <button
                    type="button"
                    onClick={() => setPoolFilter(f => f === 'seen' ? 'all' : 'seen')}
                    aria-pressed={poolFilter === 'seen'}
                    className={`w-full rounded-md border border-black/10 dark:border-white/20 px-2 py-2 select-none cursor-pointer text-slate-700 dark:text-white/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${poolFilter === 'seen' ? 'bg-blue-600/10 dark:bg-blue-500/15 ring-1 ring-blue-500/30' : 'bg-black/5 dark:bg-white/5'}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="inline-block w-4 h-4 rounded bg-blue-600" />
                      <span className="text-[10px] text-slate-500 dark:text-white/50">Seen</span>
                      <span className="font-semibold text-slate-700 dark:text-white/70">{seenCount}</span>
                    </div>
                  </button>
                </Tooltip>
                <Tooltip content={`Correct — ${rightCount} (${pctSeen(rightCount)}% of seen)`} className="w-full">
                  <button
                    type="button"
                    onClick={() => setPoolFilter(f => f === 'correct' ? 'all' : 'correct')}
                    aria-pressed={poolFilter === 'correct'}
                    className={`w-full rounded-md border border-black/10 dark:border-white/20 px-2 py-2 select-none cursor-pointer text-slate-700 dark:text-white/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${poolFilter === 'correct' ? 'bg-green-600/10 dark:bg-green-500/15 ring-1 ring-green-500/30' : 'bg-black/5 dark:bg-white/5'}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="inline-block w-4 h-4 rounded bg-green-500" />
                      <span className="text-[10px] text-slate-500 dark:text-white/50">Correct</span>
                      <span className="font-semibold text-slate-700 dark:text-white/70">{rightCount}</span>
                    </div>
                  </button>
                </Tooltip>
                <Tooltip content={`Wrong — ${wrongCount} (${pctSeen(wrongCount)}% of seen)`} className="w-full">
                  <button
                    type="button"
                    onClick={() => setPoolFilter(f => f === 'wrong' ? 'all' : 'wrong')}
                    aria-pressed={poolFilter === 'wrong'}
                    className={`w-full rounded-md border border-black/10 dark:border-white/20 px-2 py-2 select-none cursor-pointer text-slate-700 dark:text-white/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${poolFilter === 'wrong' ? 'bg-rose-600/10 dark:bg-rose-500/15 ring-1 ring-rose-500/30' : 'bg-black/5 dark:bg-white/5'}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="inline-block w-4 h-4 rounded bg-rose-600" />
                      <span className="text-[10px] text-slate-500 dark:text-white/50">Wrong</span>
                      <span className="font-semibold text-slate-700 dark:text-white/70">{wrongCount}</span>
                    </div>
                  </button>
                </Tooltip>
                <Tooltip content={`Hard — ${hardQuestionIds.size} marked`} className="w-full">
                  <button
                    type="button"
                    onClick={() => setPoolFilter(f => f === 'hard' ? 'all' : 'hard')}
                    aria-pressed={poolFilter === 'hard'}
                    className={`w-full rounded-md border border-black/10 dark:border-white/20 px-2 py-2 select-none cursor-pointer text-slate-700 dark:text-white/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${poolFilter === 'hard' ? 'bg-amber-400/10 dark:bg-amber-300/15 ring-1 ring-amber-400/30' : 'bg-black/5 dark:bg-white/5'}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="relative inline-block w-4 h-4 rounded bg-slate-400 dark:bg-slate-500">
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400" />
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-white/50">Hard</span>
                      <span className="font-semibold text-slate-700 dark:text-white/70">{hardQuestionIds.size}</span>
                    </div>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Bottom: Reset */}
          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col items-center justify-center">
            <div className="text-[11px] leading-snug text-slate-700 dark:text-white/30 text-center">
              The grid shows the entire question pool in order
            </div>
            <div className="flex">
              <button onClick={() => setShowConfirmDialog(true)} className="underline text-xs text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white cursor-pointer">
                Reset
              </button>
              <span className="text-slate-300 dark:text-white/20 mx-1">
                &nbsp;•&nbsp;
              </span>
              <Tooltip content="Toggle how Next chooses the following card. Random unique picks only unseen cards until all are seen. Random jumps anywhere in the pool. Sequential follows the pool order (E1A01 → E1A02 → …). You can switch anytime.">
                <button onClick={toggleAdvanceMode} className="underline text-xs text-slate-600 hover:text-slate-900 dark:text-white/50 dark:hover:text-white cursor-pointer">
                  {advanceMode === 'random-unique' ? 'Random unique advance' : advanceMode === 'random' ? 'Random advance' : 'Sequential advance'}
                </button>
              </Tooltip>
              {/* Filtering now handled by clicking stats above */}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content shifts when sidebar open */}
      <div className={`transition-[padding] ${showSidebar ? 'md:pl-[330px]' : 'md:pl-0'}`}>
        <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        

        {/* Subtle Progress Indicator */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="text-slate-700 dark:text-white/60 text-sm">
            {seenCount}/{totalCount} seen ({pctTotal(seenCount)}%)
            {mode === 'multiple-choice' && (
              <span> • {stats.accuracy}% accuracy</span>
            )}
          </div>
        </div>

        {/* Flashcard Stack */}
        <div className="flex items-center justify-center min-h-[500px]">
          <div className={`relative ${currentQuestion && (
            currentQuestion.question.includes('.png') ||
            currentQuestion.question.includes('.jpg') ||
            currentQuestion.question.includes('.gif') ||
            /(?:Figure|Fig\.)\s*[A-Z]\d+[\-\u2013\u2014]\d+|\b[A-Z]\d+[\-\u2013\u2014]\d+\b/i.test(currentQuestion.question)
          ) ? 'max-w-4xl' : 'max-w-2xl'} w-full`}>
            {/* Subtle stacked cards background (glassmorphism + gentle motion) */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none z-0 bg-black/10 dark:bg-white/5 backdrop-blur-sm border border-black/10 dark:border-white/10"
              style={{ willChange: 'transform' }}
              initial={false}
              animate={{
                rotate: currentIndex % 2 ? 4 : -4,
                x: ((currentIndex % 5) - 2) * 6,
                y: ((currentIndex % 3) - 1) * 6,
                scale: 0.9,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            />
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none z-0 bg-gradient-to-br from-black/15 to-black/5 dark:from-white/10 dark:to-white/5 backdrop-blur-sm border border-black/10 dark:border-white/10"
              style={{ willChange: 'transform' }}
              initial={false}
              animate={{
                rotate: currentIndex % 2 ? -6 : 6,
                x: ((currentIndex % 7) - 3) * 5,
                y: ((currentIndex % 4) - 2) * 5,
                scale: 0.94,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            />

            {/* Main flashcard */}
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative z-10"
            >
              {currentQuestion && (
                <Flashcard
                  question={currentQuestion}
                  mode={mode}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  isHard={hardQuestionIds.has(currentQuestion.id)}
                  onToggleHard={toggleHardCurrent}
                />
              )}
            </motion.div>
          </div>
        </div>

        {/* Card Navigator */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={handlePrev}
            aria-label="Previous question"
            disabled={!canGoBack}
            aria-disabled={!canGoBack}
            className="text-sm px-3 py-2 rounded-md transition-colors border bg-black/10 border-black/10 text-slate-800 hover:bg-black/20 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black/10 disabled:dark:hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next question"
            className="text-sm px-3 py-2 rounded-md transition-colors border bg-black/10 border-black/10 text-slate-800 hover:bg-black/20 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Reset?</h3>
              <p className="text-gray-600 mb-6">
                This will reset your progress and shuffle all questions. Are you sure?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRandomize}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      {/* Pool version note */}
      <div className="relative sm:fixed sm:bottom-2 sm:right-3 z-30 text-[10px] px-2 py-1 rounded text-center text-slate-700 dark:text-white/60 border border-black/10 dark:border-white/10 pointer-events-none">
        Amateur Extra question pool valid through 2028
      </div>
    </div>
  );
}
