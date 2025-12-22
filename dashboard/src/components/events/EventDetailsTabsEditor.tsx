'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import type { Editor } from '@tiptap/core'
import classnames from 'classnames'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Grid from '@mui/material/Grid2'

import CustomTextField from '@core/components/mui/TextField'
import CustomIconButton from '@core/components/mui/IconButton'

import { Controller, useFieldArray, useForm } from 'react-hook-form'

import { eventDetailsService, type EventDetailsItem, type TransportLocation, type Attraction, type PriceByLocation, type FAQ } from '@/services/eventDetailsService'

import '@/libs/styles/tiptapEditor.css'

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null
    
    return (
        <div className='flex flex-wrap gap-x-3 gap-y-1 pbs-6 pbe-4 pli-6 border-b border-divider'>
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
            <CustomIconButton variant='tonal' size='small' onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <i className={classnames('tabler-list', { 'text-textSecondary': !editor.isActive('bulletList') })} />
            </CustomIconButton>
            <CustomIconButton variant='tonal' size='small' onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <i className={classnames('tabler-list-numbers', { 'text-textSecondary': !editor.isActive('orderedList') })} />
            </CustomIconButton>
        </div>
    )
}

interface EventDetailsTabsEditorProps {
    eventId: string
    isEditing?: boolean
    onSave?: () => void
    onCancel?: () => void // Callback para sair do modo de edição
    // Para a aba "Sobre o Evento" (descrição)
    descriptionEditor?: Editor | null
    descriptionHtml?: string // HTML da descrição para visualização
    onDescriptionChange?: (html: string) => void
}

