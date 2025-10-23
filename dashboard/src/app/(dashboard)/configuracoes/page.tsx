'use client'

import React, { useState, useEffect } from 'react'
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material'
import { 
  People, 
  Computer, 
  LocationOn, 
  AccessTime, 
  Security,
  Refresh,
  Logout,
  Warning
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { getApiUrl } from '@/config/env'

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

interface SessionStats {
  totalSessions: number
  activeSessions: number
  totalUsers: number
  todayLogins: number
}

const ConfiguracoesPage = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalUsers: 0,
    todayLogins: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null)
  const [confirmDialog, setConfirmDialog] = useState(false)

  // Verificar se é admin
  if (user?.role !== 'ADMIN') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Acesso negado. Apenas administradores podem acessar esta página.
        </Alert>
      </Box>
    )
  }

  // Carregar dados das sessões
  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/auth/sessions`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessions(data.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    } finally {
      setLoading(false)
    }
  }

  // Carregar estatísticas
  const loadStats = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/stats`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.data || {})
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  // Encerrar sessão específica
  const handleLogoutSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        await loadSessions()
        setConfirmDialog(false)
        setSelectedSession(null)
      }
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error)
    }
  }

  // Encerrar todas as sessões
  const handleLogoutAllSessions = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/sessions/all`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        await loadSessions()
        setConfirmDialog(false)
        setSelectedSession(null)
      }
    } catch (error) {
      console.error('Erro ao encerrar todas as sessões:', error)
    }
  }

  useEffect(() => {
    loadSessions()
    loadStats()
  }, [])

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'white' }}>
        Configurações - Gerenciamento de Acessos
      </Typography>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People sx={{ mr: 1 }} />
                <Typography variant="h6">Sessões Ativas</Typography>
              </Box>
              <Typography variant="h4">{stats.activeSessions}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Computer sx={{ mr: 1 }} />
                <Typography variant="h6">Total de Sessões</Typography>
              </Box>
              <Typography variant="h4">{stats.totalSessions}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Security sx={{ mr: 1 }} />
                <Typography variant="h6">Usuários Únicos</Typography>
              </Box>
              <Typography variant="h4">{stats.totalUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTime sx={{ mr: 1 }} />
                <Typography variant="h6">Logins Hoje</Typography>
              </Box>
              <Typography variant="h4">{stats.todayLogins}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabela de Sessões Ativas */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Sessões Ativas</Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadSessions}
                sx={{ mr: 1 }}
              >
                Atualizar
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Logout />}
                onClick={() => {
                  setSelectedSession(null)
                  setConfirmDialog(true)
                }}
              >
                Encerrar Todas
              </Button>
            </Box>
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
                {sessions.map((session) => (
                  <TableRow key={session._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {session.user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {session.user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {session.deviceInfo.device}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.deviceInfo.browser} - {session.deviceInfo.os}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2">
                          {session.deviceInfo.ip}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(session.lastActivity).toLocaleString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.isActive ? 'Ativa' : 'Inativa'}
                        color={session.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Encerrar Sessão">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedSession(session)
                            setConfirmDialog(true)
                          }}
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

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, color: 'warning.main' }} />
            Confirmar Ação
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            {selectedSession 
              ? `Deseja encerrar a sessão de ${selectedSession.user.name}?`
              : 'Deseja encerrar todas as sessões ativas?'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>
            Cancelar
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (selectedSession) {
                handleLogoutSession(selectedSession._id)
              } else {
                handleLogoutAllSessions()
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ConfiguracoesPage
