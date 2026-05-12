import request from 'supertest'
import express from 'express'
import analyticsRoutes from '../../routes/analyticsRoutes'
import KPI_Snapshot from '../../models/KPI_Snapshot'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret-key'

const app = express()
app.use(express.json())
app.use('/api/analytics', analyticsRoutes)

// Mock KPI_Snapshot model
jest.mock('../../models/KPI_Snapshot')

// Helper to create JWT
const createToken = (role: string = 'manager') =>
  jwt.sign({ userId: 'user-123', role, department: 'OP001' }, process.env.JWT_SECRET!)

describe('Analytics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/analytics/kpi-summary', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/analytics/kpi-summary')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 200 with KPI summary for valid manager JWT', async () => {
      const mockKPI = {
        totalDecisions: 450,
        approvalRate: 82.5,
        rejectionRate: 12.3,
        complianceRate: 94.1,
        riskLevel: 'Medium',
        anomalyCount: 3
      }

      ;(KPI_Snapshot.findOne as jest.Mock).mockResolvedValue(mockKPI)

      const response = await request(app)
        .get('/api/analytics/kpi-summary')
        .set('Authorization', `Bearer ${createToken('manager')}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('totalDecisions')
    })

    it('should return 200 for analyst role', async () => {
      ;(KPI_Snapshot.findOne as jest.Mock).mockResolvedValue({})

      const response = await request(app)
        .get('/api/analytics/kpi-summary')
        .set('Authorization', `Bearer ${createToken('analyst')}`)

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/analytics/kpi-summary/:deptId', () => {
    it('should return 200 with department KPI for valid token', async () => {
      const mockKPI = {
        department: 'Finance',
        totalDecisions: 120,
        approvalRate: 85,
        complianceRate: 96
      }

      ;(KPI_Snapshot.findOne as jest.Mock).mockResolvedValue(mockKPI)

      const response = await request(app)
        .get('/api/analytics/kpi-summary/FI001')
        .set('Authorization', `Bearer ${createToken('manager')}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('department')
    })

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/analytics/kpi-summary/FI001')

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/analytics/decision-volume', () => {
    it('should return 200 with decision volume data', async () => {
      const mockData = [
        { date: '2026-05-01', volume: 45 },
        { date: '2026-05-02', volume: 52 }
      ]

      ;(KPI_Snapshot.find as jest.Mock).mockResolvedValue(mockData)

      const response = await request(app)
        .get('/api/analytics/decision-volume?granularity=daily')
        .set('Authorization', `Bearer ${createToken('analyst')}`)

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/analytics/compliance-trend', () => {
    it('should return 200 with compliance trend data', async () => {
      const mockData = [
        { department: 'Finance', data: [{ date: '2026-05-01', complianceRate: 94 }] },
        { department: 'HR', data: [{ date: '2026-05-01', complianceRate: 92 }] }
      ]

      ;(KPI_Snapshot.aggregate as jest.Mock).mockResolvedValue(mockData)

      const response = await request(app)
        .get('/api/analytics/compliance-trend?deptIds=FI001,HR001')
        .set('Authorization', `Bearer ${createToken('manager')}`)

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/analytics/risk-heatmap', () => {
    it('should return 200 with risk heatmap data', async () => {
      const mockData = [
        {
          department: 'Finance',
          Low: 10,
          Medium: 5,
          High: 2,
          Critical: 0
        }
      ]

      ;(KPI_Snapshot.aggregate as jest.Mock).mockResolvedValue(mockData)

      const response = await request(app)
        .get('/api/analytics/risk-heatmap')
        .set('Authorization', `Bearer ${createToken('manager')}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('GET /api/analytics/forecast', () => {
    it('should return 200 with forecast data', async () => {
      const mockForecast = {
        department: 'Finance',
        target: 'volume',
        horizon: 7,
        forecastData: [
          { ds: '2026-05-11', yhat: 450, yhat_lower: 420, yhat_upper: 480 }
        ]
      }

      ;(KPI_Snapshot.findOne as jest.Mock).mockResolvedValue(mockForecast)

      const response = await request(app)
        .get('/api/analytics/forecast?deptId=FI001&horizon=7&target=volume')
        .set('Authorization', `Bearer ${createToken('analyst')}`)

      expect(response.status).toBe(200)
    })

    it('should return 400 for invalid horizon', async () => {
      const response = await request(app)
        .get('/api/analytics/forecast?deptId=FI001&horizon=99&target=volume')
        .set('Authorization', `Bearer ${createToken('analyst')}`)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })
})
