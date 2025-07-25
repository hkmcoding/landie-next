"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';

export type PlanType = 'pro' | 'trial' | 'free';

interface PlanIndicatorProps {
  plan: PlanType;
  expiresAt?: Date | null;
  onUpgrade: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
}

function calculateTimeLeft(expiresAt: Date): TimeLeft {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0 };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return { days, hours };
}

export function PlanIndicator({ plan, expiresAt, onUpgrade }: PlanIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0 });

  useEffect(() => {
    if (plan === 'trial' && expiresAt) {
      const updateTimer = () => {
        setTimeLeft(calculateTimeLeft(expiresAt));
      };
      
      // Update immediately
      updateTimer();
      
      // Update every hour
      const interval = setInterval(updateTimer, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [plan, expiresAt]);

  const renderBadge = () => {
    switch (plan) {
      case 'pro':
        return (
          <Badge 
            variant="default"
            role="status"
            aria-label="Pro plan active"
          >
            Pro
          </Badge>
        );
      
      case 'trial':
        const trialText = `Trial – ${timeLeft.days} d ${timeLeft.hours} h left`;
        return (
          <Tooltip content="You're on a 7-day Pro trial. Upgrade now to keep AI analytics.">
            <Badge 
              variant="warning"
              role="status"
              aria-label={`Pro trial with ${timeLeft.days} days and ${timeLeft.hours} hours remaining`}
            >
              {trialText}
            </Badge>
          </Tooltip>
        );
      
      case 'free':
        return (
          <Badge 
            variant="outline"
            className="text-muted-foreground"
            role="status"
            aria-label="Free plan active"
          >
            Free plan
          </Badge>
        );
      
      default:
        return null;
    }
  };

  const renderCTA = () => {
    if (plan === 'pro') {
      return null;
    }
    
    const buttonText = plan === 'trial' ? 'Upgrade now' : 'Upgrade to Pro';
    
    return (
      <Button 
        variant="default" 
        size="sm"
        onClick={onUpgrade}
        className="text-xs px-3 py-1 h-auto"
        aria-label={`${buttonText} - Go to pricing page`}
      >
        {buttonText}
      </Button>
    );
  };

  // Use vertical layout for free plan to prevent cramping
  const isVerticalLayout = plan === 'free';
  
  return (
    <div className={`flex gap-3 w-full ${
      isVerticalLayout 
        ? 'flex-col items-start' 
        : 'items-center justify-between'
    }`}>
      {renderBadge()}
      {renderCTA()}
    </div>
  );
}