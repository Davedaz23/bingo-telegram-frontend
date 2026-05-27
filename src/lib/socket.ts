import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not initialized. Call connectSocket() first.')
  }
  return socket
}

export function connectSocket(token?: string, initData?: string): Socket {
  if (socket?.connected) return socket

  const auth: Record<string, string> = {}
  if (token) auth.token = token
  else if (initData) auth.initData = initData

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
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
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export function joinGameRoom(gameId: string): void {
  getSocket().emit('game:join', { gameId })
}

export function leaveGameRoom(gameId: string): void {
  getSocket().emit('game:leave', { gameId })
}
