import { Navigate, Outlet } from "react-router-dom"
import { decodeToken } from "../utils/auth"

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = decodeToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(token.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}