'use client';

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataPagination } from '@/components/ui/data-pagination';
import { cn } from '@/lib/utils';

/**
 * Per-column extras read by the DataTable. Attach via a column's `meta`.
 *   label        — name shown in the "Cột" (show/hide) menu (falls back to a string header)
 *   defaultHidden— column starts hidden until toggled on (e.g. secondary analysis fields)
 *   headClassName/cellClassName — extra classes for that column's header / cells
 */
export interface DataTableColumnMeta {
  label?: string;
  defaultHidden?: boolean;
  headClassName?: string;
  cellClassName?: string;
}

// ---------------------------------------------------------------------------
// Self-contained persistence: sessionStorage (survives nav + reload in-tab) with an OPTIONAL mirror to
// the URL via history.replaceState (shareable link, no server refetch). Same idea as `use-session-state`
// but inlined so the DataTable is a single drop-in file. Built on useSyncExternalStore → SSR-safe.
// ---------------------------------------------------------------------------
const cache = new Map<string, { raw: string | null; value: unknown }>();
const listeners = new Map<string, Set<() => void>>();

function readPersisted<T>(storeKey: string, initial: T, urlKey?: string): T {
  if (typeof window === 'undefined') return initial;
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(storeKey);
  } catch {
    return initial;
  }
  const hit = cache.get(storeKey);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = initial;
  if (raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = initial;
    }
  } else if (urlKey) {
    const p = new URLSearchParams(window.location.search).get(urlKey);
    if (p != null) {
      try {
        value = JSON.parse(p) as T;
      } catch {
        value = initial;
      }
    }
  }
  cache.set(storeKey, { raw, value });
  return value;
}

function writeUrl<T>(urlKey: string, value: T, initial: T): void {
  const url = new URL(window.location.href);
  const str = JSON.stringify(value);
  if (str === JSON.stringify(initial)) url.searchParams.delete(urlKey);
  else url.searchParams.set(urlKey, str);
  window.history.replaceState(null, '', url);
}

function usePersisted<T>(
  storeKey: string,
  initial: T,
  urlKey?: string,
): [T, Dispatch<SetStateAction<T>>] {
  const value = useSyncExternalStore(
    useCallback(
      (cb: () => void) => {
        let set = listeners.get(storeKey);
        if (!set) {
          set = new Set();
          listeners.set(storeKey, set);
        }
        set.add(cb);
        const onStorage = (e: StorageEvent) => {
          if (e.key === storeKey) cb();
        };
        window.addEventListener('storage', onStorage);
        return () => {
          set?.delete(cb);
          window.removeEventListener('storage', onStorage);
        };
      },
      [storeKey],
    ),
    () => readPersisted(storeKey, initial, urlKey),
    () => initial,
  );

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const prev = readPersisted(storeKey, initial, urlKey);
      const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action;
      const raw = JSON.stringify(next);
      try {
        window.sessionStorage.setItem(storeKey, raw);
      } catch {
        // best-effort; still update the in-memory cache below so the UI reflects the change
      }
      cache.set(storeKey, { raw, value: next });
      if (urlKey) writeUrl(urlKey, next, initial);
      listeners.get(storeKey)?.forEach((cb) => cb());
    },
    [storeKey, initial, urlKey],
  );

  return [value, setValue];
}

