---
phase: 3
phase_name: Automation + Notifications
status: draft
created: 2026-03-30
design_system: shadcn/ui new-york (neutral base, CSS variables)
---

# UI-SPEC: Phase 3 — Automation + Notifications

## 1. Design System State

| Field | Value | Source |
|-------|-------|--------|
| Tool | shadcn/ui | components.json |
| Style | new-york | components.json |
| Base color | neutral | components.json |
| CSS variables | yes | components.json |
| Icon library | lucide-react | components.json |
| RSC | true | components.json |
| Tailwind | 4.x (@import "tailwindcss") | globals.css |
| Accent color detected | indigo-600 / indigo-50 / indigo-700 | Sidebar.tsx |

**Registry:** shadcn official only. No third-party registries. Safety gate: not applicable.

---

## 2. Spacing Scale

8-point scale. All spacing values must be multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px (p-1) | Icon internal padding, tight badge gaps |
| sm | 8px (p-2, gap-2) | Within card row spacing, inline label gaps |
| md | 16px (p-4, gap-4) | Card body padding (established in ConnectionCard) |
| lg | 24px (p-6, gap-6) | Modal section padding, form group gaps |
| xl | 32px (gap-8) | Page section separation |
| 2xl | 48px | Page-level vertical rhythm |

**Touch target minimum:** 44px for all interactive controls (toggle switches, time pickers).
Switch component height: use shadcn Switch default (h-6 thumb, h-5 track) — do not reduce.

---

## 3. Typography

**Font:** Geist Sans (CSS var `--font-geist-sans`), fallback Arial/Helvetica. Source: globals.css.

### Sizes (4 sizes, matching established project scale)

| Role | Size | Weight | Line Height | Tailwind Class |
|------|------|--------|-------------|----------------|
| Page heading | 20px | 600 semibold | 1.2 | `text-xl font-semibold` |
| Card/section label | 14px | 600 semibold | 1.4 | `text-sm font-semibold` |
| Body / form labels | 14px | 400 regular | 1.5 | `text-sm` |
| Caption / meta | 12px | 400 regular | 1.4 | `text-xs` |

**Weights used:** regular (400) and semibold (600) only — matches ConnectionCard and Sidebar patterns.

### Specific type contracts

- Schedule time display on card ("다음 실행: 02:30"): `text-xs text-neutral-400`
- Schedule enabled badge ("활성"): `text-xs font-medium` inside `bg-green-100 text-green-700 rounded px-2 py-1`
- Schedule disabled badge ("비활성"): `text-xs font-medium` inside `bg-neutral-100 text-neutral-500 rounded px-2 py-1`
- Settings page section title: `text-sm font-semibold text-neutral-900`
- Settings form helper text: `text-xs text-neutral-400`

---

## 4. Color Contract

60 / 30 / 10 split. All values align with existing neutral + indigo palette.

### 60% — Dominant surface
- Page background: `bg-white` (light) / `bg-[#0a0a0a]` (dark, via CSS variable)
- Card background: shadcn Card default (white with `border border-neutral-200`)

### 30% — Secondary surfaces
- Sidebar: `bg-white border-r border-neutral-200` (established, do not change)
- Settings page content area: `bg-neutral-50` for form card background within page
- Modal content: shadcn Dialog default (white)
- Table rows alternate: no zebra — use `hover:bg-neutral-50` on row hover only

### 10% — Accent (indigo)
Accent is reserved for these specific elements only:

| Element | Class |
|---------|-------|
| Active sidebar nav item background | `bg-indigo-50` |
| Active sidebar nav item text | `text-indigo-700` |
| App logo icon | `text-indigo-600` |
| Primary action buttons (Save, Test connection) | shadcn Button default (maps to indigo via neutral base — do NOT override) |
| Focus ring on inputs | Tailwind default ring-indigo (CSS variable driven) |

### Semantic colors (status indicators)

| State | Background | Text | Usage |
|-------|-----------|------|-------|
| Success | `bg-green-100` | `text-green-700` | "활성" badge (`px-2 py-1 rounded`), notification sent indicator |
| Warning | `bg-amber-100` | `text-amber-700` | "백업 중..." button state (existing pattern) |
| Destructive | `bg-red-50` | `text-red-600` | Delete menu items, error inline messages |
| Neutral off | `bg-neutral-100` | `text-neutral-500` | "비활성" badge (`px-2 py-1 rounded`), disabled states |

