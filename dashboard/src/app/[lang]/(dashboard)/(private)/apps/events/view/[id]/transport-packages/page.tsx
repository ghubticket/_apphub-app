    'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid2'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

import { AdminOnly } from '@/components/RoleGuard'
import { eventService } from '@/services/eventService'

// Helper para obter token de autenticação
const getAuthToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null

    try {
        const res = await fetch('/api/auth/session')
        if (!res.ok) return null
        const session = await res.json()
        return session?.accessToken || null
    } catch {
        return null
    }
}

// Helper para fazer chamadas à API
const apiCall = async (url: string, options?: any) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'
    const token = await getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(options?.headers || {}),
        },
        credentials: 'include',
    })
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro na requisição' }))
        throw new Error(error.message || 'Erro na requisição')
    }
    
    return response.json()
}

interface TransportPackage {
    _id: string
    code: string
    qrCode: string
    eventDate: string
    departureLocation: {
        name: string
        address: string
        meetingTime: string
        departureTime: string
    }
    packageType: string
    price: number
    status: 'pending' | 'confirmed' | 'used' | 'cancelled' | 'refunded'
    passengerData: {
        name: string
        phone: string
        rg: string
        cpf: string
    }
    order: {
        _id: string
        orderNumber: string
    }
    createdAt: string
}

export default function TransportPackagesPage() {
    const params = useParams()
    const router = useRouter()
    const id = (params?.id as string) || null

    const [loading, setLoading] = useState(true)
    const [packages, setPackages] = useState<TransportPackage[]>([])
    const [eventName, setEventName] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [selectedPackage, setSelectedPackage] = useState<TransportPackage | null>(null)
    const [qrDialogOpen, setQrDialogOpen] = useState(false)
    const [validating, setValidating] = useState(false)

    useEffect(() => {
        const load = async () => {
            if (!id) return

            try {
                setLoading(true)
                setError(null)

                // Buscar nome do evento
                try {
                    const eventResponse = await eventService.getById(id)
                    setEventName(eventResponse.data?.name || 'Evento')
                } catch (e) {
                    // Ignorar erro
                }

                // Buscar pacotes de transporte do evento
                // Nota: Por enquanto, vamos buscar via orders do evento
                // Em produção, seria melhor ter um endpoint específico
                try {
                    const ordersResponse = await apiCall(`/orders?eventId=${id}&limit=100`)

                    const orders = ordersResponse?.data?.orders || []
                    const allPackages: TransportPackage[] = []

                    // Buscar pacotes de cada pedido
                    for (const order of orders) {
                        try {
                            const packagesResponse = await apiCall(`/transport-packages/order/${order._id}`)
                            if (packagesResponse?.success && packagesResponse?.data) {
                                allPackages.push(...packagesResponse.data)
                            }
                        } catch (e) {
                            // Ignorar erro se pedido não tiver pacotes
                        }
                    }

                    setPackages(allPackages)
                } catch (err: any) {
                    setError(err.message || 'Erro ao carregar pacotes de transporte')
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados')
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [id])

    const handleValidate = async (packageId: string) => {
        try {
            setValidating(true)
            // TODO: Implementar endpoint de validação
            // await api.post(`/transport-packages/${packageId}/validate`)
            alert('Validação de pacote será implementada em breve')
        } catch (err: any) {
            alert(err.message || 'Erro ao validar pacote')
        } finally {
            setValidating(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'success'
            case 'used':
                return 'info'
            case 'cancelled':
                return 'error'
            case 'refunded':
                return 'warning'
            default:
                return 'default'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Pendente'
            case 'confirmed':
                return 'Confirmado'
            case 'used':
                return 'Usado'
            case 'cancelled':
                return 'Cancelado'
            case 'refunded':
                return 'Reembolsado'
            default:
                return status
        }
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <AdminOnly>
            <Box>
                <Box display="flex" alignItems="center" gap={2} mb={4}>
                    <IconButton onClick={() => router.back()}>
                        <i className="tabler-arrow-left" />
                    </IconButton>
                    <Typography variant="h4">Pacotes de Transporte</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {eventName}
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Card>
                    <CardHeader title={`${packages.length} pacote(s) encontrado(s)`} />
                    <CardContent>
                        {packages.length === 0 ? (
                            <Alert severity="info">Nenhum pacote de transporte encontrado para este evento.</Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Código</TableCell>
                                            <TableCell>Passageiro</TableCell>
                                            <TableCell>Local de Saída</TableCell>
                                            <TableCell>Data</TableCell>
                                            <TableCell>Preço</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Pedido</TableCell>
                                            <TableCell align="right">Ações</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {packages.map((pkg) => (
                                            <TableRow key={pkg._id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">
                                                        {pkg.code}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{pkg.passengerData.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {pkg.passengerData.cpf}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{pkg.departureLocation.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {pkg.departureLocation.meetingTime} - {pkg.departureLocation.departureTime}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(pkg.eventDate).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell>
                                                    R$ {pkg.price.toFixed(2).replace('.', ',')}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={getStatusLabel(pkg.status)}
                                                        color={getStatusColor(pkg.status) as any}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace">
                                                        {pkg.order?.orderNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Box display="flex" gap={1} justifyContent="flex-end">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedPackage(pkg)
                                                                setQrDialogOpen(true)
                                                            }}
                                                        >
                                                            <i className="tabler-qrcode" style={{ fontSize: '18px' }} />
                                                        </IconButton>
                                                        {pkg.status === 'confirmed' && (
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => handleValidate(pkg._id)}
                                                                disabled={validating}
                                                            >
                                                                <i className="tabler-check" style={{ fontSize: '18px' }} />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog para exibir QR Code */}
                <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>QR Code do Pacote</DialogTitle>
                    <DialogContent>
                        {selectedPackage && (
                            <Box>
                                <Box display="flex" justifyContent="center" mb={2}>
                                    {selectedPackage.qrCode ? (
                                        <img
                                            src={selectedPackage.qrCode}
                                            alt="QR Code"
                                            style={{ maxWidth: '100%', height: 'auto' }}
                                        />
                                    ) : (
                                        <Alert severity="warning">QR Code não disponível</Alert>
                                    )}
                                </Box>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Código:</strong> {selectedPackage.code}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Passageiro:</strong> {selectedPackage.passengerData.name}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Local:</strong> {selectedPackage.departureLocation.name}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Status:</strong>{' '}
                                    <Chip
                                        label={getStatusLabel(selectedPackage.status)}
                                        color={getStatusColor(selectedPackage.status) as any}
                                        size="small"
                                    />
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setQrDialogOpen(false)}>Fechar</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AdminOnly>
    )
}

