"use client"

import dynamic from "next/dynamic"

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] bg-neutral-50 flex items-center justify-center text-sm text-neutral-400">
      에디터 로딩 중...
    </div>
  ),
})

interface QueryEditorProps {
  value: string
  onChange: (sql: string) => void
  onExecute: () => void
}

export function QueryEditor({ value, onChange, onExecute }: QueryEditorProps) {
  return (
    <div className="rounded-md border border-neutral-200 overflow-hidden">
      <Editor
        height="200px"
        defaultLanguage="sql"
        theme="vs"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
        }}
        onMount={(editor, monaco) => {
          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            onExecute,
          )
        }}
      />
    </div>
  )
}
