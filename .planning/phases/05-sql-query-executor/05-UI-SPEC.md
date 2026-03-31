---
status: approved
phase: 05
phase_name: SQL Query Executor
design_system: shadcn/ui new-york — neutral base — cssVariables
created: 2026-03-31
reviewed_at: 2026-03-31
---

# UI-SPEC — Phase 05: SQL Query Executor

## Source Summary

| Source | Decisions Used |
|--------|---------------|
| RESEARCH.md | Component inventory, Monaco config, layout structure, RBAC constraints |
| REQUIREMENTS.md | QURY-01 through QURY-07 — all visual/interaction requirements |
| ROADMAP.md | Phase goal, success criteria |
| Codebase (DashboardClient, HistoryPageClient, Sidebar) | All spacing, typography, color, and component patterns |
| components.json | shadcn new-york style, neutral base color, cssVariables, lucide icons |

No user questions were required. All contract values are pre-populated from upstream artifacts and existing codebase patterns.

---

## 1. Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui |
| Style | new-york |
| Base color | neutral |
| CSS variables | yes |
| Icon library | lucide-react |
| Font | Geist Sans (--font-geist-sans via Next.js), fallback Arial/Helvetica |
| Font mono | Geist Mono (--font-geist-mono) — used for SQL output/filenames |

**Registry:** shadcn official only. No third-party registries. Safety gate: not applicable.

---

## 2. Spacing

8-point scale. No exceptions for this phase.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gap within inline elements |
| sm | 8px | Padding on compact controls (filter bar gap) |
| md | 16px | Internal card padding, gap between toolbar elements |
| lg | 24px | Section gap (toolbar → editor, editor → results) |
| xl | 32px | Vertical rhythm between major page sections |
| 2xl | 48px | Not used in this phase |

**Page container:** `p-6` (24px) — matches DashboardClient and HistoryPageClient.

**Monaco editor height:** 200px fixed (matches RESEARCH.md recommendation). Bottom panel (results/saved): `max-h-96` (384px) with `overflow-auto` — matches history table pattern.

---

## 3. Typography

Exactly 3 sizes, 2 weights. Matches existing app pattern precisely.

| Role | Size | Weight | Line Height | Class |
|------|------|--------|-------------|-------|
| Page heading | 18px (text-lg) | 600 (font-semibold) | 1.5 | `text-lg font-semibold text-neutral-900` |
| Section heading | 16px (text-base) | 600 (font-semibold) | 1.5 | `text-base font-semibold` |
| Body / table cells | 14px (text-sm) | 400 (font-normal) | 1.5 | `text-sm text-neutral-600` |
| Mono (SQL, column values) | 12px (text-xs) | 400 (font-normal) | 1.5 | `font-mono text-xs` |

Source: DashboardClient uses `text-xl font-semibold` for page heading; HistoryPageClient uses `text-lg font-semibold text-neutral-900`. Phase 05 matches the history page pattern (text-lg).

---

## 4. Color

60/30/10 split. Matches existing app — do not introduce new colors.

| Role | Value | Usage |
|------|-------|-------|
| 60% dominant surface | `bg-white` / `--background: #ffffff` | Page background, card fill |
| 30% secondary | `bg-neutral-50`, `border-neutral-200` | Table row hover, filter bar inputs, editor container border |
| 10% accent | indigo-600 / indigo-700 / indigo-50 | Reserved for: active sidebar nav item, selected result row highlight, "쿼리 실행" primary button |

**Semantic colors (status states):**

| State | Background | Text | Usage |
|-------|-----------|------|-------|
| Success / SELECT result | `bg-green-50` | `text-green-600` | DML success toast area (sonner handles) |
| Error / DML blocked | `bg-red-50` | `text-red-600` | viewer DML-blocked inline warning, error toast |
| Warning / DDL | `bg-amber-50` | `text-amber-600` | DDL execution warning banner (non-SELECT for operator/admin) |
| Neutral muted | `text-neutral-400` | — | Empty state text, placeholder text |
| Neutral label | `text-neutral-500` | — | Metadata labels (execution time, row count label) |

Source: DashboardClient StatusBadge and HistoryPageClient StatusBadge — reuse same color tokens.

---

## 5. Layout

### Page Structure

