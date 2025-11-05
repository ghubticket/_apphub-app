'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CustomTextField from '@core/components/mui/TextField'
import CustomAvatar from '@core/components/mui/Avatar'
import { userService } from '@/services/userService'
// Função para formatar moeda brasileira
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}
import { AdminOnly } from '@/components/RoleGuard'
import { getInitials } from '@/utils/getInitials'
import tableStyles from '@core/styles/table.module.css'
import classnames from 'classnames'

const orderStatusColors: { [key: string]: 'primary' | 'success' | 'warning' | 'error' | 'secondary' } = {
    pending: 'warning',
    paid: 'success',
    cancelled: 'error',
    refunded: 'secondary',
}

const UserEditPage = () => {
    const { id, lang: locale } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<any>(null)
    const [orders, setOrders] = useState<any[]>([])
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        role: '',
        isActive: true,
    })

    useEffect(() => {
        const fetchUserData = async () => {
            if (!id) return

            try {
                setLoading(true)
                setError(null)
                const response = await userService.getUserById(id as string)

                if (response.success) {
                    setUser(response.data.user)
                    setOrders(response.data.orders || [])
                    setFormData({
                        name: response.data.user.name || '',
                        email: response.data.user.email || '',
                        phone: response.data.user.phone || '',
                        cpf: response.data.user.cpf || '',
                        role: response.data.user.role || '',
                        isActive: response.data.user.isActive ?? true,
                    })
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados do usuário')
            } finally {
                setLoading(false)
            }
        }

        fetchUserData()
    }, [id])

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSave = async () => {
        // TODO: Implementar atualização do usuário
        console.log('Salvar dados:', formData)
        setIsEditing(false)
    }

    if (loading) {
        return (
            <AdminOnly>
                <Card>
                    <CardContent>
                        <Box className='flex flex-col items-center justify-center py-12'>
                            <i className='tabler-loader-2 animate-spin text-6xl text-textSecondary mb-4' />
                            <Typography variant='h6' color='text.secondary'>Carregando dados do usuário...</Typography>
                        </Box>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    if (error || !user) {
        return (
            <AdminOnly>
                <Card>
                    <CardHeader
                        title='Erro'
                        subheader='Não foi possível carregar os dados do usuário'
                    />
                    <CardContent>
                        <Typography color='error' className='mb-2'>{error || 'Usuário não encontrado'}</Typography>
                        <Button
                            variant='outlined'
                            onClick={() => router.push(`/${locale}/apps/user/list`)}
                            startIcon={<i className='tabler-arrow-left' />}
                        >
                            Voltar para Lista
                        </Button>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    return (
        <AdminOnly>
            <Grid container spacing={6}>
                {/* Informações do Usuário */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardHeader
                            title='Informações do Usuário'
                            action={
                                <Box className='flex gap-2'>
                                    {isEditing ? (
                                        <>
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                onClick={() => {
                                                    setIsEditing(false)
                                                    // Restaurar dados originais
                                                    setFormData({
                                                        name: user.name || '',
                                                        email: user.email || '',
                                                        phone: user.phone || '',
                                                        cpf: user.cpf || '',
                                                        role: user.role || '',
                                                        isActive: user.isActive ?? true,
                                                    })
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                variant='contained'
                                                size='small'
                                                onClick={handleSave}
                                            >
                                                Salvar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant='contained'
                                            size='small'
                                            startIcon={<i className='tabler-edit' />}
                                            onClick={() => setIsEditing(true)}
                                        >
                                            Editar
                                        </Button>
                                    )}
                                </Box>
                            }
                        />
                        <Divider />
                        <CardContent>
                            <Box className='flex flex-col gap-4'>
                                <Box className='flex items-center gap-4 mb-4'>
                                    <CustomAvatar skin='light' color='primary' size={80}>
                                        {getInitials(user.name)}
                                    </CustomAvatar>
                                    <Box>
                                        <Typography variant='h5'>{user.name}</Typography>
                                        <Typography variant='body2' color='text.secondary'>{user.email}</Typography>
                                        <Chip
                                            label={user.role}
                                            color={user.role === 'ADMIN' ? 'error' : user.role === 'QRCODE' ? 'primary' : 'success'}
                                            size='small'
                                            variant='tonal'
                                            className='mt-2'
                                        />
                                    </Box>
                                </Box>

                                <CustomTextField
                                    label='Nome'
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    disabled={!isEditing}
                                    fullWidth
                                />

                                <CustomTextField
                                    label='Email'
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    disabled={!isEditing}
                                    fullWidth
                                />

                                <CustomTextField
                                    label='Telefone'
                                    value={formData.phone || ''}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    disabled={!isEditing}
                                    fullWidth
                                />

                                <CustomTextField
                                    label='CPF'
                                    value={formData.cpf || ''}
                                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                                    disabled={!isEditing}
                                    fullWidth
                                />

                                <CustomTextField
                                    label='Role'
                                    value={formData.role}
                                    onChange={(e) => handleInputChange('role', e.target.value)}
                                    disabled={!isEditing}
                                    fullWidth
                                    select
                                >
                                    <option value='ADMIN'>ADMIN</option>
                                    <option value='QRCODE'>QRCODE</option>
                                    <option value='CLIENTE'>CLIENTE</option>
                                </CustomTextField>

                                <Box className='flex items-center justify-between'>
                                    <Typography variant='body1'>Status</Typography>
                                    <Chip
                                        label={formData.isActive ? 'Ativo' : 'Inativo'}
                                        color={formData.isActive ? 'success' : 'secondary'}
                                        size='small'
                                        variant='tonal'
                                    />
                                </Box>

                                <Box className='mt-4 pt-4 border-t'>
                                    <Typography variant='caption' color='text.secondary'>
                                        Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                    </Typography>
                                    <br />
                                    <Typography variant='caption' color='text.secondary'>
                                        Atualizado em: {new Date(user.updatedAt).toLocaleDateString('pt-BR')}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Pedidos do Usuário */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardHeader
                            title='Pedidos do Usuário'
                            subheader={`${orders.length} pedido(s) encontrado(s)`}
                        />
                        <Divider />
                        <CardContent>
                            {orders.length === 0 ? (
                                <Box className='flex flex-col items-center justify-center py-8'>
                                    <i className='tabler-shopping-cart text-6xl text-textSecondary mb-4' />
                                    <Typography variant='h6' color='text.secondary' className='mb-2'>
                                        Nenhum pedido encontrado
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                        Este usuário ainda não realizou nenhum pedido
                                    </Typography>
                                </Box>
                            ) : (
                                <div className='overflow-x-auto'>
                                    <table className={classnames(tableStyles.table, 'min-w-full')}>
                                        <thead>
                                            <tr>
                                                <th>Pedido</th>
                                                <th>Evento</th>
                                                <th>Ingressos</th>
                                                <th>Valor</th>
                                                <th>Status</th>
                                                <th>Data</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order: any) => (
                                                <tr key={order._id}>
                                                    <td>
                                                        <Typography variant='body2' className='font-medium'>
                                                            {order.orderNumber}
                                                        </Typography>
                                                    </td>
                                                    <td>
                                                        <Typography variant='body2'>
                                                            {typeof order.event === 'object' ? order.event.name : 'N/A'}
                                                        </Typography>
                                                    </td>
                                                    <td>
                                                        <Typography variant='body2'>
                                                            {order.totalTickets}
                                                        </Typography>
                                                    </td>
                                                    <td>
                                                        <Typography variant='body2'>
                                                            {formatCurrency(order.totalAmount)}
                                                        </Typography>
                                                    </td>
                                                    <td>
                                                        <Chip
                                                            label={order.paymentMethod === 'vip_free' ? 'VIP' : order.status}
                                                            color={order.paymentMethod === 'vip_free' ? 'success' : (orderStatusColors[order.status] || 'default')}
                                                            size='small'
                                                            variant='tonal'
                                                        />
                                                    </td>
                                                    <td>
                                                        <Typography variant='body2'>
                                                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                                        </Typography>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </AdminOnly>
    )
}

export default UserEditPage

