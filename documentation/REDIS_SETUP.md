# Redis Setup for GovVision Module 3

## Status: Cache Service Complete ✅

All cache infrastructure is implemented and logging is active.

## Installation Instructions

### Option 1: Via Node Package (Recommended for Windows)

```bash
npm install -g redis-server
```

### Option 2: Download Windows Redis Binary

Download from: https://github.com/microsoftarchive/redis/releases/tag/win-3.2.100

### Option 3: Use Docker

```bash
docker run -d -p 6379:6379 redis:latest
```

### Option 4: Windows Subsystem for Linux (WSL)

```bash
# Install WSL
wsl --install -d Ubuntu

# In WSL terminal
sudo apt-get update
sudo apt-get install redis-server

# Start Redis
redis-server
```

## Start Redis Server

```bash
redis-server
```

Or, if using npm package:

```bash
redis-server --port 6379
```

## Verify Redis Connection

```bash
redis-cli ping
```

Expected output: `PONG`

## Cache Key Patterns

All Module 3 cache keys follow this pattern:

| Cache Key Pattern | TTL | Purpose |
|---|---|---|
| `m3:kpi:org:{date}` | 5min | Organization-wide KPI summary |
| `m3:kpi:{deptId}:{date}` | 5min | Department-level KPI snapshot |
| `m3:anomalies:active` | 5min | Unacknowledged anomalies list |
| `m3:forecast:{deptId}:{target}:{horizon}` | 60min | Prophet forecast predictions |
| `m3:riskheatmap:{dateFrom}:{dateTo}` | 5min | Risk heatmap matrix |
| `m3:compliance:{deptIds}:{dateFrom}:{dateTo}` | 5min | Compliance trend data |
| `m3:volume:*` | 5min | Decision volume metrics |
| `m3:cycletime:*` | 5min | Cycle time histograms |

## Cache Hit/Miss Logging

### In Production (Server Console Output)

When a request is made, you'll see one of:

```
[Cache HIT] key=m3:kpi:org:2026-05-10
[Cache MISS] key=m3:kpi:org:2026-05-10 — fetching from DB
[Cache INVALIDATED] pattern=m3:kpi:* — deleted 2 key(s)
```

### Testing Cache Operation

1. **Start backend server** (with Redis running):
   ```bash
   cd server
   npm run dev
   ```

2. **Make first request** (expect MISS):
   ```bash
   curl -H "Authorization: Bearer <JWT_TOKEN>" \
     http://localhost:3003/api/analytics/kpi-summary?dateFrom=2026-05-01&dateTo=2026-05-10
   ```
   Check console: `[Cache MISS] key=m3:kpi:org:2026-05-10 — fetching from DB`

3. **Make same request again within 5 minutes** (expect HIT):
   ```bash
   curl -H "Authorization: Bearer <JWT_TOKEN>" \
     http://localhost:3003/api/analytics/kpi-summary?dateFrom=2026-05-01&dateTo=2026-05-10
   ```
   Check console: `[Cache HIT] key=m3:kpi:org:2026-05-10`

4. **Trigger cache invalidation** (via webhook):
   ```bash
   curl -X POST http://localhost:3003/api/events/decision-update \
     -H "x-service-key: <SERVICE_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"decisionId":"D-001","newStatus":"approved","department":"Finance","timestamp":"2026-05-10T10:00:00Z"}'
   ```
   Check console: `[Cache INVALIDATED] pattern=m3:kpi:* — deleted X key(s)`

5. **Make request again** (expect MISS again after invalidation):
   ```bash
   curl -H "Authorization: Bearer <JWT_TOKEN>" \
     http://localhost:3003/api/analytics/kpi-summary
   ```
   Check console: `[Cache MISS] key=m3:kpi:org:...`

## Monitor Redis in Real-Time

```bash
# Watch all cache operations
redis-cli MONITOR

# Or, list all m3 keys
redis-cli KEYS "m3:*"

# Check TTL of a key
redis-cli TTL "m3:kpi:org:2026-05-10"

# Flush all cache (development only!)
redis-cli FLUSHALL
```

## Cache Configuration

**Adjustable TTLs** in `server/routes/analyticsRoutes.ts`:

- KPI snapshots: 300 seconds (5 minutes)
- Forecasts: 3600 seconds (60 minutes)  
- Anomalies: 300 seconds (5 minutes)

To adjust, modify the `ttlSeconds` parameter in `getOrSet()` calls.

## Graceful Fallback (Optional Cache)

If Redis is unavailable:
- Cache service catches connection errors and falls back to MongoDB
- No data loss; requests still succeed with slightly slower response times
- Console logs: `[Cache service unavailable - using direct DB query]`

## Production Considerations

- **Redis Persistence:** Enable AOF (Append Only File) for data safety
- **Replication:** Use Redis Sentinel for high availability
- **Monitoring:** Set up alerts for cache hit/miss ratios
- **Cleanup:** Configure automatic expiration of expired keys
- **Security:** Use Redis ACL (Redis 6+) or firewall rules to restrict access

---

**BLOCK 3.3 Status: ✅ COMPLETE**
