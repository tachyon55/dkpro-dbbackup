"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ColorPicker } from "./ColorPicker"
import type { Connection } from "./ConnectionCard"

// ── Schema ────────────────────────────────────────────────────────────────────

const modalSchema = z.object({
  name: z.string().min(1, "연결 이름을 입력해주세요").max(100),
  type: z.enum(["mysql", "mariadb", "postgresql", "sqlserver", "oracle", "sqlite"]),
  color: z.string().optional(),
  host: z.string().optional(),
  port: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  filePath: z.string().optional(),
  sid: z.string().optional(),
  serviceName: z.string().optional(),
  oracleMode: z.enum(["sid", "serviceName"]).optional(),
})

type ModalForm = z.infer<typeof modalSchema>

// ── Default ports ─────────────────────────────────────────────────────────────

const DEFAULT_PORTS: Record<string, string> = {
  mysql: "3306",
  mariadb: "3306",
  postgresql: "5432",
  sqlserver: "1433",
  oracle: "1521",
}

// ── DB type options ───────────────────────────────────────────────────────────

const DB_TYPE_OPTIONS = [
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlserver", label: "SQL Server" },
  { value: "oracle", label: "Oracle" },
  { value: "sqlite", label: "SQLite" },
] as const

// ── Test result type ──────────────────────────────────────────────────────────

