'use client'

import React, { useState, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
  Grid,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material'
import { QrCodeScanner, CheckCircle, Error, Refresh } from '@mui/icons-material'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

interface QRScanResult {
  id: string
  eventName: string
  ticketType: string
  isValid: boolean
  scannedAt: Date
  attendeeName: string
}

const QRReaderPage: React.FC = () => {
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanHistory, setScanHistory] = useState<QRScanResult[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleQRScan = (data: string) => {
    try {
      // Simulate QR code parsing
      const qrData = JSON.parse(data)
      
      const result: QRScanResult = {
        id: qrData.id || 'unknown',
        eventName: qrData.eventName || 'Evento Teste',
        ticketType: qrData.ticketType || 'VIP',
        isValid: qrData.isValid !== false,
        scannedAt: new Date(),
        attendeeName: qrData.attendeeName || 'João Silva'
      }

      setScanResult(result)
      setScanHistory(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 scans
    } catch (error) {
      console.error('Error parsing QR code:', error)
      setScanResult({
        id: 'error',
        eventName: 'Erro',
        ticketType: 'Inválido',
        isValid: false,
        scannedAt: new Date(),
        attendeeName: 'Código inválido'
      })
    }
  }

  const handleManualScan = () => {
    if (manualCode.trim()) {
      handleQRScan(manualCode)
      setManualCode('')
    }
  }

  const startScanning = () => {
    setIsScanning(true)
    // TODO: Implement actual camera scanning
    // For now, simulate a scan after 2 seconds
    setTimeout(() => {
      const mockQRData = JSON.stringify({
        id: 'ticket_123',
        eventName: 'Festival de Música 2024',
        ticketType: 'VIP',
        isValid: true,
        attendeeName: 'Maria Santos'
      })
      handleQRScan(mockQRData)
      setIsScanning(false)
    }, 2000)
  }

  const stopScanning = () => {
    setIsScanning(false)
  }

  const clearHistory = () => {
    setScanHistory([])
    setScanResult(null)
  }

  return (
    <ProtectedRoute requiredRole="TURMA">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          📱 Leitor de QR Codes
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Escaneie os QR codes dos ingressos para validar a entrada
        </Typography>

        <Grid container spacing={3}>
          {/* Scanner Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scanner de QR Code
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<QrCodeScanner />}
                    onClick={startScanning}
                    disabled={isScanning}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    {isScanning ? 'Escaneando...' : 'Iniciar Scanner'}
                  </Button>
                  
                  {isScanning && (
                    <Button
                      variant="outlined"
                      onClick={stopScanning}
                      fullWidth
                    >
                      Parar Scanner
                    </Button>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Ou digite o código manualmente:
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Cole o código QR aqui"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleManualScan}
                    disabled={!manualCode.trim()}
                  >
                    Validar
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Result Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resultado da Validação
                </Typography>
                
                {scanResult ? (
                  <Box>
                    <Alert
                      severity={scanResult.isValid ? 'success' : 'error'}
                      icon={scanResult.isValid ? <CheckCircle /> : <Error />}
                      sx={{ mb: 2 }}
                    >
                      {scanResult.isValid ? 'Ingresso Válido!' : 'Ingresso Inválido!'}
                    </Alert>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Evento:</strong> {scanResult.eventName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Tipo:</strong> {scanResult.ticketType}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Participante:</strong> {scanResult.attendeeName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Escaneado em:</strong> {scanResult.scannedAt.toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Chip
                      label={scanResult.isValid ? 'Válido' : 'Inválido'}
                      color={scanResult.isValid ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhum QR code escaneado ainda
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* History Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Histórico de Escaneamentos
                  </Typography>
                  <Tooltip title="Limpar histórico">
                    <IconButton onClick={clearHistory} size="small">
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {scanHistory.length > 0 ? (
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {scanHistory.map((scan, index) => (
                      <Paper
                        key={index}
                        sx={{
                          p: 2,
                          mb: 1,
                          border: '1px solid',
                          borderColor: scan.isValid ? 'success.main' : 'error.main',
                          bgcolor: scan.isValid ? 'success.50' : 'error.50'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {scan.eventName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {scan.attendeeName} • {scan.ticketType}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Chip
                              label={scan.isValid ? 'Válido' : 'Inválido'}
                              color={scan.isValid ? 'success' : 'error'}
                              size="small"
                            />
                            <Typography variant="caption" display="block" color="text.secondary">
                              {scan.scannedAt.toLocaleTimeString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhum escaneamento realizado ainda
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ProtectedRoute>
  )
}

export default QRReaderPage
