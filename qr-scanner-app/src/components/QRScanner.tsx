import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanQRCode, validateTicket } from '../services/validationService';
import { useValidationStore } from '../store/validationStore';
import ValidationResult from './ValidationResult';
import { ValidationResult as ValidationResultType } from '../types';

const QRScanner = () => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addToHistory = useValidationStore((state) => state.addToHistory);
  const syncHistory = useValidationStore((state) => state.syncHistory);

  // Função para adicionar log visual
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
    const logMessage = `[${timestamp}] ${emoji} ${message}`;

    console.log(logMessage);

    setDebugLogs(prev => {
      const newLogs = [...prev, logMessage];
      // Manter apenas os últimos 20 logs
      return newLogs.slice(-20);
    });
  };

  useEffect(() => {
    return () => {
      // Cleanup ao desmontar
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => { });
      }
    };
  }, []);

  // Função para testar se uma câmera é traseira
  const testIfCameraIsRear = async (deviceId: string): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      const settings = videoTrack.getSettings();
      const label = videoTrack.label || '';

      stream.getTracks().forEach(track => track.stop());

      // Verificar se é traseira
      const isRear =
        settings.facingMode === 'environment' ||
        label.toLowerCase().includes('back') ||
        label.toLowerCase().includes('rear') ||
        label.toLowerCase().includes('environment') ||
        label.toLowerCase().includes('traseira') ||
        label.toLowerCase().includes('trás') ||
        (!label.toLowerCase().includes('front') &&
          !label.toLowerCase().includes('user') &&
          !label.toLowerCase().includes('facing'));

      return isRear;
    } catch (err) {
      return false;
    }
  };

  // Função para encontrar a câmera traseira TESTANDO cada uma ANTES de iniciar
  const findRearCamera = async (): Promise<MediaTrackConstraints> => {
    addLog('Identificando câmera traseira (testando todas antes de iniciar)...', 'info');

    try {
      // Primeiro, pedir permissão para obter labels completos
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        tempStream.getTracks().forEach(track => track.stop());
        addLog('Permissão de câmera obtida', 'success');
      } catch (permErr) {
        addLog(`Erro ao obter permissão inicial: ${permErr}`, 'warning');
      }

      // Listar todos os dispositivos de mídia
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      addLog(`Encontradas ${videoDevices.length} câmeras`, 'info');
      videoDevices.forEach((d, idx) => {
        addLog(`Câmera ${idx + 1}: ${d.label || 'Sem nome'}`, 'info');
      });

      if (videoDevices.length === 0) {
        addLog('Nenhuma câmera encontrada, usando facingMode exact', 'warning');
        return { facingMode: { exact: 'environment' } };
      }

      // Estratégia 1: Tentar forçar traseira diretamente primeiro
      try {
        addLog('Tentando forçar traseira com facingMode exact...', 'info');
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } }
        });

        const videoTrack = testStream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          const deviceId = settings.deviceId;
          const label = videoTrack.label || '';

          testStream.getTracks().forEach(track => track.stop());

          if (deviceId) {
            addLog(`Câmera traseira acessada diretamente: ${label}`, 'success');
            return { deviceId: { exact: deviceId } };
          }
        }
      } catch (exactErr: any) {
        addLog(`facingMode exact falhou: ${exactErr.name}, testando câmeras individualmente...`, 'warning');
      }

      // Estratégia 2: Testar TODAS as câmeras para identificar qual é traseira
      addLog('Testando todas as câmeras para identificar a traseira...', 'info');

      // Ordem: última primeiro (iOS), depois todas
      const testOrder = [...videoDevices].reverse();

      for (const device of testOrder) {
        addLog(`Testando: ${device.label || device.deviceId}`, 'info');
        const isRear = await testIfCameraIsRear(device.deviceId);

        if (isRear) {
          addLog(`Câmera traseira identificada: ${device.label || device.deviceId}`, 'success');
          return { deviceId: { exact: device.deviceId } };
        } else {
          addLog(`É frontal: ${device.label || device.deviceId}`, 'warning');
        }
      }

      // Estratégia 3: Se não encontrou por teste, usar heurística
      // No iOS, geralmente a última câmera é a traseira
      if (videoDevices.length >= 2) {
        const lastCamera = videoDevices[videoDevices.length - 1];
        addLog(`Usando heurística: última câmera (comum no iOS): ${lastCamera.label}`, 'info');
        return { deviceId: { exact: lastCamera.deviceId } };
      }

      // Estratégia 4: Último recurso - usar facingMode exact
      addLog('Usando facingMode exact como último recurso', 'warning');
      return { facingMode: { exact: 'environment' } };

    } catch (err: any) {
      addLog(`Erro ao identificar câmera traseira: ${err.message}, usando facingMode exact`, 'error');
      return { facingMode: { exact: 'environment' } };
    }
  };

  // Função para verificar qual câmera está ativa
  const checkActiveCamera = async (): Promise<{ isRear: boolean; label: string }> => {
    try {
      const videoElement = scannerRef.current?.querySelector('video') as HTMLVideoElement;
      if (!videoElement || !videoElement.srcObject) {
        return { isRear: false, label: 'Não detectado' };
      }

      const stream = videoElement.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];

      if (!videoTrack) {
        return { isRear: false, label: 'Sem track' };
      }

      const settings = videoTrack.getSettings();
      const label = videoTrack.label || 'Desconhecida';

      // Verificar se é traseira
      const isRear =
        settings.facingMode === 'environment' ||
        label.toLowerCase().includes('back') ||
        label.toLowerCase().includes('rear') ||
        label.toLowerCase().includes('environment') ||
        label.toLowerCase().includes('traseira') ||
        label.toLowerCase().includes('trás');

      console.log('📹 Câmera ativa:', {
        label,
        facingMode: settings.facingMode,
        deviceId: settings.deviceId,
        isRear
      });

      return { isRear, label };
    } catch (err) {
      console.error('❌ Erro ao verificar câmera ativa:', err);
      return { isRear: false, label: 'Erro' };
    }
  };

  const startScanning = async () => {
    addLog('🚀 Iniciando scanner...', 'info');
    setDebugLogs([]); // Limpar logs anteriores

    if (!scannerRef.current) {
      addLog('scannerRef.current é null', 'error');
      return;
    }

    addLog('scannerRef.current existe', 'success');

    try {
      // Verificar se há suporte para getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addLog('Navegador não suporta getUserMedia', 'error');
        setError('Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari.');
        return;
      }

      addLog('Navegador suporta getUserMedia', 'success');

      // Limpar scanner anterior se existir
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
          addLog('Scanner anterior limpo', 'info');
        } catch (e) {
          addLog(`Erro ao limpar scanner anterior: ${e}`, 'warning');
        }
      }

      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      addLog('Html5Qrcode inicializado', 'success');

      // Encontrar câmera traseira ANTES de iniciar (testa todas e identifica a correta)
      addLog('Identificando câmera traseira...', 'info');
      const cameraConfig = await findRearCamera();
      addLog(`Câmera traseira identificada: ${JSON.stringify(cameraConfig)}`, 'success');

      // Usar APENAS a câmera identificada (já foi testada antes)
      // Se falhar, tentar fallbacks
      const strategies = [
        cameraConfig, // Primeira tentativa: câmera já identificada e testada
        { facingMode: { exact: 'environment' } }, // Fallback 1: força traseira
        { facingMode: 'environment' }, // Fallback 2: prefere traseira
      ];

      let lastError: any = null;
      let started = false;

      for (let i = 0; i < strategies.length && !started; i++) {
        try {
          addLog(`Iniciando scanner (tentativa ${i + 1}/${strategies.length})...`, 'info');
          
          // Preparar configuração para html5-qrcode
          // html5-qrcode aceita: string (cameraId) ou MediaTrackConstraints
          let cameraConfig: string | MediaTrackConstraints;
          
          // Se a estratégia tem deviceId, extrair o deviceId e usar como string
          if (strategies[i] && typeof strategies[i] === 'object' && 'deviceId' in strategies[i]) {
            const deviceIdConfig = strategies[i] as { deviceId: { exact: string } };
            const deviceId = deviceIdConfig.deviceId.exact;
            cameraConfig = deviceId; // Passar como string (cameraId)
            addLog(`Usando deviceId como string: ${deviceId}`, 'info');
          } else if (strategies[i] && typeof strategies[i] === 'object' && 'facingMode' in strategies[i]) {
            // Para facingMode, usar como MediaTrackConstraints
            const facingModeConfig = strategies[i] as { facingMode: string | { exact: string } };
            cameraConfig = {
              facingMode: facingModeConfig.facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            };
            addLog(`Usando facingMode: ${JSON.stringify(facingModeConfig.facingMode)}`, 'info');
          } else {
            // Usar diretamente como MediaTrackConstraints
            cameraConfig = strategies[i] as MediaTrackConstraints;
            addLog(`Usando configuração: ${JSON.stringify(cameraConfig)}`, 'info');
          }
          
          await html5QrCode.start(
            cameraConfig, // String (cameraId) ou MediaTrackConstraints
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              addLog(`QR code detectado: ${decodedText}`, 'success');
              await handleQRCodeDetected(decodedText);
            },
            (_errorMessage) => {
              // Ignora erros de leitura (normal durante scanning)
            }
          );

          started = true;
          addLog('Scanner iniciado!', 'success');

          // Verificação silenciosa apenas para log (não causa delay)
          setTimeout(async () => {
            const cameraInfo = await checkActiveCamera();
            if (cameraInfo.isRear) {
              addLog(`Câmera traseira confirmada: ${cameraInfo.label}`, 'success');
            } else {
              addLog(`ATENÇÃO: Câmera frontal detectada: ${cameraInfo.label}`, 'error');
              addLog('A detecção prévia deveria ter evitado isso', 'warning');
            }
          }, 1000);

        } catch (err: any) {
          const errorDetails = err?.name || 'Unknown';
          const errorMessage = err?.message || err?.toString() || 'Erro desconhecido';
          addLog(`Estratégia ${i + 1} falhou: ${errorDetails} - ${errorMessage}`, 'warning');
          addLog(`Detalhes do erro: ${JSON.stringify(err)}`, 'warning');
          lastError = err;
          
          // Se não for a última estratégia, continuar
          if (i < strategies.length - 1) {
            continue;
          }
        }
      }

      if (!started) {
        throw lastError || new Error('Todas as estratégias falharam');
      }

      setIsScanning(true);
      setError(null);

      // Verificar se o vídeo foi renderizado
      setTimeout(() => {
        const videoElement = scannerRef.current?.querySelector('video');
        const scanRegion = scannerRef.current?.querySelector('#qr-reader__scan_region');
        console.log('🎥 Elemento de vídeo:', videoElement);
        console.log('📦 Região de scan:', scanRegion);
        console.log('📱 Estado do scanner:', {
          isPlaying: videoElement?.paused === false,
          videoWidth: videoElement?.videoWidth,
          videoHeight: videoElement?.videoHeight,
          readyState: videoElement?.readyState,
        });
      }, 1000);
    } catch (err: any) {
      const errorName = err?.name || 'Unknown';
      const errorMsg = err?.message || err?.toString() || 'Erro desconhecido';
      addLog(`Erro ao iniciar scanner: ${errorName} - ${errorMsg}`, 'error');
      addLog(`Stack: ${err?.stack || 'N/A'}`, 'error');
      
      let errorMessage = 'Erro ao acessar câmera. ';
      
      if (errorName === 'NotAllowedError' || errorMsg?.includes('permission')) {
        errorMessage += 'Permissão negada. Por favor, permita o acesso à câmera nas configurações do navegador.';
      } else if (errorName === 'NotFoundError' || errorMsg?.includes('camera')) {
        errorMessage += 'Nenhuma câmera encontrada. Verifique se há uma câmera disponível.';
      } else if (errorName === 'NotReadableError' || errorMsg?.includes('readable')) {
        errorMessage += 'Câmera já está em uso por outro aplicativo.';
      } else if (errorName === 'OverconstrainedError' || errorMsg?.includes('constraint')) {
        errorMessage += 'Não foi possível acessar a câmera traseira. Verifique as permissões e tente novamente.';
      } else if (errorMsg?.includes('HTTPS') || errorMsg?.includes('secure')) {
        errorMessage += 'Acesso à câmera requer HTTPS em produção. Em desenvolvimento local, use http://localhost.';
      } else {
        errorMessage += `Erro: ${errorName} - ${errorMsg}`;
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Erro ao parar scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleQRCodeDetected = async (qrCode: string) => {
    // Para o scanner temporariamente
    await stopScanning();

    addLog(`QR code detectado: ${qrCode.substring(0, 50)}...`, 'info');
    addLog(`Tamanho do QR: ${qrCode.length} caracteres`, 'info');

    try {
      // Primeiro, escaneia o QR code para obter os dados
      addLog('Enviando QR code para o backend...', 'info');
      const scanResult = await scanQRCode(qrCode);
      addLog(`Resultado do scan: ${scanResult.success ? 'Sucesso' : 'Falha'}`, scanResult.success ? 'success' : 'error');

      if (!scanResult.success || !scanResult.data) {
        addLog(`Scan falhou: ${scanResult.message}`, 'error');
        
        // Tentar extrair código do QR mesmo quando scan falha
        // O QR code pode estar em formato diferente, tentar extrair código
        let ticketCode = '';
        
        // Tentar extrair código de diferentes formatos
        if (qrCode.length >= 12) {
          // Se parece ser um código direto
          if (/^[A-Z0-9]{12}/.test(qrCode)) {
            ticketCode = qrCode.substring(0, 12).toUpperCase();
            addLog(`Código extraído do QR: ${ticketCode}`, 'info');
          } else {
            // Tentar encontrar código no QR
            const codeMatch = qrCode.match(/[A-Z0-9]{12}/);
            if (codeMatch) {
              ticketCode = codeMatch[0];
              addLog(`Código encontrado no QR: ${ticketCode}`, 'info');
            } else {
              ticketCode = qrCode.substring(0, 12);
              addLog(`Usando primeiros 12 caracteres como código: ${ticketCode}`, 'warning');
            }
          }
        } else {
          addLog('QR code muito curto para extrair código', 'error');
        }

        let ticketHolder = 'N/A';
        let eventName = 'N/A';

        // Tentar buscar ticket pelo código mesmo quando scan falha
        if (ticketCode && ticketCode.length === 12) {
          try {
            addLog(`Buscando ticket pelo código: ${ticketCode}`, 'info');
            const { getTicketByCode } = await import('../services/validationService');
            const ticket = await getTicketByCode(ticketCode);
            if (ticket) {
              addLog('Ticket encontrado!', 'success');
              if (ticket.holder) {
                ticketHolder = (ticket.holder as any)?.name || 'N/A';
                addLog(`Portador encontrado: ${ticketHolder}`, 'success');
              }
              if (ticket.event) {
                eventName = (ticket.event as any)?.name || 'N/A';
                addLog(`Evento encontrado: ${eventName}`, 'success');
              }
            } else {
              addLog('Ticket não encontrado no banco', 'warning');
            }
          } catch (err: any) {
            addLog(`Erro ao buscar ticket: ${err.message}`, 'error');
          }
        }

        // Tentar buscar informações de replay se o ticket foi encontrado
        let errorMessage = scanResult.message || 'QR code inválido';
        
        // Se o scanResult já tem informações de replay (vindo do scanSecureQr), usar diretamente
        if ((scanResult as any).reason === 'replay_detected' || (scanResult as any).alreadyUsed) {
          if ((scanResult as any).firstPassedHolder && (scanResult as any).usedAt) {
            const usedAtDate = new Date((scanResult as any).usedAt);
            const formattedTime = usedAtDate.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            errorMessage = `QR já UTILIZADO por: ${(scanResult as any).firstPassedHolder} em ${formattedTime}`;
            addLog(`Mensagem de replay do scanSecureQr: ${errorMessage}`, 'info');
          }
        } else if (ticketHolder !== 'N/A' || eventName !== 'N/A') {
          // Se não veio do scanSecureQr, tentar buscar do ticket
          try {
            const { getTicketByCode } = await import('../services/validationService');
            const ticket = await getTicketByCode(ticketCode);
            if (ticket && ticket.status === 'used' && ticket.usedAt) {
              const usedAtDate = new Date(ticket.usedAt);
              const formattedTime = usedAtDate.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              const whoUsed = (ticket.usedByHolderId as any)?.name || 
                             (ticket.usedBy as any)?.name || 
                             ticketHolder;
              errorMessage = `QR já UTILIZADO por: ${whoUsed} em ${formattedTime}`;
              addLog(`Mensagem de replay melhorada: ${errorMessage}`, 'info');
            }
          } catch (err) {
            // Ignorar erro
          }
        }

        setValidationResult({
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        });

        // Adiciona ao histórico
        addToHistory({
          id: Date.now().toString(),
          ticketCode,
          ticketHolder,
          eventName,
          status: 'error',
          message: errorMessage,
          timestamp: new Date(),
        });

        // Sincronizar histórico com backend após adicionar
        setTimeout(() => {
          syncHistory();
        }, 500);

        // Reinicia o scanner após 3 segundos
        setTimeout(() => {
          startScanning();
        }, 3000);
        return;
      }

      // Se o QR code foi lido com sucesso, valida o ingresso
      addLog(`Validando ticket: ${scanResult.data.code}`, 'info');
      const validationResult = await validateTicket(scanResult.data.code);
      addLog(`Validação: ${validationResult.success ? 'Sucesso' : 'Falha'} - ${validationResult.message}`, validationResult.success ? 'success' : 'error');

      setValidationResult(validationResult);

      // Extrair informações do portador e evento
      // Prioridade: validationResult.data > scanResult.data > buscar por código
      let ticketHolder = 'N/A';
      let eventName = 'N/A';

      // Tentar pegar do resultado da validação (mesmo quando há erro, pode ter dados)
      if (validationResult.data) {
        addLog('Tentando extrair dados do validationResult.data', 'info');
        if (validationResult.data.holder) {
          ticketHolder = (validationResult.data.holder as any)?.name || 
                        (typeof validationResult.data.holder === 'string' ? validationResult.data.holder : 'N/A');
          addLog(`Portador do validationResult: ${ticketHolder}`, ticketHolder !== 'N/A' ? 'success' : 'warning');
        }
        if (validationResult.data.event) {
          eventName = (validationResult.data.event as any)?.name || 
                     (typeof validationResult.data.event === 'string' ? validationResult.data.event : 'N/A');
          addLog(`Evento do validationResult: ${eventName}`, eventName !== 'N/A' ? 'success' : 'warning');
        }
      }

      // Se não encontrou, tentar do scanResult
      if (ticketHolder === 'N/A' && scanResult.data?.holder) {
        ticketHolder = (scanResult.data.holder as any)?.name || 'N/A';
        addLog(`Portador do scanResult: ${ticketHolder}`, 'success');
      }
      if (eventName === 'N/A' && scanResult.data?.event) {
        eventName = (scanResult.data.event as any)?.name || 'N/A';
        addLog(`Evento do scanResult: ${eventName}`, 'success');
      }

      // Se ainda não encontrou, buscar o ticket pelo código
      if (ticketHolder === 'N/A' || eventName === 'N/A') {
        try {
          addLog(`Buscando ticket completo pelo código: ${scanResult.data.code}`, 'info');
          const { getTicketByCode } = await import('../services/validationService');
          const ticket = await getTicketByCode(scanResult.data.code);
          if (ticket) {
            addLog('Ticket completo encontrado!', 'success');
            if (ticketHolder === 'N/A' && ticket.holder) {
              ticketHolder = (ticket.holder as any)?.name || 'N/A';
              addLog(`Portador do ticket completo: ${ticketHolder}`, 'success');
            }
            if (eventName === 'N/A' && ticket.event) {
              eventName = (ticket.event as any)?.name || 'N/A';
              addLog(`Evento do ticket completo: ${eventName}`, 'success');
            }
          } else {
            addLog('Ticket não encontrado no banco', 'warning');
          }
        } catch (err: any) {
          addLog(`Erro ao buscar ticket por código: ${err.message}`, 'error');
        }
      }

      addLog(`Dados finais - Portador: ${ticketHolder}, Evento: ${eventName}`, 'info');

      // Montar mensagem melhorada para replay
      let finalMessage = validationResult.message;
      
      // Se for replay/already used, melhorar mensagem com nome e horário
      if ((validationResult.alreadyUsed || validationResult.reason === 'replay_detected' || validationResult.reason === 'already_used') && validationResult.firstPassedHolder && validationResult.usedAt) {
        const usedAtDate = new Date(validationResult.usedAt);
        const formattedTime = usedAtDate.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        finalMessage = `QR já UTILIZADO por: ${validationResult.firstPassedHolder} em ${formattedTime}`;
        addLog(`Mensagem de replay melhorada: ${finalMessage}`, 'info');
      }

      // Adiciona ao histórico
      addToHistory({
        id: Date.now().toString(),
        ticketCode: scanResult.data.code,
        ticketHolder,
        eventName,
        status: validationResult.success ? 'success' : 'error',
        message: finalMessage,
        timestamp: new Date(),
      });

      // Sincronizar histórico com backend após adicionar
      setTimeout(() => {
        syncHistory();
      }, 500);

      // Reinicia o scanner após mostrar resultado
      setTimeout(() => {
        setValidationResult(null);
        startScanning();
      }, validationResult.success ? 2000 : 5000);
    } catch (err: any) {
      console.error('Erro ao processar QR code:', err);
      setError('Erro ao processar QR code. Tente novamente.');

      // Reinicia o scanner após 3 segundos
      setTimeout(() => {
        startScanning();
      }, 3000);
    }
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-controls">
        {!isScanning ? (
          <button onClick={startScanning} className="btn btn-primary">
            Iniciar Scanner
          </button>
        ) : (
          <button onClick={stopScanning} className="btn btn-secondary">
            Parar Scanner
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div
        id="qr-reader"
        ref={scannerRef}
        style={{
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          display: isScanning ? 'block' : 'none',
        }}
      />

      {!isScanning && !error && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#666',
          background: 'white',
          borderRadius: '12px',
          marginTop: '1rem'
        }}>
          <p>Clique em "Iniciar Scanner" para começar a validar ingressos</p>
        </div>
      )}

      {validationResult && (
        <ValidationResult result={validationResult} />
      )}

      {/* Área de Debug - Logs Visuais */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#f5f5f5',
        borderRadius: '8px',
        maxHeight: '300px',
        overflowY: 'auto',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <div style={{
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333'
        }}>
          📋 Logs de Debug:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {debugLogs.length === 0 ? (
            <div style={{ color: '#999', fontStyle: 'italic' }}>
              Nenhum log ainda. Clique em "Iniciar Scanner" para ver os logs.
            </div>
          ) : (
            debugLogs.map((log, index) => (
              <div
                key={index}
                style={{
                  padding: '4px 8px',
                  background: log.includes('✅') ? '#e8f5e9' :
                    log.includes('⚠️') ? '#fff3e0' :
                      log.includes('❌') ? '#ffebee' : '#f0f0f0',
                  borderRadius: '4px',
                  wordBreak: 'break-word',
                  color: '#333'
                }}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

