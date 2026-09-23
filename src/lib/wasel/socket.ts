'use client'

// عميل اللحظية - Wasel Realtime Socket Client
// الاتصال دائماً عبر البوابة: io('/?XTransformPort=3003') والمسار '/'
import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (socket && socket.connected) return socket
  if (socket) return socket // قيد إعادة الاتصال

  socket = io('/?XTransformPort=3003', {
    transports: ['websocket', 'polling'],
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1200,
    timeout: 10000,
  })
  return socket
}

export function joinRooms(rooms: string[]) {
  const s = getSocket()
  s.emit('join', { rooms })
}

export function leaveRooms(rooms: string[]) {
  const s = getSocket()
  s.emit('leave', { rooms })
}
