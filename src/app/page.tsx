'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question, FlashcardMode, FlashcardStats } from '@/types/question';
import { Flashcard } from '@/components/Flashcard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionPool } from '@/components/QuestionPool';
// import { Stats } from '@/components/Stats';
import { loadQuestions, shuffleArray, calculateAccuracy } from '@/lib/questions';
import { ChevronLeft, ChevronRight, Check, X as XIcon, Target as TargetIcon, Menu, PanelLeftClose, Info } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<FlashcardMode>('answer-highlighted');
  const [stats, setStats] = useState<FlashcardStats>({
    totalQuestions: 0,
    answeredQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showQuestionPool, setShowQuestionPool] = useState(false);
  // const [showStats, setShowStats] = useState(false);
  const [seenQuestionIds, setSeenQuestionIds] = useState<Set<string>>(new Set());
  const [answerResults, setAnswerResults] = useState<Record<string, boolean>>({});
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    loadQuestions().then((loadedQuestions) => {
      setOriginalQuestions(loadedQuestions);
      const shuffled = shuffleArray(loadedQuestions);
      setQuestions(shuffled);
      setStats(prev => ({ ...prev, totalQuestions: shuffled.length }));
      // Mark the initially visible question as seen
      if (shuffled.length > 0) {
        setSeenQuestionIds(new Set([shuffled[0].id]));
      }
      setIsLoading(false);
    });
  }, []);

  const currentQuestion = questions[currentIndex];

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

  const handleNext = () => {
    // Mark current question as seen
    if (currentQuestion) {
      setSeenQuestionIds(prev => new Set([...prev, currentQuestion.id]));
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    const newIndex = currentIndex === 0 ? questions.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    const targetId = questions[newIndex]?.id;
    if (targetId) {
      setSeenQuestionIds(prev => new Set([...prev, targetId]));
    }
  };

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
    // Immediately mark the first visible card as seen
    setSeenQuestionIds(new Set(shuffled.length ? [shuffled[0].id] : []));
    setAnswerResults({});
    setShowConfirmDialog(false);
  };

  // Extract unit from question ID (e.g., E5A04 -> E5)
  const getUnitFromQuestionId = (questionId: string) => {
    const match = questionId.match(/^([A-Z]\d+)/);
    return match ? match[1] : questionId;
  };

  const currentUnit = currentQuestion ? getUnitFromQuestionId(currentQuestion.id) : null;
  const modeDescription = {
    highlighted: 'Shows the correct answer only. Tap the card to advance.',
    'answer-highlighted': 'Shows all choices and highlights the correct one. Tap to advance.',
    'multiple-choice': 'Quiz mode: pick an answer. Immediate feedback and accuracy tracking.'
  } as Record<FlashcardMode, string>;

  const handleQuestionClick = (originalIndex: number) => {
    const targetId = originalQuestions[originalIndex]?.id;
    if (!targetId) return;
    const newIndex = questions.findIndex(q => q.id === targetId);
    if (newIndex !== -1) setCurrentIndex(newIndex);
    // Mark navigated-to question as seen
    setSeenQuestionIds(prev => new Set([...prev, targetId]));
    setShowQuestionPool(false);
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

      {/* Left Sidebar */}
      <aside className={`order-last md:order-none md:fixed md:inset-y-0 md:left-0 z-40 md:w-80 w-full backdrop-blur-md border-t md:border-t-0 md:border-r border-black/10 dark:border-white/10 transition-transform bg-white/80 dark:bg-black/70 md:overflow-y-auto ${showSidebar ? 'md:translate-x-0' : 'md:-translate-x-full'}`}>
        <div className="h-full flex flex-col p-4 gap-4">
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
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-700 dark:text-white/50">Study Mode</div>
              <Tabs value={mode} onValueChange={(value) => setMode(value as FlashcardMode)}>
                <TabsList className="inline-flex items-center gap-1 rounded-md bg-black/5 border border-black/10 p-1 dark:bg-white/10 dark:border-white/20">
                  <TabsTrigger value="highlighted" className="text-xs px-2 py-1 rounded text-slate-800 dark:text-white data-[state=active]:bg-black/10 dark:data-[state=active]:bg-white/20 cursor-pointer">Answer only</TabsTrigger>
                  <TabsTrigger value="answer-highlighted" className="text-xs px-2 py-1 rounded text-slate-800 dark:text-white data-[state=active]:bg-black/10 dark:data-[state=active]:bg-white/20 cursor-pointer">Answer highlighted</TabsTrigger>
                  <TabsTrigger value="multiple-choice" className="text-xs px-2 py-1 rounded text-slate-800 dark:text-white data-[state=active]:bg-black/10 dark:data-[state=active]:bg-white/20 cursor-pointer">Quiz</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="mt-2 text-[11px] leading-snug text-slate-800 dark:text-white/20 flex items-start gap-2">
                <span>{modeDescription[mode]}</span>
              </div>
            </div>

            {/* Pool Grid */}
            <div className="w-full space-y-2 h-full flex flex-col items-center justify-center pb-10">
              <div className="text-[11px] text-slate-600 dark:text-white/60">
                {seenQuestionIds.size}/{originalQuestions.length} seen ({
                  originalQuestions.length ? Math.floor((seenQuestionIds.size / originalQuestions.length) * 100) : 0
                }%)
              </div>
              <div className="relative w-full flex items-center justify-center">
                <QuestionPool
                  questions={originalQuestions}
                  currentQuestionId={currentQuestion?.id}
                  seenQuestionIds={seenQuestionIds}
                  answerResults={answerResults}
                  onQuestionClick={handleQuestionClick}
                />
              </div>
              <div className="text-[11px] leading-snug text-slate-700 dark:text-white/30">
                The grid shows the entire question pool in order.<br />Click any square to jump.
              </div>
              <div className="flex items-center justify-center gap-4 text-[11px]">
                <div className="flex items-center gap-1 text-slate-700 dark:text-white/70">
                  <span className="inline-block w-3 h-3 rounded bg-blue-600" /> Seen
                </div>
                <div className="flex items-center gap-1 text-slate-700 dark:text-white/70">
                  <span className="inline-block w-3 h-3 rounded bg-green-500" /> Correct
                </div>
                <div className="flex items-center gap-1 text-slate-700 dark:text-white/70">
                  <span className="inline-block w-3 h-3 rounded bg-rose-600" /> Wrong
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Reset */}
          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-center">
            <button onClick={() => setShowConfirmDialog(true)} className="underline text-xs text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white cursor-pointer">Reset</button>
          </div>
        </div>
      </aside>

      {/* Main content shifts when sidebar open */}
      <div className={`transition-[padding] ${showSidebar ? 'md:pl-80' : 'md:pl-0'}`}>
        <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        

        {/* Subtle Progress Indicator */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="text-slate-700 dark:text-white/60 text-sm">
            Question {currentIndex + 1} of {questions.length}
            {mode === 'multiple-choice' && (
              <span> • {stats.accuracy}% accuracy</span>
            )}
          </div>
        </div>

        {/* Flashcard Stack */}
        <div className="flex items-center justify-center min-h-[500px]">
          <div className={`relative ${currentQuestion && (currentQuestion.question.includes('.png') || currentQuestion.question.includes('.jpg') || currentQuestion.question.includes('.gif') || /Figure\s+[A-Z]\d+-\d+/i.test(currentQuestion.question)) ? 'max-w-4xl' : 'max-w-2xl'} w-full`}>
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
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10"
            >
              {currentQuestion && (
                <Flashcard
                  question={currentQuestion}
                  mode={mode}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
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
            className="text-sm px-3 py-2 rounded-md transition-colors border bg-black/10 border-black/10 text-slate-800 hover:bg-black/20 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20 cursor-pointer"
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
    </div>
  );
}
