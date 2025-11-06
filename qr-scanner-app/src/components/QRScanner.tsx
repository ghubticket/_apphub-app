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
  const addToHistory = useValidationStore((state) => state.addToHistory);

  useEffect(() => {
    return () => {
      // Cleanup ao desmontar
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        {
          facingMode: 'environment', // Câmera traseira
        },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // QR code detectado
          await handleQRCodeDetected(decodedText);
        },
        (errorMessage) => {
          // Ignora erros de leitura (normal durante scanning)
        }
      );

      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao iniciar scanner:', err);
      setError('Erro ao acessar câmera. Verifique as permissões.');
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

    try {
      // Primeiro, escaneia o QR code para obter os dados
      const scanResult = await scanQRCode(qrCode);

      if (!scanResult.success || !scanResult.data) {
        setValidationResult({
          success: false,
          message: scanResult.message || 'QR code inválido',
          errors: [scanResult.message || 'Não foi possível ler o QR code'],
        });

        // Adiciona ao histórico
        addToHistory({
          id: Date.now().toString(),
          ticketCode: qrCode.substring(0, 12),
          ticketHolder: 'N/A',
          eventName: 'N/A',
          status: 'error',
          message: scanResult.message || 'QR code inválido',
          timestamp: new Date(),
        });

        // Reinicia o scanner após 3 segundos
        setTimeout(() => {
          startScanning();
        }, 3000);
        return;
      }

      // Se o QR code foi lido com sucesso, valida o ingresso
      const validationResult = await validateTicket(scanResult.data.code);

      setValidationResult(validationResult);

      // Adiciona ao histórico
      addToHistory({
        id: Date.now().toString(),
        ticketCode: scanResult.data.code,
        ticketHolder: scanResult.data.holder?.name || 'N/A',
        eventName: scanResult.data.event?.name || 'N/A',
        status: validationResult.success ? 'success' : 'error',
        message: validationResult.message,
        timestamp: new Date(),
      });

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

      {validationResult && (
        <ValidationResult result={validationResult} />
      )}
    </div>
  );
};

export default QRScanner;

