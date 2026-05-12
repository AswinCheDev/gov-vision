import request from 'supertest'
import express from 'express'
import kpiConfigRoutes from '../../routes/kpiConfigRoutes'
import KPIConfig from '../../models/KPIConfig'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret-key'

const app = express()
app.use(express.json())
app.use('/api/admin', kpiConfigRoutes)

// Mock KPIConfig model
jest.mock('../../models/KPIConfig')

// Helper to create JWT
const createToken = (role: string) => 
  jwt.sign({ userId: 'user-123', role, department: 'OP001' }, process.env.JWT_SECRET!)

describe('KPI Config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/kpi-config', () => {
    it('should return 200 with KPI config array for admin', async () => {
      const mockConfig = [
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

      ;(KPIConfig.find as jest.Mock).mockResolvedValue(mockConfig)

      const response = await request(app)
        .get('/api/admin/kpi-config')
        .set('Authorization', `Bearer ${createToken('admin')}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
    })

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/kpi-config')
        .set('Authorization', `Bearer ${createToken('manager')}`)

      expect(response.status).toBe(403)
    })

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/admin/kpi-config')

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/admin/kpi-config', () => {
    it('should update KPI config with admin role', async () => {
      const updatedConfig = {
        kpiName: 'Total Decisions',
        targetValue: 600,
        warningThresholdPct: 75,
        criticalThresholdPct: 55
      }

      ;(KPIConfig.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedConfig)

      const response = await request(app)
        .put('/api/admin/kpi-config')
        .set('Authorization', `Bearer ${createToken('admin')}`)
        .send([updatedConfig])

      expect(response.status).toBe(200)
    })

    it('should return 403 for non-admin attempting update', async () => {
      const response = await request(app)
        .put('/api/admin/kpi-config')
        .set('Authorization', `Bearer ${createToken('analyst')}`)
        .send([{ kpiName: 'Total Decisions', targetValue: 600 }])

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/admin/kpi-config/reset', () => {
    it('should reset all KPI configs to defaults', async () => {
      ;(KPIConfig.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 10 })

      const response = await request(app)
        .post('/api/admin/kpi-config/reset')
        .set('Authorization', `Bearer ${createToken('admin')}`)

      expect(response.status).toBe(200)
    })

    it('should return 403 for non-admin', async () => {
      const response = await request(app)
        .post('/api/admin/kpi-config/reset')
        .set('Authorization', `Bearer ${createToken('manager')}`)

      expect(response.status).toBe(403)
    })
  })
})
