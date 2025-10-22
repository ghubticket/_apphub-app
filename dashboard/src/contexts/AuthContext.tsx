'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserRole, LoginCredentials, AuthResponse, RolePermissions, ROLE_PERMISSIONS } from '@/types/userTypes'
import { getApiUrl } from '@/config/env'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<AuthResponse>
  logout: () => void
  hasPermission: (permission: keyof RolePermissions) => boolean
  canAccess: (role: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is authenticated
  const isAuthenticated = !!user

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('apphub_user')
        const storedToken = localStorage.getItem('apphub_token')

        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser)
          setUser(userData)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        localStorage.removeItem('apphub_user')
        localStorage.removeItem('apphub_token')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  // Login function
  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setIsLoading(true)

      // API call to backend
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Login failed')
      }

      const responseData = await response.json()

      // Extract user and token from response
      const authData: AuthResponse = {
        user: responseData.data.user,
        token: responseData.data.token,
        refreshToken: responseData.data.token, // Using same token for now
        expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      }

      // Store user data and token
      localStorage.setItem('apphub_user', JSON.stringify(authData.user))
      localStorage.setItem('apphub_token', authData.token)

      setUser(authData.user)

      return authData
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem('apphub_user')
    localStorage.removeItem('apphub_token')
    setUser(null)
  }

  // Check if user has specific permission
  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!user) return false
    return ROLE_PERMISSIONS[user.role][permission]
  }

  // Check if user can access specific role
  const canAccess = (role: UserRole): boolean => {
    if (!user) return false
    return user.role === role
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasPermission,
    canAccess
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
