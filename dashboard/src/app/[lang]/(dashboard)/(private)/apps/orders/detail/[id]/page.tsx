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
    <Grid container spacing={{ xs: 1, md: 2 }} className='mb-3'>
        <Grid item xs={12} md={3}>
            <Typography 
                variant='subtitle2' 
                color='text.secondary' 
                sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    mb: { xs: 0.5, md: 0 }
                }}
            >
                {label}
            </Typography>
        </Grid>
        <Grid item xs={12} md={9}>
            <Typography 
                component='div' 
                variant='body1'
                sx={{
                    fontSize: { xs: '0.875rem', md: '1rem' }
                }}
            >
                {value}
            </Typography>
        </Grid>
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

    // Função para gerar link do WhatsApp para parcela
    const getWhatsAppLinkForParcel = (parcel: any, isEntry: boolean = false) => {
        if (!waNumber) return null

        const customerName = (customerObj?.name || '').trim() || 'cliente'
        const parcelNumber = isEntry ? 'entrada' : `${parcel.sequence}ª parcela`
        const amount = parcel.amount.toFixed(2).replace('.', ',')
        const dueDate = formatDate(parcel.dueDate)

        const message = `Olá, ${customerName}, sua ${parcelNumber} no valor de R$ ${amount} está em aberto.\n\n` +
            `Vencimento: ${dueDate}\n\n` +
            `Pedido: ${order.orderNumber}`

        return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
    }

    return (
        <Card>
            <CardHeader 
                title={`Pedido ${order.orderNumber}`} 
                subheader={(order.event as any)?.name || 'Evento'}
                sx={{
                    '& .MuiCardHeader-title': {
                        fontSize: { xs: '1.25rem', md: '1.5rem' },
                        fontWeight: 600
                    },
                    '& .MuiCardHeader-subheader': {
                        fontSize: { xs: '0.875rem', md: '1rem' }
                    }
                }}
            />
            {eventObj?.coverImage && (
                <CardMedia 
                    component='img' 
                    height='220' 
                    image={eventObj.coverImage} 
                    alt={eventObj?.name || 'Evento'} 
                    sx={{ 
                        objectFit: 'cover',
                        height: { xs: 180, md: 220 }
                    }} 
                />
            )}
            <CardContent>
                <Grid container spacing={{ xs: 3, md: 4 }}>
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
                            <Box className='mt-3 p-3 md:p-4 rounded border bg-actionHover'>
                                <Typography 
                                    variant='subtitle2' 
                                    className='mb-2 font-semibold'
                                    sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                                >
                                    Detalhes do pagamento
                                </Typography>
                                {order.paymentMessage && (
                                    <Typography 
                                        variant='body2' 
                                        className='mb-2'
                                        sx={{ fontSize: { xs: '0.8125rem', md: '0.875rem' } }}
                                    >
                                        {order.paymentMessage}
                                    </Typography>
                                )}
                                {order.paymentAdminMessage && (
                                    <Typography 
                                        variant='caption' 
                                        color='text.secondary' 
                                        className='block mb-2'
                                        sx={{ fontSize: { xs: '0.75rem', md: '0.8125rem' } }}
                                    >
                                        {order.paymentAdminMessage}
                                    </Typography>
                                )}
                                <Box className='flex flex-wrap gap-2 mb-2'>
                                    {order.paymentStatusDetail && (
                                        <Chip 
                                            size='small' 
                                            label={order.paymentStatusDetail} 
                                            variant='tonal'
                                            sx={{ fontSize: '0.75rem' }}
                                        />
                                    )}
                                    {order.paymentErrorCode && (
                                        <Chip 
                                            size='small' 
                                            color='error' 
                                            label={`erro: ${order.paymentErrorCode}`} 
                                            variant='tonal'
                                            sx={{ fontSize: '0.75rem' }}
                                        />
                                    )}
                                </Box>
                                {order.paymentErrorDescription && (
                                    <Typography 
                                        variant='caption' 
                                        color='error' 
                                        className='block'
                                        sx={{ fontSize: { xs: '0.75rem', md: '0.8125rem' } }}
                                    >
                                        {order.paymentErrorDescription}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Grid>
                    {isVip ? (
                        <Grid item xs={12} md={5}>
                            <Card variant='outlined' sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant='h6' className='mb-3 font-semibold'>Ingressos</Typography>
                                    <Box className='space-y-2'>
                                        {/* VIP sempre tem ingressos confirmados, mas vamos filtrar apenas os confirmados/used por segurança */}
                                        {order.tickets?.filter((t: any) => {
                                            const status = String(t.status || '').toLowerCase()
                                            return status === 'confirmed' || status === 'used'
                                        }).map((t: any) => (
                                            <Box key={t._id} className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded p-3'>
                                                <div className='flex-1 min-w-0'>
                                                    <div className='font-semibold text-base mb-1'>{t.code}</div>
                                                    <div className='text-sm text-textSecondary mb-1'>
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
                                                <Box className='flex justify-start sm:justify-end flex-shrink-0'>
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
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ) : (
                        <Grid item xs={12} md={5}>
                            <Card variant='outlined' sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant='h6' className='mb-4 font-semibold'>Resumo financeiro</Typography>
                                    <InfoRow label='Subtotal' value={`R$ ${(order.subtotal || 0).toFixed(2)}`} />
                                    <InfoRow label='Desconto' value={`R$ ${(order.discountAmount || 0).toFixed(2)}`} />
                                    <InfoRow label='Taxa' value={`R$ ${(order.platformFee || 0).toFixed(2)}`} />
                                    <InfoRow label='Total' value={<span className='font-semibold text-lg'>R$ {(order.totalAmount || 0).toFixed(2)}</span>} />
                                    {waLink && (
                                        <Box className='mt-4'>
                                            <Button
                                                fullWidth
                                                variant='contained'
                                                color='success'
                                                startIcon={<i className='tabler-brand-whatsapp' />}
                                                href={waLink}
                                                target='_blank'
                                                sx={{
                                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                                    py: { xs: 1.25, md: 1.5 },
                                                    fontWeight: 600
                                                }}
                                            >
                                                Contatar no WhatsApp
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>

                {/* Mostrar ingressos APENAS se o pedido foi pago ou se é VIP */}
                {!isVip && (() => {
                    const orderStatus = (order.status || '').toLowerCase()
                    const paymentStatus = (order.paymentStatus || '').toLowerCase()
                    const isPaid = orderStatus === 'paid' || paymentStatus === 'paid' || paymentStatus === 'approved'
                    const isCancelled = orderStatus === 'cancelled' || paymentStatus === 'cancelled'
                    const orderAny = order as any
                    const isExpired = paymentStatus === 'expired' || (orderAny.expiresAt && new Date(orderAny.expiresAt) < new Date() && !isPaid)
                    
                    // Só mostrar ingressos se o pedido foi pago
                    if (!isPaid || isCancelled || isExpired) {
                        return null
                    }

                    // Filtrar apenas tickets confirmados (com QR code gerado)
                    const confirmedTickets = order.tickets?.filter((t: any) => {
                        const ticketStatus = String(t.status || '').toLowerCase()
                        return ticketStatus === 'confirmed' || ticketStatus === 'used'
                    }) || []

                    // Se não houver tickets confirmados, não mostrar a seção
                    if (confirmedTickets.length === 0) {
                        return null
                    }

                    return (
                        <>
                            <Typography variant='h6' className='mt-6 mb-4 font-semibold'>Ingressos</Typography>
                            <Box className='space-y-3'>
                                {confirmedTickets.map((t: any) => (
                                    <Box key={t._id} className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded p-3'>
                                        <div className='flex-1 min-w-0'>
                                            <div className='font-semibold text-base mb-1'>{t.code}</div>
                                            <div className='text-sm text-textSecondary mb-1'>
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
                                        <Box className='flex justify-start sm:justify-end flex-shrink-0'>
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
                                    </Box>
                                ))}
                            </Box>
                        </>
                    )
                })()}

                {/* Informações do pedido parcelado - Movido para baixo */}
                {isParcelled && parcelledInfo && (
                    <Box className='mt-6'>
                        <Card variant='outlined'>
                            <CardContent>
                                <Typography variant='h6' className='mb-4 font-semibold'>Pedido Parcelado</Typography>

                                {/* Barra de progresso */}
                                <Box className='mb-5'>
                                    <Box className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2'>
                                        <Typography variant='body2' color='text.secondary' className='font-medium'>
                                            Progresso do pagamento
                                        </Typography>
                                        <Typography variant='body2' className='font-semibold text-sm sm:text-base'>
                                            {parcelledInfo.paidParcels} de {parcelledInfo.totalParcels} parcelas pagas
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant='determinate'
                                        value={parcelledInfo.progressPercentage}
                                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                                        color={parcelledInfo.progressPercentage === 100 ? 'success' : 'primary'}
                                    />
                                    <Typography variant='caption' color='text.secondary' className='block text-center text-xs sm:text-sm'>
                                        {parcelledInfo.progressPercentage}% concluído
                                    </Typography>
                                </Box>

                                <Divider className='my-4' />

                                {/* Entrada - Só mostrar se entrada estiver paga */}
                                {parcelledInfo.isEntryPaid && parcelledInfo.entryParcel && (
                                    <Box className='mb-4'>
                                        <Typography variant='subtitle2' className='mb-3 font-semibold'>Entrada (1/{parcelledInfo.totalParcels})</Typography>
                                        <Box className='p-4 rounded bg-actionHover'>
                                            <Box className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3'>
                                                <div className='flex-1'>
                                                    <Typography variant='body1' className='font-bold text-xl md:text-lg mb-1'>
                                                        R$ {parcelledInfo.entryParcel.amount.toFixed(2).replace('.', ',')}
                                                    </Typography>
                                                    <Typography variant='body2' color='text.secondary' className='text-sm md:text-base'>
                                                        Venc: {formatDate(parcelledInfo.entryParcel.dueDate)}
                                                    </Typography>
                                                </div>
                                                <Box className='flex justify-start md:justify-end'>
                                                    <Chip
                                                        size='small'
                                                        label={parcelledInfo.entryParcel.status === 'paid' ? 'PAGA' : 'PENDENTE'}
                                                        color={parcelledInfo.entryParcel.status === 'paid' ? 'success' : 'warning'}
                                                        variant='tonal'
                                                        sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                                                    />
                                                </Box>
                                            </Box>
                                            {parcelledInfo.entryParcel.status !== 'paid' && getWhatsAppLinkForParcel(parcelledInfo.entryParcel, true) && (
                                                <Button
                                                    fullWidth
                                                    variant='contained'
                                                    color='success'
                                                    startIcon={<i className='tabler-brand-whatsapp' />}
                                                    href={getWhatsAppLinkForParcel(parcelledInfo.entryParcel, true) || '#'}
                                                    target='_blank'
                                                    sx={{
                                                        fontSize: { xs: '0.875rem', md: '1rem' },
                                                        py: { xs: 1.25, md: 1.5 },
                                                        mt: 1
                                                    }}
                                                >
                                                    Contatar no WhatsApp
                                                </Button>
                                            )}
                                        </Box>
                                    </Box>
                                )}

                                {/* Mensagem quando entrada não está paga - APENAS O ALERTA, sem detalhes */}
                                {!parcelledInfo.isEntryPaid && (
                                    <Box className='mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4'>
                                        <Box className='flex items-start gap-3'>
                                            <i className='tabler-alert-triangle text-xl text-amber-600 flex-shrink-0 mt-0.5' />
                                            <Box className='flex-1'>
                                                <Typography variant='body2' className='font-semibold text-amber-800 mb-1'>
                                                    Cliente não pagou a entrada - pedido não efetivado
                                                </Typography>
                                                <Typography variant='caption' className='text-amber-700 block'>
                                                    O pedido só será efetivado após o pagamento da entrada. As demais parcelas serão liberadas automaticamente após a confirmação do pagamento.
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}

                                {/* Demais parcelas - Só mostrar se entrada estiver paga */}
                                {parcelledInfo.isEntryPaid && parcelledInfo.upcomingParcels && parcelledInfo.upcomingParcels.length > 0 && (
                                    <Box>
                                        <Typography variant='subtitle2' className='mb-3 font-semibold'>Demais Parcelas</Typography>
                                        <Box className='space-y-3'>
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
                                                
                                                // Padronizar numeração: entrada é 1, então primeira parcela após entrada é 2
                                                // parcel.sequence começa em 1 (primeira parcela após entrada), então adicionamos 1 para contar a entrada
                                                const parcelNumber = parcel.sequence + 1

                                                return (
                                                    <Box key={parcel._id} className='p-4 rounded bg-actionHover'>
                                                        <Box className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3'>
                                                            <div className='flex-1'>
                                                                <Typography variant='body1' className='font-bold text-xl md:text-lg mb-1'>
                                                                    Parcela {parcelNumber}/{parcelledInfo.totalParcels} • R$ {parcel.amount.toFixed(2).replace('.', ',')}
                                                                </Typography>
                                                                <Typography variant='body2' color='text.secondary' className='text-sm md:text-base'>
                                                                    Venc: {formatDate(parcel.dueDate)}
                                                                </Typography>
                                                            </div>
                                                            <Box className='flex justify-start md:justify-end'>
                                                                <Chip
                                                                    size='small'
                                                                    label={statusLabel}
                                                                    color={statusColor as any}
                                                                    variant='tonal'
                                                                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                        {/* Botão WhatsApp apenas para parcelas não pagas */}
                                                        {parcel.status !== 'paid' && getWhatsAppLinkForParcel(parcel, false) && (
                                                            <Button
                                                                fullWidth
                                                                variant='contained'
                                                                color='success'
                                                                startIcon={<i className='tabler-brand-whatsapp' />}
                                                                href={getWhatsAppLinkForParcel(parcel, false) || '#'}
                                                                target='_blank'
                                                                sx={{
                                                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                                                    py: { xs: 1.25, md: 1.5 },
                                                                    mt: 1
                                                                }}
                                                            >
                                                                Contatar no WhatsApp
                                                            </Button>
                                                        )}
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </CardContent>
        </Card>
    )
}


