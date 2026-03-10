'use client';

import { Question, FlashcardMode } from '@/types/question';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';

interface FlashcardProps {
  question: Question;
  mode: FlashcardMode;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export function Flashcard({ question, mode, onAnswer, onNext }: FlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Extract image filename if present, or map figure references like "Figure E7-1" to public images (E7-1.png)
  const getImageFilename = (text: string) => {
    // Direct filename pattern
    const direct = text.match(/(\w+-\d+\.(png|jpg|gif))/i);
    if (direct) return direct[0];
    // Figure reference like: Figure E7-1, In Figure E5-1, etc.
    const figure = text.match(/Figure\s+([A-Z]\d+-\d+)/i);
    if (figure) return `${figure[1].toUpperCase()}.png`;
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
        <Badge variant="outline" className="text-xs">
          {question.id}
        </Badge>
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

  const renderHighlightedMode = () => (
    <div className={`${hasImage ? 'flex-1' : 'w-full'} cursor-pointer`} onClick={handleNext}>
      {/* Sticky card number at top-left */}
      <div className="absolute top-4 left-4">
        <Badge variant="outline" className="text-xs border-black/20 text-slate-600 dark:border-white/20 dark:text-white/70">
          {question.id}
        </Badge>
      </div>
      {/* Centered content */}
      <div className={`${hasImage ? '' : 'grid place-content-center text-center gap-3'}`}>
        <h3 className="text-base md:text-lg font-medium leading-relaxed text-slate-900 dark:text-white">
          {cleanText}
        </h3>
        <p className="text-xl md:text-2xl font-semibold text-sky-600 dark:text-sky-400 leading-relaxed">
          {question.answers[question.correct]}
        </p>
      </div>
    </div>
  );

  const renderAnswerHighlightedMode = () => (
    <div className={`${hasImage ? 'flex-1' : ''} space-y-6 cursor-pointer`} onClick={handleNext}>
      <div className="space-y-4">
        <Badge variant="outline" className="text-xs">
          {question.id}
        </Badge>
        <h3 className="text-lg font-medium leading-relaxed break-words whitespace-normal">
          {cleanText}
        </h3>
      </div>

      {/* Match quiz layout to avoid jump: same spacing, padding, borders */}
      <div className="space-y-3">
            {question.answers.map((answer, index) => {
              const isCorrect = index === question.correct;
              return (
                <div
                  key={index}
                  className={`w-full text-left rounded-md px-4 py-3 border transition-colors ${
                    isCorrect ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-900 dark:text-white/75'
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className={`text-xs font-semibold tracking-wide ${
                      isCorrect ? 'text-sky-500' : 'text-slate-500 dark:text-white/60'
                    }`}>
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className={`text-lg break-words whitespace-normal ${isCorrect ? 'font-semibold' : ''}`}>{answer}</span>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );

  const renderMultipleChoiceMode = () => (
    <div className={`${hasImage ? 'flex-1' : ''} space-y-6`}>
      <div className="space-y-4">
        <Badge variant="outline" className="text-xs">
          {question.id}
        </Badge>
        <h3 className="text-lg font-medium leading-relaxed break-words whitespace-normal">
          {cleanText}
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
                <span className={`text-lg break-words whitespace-normal ${showCorrect || showWrong ? 'font-semibold' : ''}`}>{answer}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card className={`w-full ${hasImage ? 'min-h-[400px]' : 'min-h-[320px]'} mx-auto bg-white dark:bg-black`}>
      <CardContent className={`p-8 flex relative ${hasImage ? 'gap-8' : 'min-h-[320px] justify-center items-center'}`}>
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
        <div className={hasImage ? 'flex-1' : ''}>
          {mode === 'qa' && renderQAMode()}
          {mode === 'highlighted' && renderHighlightedMode()}
          {mode === 'answer-highlighted' && renderAnswerHighlightedMode()}
          {mode === 'multiple-choice' && renderMultipleChoiceMode()}
        </div>
      </CardContent>
    </Card>
  );
}
