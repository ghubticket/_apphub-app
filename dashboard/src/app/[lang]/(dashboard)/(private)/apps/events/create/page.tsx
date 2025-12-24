'use client'



import { useEffect, useState } from 'react'

import { useRouter, useParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid2'
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

import MenuItem from '@mui/material/MenuItem'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'
import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import CustomIconButton from '@core/components/mui/IconButton'
import { sanitizeEditorContent } from '@/utils/sanitize'

import { AdminOnly } from '@/components/RoleGuard'
import { eventService } from '@/services/eventService'
import { locationService, type UF, type City } from '@/services/locationService'

import '@/libs/styles/tiptapEditor.css'

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

type FormData = InferInput<typeof schema>

const schema = object({
    name: pipe(string(), nonEmpty('Nome do evento é obrigatório'), minLength(3, 'Nome deve ter pelo menos 3 caracteres')),
    location: optional(string()),
    address: optional(string()),
    city: optional(string()),
    state: optional(string())
})

const CreateEventPage = () => {
    const router = useRouter()
    const { lang } = useParams()

    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [squareFile, setSquareFile] = useState<File | null>(null)
    const [coverFileError, setCoverFileError] = useState<string | null>(null)
    const [squareFileError, setSquareFileError] = useState<string | null>(null)
    const [date, setDate] = useState<Date | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [ufs, setUfs] = useState<UF[]>([])
    const [cities, setCities] = useState<City[]>([])

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
        setValue
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

    // Load states on mount
    useEffect(() => {
        locationService.getStates().then(setUfs).catch(() => setUfs([]))
    }, [])

    // Watch state field to load cities when it changes
    const watchedState = watch('state')

    useEffect(() => {
        if (watchedState) {
            locationService.getCitiesByUF(watchedState).then(setCities).catch(() => setCities([]))

            // Clear city when state changes
            setValue('city', '')
        } else {
            setCities([])
            setValue('city', '')
        }
    }, [watchedState, setValue])

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Descreva o evento...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline
        ],
        immediatelyRender: false
    })

    const validateFile = (file: File | null, fieldName: 'cover' | 'square'): string | null => {
        if (!file) {
            return fieldName === 'cover' ? 'Imagem de capa é obrigatória' : 'Imagem quadrada é obrigatória'
        }

        if (file.type !== 'image/png') {
            return 'Apenas arquivos PNG são permitidos'
        }

        if (file.size > 10 * 1024 * 1024) {
            return 'Arquivo deve ter no máximo 10MB'
        }

        
return null
    }

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        try {
            setSubmitError(null)

            // Validar arquivos
            const coverError = validateFile(coverFile, 'cover')
            const squareError = validateFile(squareFile, 'square')

            if (coverError) {
                setCoverFileError(coverError)
                
return
            }

            if (squareError) {
                setSquareFileError(squareError)
                
return
            }

            setCoverFileError(null)
            setSquareFileError(null)

            if (!coverFile || !squareFile) return

            const form = new FormData()

            form.append('name', data.name)

            // Descrição é obrigatória no backend (máximo 2000 caracteres)
            if (editor) {
                try {
                    // Sanitiza e valida o conteúdo do editor (protege contra XSS)
                    const cleanDescription = sanitizeEditorContent(editor.getHTML(), 2000)

                    form.append('description', cleanDescription)
                } catch (error) {
                    throw new Error(error instanceof Error ? error.message : 'Descrição do evento é inválida')
                }
            } else {
                throw new Error('Descrição do evento é obrigatória')
            }


            // Validar campos obrigatórios
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

            // Enviar data no formato YYYY-MM-DD (usando data local, não UTC)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateStr = `${year}-${month}-${day}`

            form.append('date', dateStr)

            // Campos obrigatórios
            form.append('location', data.location.trim())
            form.append('address', data.address.trim())
            form.append('city', data.city.trim())
            form.append('state', data.state.toUpperCase().trim())

            // Campos opcionais com valores padrão
            form.append('price', '0')
            form.append('capacity', '100')
            form.append('cover', coverFile)
            form.append('square', squareFile)

            await eventService.create(form)

            // Usar replace para evitar problemas de navegação
            router.replace(`/${lang}/apps/events/list`)
        } catch (e: any) {
            console.error('Erro ao criar evento:', e)
            setSubmitError(e.message || 'Erro ao criar evento')
        }
    }

    return (
        <AdminOnly>
            <Card>
                <CardHeader title='Criar Evento' />
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

                                                // City will be cleared automatically when state changes via watch effect
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
                                <Typography variant='body2' className='mbe-2'>Imagem de Capa (PNG 1200x500)</Typography>
                                <Button component='label' variant='outlined' fullWidth htmlFor='event-cover-image' color={coverFileError ? 'error' : 'primary'}>
                                    {coverFile ? coverFile.name : 'Escolher ficheiro'}
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
                                        id='event-cover-image'
                                    />
                                </Button>
                                {coverFileError && (
                                    <Typography variant='caption' color='error' className='mts-1 mbs-0'>{coverFileError}</Typography>
                                )}
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant='body2' className='mbe-2'>Imagem Quadrada (PNG 300x300)</Typography>
                                <Button component='label' variant='outlined' fullWidth htmlFor='event-square-image' color={squareFileError ? 'error' : 'primary'}>
                                    {squareFile ? squareFile.name : 'Escolher ficheiro'}
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
                                        id='event-square-image'
                                    />
                                </Button>
                                {squareFileError && (
                                    <Typography variant='caption' color='error' className='mts-1 mbs-0'>{squareFileError}</Typography>
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
                            <Button type='button' variant='tonal' color='secondary' onClick={() => router.push(`/${lang}/apps/events/list`)}>
                                Cancelar
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </Card>
        </AdminOnly>
    )
}

export default CreateEventPage