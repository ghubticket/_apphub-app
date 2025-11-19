'use client'

import { useEffect, useState } from 'react'

import { useRouter, useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid2'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, string, pipe, nonEmpty, minLength, maxLength, number, minValue, maxValue, regex, optional, transform } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

import CustomTextField from '@core/components/mui/TextField'
import CustomAutocomplete from '@core/components/mui/Autocomplete'

import { AdminOnly } from '@/components/RoleGuard'
import { promoterCodeService } from '@/services/promoterCodeService'
import { useEvents } from '@/hooks/useEvents'

type FormData = InferInput<typeof schema>

const schema = object({
    code: pipe(
        string(),
        nonEmpty('Código é obrigatório'),
        minLength(3, 'Código deve ter pelo menos 3 caracteres'),
        maxLength(50, 'Código deve ter no máximo 50 caracteres'),
        regex(/^[A-Z0-9]+$/, 'Código deve conter apenas letras maiúsculas e números')
    ),
    name: pipe(
        string(),
        nonEmpty('Nome é obrigatório'),
        minLength(3, 'Nome deve ter pelo menos 3 caracteres'),
        maxLength(200, 'Nome deve ter no máximo 200 caracteres')
    ),
    cpf: pipe(
        string(),
        nonEmpty('CPF é obrigatório'),
        regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00')
    ),
    email: pipe(
        string(),
        nonEmpty('Email é obrigatório'),
        regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email deve ter um formato válido')
    ),
    whatsapp: pipe(
        string(),
        nonEmpty('WhatsApp é obrigatório'),
        regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'WhatsApp deve estar no formato (11) 99999-9999')
    ),
    discountType: string(),
    discountValue: pipe(
        string(),
        transform((val) => {
            if (val === '' || val === null || val === undefined) return 0
            const num = Number(val)

            
return isNaN(num) ? 0 : num
        }),
        number(),
        minValue(0, 'Valor do desconto não pode ser negativo')
    ),
    events: optional(string()), // Será tratado como any no onSubmit
    isActive: optional(string()), // Será tratado como boolean no onSubmit
})

const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')

    if (numbers.length <= 11) {
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    
return value
}

const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '')

    if (numbers.length <= 11) {
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
        }

        
return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }

    
return value
}

