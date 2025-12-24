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
import Divider from '@mui/material/Divider'

import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, string, number, pipe, nonEmpty, minLength, minValue, maxValue, optional } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

import CustomTextField from '@core/components/mui/TextField'
import IconButton from '@mui/material/IconButton'

import { AdminOnly } from '@/components/RoleGuard'
import { useTicketTypes } from '@/hooks/useTicketTypes'
import type { CreateTicketTypeData } from '@/services/ticketTypeService'

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
    // Remove tudo exceto números e vírgula
    const cleaned = value.replace(/[^\d,]/g, '')

    // Substitui vírgula por ponto e converte para número
    const numValue = parseFloat(cleaned.replace(',', '.')) || 0

    
return numValue
}

// Função para aplicar máscara enquanto digita
const applyCurrencyMask = (value: string): string => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '')
    
    if (numbers === '') return ''
    
    // Converte para número (centavos)
    const numValue = parseFloat(numbers) / 100
    
    // Formata como moeda
    return formatCurrency(numValue)
}

type FormData = InferInput<typeof schema>

const schema = object({
    name: pipe(string(), nonEmpty('Nome é obrigatório'), minLength(2, 'Nome deve ter pelo menos 2 caracteres')),
    description: optional(string()),
    price: pipe(number(), minValue(0, 'Preço não pode ser negativo'), maxValue(10000, 'Preço não pode ser maior que R$ 10.000')),
    lotNumber: pipe(number(), minValue(1, 'Número do lote deve ser pelo menos 1')),
    maxQuantity: pipe(number(), minValue(1, 'Quantidade máxima deve ser pelo menos 1'), maxValue(100000, 'Quantidade máxima não pode ser maior que 100.000')),
    maxPerPurchase: pipe(number(), minValue(1, 'Limite por compra deve ser pelo menos 1'), maxValue(50, 'Limite por compra não pode ser maior que 50')),
})

