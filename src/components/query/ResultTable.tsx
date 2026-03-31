"use client"

import { Terminal, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { QueryResult } from "@/lib/db-drivers"

interface ResultTableProps {
  result: QueryResult | null
  error: string | null
  isLoading: boolean
}

export function ResultTable({ result, error, isLoading }: ResultTableProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        className="bg-red-50 rounded-md border border-red-200 p-4 flex items-start gap-2"
        role="alert"
      >
        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
        <span className="text-sm text-red-700">{error}</span>
      </div>
    )
  }

  // Empty state
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <Terminal className="h-8 w-8 text-neutral-300" />
        <p className="text-sm font-semibold text-neutral-700">
          쿼리를 실행하면 결과가 여기에 표시됩니다
        </p>
        <p className="text-xs text-neutral-500">위에서 연결을 선택하고 SQL을 입력하세요</p>
      </div>
    )
  }

  // DML / other result
  if (result.type === "dml" || result.type === "other") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
        <p className="text-sm font-semibold text-neutral-700">
          {result.rowCount}행이 영향을 받았습니다
        </p>
        <p className="text-xs text-neutral-500">실행 시간: {result.durationMs}ms</p>
      </div>
    )
  }

  // SELECT result
  const columns = result.columns ?? []
  const rows = result.rows ?? []

  return (
    <div className="space-y-2">
      <div className="flex gap-4 items-center text-sm text-neutral-500">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {result.durationMs}ms
        </span>
        <span>
          {rows.length}행
          {result.capped && (
            <span className="text-amber-600 ml-1">(최대 500행 표시)</span>
          )}
        </span>
      </div>
      <div className="overflow-auto max-h-96 rounded-md border border-neutral-200">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {columns.map((col) => (
                  <TableCell key={col} className="text-sm text-neutral-600 font-mono text-xs">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-neutral-400 italic">NULL</span>
                    ) : (
                      String(row[col])
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
