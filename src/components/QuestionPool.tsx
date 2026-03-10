'use client';

import { Question } from '@/types/question';

interface QuestionPoolProps {
  questions: Question[];
  currentQuestionId?: string;
  seenQuestionIds: Set<string>;
  answerResults?: Record<string, boolean>;
  onQuestionClick: (index: number) => void;
}

export function QuestionPool({ questions, currentQuestionId, seenQuestionIds, answerResults = {}, onQuestionClick }: QuestionPoolProps) {
  const squareSize = 10; // Slightly larger for sidebar width
  const cols = 24; // Fit nicely in ~320px sidebar

  // Build alternating group index by unit prefix (e.g., E1, E2, ...)
  let lastUnit = "";
  let groupCounter = -1;
  const groupIndices = questions.map((q) => {
    const unit = q.id.match(/^([A-Z]\d+)/)?.[1] ?? "";
    if (unit !== lastUnit) {
      groupCounter += 1;
      lastUnit = unit;
    }
    return groupCounter;
  });

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="grid gap-0.5" style={{
        gridTemplateColumns: `repeat(${cols}, ${squareSize}px)`,
        gridTemplateRows: `repeat(${Math.ceil(questions.length / cols)}, ${squareSize}px)`
      }}>
        {questions.map((question, index) => {
          const isSeen = seenQuestionIds.has(question.id);
          const isCurrent = question.id === currentQuestionId;
          const groupIndex = groupIndices[index] ?? 0;
          const borderGroupClass = groupIndex % 2 === 0 ? 'border-black/10 dark:border-white/20' : 'border-black/20 dark:border-white/40';
          // For seen (but not answered) questions use alternating blue shades; greens reserved for correct answers
          const seenBlueClass = groupIndex % 2 === 0 ? 'bg-blue-600' : 'bg-sky-600';
          const result = answerResults[question.id] as boolean | undefined; // true=correct, false=wrong, undefined=unanswered

          return (
            <div key={question.id} className="relative group">
              <div
                className={`border ${borderGroupClass} transition-colors cursor-pointer hover:bg-black/20 dark:hover:bg-white/30 ${
                  isCurrent
                    ? 'bg-blue-500 ring-2 ring-black dark:ring-white'
                    : result === false
                      ? 'bg-rose-600'
                      : result === true
                        ? 'bg-green-500'
                        : isSeen
                          ? seenBlueClass
                          : 'bg-black/10 dark:bg-white/5'
                }`}
                style={{
                  width: `${squareSize}px`,
                  height: `${squareSize}px`,
                  borderRadius: '1px'
                }}
                onClick={() => onQuestionClick(index)}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-1 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow border border-white/10 whitespace-nowrap z-20">
                {question.id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
