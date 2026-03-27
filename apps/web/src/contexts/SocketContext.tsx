'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  onNotification: (cb: (data: any) => void) => () => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  onNotification: () => () => {},
})

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const s = io('http://localhost:4000/notifications', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    })

    s.on('connect', () => {
      setConnected(true)
      console.log('[WS] Bağlandı')
    })

    s.on('disconnect', () => {
      setConnected(false)
      console.log('[WS] Ayrıldı')
    })

    setSocket(s)

    return () => {
      s.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [])

  const onNotification = useCallback((cb: (data: any) => void) => {
    if (!socket) return () => {}
    socket.on('notification', cb)
    return () => { socket.off('notification', cb) }
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, connected, onNotification }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
