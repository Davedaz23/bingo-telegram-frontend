import { io, Socket } from 'socket.io-client'
import { getStoredToken, getStoredInitData } from './auth'

let socket: Socket | null = null
const joinedRooms: string[] = []

export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not initialized. Call connectSocket() first.')
  }
  return socket
}

export function connectSocket(token?: string, initData?: string): Socket {
  if (socket?.connected) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  const auth: Record<string, string> = {}
  if (token) auth.token = token
  else if (initData) auth.initData = initData

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth,
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
    for (const roomId of joinedRooms) {
      socket?.emit('game:join', { gameId: roomId })
    }
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  return socket
}

export function disconnectSocket(): void {
  joinedRooms.length = 0
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export function ensureSocketConnected(): Socket | null {
  try {
    return getSocket()
  } catch {
    const token = getStoredToken()
    const initData = getStoredInitData()
    if (token || initData) {
      return connectSocket(token || undefined, initData || undefined)
    }
    return null
  }
}

export function refreshSocket(): Socket | null {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  const token = getStoredToken()
  const initData = getStoredInitData()
  if (token || initData) {
    return connectSocket(token || undefined, initData || undefined)
  }
  return null
}

export function joinGameRoom(gameId: string): void {
  const sock = getSocket()
  sock.emit('game:join', { gameId })
  if (!joinedRooms.includes(gameId)) {
    joinedRooms.push(gameId)
  }
}

export function leaveGameRoom(gameId: string): void {
  try {
    getSocket().emit('game:leave', { gameId })
  } catch {}
  const idx = joinedRooms.indexOf(gameId)
  if (idx !== -1) joinedRooms.splice(idx, 1)
}
