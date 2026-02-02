/**
 * WebSocket Hook for Build Streaming
 * 
 * Connects to the build stream and provides real-time event handling.
 */

import { useEffect, useRef, useState, useCallback } from 'react'

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export type BuildEventType =
    | 'build_started'
    | 'planning_started'
    | 'planning_completed'
    | 'build_phase_started'
    | 'task_started'
    | 'file_written'
    | 'task_completed'
    | 'task_failed'
    | 'build_completed'
    | 'build_failed'
    | 'current_state'
    | 'ping'
    | 'error'

export interface BuildEvent {
    type: BuildEventType
    data: Record<string, unknown>
    timestamp?: string
}

export interface UseWebSocketOptions {
    buildId: string
    onEvent?: (event: BuildEvent) => void
    onConnect?: () => void
    onDisconnect?: () => void
    onError?: (error: Event) => void
    autoReconnect?: boolean
}

export interface UseWebSocketReturn {
    isConnected: boolean
    lastEvent: BuildEvent | null
    events: BuildEvent[]
    connect: () => void
    disconnect: () => void
}

export function useBuildWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
    const {
        buildId,
        onEvent,
        onConnect,
        onDisconnect,
        onError,
        autoReconnect = true,
    } = options

    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const [isConnected, setIsConnected] = useState(false)
    const [lastEvent, setLastEvent] = useState<BuildEvent | null>(null)
    const [events, setEvents] = useState<BuildEvent[]>([])

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        // Get token from localStorage
        const token = localStorage.getItem('access_token')

        // Build WebSocket URL
        const wsUrl = `${WS_BASE_URL}/api/build/${buildId}/stream`

        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
            setIsConnected(true)
            onConnect?.()

            // Clear any pending reconnect
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
        }

        ws.onmessage = (event) => {
            try {
                const data: BuildEvent = JSON.parse(event.data)

                // Skip pings
                if (data.type === 'ping') return

                setLastEvent(data)
                setEvents(prev => [...prev, data])
                onEvent?.(data)
            } catch (e) {
                console.error('Failed to parse WebSocket message:', e)
            }
        }

        ws.onclose = () => {
            setIsConnected(false)
            onDisconnect?.()

            // Auto-reconnect if enabled and not explicitly closed
            if (autoReconnect && wsRef.current) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect()
                }, 3000)
            }
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
            onError?.(error)
        }
    }, [buildId, onEvent, onConnect, onDisconnect, onError, autoReconnect])

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
        }

        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }

        setIsConnected(false)
    }, [])

    // Auto-connect on mount
    useEffect(() => {
        connect()

        return () => {
            disconnect()
        }
    }, [buildId])

    return {
        isConnected,
        lastEvent,
        events,
        connect,
        disconnect,
    }
}
