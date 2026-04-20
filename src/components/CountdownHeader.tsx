import React, { useState, useEffect } from 'react';
import { format, differenceInDays, intervalToDuration, isPast, startOfDay, addDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CountdownHeader() {
  const targetDate = startOfDay(new Date('2026-11-08T00:00:00'));
  const dotStart = startOfDay(new Date('2026-01-01T00:00:00'));
  
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (now >= targetDate) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }
      
      const duration = intervalToDuration({
        start: now,
        end: targetDate,
      });

      const diffDays = differenceInDays(targetDate, now);
      
      setTimeLeft({
        days: diffDays,
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const totalDays = differenceInDays(targetDate, dotStart) + 1;
  const now = new Date();
  const todayStart = startOfDay(now);
  
  // Days passed (including today)
  const daysPassed = differenceInDays(todayStart, dotStart) + 1;

  return (
    <Card className="bg-background/40 border-dashed border-primary/20 overflow-hidden mb-8">
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-center md:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Final Countdown: Nov 8, 2026
            </h2>
            <div className="flex items-baseline gap-2 justify-center md:justify-start">
              <span className="text-3xl font-black tracking-tighter tabular-nums text-foreground">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">to go</span>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Jan 01</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Progress: {Math.round((daysPassed / totalDays) * 100)}%</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Nov 08</span>
            </div>
            <div className="flex flex-wrap gap-[3px] justify-center md:justify-start">
              {Array.from({ length: totalDays }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[5px] h-[5px] rounded-full transition-colors duration-500",
                    i < daysPassed ? "bg-red-500" : "bg-muted-foreground/20"
                  )}
                  title={format(addDays(dotStart, i), 'MMM do')}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
