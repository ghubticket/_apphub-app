'use client'

import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'

interface SessionExpirationModalProps {
    open: boolean
    timeRemaining: number // em milissegundos
    onExtend: () => Promise<void>
    onLogout: () => Promise<void>
}

export default function SessionExpirationModal({
    open,
    timeRemaining,
    onExtend,
    onLogout
}: SessionExpirationModalProps) {
    const [isExtending, setIsExtending] = useState(false)
    const totalTime = 2 * 60 * 1000 // 2 minutos
    const progress = ((totalTime - timeRemaining) / totalTime) * 100

    const formatTime = (ms: number): string => {
        const seconds = Math.floor(ms / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const handleExtend = async () => {
        setIsExtending(true)
        try {
            await onExtend()
        } finally {
            setIsExtending(false)
        }
    }

    return (
        <Dialog
            open={open}
            onClose={() => {}} // Não permitir fechar clicando fora
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: 24
                }
            }}
        >
            <DialogTitle sx={{ pb: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <i className="tabler-clock text-2xl text-warning" />
                    <Typography variant="h5" component="div">
                        Sessão Expirando
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    Sua sessão está prestes a expirar por inatividade. Você será desconectado automaticamente em:
                </Typography>
                <Box sx={{ mb: 3 }}>
                    <Typography
                        variant="h4"
                        align="center"
                        color="warning.main"
                        sx={{ fontWeight: 'bold', mb: 2 }}
                    >
                        {formatTime(timeRemaining)}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        color="warning"
                        sx={{ height: 8, borderRadius: 1 }}
                    />
                </Box>
                <Typography variant="body2" color="text.secondary" align="center">
                    Clique em "Continuar" para renovar sua sessão ou você será redirecionado para a página de login.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={onLogout}
                    disabled={isExtending}
                >
                    Sair
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleExtend}
                    disabled={isExtending}
                    startIcon={isExtending ? <i className="tabler-loader-2 animate-spin" /> : <i className="tabler-refresh" />}
                >
                    {isExtending ? 'Renovando...' : 'Continuar'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

