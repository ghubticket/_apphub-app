// Test API connection
export const testApiConnection = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('API Status:', response.status)
    console.log('API Response:', await response.text())
    
    return response.ok
  } catch (error) {
    console.error('API Connection Error:', error)
    return false
  }
}

// Test login endpoint
export const testLogin = async (email: string, password: string) => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    })
    
    console.log('Login Status:', response.status)
    const data = await response.json()
    console.log('Login Response:', data)
    
    return { success: response.ok, data }
  } catch (error) {
    console.error('Login Error:', error)
    return { success: false, error }
  }
}
