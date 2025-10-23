'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { useTheme } from '@mui/material/styles'

// Component Imports
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Styled Component Imports - Removido AppRecharts

// Vars
const data = [
    {
        name: 'Seg',
        sessões: 12
    },
    {
        name: 'Ter',
        sessões: 19
    },
    {
        name: 'Qua',
        sessões: 8
    },
    {
        name: 'Qui',
        sessões: 15
    },
    {
        name: 'Sex',
        sessões: 22
    },
    {
        name: 'Sáb',
        sessões: 5
    },
    {
        name: 'Dom',
        sessões: 3
    }
]

const SessionsBarChart = () => {
    // Hooks
    const theme = useTheme()

    return (
        <Card>
            <CardHeader
                title="Sessões por Dia da Semana"
                subheader="Distribuição de sessões ativas"
                sx={{
                    '& .MuiCardHeader-action': { mt: -0.5 }
                }}
                action={
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        Última semana
                    </Typography>
                }
            />
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="sessões" fill={theme.palette.primary.main} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export default SessionsBarChart
