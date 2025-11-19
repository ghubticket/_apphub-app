import QRCode from 'qrcode';
import crypto from 'crypto';

function b64url(input: Buffer | string): string {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getSecrets() {
    const enc = process.env.QR_SECRET?.trim();
    const hmac = process.env.QR_HMAC_SECRET?.trim() || enc;
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    if (!enc) {
        // Sem QR_SECRET: em dev gera segredo volátil; em prod, erro
        if (isProd) {
            throw new Error('QR_SECRET ausente em produção');
        }
        const dev = crypto.randomBytes(32).toString('hex');
        return { encKey: Buffer.from(dev, 'hex'), hmacKey: Buffer.from(dev, 'hex') };
    }
    const encKey = enc.length === 64 ? Buffer.from(enc, 'hex') : Buffer.from(enc, 'base64');
    let hmacKey =
        hmac && (hmac.length === 64 ? Buffer.from(hmac, 'hex') : Buffer.from(hmac, 'base64'));
    if (encKey.length !== 32) {
        if (isProd) throw new Error('QR_SECRET deve ser 32 bytes (hex de 64 chars ou base64)');
        // dev: tolerar comprimento inválido gerando um temporário
        const dev = crypto.randomBytes(32).toString('hex');
        return { encKey: Buffer.from(dev, 'hex'), hmacKey: Buffer.from(dev, 'hex') };
    }
    if (hmacKey && hmacKey.length !== 32) {
        if (isProd) throw new Error('QR_HMAC_SECRET deve ser 32 bytes (hex/base64)');
        hmacKey = encKey;
    }
    return { encKey, hmacKey: hmacKey || encKey };
}

function encryptPayload(ticketCode: string) {
    const { encKey, hmacKey } = getSecrets();
    const iv = crypto.randomBytes(12); // GCM IV 96 bits
    const nonce = crypto.randomBytes(8); // 64 bits
    const ts = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ v: 1, t: ticketCode, ts, n: b64url(nonce) });
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const parts = [b64url(iv), b64url(ciphertext), b64url(tag), String(ts), b64url(nonce)];
    const dataToSign = parts.join('.');
    const sig = b64url(crypto.createHmac('sha256', hmacKey).update(dataToSign).digest());
    return `QR1.${dataToSign}.${sig}`;
}

/**
 * Gera um QR Code em base64 a partir de um código de ingresso
 * @param ticketCode - Código único do ingresso
 * @returns Promise<string> - QR Code em formato base64 (data URI)
 */
export const generateQRCode = async (ticketCode: string): Promise<string> => {
    try {
        // Gera payload seguro (AES-256-GCM + HMAC + timestamp/nonce)
        const securePayload = encryptPayload(ticketCode);
        // Gera QR Code como Data URL (base64)
        const qrCodeDataUrl = await QRCode.toDataURL(securePayload, {
            errorCorrectionLevel: 'H', // Alto nível de correção de erro
            margin: 1,
            width: 256, // Tamanho da imagem
            color: {
                dark: '#000000', // Cor do QR code
                light: '#FFFFFF', // Cor de fundo
            },
        });

        return qrCodeDataUrl;
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        throw new Error('Falha ao gerar QR Code do ingresso');
    }
};

export function verifyAndDecode(qrPayload: string, maxAgeSeconds: number = 60 * 60 * 24 * 7) {
    if (!qrPayload || !qrPayload.startsWith('QR1.')) {
        throw new Error('QR inválido');
    }
    const parts = qrPayload.split('.');
    // QR1.iv.ct.tag.ts.nonce.sig => 7 partes
    if (parts.length !== 7) throw new Error('Formato de QR inválido');
    const [, ivB64, ctB64, tagB64, tsStr, nonceB64, sigB64] = parts;

    const { encKey, hmacKey } = getSecrets();
    const dataToSign = [ivB64, ctB64, tagB64, tsStr, nonceB64].join('.');
    const expectedSig = b64url(crypto.createHmac('sha256', hmacKey).update(dataToSign).digest());
    if (expectedSig !== sigB64) throw new Error('Assinatura inválida');

    const ts = parseInt(tsStr, 10);
    if (!Number.isFinite(ts)) throw new Error('Timestamp inválido');
    const now = Math.floor(Date.now() / 1000);
    if (now - ts > maxAgeSeconds) throw new Error('QR expirado');

    const iv = Buffer.from(ivB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const ct = Buffer.from(ctB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const tag = Buffer.from(tagB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    const obj = JSON.parse(plaintext);
    if (!obj || obj.v !== 1 || !obj.t) throw new Error('Payload inválido');
    return { ticketCode: obj.t as string, ts, nonce: obj.n as string };
}
