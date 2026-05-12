import request from 'supertest'
import express from 'express'
import authRoutes from '../../routes/authRoutes'
import User from '../../models/User'
import jwt from 'jsonwebtoken'

// Set test JWT secret
process.env.JWT_SECRET = 'test-secret-key'

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

// Mock User model
jest.mock('../../models/User')

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should return 200 with accessToken for valid credentials', async () => {
      const testUser = {
        _id: 'user-123',
        email: 'admin@gov.com',
        passwordHash: '$2b$12$hashedpassword',
        role: 'admin',
        department: 'OP001'
      }

      ;(User.findOne as jest.Mock).mockResolvedValue(testUser)
      
      // Mock bcrypt.compare to return true
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }))

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@gov.com', password: 'password123' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(typeof response.body.accessToken).toBe('string')
    })

    it('should return 401 for wrong password', async () => {
      const testUser = {
        _id: 'user-123',
        email: 'admin@gov.com',
        passwordHash: '$2b$12$hashedpassword',
        role: 'admin'
      }

      ;(User.findOne as jest.Mock).mockResolvedValue(testUser)
      
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(false)
      }))

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@gov.com', password: 'wrongpassword' })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@gov.com' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 404 for non-existent user', async () => {
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@gov.com', password: 'password123' })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/auth/register', () => {
    it('should create user with valid data and admin role', async () => {
      ;(User.prototype.save as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'user-456',
        email: 'newuser@gov.com',
        role: 'manager'
      })

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${jwt.sign({ role: 'admin' }, process.env.JWT_SECRET!)}`)
        .send({
          email: 'newuser@gov.com',
          password: 'securepassword123',
          role: 'manager',
          department: 'HR001'
        })

      // Should succeed (201) or process normally
      expect([201, 200]).toContain(response.status)
    })

    it('should return 403 for non-admin attempting registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${jwt.sign({ role: 'analyst' }, process.env.JWT_SECRET!)}`)
        .send({
          email: 'newuser@gov.com',
          password: 'password123',
          role: 'manager'
        })

      expect(response.status).toBe(403)
    })
  })
})
