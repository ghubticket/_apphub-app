'use client'

import { useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'

import { useOrder } from '@/hooks/useOrders'

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Grid container spacing={2} className='mb-3'>
        <Grid item xs={12} md={3}><Typography variant='subtitle2' color='text.secondary' sx={{ fontWeight: 600 }}>{label}</Typography></Grid>
        <Grid item xs={12} md={9}><Typography component='div' variant='body1'>{value}</Typography></Grid>
    </Grid>
)

export default function OrderDetailPage() {
    const params = useParams()
    const id = (params?.id as string) || null
    const { order, loading, error } = useOrder(id)

    if (loading) {
        return (
            <Box className='flex flex-col items-center justify-center py-12'>
                <i className='tabler-loader-2 animate-spin text-6xl text-textSecondary mb-4' />
                <Typography variant='h6' color='text.secondary'>Carregando pedido...</Typography>
            </Box>
        )
    }

    if (error || !order) {
        return (
            <Box className='flex flex-col items-center justify-center py-12'>
                <i className='tabler-alert-triangle text-6xl text-textSecondary mb-4' />
                <Typography variant='h6' color='text.secondary'>Pedido não encontrado</Typography>
            </Box>
        )
    }

    // Helpers
    const eventObj: any = typeof order.event === 'object' ? order.event : {}
    const customerObj: any = typeof order.customer === 'object' ? order.customer : {}
    const customerPhone: string | undefined = (order as any)?.customerData?.phone

    const formatPhoneForWhatsApp = (phone?: string) => {
        if (!phone) return null
        const digits = phone.replace(/\D/g, '')
        const withCountry = digits.length <= 11 ? `55${digits}` : digits

        
return withCountry
    }

    const waNumber = formatPhoneForWhatsApp(customerPhone)

    const waText = encodeURIComponent(
        `Olá ${(customerObj?.name || '').trim() || 'cliente'}, tudo bem?\n\n` +
        `Seu pedido ${order.orderNumber} para o evento "${eventObj?.name || 'Evento'}" está com status: ${order.status}.\n` +
        `Total: R$ ${(order.totalAmount || 0).toFixed(2)}.`
    )

    const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null

    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
        paid: 'success',
        pending: 'warning',
        cancelled: 'error',
        refunded: 'info'
    }

    const isVip = order.paymentMethod === 'vip_free'
    const isParcelled = !!order.parcelledOrderInfo
    const parcelledInfo = order.parcelledOrderInfo

    // Função para formatar data
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    // Função para obter status do pedido parcelado
    const getParcelledStatusLabel = () => {
        if (!parcelledInfo) return 'PENDENTE'
        
        if (parcelledInfo.status === 'completed') return 'PAGO'
        if (parcelledInfo.status === 'cancelled') return 'CANCELADO'
        if (parcelledInfo.isEntryPaid) return 'ENTRADA PAGA'
        return 'ENTRADA PENDENTE'
    }

    // Função para obter cor do status do pedido parcelado
    const getParcelledStatusColor = (): 'success' | 'warning' | 'error' | 'info' => {
        if (!parcelledInfo) return 'warning'
        
        if (parcelledInfo.status === 'completed') return 'success'
        if (parcelledInfo.status === 'cancelled') return 'error'
        if (parcelledInfo.isEntryPaid) return 'info'
        return 'warning'
    }

    return (
        <Card>
            <CardHeader title={`Pedido ${order.orderNumber}`} subheader={(order.event as any)?.name || 'Evento'} />
            {eventObj?.coverImage && (
                <CardMedia component='img' height='220' image={eventObj.coverImage} alt={eventObj?.name || 'Evento'} sx={{ objectFit: 'cover' }} />
            )}
            <CardContent>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={7}>
                        <InfoRow label='Cliente' value={typeof order.customer === 'string' ? order.customer : `${(order.customer as any)?.name} • ${(order.customer as any)?.email}`} />
                        <InfoRow label='Evento' value={typeof order.event === 'string' ? order.event : `${(order.event as any)?.name} • ${(order.event as any)?.location}`} />
                        <InfoRow label='Tipo' value={(order.paymentMethod === 'vip_free') ? (
                            <Chip size='small' label='VIP' color='secondary' variant='tonal' />
                        ) : isParcelled ? (
                            <Chip size='small' label='PARCELADO' color='primary' variant='tonal' />
                        ) : (
                            <Chip size='small' label='NORMAL' variant='tonal' />
                        )} />
                        <InfoRow label='Criado em' value={new Date(order.createdAt).toLocaleString()} />
                        {order.paidAt && <InfoRow label='Pago em' value={new Date(order.paidAt).toLocaleString()} />}

                        <InfoRow label='Pagamento - Método' value={(() => {
                            const map: any = { pix: 'PIX', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito', bank_slip: 'Boleto', vip_free: 'VIP (Gratuito)' }
                            const label = map[order.paymentMethod as any] || order.paymentMethod

                            if (!label) return '—'

                            const iconClass = order.paymentMethod === 'pix'
                                ? 'tabler-qrcode'
                                : (order.paymentMethod === 'credit_card' || order.paymentMethod === 'debit_card')
                                    ? 'tabler-credit-card'
                                    : 'tabler-wallet'

                            
return (
                                <span className='inline-flex items-center gap-2'>
                                    <i className={`${iconClass}`} /> {label}
                                </span>
                            )
                        })()} />
                        <InfoRow label='Pagamento - Status' value={(
                            (() => {
                                // Se for pedido parcelado, usar status do pedido parcelado
                                if (isParcelled && parcelledInfo) {
                                    return <Chip size='small' label={getParcelledStatusLabel()} color={getParcelledStatusColor()} variant='tonal' />
                                }

                                const status = (order.paymentStatus || order.status || '').toLowerCase()

                                const labelMap: Record<string, string> = {
                                    paid: 'CONFIRMADO',
                                    pending: 'PENDENTE',
                                    cancelled: 'CANCELADO',
                                    refunded: 'REEMBOLSADO'
                                }

                                const label = labelMap[status] || (status || '').toUpperCase()

                                const colorMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
                                    paid: 'success',
                                    pending: 'warning',
                                    cancelled: 'error',
                                    refunded: 'info'
                                }

                                const color = colorMap[status] || 'default'

                                
return <Chip size='small' label={label} color={color as any} variant='tonal' />
                            })()
                        )} />
                        <InfoRow label='Payment ID' value={order.paymentId || '—'} />
                        {(order.paymentAdminMessage || order.paymentMessage || order.paymentStatusDetail || order.paymentErrorCode) && (
                            <Box className='mt-2 p-3 rounded border bg-actionHover'>
                                <Typography variant='subtitle2' className='mb-1'>Detalhes do pagamento</Typography>
                                {order.paymentMessage && <Typography variant='body2' className='mb-1'>{order.paymentMessage}</Typography>}
                                {order.paymentAdminMessage && <Typography variant='caption' color='text.secondary' className='block mb-1'>{order.paymentAdminMessage}</Typography>}
                                {order.paymentStatusDetail && <Chip size='small' label={order.paymentStatusDetail} variant='tonal' className='mr-2' />}
                                {order.paymentErrorCode && <Chip size='small' color='error' label={`erro: ${order.paymentErrorCode}`} variant='tonal' />}
                                {order.paymentErrorDescription && <Typography variant='caption' color='error' className='block mt-1'>{order.paymentErrorDescription}</Typography>}
                            </Box>
                        )}

                        {/* Informações do pedido parcelado */}
                        {isParcelled && parcelledInfo && (
                            <Box className='mt-4 p-4 rounded border bg-actionHover'>
                                <Typography variant='subtitle1' className='mb-3 font-semibold'>Pedido Parcelado</Typography>
                                
                                {/* Barra de progresso */}
                                <Box className='mb-3'>
                                    <Box className='flex items-center justify-between mb-1'>
                                        <Typography variant='body2' color='text.secondary'>
                                            Progresso do pagamento
                                        </Typography>
                                        <Typography variant='body2' className='font-medium'>
                                            {parcelledInfo.paidParcels} de {parcelledInfo.totalParcels} parcelas pagas
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant='determinate' 
                                        value={parcelledInfo.progressPercentage} 
                                        sx={{ height: 8, borderRadius: 4 }}
                                        color={parcelledInfo.progressPercentage === 100 ? 'success' : 'primary'}
                                    />
                                    <Typography variant='caption' color='text.secondary' className='mt-1 block text-center'>
                                        {parcelledInfo.progressPercentage}% concluído
                                    </Typography>
                                </Box>

                                <Divider className='my-3' />

                                {/* Entrada */}
                                {parcelledInfo.entryParcel && (
                                    <Box className='mb-3'>
                                        <Typography variant='subtitle2' className='mb-2'>Entrada</Typography>
                                        <Box className='flex items-center justify-between p-2 rounded bg-background'>
                                            <div>
                                                <Typography variant='body2' className='font-medium'>
                                                    R$ {parcelledInfo.entryParcel.amount.toFixed(2).replace('.', ',')}
                                                </Typography>
                                                <Typography variant='caption' color='text.secondary'>
                                                    Venc: {formatDate(parcelledInfo.entryParcel.dueDate)}
                                                </Typography>
                                            </div>
                                            <Chip 
                                                size='small' 
                                                label={parcelledInfo.entryParcel.status === 'paid' ? 'PAGA' : 'PENDENTE'} 
                                                color={parcelledInfo.entryParcel.status === 'paid' ? 'success' : 'warning'} 
                                                variant='tonal' 
                                            />
                                        </Box>
                                    </Box>
                                )}

                                {/* Próximas parcelas */}
                                {parcelledInfo.upcomingParcels && parcelledInfo.upcomingParcels.length > 0 && (
                                    <Box>
                                        <Typography variant='subtitle2' className='mb-2'>Próximas Parcelas</Typography>
                                        <Box className='space-y-2'>
                                            {parcelledInfo.upcomingParcels.map((parcel: any) => {
                                                const isOverdue = parcel.overdueAt && new Date(parcel.overdueAt) < new Date()
                                                const statusLabel = parcel.status === 'paid' 
                                                    ? 'PAGA' 
                                                    : isOverdue 
                                                        ? 'EM ATRASO' 
                                                        : 'PENDENTE'
                                                const statusColor = parcel.status === 'paid' 
                                                    ? 'success' 
                                                    : isOverdue 
                                                        ? 'error' 
                                                        : 'warning'

                                                return (
                                                    <Box key={parcel._id} className='flex items-center justify-between p-2 rounded bg-background'>
                                                        <div>
                                                            <Typography variant='body2' className='font-medium'>
                                                                Parcela {parcel.sequence} • R$ {parcel.amount.toFixed(2).replace('.', ',')}
                                                            </Typography>
                                                            <Typography variant='caption' color='text.secondary'>
                                                                Venc: {formatDate(parcel.dueDate)}
                                                            </Typography>
                                                        </div>
                                                        <Chip 
                                                            size='small' 
                                                            label={statusLabel} 
                                                            color={statusColor as any} 
                                                            variant='tonal' 
                                                        />
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Grid>
                    {isVip ? (
                        <Grid item xs={12} md={5}>
                            <Card variant='outlined'>
                                <CardContent>
                                    <Typography variant='h6' className='mb-2'>Ingressos</Typography>
                                    <Box className='space-y-2'>
                                        {order.tickets?.map((t: any) => (
                                            <Box key={t._id} className='flex items-center justify-between border rounded px-3 py-2'>
                                                <div>
                                                    <div className='font-medium'>{t.code}</div>
                                                    <div className='text-sm text-textSecondary'>
                                                        {t?.ticketType?.name || 'Ingresso'} • R$ {(t.price || 0).toFixed(2)}
                                                    </div>
                                                    {t.status === 'used' ? (
                                                        <div className='text-xs text-textSecondary mt-1'>
                                                            USADO em {t.usedAt ? new Date(t.usedAt).toLocaleString() : '—'}{t.usedBy ? ` por ${(t.usedBy as any)?.name || (t.usedBy as any)?.email}` : ''}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                {(() => {
                                                    const status = String(t.status || '').toLowerCase()

                                                    const labelMap: Record<string, string> = {
                                                        confirmed: 'CONFIRMADO',
                                                        pending: 'PENDENTE',
                                                        cancelled: 'CANCELADO',
                                                        refunded: 'REEMBOLSADO',
                                                        used: 'USADO'
                                                    }

                                                    const color = status === 'confirmed' || status === 'used' ? 'success' : status === 'pending' ? 'warning' : status === 'cancelled' ? 'error' : 'default'

                                                    
return <Chip size='small' label={labelMap[status] || status.toUpperCase()} color={color as any} variant='tonal' />
                                                })()}
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ) : (
                        <Grid item xs={12} md={5}>
                            <Card variant='outlined'>
                                <CardContent>
                                    <Typography variant='h6' className='mb-3'>Resumo financeiro</Typography>
                                    <InfoRow label='Subtotal' value={`R$ ${(order.subtotal || 0).toFixed(2)}`} />
                                    <InfoRow label='Desconto' value={`R$ ${(order.discountAmount || 0).toFixed(2)}`} />
                                    <InfoRow label='Taxa' value={`R$ ${(order.platformFee || 0).toFixed(2)}`} />
                                    <InfoRow label='Total' value={<span className='font-medium'>R$ {(order.totalAmount || 0).toFixed(2)}</span>} />
                                    {waLink && (
                                        <Box className='mt-4'>
                                            <Button fullWidth variant='contained' color='success' startIcon={<i className='tabler-brand-whatsapp' />} href={waLink} target='_blank'>
                                                Contatar no WhatsApp
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>

                {!isVip && (<>
                    <Typography variant='h6' className='mt-6 mb-2'>Ingressos</Typography>
                    <Box className='space-y-2'>
                        {order.tickets?.map((t: any) => (
                            <Box key={t._id} className='flex items-center justify-between border rounded px-3 py-2'>
                                <div>
                                    <div className='font-medium'>{t.code}</div>
                                    <div className='text-sm text-textSecondary'>
                                        {t?.ticketType?.name || 'Ingresso'} • R$ {(t.price || 0).toFixed(2)}
                                    </div>
                                    {t.status === 'used' ? (
                                        <div className='text-xs text-textSecondary mt-1'>
                                            USADO em {t.usedAt ? new Date(t.usedAt).toLocaleString() : '—'}{t.usedBy ? ` por ${(t.usedBy as any)?.name || (t.usedBy as any)?.email}` : ''}
                                        </div>
                                    ) : (
                                        <div className='text-xs text-textSecondary mt-1'>
                                            NÃO UTILIZADO
                                        </div>
                                    )}
                                </div>
                                {(() => {
                                    const status = String(t.status || '').toLowerCase()

                                    const labelMap: Record<string, string> = {
                                        confirmed: 'CONFIRMADO',
                                        pending: 'PENDENTE',
                                        cancelled: 'CANCELADO',
                                        refunded: 'REEMBOLSADO',
                                        used: 'USADO'
                                    }

                                    const color = status === 'confirmed' || status === 'used' ? 'success' : status === 'pending' ? 'warning' : status === 'cancelled' ? 'error' : 'default'

                                    
return <Chip size='small' label={labelMap[status] || status.toUpperCase()} color={color as any} variant='tonal' />
                                })()}
                            </Box>
                        ))}
                    </Box>
                </>)}
            </CardContent>
        </Card>
    )
}