const CreateTicketTypePage = () => {
    const router = useRouter()
    const { lang, id } = useParams()
    const { createTicketType, loading, error } = useTicketTypes(id as string)
    const [isVIP, setIsVIP] = useState(false)
    const [priceDisplay, setPriceDisplay] = useState('')
    const [allowInstallments, setAllowInstallments] = useState(false)
    const [minInstallments, setMinInstallments] = useState<number | ''>('')
    const [maxInstallments, setMaxInstallments] = useState<number | ''>('')
    const [isTransport, setIsTransport] = useState(false)
    const [transportOptions, setTransportOptions] = useState<Array<{
        date: string;
        attraction: string;
        departureLocations: string[];
    }>>([{ date: '', attraction: '', departureLocations: [''] }])

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        setError,
    } = useForm<FormData>({
        resolver: valibotResolver(schema),
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            lotNumber: 1,
            maxQuantity: 100,
            maxPerPurchase: 5,
        },
    })

    const [serverError, setServerError] = useState<string | null>(null)

    // Limpar opções de transporte quando desmarcar transporte
    useEffect(() => {
        if (!isTransport) {
            setTransportOptions([{ date: '', attraction: '', departureLocations: [''] }])
        }
    }, [isTransport])

    // Atualizar preço quando VIP mudar
    useEffect(() => {
        if (isVIP) {
            setValue('price', 0)
            setPriceDisplay('R$ 0,00')
        }
    }, [isVIP, setValue])

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
            // Validação crítica: não permitir preço zero para tickets não-VIP
            if (!isVIP && (data.price === 0 || data.price === null || data.price === undefined)) {
                setError('price', {
                    type: 'manual',
                    message: 'Preço não pode ser zero. Para ingressos gratuitos, marque como VIP.',
                })
                setServerError('Preço não pode ser zero. Para ingressos gratuitos, marque como VIP.')
                return
            }

            // Validações simples de parcelamento
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

            // Validação para transporte
            if (isTransport) {
                const validOptions = transportOptions.filter(opt => 
                    opt.date.trim() && 
                    opt.attraction.trim() && 
                    opt.departureLocations.some(loc => loc.trim())
                )
                
                if (validOptions.length === 0) {
                    setServerError('Adicione pelo menos uma data/atração com locais de saída para o transporte.')
                    return
                }
                
                // Validar que cada opção tem pelo menos um local válido
                for (const opt of validOptions) {
                    const validLocations = opt.departureLocations.filter(loc => loc.trim())
                    if (validLocations.length === 0) {
                        setServerError(`A data "${opt.date}" com atração "${opt.attraction}" precisa ter pelo menos um local de saída.`)
                        return
                    }
                }
            }

            const ticketTypeData: CreateTicketTypeData = {
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
                isTransport: isTransport || undefined,
                transportOptions: isTransport ? transportOptions
                    .filter(opt => opt.date.trim() && opt.attraction.trim() && opt.departureLocations.some(loc => loc.trim()))
                    .map(opt => ({
                        date: opt.date.trim(),
                        attraction: opt.attraction.trim(),
                        departureLocations: opt.departureLocations.filter(loc => loc.trim()).map(loc => loc.trim())
                    })) : undefined,
            }

            await createTicketType(ticketTypeData)
            router.push(`/${lang}/apps/events/view/${id}/tickets/list`)
        } catch (err: any) {
            console.error('Erro ao criar tipo de ingresso:', err)
            
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
                setServerError(err.message || 'Erro ao criar tipo de ingresso')
            } else {
                setServerError(err.message || 'Erro ao criar tipo de ingresso')
            }
        }
    }

    return (
        <AdminOnly>
            <Grid container spacing={6}>
                <Grid size={12}>
                    <Card>
                        <CardHeader
                            title='Cadastrar Tipo de Ingresso'
                            subheader='Configure os detalhes do tipo de ingresso para este evento'
                        />
                        <CardContent>
                            {(error || serverError) && (
                                <Alert severity='error' sx={{ mb: 4 }}>
                                    {error || serverError}
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

                                    {/* Preço e Quantidades - Ordem de prioridade */}
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

                                    {/* Opções Especiais */}
                                    <Grid size={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
                                            Opções Especiais
                                        </Typography>
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

                                    <Grid size={12}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={isTransport}
                                                    onChange={(e) => setIsTransport(e.target.checked)}
                                                />
                                            }
                                            label='É transporte?'
                                        />
                                    </Grid>

                                    {isTransport && (
                                        <Grid size={12}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Typography variant="h6">
                                                    Opções de Transporte (Datas + Atrações)
                                                </Typography>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<i className="tabler-plus" />}
                                                    onClick={() => setTransportOptions([...transportOptions, { date: '', attraction: '', departureLocations: [''] }])}
                                                >
                                                    Adicionar Data/Atração
                                                </Button>
                                            </Box>
                                            
                                            {transportOptions.map((option, optionIndex) => (
                                                <Card key={optionIndex} variant="outlined" sx={{ mb: 4 }}>
                                                    <CardContent sx={{ p: 4 }}>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                                            <Typography variant="subtitle1" fontWeight={600}>
                                                                Opção {optionIndex + 1}
                                                            </Typography>
                                                            {transportOptions.length > 1 && (
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => {
                                                                        const newOptions = transportOptions.filter((_, i) => i !== optionIndex)
                                                                        setTransportOptions(newOptions.length > 0 ? newOptions : [{ date: '', attraction: '', departureLocations: [''] }])
                                                                    }}
                                                                >
                                                                    <i className="tabler-trash" />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                        
                                                        <Grid container spacing={3}>
                                                            <Grid size={{ xs: 12, md: 6 }}>
                                                                <CustomTextField
                                                                    fullWidth
                                                                    label="Data do Evento"
                                                                    placeholder="Ex: 07/09/2026"
                                                                    required
                                                                    value={option.date}
                                                                    onChange={(e) => {
                                                                        const newOptions = [...transportOptions]
                                                                        newOptions[optionIndex].date = e.target.value
                                                                        setTransportOptions(newOptions)
                                                                    }}
                                                                />
                                                            </Grid>
                                                            <Grid size={{ xs: 12, md: 6 }}>
                                                                <CustomTextField
                                                                    fullWidth
                                                                    label="Atração"
                                                                    placeholder="Ex: Elton John"
                                                                    required
                                                                    value={option.attraction}
                                                                    onChange={(e) => {
                                                                        const newOptions = [...transportOptions]
                                                                        newOptions[optionIndex].attraction = e.target.value
                                                                        setTransportOptions(newOptions)
                                                                    }}
                                                                />
                                                            </Grid>
                                                            
                                                            <Grid size={12}>
                                                                <Divider sx={{ my: 3 }} />
                                                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 3 }}>
                                                                    Locais de Embarque
                                                                </Typography>
                                                                
                                                                <Box sx={{ mb: 5 }}>
                                                                    {option.departureLocations.map((location, locIndex) => (
                                                                        <Box key={locIndex} display="flex" gap={2} className="mb-10" alignItems="flex-start">
                                                                            <CustomTextField
                                                                                fullWidth
                                                                                label={`Local de Saída ${locIndex + 1}`}
                                                                                placeholder='Ex: São Paulo - Metrô Barra Funda'
                                                                                required
                                                                                value={location}
                                                                                onChange={(e) => {
                                                                                    const newOptions = [...transportOptions]
                                                                                    newOptions[optionIndex].departureLocations[locIndex] = e.target.value
                                                                                    setTransportOptions(newOptions)
                                                                                }}
                                                                            />
                                                                            {option.departureLocations.length > 1 && (
                                                                                <IconButton
                                                                                    size="small"
                                                                                    color="error"
                                                                                    onClick={() => {
                                                                                        const newOptions = [...transportOptions]
                                                                                        newOptions[optionIndex].departureLocations = newOptions[optionIndex].departureLocations.filter((_, i) => i !== locIndex)
                                                                                        if (newOptions[optionIndex].departureLocations.length === 0) {
                                                                                            newOptions[optionIndex].departureLocations = ['']
                                                                                        }
                                                                                        setTransportOptions(newOptions)
                                                                                    }}
                                                                                    sx={{ 
                                                                                        minWidth: 'auto',
                                                                                        width: 32,
                                                                                        height: 32,
                                                                                        flexShrink: 0,
                                                                                        mt: '1rem'
                                                                                    }}
                                                                                >
                                                                                    <i className="tabler-trash" style={{ fontSize: '16px' }} />
                                                                                </IconButton>
                                                                            )}
                                                                        </Box>
                                                                    ))}
                                                                </Box>
                                                                
                                                                <Button
                                                                    variant="outlined"
                                                                    size="small"
                                                                    startIcon={<i className="tabler-plus" />}
                                                                    onClick={() => {
                                                                        const newOptions = [...transportOptions]
                                                                        newOptions[optionIndex].departureLocations.push('')
                                                                        setTransportOptions(newOptions)
                                                                    }}
                                                                    sx={{ mt: 1 }}
                                                                >
                                                                    Adicionar Local
                                                                </Button>
                                                            </Grid>
                                                        </Grid>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </Grid>
                                    )}

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
                                                disabled={loading}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                type='submit'
                                                variant='contained'
                                                disabled={loading}
                                            >
                                                {loading ? 'Salvando...' : 'Criar Tipo de Ingresso'}
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

export default CreateTicketTypePage

