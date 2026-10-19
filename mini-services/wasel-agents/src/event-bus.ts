import { io, Socket } from 'socket.io-client'
import http from 'http'

export class WebSocketEventBus {
  private realtimePort: number
  private bridgePort: number
  private socket: Socket | null = null
  private server: http.Server | null = null
  private listeners = new Map<string, Array<(data: any) => void>>()

  constructor(config: { realtimePort: number; bridgePort: number }) {
    this.realtimePort = config.realtimePort
    this.bridgePort = config.bridgePort
  }

  async start() {
    // 1. Connect to Wasel Realtime Socket.io
    const realtimeUrl = `http://localhost:${this.realtimePort}`
    console.log(`🔌 Connecting to Wasel Realtime bus at ${realtimeUrl}...`)

    try {
      this.socket = io(realtimeUrl, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      })

      this.socket.on('connect', () => {
        console.log('✅ Connected to Wasel Realtime bus')
      })

      this.socket.on('order:created', (data) => {
        this.emitLocal('order:created', data)
      })

      this.socket.on('order:delivered', (data) => {
        this.emitLocal('order:delivered', data)
      })

      this.socket.on('store:stock-low', (data) => {
        this.emitLocal('store:stock-low', data)
      })

      this.socket.on('promo:rejected', (data) => {
        this.emitLocal('promo:rejected', data)
      })
    } catch (e) {
      console.warn('⚠️ Realtime connection warning:', e)
    }

    // 2. Start internal HTTP bridge for incoming events from Next.js server
    this.server = http.createServer((req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const event = JSON.parse(body)
          if (event && event.type && event.data) {
            this.emitLocal(event.type, event.data)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid event payload' }))
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Malformed JSON' }))
        }
      })
    })

    await new Promise<void>((resolve) => {
      this.server?.listen(this.bridgePort, () => {
        console.log(`🌉 Agent HTTP event bridge listening on port ${this.bridgePort}`)
        resolve()
      })
    })
  }

  async stop() {
    if (this.socket) {
      this.socket.disconnect()
    }
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve())
      })
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  private emitLocal(event: string, data: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(data)
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err)
        }
      }
    }
  }
}
