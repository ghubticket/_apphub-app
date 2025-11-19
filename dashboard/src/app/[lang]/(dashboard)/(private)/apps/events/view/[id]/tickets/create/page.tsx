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
import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

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
    salesStart: optional(string()),
    salesEnd: optional(string()),
})

const CreateTicketTypePage = () => {
    const router = useRouter()
    const { lang, id } = useParams()
    const { createTicketType, loading, error } = useTicketTypes(id as string)
    const [isVIP, setIsVIP] = useState(false)
    const [salesStart, setSalesStart] = useState<Date | null>(null)
    const [salesEnd, setSalesEnd] = useState<Date | null>(null)
    const [priceDisplay, setPriceDisplay] = useState('')

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
            const ticketTypeData: CreateTicketTypeData = {
                name: data.name,
                description: data.description || undefined,
                price: isVIP ? 0 : data.price,
                isVIP,
                lotNumber: data.lotNumber,
                maxQuantity: data.maxQuantity,
                maxPerPurchase: data.maxPerPurchase,
                salesStart: salesStart ? salesStart.toISOString() : undefined,
                salesEnd: salesEnd ? salesEnd.toISOString() : undefined,
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

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <AppReactDatepicker
                                            selected={salesStart}
                                            onChange={(date: Date | null) => setSalesStart(date)}
                                            placeholderText='Data de Início da Venda (Opcional)'
                                            showTimeSelect
                                            dateFormat='dd/MM/yyyy HH:mm'
                                            isClearable
                                            customInput={
                                                <CustomTextField
                                                    fullWidth
                                                    label='Data de Início da Venda'
                                                    helperText='Quando as vendas deste tipo de ingresso começam'
                                                />
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <AppReactDatepicker
                                            selected={salesEnd}
                                            onChange={(date: Date | null) => setSalesEnd(date)}
                                            placeholderText='Data de Fim da Venda (Opcional)'
                                            showTimeSelect
                                            dateFormat='dd/MM/yyyy HH:mm'
                                            isClearable
                                            minDate={salesStart || undefined}
                                            customInput={
                                                <CustomTextField
                                                    fullWidth
                                                    label='Data de Fim da Venda'
                                                    helperText='Quando as vendas deste tipo de ingresso terminam'
                                                />
                                            }
                                        />
                                    </Grid>

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

