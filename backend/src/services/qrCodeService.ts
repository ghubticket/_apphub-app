import QRCode from 'qrcode';

/**
 * Gera um QR Code em base64 a partir de um código de ingresso
 * @param ticketCode - Código único do ingresso
 * @returns Promise<string> - QR Code em formato base64 (data URI)
 */
export const generateQRCode = async (ticketCode: string): Promise<string> => {
    try {
        // Gera QR Code como Data URL (base64)
        const qrCodeDataUrl = await QRCode.toDataURL(ticketCode, {
            errorCorrectionLevel: 'H', // Alto nível de correção de erro
            margin: 1,
            width: 256, // Tamanho da imagem
            color: {
                dark: '#000000', // Cor do QR code
                light: '#FFFFFF' // Cor de fundo
            }
        });

        return qrCodeDataUrl;
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        throw new Error('Falha ao gerar QR Code do ingresso');
    }
};

