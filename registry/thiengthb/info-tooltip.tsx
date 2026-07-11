'use client';

import { type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * ⓘ icon that reveals a description in a HOVER/FOCUS tooltip — the minimal-UI alternative to an
 * always-visible description line under a title/label. The tooltip wraps long text and clamps it to
 * a few lines so it never grows into a wall. Opens on hover AND keyboard focus (Radix), so it stays
 * reachable without a pointer. For long rich content / touch-first surfaces prefer the click-Popover
 * variant `info-hint` instead.
 */
export function InfoTooltip({
  children,
  label = 'Giải thích',
  className,
  side = 'top',
}: {
  children: ReactNode;
  /** Accessible name for the trigger (defaults to a generic label). */
  label?: string;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground',
            className,
          )}
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-xs text-left leading-relaxed break-words whitespace-normal line-clamp-6"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
