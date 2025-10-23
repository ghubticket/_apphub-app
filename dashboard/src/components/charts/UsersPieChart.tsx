'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// Component Imports
import { Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// Styled Component Imports - Removido AppRecharts

type LabelProp = {
    cx: number
    cy: number
    percent: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    value: number
    name: string
}

// Vars
const data = [
    { name: 'ADMIN', value: 10, color: '#00d4bd' },
    { name: 'TURMA', value: 90, color: '#ffe700' }
]

const RADIAN = Math.PI / 180

const renderCustomizedLabel = (props: any) => {
    // Props
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props

    // Vars
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
        <text x={x} y={y} fill='#fff' textAnchor='middle' dominantBaseline='central' className='max-[400px]:text-xs'>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    )
}

const UsersPieChart = () => {
    return (
        <Card>
            <CardHeader
                title="Distribuição de Usuários"
                subheader="Por tipo de usuário"
                sx={{
                    '& .MuiCardHeader-action': { mt: -0.5 }
                }}
                action={
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        Total de usuários
                    </Typography>
                }
            />
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx='50%'
                            cy='50%'
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={80}
                            fill='#8884d8'
                            dataKey='value'
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export default UsersPieChart
