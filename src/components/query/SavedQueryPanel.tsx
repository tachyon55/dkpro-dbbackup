"use client"

import { Save, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SavedQuery {
  id: string
  userId: string
  connectionId: string | null
  name: string
  sql: string
  createdAt: string
  updatedAt: string
}

interface Connection {
  id: string
  name: string
  type: string
  color: string | null
}

interface SavedQueryPanelProps {
  queries: SavedQuery[]
  connections: Connection[]
  onLoad: (sql: string, connectionId: string | null) => void
  onDelete: (id: string) => void
  isDeleting: string | null
}

export function SavedQueryPanel({
  queries,
  connections,
  onLoad,
  onDelete,
  isDeleting,
}: SavedQueryPanelProps) {
  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <Save className="h-8 w-8 text-neutral-300" />
        <p className="text-sm font-semibold text-neutral-700">저장된 쿼리가 없습니다</p>
        <p className="text-xs text-neutral-500">쿼리를 실행 후 저장 버튼으로 추가하세요</p>
      </div>
    )
  }

  const connectionMap = new Map(connections.map((c) => [c.id, c]))

  return (
    <div className="overflow-auto max-h-96 rounded-md border border-neutral-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>연결</TableHead>
            <TableHead>저장일</TableHead>
            <TableHead className="w-[60px]">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries.map((query) => {
            const conn = query.connectionId ? connectionMap.get(query.connectionId) : null
            return (
              <TableRow
                key={query.id}
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => onLoad(query.sql, query.connectionId)}
              >
                <TableCell>
                  <span className="text-sm font-semibold text-neutral-900 max-w-[180px] truncate block">
                    {query.name}
                  </span>
                </TableCell>
                <TableCell>
                  {conn ? (
                    <span className="flex items-center gap-1.5 text-sm text-neutral-600">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                        style={{ backgroundColor: conn.color ?? "#94a3b8" }}
                      />
                      {conn.name}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">범용</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-neutral-500">
                    {format(new Date(query.createdAt), "yyyy-MM-dd")}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="저장된 쿼리 삭제"
                        className="text-neutral-400 hover:text-red-600"
                        disabled={isDeleting === query.id}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>저장된 쿼리 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          이 쿼리를 삭제하면 복구할 수 없습니다. 계속하시겠습니까?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => onDelete(query.id)}
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