const PromoterCodeEditPage = () => {
    const router = useRouter()
    const { lang, id } = useParams()
    const { events, loading: eventsLoading } = useEvents({ page: 1, limit: 99999 })
    const [loading, setLoading] = useState(true)
    const [codeData, setCodeData] = useState<any>(null)

    const {
        control,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: valibotResolver(schema),
    })

    const discountType = watch('discountType')
    const discountValueStr = watch('discountValue')
    const discountValue = typeof discountValueStr === 'string' ? Number(discountValueStr) : discountValueStr

    useEffect(() => {
        const fetchCode = async () => {
            try {
                setLoading(true)
                const response = await promoterCodeService.getById(id as string)
                const data = response.data

                setCodeData(data)
                reset({
                    code: data.code,
                    name: data.name,
                    cpf: data.cpf,
                    email: data.email,
                    whatsapp: data.whatsapp,
                    discountType: data.discountType,
                    discountValue: String(data.discountValue || 0), // Converter número para string
                    isActive: data.isActive ? 'true' : 'false', // Converter boolean para string
                    events: data.events || [],
                } as any)
            } catch (error: any) {
                console.error('Erro ao carregar código:', error)
                alert('Erro ao carregar código de promotor')
                router.push(`/${lang}/apps/promoters/list`)
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            fetchCode()
        }
    }, [id, router, lang, reset])

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        try {
            // Garantir que discountValue seja número
            const discountValueNum = typeof data.discountValue === 'string' 
                ? Number(data.discountValue) 
                : data.discountValue

            // Validar desconto
            if (discountType === 'percentage' && (discountValueNum < 0 || discountValueNum > 100)) {
                alert('Desconto percentual deve estar entre 0 e 100')
                
return
            }

            if (discountType === 'fixed' && discountValueNum < 0) {
                alert('Desconto fixo não pode ser negativo')
                
return
            }

            const selectedEvents = (data as any).events || []

            await promoterCodeService.update(id as string, {
                code: data.code.toUpperCase(),
                name: data.name,
                cpf: data.cpf,
                email: data.email.toLowerCase(),
                whatsapp: data.whatsapp,
                discountType: data.discountType as 'percentage' | 'fixed',
                discountValue: discountValueNum,
                events: selectedEvents.map((e: any) => e._id || e),
                isActive: (data as any).isActive !== undefined ? (data as any).isActive : true,
            })
            router.push(`/${lang}/apps/promoters/list`)
        } catch (error: any) {
            console.error('Erro ao atualizar código:', error)
            alert(error.message || 'Erro ao atualizar código de promotor')
        }
    }

    if (loading) {
        return (
            <AdminOnly>
                <Card>
                    <CardContent>
                        <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
                            <CircularProgress />
                        </Box>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    return (
        <AdminOnly>
            <Card>
                <CardHeader title='Editar Código de Promotor' />
                <CardContent>
                    {codeData && (
                        <Box className='mb-6'>
                            <Typography variant='body2' color='text.secondary'>
                                Usos: {codeData.currentUses || 0}
                            </Typography>
                        </Box>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name='code'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <CustomTextField
                                            {...field}
                                            fullWidth
                                            label='Código'
                                            placeholder='Ex: GUILHERME123'
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name='name'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <CustomTextField
                                            {...field}
                                            fullWidth
                                            label='Nome do Promotor'
                                            placeholder='Nome completo'
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name='cpf'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <CustomTextField
                                            {...field}
                                            fullWidth
                                            label='CPF'
                                            placeholder='000.000.000-00'
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            onChange={(e) => {
                                                const formatted = formatCPF(e.target.value)

                                                field.onChange(formatted)
                                            }}
                                            inputProps={{
                                                maxLength: 14
                                            }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name='email'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <CustomTextField
                                            {...field}
                                            fullWidth
                                            type='email'
                                            label='Email'
                                            placeholder='email@exemplo.com'
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name='whatsapp'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <CustomTextField
                                            {...field}
                                            fullWidth
                                            label='WhatsApp'
                                            placeholder='(11) 99999-9999'
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            onChange={(e) => {
                                                const formatted = formatWhatsApp(e.target.value)

                                                field.onChange(formatted)
                                            }}
                                            inputProps={{
                                                maxLength: 15
                                            }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name='discountType'
                                    control={control}
                                    render={({ field }) => (
                                        <CustomTextField
                                            {...field}
                                            select
                                            fullWidth
                                            label='Tipo de Desconto'
                                        >
                                            <MenuItem value='percentage'>Percentual (%)</MenuItem>
                                            <MenuItem value='fixed'>Valor Fixo (R$)</MenuItem>
                                        </CustomTextField>
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name='discountValue'
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <CustomTextField
                                            {...field}
                                            fullWidth
                                            type='number'
                                            label={discountType === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
                                            placeholder={discountType === 'percentage' ? 'Ex: 10' : 'Ex: 50'}
                                            error={!!fieldState.error}
                                            helperText={
                                                fieldState.error?.message ||
                                                (discountType === 'percentage'
                                                    ? 'Valor entre 0 e 100'
                                                    : 'Valor em reais')
                                            }
                                            inputProps={{
                                                min: 0,
                                                max: discountType === 'percentage' ? 100 : undefined,
                                                step: discountType === 'percentage' ? 1 : 0.01,
                                            }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name='events'
                                    control={control}
                                    render={({ field }) => (
                                        <CustomAutocomplete
                                            multiple
                                            options={events || []}
                                            getOptionLabel={(option: any) => option.name || ''}
                                            value={(Array.isArray(field.value) ? field.value : []) || []}
                                            onChange={(_, newValue) => field.onChange(newValue)}
                                            loading={eventsLoading}
                                            renderInput={(params) => (
                                                <CustomTextField
                                                    {...params}
                                                    label='Eventos'
                                                    placeholder='Selecione os eventos'
                                                />
                                            )}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name='isActive'
                                    control={control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={field.value === 'true'}
                                                    onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                                                />
                                            }
                                            label='Ativo'
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Box className='flex items-center gap-4'>
                                    <Button
                                        type='submit'
                                        variant='contained'
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <CircularProgress size={20} className='mr-2' />
                                                Atualizando...
                                            </>
                                        ) : (
                                            'Atualizar Código'
                                        )}
                                    </Button>
                                    <Button
                                        variant='outlined'
                                        onClick={() => router.back()}
                                    >
                                        Cancelar
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </AdminOnly>
    )
}

export default PromoterCodeEditPage