**Second semantic color (destructive):** used only for schedule delete confirmation and connection delete — existing AlertDialog pattern applies.

---

## 5. Component Inventory

All components are already installed in `src/components/ui/`. No new shadcn installs required for Phase 3.

| Component | File | Usage in Phase 3 |
|-----------|------|-----------------|
| Card, CardContent | ui/card.tsx | Schedule section on ConnectionCard extension |
| Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter | ui/dialog.tsx | ScheduleModal, NotificationSettings test modal |
| Switch | ui/switch.tsx | Schedule ON/OFF toggle on card; notifications enabled per-connection |
| Select, SelectTrigger, SelectContent, SelectItem | ui/select.tsx | Hour picker (0–23), Minute picker (0, 15, 30, 45) |
| Input | ui/input.tsx | SMTP host, port, user, email, Slack channel fields |
| Label | ui/label.tsx | All form field labels |
| Button | ui/button.tsx | Save, Test Send, Cancel actions |
| Badge (inline span) | — | Status badges use inline span, not the Badge component — matches ConnectionCard pattern |
| Tabs, TabsList, TabsTrigger, TabsContent | ui/tabs.tsx | Settings page: "이메일 (SMTP)" tab + "Slack" tab |
| Sonner (toast) | ui/sonner.tsx | Success/error feedback on save actions |
| AlertDialog | ui/alert-dialog.tsx | Schedule delete confirmation |
| Skeleton | ui/skeleton.tsx | Loading state for schedule data on card |

**New components to create:**

| Component | Path | Description |
|-----------|------|-------------|
| ScheduleModal | src/components/schedule/ScheduleModal.tsx | shadcn Dialog for per-connection schedule config |
| NotificationSettingsForm | src/components/settings/NotificationSettingsForm.tsx | Tabbed SMTP + Slack config form |

---

## 6. New UI Surfaces

### 6.1 Connection Card — Schedule Section (D-01, D-04)

The existing `ConnectionCard` (h-[160px]) must grow to accommodate the schedule row. New height: `h-[200px]`.

**Layout addition at the bottom of CardContent (below backup button row):**

```
[ Switch ]  스케줄  [ 활성 badge ]     다음 실행: 02:30 내일
```

- Switch: shadcn Switch, `size` default. Label text: "스케줄" `text-xs text-neutral-600 ml-2`
- Status badge: inline span (not Badge component), `text-xs font-medium px-2 py-1 rounded` — green if enabled, neutral if disabled
- Next run time: `text-xs text-neutral-400` right-aligned — format: "다음 실행: HH:MM 오늘" or "HH:MM 내일"
- If no schedule configured yet: show "스케줄 미설정" in `text-xs text-neutral-400` with a configure button `text-xs text-indigo-600 underline`
- Click on schedule row (not the switch): opens ScheduleModal
- Switch toggle: immediate API call with optimistic update; on failure revert + sonner error toast

**Viewer role:** Switch is `disabled`, schedule row is read-only (same viewer guard pattern as backup button).

### 6.2 ScheduleModal (D-01, D-02, D-03, D-04, D-05, D-08)

shadcn Dialog, `max-w-md`.

**Primary visual anchor:** DialogTitle — the connection name in the header ("스케줄 설정 — {connection.name}") draws the user's eye before the form fields.

**Header:** "스케줄 설정 — {connection.name}"

**Form sections (top to bottom, gap-4 between sections):**

```
─ 실행 시간 ──────────────────────────────
[ 시  Select 0–23 ] : [ 분  Select 0/15/30/45 ]
helper: "매일 지정 시간에 자동 백업을 실행합니다 (Asia/Seoul)"

─ 백업 저장 경로 (선택) ───────────────────
[ Input placeholder="기본 경로 사용" ]
helper: "비워두면 기본 백업 폴더를 사용합니다"

─ 보관 설정 ──────────────────────────────
보관 일수  [ Input type=number min=1 default=30 ] 일
helper: "지정 일수가 지난 백업을 자동 삭제합니다. 마지막 성공 백업은 항상 보존됩니다."

─ 재시작 복구 ─────────────────────────────
[ Switch ] 서버 재시작 시 놓친 백업 자동 실행
helper: "서버 다운 중 누락된 백업을 재시작 직후 실행합니다"

─ 알림 ───────────────────────────────────
[ Switch ] 이 연결의 백업 결과 알림 받기
helper: "알림 채널은 설정 > 알림에서 구성합니다"  [ 설정으로 이동 link ]
```

