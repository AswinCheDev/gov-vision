import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../../pages/LoginPage'
import * as api from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  login: vi.fn()
}))

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render email and password inputs', () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/password/i)
    
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<LoginPage />)
    
    const submitButton = screen.getByRole('button', { name: /login|sign in/i })
    
    expect(submitButton).toBeInTheDocument()
  })

  it('should call login API on form submit with valid credentials', async () => {
    const mockLogin = vi.mocked(api.login)
    mockLogin.mockResolvedValue({ accessToken: 'mock-token' })

    render(<LoginPage />)
    
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login|sign in/i })

    await userEvent.type(emailInput, 'admin@gov.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'admin@gov.com',
        password: 'password123'
      })
    })
  })

  it('should show error message on 401 response', async () => {
    const mockLogin = vi.mocked(api.login)
    mockLogin.mockRejectedValue(new Error('Unauthorized'))

    render(<LoginPage />)
    
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login|sign in/i })

    await userEvent.type(emailInput, 'admin@gov.com')
    await userEvent.type(passwordInput, 'wrongpassword')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials|error|unauthorized/i)).toBeInTheDocument()
    })
  })

  it('should disable submit button while loading', async () => {
    const mockLogin = vi.mocked(api.login)
    mockLogin.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<LoginPage />)
    
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login|sign in/i })

    await userEvent.type(emailInput, 'admin@gov.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })
})
