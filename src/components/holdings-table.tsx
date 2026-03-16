'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type HoldingRow, ASSET_CLASSES } from '@/lib/types';
import { formatCurrency } from '@/lib/decimal';
import { ArrowUpDown, Lock } from 'lucide-react';

const PALETTE = [
  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'text-rose-400 bg-rose-400/10 border-rose-400/20',
  'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  'text-teal-400 bg-teal-400/10 border-teal-400/20',
];

function sourceColor(source: string, allSources: string[]): string {
  const idx = allSources.indexOf(source);
  return PALETTE[idx % PALETTE.length];
}

function buildColumns(allSources: string[]): ColumnDef<HoldingRow>[] {
  return [
  {
    accessorKey: 'source',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Source
        <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => {
      const source = row.getValue<string>('source');
      return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${sourceColor(source, allSources)}`}>
          {source}
        </span>
      );
    },
  },
  {
    accessorKey: 'asset_name',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Asset Name
        <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-white/90">{row.getValue<string>('asset_name')}</span>
    ),
  },
  {
    accessorKey: 'asset_class',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Class
        <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-white/50">{row.getValue<string>('asset_class')}</span>
    ),
  },
  {
    accessorKey: 'ticker_symbol',
    header: () => <span className="text-white/40">Ticker</span>,
    cell: ({ row }) => {
      const ticker = row.getValue<string | null>('ticker_symbol');
      return ticker ? (
        <span className="font-mono text-xs text-white/60">{ticker}</span>
      ) : (
        <span className="text-white/15">—</span>
      );
    },
  },
  {
    accessorKey: 'valuation_base',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Valuation
        <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-white/90">
        {formatCurrency(row.getValue<number>('valuation_base'))}
      </span>
    ),
  },
  {
    accessorKey: 'valuation_date',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-white/40 text-sm">{row.getValue<string>('valuation_date')}</span>
    ),
  },
  {
    accessorKey: 'is_static',
    header: () => <span className="text-white/40">Static</span>,
    cell: ({ row }) =>
      row.getValue<boolean>('is_static') ? (
        <Lock className="size-3.5 text-white/25" />
      ) : null,
  },
  ];
}

interface HoldingsTableProps {
  data: HoldingRow[];
}

export function HoldingsTable({ data }: HoldingsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  const allSources = useMemo(
    () => [...new Set(data.map((h) => h.source))].sort(),
    [data],
  );

  const columns = useMemo(() => buildColumns(allSources), [allSources]);

  const filteredData = useMemo(() => {
    let result = data;
    if (sourceFilter !== 'all') {
      result = result.filter((h) => h.source === sourceFilter);
    }
    if (classFilter !== 'all') {
      result = result.filter((h) => h.asset_class === classFilter);
    }
    return result;
  }, [data, sourceFilter, classFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  });

  return (
    <Card className="border-white/[0.06] bg-[#0a0a0a]">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium text-white/40 tracking-wide uppercase">Holdings</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="source-filter" className="text-xs text-white/30">
                Source
              </label>
              <select
                id="source-filter"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-7 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 text-xs text-white/70"
              >
                <option value="all">All</option>
                {allSources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="class-filter" className="text-xs text-white/30">
                Class
              </label>
              <select
                id="class-filter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-7 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 text-xs text-white/70"
              >
                <option value="all">All</option>
                {ASSET_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-white/[0.06] hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-white/40">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-24 text-center text-white/20">
                  No holdings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="mt-4 text-xs text-white/20">
          Showing {table.getRowModel().rows.length} of {data.length} holdings
        </div>
      </CardContent>
    </Card>
  );
}
