'use client'

import { useEffect, useRef, useCallback } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { getStoredToken, getStoredInitData } from '@/lib/auth'

type EventHandler = (...args: unknown[]) => void

export function useSocket() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    try {
      getSocket()
    } catch {
      const token = getStoredToken()
      const initData = getStoredInitData()
      connectSocket(token || undefined, initData || undefined)
    }

    return () => {
      disconnectSocket()
      initialized.current = false
    }
  }, [])

  const on = useCallback((event: string, handler: EventHandler) => {
    try {
      const sock = getSocket()
      sock.on(event, handler)
      return () => { sock.off(event, handler) }
    } catch {
      return () => {}
    }
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    try {
      getSocket().emit(event, data)
    } catch {
      // socket not connected
    }
  }, [])

  return { on, emit }
}
