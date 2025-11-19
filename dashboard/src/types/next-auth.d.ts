declare module 'next-auth' {
  interface User {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    accessToken?: string
  }

  interface Session {
    user: User
    accessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    isActive: boolean
    accessToken?: string
  }
}