```
/query page (Server Component shell)
└── QueryPageClient (Client Component — full page)
    ├── Header row                   h-auto, mb-6
    │   ├── Page title "SQL 쿼리"    text-lg font-semibold text-neutral-900
    │   └── Connection selector      shadcn Select, w-[200px]
    ├── Toolbar row                  flex gap-2 items-center mb-4
    │   ├── "쿼리 실행" button        Button variant="default" (indigo accent)
    │   ├── "저장" button             Button variant="outline" size="sm"
    │   └── DDL warning banner       amber-50 strip — shown only when non-SELECT detected client-side
    ├── Editor panel                 rounded-md border border-neutral-200 overflow-hidden
    │   └── QueryEditor (Monaco)     height="200px", language="sql", theme="vs"
    └── Bottom panel                 mt-6
        └── Tabs (shadcn Tabs)
            ├── Tab "결과"            ResultTable or DML summary or empty state
            └── Tab "저장된 쿼리"     SavedQueryPanel
```

### Editor + Results Split

- Editor occupies a fixed 200px height block with a `rounded-md border border-neutral-200` wrapper.
- Bottom panel uses shadcn `Tabs` with two tabs: "결과" and "저장된 쿼리".
- No drag-resize handle. Fixed split is consistent with app's non-complex page patterns.

### Page Container

`div className="p-6"` — identical to DashboardClient outer wrapper.

---

## 6. Component Inventory

All components are already installed. No new shadcn additions required.

| Component | Source | Usage in Phase 05 |
|-----------|--------|------------------|
| `shadcn/ui Button` | `@/components/ui/button` | "쿼리 실행" (default), "저장" (outline), "삭제" (ghost/destructive) |
| `shadcn/ui Select` | `@/components/ui/select` | Connection picker at top of page |
| `shadcn/ui Tabs` | `@/components/ui/tabs` | Results panel / Saved Queries panel switch |
| `shadcn/ui Table` | `@/components/ui/table` | SELECT result grid, saved query list |
| `shadcn/ui Dialog` | `@/components/ui/dialog` | Save-query modal (name input + optional connection binding) |
| `shadcn/ui Skeleton` | `@/components/ui/skeleton` | Loading state for result table rows |
| `@monaco-editor/react Editor` | installed v4.7.0 | SQL editor (QueryEditor.tsx wrapper) |
| `sonner` toast | `@/components/ui/sonner` | Query success, save success, error feedback |
| `lucide-react Terminal` | already in Sidebar | Page heading icon (optional) |
| `lucide-react Play` | lucide | "쿼리 실행" button icon |
| `lucide-react Save` | lucide | "저장" button icon |
| `lucide-react Trash2` | lucide | Delete saved query action |
| `lucide-react Clock` | lucide | Execution time display in result meta row |

---

## 7. Interaction Contract

### 7.1 Connection Selector

- Renders as shadcn `Select` with `w-[200px]` trigger.
- Each option shows connection color dot (2.5 × 2.5 w-2.5 h-2.5 rounded-full inline-block mr-2) + connection name — matches existing connection color pattern from DashboardClient.
- Placeholder text: "연결 선택".
- Disabled state: Select is disabled while a query is executing (loading=true).
- No connection selected → "쿼리 실행" button is disabled.

### 7.2 Monaco Editor (QueryEditor)

