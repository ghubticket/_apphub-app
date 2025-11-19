import { useState, useEffect, useCallback } from 'react'

import { eventService, type EventItem, type EventListResponse } from '@/services/eventService'

interface UseEventsParams {
  page?: number
  limit?: number
  search?: string
}

interface UseEventsReturn {
  events: EventItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  } | null
  refetch: () => Promise<void>
  updateEventStatus: (eventId: string, isActive: boolean) => Promise<void>
}

export const useEvents = (params: UseEventsParams = {}): UseEventsReturn => {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<UseEventsReturn['pagination']>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response: EventListResponse = await eventService.list(params)


      // Backend may or may not send pagination; guard for both
      setEvents(response.data.events)
      setPagination(response.data.pagination ?? null)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar eventos')
      console.error('Erro ao carregar eventos:', err)
    } finally {
      setLoading(false)
    }
  }, [params.page, params.limit, params.search])

  const updateEventStatus = useCallback(async (eventId: string, isActive: boolean) => {
    try {
      setLoading(true)
      setError(null)
      
      await eventService.updateStatus(eventId, isActive)
      
      // Atualizar a lista local
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event._id === eventId ? { ...event, isActive } : event
        )
      )
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status do evento')
      console.error('Erro ao atualizar status:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, error, pagination, refetch, updateEventStatus }
}


