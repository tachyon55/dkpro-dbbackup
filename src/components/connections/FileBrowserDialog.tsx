"use client"

import { useCallback, useEffect, useState } from "react"
import { Folder, FileIcon, ArrowUp, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  isExecutable: boolean
}

type BrowseResult = {
  currentDir: string
  parentDir: string | null
  items: FileEntry[]
}

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (path: string) => void
  mode?: "file" | "directory"
  title?: string
}

export function FileBrowserDialog({
  open,
  onClose,
  onSelect,
  mode = "file",
  title = "파일 선택",
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<BrowseResult | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [manualPath, setManualPath] = useState("")

  const browse = useCallback(async (dir?: string) => {
    setLoading(true)
    setError(null)
    setSelected(null)
    try {
      const params = new URLSearchParams({ mode })
      if (dir) params.set("dir", dir)
      const res = await fetch(`/api/file-browse?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "디렉토리를 읽을 수 없습니다")
        return
      }
      setData(json.data)
      setManualPath(json.data.currentDir)
    } catch {
      setError("서버 연결 오류")
    } finally {
      setLoading(false)
    }
  }, [mode])

  useEffect(() => {
    if (open) {
      browse()
    } else {
      setData(null)
      setSelected(null)
      setManualPath("")
      setError(null)
    }
  }, [open, browse])

  function handleItemClick(item: FileEntry) {
    if (item.isDirectory) {
      browse(item.path)
    } else {
      setSelected(item.path)
      setManualPath(item.path)
    }
  }

  function handleItemDoubleClick(item: FileEntry) {
    if (!item.isDirectory) {
      onSelect(item.path)
      onClose()
    }
  }

  function handleConfirm() {
    const value = manualPath.trim()
    if (value) {
      onSelect(value)
      onClose()
    }
  }

  function handleManualNavigate() {
    const value = manualPath.trim()
    if (value) browse(value)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Path bar */}
        <div className="flex gap-2">
          <Input
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualNavigate()}
            placeholder="경로를 직접 입력..."
            className="text-sm font-mono"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualNavigate}
            className="shrink-0"
          >
            이동
          </Button>
        </div>

        {/* File list */}
        <div className="border rounded-md min-h-[280px] max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-sm text-red-500 px-4 text-center">
              {error}
            </div>
          ) : data ? (
            <div className="divide-y">
              {/* Parent directory */}
              {data.parentDir && (
                <button
                  type="button"
                  onClick={() => browse(data.parentDir!)}
                  className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-neutral-50 text-sm"
                >
                  <ArrowUp className="h-4 w-4 text-neutral-400" />
                  <span className="text-neutral-500">..</span>
                </button>
              )}
              {data.items.length === 0 && (
                <div className="flex items-center justify-center h-32 text-sm text-neutral-400">
                  {mode === "file" ? "실행 파일이 없습니다" : "하위 폴더가 없습니다"}
                </div>
              )}
              {data.items.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className={`flex items-center gap-2 px-3 py-2 w-full text-left text-sm transition-colors ${
                    selected === item.path
                      ? "bg-indigo-50 text-indigo-700"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  {item.isDirectory ? (
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <FileIcon className="h-4 w-4 text-neutral-500 shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!manualPath.trim()}>
            선택
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