**Footer:**
- Left: "스케줄 삭제" Button variant="ghost" `text-red-600 hover:text-red-700` (only shown if schedule exists)
- Right: "취소" Button variant="outline" (secondary dismiss) + "스케줄 저장" Button variant="default"

**Validation:**
- Hour: 0–23 integer required
- Minute: 0, 15, 30, or 45 (Select — no free text)
- Retention days: integer ≥ 1, ≤ 3650

**Delete flow:** clicking "스케줄 삭제" opens shadcn AlertDialog — "스케줄을 삭제하면 자동 백업이 중단됩니다. 계속하시겠습니까?" with "스케줄 삭제" (destructive) and "취소".

### 6.3 Settings Page — /settings (D-10, D-11)

Admin-only page. Added to Sidebar nav:

```tsx
{ href: "/settings", label: "설정", icon: Settings, adminOnly: true }
```

Icon: `Settings` from lucide-react.

**Page layout:** Same page shell as `/users` and `/audit-logs` — `max-w-2xl mx-auto` content area.

**Page heading:** "설정" `text-xl font-semibold text-neutral-900`

**Primary visual anchor:** the active Tabs panel — `TabsContent` Card receives the user's attention first due to its bordered container within the neutral page background.

**Content:** shadcn Tabs with two tabs:

Tab 1: "이메일 (SMTP)"
Tab 2: "Slack"

**Tab 1 — SMTP form:**

```
[ Switch ]  이메일 알림 활성화

SMTP 서버 설정
  SMTP 호스트     [ Input placeholder="smtp.gmail.com" ]
  SMTP 포트       [ Input type=number default=587 ]
  사용자명         [ Input placeholder="user@example.com" ]
  비밀번호         [ Input type=password placeholder="저장된 비밀번호 유지" ]
  발신자 이메일     [ Input placeholder="noreply@example.com" ]
  수신 이메일       [ Input placeholder="admin@example.com" ]

[ 테스트 메일 발송 ] Button variant="outline"   [ 이메일 설정 저장 ] Button variant="default"
```

- 비밀번호 field: placeholder "저장된 비밀번호 유지" — empty = keep existing encrypted value (per Pitfall 4 from RESEARCH.md)
- 테스트 메일 발송: disabled if SMTP not enabled or form has unsaved changes; sends test email to 수신 이메일 address
- On save success: sonner toast "이메일 설정이 저장되었습니다"
- On test success: sonner toast "테스트 메일을 발송했습니다"
- On test failure: sonner error toast with error message

**Tab 2 — Slack form:**

```
[ Switch ]  Slack 알림 활성화

Slack 설정
  Webhook URL    [ Input placeholder="https://hooks.slack.com/services/..." ]
                 helper: "Slack 앱에서 Incoming Webhook URL을 복사하세요"
  채널            [ Input placeholder="#backups" ]

[ 테스트 메시지 발송 ] Button variant="outline"   [ Slack 설정 저장 ] Button variant="default"
```

- Webhook URL: stored encrypted via crypto.ts; field shows empty if already set (not decrypted to client)
- On already-configured: Input placeholder changes to "설정됨 (변경하려면 새 URL 입력)"

---

## 7. Interaction States

### Switch (schedule ON/OFF on card)

| State | Visual |
|-------|--------|
| Off | Switch unchecked, badge "비활성" (neutral), next run time hidden |
| On | Switch checked (indigo), badge "활성" (green), next run time visible |
| Loading (API in flight) | Switch disabled + Skeleton pulse on badge/time area |
| Error (API failed) | Revert switch, sonner error toast "스케줄 변경에 실패했습니다" |

### ScheduleModal save button

