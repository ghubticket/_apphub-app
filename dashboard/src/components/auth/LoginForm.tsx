'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Alert,
    CircularProgress,
    Typography,
    Card,
    CardContent,
    Divider,
    Link
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/userTypes'
import CustomTextField from '@core/components/mui/TextField'

interface LoginFormProps {
    onSuccess?: () => void
}

interface FormData {
    email: string
    password: string
    role: UserRole
    rememberMe: boolean
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const { login } = useAuth()
    const router = useRouter()

    const {
        control,
        handleSubmit,
        formState: { errors }
    } = useForm<FormData>({
        defaultValues: {
            email: '',
            password: '',
            role: 'ADMIN',
            rememberMe: false
        }
    })

    const onSubmit = async (data: FormData) => {
        setIsLoading(true)
        setError('')

        try {
            await login({
                email: data.email,
                password: data.password,
                rememberMe: data.rememberMe
            })

            // Redirect based on role
            switch (data.role) {
                case 'ADMIN':
                    router.push('/admin')
                    break
                case 'QRCODE':
                    router.push('/qr-reader')
                    break
                case 'CLIENTE':
                    router.push('/dashboard')
                    break
                default:
                    router.push('/dashboard')
            }

            onSuccess?.()
        } catch (err) {
            console.error('Erro no login:', err)
            setError(`Erro ao fazer login: ${err instanceof Error ? err.message : 'Verifique suas credenciais.'}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <CardContent className='p-0'>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <Controller
                    name="role"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }: { field: any }) => (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Tipo de Acesso</InputLabel>
                            <Select
                                {...field}
                                label="Tipo de Acesso"
                                error={!!errors.role}
                            >
                                <MenuItem value="ADMIN">
                                    <Box>
                                        <Typography variant="body1" fontWeight="bold">
                                            👑 Administrador
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="QRCODE">
                                    <Box>
                                        <Typography variant="body1" fontWeight="bold">
                                            📱 QR Code
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="CLIENTE">
                                    <Box>
                                        <Typography variant="body1" fontWeight="bold">
                                            👤 Cliente
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            </Select>
                            {errors.role && (
                                <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                                    Campo obrigatório
                                </Typography>
                            )}
                        </FormControl>
                    )}
                />

                <Controller
                    name="email"
                    control={control}
                    rules={{
                        required: 'Campo obrigatório',
                        pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Email inválido'
                        }
                    }}
                    render={({ field }: { field: any }) => (
                        <CustomTextField
                            {...field}
                            fullWidth
                            label="Email"
                            type="email"
                            margin="normal"
                            autoComplete="email"
                            error={!!errors.email}
                            helperText={errors.email?.message || ''}
                        />
                    )}
                />

                <Controller
                    name="password"
                    control={control}
                    rules={{
                        required: 'Campo obrigatório',
                        minLength: {
                            value: 6,
                            message: 'Senha deve ter pelo menos 6 caracteres'
                        }
                    }}
                    render={({ field }: { field: any }) => (
                        <CustomTextField
                            {...field}
                            fullWidth
                            label="Senha"
                            type="password"
                            margin="normal"
                            autoComplete="current-password"
                            error={!!errors.password}
                            helperText={errors.password?.message || ''}
                        />
                    )}
                />

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{
                        mt: 2,
                        mb: 2,
                        color: 'white',
                    }}
                >
                    {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        'Entrar'
                    )}
                </Button>
            </form>
        </CardContent>
    )
}

export default LoginForm
