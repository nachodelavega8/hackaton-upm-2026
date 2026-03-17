import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const { user } = useAuth()
  const [emergency, setEmergency] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

    const userId = user?.id ?? 'anon'
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/ws?user_id=${userId}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      clearTimeout(reconnectTimer.current)
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'EMERGENCY_BROADCAST') {
          setEmergency(msg)
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws.close()
    }

    // Client-side keepalive ping every 25s
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }))
      }
    }, 25_000)

    // Return cleanup for this particular socket + interval
    ws._pingInterval = ping
  }, [user?.id])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        clearInterval(wsRef.current._pingInterval)
        wsRef.current.onclose = null  // prevent auto-reconnect on intentional close
        wsRef.current.close()
      }
    }
  }, [connect])

  const dismissEmergency = useCallback(() => setEmergency(null), [])

  return (
    <WebSocketContext.Provider value={{ emergency, connected, dismissEmergency }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be inside WebSocketProvider')
  return ctx
}
