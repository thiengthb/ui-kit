import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/info-tooltip';

interface PageHeaderProps {
  /** Small line above the title (eyebrow) */
  eyebrow?: string;
  title: ReactNode;
  /** Short description below the title. For a LONG explanation use `info` instead of `description`. */
  description?: ReactNode;
  /** Long explanation → ⓘ icon next to the title (hover tooltip) — keeps the title clean */
  info?: ReactNode;
  /** Page-level action, right-aligned (e.g. a "Create" button) */
  action?: ReactNode;
  /** "‹ …" link for sub-pages — acts as a light breadcrumb */
  backHref?: string;
  backLabel?: string;
  /** Allow capitalizing the first letter of the title */
  titleClassName?: string;
  className?: string;
}

/**
 * Shared page header: eyebrow + h1 + description + right-aligned action, with an optional back-link.
 * Every page uses this same component so title rhythm/size stays consistent.
 *
 * NOTE - NEXT-ONLY: uses `next/link`. In a Vite SPA, replace it with react-router's <Link>.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  info,
  action,
  backHref,
  backLabel = 'Quay lại',
  titleClassName,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-8', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
          <div className="mt-1 flex items-center gap-1.5">
            <h1 className={cn('text-xl font-semibold tracking-tight sm:text-2xl', titleClassName)}>
              {title}
            </h1>
            {info && (
              <InfoTooltip label={typeof title === 'string' ? title : 'Giải thích'} side="bottom">
                {info}
              </InfoTooltip>
            )}
          </div>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