// Stable default references (useSyncExternalStore needs a stable server snapshot).
const EMPTY_SORTING: SortingState = [];
const EMPTY_SIZING: ColumnSizingState = {};

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Stable row id (e.g. `(row) => row.id`) — keeps selection/state correct across re-sorts. */
  getRowId?: (row: T) => string;
  /**
   * sessionStorage namespace (e.g. "items"). REQUIRED so two tables never collide. Also used as the
   * URL-param prefix unless `urlPrefix` is given.
   */
  persistKey: string;
  /** URL-param prefix (default = persistKey + "."). Use distinct prefixes for two tables on one page. */
  urlPrefix?: string;
  /** Show a global search box with this placeholder (searches every column's value). Omit = no search. */
  searchPlaceholder?: string;
  /** App-specific filter controls (e.g. a FilterPopover) — rendered at the toolbar's left. */
  filterSlot?: ReactNode;
  /** App-specific actions (e.g. an import/create button) — rendered at the toolbar's right. */
  actionSlot?: ReactNode;
  emptyMessage?: string;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  /** Per-row class (e.g. dim suspended rows). */
  rowClassName?: (row: T) => string | undefined;
  /** Total rows BEFORE any app-level pre-filtering — shows "(lọc từ N)" when it differs. */
  totalCount?: number;
  /** Noun for the count line ("mẫu", "từ", "dòng"). */
  countNoun?: string;
  /** Multi-column sort (shift-click adds a column). Default true. */
  enableMultiSort?: boolean;
  /** Draggable column widths. Default true. */
  enableResizing?: boolean;
}