type TestResult = {
  success: boolean
  message: string
  responseTime?: number
} | null

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  mode: "create" | "edit"
  connection?: Connection
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConnectionModal({ mode, connection, open, onClose, onSuccess }: Props) {
  const isEdit = mode === "edit"
  const [testResult, setTestResult] = useState<TestResult>(null)
  const [testLoading, setTestLoading] = useState(false)

  const form = useForm<ModalForm>({
    resolver: zodResolver(modalSchema),
    defaultValues: {
      name: "",
      type: "mysql",
      color: "#3b82f6",
      host: "",
      port: "3306",
      username: "",
      password: "",
      database: "",
      filePath: "",
      sid: "",
      serviceName: "",
      oracleMode: "sid",
    },
  })

  const watchedType = form.watch("type")
  const watchedName = form.watch("name")

  // Sync form when editing existing connection
  useEffect(() => {
    if (isEdit && connection && open) {
      form.reset({
        name: connection.name,
        type: connection.type,
        color: connection.color ?? "#3b82f6",
        host: connection.host ?? "",
        port: connection.port?.toString() ?? DEFAULT_PORTS[connection.type] ?? "",
        username: connection.username ?? "",
        password: "",
        database: connection.database ?? "",
        filePath: connection.filePath ?? "",
        sid: connection.sid ?? "",
        serviceName: connection.serviceName ?? "",
        oracleMode: connection.serviceName ? "serviceName" : "sid",
      })
      setTestResult(null)
    }
  }, [connection, isEdit, open, form])

  // Reset form when opening create modal
  useEffect(() => {
    if (!isEdit && open) {
      form.reset({
        name: "",
        type: "mysql",
        color: "#3b82f6",
        host: "",
        port: "3306",
        username: "",
        password: "",
        database: "",
        filePath: "",
        sid: "",
        serviceName: "",
        oracleMode: "sid",
      })
      setTestResult(null)
    }
  }, [open, isEdit, form])

  // When DB type changes, update default port and clear test result
  function handleTypeChange(newType: ModalForm["type"]) {
    form.setValue("type", newType, { shouldValidate: true })
    form.setValue("port", DEFAULT_PORTS[newType] ?? "")
    form.setValue("host", "")
    form.setValue("username", "")
    form.setValue("database", "")
    form.setValue("filePath", "")
    form.setValue("sid", "")
    form.setValue("serviceName", "")
    setTestResult(null)
  }

  // Clear test result when fields change
  function clearTestResult() {
    if (testResult !== null) setTestResult(null)
  }

  // ── Test connection ────────────────────────────────────────────────────────

  async function handleTest() {
    if (!connection?.id) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/connections/${connection.id}/test`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setTestResult({ success: false, message: json.error ?? "연결 테스트 실패" })
        return
      }
      setTestResult(json.data)
    } catch {
      setTestResult({ success: false, message: "서버 연결 오류" })
    } finally {
      setTestLoading(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = form.handleSubmit(async (data) => {
    const portNum = data.port ? parseInt(data.port, 10) : null

    const payload: Record<string, unknown> = {
      name: data.name,
      type: data.type,
      color: data.color ?? "#3b82f6",
      host: data.host || null,
      port: portNum && !isNaN(portNum) ? portNum : null,
      username: data.username || null,
      database: data.database || null,
      filePath: data.filePath || null,
      sid: data.oracleMode === "sid" ? (data.sid || null) : null,
      serviceName: data.oracleMode === "serviceName" ? (data.serviceName || null) : null,
    }

    // In edit mode, only include password if non-empty
    if (!isEdit || data.password) {
      payload.password = data.password || null
    }

    const url = isEdit ? `/api/connections/${connection!.id}` : "/api/connections"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? "연결 저장에 실패했습니다")
      return
    }
    toast.success("연결이 저장되었습니다")
    onSuccess()
    onClose()
  })

  // ── Dynamic fields ─────────────────────────────────────────────────────────

  function renderConnectionFields() {
    if (watchedType === "sqlite") {
      return (
        <div className="space-y-1" onChange={clearTestResult}>
          <Label htmlFor="filePath">파일 경로</Label>
          <Input
            id="filePath"
            {...form.register("filePath")}
            placeholder="/path/to/database.db"
            onChange={() => clearTestResult()}
          />
        </div>
      )
    }

    if (watchedType === "oracle") {
      const oracleMode = form.watch("oracleMode")
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="host">호스트</Label>
              <Input
                id="host"
                {...form.register("host")}
                placeholder="localhost"
                onChange={() => clearTestResult()}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="port">포트</Label>
              <Input
                id="port"
                type="number"
                {...form.register("port")}
                placeholder="1521"
                onChange={() => clearTestResult()}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>식별 방식</Label>
            <Select
              value={oracleMode}
              onValueChange={(v) => {
                form.setValue("oracleMode", v as "sid" | "serviceName")
                clearTestResult()
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sid">SID</SelectItem>
                <SelectItem value="serviceName">서비스명</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {oracleMode === "sid" ? (
            <div className="space-y-1">
              <Label htmlFor="sid">SID</Label>
              <Input
                id="sid"
                {...form.register("sid")}
                placeholder="ORCL"
                onChange={() => clearTestResult()}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="serviceName">서비스명</Label>
              <Input
                id="serviceName"
                {...form.register("serviceName")}
                placeholder="orcl.example.com"
                onChange={() => clearTestResult()}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                {...form.register("username")}
                placeholder="system"
                onChange={() => clearTestResult()}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder={isEdit ? "변경하려면 입력" : ""}
                onChange={() => clearTestResult()}
              />
            </div>
          </div>
        </div>
      )
    }

    // mysql / mariadb / postgresql / sqlserver
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="host">호스트</Label>
            <Input
              id="host"
              {...form.register("host")}
              placeholder="localhost"
              onChange={() => clearTestResult()}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="port">포트</Label>
            <Input
              id="port"
              type="number"
              {...form.register("port")}
              onChange={() => clearTestResult()}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="database">데이터베이스명</Label>
          <Input
            id="database"
            {...form.register("database")}
            placeholder="mydb"
            onChange={() => clearTestResult()}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="username">사용자명</Label>
            <Input
              id="username"
              {...form.register("username")}
              placeholder="root"
              onChange={() => clearTestResult()}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              placeholder={isEdit ? "변경하려면 입력" : ""}
              onChange={() => clearTestResult()}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const canSubmit = !!watchedName && !!watchedType

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "연결 수정" : "연결 추가"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Section 1 — 기본 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-700 border-b pb-1">기본 정보</h3>

            <div className="space-y-1">
              <Label htmlFor="name">연결 이름</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="내 MySQL 서버"
                onChange={() => clearTestResult()}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>DB 타입</Label>
              <Select value={watchedType} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DB_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>색상</Label>
              <ColorPicker
                value={form.watch("color") ?? "#3b82f6"}
                onChange={(c) => form.setValue("color", c)}
              />
            </div>
          </div>

          {/* Section 2 — 접속 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-700 border-b pb-1">접속 정보</h3>
            {renderConnectionFields()}
          </div>

          {/* Section 3 — 연결 테스트 (edit mode only) */}
          {isEdit && connection?.id && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-700 border-b pb-1">연결 테스트</h3>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testLoading}
                className="w-full"
              >
                {testLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                연결 테스트
              </Button>
              {testResult && (
                <div
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                    testResult.success
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {testResult.success
                      ? `연결 성공${testResult.responseTime !== undefined ? ` (${testResult.responseTime}ms)` : ""}`
                      : testResult.message}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={!canSubmit || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
