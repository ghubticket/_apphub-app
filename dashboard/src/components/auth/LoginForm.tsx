'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Box,
    Button,
    TextField,
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
    Divider
} from '@mui/material'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/userTypes'

interface LoginFormProps {
    onSuccess?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'ADMIN' as UserRole,
        rememberMe: false
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const { login } = useAuth()
    const router = useRouter()

    const handleChange = (field: string) => (event: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }))
    }

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            rememberMe: event.target.checked
        }))
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            await login({
                email: formData.email,
                password: formData.password,
                rememberMe: formData.rememberMe
            })

            // Redirect based on role
            switch (formData.role) {
                case 'ADMIN':
                    router.push('/admin')
                    break
                case 'TURMA':
                    router.push('/qr-reader')
                    break
                default:
                    router.push('/admin')
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

            <form onSubmit={handleSubmit}>
                <FormControl fullWidth margin="normal">
                    <InputLabel>Tipo de Acesso</InputLabel>
                    <Select
                        value={formData.role}
                        onChange={handleChange('role')}
                        label="Tipo de Acesso"
                    >
                        <MenuItem value="ADMIN">
                            <Box>
                                <Typography variant="body1" fontWeight="bold">
                                    👑 Administrador
                                </Typography>
                                
                            </Box>
                        </MenuItem>
                        <MenuItem value="TURMA">
                            <Box>
                                <Typography variant="body1" fontWeight="bold">
                                    📱  QR Code
                                </Typography>
                            </Box>
                        </MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    margin="normal"
                    required
                    autoComplete="email"
                />

                <TextField
                    fullWidth
                    label="Senha"
                    type="password"
                    value={formData.password}
                    onChange={handleChange('password')}
                    margin="normal"
                    required
                    autoComplete="current-password"
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
