"use client"

import { useState, useEffect } from "react"
import { Play, Save, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { QueryEditor } from "@/components/query/QueryEditor"
import { ResultTable } from "@/components/query/ResultTable"
import { SavedQueryPanel } from "@/components/query/SavedQueryPanel"
import type { QueryResult } from "@/lib/db-drivers"

interface Connection {
  id: string
  name: string
  type: string
  color: string | null
}

interface SavedQuery {
  id: string
  userId: string
  connectionId: string | null
  name: string
  sql: string
  createdAt: string
  updatedAt: string
}

interface QueryPageClientProps {
  connections: Connection[]
  userRole: "admin" | "operator" | "viewer"
}

function isNonSelectSql(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed) return false
  return (
    trimmed.startsWith("INSERT") ||
    trimmed.startsWith("UPDATE") ||
    trimmed.startsWith("DELETE") ||
    trimmed.startsWith("CREATE") ||
    trimmed.startsWith("DROP") ||
    trimmed.startsWith("ALTER") ||
    trimmed.startsWith("TRUNCATE") ||
    trimmed.startsWith("REPLACE") ||
    trimmed.startsWith("MERGE") ||
    trimmed.startsWith("CALL") ||
    trimmed.startsWith("EXEC")
  )
}

export function QueryPageClient({ connections, userRole }: QueryPageClientProps) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("")
  const [sql, setSql] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"results" | "saved">("results")

  // Save modal state
  const [saveName, setSaveName] = useState("")
  const [saveConnectionId, setSaveConnectionId] = useState<string>("")
  const [saveNameError, setSaveNameError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch saved queries on mount
  useEffect(() => {
    fetch("/api/query/saved")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setSavedQueries(data.data)
      })
      .catch(() => {
        // Fail silently — saved queries are non-critical
      })
  }, [])

  const showDdlWarning =
    (userRole === "operator" || userRole === "admin") && isNonSelectSql(sql)

  async function handleExecute() {
    if (!selectedConnectionId) {
      toast.error("연결을 선택해주세요")
      return
    }
    if (!sql.trim()) {
      toast.error("실행할 SQL을 입력해주세요")
      return
    }

    setIsLoading(true)
    setResult(null)
    setError(null)
    setActiveTab("results")

    try {
      const res = await fetch("/api/query/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: selectedConnectionId, sql }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "쿼리 실행 중 오류가 발생했습니다")
      } else {
        setResult(data.data)
      }
    } catch {
      setError("서버 연결 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenSaveModal() {
    setSaveName("")
    setSaveConnectionId(selectedConnectionId)
    setSaveNameError(null)
    setSaveModalOpen(true)
  }

  async function handleSave() {
    if (!saveName.trim()) {
      setSaveNameError("쿼리 이름을 입력해주세요")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/query/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          sql,
          connectionId: saveConnectionId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveNameError(data.error ?? "저장 중 오류가 발생했습니다")
        return
      }
      setSavedQueries((prev) => [data.data, ...prev])
      setSaveModalOpen(false)
      toast.success("쿼리가 저장되었습니다")
    } catch {
      setSaveNameError("서버 연결 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteTargetId(id)
    try {
      const res = await fetch(`/api/query/saved/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "삭제 중 오류가 발생했습니다")
        return
      }
      setSavedQueries((prev) => prev.filter((q) => q.id !== id))
      toast.success("쿼리가 삭제되었습니다")
    } catch {
      toast.error("서버 연결 오류가 발생했습니다")
    } finally {
      setDeleteTargetId(null)
    }
  }

  function handleLoad(loadSql: string, loadConnectionId: string | null) {
    setSql(loadSql)
    if (loadConnectionId) setSelectedConnectionId(loadConnectionId)
    setActiveTab("results")
  }

  return (
    <div className="p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-neutral-900">SQL 쿼리</h1>
        <Select
          value={selectedConnectionId}
          onValueChange={setSelectedConnectionId}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="연결 선택">
              {selectedConnectionId && (() => {
                const conn = connections.find((c) => c.id === selectedConnectionId)
                if (!conn) return null
                return (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                      style={{ backgroundColor: conn.color ?? "#94a3b8" }}
                    />
                    {conn.name}
                  </span>
                )
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                    style={{ backgroundColor: conn.color ?? "#94a3b8" }}
                  />
                  {conn.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="default"
          disabled={!selectedConnectionId || !sql.trim() || isLoading}
          onClick={handleExecute}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isLoading ? "실행 중…" : "쿼리 실행"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!sql.trim()}
          onClick={handleOpenSaveModal}
        >
          <Save className="h-4 w-4 mr-2" />
          저장
        </Button>
      </div>

      {/* DDL warning banner */}
      {showDdlWarning && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          주의: DML/DDL 실행은 데이터에 영구적인 영향을 미칩니다.
        </div>
      )}

      {/* Monaco Editor */}
      <QueryEditor value={sql} onChange={setSql} onExecute={handleExecute} />

      {/* Bottom panel */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "results" | "saved")}>
          <TabsList>
            <TabsTrigger value="results">결과</TabsTrigger>
            <TabsTrigger value="saved">저장된 쿼리</TabsTrigger>
          </TabsList>
          <TabsContent value="results" className="mt-4">
            <ResultTable result={result} error={error} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="saved" className="mt-4">
            <SavedQueryPanel
              queries={savedQueries}
              connections={connections}
              onLoad={handleLoad}
              onDelete={handleDelete}
              isDeleting={deleteTargetId}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Query Modal */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>쿼리 저장</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">이름</label>
              <Input
                placeholder="쿼리 이름을 입력하세요"
                maxLength={100}
                value={saveName}
                onChange={(e) => {
                  setSaveName(e.target.value)
                  if (saveNameError) setSaveNameError(null)
                }}
              />
              {saveNameError && (
                <p className="text-sm text-red-600">{saveNameError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">연결 (선택)</label>
              <Select
                value={saveConnectionId}
                onValueChange={setSaveConnectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="연결 없음 (범용 쿼리)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">연결 없음 (범용 쿼리)</SelectItem>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: conn.color ?? "#94a3b8" }}
                        />
                        {conn.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">SQL 미리보기</label>
              <pre className="bg-neutral-50 rounded-md border border-neutral-200 p-3 text-xs font-mono overflow-auto max-h-32 text-neutral-700 whitespace-pre-wrap">
                {sql}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)}>
              취소
            </Button>
            <Button disabled={isSaving} onClick={handleSave}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
