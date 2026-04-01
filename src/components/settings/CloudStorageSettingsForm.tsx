"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function CloudStorageSettingsForm() {
  const [endpoint, setEndpoint] = useState("")
  const [region, setRegion] = useState("")
  const [bucket, setBucket] = useState("")
  const [accessKeyId, setAccessKeyId] = useState("")
  const [secretAccessKey, setSecretAccessKey] = useState("")
  const [secretAccessKeySet, setSecretAccessKeySet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch("/api/cloud-storage/settings")
      .then((res) => res.json())
      .then(({ data }) => {
        if (data) {
          setEndpoint(data.endpoint ?? "")
          setRegion(data.region ?? "")
          setBucket(data.bucket ?? "")
          setAccessKeyId(data.accessKeyId ?? "")
          setSecretAccessKeySet(data.secretAccessKey === "__masked__")
        }
      })
      .catch(() => toast.error("설정을 불러오는 데 실패했습니다"))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/cloud-storage/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpoint || null,
          region: region || null,
          bucket: bucket || null,
          accessKeyId: accessKeyId || null,
          secretAccessKey: secretAccessKey || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? "저장 실패")
      }
      toast.success("클라우드 스토리지 설정이 저장되었습니다")
      setSecretAccessKeySet(!!secretAccessKey || secretAccessKeySet)
      setSecretAccessKey("")
    } catch (err) {
      toast.error(`설정 저장에 실패했습니다: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch("/api/cloud-storage/test", { method: "POST" })
      const { data } = await res.json()
      if (data?.success) {
        toast.success(`연결 성공: ${data.message}`)
      } else {
        toast.error(`연결 실패: ${data?.message ?? "알 수 없는 오류"}`)
      }
    } catch {
      toast.error("연결 테스트에 실패했습니다")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-sm font-semibold text-neutral-900">S3 호환 스토리지 설정</div>

        <div className="space-y-2">
          <Label htmlFor="endpoint">엔드포인트 (선택)</Label>
          <Input
            id="endpoint"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://s3.amazonaws.com (비워두면 AWS 기본값)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">리전</Label>
          <Input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="ap-northeast-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket">버킷 이름</Label>
          <Input
            id="bucket"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            placeholder="my-backup-bucket"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accessKeyId">Access Key ID</Label>
          <Input
            id="accessKeyId"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secretAccessKey">Secret Access Key</Label>
          <Input
            id="secretAccessKey"
            type="password"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            placeholder={
              secretAccessKeySet ? "저장됨 (변경하려면 새 키 입력)" : "Secret Access Key 입력"
            }
          />
          <p className="text-xs text-neutral-400">
            AWS IAM 또는 호환 서비스의 자격 증명을 입력하세요
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                테스트 중...
              </>
            ) : (
              "연결 테스트"
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
