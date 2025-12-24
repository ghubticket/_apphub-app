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
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

import { Controller, useFieldArray, useForm } from 'react-hook-form'

import CustomTextField from '@core/components/mui/TextField'
import CustomIconButton from '@core/components/mui/IconButton'

import { AdminOnly } from '@/components/RoleGuard'
import { eventDetailsService, type EventDetailsItem, type TransportLocation, type Attraction, type PriceByLocation, type FAQ } from '@/services/eventDetailsService'
import { eventService } from '@/services/eventService'

export default function EventDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = (params?.id as string) || null

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [eventName, setEventName] = useState<string>('')

    const { control, handleSubmit, reset, formState: { errors } } = useForm<EventDetailsItem>({
        defaultValues: {
            about: { richText: '' },
            packageIncludes: { items: [] },
            transport: { departureLocations: [] },
            attractions: { items: [] },
            pricing: { pricesByLocation: [] },
            video: { url: '' },
            faq: { items: [] }
        }
    })

    const packageIncludesFields = useFieldArray({
        control,
        name: 'packageIncludes.items' as any
    })

    const transportLocationsFields = useFieldArray({
        control,
        name: 'transport.departureLocations' as any
    })

    const transportIncludesFields = useFieldArray({
        control,
        name: 'transport.includes' as any
    })

    const attractionsFields = useFieldArray({
        control,
        name: 'attractions.items'
    })

    const pricingFields = useFieldArray({
        control,
        name: 'pricing.pricesByLocation'
    })

    const faqFields = useFieldArray({
        control,
        name: 'faq.items'
    })

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

                // Buscar detalhes do evento
                try {
                    const response = await eventDetailsService.get(id)
                    if (response.success && response.data) {
                        reset({
                            about: response.data.about || { richText: '' },
                            packageIncludes: response.data.packageIncludes || { items: [] },
                            transport: response.data.transport || { departureLocations: [] },
                            attractions: response.data.attractions || { items: [] },
                            pricing: response.data.pricing || { pricesByLocation: [] },
                            video: response.data.video || { url: '' },
                            faq: response.data.faq || { items: [] }
                        })
                    }
                } catch (e: any) {
                    // Se não encontrar, começar com valores vazios
                    if (e.message?.includes('404') || e.message?.includes('não encontrado')) {
                        // OK, começar vazio
                    } else {
                        throw e
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar detalhes do evento')
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [id, reset])

    const onSubmit = async (data: EventDetailsItem) => {
        if (!id) return

        try {
            setSaving(true)
            setError(null)
            setSuccess(false)

            // Salvar TODOS os campos, mesmo que vazios, para garantir que todas as abas sejam salvas
            const cleanedData: any = {}

            // Salvar "about" (richText) se existir
            if (data.about?.richText !== undefined) {
                cleanedData.about = {
                    richText: data.about.richText || ''
                }
            }

            // Salvar "packageIncludes" - sempre salvar, mesmo se vazio
            cleanedData.packageIncludes = {
                title: data.packageIncludes?.title || undefined,
                items: (data.packageIncludes?.items || []).filter(item => item.trim())
            }

            // Salvar "transport" - sempre salvar, mesmo se vazio
            cleanedData.transport = {
                transportType: data.transport?.transportType || undefined,
                returnTime: data.transport?.returnTime || undefined,
                departureLocations: (data.transport?.departureLocations || []).filter(loc => loc.name && loc.address),
                includes: (data.transport?.includes || []).filter(item => item.trim()).length > 0 
                    ? (data.transport?.includes || []).filter(item => item.trim()) 
                    : undefined
            }

            // Salvar "attractions" - sempre salvar, mesmo se vazio
            cleanedData.attractions = {
                title: data.attractions?.title || undefined,
                groupedByDate: data.attractions?.groupedByDate || false,
                items: (data.attractions?.items || []).filter(item => item.name)
            }

            // Salvar "pricing" - sempre salvar, mesmo se vazio
            cleanedData.pricing = {
                title: data.pricing?.title || undefined,
                generalInfo: data.pricing?.generalInfo || undefined,
                pixDiscount: data.pricing?.pixDiscount || undefined,
                pricesByLocation: (data.pricing?.pricesByLocation || []).filter(price => price.locationName)
            }

            // Salvar "video" - sempre salvar, mesmo se vazio
            if (data.video) {
                cleanedData.video = {
                    url: data.video.url || '',
                    thumbnail: data.video.thumbnail || undefined,
                    title: data.video.title || undefined,
                    description: data.video.description || undefined
                }
            }

            // Salvar "faq" - sempre salvar, mesmo se vazio
            cleanedData.faq = {
                title: data.faq?.title || undefined,
                items: (data.faq?.items || []).filter(item => item.question && item.answer)
            }

            await eventDetailsService.upsert(id, cleanedData)
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar detalhes do evento')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Box className='flex flex-col items-center justify-center py-12'>
                <CircularProgress />
                <Typography variant='h6' color='text.secondary' className='mt-4'>
                    Carregando detalhes do evento...
                </Typography>
            </Box>
        )
    }

    return (
        <AdminOnly>
            <Card>
                <CardHeader
                    title={`Detalhes do Evento: ${eventName}`}
                    action={
                        <Button
                            type='submit'
                            form='event-details-form'
                            variant='contained'
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={20} /> : <i className='tabler-device-floppy' />}
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    }
                />
                <Divider />
                <CardContent>
                    {error && (
                        <Alert severity='error' className='mb-4' onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity='success' className='mb-4' onClose={() => setSuccess(false)}>
                            Detalhes salvos com sucesso!
                        </Alert>
                    )}

                    <form id='event-details-form' onSubmit={handleSubmit(onSubmit)}>
                        <Grid container spacing={4}>
                            {/* Aba: Incluso no Pacote */}
                            <Grid size={12}>
                                <Accordion defaultExpanded>
                                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                                        <Typography variant='h6'>Incluso no Pacote</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            <Grid size={12}>
                                                <Controller
                                                    name='packageIncludes.title'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Título (opcional)'
                                                            placeholder='Ex: O que está incluso'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={12}>
                                                <Box className='flex items-center justify-between mb-2'>
                                                    <Typography variant='subtitle2'>Itens Inclusos</Typography>
                                                    <Button
                                                        size='small'
                                                        variant='outlined'
                                                        startIcon={<i className='tabler-plus' />}
                                                        onClick={() => packageIncludesFields.append('' as any)}
                                                    >
                                                        Adicionar Item
                                                    </Button>
                                                </Box>
                                                {packageIncludesFields.fields.map((field, index) => (
                                                    <Box key={field.id} className='flex gap-2 mb-2'>
                                                        <Controller
                                                            name={`packageIncludes.items.${index}`}
                                                            control={control}
                                                            render={({ field }) => (
                                                                <CustomTextField
                                                                    {...field}
                                                                    fullWidth
                                                                    placeholder='Ex: Transporte ida e volta'
                                                                />
                                                            )}
                                                        />
                                                        <CustomIconButton
                                                            color='error'
                                                            onClick={() => packageIncludesFields.remove(index)}
                                                        >
                                                            <i className='tabler-trash' />
                                                        </CustomIconButton>
                                                    </Box>
                                                ))}
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>

                            {/* Aba: Transporte */}
                            <Grid size={12}>
                                <Accordion>
                                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                                        <Typography variant='h6'>Transporte</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='transport.transportType'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Tipo de Transporte'
                                                            placeholder='Ex: Ônibus de turismo luxo'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='transport.returnTime'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Horário de Retorno'
                                                            placeholder='Ex: 1 hora após o término do evento'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={12}>
                                                <Box className='flex items-center justify-between mb-2'>
                                                    <Typography variant='subtitle2'>Locais de Embarque</Typography>
                                                    <Button
                                                        size='small'
                                                        variant='outlined'
                                                        startIcon={<i className='tabler-plus' />}
                                                        onClick={() => transportLocationsFields.append({
                                                            name: '',
                                                            address: '',
                                                            meetingTime: '',
                                                            departureTime: ''
                                                        })}
                                                    >
                                                        Adicionar Local
                                                    </Button>
                                                </Box>
                                                {transportLocationsFields.fields.map((field, index) => (
                                                    <Card key={field.id} variant='outlined' className='mb-3'>
                                                        <CardContent>
                                                            <Box className='flex items-start justify-end mb-2'>
                                                                <CustomIconButton
                                                                    size='small'
                                                                    color='error'
                                                                    onClick={() => transportLocationsFields.remove(index)}
                                                                >
                                                                    <i className='tabler-trash' />
                                                                </CustomIconButton>
                                                            </Box>
                                                            <Grid container spacing={2}>
                                                                <Grid size={{ xs: 12, md: 6 }}>
                                                                    <Controller
                                                                        name={`transport.departureLocations.${index}.name`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Nome do Local'
                                                                                placeholder='Ex: São Paulo - Metrô Barra Funda'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 6 }}>
                                                                    <Controller
                                                                        name={`transport.departureLocations.${index}.price`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                type='number'
                                                                                label='Preço (opcional)'
                                                                                placeholder='0.00'
                                                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={12}>
                                                                    <Controller
                                                                        name={`transport.departureLocations.${index}.address`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Endereço'
                                                                                placeholder='Ex: Rua Tagipuru, 641'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 6 }}>
                                                                    <Controller
                                                                        name={`transport.departureLocations.${index}.meetingTime`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Horário de Concentração'
                                                                                placeholder='Ex: 06:00'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 6 }}>
                                                                    <Controller
                                                                        name={`transport.departureLocations.${index}.departureTime`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Horário de Saída'
                                                                                placeholder='Ex: 06:30'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Grid>
                                            <Grid size={12}>
                                                <Box className='flex items-center justify-between mb-2'>
                                                    <Typography variant='subtitle2'>Itens Inclusos no Transporte</Typography>
                                                    <Button
                                                        size='small'
                                                        variant='outlined'
                                                        startIcon={<i className='tabler-plus' />}
                                                        onClick={() => transportIncludesFields.append('' as any)}
                                                    >
                                                        Adicionar
                                                    </Button>
                                                </Box>
                                                {transportIncludesFields.fields.map((field, index) => (
                                                    <Box key={field.id} className='flex gap-2 mb-2'>
                                                        <Controller
                                                            name={`transport.includes.${index}`}
                                                            control={control}
                                                            render={({ field }) => (
                                                                <CustomTextField
                                                                    {...field}
                                                                    fullWidth
                                                                    placeholder='Ex: Ar-condicionado'
                                                                />
                                                            )}
                                                        />
                                                        <CustomIconButton
                                                            color='error'
                                                            onClick={() => transportIncludesFields.remove(index)}
                                                        >
                                                            <i className='tabler-trash' />
                                                        </CustomIconButton>
                                                    </Box>
                                                ))}
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>

                            {/* Aba: Atrações */}
                            <Grid size={12}>
                                <Accordion>
                                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                                        <Typography variant='h6'>Atrações</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='attractions.title'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Título (opcional)'
                                                            placeholder='Ex: Atrações Confirmadas'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='attractions.groupedByDate'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Box className='flex items-center h-full'>
                                                            <input
                                                                type='checkbox'
                                                                checked={field.value || false}
                                                                onChange={field.onChange}
                                                                className='mr-2'
                                                            />
                                                            <Typography variant='body2'>
                                                                Agrupar por data
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={12}>
                                                <Box className='flex items-center justify-between mb-2'>
                                                    <Typography variant='subtitle2'>Atrações/Artistas</Typography>
                                                    <Button
                                                        size='small'
                                                        variant='outlined'
                                                        startIcon={<i className='tabler-plus' />}
                                                        onClick={() => attractionsFields.append({
                                                            name: '',
                                                            date: '',
                                                            stage: ''
                                                        })}
                                                    >
                                                        Adicionar Atração
                                                    </Button>
                                                </Box>
                                                {attractionsFields.fields.map((field, index) => (
                                                    <Card key={field.id} variant='outlined' className='mb-3'>
                                                        <CardContent>
                                                            <Box className='flex items-start justify-end mb-2'>
                                                                <CustomIconButton
                                                                    size='small'
                                                                    color='error'
                                                                    onClick={() => attractionsFields.remove(index)}
                                                                >
                                                                    <i className='tabler-trash' />
                                                                </CustomIconButton>
                                                            </Box>
                                                            <Grid container spacing={2}>
                                                                <Grid size={{ xs: 12, md: 6 }}>
                                                                    <Controller
                                                                        name={`attractions.items.${index}.name`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Nome da Atração'
                                                                                placeholder='Ex: Elton John'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 3 }}>
                                                                    <Controller
                                                                        name={`attractions.items.${index}.date`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Data (opcional)'
                                                                                placeholder='Ex: 07/09/2026'
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 3 }}>
                                                                    <Controller
                                                                        name={`attractions.items.${index}.stage`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Palco (opcional)'
                                                                                placeholder='Ex: Palco Mundo'
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>

                            {/* Aba: Tabela de Preços */}
                            <Grid size={12}>
                                <Accordion>
                                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                                        <Typography variant='h6'>Tabela de Preços</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='pricing.title'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Título (opcional)'
                                                            placeholder='Ex: Valores por Local de Saída'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='pricing.pixDiscount'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            type='number'
                                                            label='Desconto PIX (%)'
                                                            placeholder='Ex: 10'
                                                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={12}>
                                                <Controller
                                                    name='pricing.generalInfo'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            multiline
                                                            rows={3}
                                                            label='Informações Gerais (opcional)'
                                                            placeholder='Ex: Pagamento em até 12x sem juros no cartão'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={12}>
                                                <Box className='flex items-center justify-between mb-2'>
                                                    <Typography variant='subtitle2'>Preços por Local</Typography>
                                                    <Button
                                                        size='small'
                                                        variant='outlined'
                                                        startIcon={<i className='tabler-plus' />}
                                                        onClick={() => pricingFields.append({
                                                            locationName: '',
                                                            pixPrice: undefined,
                                                            creditCardPrice: undefined
                                                        })}
                                                    >
                                                        Adicionar Local
                                                    </Button>
                                                </Box>
                                                {pricingFields.fields.map((field, index) => (
                                                    <Card key={field.id} variant='outlined' className='mb-3'>
                                                        <CardContent>
                                                            <Box className='flex items-start justify-end mb-2'>
                                                                <CustomIconButton
                                                                    size='small'
                                                                    color='error'
                                                                    onClick={() => pricingFields.remove(index)}
                                                                >
                                                                    <i className='tabler-trash' />
                                                                </CustomIconButton>
                                                            </Box>
                                                            <Grid container spacing={2}>
                                                                <Grid size={12}>
                                                                    <Controller
                                                                        name={`pricing.pricesByLocation.${index}.locationName`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Nome do Local'
                                                                                placeholder='Ex: São Paulo - Metrô Barra Funda'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 4 }}>
                                                                    <Controller
                                                                        name={`pricing.pricesByLocation.${index}.pixPrice`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                type='number'
                                                                                label='Preço PIX'
                                                                                placeholder='0.00'
                                                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 4 }}>
                                                                    <Controller
                                                                        name={`pricing.pricesByLocation.${index}.creditCardPrice`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                type='number'
                                                                                label='Preço Cartão'
                                                                                placeholder='0.00'
                                                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 4 }}>
                                                                    <Controller
                                                                        name={`pricing.pricesByLocation.${index}.installments`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                type='number'
                                                                                label='Parcelas sem Juros'
                                                                                placeholder='Ex: 12'
                                                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={12}>
                                                                    <Controller
                                                                        name={`pricing.pricesByLocation.${index}.description`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Descrição (opcional)'
                                                                                placeholder='Ex: Link de compra: ...'
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>

                            {/* Aba: Vídeo */}
                            <Grid size={12}>
                                <Accordion>
                                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                                        <Typography variant='h6'>Vídeo do Evento</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            <Grid size={12}>
                                                <Controller
                                                    name='video.url'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='URL do Vídeo'
                                                            placeholder='Ex: https://www.youtube.com/watch?v=...'
                                                            helperText='YouTube, Vimeo, Dailymotion ou Facebook'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='video.title'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Título do Vídeo (opcional)'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Controller
                                                    name='video.thumbnail'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Thumbnail (opcional)'
                                                            placeholder='URL da imagem'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={12}>
                                                <Controller
                                                    name='video.description'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            multiline
                                                            rows={3}
                                                            label='Descrição (opcional)'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>

                            {/* Aba: FAQ */}
                            <Grid size={12}>
                                <Accordion>
                                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                                        <Typography variant='h6'>Dúvidas Frequentes</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            <Grid size={12}>
                                                <Controller
                                                    name='faq.title'
                                                    control={control}
                                                    render={({ field }) => (
                                                        <CustomTextField
                                                            {...field}
                                                            fullWidth
                                                            label='Título (opcional)'
                                                            placeholder='Ex: Perguntas Frequentes'
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid size={12}>
                                                <Box className='flex items-center justify-between mb-2'>
                                                    <Typography variant='subtitle2'>Perguntas e Respostas</Typography>
                                                    <Button
                                                        size='small'
                                                        variant='outlined'
                                                        startIcon={<i className='tabler-plus' />}
                                                        onClick={() => faqFields.append({
                                                            question: '',
                                                            answer: ''
                                                        })}
                                                    >
                                                        Adicionar FAQ
                                                    </Button>
                                                </Box>
                                                {faqFields.fields.map((field, index) => (
                                                    <Card key={field.id} variant='outlined' className='mb-3'>
                                                        <CardContent>
                                                            <Box className='flex items-start justify-end mb-2'>
                                                                <CustomIconButton
                                                                    size='small'
                                                                    color='error'
                                                                    onClick={() => faqFields.remove(index)}
                                                                >
                                                                    <i className='tabler-trash' />
                                                                </CustomIconButton>
                                                            </Box>
                                                            <Grid container spacing={2}>
                                                                <Grid size={12}>
                                                                    <Controller
                                                                        name={`faq.items.${index}.question`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                label='Pergunta'
                                                                                placeholder='Ex: Como faço para adquirir o pacote?'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                                <Grid size={12}>
                                                                    <Controller
                                                                        name={`faq.items.${index}.answer`}
                                                                        control={control}
                                                                        render={({ field }) => (
                                                                            <CustomTextField
                                                                                {...field}
                                                                                fullWidth
                                                                                multiline
                                                                                rows={4}
                                                                                label='Resposta'
                                                                                placeholder='Ex: Os pacotes são vendidos diretamente no site...'
                                                                                required
                                                                            />
                                                                        )}
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>

                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </AdminOnly>
    )
}

