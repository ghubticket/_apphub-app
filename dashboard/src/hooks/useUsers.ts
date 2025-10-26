import { useState, useEffect, useCallback } from 'react'
import { userService, User, UserListResponse, UserUpdateStatusRequest } from '@/services/userService'
import { UserRole } from '@/types/roles'

interface UseUsersParams {
  page?: number
  limit?: number
  search?: string
  role?: UserRole
  status?: boolean
}

interface UseUsersReturn {
  users: User[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  } | null
  refetch: () => Promise<void>
  updateUserStatus: (userId: string, isActive: boolean) => Promise<void>
}

export const useUsers = (params: UseUsersParams = {}): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<UseUsersReturn['pagination']>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response: UserListResponse = await userService.getAllUsers(params)
      
      setUsers(response.data.users)
      setPagination(response.data.pagination)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar usuários')
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setLoading(false)
    }
  }, [params.page, params.limit, params.search, params.role, params.status])

  const updateUserStatus = useCallback(async (userId: string, isActive: boolean) => {
    try {
      setLoading(true)
      setError(null)
      
      const statusData: UserUpdateStatusRequest = { isActive }
      await userService.updateUserStatus(userId, statusData)
      
      // Atualizar a lista local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId ? { ...user, isActive } : user
        )
      )
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status do usuário')
      console.error('Erro ao atualizar status:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    pagination,
    refetch,
    updateUserStatus
  }
}
