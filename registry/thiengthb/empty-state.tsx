import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Optional when `children` carries the copy instead. */
  title?: string;
  description?: ReactNode;
  /** Suggested action (e.g. a create button) */
  action?: ReactNode;
  className?: string;
  /**
   * Free-form body, for copy too rich for `title`/`description` — inline `<code>`, `<em>`, or a
   * dialog trigger. Rendered as a DIRECT child (never wrapped), so a layout `className` like
   * `flex flex-col items-center gap-4` still applies to these nodes.
   */
  children?: ReactNode;
}

/**
 * Shared empty state — dashed border frame + icon + title + description.
 * Unifies every "no data yet" spot so pages don't each invent their own style.
 *
 * Two interchangeable shapes: the structured one (`icon`/`title`/`description`/`action`) and the
 * free-form one (`children`). Passing `children` also mutes the container text, since that copy has
 * no `description` wrapper to inherit the style from.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border/70 px-6 py-16 text-center',
        children && 'text-sm text-muted-foreground',
        className,
      )}
    >
      {Icon && <Icon className="mx-auto size-8 text-muted-foreground/40" />}
      {title && <p className={cn('text-sm font-medium', Icon && 'mt-3')}>{title}</p>}
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {children}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
