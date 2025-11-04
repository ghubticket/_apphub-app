'use client'

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material'

interface SessionTimeoutModalProps {
    open: boolean
    timeLeft: number
    onExtend: () => void
    onLogout: () => void
    formatTime: (seconds: number) => string
}

export const SessionTimeoutModal = ({
    open,
    timeLeft,
    onExtend,
    onLogout,
    formatTime
}: SessionTimeoutModalProps) => {
    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
        >
            <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <Typography variant="h6" component="span">
                    Sessão Expirando
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Box className="flex flex-col items-center gap-4 py-4">
                    <span className="text-6xl">⏰</span>

                    <Typography variant="body1" className="text-center">
                        Sua sessão expirará em:
                    </Typography>

                    <Typography
                        variant="h4"
                        className="font-mono text-red-600"
                        sx={{
                            fontFamily: 'monospace',
                            fontWeight: 'bold'
                        }}
                    >
                        {formatTime(timeLeft)}
                    </Typography>

                    <Typography variant="body2" className="text-center text-gray-600">
                        Por segurança, você será desconectado automaticamente após 5 minutos de inatividade.
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions className="gap-2 p-4">
                <Button
                    variant="outlined"
                    onClick={onLogout}
                    color="error"
                >
                    Sair Agora
                </Button>

                <Button
                    variant="contained"
                    onClick={onExtend}
                    color="primary"
                    className="flex-1"
                >
                    Continuar Sessão
                </Button>
            </DialogActions>
        </Dialog>
    )
}
