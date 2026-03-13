'use client';

import { Question, FlashcardMode } from '@/types/question';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumberPill } from '@/components/NumberPill';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface FlashcardProps {
  question: Question;
  mode: FlashcardMode;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  isHard?: boolean;
  onToggleHard?: () => void;
}

export function Flashcard({ question, mode, onAnswer, onNext, isHard = false, onToggleHard }: FlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  const [showHints, setShowHints] = useState(false);
  const hintsGetUrl = isProd ? '/hints.json' : '/api/hints';

  type AnswerHints = Record<string, string[]>; // key: answer index as string
  type OneHint = { question?: string[]; answers?: AnswerHints; notes?: string };
  type HintsMap = Record<string, OneHint>;
  const [hints, setHints] = useState<HintsMap>({});
  const [editHints, setEditHints] = useState(false);
  const currentHint = hints[question.id] || {};
  const [notesDraft, setNotesDraft] = useState<string>(currentHint.notes || '');

  useEffect(() => {
    // Load hints JSON (static in prod, API in dev)
    fetch(hintsGetUrl)
      .then(r => r.ok ? r.json() : {})
      .then((data) => setHints(data || {}))
      .catch(() => {});
  }, [hintsGetUrl]);

  useEffect(() => {
    // Sync note draft when question changes
    setNotesDraft(hints[question.id]?.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const toggleWord = (scope: 'question' | 'answer', answerIndex?: number, word?: string) => {
    if (!word) return;
    const key = word.trim();
    if (!key) return;
    setHints(prev => {
      const next: HintsMap = { ...prev };
      const one: OneHint = { ...(next[question.id] || {}) };
      if (scope === 'question') {
        const list = new Set((one.question || []).map(w => w.toLowerCase()));
        const low = key.toLowerCase();
        if (list.has(low)) list.delete(low); else list.add(low);
        one.question = Array.from(list);
      } else {
        const idx = String(answerIndex ?? 0);
        const answers = { ...(one.answers || {}) } as AnswerHints;
        const setList = new Set((answers[idx] || []).map(w => w.toLowerCase()));
        const low = key.toLowerCase();
        if (setList.has(low)) setList.delete(low); else setList.add(low);
        answers[idx] = Array.from(setList);
        one.answers = answers;
      }
      next[question.id] = one;
      return next;
    });
  };

  const saveHints = async () => {
    try {
      const body = JSON.stringify({ hints: { ...hints, [question.id]: { ...(hints[question.id] || {}), notes: notesDraft } } });
      const res = await fetch('/api/hints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (res.ok) {
        const updated = await fetch(hintsGetUrl).then(r => r.json());
        setHints(updated || {});
      }
    } catch {}
  };

  const revertHints = async () => {
    try {
      const data = await fetch(hintsGetUrl).then(r => r.json());
      setHints(data || {});
      setNotesDraft(data?.[question.id]?.notes || '');
    } catch {}
  };

  const setNotes = (v: string) => {
    setNotesDraft(v);
    setHints(prev => ({
      ...prev,
      [question.id]: { ...(prev[question.id] || {}), notes: v }
    }));
  };

  // Split text into tokens preserving punctuation/spaces
  const tokenize = (text: string) => {
    const parts: { t: string; isWord: boolean }[] = [];
    const regex = /(\w+|[^\w])/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const token = m[0];
      const isWord = /\w+/.test(token);
      parts.push({ t: token, isWord });
    }
    return parts;
  };

  // Highlight helper: wrap tokens that match any of keys (case-insensitive)
  const renderWithHighlights = (text: string, keys?: string[]) => {
    const keySet = new Set((keys || []).map(k => k.toLowerCase()));
    return tokenize(text).map((p, i) => {
      if (p.isWord && keySet.has(p.t.toLowerCase())) {
        return (
          <mark
            key={i}
            className="px-1 rounded bg-amber-400 text-black font-semibold ring-1 ring-amber-500/40 dark:bg-amber-300 dark:text-black dark:ring-amber-400/40"
          >
            {p.t}
          </mark>
        );
      }
      return <span key={i}>{p.t}</span>;
    });
  };

  // Extract image filename if present, or map figure references like "Figure E7-1" or bare tokens like "E7-3" to public images (E7-1.png)
  const getImageFilename = (text: string) => {
    // Direct filename pattern
    const direct = text.match(/(\w+-\d+\.(png|jpg|gif))/i);
    if (direct) return direct[0];
    // Figure reference like: Figure E7-1, Fig. E5-1 (allow hyphen or en/em dash)
    const figure = text.match(/(?:Figure|Fig\.)\s*([A-Z]\d+[\-\u2013\u2014]\d+)/i);
    if (figure) return `${figure[1].toUpperCase()}.png`;
    // Bare figure token like: E7-3 (allow en/em dash)
    const bare = text.match(/\b([A-Z]\d+[\-\u2013\u2014]\d+)\b/i);
    if (bare) return `${bare[1].toUpperCase()}.png`;
    return null;
  };

  // Clean question text by removing image references
  const cleanQuestionText = (text: string) => {
    return text.replace(/\s*\(\w+-\d+\.(png|jpg|gif)\)\s*/g, '').trim();
  };

  const imageFilename = getImageFilename(question.question);
  const hasImage = !!imageFilename;
  const cleanText = cleanQuestionText(question.question);

  const handleAnswerSelect = (index: number) => {
    if (hasAnswered) return;
    setSelectedAnswer(index);
    setHasAnswered(true);
    const isCorrect = index === question.correct;
    onAnswer(isCorrect);
  };

  const handleNext = () => {
    setShowAnswer(false);
    setSelectedAnswer(null);
    setHasAnswered(false);
    onNext();
  };

  const renderQAMode = () => (
    <div className={`${hasImage ? 'flex-1' : ''} space-y-6`}>
      <div className="space-y-4">
        <NumberPill id={question.id} />
        <h3 className="text-lg font-medium leading-relaxed">
          {cleanText}
        </h3>
      </div>
      
      <AnimatePresence mode="wait">
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3 cursor-pointer"
            onClick={handleNext}
          >
            <div className="text-sm text-muted-foreground">Answer:</div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sky-500 font-medium">
                {question.answers[question.correct]}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Reference: {question.refs}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showAnswer && (
        <Button 
          onClick={() => setShowAnswer(true)}
          className="flex-1 cursor-pointer"
        >
          Show Answer
        </Button>
      )}
    </div>
  );

  // Removed 'highlighted' mode

  const renderAnswerHighlightedMode = () => {
    const qKeys = currentHint.question || [];
    const aKeys = currentHint.answers || {};
    return (
      <div className={`${hasImage ? 'flex-1' : ''} space-y-6`}>
        <div className="space-y-4">
          <NumberPill id={question.id} />
          {!editHints && (
            <h3 className="text-lg font-medium leading-relaxed break-words whitespace-normal">
              {renderWithHighlights(cleanText, qKeys)}
            </h3>
          )}
          {editHints && (
            <div className="text-lg font-medium leading-relaxed break-words whitespace-normal">
              {tokenize(cleanText).map((p, i) => p.isWord ? (
                <button key={i} type="button" onClick={(e)=>{e.stopPropagation(); toggleWord('question', undefined, p.t);}}
                  className={`px-1 rounded cursor-pointer ${qKeys?.includes(p.t.toLowerCase()) ? 'bg-amber-400 dark:bg-amber-300 text-black font-semibold ring-1 ring-amber-500/40' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                  {p.t}
                </button>
              ) : <span key={i}>{p.t}</span>)}
            </div>
          )}
        </div>

        {/* Answers list with highlights */}
        <div className="space-y-3">
          {question.answers.map((answer, index) => {
            const isCorrect = index === question.correct;
            const keys = aKeys[String(index)] || [];
            return (
              <div
                key={index}
                className={`w-full text-left rounded-md px-4 py-3 transition-colors border ${
                  isCorrect
                    ? 'border-sky-500 text-sky-500'
                    : 'border-transparent hover:border-black/20 dark:hover:border-white/30 text-slate-900 dark:text-white/90'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className={`text-xs font-semibold tracking-wide ${
                    isCorrect ? 'text-sky-500' : 'text-slate-500 dark:text-white/60'
                  }`}>
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {!editHints && (
                    <span className={`text-lg break-words whitespace-normal ${isCorrect ? 'font-semibold' : ''}`}>
                      {renderWithHighlights(answer, keys)}
                    </span>
                  )}
                  {editHints && (
                    <span className={`text-lg break-words whitespace-normal ${isCorrect ? 'font-semibold' : ''}`}>
                      {tokenize(answer).map((p, i) => p.isWord ? (
                        <button key={i} type="button" onClick={(e)=>{e.stopPropagation(); toggleWord('answer', index, p.t);}}
                          className={`px-1 rounded cursor-pointer ${keys?.includes(p.t.toLowerCase()) ? 'bg-amber-400 dark:bg-amber-300 text-black font-semibold ring-1 ring-amber-500/40' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                          {p.t}
                        </button>
                      ) : <span key={i}>{p.t}</span>)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {!editHints && currentHint.notes && (
          <div className="text-[12px] text-slate-600 dark:text-white/60 border border-amber-400/30 bg-amber-400/10 rounded-md px-3 py-2">
            Hint: {currentHint.notes}
          </div>
        )}
        {editHints && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500 dark:text-white/60">Notes (optional)</div>
            <textarea
              value={notesDraft}
              onChange={(e)=> setNotes(e.target.value)}
              className="w-full min-h-[64px] rounded-md border border-black/10 dark:border-white/20 bg-transparent px-2 py-1 text-sm"
              placeholder="Add a short hint sentence..."
            />
            <div className="flex gap-2">
              <Button type="button" onClick={(e)=>{e.stopPropagation(); saveHints();}} className="cursor-pointer">Save hints</Button>
              <Button type="button" variant="outline" onClick={(e)=>{e.stopPropagation(); revertHints();}} className="cursor-pointer">Revert</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMultipleChoiceMode = () => (
    <div className={`${hasImage ? 'flex-1' : ''} space-y-6`}>
      <div className="space-y-4">
        <NumberPill id={question.id} />
        <h3 className="text-lg font-medium leading-relaxed break-words whitespace-normal">
          {showHints ? renderWithHighlights(cleanText, (hints[question.id]?.question || [])) : cleanText}
        </h3>
      </div>

      <div className="space-y-3">
        {question.answers.map((answer, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correct;
          const showCorrect = hasAnswered && isCorrect;
          const showWrong = hasAnswered && isSelected && !isCorrect;

          return (
            <motion.button
              key={index}
              whileHover={!hasAnswered ? { scale: 1.01 } : {}}
              whileTap={!hasAnswered ? { scale: 0.99 } : {}}
              onClick={() => handleAnswerSelect(index)}
              disabled={hasAnswered}
              className={`w-full text-left rounded-md px-4 py-3 transition-colors border ${!hasAnswered ? 'cursor-pointer' : ''} ${
                showCorrect
                  ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700'
                  : showWrong
                    ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700'
                    : isSelected && !hasAnswered
                      ? 'border-sky-500 text-slate-900 dark:text-white'
                      : 'border-transparent hover:border-black/20 dark:hover:border-white/30 text-slate-900 dark:text-white/90'
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <span className={`text-xs font-semibold tracking-wide ${
                  showCorrect || showWrong ? 'text-white' : isSelected ? 'text-sky-600 dark:text-sky-300' : 'text-slate-500 dark:text-white/60'
                }`}>
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className={`text-lg break-words whitespace-normal ${showCorrect || showWrong ? 'font-semibold' : ''}`}>
                  {showHints ? renderWithHighlights(answer, (hints[question.id]?.answers?.[String(index)] || [])) : answer}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {showHints && (hints[question.id]?.notes) && (
        <div className="text-[12px] text-slate-700 dark:text-white/70 border border-amber-400/40 bg-amber-300/20 rounded-md px-3 py-2">
          Hint: {hints[question.id]?.notes}
        </div>
      )}
    </div>
  );

  const isTapToAdvance = (mode === 'answer-highlighted') && !editHints;

  return (
    <Card
      className={`w-full ${hasImage ? 'min-h-[400px]' : 'min-h-[320px]'} mx-auto bg-white dark:bg-black ${
        isTapToAdvance
          ? 'cursor-pointer transition-shadow transition-colors hover:ring-sky-400/40 dark:hover:ring-sky-300/30 hover:shadow-[0_0_0_6px_rgba(56,189,248,0.10)] dark:hover:shadow-[0_0_0_6px_rgba(125,211,252,0.10)]'
          : ''
      }`}
      onClick={isTapToAdvance ? handleNext : undefined}
      role={isTapToAdvance ? 'button' : undefined}
      aria-label={isTapToAdvance ? 'Next card' : undefined}
    >
      <CardContent className={`p-8 flex relative ${hasImage ? 'gap-8' : 'min-h-[320px] justify-center items-center'}`}>
        {/* Hard toggle button + Hints controls */}
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); if (onToggleHard) onToggleHard(); }}
            className={`text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
              isHard
                ? 'bg-amber-500/20 text-amber-700 border-amber-500/40 dark:bg-amber-400/20 dark:text-amber-300'
                : 'bg-black/10 text-slate-700 border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-white/80 dark:border-white/20 dark:hover:bg-white/20'
            }`}
            aria-pressed={isHard}
            aria-label={isHard ? 'Unmark hard' : 'Mark as hard'}
          >
            {isHard ? 'Unmark hard' : 'Mark as hard'}
          </button>
          {mode === 'multiple-choice' && (
            <button
              onClick={(e)=>{ e.stopPropagation(); setShowHints(v => !v); }}
              aria-pressed={showHints}
              aria-label={showHints ? 'Hide hints' : 'Show hints'}
              className={`ml-2 text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                showHints
                  ? 'bg-amber-400/30 text-amber-800 border-amber-500/40 dark:bg-amber-300/30 dark:text-black'
                  : 'bg-black/10 text-slate-700 border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-white/80 dark:border-white/20 dark:hover:bg-white/20'
              }`}
            >
              {showHints ? 'Hints on' : 'Hints'}
            </button>
          )}
          {!isProd && mode === 'answer-highlighted' && (
            <button
              onClick={(e)=>{ e.stopPropagation(); setEditHints(v => !v); }}
              className={`ml-2 text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                editHints
                  ? 'bg-sky-500/20 text-sky-700 border-sky-500/40 dark:bg-sky-400/20 dark:text-sky-300'
                  : 'bg-black/10 text-slate-700 border-black/10 hover:bg-black/20 dark:bg-white/10 dark:text-white/80 dark:border-white/20 dark:hover:bg-white/20'
              }`}
            >
              {editHints ? 'Exit hints edit' : 'Edit hints'}
            </button>
          )}
        </div>
        {hasImage && (
          <div className="shrink-0">
            <Image 
              src={`/${imageFilename}`}
              alt="Question diagram"
              width={320}
              height={256}
              className="object-contain rounded-lg dark:invert dark:contrast-125"
            />
          </div>
        )}
        <div className={hasImage ? 'flex-1' : 'w-full h-full'}>
          {mode === 'qa' && renderQAMode()}
          {mode === 'answer-highlighted' && renderAnswerHighlightedMode()}
          {mode === 'multiple-choice' && renderMultipleChoiceMode()}
        </div>
      </CardContent>
    </Card>
  );
}
