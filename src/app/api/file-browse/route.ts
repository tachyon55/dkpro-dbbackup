import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import fs from "fs"
import path from "path"
import os from "os"

type FileEntry = {
  name: string
  path: string
  isDirectory: boolean
  isExecutable: boolean
}

// ── GET /api/file-browse?dir=...&mode=file|directory ────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const requestedDir = searchParams.get("dir") || ""
  const mode = searchParams.get("mode") || "file" // "file" or "directory"

  // Determine starting directory
  let dir: string
  if (!requestedDir) {
    dir = os.platform() === "win32" ? "C:\\" : "/"
  } else {
    dir = path.resolve(requestedDir)
  }

  try {
    const stat = fs.statSync(dir)
    if (!stat.isDirectory()) {
      dir = path.dirname(dir)
    }
  } catch {
    // Fallback to home directory if path doesn't exist
    dir = os.homedir()
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const items: FileEntry[] = []

    for (const entry of entries) {
      // Skip hidden files/directories (starting with .)
      if (entry.name.startsWith(".")) continue

      const fullPath = path.join(dir, entry.name)
      const isDir = entry.isDirectory()

      // In file mode, show directories and executable-looking files
      // In directory mode, show only directories
      if (mode === "directory" && !isDir) continue

      let isExecutable = false
      if (!isDir) {
        try {
          if (os.platform() === "win32") {
            const ext = path.extname(entry.name).toLowerCase()
            isExecutable = [".exe", ".cmd", ".bat", ".com", ".ps1"].includes(ext)
          } else {
            fs.accessSync(fullPath, fs.constants.X_OK)
            isExecutable = true
          }
        } catch {
          // Not executable
        }
      }

      // In file mode, only show directories and executable files
      if (mode === "file" && !isDir && !isExecutable) continue

      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory: isDir,
        isExecutable,
      })
    }

    // Sort: directories first, then files, alphabetical within each group
    items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    const parentDir = path.dirname(dir)
    const hasParent = parentDir !== dir

    return NextResponse.json({
      data: {
        currentDir: dir,
        parentDir: hasParent ? parentDir : null,
        items,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `디렉토리를 읽을 수 없습니다: ${(err as Error).message}` },
      { status: 400 },
    )
  }
}