/**
 * A batteries-included, headless-backed (TanStack Table) data table for CRUD screens. One config-driven
 * component covering: multi-column sort (shift-click to add), draggable column widths, show/hide columns,
 * global search, an app filter slot, and pagination — with the whole view (sort / visible columns / page
 * / size / search) persisted to sessionStorage AND mirrored to the URL (shareable + survives reload;
 * widths persist per-tab only). The app owns the COLUMNS (accessor + `cell` renderers → any custom cell:
 * edit/delete actions, badges, links) and the domain FILTERS (via `filterSlot`, pre-filtering `data`).
 *
 * ⚠️ Needs the shadcn primitives it imports (table, button, dropdown-menu, input) + `data-pagination`,
 * and `@tanstack/react-table`. A leading string `header` is used as the column's show/hide label unless
 * `meta.label` is set.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  persistKey,
  urlPrefix,
  searchPlaceholder,
  filterSlot,
  actionSlot,
  emptyMessage = 'Không có dữ liệu.',
  pageSizeOptions = [25, 50, 100],
  initialPageSize = 50,
  rowClassName,
  totalCount,
  countNoun = 'dòng',
  enableMultiSort = true,
  enableResizing = true,
}: DataTableProps<T>) {
  'use no memo'; // TanStack's useReactTable returns fresh functions each render — opt out of React Compiler memoization (official guidance); the table does its own memoization internally.
  const up = urlPrefix ?? `${persistKey}.`;

  // Columns flagged `meta.defaultHidden` start hidden (stable object → safe as the persistence default).
  const defaultVisibility = useMemo<VisibilityState>(() => {
    const v: VisibilityState = {};
    for (const c of columns) {
      const id = (c.id ?? (c as { accessorKey?: string }).accessorKey) as string | undefined;
      if (id && (c.meta as DataTableColumnMeta | undefined)?.defaultHidden) v[id] = false;
    }
    return v;
  }, [columns]);

  const [sorting, setSorting] = usePersisted<SortingState>(
    `${persistKey}.sort`,
    EMPTY_SORTING,
    `${up}sort`,
  );
  const [visibility, setVisibility] = usePersisted<VisibilityState>(
    `${persistKey}.cols`,
    defaultVisibility,
    `${up}cols`,
  );
  const [sizing, setSizing] = usePersisted<ColumnSizingState>(`${persistKey}.w`, EMPTY_SIZING);
  const [globalFilter, setGlobalFilter] = usePersisted<string>(
    `${persistKey}.q`,
    '',
    searchPlaceholder ? `${up}q` : undefined,
  );
  const [pageIndex, setPageIndex] = usePersisted<number>(`${persistKey}.page`, 0, `${up}page`);
  const [pageSize, setPageSize] = usePersisted<number>(
    `${persistKey}.size`,
    initialPageSize,
    `${up}size`,
  );

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );
  const setPagination = useCallback(
    (updater: SetStateAction<PaginationState>) => {
      const next =
        typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      if (next.pageIndex !== pageIndex) setPageIndex(next.pageIndex);
      if (next.pageSize !== pageSize) setPageSize(next.pageSize);
    },
    [pageIndex, pageSize, setPageIndex, setPageSize],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack returns fresh fns each render; the `use no memo` directive above already opts this component out of React Compiler memoization.
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility, columnSizing: sizing, globalFilter, pagination },
    getRowId,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onColumnSizingChange: setSizing,
    onGlobalFilterChange: (u) => {
      setGlobalFilter(u as string);
      setPageIndex(0); // a new search shouldn't leave you on an out-of-range page
    },
    onPaginationChange: setPagination,
    enableMultiSort,
    enableColumnResizing: enableResizing,
    columnResizeMode: 'onChange',
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false, // we manage page resets explicitly (filter/search) to avoid surprises
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const start = safePageIndex * pageSize;
  const hideableColumns = table.getAllColumns().filter((c) => c.getCanHide());

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Icon-only at rest; the label slides in on hover / focus / while open (matches the
                    app's other toolbar actions). Button already carries the `group/button` class. */}
                <Button variant="outline" size="sm" className="gap-0" aria-label="Hiển thị cột" title="Hiển thị cột">
                  <Columns3 className="size-4 shrink-0" aria-hidden />
                  <span
                    aria-hidden
                    className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover/button:ml-1.5 group-hover/button:max-w-24 group-hover/button:opacity-100 group-focus-visible/button:ml-1.5 group-focus-visible/button:max-w-24 group-focus-visible/button:opacity-100 group-aria-expanded/button:ml-1.5 group-aria-expanded/button:max-w-24 group-aria-expanded/button:opacity-100 motion-reduce:transition-none"
                  >
                    Cột
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Hiển thị trường</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((column) => {
                  const meta = column.columnDef.meta as DataTableColumnMeta | undefined;
                  const label =
                    meta?.label ??
                    (typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(v) => column.toggleVisibility(v === true)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {filterSlot}
        </div>

        {searchPlaceholder && (
          <div className="relative sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={globalFilter}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
        )}

        {actionSlot && <div className="sm:ml-auto">{actionSlot}</div>}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="table-fixed" style={{ width: table.getTotalSize() }}>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => {
                      const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown;
                      // With ≥2 sorts, show each column's 1-based priority so the order is legible.
                      const showRank = sorting.length > 1 && sorted;
                      return (
                        <TableHead
                          key={header.id}
                          className={cn('relative', meta?.headClassName)}
                          style={{ width: header.getSize() }}
                          aria-sort={
                            sorted === 'asc'
                              ? 'ascending'
                              : sorted === 'desc'
                                ? 'descending'
                                : undefined
                          }
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                'flex items-center gap-1 transition-colors hover:text-foreground',
                                sorted && 'text-foreground',
                              )}
                              title="Bấm để sắp xếp · giữ Shift để thêm cột phụ"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortIcon
                                className={cn('size-3.5', sorted ? 'opacity-100' : 'opacity-40')}
                                aria-hidden
                              />
                              {showRank && (
                                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                                  {header.column.getSortIndex() + 1}
                                </span>
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                          {header.column.getCanResize() && (
                            <span
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={(e) => e.stopPropagation()}
                              role="separator"
                              aria-orientation="vertical"
                              className={cn(
                                'absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-border',
                                header.column.getIsResizing() && 'bg-primary/60',
                              )}
                            />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={rowClassName?.(row.original)}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn('overflow-hidden', meta?.cellClassName)}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
            <span className="text-xs text-muted-foreground">
              {start + 1}–{Math.min(start + pageSize, filteredCount)} / {filteredCount} {countNoun}
              {totalCount != null && filteredCount !== totalCount && ` (lọc từ ${totalCount})`}
            </span>
            <DataPagination
              page={safePageIndex + 1}
              pageCount={pageCount}
              onPageChange={(p) => setPageIndex(p - 1)}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageSizeChange={
                filteredCount > pageSizeOptions[0]
                  ? (s) => {
                      setPageSize(s);
                      setPageIndex(0);
                    }
                  : undefined
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