export default function EventDetailsTabsEditor({ eventId, isEditing = false, onSave, onCancel, descriptionEditor, descriptionHtml, onDescriptionChange }: EventDetailsTabsEditorProps) {
    const router = useRouter()
    const params = useParams()
    const lang = params?.lang as string || 'en'
    const [activeTab, setActiveTab] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<EventDetailsItem>({
        defaultValues: {
            packageIncludes: {},
            transport: {},
            attractions: {},
            pricing: {},
            video: {},
            faq: { items: [] }
        }
    })

    // Editores TipTap para campos de texto rico
    const packageIncludesEditor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({ placeholder: 'Digite os itens inclusos no pacote...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] })
        ],
        content: ''
    })

    const transportEditor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({ placeholder: 'Digite informações sobre o transporte...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] })
        ],
        content: ''
    })

    const attractionsEditor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({ placeholder: 'Digite informações sobre as atrações...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] })
        ],
        content: ''
    })

    const pricingEditor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({ placeholder: 'Digite informações sobre preços...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] })
        ],
        content: ''
    })

    const faqEditor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({ placeholder: 'Digite perguntas frequentes...' }),
            TextAlign.configure({ types: ['heading', 'paragraph'] })
        ],
        content: ''
    })

    // Apenas FAQ precisa de field array (sanfona)
    const faqFields = useFieldArray({
        control,
        name: 'faq.items' as any
    })

    const [loadedData, setLoadedData] = useState<any>(null)

    // Carregar conteúdo nos editores quando eles estiverem prontos e os dados carregados
    useEffect(() => {
        if (!loadedData) return
        if (!packageIncludesEditor || !transportEditor || !attractionsEditor || !pricingEditor) return

        // Aguardar um pouco para garantir que os editores estejam totalmente inicializados
        const timer = setTimeout(() => {
            // Carregar descrição do evento (Sobre o Evento)
            if (loadedData.about?.richText && descriptionEditor) {
                descriptionEditor.commands.setContent(loadedData.about.richText)
            }
            if (loadedData.packageIncludes?.richText && packageIncludesEditor) {
                packageIncludesEditor.commands.setContent(loadedData.packageIncludes.richText)
            }
            if (loadedData.transport?.richText && transportEditor) {
                transportEditor.commands.setContent(loadedData.transport.richText)
            }
            if (loadedData.attractions?.richText && attractionsEditor) {
                attractionsEditor.commands.setContent(loadedData.attractions.richText)
            }
            if (loadedData.pricing?.richText && pricingEditor) {
                pricingEditor.commands.setContent(loadedData.pricing.richText)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [loadedData, descriptionEditor, packageIncludesEditor, transportEditor, attractionsEditor, pricingEditor])

    useEffect(() => {
        const load = async () => {
            if (!eventId) return

            try {
                setLoading(true)
                setError(null)

                const response = await eventDetailsService.get(eventId)
                if (response.success && response.data) {
                    const data = response.data
                    setLoadedData(data) // Armazenar dados para carregar nos editores depois
                    reset({
                        packageIncludes: data.packageIncludes || {},
                        transport: data.transport || {},
                        attractions: data.attractions || {},
                        pricing: data.pricing || {},
                        video: data.video || {},
                        faq: data.faq || { items: [] }
                    })

                    // Carregar descrição do evento (Sobre o Evento) no editor
                    if (descriptionEditor && data.about?.richText) {
                        const aboutRichText = data.about.richText
                        if (aboutRichText) {
                            setTimeout(() => {
                                descriptionEditor.commands.setContent(aboutRichText)
                            }, 300)
                        }
                    }
                }
            } catch (e: any) {
                if (!e.message?.includes('404') && !e.message?.includes('não encontrado')) {
                    setError(e.message || 'Erro ao carregar detalhes')
                }
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [eventId, reset])

    const onSubmit = async (data: EventDetailsItem) => {
        if (!eventId) return

        try {
            setSaving(true)
            setError(null)
            setSuccess(false)

            const cleanedData: any = {}

            // Salvar descrição do evento (Sobre o Evento) no EventDetails
            if (descriptionEditor) {
                const descriptionHtml = descriptionEditor.getHTML()
                if (descriptionHtml && descriptionHtml.trim() !== '<p></p>') {
                    cleanedData.about = {
                        richText: descriptionHtml
                    }
                }
            }

            // Salvar conteúdo dos editores de texto rico
            if (packageIncludesEditor) {
                const packageIncludesHtml = packageIncludesEditor.getHTML()
                if (packageIncludesHtml && packageIncludesHtml.trim() !== '<p></p>') {
                    cleanedData.packageIncludes = {
                        richText: packageIncludesHtml
                    }
                }
            }

            // Salvar conteúdo do editor de transporte
            if (transportEditor) {
                const transportHtml = transportEditor.getHTML()
                if (transportHtml && transportHtml.trim() !== '<p></p>') {
                    cleanedData.transport = {
                        richText: transportHtml
                    }
                }
            }

            // Salvar conteúdo do editor de atrações
            if (attractionsEditor) {
                const attractionsHtml = attractionsEditor.getHTML()
                if (attractionsHtml && attractionsHtml.trim() !== '<p></p>') {
                    cleanedData.attractions = {
                        richText: attractionsHtml
                    }
                }
            }

            // Salvar conteúdo do editor de preços
            if (pricingEditor) {
                const pricingHtml = pricingEditor.getHTML()
                if (pricingHtml && pricingHtml.trim() !== '<p></p>') {
                    cleanedData.pricing = {
                        richText: pricingHtml
                    }
                }
            }

            // Salvar código embed do vídeo
            if (data.video?.url) {
                cleanedData.video = {
                    url: data.video.url // Código iframe ou URL (campo url aceita ambos)
                }
            }

            // Salvar FAQ (sanfona)
            if (data.faq?.items?.length) {
                cleanedData.faq = {
                    items: data.faq.items.filter(item => item.question && item.answer)
                }
            }

            await eventDetailsService.upsert(eventId, cleanedData)
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
            
            // Recarregar dados após salvar
            const response = await eventDetailsService.get(eventId)
            if (response.success && response.data) {
                const data = response.data
                setLoadedData(data) // Atualizar dados carregados para trigger do useEffect
                reset({
                    packageIncludes: data.packageIncludes || {},
                    transport: data.transport || {},
                    attractions: data.attractions || {},
                    pricing: data.pricing || {},
                    video: data.video || {},
                    faq: data.faq || { items: [] }
                })

                // Atualizar descrição do evento (Sobre o Evento) no editor após salvar
                if (descriptionEditor) {
                    const aboutRichText = data.about?.richText
                    if (aboutRichText) {
                        setTimeout(() => {
                            descriptionEditor.commands.setContent(aboutRichText)
                        }, 200)
                    } else {
                        // Se não houver conteúdo, limpar o editor
                        setTimeout(() => {
                            descriptionEditor.commands.setContent('')
                        }, 200)
                    }
                }
            }
            
            onSave?.()
            
            // Sair do modo de edição após salvar
            if (onCancel) {
                onCancel()
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar detalhes')
        } finally {
            setSaving(false)
        }
    }

    const tabs = [
        { label: 'Sobre o Evento', icon: 'tabler-file-text' },
        { label: 'Incluso no Pacote', icon: 'tabler-check-circle' },
        { label: 'Transporte', icon: 'tabler-truck' },
        { label: 'Atrações', icon: 'tabler-music' },
        { label: 'Tabela de Preços', icon: 'tabler-currency-dollar' },
        { label: 'Vídeo', icon: 'tabler-video' },
        { label: 'Dúvidas Frequentes', icon: 'tabler-help-circle' }
    ]

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box className='flex items-center justify-center py-8'>
                        <CircularProgress size={40} />
                    </Box>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader title='Detalhes do Evento' />
            <Divider />
            <Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} variant='scrollable' scrollButtons='auto'>
                        {tabs.map((tab, index) => (
                            <Tab
                                key={index}
                                label={tab.label}
                                icon={<i className={tab.icon} />}
                                iconPosition='start'
                            />
                        ))}
                    </Tabs>
                </Box>

                {error && (
                    <Alert severity='error' className='m-4' onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity='success' className='m-4' onClose={() => setSuccess(false)}>
                        Detalhes salvos com sucesso!
                    </Alert>
                )}

                <CardContent>
                    {/* Tab 0: Sobre o Evento */}
                    {activeTab === 0 && (
                        <Box>
                            {isEditing && descriptionEditor ? (
                                <Box>
                                    <Card className='p-0 border shadow-none'>
                                        <CardContent className='p-0'>
                                            <EditorToolbar editor={descriptionEditor} />
                                            <Divider className='mli-6' />
                                            <EditorContent editor={descriptionEditor} className='bs-[250px] overflow-y-auto flex ' />
                                        </CardContent>
                                    </Card>
                                </Box>
                            ) : (
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
                                    dangerouslySetInnerHTML={{ __html: loadedData?.about?.richText || descriptionHtml || descriptionEditor?.getHTML() || '<p></p>' }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Tab 1: Incluso no Pacote */}
                    {activeTab === 1 && (
                        <Box>
                            {isEditing ? (
                                <Box>
                                    <Card className='p-0 border shadow-none'>
                                        <CardContent className='p-0'>
                                            <EditorToolbar editor={packageIncludesEditor} />
                                            <Divider className='mli-6' />
                                            <EditorContent editor={packageIncludesEditor} className='bs-[250px] overflow-y-auto flex ' />
                                        </CardContent>
                                    </Card>
                                </Box>
                            ) : (
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
                                    dangerouslySetInnerHTML={{ __html: packageIncludesEditor?.getHTML() || '<p></p>' }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Tab 2: Transporte */}
                    {activeTab === 2 && (
                        <Box>
                            {isEditing ? (
                                <Box>
                                    <Card className='p-0 border shadow-none'>
                                        <CardContent className='p-0'>
                                            <EditorToolbar editor={transportEditor} />
                                            <Divider className='mli-6' />
                                            <EditorContent editor={transportEditor} className='bs-[250px] overflow-y-auto flex ' />
                                        </CardContent>
                                    </Card>
                                </Box>
                            ) : (
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
                                    dangerouslySetInnerHTML={{ __html: transportEditor?.getHTML() || '<p></p>' }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Tab 3: Atrações */}
                    {activeTab === 3 && (
                        <Box>
                            {isEditing ? (
                                <Box>
                                    <Card className='p-0 border shadow-none'>
                                        <CardContent className='p-0'>
                                            <EditorToolbar editor={attractionsEditor} />
                                            <Divider className='mli-6' />
                                            <EditorContent editor={attractionsEditor} className='bs-[250px] overflow-y-auto flex ' />
                                        </CardContent>
                                    </Card>
                                </Box>
                            ) : (
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
                                    dangerouslySetInnerHTML={{ __html: attractionsEditor?.getHTML() || '<p></p>' }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Tab 4: Tabela de Preços */}
                    {activeTab === 4 && (
                        <Box>
                            {isEditing ? (
                                <Box>
                                    <Card className='p-0 border shadow-none'>
                                        <CardContent className='p-0'>
                                            <EditorToolbar editor={pricingEditor} />
                                            <Divider className='mli-6' />
                                            <EditorContent editor={pricingEditor} className='bs-[250px] overflow-y-auto flex ' />
                                        </CardContent>
                                    </Card>
                                </Box>
                            ) : (
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
                                    dangerouslySetInnerHTML={{ __html: pricingEditor?.getHTML() || '<p></p>' }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Tab 5: Vídeo */}
                    {activeTab === 5 && (
                        <Box>
                            <Controller
                                name={'video.url' as any}
                                control={control}
                                render={({ field }) => (
                                    <CustomTextField
                                        {...field}
                                        fullWidth
                                        multiline
                                        rows={8}
                                        label='Código de Incorporação (Embed/Iframe)'
                                        placeholder='Cole aqui o código iframe do vídeo (YouTube, Vimeo, etc.)'
                                        helperText='Cole o código completo do iframe. Ex: <iframe src="..."></iframe>'
                                    />
                                )}
                            />
                            {!isEditing && watch('video.url' as any) && (
                                <Box className='mt-4'>
                                    <Typography variant='body2' className='mb-2'>Preview:</Typography>
                                    <Box
                                        dangerouslySetInnerHTML={{ __html: String(watch('video.url' as any) || '') }}
                                        sx={{
                                            '& iframe': {
                                                width: '100%',
                                                maxWidth: '100%',
                                                height: '400px'
                                            }
                                        }}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Tab 6: FAQ */}
                    {activeTab === 6 && (
                        <Box>
                            {isEditing ? (
                                <Box>
                                    <Box className='flex items-center justify-between mb-4'>
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
                                                    <Grid size={{ xs: 12 }}>
                                                        <Controller
                                                            name={`faq.items.${index}.question`}
                                                            control={control}
                                                            render={({ field }) => (
                                                                <CustomTextField
                                                                    {...field}
                                                                    fullWidth
                                                                    label='Título (Pergunta)'
                                                                    placeholder='Ex: Como faço para adquirir o pacote?'
                                                                    required
                                                                />
                                                            )}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12 }}>
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
                                </Box>
                            ) : (
                                <Box className='space-y-2'>
                                    {faqFields.fields.length > 0 ? (
                                        faqFields.fields.map((field, index) => (
                                            <Accordion key={field.id}>
                                                <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                                                    <Typography variant='subtitle2' className='font-semibold'>
                                                        {watch(`faq.items.${index}.question`)}
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Typography variant='body2' color='text.secondary'>
                                                        {watch(`faq.items.${index}.answer`)}
                                                    </Typography>
                                                </AccordionDetails>
                                            </Accordion>
                                        ))
                                    ) : (
                                        <Typography variant='body2' color='text.secondary' className='italic'>
                                            Nenhuma pergunta cadastrada. Clique em "Editar Evento" para adicionar.
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}

                    {isEditing && (
                        <Box className='flex justify-end gap-3 mt-4'>
                            <Button
                                variant='outlined'
                                onClick={() => {
                                    if (onCancel) {
                                        onCancel()
                                    } else {
                                        router.push(`/${lang}/apps/events/view/${eventId}`)
                                    }
                                }}
                                disabled={saving}
                            >
                                Voltar
                            </Button>
                            <Button
                                onClick={handleSubmit(onSubmit)}
                                variant='contained'
                                disabled={saving}
                                startIcon={saving ? <CircularProgress size={20} /> : <i className='tabler-check' />}
                            >
                                {saving ? 'Salvando...' : 'Salvar Detalhes'}
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Box>
        </Card>
    )
}

