'use client'

import React from 'react'
import { Box, Typography, Button, Alert } from '@mui/material'
import { Security, ArrowBack } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

const UnauthorizedPage = () => {
    const router = useRouter()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                p: 3,
                textAlign: 'center'
            }}
        >
            <Security sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />

            <Typography variant="h4" gutterBottom color="error">
                Acesso Negado
            </Typography>

            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                Você não tem permissão para acessar esta página
            </Typography>

            <Alert severity="warning" sx={{ mb: 3, maxWidth: 500 }}>
                Esta área é restrita. Entre em contato com o administrador se você acredita que deveria ter acesso.
            </Alert>

            <Button
                variant="contained"
                startIcon={<ArrowBack />}
                onClick={() => router.back()}
                size="large"
            >
                Voltar
            </Button>
        </Box>
    )
}

export default UnauthorizedPage
