'use client'

import React, { useState, useEffect } from 'react'
import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    Button, 
    TextField, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    Grid,
    InputAdornment,
    Alert,
    Snackbar
} from '@mui/material'
import { 
    Add, 
    Search, 
    FilterList, 
    Refresh
} from '@mui/icons-material'
import { getApiUrl } from '@/config/env'
import UsersTable from '@/components/tables/UsersTable'
import RequireAuth from '@/components/auth/RequireAuth'

// Interface para usuário
interface User {
    _id: string
    name: string
    email: string
    role: 'ADMIN' | 'CLIENTE' | 'QRCODE'
    phone?: string
    cpf?: string
    isActive: boolean
    lastLogin?: string
    createdAt: string
}

// Interface para paginação
interface Pagination {
    page: number
    limit: number
    total: number
    pages: number
}

// Interface para resposta da API
interface UsersResponse {
    users: User[]
    pagination: Pagination
}

export default function UsuariosPage() {
    const [users, setUsers] = useState<User[]>([])
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Filtros
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    // Carregar usuários
    const loadUsers = async () => {
        try {
            setLoading(true)
            setError(null)

            const token = localStorage.getItem('apphub_access_token')

            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(search && { search }),
                ...(roleFilter && { role: roleFilter }),
                ...(statusFilter !== '' && { status: statusFilter })
            })

            const response = await fetch(`${getApiUrl('/auth/users')}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()

            if (data.success) {
                setUsers(data.data.users)
                setPagination(data.data.pagination)
            } else {
                throw new Error(data.message || 'Erro ao carregar usuários')
            }

        } catch (err: any) {
            console.error('Erro ao carregar usuários:', err)
            setError(err.message || 'Erro ao carregar usuários')
        } finally {
            setLoading(false)
        }
    }

    // Atualizar status do usuário
    const updateUserStatus = async (userId: string, isActive: boolean) => {
        try {
            const token = localStorage.getItem('apphub_access_token')

            const response = await fetch(`${getApiUrl(`/auth/users/${userId}/status`)}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive })
            })

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()

            if (data.success) {
                // Atualizar lista local
                setUsers(prev => prev.map(user =>
                    user._id === userId ? { ...user, isActive } : user
                ))
                setSuccessMessage(data.message || 'Status atualizado com sucesso')
            } else {
                throw new Error(data.message || 'Erro ao atualizar usuário')
            }

        } catch (err: any) {
            console.error('Erro ao atualizar usuário:', err)
            setError(err.message || 'Erro ao atualizar usuário')
        }
    }

    // Editar usuário
    const handleEditUser = (user: User) => {
        console.log('Editar usuário:', user)
        // TODO: Implementar modal de edição
    }

    // Excluir usuário
    const handleDeleteUser = async (userId: string) => {
        try {
            const token = localStorage.getItem('apphub_access_token')

            // TODO: Implementar endpoint de exclusão no backend
            console.log('Excluir usuário:', userId)
            setSuccessMessage('Funcionalidade de exclusão será implementada em breve')
        } catch (err: any) {
            console.error('Erro ao excluir usuário:', err)
            setError(err.message || 'Erro ao excluir usuário')
        }
    }

    // Carregar dados iniciais
    useEffect(() => {
        loadUsers()
    }, [pagination.page, search, roleFilter, statusFilter])

    // Aplicar filtros
    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }))
        loadUsers()
    }

    // Limpar filtros
    const clearFilters = () => {
        setSearch('')
        setRoleFilter('')
        setStatusFilter('')
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    return (
        <RequireAuth role="ADMIN">
            <Box>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Gerenciamento de Usuários
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gerencie usuários do sistema, roles e permissões
                    </Typography>
                </Box>

            {/* Filtros */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Buscar por nome ou email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    label="Role"
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="ADMIN">Admin</MenuItem>
                                    <MenuItem value="CLIENTE">Cliente</MenuItem>
                                    <MenuItem value="QRCODE">QR Code</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    label="Status"
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="true">Ativo</MenuItem>
                                    <MenuItem value="false">Inativo</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Tabela de usuários */}
            <UsersTable
                users={users}
                loading={loading}
                error={error}
                onUpdateStatus={updateUserStatus}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onRefresh={loadUsers}
            />

            {/* Snackbar para mensagens */}
            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={() => setSuccessMessage(null)}
            >
                <Alert
                    onClose={() => setSuccessMessage(null)}
                    severity="success"
                >
                    {successMessage}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert
                    onClose={() => setError(null)}
                    severity="error"
                >
                    {error}
                </Alert>
            </Snackbar>
            </Box>
        </RequireAuth>
    )
}
