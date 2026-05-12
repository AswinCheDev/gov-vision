import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KPIConfig from '../../pages/KPIConfig'
import * as api from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  getKPIConfig: vi.fn(),
  saveKPIConfig: vi.fn(),
  resetKPIConfig: vi.fn()
}))

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

describe('KPIConfig Page', () => {
  const mockKPIData = [
    {
      kpiName: 'Total Decisions',
      targetValue: 500,
      warningThresholdPct: 80,
      criticalThresholdPct: 60
    },
    {
      kpiName: 'Approval Rate',
      targetValue: 85,
      warningThresholdPct: 80,
      criticalThresholdPct: 70
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    const mockGetKPIConfig = vi.mocked(api.getKPIConfig)
    mockGetKPIConfig.mockResolvedValue(mockKPIData)
  })

  it('should render page title', async () => {
    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByText(/KPI Configuration|KPI Config/i)).toBeInTheDocument()
    })
  })

  it('should render KPI table with data', async () => {
    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Decisions')).toBeInTheDocument()
      expect(screen.getByText('Approval Rate')).toBeInTheDocument()
    })
  })

  it('should render table with columns for KPI name, target, warning threshold, critical threshold', async () => {
    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByText(/KPI Name|Name/i)).toBeInTheDocument()
      expect(screen.getByText(/Target|Target Value/i)).toBeInTheDocument()
      expect(screen.getByText(/Warning|Warning Threshold/i)).toBeInTheDocument()
      expect(screen.getByText(/Critical|Critical Threshold/i)).toBeInTheDocument()
    })
  })

  it('should render Save button', async () => {
    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })
  })

  it('should render Reset button', async () => {
    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })
  })

  it('should call saveKPIConfig API when Save button is clicked', async () => {
    const mockSaveKPIConfig = vi.mocked(api.saveKPIConfig)
    mockSaveKPIConfig.mockResolvedValue({ success: true })

    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(mockSaveKPIConfig).toHaveBeenCalled()
    })
  })

  it('should call resetKPIConfig API when Reset button is clicked', async () => {
    const mockResetKPIConfig = vi.mocked(api.resetKPIConfig)
    mockResetKPIConfig.mockResolvedValue({ success: true })

    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    const resetButton = screen.getByRole('button', { name: /reset/i })
    await userEvent.click(resetButton)

    await waitFor(() => {
      expect(mockResetKPIConfig).toHaveBeenCalled()
    })
  })

  it('should allow editing KPI values', async () => {
    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Decisions')).toBeInTheDocument()
    })

    // Find input fields (assuming table cells are editable)
    const inputs = screen.getAllByRole('textbox')
    
    if (inputs.length > 0) {
      await userEvent.clear(inputs[0])
      await userEvent.type(inputs[0], '600')
      
      expect(inputs[0]).toHaveValue('600')
    }
  })

  it('should show success message after saving', async () => {
    const mockSaveKPIConfig = vi.mocked(api.saveKPIConfig)
    mockSaveKPIConfig.mockResolvedValue({ success: true })

    render(<KPIConfig />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/saved|success/i)).toBeInTheDocument()
    })
  })
})
