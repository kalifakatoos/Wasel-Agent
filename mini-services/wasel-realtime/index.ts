/**
 * محرك التتبع والبث اللحظي لواصل نالوت
 * Wasel Nalut Realtime Telemetry & Broadcast Engine
 *
 * - Socket.io على المنفذ 3003 (مسار '/' عبر بوابة Caddy)
 * - HTTP داخلي للـ emit على المنفذ 3013 (استدعاء من Next.js API routes فقط)
 *
 * الغرف (Rooms):
 * - order:{orderId}   -> تحديثات حالة الطلب وموقع الكابتن
 * - store:{storeId}   -> رنين المطبخ بالطلبات الجديدة
 * - driver:{driverId} -> رادار العروض الموجهة للكابتن
 * - admin:fleet       -> خريطة الأسطول الحية لغرفة العمليات
 */
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT_SOCKET = 3003
const PORT_API = 3013

interface DriverTelemetry {
  driverId: string
  lat: number
  lng: number
  heading?: number
  status?: string
  updatedAt: string
}

// ============ خادم HTTP الداخلي (emit/health) ============
const apiServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      service: 'wasel-realtime',
      connectedClients: io.engine.clientsCount,
      trackedDrivers: telemetry.size,
      uptimeSec: Math.floor(process.uptime()),
    }))
    return
  }

  if (req.method === 'POST' && req.url?.startsWith('/emit')) {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const { rooms, event, data } = JSON.parse(body)
        if (!event || typeof event !== 'string') {
          res.writeHead(400).end('missing event')
          return
        }
        if (Array.isArray(rooms) && rooms.length > 0) {
          for (const room of rooms) io.to(room).emit(event, data)
        } else {
          io.emit(event, data)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, event, rooms: rooms ?? 'broadcast' }))
      } catch {
        res.writeHead(400).end('bad json')
      }
    })
    return
  }

  res.writeHead(404).end('not found')
})

// ============ خادم Socket.io (البث اللحظي للواجهات) ============
const socketServer = createServer()

const io = new Server(socketServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const telemetry = new Map<string, DriverTelemetry>()

io.on('connection', (socket) => {
  socket.on('join', (data: { rooms: string[] }) => {
    if (Array.isArray(data?.rooms)) {
      for (const room of data.rooms.slice(0, 20)) {
        if (typeof room === 'string' && room.length < 100) socket.join(room)
      }
    }
  })

  socket.on('leave', (data: { rooms: string[] }) => {
    if (Array.isArray(data?.rooms)) {
      for (const room of data.rooms) socket.leave(room)
    }
  })

  // تيليمتري الكابتن (كل 1.5 ثانية من تطبيق الكابتن)
  socket.on('driver:location_update', (data: DriverTelemetry & { orderId?: string }) => {
    const { driverId, orderId } = data
    if (!driverId || typeof data.lat !== 'number' || typeof data.lng !== 'number') return

    const record: DriverTelemetry = {
      driverId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      status: data.status,
      updatedAt: new Date().toISOString(),
    }
    telemetry.set(driverId, record)

    io.to('admin:fleet').emit('fleet:driver_location', record)

    if (orderId) {
      io.to(`order:${orderId}`).emit('order:driver_location', record)
    }
  })

  socket.on('fleet:snapshot_request', () => {
    socket.emit('fleet:snapshot', Array.from(telemetry.values()))
  })

  socket.on('error', () => {})
})

socketServer.listen(PORT_SOCKET, () => {
  console.log(`⚡ Wasel Realtime Socket.io listening on port ${PORT_SOCKET}`)
})

apiServer.listen(PORT_API, () => {
  console.log(`📡 Wasel Realtime Internal API listening on port ${PORT_API}`)
})

process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))
