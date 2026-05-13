const DEPARTMENT_COLOR_BY_CANONICAL_KEY: Record<string, string> = {
  finance: "#0EA5E9",
  "human resources": "#10B981",
  operations: "#F59E0B",
  "information technology": "#8B5CF6",
  "customer service": "#EF4444"
}

const DEPARTMENT_ALIASES: Record<string, string> = {
  fi001: "finance",
  hr002: "human resources",
  op003: "operations",
  it004: "information technology",
  cs005: "customer service",
  finance: "finance",
  "human resources": "human resources",
  operations: "operations",
  "information technology": "information technology",
  "customer service": "customer service",
  hr: "human resources",
  it: "information technology",
  cs: "customer service",
  op: "operations"
}

export const DEPARTMENT_COLORS = DEPARTMENT_COLOR_BY_CANONICAL_KEY

export function getDepartmentColor(department: string): string {
  const key = String(department ?? "").trim().toLowerCase()
  const canonical = DEPARTMENT_ALIASES[key] ?? key
  return DEPARTMENT_COLOR_BY_CANONICAL_KEY[canonical] ?? "#64748B"
}
