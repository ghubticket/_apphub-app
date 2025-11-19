import { useState, useEffect, useCallback } from 'react'

import { promoterCodeService, type PromoterCodeItem } from '@/services/promoterCodeService'

export interface UsePromoterCodesOptions {
    autoFetch?: boolean
    page?: number
    limit?: number
    search?: string
    eventId?: string
    isActive?: boolean
}

export interface UsePromoterCodesReturn {
    codes: PromoterCodeItem[]
    loading: boolean
    error: string | null
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    } | null
    fetchCodes: () => Promise<void>
    refetch: () => Promise<void>
}

export const usePromoterCodes = (options: UsePromoterCodesOptions = { autoFetch: true }): UsePromoterCodesReturn => {
    const [codes, setCodes] = useState<PromoterCodeItem[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState<UsePromoterCodesReturn['pagination']>(null)

    const fetchCodes = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await promoterCodeService.list({
                page: options.page,
                limit: options.limit,
                search: options.search,
                eventId: options.eventId,
                isActive: options.isActive
            })
            
            if (response.data && response.data.codes) {
                setCodes(response.data.codes)
                setPagination(response.data.pagination || null)
            } else {
                setCodes([])
                setPagination(null)
            }
        } catch (err: any) {
            console.error('Erro ao carregar códigos:', err)
            setError(err.message || 'Erro ao carregar códigos')
            setCodes([])
            setPagination(null)
        } finally {
            setLoading(false)
        }
    }, [options.page, options.limit, options.search, options.eventId, options.isActive])

    useEffect(() => {
        if (options.autoFetch !== false) {
            fetchCodes()
        }
    }, [options.autoFetch, fetchCodes])

    return {
        codes,
        loading,
        error,
        pagination,
        fetchCodes,
        refetch: fetchCodes,
    }
}

