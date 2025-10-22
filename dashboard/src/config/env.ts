// Environment Configuration
export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'AppHub Dashboard',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
}

// Helper to get API URL
export const getApiUrl = (endpoint: string) => {
  return `${env.API_URL}${endpoint}`
}
