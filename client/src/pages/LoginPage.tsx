import { useState, type CSSProperties, type FormEvent } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { saveToken } from "../utils/auth"

const apiHost = window.location.hostname || "localhost"
const apiProtocol = window.location.protocol
const apiPort = import.meta.env.VITE_API_PORT || "5002"
const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || `${apiProtocol}//${apiHost}:${apiPort}`

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #D7DCE5",
  background: "#FFFFFF",
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  outline: "none"
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/login`, { email, password })
      const payload = response.data

      saveToken(payload.accessToken)
      navigate("/dashboard", { replace: true })
    } catch (submitError) {
      setError(axios.isAxiosError(submitError)
        ? (submitError.response?.data?.error || "Invalid email or password")
        : submitError instanceof Error
          ? submitError.message
          : "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F5F6FA", padding: "24px", fontFamily: "var(--font-sans)" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "420px", background: "white", borderRadius: "20px", padding: "32px", boxShadow: "0 20px 50px rgba(17,24,39,0.08)" }}>
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "28px", fontWeight: 700, marginBottom: "8px", color: "#1A1F2E" }}>Welcome back</h1>
        <p style={{ marginBottom: "24px", color: "#667085", fontSize: "14px" }}>Sign in to GovVision</p>

        <div style={{ display: "grid", gap: "14px" }}>
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />

          {error && <div style={{ color: "#B42318", fontSize: "13px", background: "#FEF3F2", border: "1px solid #FECACA", borderRadius: "10px", padding: "10px 12px" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid var(--accent-edge)",
              background: "var(--accent-grad)",
              color: "white",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  )
}