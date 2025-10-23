'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserRole, LoginCredentials, AuthResponse, RolePermissions, ROLE_PERMISSIONS } from '@/types/userTypes'
import { getApiUrl } from '@/config/env'
import { setAuthCookies, getAuthFromCookies, clearAuthCookies, updateAccessToken } from '@/utils/cookies'

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
    const [refreshToken, setRefreshToken] = useState<string | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)

    // Check if user is authenticated
    const isAuthenticated = !!user

    // Load user from cookies on mount
    useEffect(() => {
        const loadUser = async () => {
            try {
                const authData = getAuthFromCookies()

                if (authData.isAuthenticated && authData.user && authData.accessToken && authData.refreshToken) {
                    setUser(authData.user)
                    setAccessToken(authData.accessToken)
                    setRefreshToken(authData.refreshToken)
                }
            } catch (error) {
                console.error('Error loading user from cookies:', error)
                clearAuthCookies()
            } finally {
                setIsLoading(false)
            }
        }

        loadUser()
    }, [])

    // Auto-refresh token every 10 minutes
    useEffect(() => {
        if (!refreshToken || !user) return

        const refreshInterval = setInterval(async () => {
            try {
                await refreshAccessToken()
            } catch (error) {
                console.error('Auto-refresh failed:', error)
                logout()
            }
        }, 10 * 60 * 1000) // 10 minutes

        return () => clearInterval(refreshInterval)
    }, [refreshToken, user])

    // Inactivity timeout - logout after 30 minutes of inactivity
    useEffect(() => {
        if (!user) return

        let inactivityTimer: NodeJS.Timeout

        const resetInactivityTimer = () => {
            clearTimeout(inactivityTimer)
            inactivityTimer = setTimeout(() => {
                console.log('User inactive for 30 minutes, logging out...')
                logout()
            }, 30 * 60 * 1000) // 30 minutes
        }

        // Reset timer on user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
        events.forEach(event => {
            document.addEventListener(event, resetInactivityTimer, true)
        })

        // Start the timer
        resetInactivityTimer()

        return () => {
            clearTimeout(inactivityTimer)
            events.forEach(event => {
                document.removeEventListener(event, resetInactivityTimer, true)
            })
        }
    }, [user])

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

            // Extract user and tokens from response
            const authData: AuthResponse = {
                user: responseData.data.user,
                token: responseData.data.accessToken,
                refreshToken: responseData.data.refreshToken,
                expiresIn: responseData.data.expiresIn * 1000 // Convert to milliseconds
            }

            // Store user data and tokens in secure cookies
            setAuthCookies({
                accessToken: authData.token,
                refreshToken: authData.refreshToken,
                user: authData.user,
                sessionId: responseData.data.sessionId,
                expiresIn: responseData.data.expiresIn
            })

            setUser(authData.user)
            setAccessToken(authData.token)
            setRefreshToken(authData.refreshToken)

            return authData
        } catch (error) {
            console.error('Login error:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    // Refresh access token function
    const refreshAccessToken = async (): Promise<void> => {
        if (!refreshToken) throw new Error('No refresh token available')

        try {
            const response = await fetch(getApiUrl('/auth/refresh'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            })

            if (!response.ok) {
                throw new Error('Refresh token failed')
            }

            const responseData = await response.json()
            const newAccessToken = responseData.data.accessToken

      // Update stored access token in cookies
      updateAccessToken(newAccessToken, 900) // 15 minutes
      setAccessToken(newAccessToken)
        } catch (error) {
            console.error('Refresh token error:', error)
            throw error
        }
    }

  // Logout function
  const logout = () => {
    clearAuthCookies()
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
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
