'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { useTheme } from '@mui/material/styles'

// Component Imports
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Styled Component Imports - Removido AppRecharts

// Vars
const data = [
  { hora: '00:00', logins: 2 },
  { hora: '06:00', logins: 5 },
  { hora: '12:00', logins: 15 },
  { hora: '18:00', logins: 8 },
  { hora: '24:00', logins: 3 }
]

const ActivityLineChart = () => {
  // Hooks
  const theme = useTheme()

  return (
    <Card>
      <CardHeader
        title="Atividade por Hora"
        subheader="Logins por período do dia"
        sx={{
          '& .MuiCardHeader-action': { mt: -0.5 }
        }}
        action={
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            Hoje
          </Typography>
        }
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="logins" stroke={theme.palette.primary.main} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default ActivityLineChart