| State | Visual |
|-------|--------|
| Idle | "스케줄 저장" enabled |
| Submitting | "스케줄 저장" disabled, Loader2 icon `animate-spin` prepended |
| Success | Modal closes, sonner toast "스케줄이 저장되었습니다", card updates |
| Error | Modal stays open, inline error below submit area `text-sm text-red-600` |

### Settings page save button

| State | Visual |
|-------|--------|
| Idle (SMTP tab) | "이메일 설정 저장" enabled |
| Idle (Slack tab) | "Slack 설정 저장" enabled |
| Submitting | Button disabled, Loader2 icon `animate-spin` |
| Success | sonner toast |
| Error | sonner error toast with message |

### Test send buttons (email + Slack)

| State | Visual |
|-------|--------|
| Idle (email) | "테스트 메일 발송" outline button, enabled |
| Idle (Slack) | "테스트 메시지 발송" outline button, enabled |
| Sending | disabled + Loader2 spin |
| Success | sonner success toast |
| Failure | sonner error toast with server error message |

---

## 8. Copywriting Contract

All UI text in Korean. No emojis in UI text (notifications content is server-side, out of scope here).

### Primary CTAs

| Action | Label |
|--------|-------|
| Save schedule | 스케줄 저장 |
| Delete schedule (footer ghost button) | 스케줄 삭제 |
| Confirm schedule delete (AlertDialog) | 스케줄 삭제 |
| Save SMTP notification settings | 이메일 설정 저장 |
| Save Slack notification settings | Slack 설정 저장 |
| Send test email | 테스트 메일 발송 |
| Send test Slack message | 테스트 메시지 발송 |
| Open schedule modal | (click on schedule row — no button label, cursor-pointer) |

**Secondary dismiss actions** (not primary CTAs):

| Action | Label |
|--------|-------|
| Dismiss modal | 취소 |
| Dismiss AlertDialog | 취소 |

### Empty States

| Surface | Empty State Copy |
|---------|----------------|
| Connection card — no schedule | "스케줄 미설정" + "설정하기" link |
| Settings page — SMTP not configured | Helper text only: "SMTP 서버 정보를 입력하고 저장하세요" |
| Settings page — Slack not configured | Helper text only: "Slack Incoming Webhook URL을 입력하고 저장하세요" |

### Error States

| Error | Copy |
|-------|------|
| Schedule save failure (network) | "스케줄 저장에 실패했습니다. 다시 시도해주세요." |
| Schedule toggle failure | "스케줄 변경에 실패했습니다." |
| Schedule delete failure | "스케줄 삭제에 실패했습니다." |
| Settings save failure | "설정 저장에 실패했습니다. 다시 시도해주세요." |
| Test email failure | "테스트 메일 발송에 실패했습니다: {server error message}" |
| Test Slack failure | "테스트 메시지 발송에 실패했습니다: {server error message}" |
| Hour field invalid | "0–23 사이의 숫자를 입력해주세요." |
| Retention days invalid | "1 이상의 숫자를 입력해주세요." |

### Destructive Action Confirmation

| Action | Dialog Title | Dialog Body | Confirm Label | Cancel Label |
|--------|-------------|-------------|---------------|--------------|
| Delete schedule | "스케줄 삭제" | "스케줄을 삭제하면 자동 백업이 중단됩니다. 계속하시겠습니까?" | "스케줄 삭제" | "취소" |

Confirm button: Button variant="destructive".

---

## 9. Layout Patterns

### Connection Card (updated)

```
┌─[color accent 4px]──────────────────────────┐
│ [Database icon]  Connection name      [⋮]   │
│ [MySQL badge]  host:port                     │
│                                              │
│                          [▶ 백업 실행]       │  ← existing (operator/admin only)
│ ─────────────────────────────────────────── │
│ [Switch] 스케줄 [활성]      다음 실행: 02:30  │  ← NEW row
└──────────────────────────────────────────────┘
height: h-[200px]
```

### ScheduleModal

```
Dialog max-w-md
  DialogHeader: "스케줄 설정 — {name}"
  DialogContent: form, gap-4
    시: [Select] 분: [Select]
    저장 경로: [Input optional]
    보관 일수: [Input number] 일
    [Switch] 서버 재시작 시 놓친 백업 자동 실행
    [Switch] 이 연결의 백업 결과 알림 받기
  DialogFooter:
    left: [스케줄 삭제 ghost red]
    right: [취소 outline] [스케줄 저장 default]
```

