import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanQRCode, validateTicket } from '../services/validationService';
import { useValidationStore } from '../store/validationStore';
import ValidationResult from './ValidationResult';
import { ValidationResult as ValidationResultType } from '../types';
import { logger } from '../utils/logger';

interface QRScannerProps {
  onScanningChange?: (isScanning: boolean) => void;
}

// Configuração de ambiente
const QR_SCAN_DEBOUNCE_MS = 1000; // Prevenir múltiplas validações do mesmo QR em 1s
const OVERLAY_DURATION_SUCCESS = 2000;
const OVERLAY_DURATION_ERROR = 5000;

const QRScanner = ({ onScanningChange }: QRScannerProps) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Refs para controle de processamento
  const isProcessingRef = useRef(false);
  const lastScannedQrRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const addToHistory = useValidationStore((state) => state.addToHistory);
  const syncHistory = useValidationStore((state) => state.syncHistory);

  // Função para parar scanner (cleanup)
  const stopScanning = useCallback(async () => {
    // Limpar MutationObserver se existir
    if (scannerRef.current && (scannerRef.current as any)._dashboardObserver) {
      (scannerRef.current as any)._dashboardObserver.disconnect();
      delete (scannerRef.current as any)._dashboardObserver;
    }
    
    // Limpar intervalo de estabilização
    if (scannerRef.current && (scannerRef.current as any)._stabilizeInterval) {
      clearInterval((scannerRef.current as any)._stabilizeInterval);
      delete (scannerRef.current as any)._stabilizeInterval;
    }
    
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        logger.error('Erro ao parar scanner:', err);
      }
    }
    setIsScanning(false);
    onScanningChange?.(false);
  }, [onScanningChange]);

  // Função para iniciar scanner
  const startScanning = useCallback(async () => {
    if (isScanning || !scannerRef.current) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Seu navegador não suporta acesso à câmera.');
        return;
      }

      // Limpar scanner anterior
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch {
          // Ignorar erro de limpeza
        }
      }

      // Garantir que o elemento tem o ID correto
      if (!scannerRef.current.id) {
        scannerRef.current.id = 'qr-reader';
      }
      
      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      // Configuração simplificada - apenas traseira (sem múltiplas tentativas)
      const cameraConfig = {
        facingMode: { exact: 'environment' } as const,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      // Tentativa única - sem múltiplas estratégias (evita delay e múltiplas aberturas)
      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          // SEM qrbox = lê de toda a tela (mais rápido, sem travamentos)
          qrbox: undefined, // Lê de toda a tela
          aspectRatio: 1.0,
          disableFlip: false,
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        (decodedText) => {
          handleQRCodeDetected(decodedText);
        },
        () => {
          // Ignorar erros de leitura (normal quando não há QR code visível)
        }
      );

      setIsScanning(true);
      setError(null);
      onScanningChange?.(true);
      
      // Função para ocultar APENAS o dashboard (fita preta), sem quebrar o scanner
      const hideDashboard = () => {
        if (!scannerRef.current) return;
        
        // Ocultar APENAS o dashboard principal (fita preta)
        const dashboard = scannerRef.current.querySelector('#qr-reader__dashboard');
        if (dashboard) {
          const el = dashboard as HTMLElement;
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.height = '0';
          el.style.overflow = 'hidden';
          el.style.position = 'absolute';
          el.style.top = '-9999px';
        }
      };
      
      // Ocultar dashboard após delay (apenas uma vez)
      setTimeout(hideDashboard, 500);
      
      // MutationObserver simplificado - apenas para dashboard (menos overhead)
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              const el = node as HTMLElement;
              if (el.id === 'qr-reader__dashboard') {
                hideDashboard();
                break; // Encontrou, pode parar
              }
            }
          }
        }
      });
      
      if (scannerRef.current) {
        observer.observe(scannerRef.current, {
          childList: true,
          subtree: true,
        });
        (scannerRef.current as any)._dashboardObserver = observer;
      }
      
      // Verificação única e simplificada (apenas para ocultar dashboard)
      // Não precisa verificar múltiplas vezes - modo tela cheia não usa canvas
      
      // Verificação otimizada - apenas quando necessário (menos overhead)
      // Verificar vídeos duplicados apenas uma vez após inicialização
      const checkDuplicates = () => {
        if (!scannerRef.current) return;
        
        const allVideos = scannerRef.current.querySelectorAll('video');
          if (allVideos.length > 1) {
          // Manter apenas o primeiro vídeo (principal) e parar streams dos outros
          for (let i = 1; i < allVideos.length; i++) {
            const video = allVideos[i] as HTMLVideoElement;
            const stream = video.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
            video.remove(); // Remover do DOM completamente
          }
        }
      };
      
      // Verificar após um delay (quando html5-qrcode terminar de inicializar)
      setTimeout(checkDuplicates, 1000);
      
      // Verificação contínua mínima - apenas para vídeos duplicados (a cada 2s)
      const stabilizeInterval = setInterval(() => {
        if (!scannerRef.current || !isScanning) {
          clearInterval(stabilizeInterval);
          return;
        }
        
        // Apenas verificar vídeos duplicados (raro, mas pode acontecer)
        const allVideos = scannerRef.current.querySelectorAll('video');
        if (allVideos.length > 1) {
          for (let i = 1; i < allVideos.length; i++) {
            const video = allVideos[i] as HTMLVideoElement;
            const stream = video.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
            video.remove();
          }
        }
      }, 2000); // Verificar a cada 2s (menos frequente = menos overhead)
      
      // Limpar intervalo quando scanner parar
      (scannerRef.current as any)._stabilizeInterval = stabilizeInterval;
    } catch (err: any) {
      const errorName = err?.name || 'Unknown';
      const errorMsg = err?.message || 'Erro desconhecido';
      
      let errorMessage = 'Erro ao acessar câmera. ';
      if (errorName === 'NotAllowedError') {
        errorMessage += 'Permissão negada. Permita o acesso à câmera.';
      } else if (errorName === 'NotFoundError') {
        errorMessage += 'Nenhuma câmera encontrada.';
      } else if (errorName === 'NotReadableError') {
        errorMessage += 'Câmera já está em uso.';
      } else if (errorName === 'OverconstrainedError') {
        errorMessage += 'Não foi possível acessar a câmera traseira.';
      } else {
        errorMessage += errorMsg;
      }
      
      setError(errorMessage);
      setIsScanning(false);
      onScanningChange?.(false);
    }
  }, [isScanning]);

  // Função otimizada para processar QR code detectado
  const handleQRCodeDetected = useCallback(async (qrCode: string) => {
    const now = Date.now();
    
    // Debounce: prevenir múltiplas validações do mesmo QR code
    if (
      qrCode === lastScannedQrRef.current &&
      now - lastScanTimeRef.current < QR_SCAN_DEBOUNCE_MS
    ) {
      return; // Silencioso - não precisa logar
    }

    // Prevenir processamento simultâneo
    if (isProcessingRef.current) {
      return; // Silencioso - não precisa logar
    }

    isProcessingRef.current = true;
    lastScannedQrRef.current = qrCode;
    lastScanTimeRef.current = now;

    try {
      // Limpar timeout anterior do overlay
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }

      // Escanear QR code
      const scanResult = await scanQRCode(qrCode);

      if (!scanResult.success || !scanResult.data) {
        // Tentar extrair código manualmente
        let ticketCode = '';
        if (qrCode.length >= 12) {
          if (/^[A-Z0-9]{12}/.test(qrCode)) {
            ticketCode = qrCode.substring(0, 12).toUpperCase();
          } else {
            const codeMatch = qrCode.match(/[A-Z0-9]{12}/);
            if (codeMatch) ticketCode = codeMatch[0];
          }
        }

        // Montar mensagem de erro
        let errorMessage = scanResult.message || 'QR code inválido';
        
        if ((scanResult as any).reason === 'replay_detected' || (scanResult as any).alreadyUsed) {
          const replayData = scanResult as any;
          if (replayData.firstPassedHolder && replayData.usedAt) {
            const formattedTime = new Date(replayData.usedAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            errorMessage = `QR já UTILIZADO por: ${replayData.firstPassedHolder} em ${formattedTime}`;
          }
        }

        setValidationResult({
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        });

        // Adicionar ao histórico
        addToHistory({
          id: `${Date.now()}-${ticketCode}`,
          ticketCode: ticketCode || 'N/A',
          ticketHolder: 'N/A',
          eventName: 'N/A',
          status: 'error',
          message: errorMessage,
          timestamp: new Date(),
        });

        // Mostrar overlay
        setShowOverlay(true);
        overlayTimeoutRef.current = setTimeout(() => {
          setShowOverlay(false);
          setValidationResult(null);
        }, OVERLAY_DURATION_ERROR);

        // Sincronizar histórico (debounced)
        setTimeout(() => syncHistory(), 500);
        return;
      }

      // Validar ticket
      const validationResult = await validateTicket(scanResult.data.code);

      // Extrair informações do portador e evento
      let ticketHolder = 'N/A';
      let eventName = 'N/A';

      if (validationResult.data) {
        ticketHolder = (validationResult.data.holder as any)?.name || 'N/A';
        eventName = (validationResult.data.event as any)?.name || 'N/A';
      }

      if (ticketHolder === 'N/A' && scanResult.data?.holder) {
        ticketHolder = (scanResult.data.holder as any)?.name || 'N/A';
      }
      if (eventName === 'N/A' && scanResult.data?.event) {
        eventName = (scanResult.data.event as any)?.name || 'N/A';
      }

      // Melhorar mensagem para replay
      let finalMessage = validationResult.message;
      if (
        (validationResult.alreadyUsed || 
         validationResult.reason === 'replay_detected' || 
         validationResult.reason === 'already_used') &&
        validationResult.firstPassedHolder &&
        validationResult.usedAt
      ) {
        const formattedTime = new Date(validationResult.usedAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        finalMessage = `QR já UTILIZADO por: ${validationResult.firstPassedHolder} em ${formattedTime}`;
      }

      setValidationResult(validationResult);

      // Adicionar ao histórico
      addToHistory({
        id: `${Date.now()}-${scanResult.data.code}`,
        ticketCode: scanResult.data.code,
        ticketHolder,
        eventName,
        status: validationResult.success ? 'success' : 'error',
        message: finalMessage,
        timestamp: new Date(),
      });

      // Mostrar overlay
      setShowOverlay(true);
      overlayTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
        setValidationResult(null);
      }, validationResult.success ? OVERLAY_DURATION_SUCCESS : OVERLAY_DURATION_ERROR);

      // Sincronizar histórico (debounced)
      setTimeout(() => syncHistory(), 500);
    } catch (err: any) {
      logger.error('Erro ao processar QR code:', err);
      setError('Erro ao processar QR code. Tente novamente.');
      setShowOverlay(true);
      overlayTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
        setError(null);
      }, OVERLAY_DURATION_ERROR);
    } finally {
      isProcessingRef.current = false;
    }
  }, [addToHistory, syncHistory]);

  // Auto-iniciar scanner
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isScanning) {
        startScanning();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      stopScanning();
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handler para fechar overlay
  const handleCloseOverlay = useCallback(() => {
    setShowOverlay(false);
    setValidationResult(null);
    setError(null);
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
  }, []);

  // Memoizar conteúdo do overlay
  const overlayContent = useMemo(() => {
    if (!showOverlay) return null;
    
    if (validationResult) {
      return <ValidationResult result={validationResult} />;
    }
    
    if (error) {
      return (
        <div className="alert alert-danger">
          {error}
        </div>
      );
    }
    
    return null;
  }, [showOverlay, validationResult, error]);

  return (
    <div className="qr-scanner-container">
      {!isScanning && (
        <div className="scanner-controls">
          <button onClick={startScanning} className="btn btn-primary">
            Iniciar liberação de ingressos
          </button>
        </div>
      )}

      <div
        id="qr-reader"
        ref={scannerRef}
        className="qr-reader-fullscreen"
        style={{
          display: isScanning ? 'block' : 'none',
        }}
      />

      {showOverlay && overlayContent && (
        <div 
          className="scanner-overlay"
          onClick={handleCloseOverlay}
        >
          <div 
            className="scanner-overlay-content"
            onClick={(e) => e.stopPropagation()}
          >
            {overlayContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
