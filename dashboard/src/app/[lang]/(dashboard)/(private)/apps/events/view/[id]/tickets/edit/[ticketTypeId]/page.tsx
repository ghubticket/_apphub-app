'use client'

import { useEffect, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, string, number, pipe, nonEmpty, minLength, minValue, maxValue, optional } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

import CustomTextField from '@core/components/mui/TextField'

import { AdminOnly } from '@/components/RoleGuard'
import { useTicketTypes } from '@/hooks/useTicketTypes'
import * as ticketTypeService from '@/services/ticketTypeService'
import type { UpdateTicketTypeData } from '@/services/ticketTypeService'

type FormData = InferInput<typeof schema>

const schema = object({
    name: pipe(string(), nonEmpty('Nome é obrigatório'), minLength(2, 'Nome deve ter pelo menos 2 caracteres')),
    description: optional(string()),
    price: pipe(number(), minValue(0, 'Preço não pode ser negativo'), maxValue(10000, 'Preço não pode ser maior que R$ 10.000')),
    lotNumber: pipe(number(), minValue(1, 'Número do lote deve ser pelo menos 1')),
    maxQuantity: pipe(number(), minValue(1, 'Quantidade máxima deve ser pelo menos 1'), maxValue(100000, 'Quantidade máxima não pode ser maior que 100.000')),
    maxPerPurchase: pipe(number(), minValue(1, 'Limite por compra deve ser pelo menos 1'), maxValue(50, 'Limite por compra não pode ser maior que 50')),
})

// Função para formatar número para moeda brasileira
const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : value

    
return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numValue)
}

// Função para converter valor formatado para número
const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '')
    const numValue = parseFloat(cleaned.replace(',', '.')) || 0

    
return numValue
}

// Função para aplicar máscara enquanto digita
const applyCurrencyMask = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    
    if (numbers === '') return ''
    
    const numValue = parseFloat(numbers) / 100

    
return formatCurrency(numValue)
}

