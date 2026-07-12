'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DataPaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages (>= 1). */
  pageCount: number;
  /** Called with the target page when the user navigates. */
  onPageChange: (page: number) => void;
  /** How many page numbers to show on each side of the current one (default 1). */
  siblingCount?: number;
  /** Disable every control (e.g. while the list is loading). */
  disabled?: boolean;
  className?: string;
  /** Current rows-per-page. Provide together with `onPageSizeChange` to show the size selector. */
  pageSize?: number;
  /** Options offered by the rows-per-page selector (default 25 / 50 / 100). */
  pageSizeOptions?: number[];
  /** Called with the new page size; when set (with `pageSize`) the size selector is shown. */
  onPageSizeChange?: (size: number) => void;
}

const DOTS = '…';

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

/**
 * Build a compact page window: [1, '…', 4, 5, 6, '…', 20]. Always keeps the first + last page
 * and `siblingCount` pages either side of the current one; fills gaps with a single ellipsis.
 */
function buildPages(
  page: number,
  pageCount: number,
  siblingCount: number,
): (number | typeof DOTS)[] {
  const totalNumbers = siblingCount * 2 + 5; // first + last + current + 2 siblings + 2 dots
  if (totalNumbers >= pageCount) return range(1, pageCount);

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, pageCount);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < pageCount - 1;
  const edgeCount = 3 + 2 * siblingCount;

  if (!showLeftDots && showRightDots) return [...range(1, edgeCount), DOTS, pageCount];
  if (showLeftDots && !showRightDots)
    return [1, DOTS, ...range(pageCount - edgeCount + 1, pageCount)];
  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, pageCount];
}

/**
 * Shared controlled pagination control — the app owns the current page + slicing; this only renders
 * the navigation UI (and an optional rows-per-page selector). Works for client-side (slice in
 * memory) or server-side (drive a `?page=`/`?size=` param) paging. Reusable across every MiniServer
 * frontend. Renders nothing when there is a single page AND no size selector.
 */
export function DataPagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  disabled = false,
  className,
  pageSize,
  pageSizeOptions = [25, 50, 100],
  onPageSizeChange,
}: DataPaginationProps) {
  const showSize = pageSize != null && !!onPageSizeChange;
  if (pageCount <= 1 && !showSize) return null;

  const pages = buildPages(page, pageCount, siblingCount);
  const go = (target: number) => {
    const clamped = Math.min(Math.max(target, 1), pageCount);
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showSize && (
        <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
          <span className="hidden sm:inline">Số dòng</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange?.(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger size="sm" className="h-7 w-[4.25rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="min-w-[4.25rem]">
              {pageSizeOptions.map((o) => (
                <SelectItem key={o} value={String(o)}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {pageCount > 1 && (
        <nav
          role="navigation"
          aria-label="Phân trang"
          className="flex items-center justify-center gap-1"
        >
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => go(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>

          {pages.map((p, i) =>
            p === DOTS ? (
              <span
                key={`dots-${i}`}
                className="flex size-8 items-center justify-center text-muted-foreground"
                aria-hidden
              >
                <MoreHorizontal className="size-4" />
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="icon"
                className="size-8"
                onClick={() => go(p)}
                disabled={disabled}
                aria-label={`Trang ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => go(page + 1)}
            disabled={disabled || page >= pageCount}
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </nav>
      )}
    </div>
  );
}
