"use client"

// ── Preset colors (D-13, CONN-08) ─────────────────────────────────────────────

const PRESET_COLORS: { hex: string; label: string }[] = [
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#10b981", label: "Green" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#8b5cf6", label: "Purple" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#6b7280", label: "Gray" },
  { hex: "#84cc16", label: "Lime" },
]

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  value: string
  onChange: (color: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map(({ hex, label }) => {
        const isSelected = value === hex
        return (
          <button
            key={hex}
            type="button"
            aria-label={label}
            onClick={() => onChange(hex)}
            className="w-4 h-4 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{
              backgroundColor: hex,
              boxShadow: isSelected
                ? `0 0 0 2px white, 0 0 0 4px ${hex}`
                : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
