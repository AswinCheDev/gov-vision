import { useState, useEffect, useRef } from "react"

export type DropdownOption = {
  label: string
  value: string
}

export default function AccentDropdown({
  value,
  options,
  onChange,
  width = "170px"
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", onMouseDown)
    return () => window.removeEventListener("mousedown", onMouseDown)
  }, [])

  const selected = options.find(option => option.value === value) ?? options[0]

  return (
    <div ref={rootRef} style={{ position: "relative", width }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "8px",
          border: open ? "1px solid var(--accent-600)" : "1px solid #E2E6ED",
          background: "white",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--accent-700)",
          fontFamily: "'Outfit', sans-serif",
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: open ? "0 0 0 3px var(--accent-ring)" : "none"
        }}
      >
        <span>{selected?.label}</span>
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "#6B7280", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid var(--accent-300)",
            borderRadius: "10px",
            boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
            padding: "5px",
            zIndex: 60
          }}
        >
          {options.map(option => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: "100%",
                  border: "none",
                  background: isSelected ? "#E5E7EB" : "transparent",
                  color: isSelected ? "#111827" : "#334155",
                  borderRadius: "7px",
                  textAlign: "left",
                  padding: "10px 14px",
                  fontSize: "14px",
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: "pointer",
                  transition: "background 0.15s ease,color 0.15s ease"
                }}
                onMouseEnter={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "#F3F4F6"
                  event.currentTarget.style.color = "#1F2937"
                }}
                onMouseLeave={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "transparent"
                  event.currentTarget.style.color = "#334155"
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
