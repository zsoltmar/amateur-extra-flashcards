'use client';

import { FlashcardStats } from '@/types/question';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface StatsProps {
  stats: FlashcardStats;
  compact?: boolean;
  showAccuracy?: boolean;
  showResults?: boolean; // show Correct/Wrong tiles
}

export function Stats({ stats, compact = false, showAccuracy = true, showResults = true }: StatsProps) {
  const progressPercentage = stats.totalQuestions > 0 
    ? (stats.answeredQuestions / stats.totalQuestions) * 100 
    : 0;

  return (
    <Card className={`${compact ? 'w-full max-w-sm mx-auto bg-transparent border-0 shadow-none text-white' : 'w-full max-w-2xl mx-auto bg-white/5 border-white/20 text-white'}`}>
      <CardContent className={`${compact ? 'space-y-3 p-0' : 'space-y-6'}`}>
        {/* Progress Section */}
        <div className={`${compact ? 'space-y-2' : 'space-y-3'}`}>
          <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'} text-white/80`}>
            <span>Questions Completed</span>
            <span className="font-medium">
              {stats.answeredQuestions} / {stats.totalQuestions}
            </span>
          </div>
          <Progress value={progressPercentage} className={`${compact ? 'h-1' : 'h-2'} bg-white/10`} />
          <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-white/60 text-center`}>
            {progressPercentage.toFixed(1)}% Complete
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 ${compact ? 'gap-3' : 'gap-4'}`}>
          {showResults && (
            <>
              <div className="text-center space-y-1.5">
                <div className="flex items-center justify-center">
                  <CheckCircle className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-green-500`} />
                </div>
                <div className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-green-500`}>
                  {stats.correctAnswers}
                </div>
                <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-white/60`}>Correct</div>
              </div>

              <div className="text-center space-y-1.5">
                <div className="flex items-center justify-center">
                  <AlertCircle className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-red-500`} />
                </div>
                <div className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-red-500`}>
                  {stats.wrongAnswers}
                </div>
                <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-white/60`}>Wrong</div>
              </div>
            </>
          )}

          {showAccuracy && (
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center">
                <TrendingUp className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-blue-500`} />
              </div>
              <div className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-blue-500`}>
                {stats.accuracy}%
              </div>
              <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-white/60`}>Accuracy</div>
            </div>
          )}

          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center">
              <Target className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-purple-500`} />
            </div>
            <div className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-purple-500`}>
              {stats.totalQuestions - stats.answeredQuestions}
            </div>
            <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-white/60`}>Remaining</div>
          </div>
        </div>

        {showAccuracy && (
          <div className="flex justify-center">
            <Badge 
              variant={stats.accuracy >= 80 ? "default" : stats.accuracy >= 60 ? "secondary" : "destructive"}
              className={`${compact ? 'px-3 py-1 text-xs' : 'px-4 py-2'} bg-white/10 border-white/20 text-white`}
            >
              {stats.accuracy >= 80 ? "Excellent!" : 
               stats.accuracy >= 60 ? "Good Progress" : 
               "Keep Practicing"}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
