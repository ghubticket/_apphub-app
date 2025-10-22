// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      me: '/auth/me',
      logout: '/auth/logout',
      profile: '/auth/profile',
      changePassword: '/auth/change-password'
    },
    events: {
      list: '/events',
      create: '/events',
      update: '/events',
      delete: '/events'
    },
    tickets: {
      list: '/tickets',
      create: '/tickets',
      update: '/tickets',
      delete: '/tickets'
    }
  }
}

// Helper function to get full URL
export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`
}

// Helper function for API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = getApiUrl(endpoint)
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  try {
    const response = await fetch(url, defaultOptions)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}