- `height="200px"`, `defaultLanguage="sql"`, `theme="vs"` (light mode; matches app's white surface).
- Options: `minimap: { enabled: false }`, `fontSize: 14`, `lineNumbers: "on"`, `scrollBeyondLastLine: false`, `wordWrap: "on"`.
- Controlled via `value` + `onChange` props.
- Editor is NOT disabled during execution — user can pre-type next query.
- Border: `rounded-md border border-neutral-200 overflow-hidden` wrapping div.

### 7.3 Toolbar — "쿼리 실행" Button

- `Button` variant="default" with `Play` icon (h-4 w-4 mr-2).
- Label: "쿼리 실행".
- Disabled when: no connection selected OR SQL is empty OR isLoading=true.
- While executing: shows spinner (Loader2 animate-spin h-4 w-4 mr-2) + label "실행 중…".
- Keyboard shortcut: `Cmd+Enter` / `Ctrl+Enter` triggers execution (Monaco `addCommand` binding).

### 7.4 DDL Warning Banner

- Shown between toolbar and editor when client-side SQL detection classifies statement as non-SELECT.
- Visible only for operator/admin roles (viewer never sees DDL since DML/DDL buttons are client-disabled anyway — they get the blocked error state instead).
- Style: `rounded-md bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 flex items-center gap-2 mb-4`.
- Icon: `AlertTriangle` h-4 w-4.
- Copy: "주의: DML/DDL 실행은 데이터에 영구적인 영향을 미칩니다."
- Dismissible: No. It appears/disappears with the SQL content detection.

### 7.5 Result Panel — "결과" Tab

**Empty state (no query run yet):**
```
Icon: Terminal h-8 w-8 text-neutral-300
Heading: "쿼리를 실행하면 결과가 여기에 표시됩니다"  text-sm font-semibold text-neutral-700
Sub: "위에서 연결을 선택하고 SQL을 입력하세요"        text-xs text-neutral-500
```
Centered vertically in `py-12` container.

**Loading state:**
- 5 skeleton rows × number-of-visible-columns skeleton cells — matches HistoryPageClient loading pattern exactly.
- `Skeleton className="h-4 w-full"` per cell.

**SELECT result:**
- Result meta row above table: `flex gap-4 items-center text-sm text-neutral-500 mb-2`
  - `Clock h-4 w-4 mr-1` + "{durationMs}ms"
  - "{rowCount}행" (with " (최대 500행 표시)" suffix when result.capped=true, shown in amber-600)
- Table: shadcn `Table` in `rounded-md border border-neutral-200 overflow-hidden` wrapper.
- `overflow-auto max-h-96` on the outer div.
- Column headers: `TableHead` — one per column from `result.columns[]`.
- Cell values: `TableCell className="text-sm text-neutral-600 font-mono text-xs"` — monospace for raw DB values.
- NULL values: render as `<span className="text-neutral-400 italic">NULL</span>`.
- No row selection interaction on result table.

**DML result:**
- No table. Instead a single centered summary block:
```
Icon: CheckCircle2 h-8 w-8 text-green-600
Heading: "{rowCount}행이 영향을 받았습니다"   text-sm font-semibold text-neutral-700
Sub: "실행 시간: {durationMs}ms"              text-xs text-neutral-500
```

**Error state:**
- Single block with `bg-red-50 rounded-md border border-red-200 p-4`:
  - `AlertCircle h-4 w-4 text-red-600 mr-2 inline`
  - Error message text: `text-sm text-red-700`

**viewer DML-blocked state:**
- Same error block style.
- Copy: "viewer 역할은 SELECT만 실행할 수 있습니다."

### 7.6 Save Query Modal

- Trigger: "저장" button (outline) in toolbar. Disabled when SQL is empty.
- shadcn `Dialog` with title "쿼리 저장".
- Fields:
  - "이름" — `Input` placeholder="쿼리 이름을 입력하세요" (required, maxLength=100)
  - "연결 (선택)" — shadcn `Select` pre-filled with current connection, clearable. Placeholder: "연결 없음 (범용 쿼리)".
- SQL preview: read-only monospace `<pre className="bg-neutral-50 rounded-md border border-neutral-200 p-3 text-xs font-mono overflow-auto max-h-32 text-neutral-700">` showing current editor content.
- Actions: "저장" (Button default, disabled while submitting) + "취소" (Button outline).
- On success: close modal, sonner toast "쿼리가 저장되었습니다.", refresh saved query list.
- On error: inline error below name field: `text-sm text-red-600`.

### 7.7 Saved Query Panel — "저장된 쿼리" Tab

**Empty state (no saved queries):**
```
Icon: Save h-8 w-8 text-neutral-300
Heading: "저장된 쿼리가 없습니다"       text-sm font-semibold text-neutral-700
Sub: "쿼리를 실행 후 저장 버튼으로 추가하세요"  text-xs text-neutral-500
```

**List:**
- shadcn `Table` — columns: 이름 | 연결 | 저장일 | 액션.
- Row click: loads SQL into Monaco editor + sets connection selector if connectionId is set.
- 이름 column: `text-sm font-semibold text-neutral-900 max-w-[180px] truncate`.
- 연결 column: connection color dot + name (same pattern as connection selector). Shows "범용" (text-neutral-400) if connectionId is null.
- 저장일 column: `format(createdAt, "yyyy-MM-dd")` — date-fns, text-sm text-neutral-500.
- 액션 column: `Trash2` icon button — `Button variant="ghost" size="icon"` with `text-neutral-400 hover:text-red-600` transition.

**Delete confirmation:**
- shadcn `AlertDialog` (component already exists: `alert-dialog.tsx`).
- Title: "저장된 쿼리 삭제".
- Body: "이 쿼리를 삭제하면 복구할 수 없습니다. 계속하시겠습니까?"
- Actions: "삭제" (`Button variant="destructive"`) + "취소" (`Button variant="outline"`).
- On success: sonner toast "쿼리가 삭제되었습니다.", remove row from list.

---

## 8. State Inventory

All state lives in `QueryPageClient.tsx` (no additional context providers needed).

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `selectedConnectionId` | string | `""` | Current connection picker value |
| `sql` | string | `""` | Monaco editor content |
| `isLoading` | boolean | false | Query execution in-flight |
| `result` | QueryResult \| null | null | Last execution result |
| `error` | string \| null | null | Last execution error message |
| `savedQueries` | SavedQuery[] | [] | List from GET /api/query/saved |
| `saveModalOpen` | boolean | false | Save query dialog visibility |
| `deleteTargetId` | string \| null | null | ID of query pending deletion confirmation |
| `activeTab` | "results" \| "saved" | "results" | Current bottom panel tab |

---

## 9. Copywriting Contract

### Primary Actions

| Element | Copy |
|---------|------|
| Page heading | SQL 쿼리 |
| Connection selector placeholder | 연결 선택 |
| Execute button (idle) | 쿼리 실행 |
| Execute button (loading) | 실행 중… |
| Save button | 저장 |
| Results tab label | 결과 |
| Saved queries tab label | 저장된 쿼리 |

### Empty States

| Context | Heading | Subtext |
|---------|---------|---------|
| No query run yet | 쿼리를 실행하면 결과가 여기에 표시됩니다 | 위에서 연결을 선택하고 SQL을 입력하세요 |
| No saved queries | 저장된 쿼리가 없습니다 | 쿼리를 실행 후 저장 버튼으로 추가하세요 |

### Error States

| Context | Copy |
|---------|------|
| Query execution error | {error.message from API} — displayed verbatim in red block |
| viewer DML blocked | viewer 역할은 SELECT만 실행할 수 있습니다 |
| No connection selected + execute | 연결을 선택해주세요 (sonner toast, variant=error) |
| Empty SQL + execute | 실행할 SQL을 입력해주세요 (sonner toast, variant=error) |
| Save query name empty | 쿼리 이름을 입력해주세요 (inline under input) |

### DML/DDL Warning Banner

| Context | Copy |
|---------|------|
| Non-SELECT SQL detected (operator/admin) | 주의: DML/DDL 실행은 데이터에 영구적인 영향을 미칩니다 |

### Destructive Actions

| Action | Confirmation Dialog | Confirm Button |
|--------|---------------------|----------------|
| 저장된 쿼리 삭제 | "이 쿼리를 삭제하면 복구할 수 없습니다. 계속하시겠습니까?" | 삭제 (variant="destructive") |

### Success Toasts (sonner)

| Action | Toast |
|--------|-------|
| Query saved | 쿼리가 저장되었습니다 |
| Query deleted | 쿼리가 삭제되었습니다 |

### Capped Results

| Context | Copy |
|---------|------|
| result.capped = true | (최대 500행 표시) — amber-600, inline after row count |

---

## 10. RBAC Visual Contract

Role affects visible UI — enforcement is always server-side; client UI is UX only.

| Element | viewer | operator | admin |
|---------|--------|----------|-------|
| Connection selector | visible | visible | visible |
| Monaco editor | visible, editable | visible, editable | visible, editable |
| "쿼리 실행" button | visible, enabled | visible, enabled | visible, enabled |
| DDL warning banner | hidden (viewers cannot run DDL — no need to warn) | shown when non-SELECT detected | shown when non-SELECT detected |
| DML/DDL blocked error | shown on attempt | never (allowed) | never (allowed) |
| "저장" button | visible, enabled | visible, enabled | visible, enabled |
| Delete saved query | only own queries | only own queries | only own queries |

Note: The viewer restriction is enforced server-side. The client does NOT disable the execute button for viewers — the 403 error from the API is shown in the error state block instead. This matches the existing RBAC display pattern (show error, not pre-blocked UI).

---

## 11. Accessibility

- All interactive elements have visible focus rings (shadcn default focus-visible:ring-2 ring-ring).
- Monaco editor: keyboard accessible — Tab within editor inserts spaces, not trapping focus (Monaco default behavior).
- "쿼리 실행" keyboard shortcut: `Ctrl+Enter` / `Cmd+Enter` via Monaco `editor.addCommand`.
- Delete icon button: `aria-label="저장된 쿼리 삭제"`.
- Status error blocks use `role="alert"` for screen reader announcement on query error.
- Result table: no `aria-live` needed — user triggers execution explicitly.
- All Korean text; no language mixing needed.

---

## 12. Non-Goals for This Phase

- No query history / execution log panel (deferred).
- No autocomplete for table/column names (Monaco SQL basic syntax only — no schema introspection).
- No result export (CSV download) — v2 scope.
- No multi-statement execution (single statement per run — per RESEARCH.md open question resolution).
- No dark mode (app uses light mode only per globals.css — dark mode variables exist but body remains white).
- No virtualized result rows (row cap of 500 makes it unnecessary — per RESEARCH.md).
