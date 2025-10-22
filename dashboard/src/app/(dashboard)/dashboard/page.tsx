'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AdminDashboard from '../admin/page'
import QRReaderPage from '../qr-reader/page'

const DashboardPage: React.FC = () => {
    const { user } = useAuth()
    const router = useRouter()

    // Redirect based on user role
    React.useEffect(() => {
        if (user) {
            switch (user.role) {
                case 'ADMIN':
                    router.push('/admin')
                    break
                case 'TURMA':
                    router.push('/qr-reader')
                    break
                default:
                    router.push('/login')
            }
        }
    }, [user, router])

    if (!user) {
        return null
    }

    // Show appropriate dashboard based on role
    switch (user.role) {
        case 'ADMIN':
            return <AdminDashboard />
        case 'TURMA':
            return <QRReaderPage />
        default:
            return null
    }
}

export default DashboardPage
