// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

// Auth Imports
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata = {
    title: '5521 Dashboard - Sistema de Gestão de Eventos',
    description: 'Dashboard administrativo da 5521 - A mais carioca do mundo. Sistema completo para gestão de eventos, tickets e validação de ingressos.'
}

const RootLayout = async (props: ChildrenType) => {
    const { children } = props

    // Vars

    const systemMode = await getSystemMode()
    const direction = 'ltr'

    return (
        <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
            <body className='flex is-full min-bs-full flex-auto flex-col'>
                <InitColorSchemeScript attribute='data' defaultMode='light' />
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}

export default RootLayout
