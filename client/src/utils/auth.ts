export interface DecodedToken {
  userId: string
  role: string
  department: string
  exp?: number
  iat?: number
}

const TOKEN_KEYS = ["token", "govvision_token", "jwt"]

export function saveToken(token: string): void {
  localStorage.setItem("token", token)
}

export function getToken(): string | null {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key)
    if (value) return value
  }

  return null
}

export function clearToken(): void {
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key)
  }
}

export function decodeToken(): DecodedToken | null {
  const token = getToken()
  if (!token) return null

  const parts = token.split(".")
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    const payload = JSON.parse(atob(padded)) as DecodedToken
    return payload
  } catch {
    return null
  }
}