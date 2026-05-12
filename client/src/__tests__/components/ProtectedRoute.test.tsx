import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter as Router } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import * as auth from '../../utils/auth'

// Mock auth utilities
vi.mock('../../utils/auth', () => ({
  getToken: vi.fn(),
  decodeToken: vi.fn(),
  clearToken: vi.fn()
}))

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to /login when no token is present', () => {
    const mockGetToken = vi.mocked(auth.getToken)
    mockGetToken.mockReturnValue(null)

    const TestComponent = () => <div>Protected Content</div>

    render(
      <Router>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </Router>
    )

    // Component should not render when no token
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render children when valid token exists', () => {
    const mockGetToken = vi.mocked(auth.getToken)
    const mockDecodeToken = vi.mocked(auth.decodeToken)

    mockGetToken.mockReturnValue('valid-token')
    mockDecodeToken.mockReturnValue({
      userId: 'user-123',
      role: 'manager',
      department: 'OP001',
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    })

    const TestComponent = () => <div>Protected Content</div>

    render(
      <Router>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </Router>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to /unauthorized for manager accessing admin route', () => {
    const mockGetToken = vi.mocked(auth.getToken)
    const mockDecodeToken = vi.mocked(auth.decodeToken)

    mockGetToken.mockReturnValue('valid-token')
    mockDecodeToken.mockReturnValue({
      userId: 'user-123',
      role: 'manager',
      department: 'OP001',
      exp: Math.floor(Date.now() / 1000) + 3600
    })

    const TestComponent = () => <div>Admin Content</div>

    render(
      <Router>
        <ProtectedRoute requiredRole="admin">
          <TestComponent />
        </ProtectedRoute>
      </Router>
    )

    // Should not render when role doesn't match
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should render when role matches requiredRole', () => {
    const mockGetToken = vi.mocked(auth.getToken)
    const mockDecodeToken = vi.mocked(auth.decodeToken)

    mockGetToken.mockReturnValue('valid-token')
    mockDecodeToken.mockReturnValue({
      userId: 'user-123',
      role: 'admin',
      department: 'OP001',
      exp: Math.floor(Date.now() / 1000) + 3600
    })

    const TestComponent = () => <div>Admin Content</div>

    render(
      <Router>
        <ProtectedRoute requiredRole="admin">
          <TestComponent />
        </ProtectedRoute>
      </Router>
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('should redirect when token is expired', () => {
    const mockGetToken = vi.mocked(auth.getToken)
    const mockDecodeToken = vi.mocked(auth.decodeToken)

    mockGetToken.mockReturnValue('expired-token')
    mockDecodeToken.mockReturnValue({
      userId: 'user-123',
      role: 'manager',
      department: 'OP001',
      exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    })

    const TestComponent = () => <div>Protected Content</div>

    render(
      <Router>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </Router>
    )

    // Should not render when token is expired
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