const EditTicketTypePage = () => {
    const router = useRouter()
    const { lang, id, ticketTypeId } = useParams()
    const { updateTicketType, loading: hookLoading, error: hookError } = useTicketTypes(id as string)
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [ticketType, setTicketType] = useState<ticketTypeService.TicketTypeItem | null>(null)
    const [isVIP, setIsVIP] = useState(false)
    const [priceDisplay, setPriceDisplay] = useState('')
    const [allowInstallments, setAllowInstallments] = useState(false)
    const [minInstallments, setMinInstallments] = useState<number | ''>('')
    const [maxInstallments, setMaxInstallments] = useState<number | ''>('')

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        reset,
        setError,
    } = useForm<FormData>({
        resolver: valibotResolver(schema),
    })

    const [serverError, setServerError] = useState<string | null>(null)

    // Carregar dados do tipo de ingresso
    useEffect(() => {
        const fetchTicketType = async () => {
            if (!ticketTypeId) return

            setLoading(true)
            setFetchError(null)

            try {
                const data = await ticketTypeService.getTicketType(ticketTypeId as string)

                setTicketType(data)
                setIsVIP(data.isVIP)
                setAllowInstallments(!!data.allowInstallments)
                setMinInstallments(
                    typeof data.minInstallments === 'number' ? data.minInstallments : ''
                )
                setMaxInstallments(
                    typeof data.maxInstallments === 'number' ? data.maxInstallments : ''
                )

                // Preencher formulário
                reset({
                    name: data.name,
                    description: data.description || '',
                    price: data.price,
                    lotNumber: data.lotNumber,
                    maxQuantity: data.maxQuantity,
                    maxPerPurchase: data.maxPerPurchase,
                })

                // Preencher preço formatado
                setPriceDisplay(formatCurrency(data.price))
            } catch (err: any) {
                setFetchError(err.message || 'Erro ao carregar tipo de ingresso')
                console.error('Erro ao buscar tipo de ingresso:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchTicketType()
    }, [ticketTypeId, reset])

    // Atualizar preço quando VIP mudar
    useEffect(() => {
        if (isVIP && ticketType) {
            setValue('price', 0)
            setPriceDisplay('R$ 0,00')
        } else if (!isVIP && ticketType) {
            setPriceDisplay(formatCurrency(ticketType.price))
        }
    }, [isVIP, setValue, ticketType])

    // Sincronizar display do preço com o valor do formulário
    const price = watch('price')

    useEffect(() => {
        if (!isVIP && price !== undefined) {
            setPriceDisplay(formatCurrency(price))
        }
    }, [price, isVIP])

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        setServerError(null)
        
        try {
            if (allowInstallments) {
                if (!maxInstallments || Number(maxInstallments) < 2) {
                    setServerError('Defina pelo menos 2 parcelas máximas para habilitar o parcelamento.')
                    return
                }
                if (minInstallments && maxInstallments && Number(minInstallments) > Number(maxInstallments)) {
                    setServerError('Parcelas mínimas não podem ser maiores que parcelas máximas.')
                    return
                }
            }

            const ticketTypeData: UpdateTicketTypeData = {
                name: data.name,
                description: data.description || undefined,
                price: isVIP ? 0 : data.price,
                isVIP,
                lotNumber: data.lotNumber,
                maxQuantity: data.maxQuantity,
                maxPerPurchase: data.maxPerPurchase,
                allowInstallments,
                minInstallments: allowInstallments && minInstallments !== '' ? Number(minInstallments) : null,
                maxInstallments: allowInstallments && maxInstallments !== '' ? Number(maxInstallments) : null,
            }

            await updateTicketType(ticketTypeId as string, ticketTypeData)
            router.push(`/${lang}/apps/events/view/${id}/tickets/list`)
        } catch (err: any) {
            console.error('Erro ao atualizar tipo de ingresso:', err)
            
            // Se houver erros de validação do backend, aplicar aos campos
            if (err.validationErrors) {
                Object.keys(err.validationErrors).forEach((field) => {
                    const fieldName = field as keyof FormData
                    const errorMessage = err.validationErrors[field]

                    setError(fieldName, {
                        type: 'server',
                        message: errorMessage,
                    })
                })
                setServerError(err.message || 'Erro ao atualizar tipo de ingresso')
            } else {
                setServerError(err.message || 'Erro ao atualizar tipo de ingresso')
            }
        }
    }

    if (loading) {
        return (
            <AdminOnly>
                <Card>
                    <CardContent>
                        <Box className='flex items-center justify-center py-12'>
                            <Typography>Carregando...</Typography>
                        </Box>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    if (!ticketType) {
        return (
            <AdminOnly>
                <Card>
                    <CardContent>
                        <Alert severity='error'>Tipo de ingresso não encontrado</Alert>
                        <Button
                            variant='outlined'
                            onClick={() => router.push(`/${lang}/apps/events/view/${id}/tickets/list`)}
                            sx={{ mt: 2 }}
                        >
                            Voltar
                        </Button>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    return (
        <AdminOnly>
            <Grid container spacing={6}>
                <Grid size={12}>
                    <Card>
                        <CardHeader
                            title='Editar Tipo de Ingresso'
                            subheader={`Editando: ${ticketType.name}`}
                        />
                        <CardContent>
                            {(fetchError || hookError || serverError) && (
                                <Alert severity='error' sx={{ mb: 4 }}>
                                    {fetchError || hookError || serverError}
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)}>
                                <Grid container spacing={6}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name='name'
                                            control={control}
                                            render={({ field }) => (
                                                <CustomTextField
                                                    {...field}
                                                    fullWidth
                                                    label='Nome do Tipo de Ingresso'
                                                    placeholder='Ex: Pista, VIP, Meia-entrada'
                                                    error={!!errors.name}
                                                    helperText={errors.name?.message}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name='lotNumber'
                                            control={control}
                                            render={({ field }) => (
                                                <CustomTextField
                                                    {...field}
                                                    fullWidth
                                                    type='number'
                                                    label='Número do Lote'
                                                    placeholder='Ex: 1, 2, 3...'
                                                    error={!!errors.lotNumber}
                                                    helperText={errors.lotNumber?.message || 'Número único do lote para este evento'}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={12}>
                                        <Controller
                                            name='description'
                                            control={control}
                                            render={({ field }) => (
                                                <CustomTextField
                                                    {...field}
                                                    fullWidth
                                                    multiline
                                                    rows={3}
                                                    label='Descrição (Opcional)'
                                                    placeholder='Descreva o tipo de ingresso...'
                                                    error={!!errors.description}
                                                    helperText={errors.description?.message}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={12}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={isVIP}
                                                    onChange={(e) => setIsVIP(e.target.checked)}
                                                />
                                            }
                                            label='Ingresso VIP (sem valor nem taxa)'
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name='price'
                                            control={control}
                                            render={({ field }) => (
                                                <CustomTextField
                                                    fullWidth
                                                    label='Preço (R$)'
                                                    placeholder='0,00'
                                                    error={!!errors.price}
                                                    helperText={errors.price?.message}
                                                    disabled={isVIP}
                                                    value={priceDisplay}
                                                    onChange={(e) => {
                                                        const masked = applyCurrencyMask(e.target.value)

                                                        setPriceDisplay(masked)
                                                        const numValue = parseCurrency(masked)

                                                        field.onChange(numValue)
                                                    }}
                                                    onBlur={field.onBlur}
                                                    inputProps={{
                                                        inputMode: 'numeric',
                                                    }}
                                                />
                                            )}
                                        />
                                        {isVIP && (
                                            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                                                Ingressos VIP têm preço 0 automaticamente
                                            </Typography>
                                        )}
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name='maxPerPurchase'
                                            control={control}
                                            render={({ field }) => (
                                                <CustomTextField
                                                    {...field}
                                                    fullWidth
                                                    type='number'
                                                    label='Limite por Compra'
                                                    placeholder='Ex: 5'
                                                    error={!!errors.maxPerPurchase}
                                                    helperText={errors.maxPerPurchase?.message || 'Quantidade máxima de ingressos por compra'}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name='maxQuantity'
                                            control={control}
                                            render={({ field }) => (
                                                <CustomTextField
                                                    {...field}
                                                    fullWidth
                                                    type='number'
                                                    label='Quantidade Máxima por Lote'
                                                    placeholder='Ex: 200'
                                                    error={!!errors.maxQuantity}
                                                    helperText={errors.maxQuantity?.message || 'Quantidade total de ingressos disponíveis neste lote'}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    <Grid size={12}>
                                        <Typography variant='h6' sx={{ mt: 4, mb: 2 }}>
                                            Parcelamento (Pix/Boleto)
                                        </Typography>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={allowInstallments}
                                                    onChange={e => setAllowInstallments(e.target.checked)}
                                                />
                                            }
                                            label='Permitir compra parcelada para este tipo de ingresso'
                                        />
                                    </Grid>

                                    {allowInstallments && (
                                        <>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <CustomTextField
                                                    fullWidth
                                                    type='number'
                                                    label='Parcelas mínimas (opcional)'
                                                    placeholder='Ex: 3'
                                                    value={minInstallments}
                                                    onChange={e => {
                                                        const v = e.target.value === '' ? '' : Number(e.target.value)
                                                        setMinInstallments(v)
                                                    }}
                                                    inputProps={{ min: 2, max: 60 }}
                                                    helperText='Número mínimo de parcelas que o cliente pode escolher'
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <CustomTextField
                                                    fullWidth
                                                    type='number'
                                                    label='Parcelas máximas'
                                                    placeholder='Ex: 12'
                                                    value={maxInstallments}
                                                    onChange={e => {
                                                        const v = e.target.value === '' ? '' : Number(e.target.value)
                                                        setMaxInstallments(v)
                                                    }}
                                                    inputProps={{ min: 2, max: 60 }}
                                                    helperText='Número máximo de parcelas permitidas neste tipo de ingresso'
                                                />
                                            </Grid>
                                        </>
                                    )}

                                    <Grid size={12}>
                                        <Box className='flex gap-4 justify-end'>
                                            <Button
                                                variant='tonal'
                                                color='secondary'
                                                onClick={() => router.push(`/${lang}/apps/events/view/${id}/tickets/list`)}
                                                disabled={loading || hookLoading}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                type='submit'
                                                variant='contained'
                                                disabled={loading || hookLoading}
                                            >
                                                {loading || hookLoading ? 'Salvando...' : 'Salvar Alterações'}
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </AdminOnly>
    )
}

export default EditTicketTypePage