### Settings Page (/settings)

```
Sidebar (existing) | Page content max-w-2xl mx-auto p-6
                     h1: 설정
                     Tabs
                       TabsList: [이메일 (SMTP)] [Slack]
                       TabsContent:
                         Card p-6
                           form fields (gap-4)
                           footer: [테스트 메일 발송 / 테스트 메시지 발송 outline] [이메일 설정 저장 / Slack 설정 저장 default]
```

---

## 10. Accessibility Contracts

- All Switch components must have `aria-label` describing what they toggle:
  - Card schedule switch: `aria-label="스케줄 활성화/비활성화"`
  - Modal notification switch: `aria-label="이 연결 알림 활성화"`
  - Settings enable switch: `aria-label="이메일 알림 활성화"` / `aria-label="Slack 알림 활성화"`
- ScheduleModal: DialogTitle must always be present (no visually-hidden title)
- Destructive AlertDialog confirm button: must receive initial focus (shadcn default)
- Time Select components: `aria-label="시 선택"` and `aria-label="분 선택"`
- Loading states: `aria-disabled="true"` on buttons during submission
- Error messages: rendered as `role="alert"` inline below the triggering field or as toast

---

## 11. Responsive Behavior

- Connection cards grid: existing `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — no change
- ScheduleModal: full-width on mobile (shadcn Dialog handles this via `sm:max-w-md`)
- Settings page: `max-w-2xl` — stacks naturally on narrow screens
- Sidebar collapsed state: Settings nav item shows Settings icon only (same collapse behavior as existing items)

---

## 12. Phase-Specific Constraints

- **No new icon library.** Use lucide-react exclusively. Relevant icons for this phase:
  - `Clock` — schedule time indicator
  - `Settings` — sidebar settings nav item
  - `Bell` — notification toggle (optional, only if space allows on card)
  - `Mail` — email tab icon (optional)
  - `CalendarClock` — next run display (optional, prefer text-only for card space)
- **Card height change is the only breaking change** to an existing component. ConnectionCard h-[160px] → h-[200px]. Verify no downstream layout breakage.
- **Admin-only gate for /settings:** middleware already handles RBAC — Settings page component additionally checks `session.user.role === 'admin'` and redirects to `/connections` if not admin (same pattern as `/users` page).
- **SMTP password never sent to client.** Settings GET response must omit `smtpPassword` and `slackToken` values — return `smtpPasswordSet: boolean` and `slackTokenSet: boolean` instead. Form input shows empty placeholder indicating existing value is preserved.

---

## 13. Pre-Population Traceability

| Field | Value | Source |
|-------|-------|--------|
| Design system | shadcn new-york, neutral base | components.json |
| Accent color | indigo | Sidebar.tsx (detected) |
| Card pattern | border-left color, h-[160px], p-4 | ConnectionCard.tsx |
| Modal pattern | shadcn Dialog, DialogFooter left+right split | ConnectionModal.tsx |
| Switch component | already installed | src/components/ui/switch.tsx |
| Tabs component | already installed | src/components/ui/tabs.tsx |
| Toast | sonner | ConnectionModal.tsx import |
| Korean UI language | all copy | CLAUDE.md, CONTEXT.md |
| Schedule ON/OFF toggle on card | D-04 | CONTEXT.md |
| Time picker: hour+minute select | D-02 | CONTEXT.md |
| Default retention 30 days | D-05 | CONTEXT.md |
| Global notification settings + per-connection toggle | D-10 | CONTEXT.md |
| Settings menu admin-only in sidebar | D-11 | CONTEXT.md |
| Notification message fields | D-12 | CONTEXT.md |
| Missed backup per-connection option | D-08 | CONTEXT.md |
| Asia/Seoul timezone hard-coded | Open Question 1 resolution | RESEARCH.md |
| Slack via Incoming Webhook URL | Open Question 2 resolution | RESEARCH.md |
| Next run time computed client-side from hour/minute | Open Question 3 resolution | RESEARCH.md |
