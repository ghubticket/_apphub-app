'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'

import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, string, pipe, nonEmpty, minLength, optional } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import type { Editor } from '@tiptap/core'
import classnames from 'classnames'

import CustomTextField from '@core/components/mui/TextField'
import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomIconButton from '@core/components/mui/IconButton'
import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

import { AdminOnly } from '@/components/RoleGuard'
import { eventService, type EventItem } from '@/services/eventService'
import { locationService, type UF, type City } from '@/services/locationService'
import { useTicketTypes } from '@/hooks/useTicketTypes'
import type { TicketTypeItem } from '@/services/ticketTypeService'
import { getAvailableQuantities } from '@/services/reservationService'

import '@/libs/styles/tiptapEditor.css'
import dynamic from 'next/dynamic'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

type FormData = InferInput<typeof schema>

const schema = object({
    name: pipe(string(), nonEmpty('Nome do evento é obrigatório'), minLength(3, 'Nome deve ter pelo menos 3 caracteres')),
    location: optional(string()),
    address: optional(string()),
    city: optional(string()),
    state: optional(string())
})

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null
    return (
        <div className='flex flex-wrap gap-x-3 gap-y-1 pbs-6 pbe-4 pli-6'>
            <CustomIconButton {...(editor.isActive('bold') && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().toggleBold().run()}>
                <i className={classnames('tabler-bold', { 'text-textSecondary': !editor.isActive('bold') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('underline') && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <i className={classnames('tabler-underline', { 'text-textSecondary': !editor.isActive('underline') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('italic') && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().toggleItalic().run()}>
                <i className={classnames('tabler-italic', { 'text-textSecondary': !editor.isActive('italic') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive('strike') && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().toggleStrike().run()}>
                <i className={classnames('tabler-strikethrough', { 'text-textSecondary': !editor.isActive('strike') })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive({ textAlign: 'left' }) && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                <i className={classnames('tabler-align-left', { 'text-textSecondary': !editor.isActive({ textAlign: 'left' }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive({ textAlign: 'center' }) && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                <i className={classnames('tabler-align-center', { 'text-textSecondary': !editor.isActive({ textAlign: 'center' }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                <i className={classnames('tabler-align-right', { 'text-textSecondary': !editor.isActive({ textAlign: 'right' }) })} />
            </CustomIconButton>
            <CustomIconButton {...(editor.isActive({ textAlign: 'justify' }) && { color: 'primary' })} variant='tonal' size='small' onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
                <i className={classnames('tabler-align-justified', { 'text-textSecondary': !editor.isActive({ textAlign: 'justify' }) })} />
            </CustomIconButton>
        </div>
    )
}

const EventViewPage = () => {
    const router = useRouter()
    const theme = useTheme()
    const { lang, id } = useParams()
    const [event, setEvent] = useState<EventItem | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const { ticketTypes } = useTicketTypes(id as string)
    const [availableQuantities, setAvailableQuantities] = useState<Record<string, number>>({})
    const [loadingReservations, setLoadingReservations] = useState(false)

    // Buscar quantidades disponíveis considerando reservas
    useEffect(() => {
        const fetchAvailableQuantities = async () => {
            if (!id) {
                setAvailableQuantities({})
                return
            }

            // Se não houver tipos de ingressos, definir como vazio
            if (ticketTypes.length === 0) {
                setAvailableQuantities({})
                setLoadingReservations(false)
                return
            }

            setLoadingReservations(true)
            try {
                const ticketTypeIds = ticketTypes.map((tt) => tt._id)
                const quantities = await getAvailableQuantities(id as string, ticketTypeIds)
                setAvailableQuantities(quantities)
            } catch (error) {
                console.error('Erro ao buscar quantidades disponíveis:', error)
                // Em caso de erro, usar fallback: maxQuantity - soldQuantity
                const fallback: Record<string, number> = {}
                ticketTypes.forEach((tt) => {
                    fallback[tt._id] = Math.max(0, (tt.maxQuantity || 0) - (tt.soldQuantity || 0))
                })
                setAvailableQuantities(fallback)
            } finally {
                setLoadingReservations(false)
            }
        }

        fetchAvailableQuantities()
    }, [id, ticketTypes])

    // Calcular métricas dos ingressos baseado nos tipos cadastrados
    const calculateTicketMetrics = (
        ticketTypes: TicketTypeItem[], 
        availableQuantities: Record<string, number>,
        isLoading: boolean
    ) => {
        // Se não houver tipos de ingressos cadastrados, retornar tudo como 0
        if (ticketTypes.length === 0) {
            return {
                totalCapacity: 0,
                totalSold: 0,
                totalAvailable: 0,
                totalPending: 0,
                totalCancelled: 0,
            }
        }

        // Capacidade Total: Soma de TODAS as quantidades máximas de TODOS os tipos de ingressos cadastrados
        const totalCapacity = ticketTypes.reduce((sum, tt) => {
            const qty = Number(tt.maxQuantity) || 0
            return sum + qty
        }, 0)
        
        // Ingressos Vendidos: Soma de todos os ingressos vendidos de todos os tipos
        const totalSold = ticketTypes.reduce((sum, tt) => {
            return sum + (tt.soldQuantity || 0)
        }, 0)
        
        // Ingressos Disponíveis: Usar SEMPRE a API que considera reservas ativas
        // Se ainda está carregando, mostrar 0 temporariamente
        let totalAvailable = 0
        if (isLoading) {
            totalAvailable = 0 // Mostrar 0 enquanto carrega
        } else {
            // Somar apenas os valores que vieram da API
            totalAvailable = ticketTypes.reduce((sum, tt) => {
                const available = availableQuantities[tt._id]
                if (available !== undefined) {
                    return sum + Math.max(0, available)
                }
                return sum
            }, 0)
        }
        
        const totalPending = 0 // TODO: Integrar com API de reservas quando disponível
        const totalCancelled = 0 // TODO: Integrar com API de tickets cancelados quando disponível

        return {
            totalCapacity,
            totalSold,
            totalAvailable,
            totalPending,
            totalCancelled,
        }
    }

    const ticketMetrics = calculateTicketMetrics(ticketTypes, availableQuantities, loadingReservations)

    
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [squareFile, setSquareFile] = useState<File | null>(null)
    const [coverFileError, setCoverFileError] = useState<string | null>(null)
    const [squareFileError, setSquareFileError] = useState<string | null>(null)
    const [date, setDate] = useState<Date | null>(null)
    const [time, setTime] = useState<Date | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [ufs, setUfs] = useState<UF[]>([])
    const [cities, setCities] = useState<City[]>([])
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const [chartHeight, setChartHeight] = useState(400)

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
        setValue,
        reset
    } = useForm<FormData>({
        resolver: valibotResolver(schema),
        defaultValues: {
            name: '',
            location: '',
            address: '',
            city: '',
            state: ''
        }
    })

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Descreva o evento...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline
        ],
        immediatelyRender: false
    })

    // Load states on mount
    useEffect(() => {
        locationService.getStates().then(setUfs).catch(() => setUfs([]))
    }, [])

    // Watch state field to load cities when it changes
    const watchedState = watch('state')

    useEffect(() => {
        if (watchedState) {
            locationService.getCitiesByUF(watchedState).then(setCities).catch(() => setCities([]))
        } else {
            setCities([])
        }
    }, [watchedState])

    // Carregar cidades quando o evento for carregado e tiver estado
    useEffect(() => {
        if (event?.state && !isEditing) {
            locationService.getCitiesByUF(event.state).then(setCities).catch(() => setCities([]))
        }
    }, [event?.state, isEditing])

    // Calcular altura do gráfico dinamicamente
    useEffect(() => {
        if (!chartContainerRef.current || !event) return

        const updateChartHeight = () => {
            if (chartContainerRef.current) {
                // Pegar altura do container menos o padding (24px * 2 = 48px)
                const containerHeight = chartContainerRef.current.offsetHeight || chartContainerRef.current.clientHeight
                const padding = 48 // 24px top + 24px bottom
                const calculatedHeight = Math.max(300, containerHeight - padding)
                setChartHeight(calculatedHeight)
            }
        }

        // Aguardar o próximo frame para garantir que o DOM está renderizado
        const timer = setTimeout(() => {
            updateChartHeight()
        }, 100)

        // Usar ResizeObserver para detectar mudanças de tamanho
        const resizeObserver = new ResizeObserver(() => {
            updateChartHeight()
        })

        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current)
        }

        window.addEventListener('resize', updateChartHeight)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updateChartHeight)
            resizeObserver.disconnect()
        }
    }, [event, isEditing])

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setLoading(true)
                const response = await eventService.getById(id as string)
                setEvent(response.data)

                // Preencher formulário quando entrar em modo de edição
                if (response.data) {
                    reset({
                        name: response.data.name || '',
                        location: response.data.location || '',
                        address: response.data.address || '',
                        city: response.data.city || '',
                        state: response.data.state || ''
                    })

                    if (response.data.date) {
                        const eventDate = new Date(response.data.date)
                        setDate(eventDate)
                    }

                    if (response.data.time) {
                        const [hours, minutes] = response.data.time.split(':')
                        const timeDate = new Date()
                        timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                        setTime(timeDate)
                    }

                    if (editor && response.data.description) {
                        editor.commands.setContent(response.data.description)
                    }
                }
            } catch (e: any) {
                setError(e.message || 'Erro ao carregar evento')
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            fetchEvent()
        }
    }, [id, reset, editor])

    const validateFile = (file: File | null, fieldName: 'cover' | 'square'): string | null => {
        if (file && file.type !== 'image/png') {
            return 'Apenas arquivos PNG são permitidos'
        }
        if (file && file.size > 10 * 1024 * 1024) {
            return 'Arquivo deve ter no máximo 10MB'
        }
        return null
    }

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        try {
            setSubmitError(null)

            // Validar arquivos apenas se novos arquivos foram selecionados
            if (coverFile) {
                const coverError = validateFile(coverFile, 'cover')
                if (coverError) {
                    setCoverFileError(coverError)
                    return
                }
            }
            if (squareFile) {
                const squareError = validateFile(squareFile, 'square')
                if (squareError) {
                    setSquareFileError(squareError)
                    return
                }
            }

            setCoverFileError(null)
            setSquareFileError(null)

            const form = new FormData()
            form.append('name', data.name)

            // Descrição é obrigatória no backend (máximo 2000 caracteres)
            if (editor) {
                const description = editor.getHTML()
                let cleanDescription = description.replace(/<p><\/p>/g, '').trim()

                if (!cleanDescription) {
                    throw new Error('Descrição do evento é obrigatória')
                }

                if (cleanDescription.length > 2000) {
                    const tempDiv = document.createElement('div')
                    tempDiv.innerHTML = cleanDescription
                    const textContent = tempDiv.textContent || tempDiv.innerText || ''

                    if (textContent.length > 2000) {
                        throw new Error('Descrição deve ter no máximo 2000 caracteres')
                    }
                    cleanDescription = textContent.substring(0, 2000)
                }

                form.append('description', cleanDescription)
            } else {
                throw new Error('Descrição do evento é obrigatória')
            }

            if (!date) {
                throw new Error('Data do evento é obrigatória')
            }
            if (!data.location) {
                throw new Error('Localização é obrigatória')
            }
            if (!data.address) {
                throw new Error('Endereço é obrigatório')
            }
            if (!data.city) {
                throw new Error('Cidade é obrigatória')
            }
            if (!data.state) {
                throw new Error('Estado é obrigatório')
            }

            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateStr = `${year}-${month}-${day}`
            form.append('date', dateStr)

            if (time) {
                const hours = String(time.getHours()).padStart(2, '0')
                const minutes = String(time.getMinutes()).padStart(2, '0')
                form.append('time', `${hours}:${minutes}`)
            }

            form.append('location', data.location.trim())
            form.append('address', data.address.trim())
            form.append('city', data.city.trim())
            form.append('state', data.state.toUpperCase().trim())

            // Apenas enviar arquivos se novos foram selecionados
            if (coverFile) {
                form.append('cover', coverFile)
            }
            if (squareFile) {
                form.append('square', squareFile)
            }

            await eventService.update(id as string, form)

            // Recarregar evento após atualização
            const updatedResponse = await eventService.getById(id as string)
            setEvent(updatedResponse.data)
            setIsEditing(false)
            setCoverFile(null)
            setSquareFile(null)
        } catch (e: any) {
            console.error('Erro ao atualizar evento:', e)
            setSubmitError(e.message || 'Erro ao atualizar evento')
        }
    }

    if (loading) {
        return (
            <AdminOnly>
                <Card>
                    <CardContent>
                        <Typography>Carregando evento...</Typography>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    if (error || !event) {
        return (
            <AdminOnly>
                <Card>
                    <CardContent>
                        <Typography color='error'>{error || 'Evento não encontrado'}</Typography>
                        <Button variant='contained' onClick={() => router.push(`/${lang}/apps/events/list`)} className='mt-4'>
                            Voltar para Lista
                        </Button>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    if (isEditing) {
        return (
            <AdminOnly>
                <Card>
                    <CardHeader title='Editar Evento' />
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Grid container spacing={6} className='mbe-6'>
                                <Grid size={{ xs: 12 }}>
                                    <Controller
                                        name='name'
                                        control={control}
                                        render={({ field }) => (
                                            <CustomTextField
                                                {...field}
                                                fullWidth
                                                label='Nome do Evento'
                                                placeholder='Nome do evento'
                                                {...(errors.name && { error: true, helperText: errors.name.message })}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <AppReactDatepicker
                                        selected={date ?? undefined}
                                        showYearDropdown
                                        showMonthDropdown
                                        onChange={(d: Date | null) => setDate(d)}
                                        placeholderText='DD/MM/YYYY'
                                        dateFormat='dd/MM/yyyy'
                                        customInput={<CustomTextField fullWidth label='Data' placeholder='DD/MM/YYYY' />}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <AppReactDatepicker
                                        selected={time ?? undefined}
                                        onChange={(d: Date | null) => setTime(d)}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={15}
                                        timeCaption='Horário'
                                        dateFormat='HH:mm'
                                        placeholderText='HH:mm'
                                        customInput={<CustomTextField fullWidth label='Horário' placeholder='HH:mm' />}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name='location'
                                        control={control}
                                        render={({ field }) => (
                                            <CustomTextField
                                                {...field}
                                                fullWidth
                                                label='Localização'
                                                placeholder='Local do evento'
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name='address'
                                        control={control}
                                        render={({ field }) => (
                                            <CustomTextField
                                                {...field}
                                                fullWidth
                                                label='Endereço'
                                                placeholder='Endereço completo'
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name='state'
                                        control={control}
                                        render={({ field }) => (
                                            <CustomTextField
                                                {...field}
                                                select
                                                fullWidth
                                                id='event-state-select'
                                                label='Estado'
                                                placeholder='UF'
                                                onChange={e => {
                                                    field.onChange(e)
                                                }}
                                            >
                                                <MenuItem value=''>Selecione</MenuItem>
                                                {ufs.map(uf => (
                                                    <MenuItem key={uf.sigla} value={uf.sigla}>{uf.sigla} - {uf.nome}</MenuItem>
                                                ))}
                                            </CustomTextField>
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name='city'
                                        control={control}
                                        render={({ field }) => (
                                            <CustomAutocomplete
                                                fullWidth
                                                options={cities}
                                                value={cities.find(c => c.nome === field.value) || null}
                                                onChange={(_, newValue) => {
                                                    field.onChange(newValue ? newValue.nome : '')
                                                }}
                                                getOptionLabel={option => option.nome || ''}
                                                renderInput={params => (
                                                    <CustomTextField
                                                        {...params}
                                                        label='Cidade'
                                                        placeholder='Buscar cidade...'
                                                    />
                                                )}
                                                disabled={cities.length === 0}
                                                noOptionsText='Nenhuma cidade encontrada'
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>

                            <Typography variant='body2' className='mbe-1 font-medium'>Sobre o Evento</Typography>
                            <Card className='p-0 border shadow-none'>
                                <CardContent className='p-0'>
                                    <EditorToolbar editor={editor} />
                                    <Divider className='mli-6' />
                                    <EditorContent editor={editor} className='bs-[250px] overflow-y-auto flex ' />
                                </CardContent>
                            </Card>

                            <Grid container spacing={6} className='mbe-6 mbs-6'>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant='body2' className='mbe-2'>Imagem de Capa (PNG 1200x500) - Opcional</Typography>
                                    <Button component='label' variant='outlined' fullWidth htmlFor='event-cover-image-edit' color={coverFileError ? 'error' : 'primary'}>
                                        {coverFile ? coverFile.name : event.coverImage ? 'Manter imagem atual' : 'Escolher ficheiro'}
                                        <input
                                            hidden
                                            type='file'
                                            accept='image/png'
                                            onChange={e => {
                                                const file = e.target.files?.[0] || null
                                                setCoverFile(file)
                                                setCoverFileError(null)
                                                if (file) {
                                                    const error = validateFile(file, 'cover')
                                                    setCoverFileError(error)
                                                }
                                            }}
                                            id='event-cover-image-edit'
                                        />
                                    </Button>
                                    {coverFileError && (
                                        <Typography variant='caption' color='error' className='mts-1 mbs-0'>{coverFileError}</Typography>
                                    )}
                                    {event.coverImage && !coverFile && (
                                        <Typography variant='caption' color='text.secondary' className='mts-1 mbs-0'>Deixe em branco para manter a imagem atual</Typography>
                                    )}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant='body2' className='mbe-2'>Imagem Quadrada (PNG 300x300) - Opcional</Typography>
                                    <Button component='label' variant='outlined' fullWidth htmlFor='event-square-image-edit' color={squareFileError ? 'error' : 'primary'}>
                                        {squareFile ? squareFile.name : event.squareImage ? 'Manter imagem atual' : 'Escolher ficheiro'}
                                        <input
                                            hidden
                                            type='file'
                                            accept='image/png'
                                            onChange={e => {
                                                const file = e.target.files?.[0] || null
                                                setSquareFile(file)
                                                setSquareFileError(null)
                                                if (file) {
                                                    const error = validateFile(file, 'square')
                                                    setSquareFileError(error)
                                                }
                                            }}
                                            id='event-square-image-edit'
                                        />
                                    </Button>
                                    {squareFileError && (
                                        <Typography variant='caption' color='error' className='mts-1 mbs-0'>{squareFileError}</Typography>
                                    )}
                                    {event.squareImage && !squareFile && (
                                        <Typography variant='caption' color='text.secondary' className='mts-1 mbs-0'>Deixe em branco para manter a imagem atual</Typography>
                                    )}
                                </Grid>
                            </Grid>

                            {submitError && (
                                <Box className='mb-4'>
                                    <Typography color='error' variant='body2'>{submitError}</Typography>
                                </Box>
                            )}

                            <Box className='flex gap-4'>
                                <Button type='submit' variant='contained' disabled={isSubmitting} startIcon={<i className='tabler-device-floppy' />}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button type='button' variant='tonal' color='secondary' onClick={() => {
                                    setIsEditing(false)
                                    setCoverFile(null)
                                    setSquareFile(null)
                                    setSubmitError(null)
                                    setCoverFileError(null)
                                    setSquareFileError(null)
                                }}>
                                    Cancelar
                                </Button>
                            </Box>
                        </form>
                    </CardContent>
                </Card>
            </AdminOnly>
        )
    }

    return (
        <AdminOnly>
            <Grid container spacing={6}>

                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardHeader
                            title={event.name}
                            subheader={event.date ? new Date(event.date).toLocaleDateString('pt-BR') : ''}
                            action={
                                <Box className='flex gap-3'>
                                    <Button
                                        variant='contained'
                                        startIcon={<i className='tabler-ticket' />}
                                        onClick={() => router.push(`/${lang}/apps/events/view/${id}/tickets/list`)}
                                    >
                                        Cadastrar Tickets
                                    </Button>
                                    <Button
                                        variant='outlined'
                                        startIcon={<i className='tabler-edit' />}
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Editar Evento
                                    </Button>
                                    <Button
                                        variant='tonal'
                                        color='secondary'
                                        startIcon={<i className='tabler-arrow-left' />}
                                        onClick={() => router.push(`/${lang}/apps/events/list`)}
                                    >
                                        Voltar
                                    </Button>
                                </Box>
                            }
                        />
                    </Card>
                </Grid>

                <Grid container spacing={6} sx={{ width: '100%' }}>
                    {/* Box 1: Informações */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {event.coverImage && (
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100px',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    <img
                                        src={event.coverImage}
                                        alt={event.name}
                                        className='w-full h-full object-cover'
                                        style={{ objectFit: 'cover' }}
                                    />
                                </Box>
                            )}
                            <CardContent sx={{ flex: 1 }}>
                                <Box className='flex flex-col gap-4'>
                                    <Box>
                                        <Typography variant='body2' color='text.secondary' className='mb-1 font-medium'>Status</Typography>
                                        <Chip
                                            label={event.isActive ? 'Ativo' : 'Inativo'}
                                            color={event.isActive ? 'success' : 'secondary'}
                                            size='small'
                                            variant='tonal'
                                        />
                                    </Box>
                                    {event.date && (
                                        <Box>
                                            <Typography variant='body2' color='text.secondary' className='mb-1 font-medium'>Data</Typography>
                                            <Typography>{new Date(event.date).toLocaleDateString('pt-BR')}</Typography>
                                        </Box>
                                    )}
                                    {event.time && (
                                        <Box>
                                            <Typography variant='body2' color='text.secondary' className='mb-1 font-medium'>Horário</Typography>
                                            <Typography>{event.time}</Typography>
                                        </Box>
                                    )}
                                    {event.location && (
                                        <Box>
                                            <Typography variant='body2' color='text.secondary' className='mb-1 font-medium'>Localização</Typography>
                                            <Typography>{event.location}</Typography>
                                        </Box>
                                    )}
                                    {event.address && (
                                        <Box>
                                            <Typography variant='body2' color='text.secondary' className='mb-1 font-medium'>Endereço</Typography>
                                            <Typography>{event.address}</Typography>
                                        </Box>
                                    )}
                                    {event.city && event.state && (
                                        <Box>
                                            <Typography variant='body2' color='text.secondary' className='mb-1 font-medium'>Cidade/Estado</Typography>
                                            <Typography>{event.city}, {event.state}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Box 2: Estatísticas de Ingressos */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardHeader title='Ingressos' />
                            <Divider />
                            <CardContent sx={{ flex: 1 }}>
                                <Box className='flex flex-col gap-4'>
                                    <Box className='flex items-center gap-4'>
                                        <Box
                                            className='w-16 h-16 rounded-lg flex items-center justify-center'
                                            sx={{
                                                backgroundColor: 'primary.lightOpacity',
                                                color: 'primary.main'
                                            }}
                                        >
                                            <i className='tabler-ticket text-2xl' />
                                        </Box>
                                        <Box className='flex-1'>
                                            <Typography variant='h5' color='text.primary' className='font-medium mb-1'>
                                                {ticketMetrics.totalSold}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                Ingressos Vendidos
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box className='flex items-center gap-4'>
                                        <Box
                                            className='w-16 h-16 rounded-lg flex items-center justify-center'
                                            sx={{
                                                backgroundColor: 'success.lightOpacity',
                                                color: 'success.main'
                                            }}
                                        >
                                            <i className='tabler-users text-2xl' />
                                        </Box>
                                        <Box className='flex-1'>
                                            <Typography variant='h5' color='text.primary' className='font-medium mb-1'>
                                                {ticketMetrics.totalCapacity}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                Capacidade Total
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box className='flex items-center gap-4'>
                                        <Box
                                            className='w-16 h-16 rounded-lg flex items-center justify-center'
                                            sx={{
                                                backgroundColor: 'info.lightOpacity',
                                                color: 'info.main'
                                            }}
                                        >
                                            <i className='tabler-ticket-off text-2xl' />
                                        </Box>
                                        <Box className='flex-1'>
                                            <Typography variant='h5' color='text.primary' className='font-medium mb-1'>
                                                {ticketMetrics.totalAvailable}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                Ingressos Disponíveis
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box className='flex items-center gap-4'>
                                        <Box
                                            className='w-16 h-16 rounded-lg flex items-center justify-center'
                                            sx={{
                                                backgroundColor: 'warning.lightOpacity',
                                                color: 'warning.main'
                                            }}
                                        >
                                            <i className='tabler-clock text-2xl' />
                                        </Box>
                                        <Box className='flex-1'>
                                            <Typography variant='h5' color='text.primary' className='font-medium mb-1'>
                                                {ticketMetrics.totalPending}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                Ingressos Pendentes
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box className='flex items-center gap-4'>
                                        <Box
                                            className='w-16 h-16 rounded-lg flex items-center justify-center'
                                            sx={{
                                                backgroundColor: 'error.lightOpacity',
                                                color: 'error.main'
                                            }}
                                        >
                                            <i className='tabler-x text-2xl' />
                                        </Box>
                                        <Box className='flex-1'>
                                            <Typography variant='h5' color='text.primary' className='font-medium mb-1'>
                                                {ticketMetrics.totalCancelled}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                Ingressos Cancelados
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Box 3: Gráfico de Vendas em Reais */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardHeader title='Vendas em Reais' />
                            <Divider />
                            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0, '&:last-child': { pb: 0 }, overflow: 'hidden' }}>
                                <Box 
                                    ref={chartContainerRef}
                                    sx={{ 
                                        flex: 1, 
                                        width: '100%', 
                                        minHeight: '400px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        p: 6,
                                        position: 'relative'
                                    }}
                                >
                                    <Box sx={{ flex: 1, width: '100%', position: 'relative' }}>
                                        <AppReactApexCharts
                                            type='area'
                                            height={chartHeight}
                                            width='100%'
                                        options={{
                                            chart: {
                                                parentHeightOffset: 0,
                                                toolbar: { show: false },
                                                sparkline: { enabled: false }
                                            },
                                            tooltip: {
                                                enabled: true,
                                                theme: 'dark',
                                                y: {
                                                    formatter: (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                }
                                            },
                                            dataLabels: { enabled: false },
                                            stroke: {
                                                width: 3,
                                                curve: 'smooth'
                                            },
                                            grid: {
                                                show: true,
                                                borderColor: 'var(--mui-palette-divider)',
                                                strokeDashArray: 3,
                                                padding: {
                                                    top: 10,
                                                    right: 10,
                                                    bottom: 10,
                                                    left: 10
                                                }
                                            },
                                            fill: {
                                                type: 'gradient',
                                                gradient: {
                                                    opacityTo: 0.1,
                                                    opacityFrom: 0.6,
                                                    shadeIntensity: 1,
                                                    stops: [0, 100],
                                                    colorStops: [
                                                        [
                                                            {
                                                                offset: 0,
                                                                opacity: 0.6,
                                                                color: theme.palette.success.main
                                                            },
                                                            {
                                                                offset: 100,
                                                                opacity: 0.1,
                                                                color: theme.palette.success.main
                                                            }
                                                        ]
                                                    ]
                                                }
                                            },
                                            colors: [theme.palette.success.main],
                                            xaxis: {
                                                labels: {
                                                    show: true,
                                                    style: {
                                                        colors: 'var(--mui-palette-text-secondary)',
                                                        fontSize: '12px'
                                                    }
                                                },
                                                axisTicks: { show: false },
                                                axisBorder: { show: false },
                                                categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']
                                            },
                                            yaxis: {
                                                show: true,
                                                labels: {
                                                    formatter: (val: number) => `R$ ${(val / 1000).toFixed(0)}k`,
                                                    style: {
                                                        colors: 'var(--mui-palette-text-secondary)',
                                                        fontSize: '12px'
                                                    }
                                                }
                                            }
                                        }}
                                        series={[{ name: 'Vendas', data: [0, 500, 1200, 800, 1500, 2000, 1800] }]}
                                        />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Descrição */}
                    {event.description && (
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardHeader title='Descrição' />
                                <CardContent>
                                    <Box
                                        className='ProseMirror'
                                        sx={{
                                            outline: 'none',
                                            minBlockSize: '100px',
                                            padding: '1.5rem',
                                            inlineSize: '100%',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: '4px',
                                            '& > * + *': {
                                                marginBlockStart: '0.75em'
                                            },
                                            '& ul, & ol': {
                                                paddingBlock: 0,
                                                paddingInline: '1rem'
                                            },
                                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                                                lineHeight: 1.1
                                            },
                                            '& p': {
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                margin: 0,
                                                '& + p': {
                                                    marginTop: '0.75em'
                                                }
                                            },
                                            '& br': {
                                                display: 'block',
                                                content: '""',
                                                marginTop: '0.5em'
                                            }
                                        }}
                                        dangerouslySetInnerHTML={{ __html: event.description }}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            </Grid>
        </AdminOnly>
    )
}

export default EventViewPage
