'use client'

import React, { useState } from 'react'
import {
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Box,
    TextField,
    InputAdornment,
    Button
} from '@mui/material'
import { Search, Refresh, Logout, LocationOn } from '@mui/icons-material'

interface SessionData {
    _id: string
    deviceInfo: {
        userAgent: string
        ip: string
        device: string
        browser: string
        os: string
    }
    isActive: boolean
    createdAt: string
    lastActivity: string
    user: {
        _id: string
        name: string
        email: string
        role: string
    }
}

interface SessionsTableProps {
    sessions: SessionData[]
    loading: boolean
    onRefresh: () => void
    onLogoutSession: (sessionId: string) => void
    onLogoutAllSessions: () => void
}

const SessionsTable: React.FC<SessionsTableProps> = ({
    sessions,
    loading,
    onRefresh,
    onLogoutSession,
    onLogoutAllSessions
}) => {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredSessions = sessions.filter(session =>
        session?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session?.deviceInfo?.ip?.includes(searchTerm)
    )

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Sessões Ativas</Typography>
                    <Box>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={onRefresh}
                            sx={{ mr: 1 }}
                        >
                            Atualizar
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Logout />}
                            onClick={onLogoutAllSessions}
                        >
                            Encerrar Todas
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Buscar sessões..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 300 }}
                    />
                </Box>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Usuário</TableCell>
                                <TableCell>Dispositivo</TableCell>
                                <TableCell>IP</TableCell>
                                <TableCell>Última Atividade</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredSessions.map((session) => (
                                <TableRow key={session._id}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {session?.user?.name || 'Usuário Desconhecido'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {session?.user?.email || 'Email não disponível'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2">
                                                {session?.deviceInfo?.device || 'Dispositivo Desconhecido'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {session?.deviceInfo?.browser || 'N/A'} - {session?.deviceInfo?.os || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <LocationOn sx={{ mr: 1, fontSize: 16 }} />
                                            <Typography variant="body2">
                                                {session?.deviceInfo?.ip || 'IP não disponível'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {session?.lastActivity ? new Date(session.lastActivity).toLocaleString('pt-BR') : 'N/A'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={session?.isActive ? 'Ativa' : 'Inativa'}
                                            color={session?.isActive ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="Encerrar Sessão">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => onLogoutSession(session._id)}
                                            >
                                                <Logout />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    )
}

export default SessionsTable
