import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits para GCM

/**
 * Obtém a chave de criptografia do ambiente
 * Deve ser 32 bytes (64 caracteres hex ou base64)
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY?.trim();
    const isProd = (process.env.NODE_ENV || 'development') === 'production';

    if (!key) {
        if (isProd) {
            throw new Error(
                'ENCRYPTION_KEY é obrigatório em produção. Configure uma chave de 32 bytes (64 caracteres hex ou base64).'
            );
        }
        // Em desenvolvimento, gerar chave temporária (volátil) sem logar para evitar ruído
        return crypto.randomBytes(32);
    }

    // Tentar interpretar como hex (64 caracteres) ou base64
    let keyBuffer: Buffer;
    if (key.length === 64) {
        // Provavelmente hex
        keyBuffer = Buffer.from(key, 'hex');
    } else {
        // Tentar base64
        keyBuffer = Buffer.from(key, 'base64');
    }

    if (keyBuffer.length !== 32) {
        if (isProd) {
            throw new Error(
                `ENCRYPTION_KEY deve ser 32 bytes. Recebido: ${keyBuffer.length} bytes. Use 64 caracteres hex ou base64.`
            );
        }
        // Em desenvolvimento, usar chave temporária silenciosamente
        return crypto.randomBytes(32);
    }

    return keyBuffer;
}

/**
 * Criptografa dados sensíveis usando AES-256-GCM
 * Formato: iv:authTag:encryptedData (tudo em hex)
 *
 * @param plaintext - Texto a ser criptografado
 * @returns String criptografada no formato "iv:authTag:encryptedData"
 */
export function encryptSensitiveData(plaintext: string): string {
    if (!plaintext || plaintext.trim() === '') {
        return '';
    }

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        // Formato: iv:authTag:encryptedData (tudo em hex)
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Erro ao criptografar dados sensíveis:', error);
        throw new Error('Falha ao criptografar dados sensíveis');
    }
}

/**
 * Descriptografa dados sensíveis usando AES-256-GCM
 *
 * @param encryptedData - String criptografada no formato "iv:authTag:encryptedData"
 * @returns Texto descriptografado
 */
export function decryptSensitiveData(encryptedData: string): string {
    if (!encryptedData || encryptedData.trim() === '') {
        return '';
    }

    // Verificar se já está descriptografado (dados antigos ou migração)
    // Se não contém ':', assume que é texto plano (backward compatibility)
    if (!encryptedData.includes(':')) {
        return encryptedData;
    }

    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Formato de dados criptografados inválido');
        }

        const [ivHex, authTagHex, encryptedHex] = parts;
        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (_error) {
        // Em desenvolvimento, não logar erro de descriptografia para evitar ruído.
        // Se falhar, retornamos o valor original (compatibilidade com dados antigos).
        return encryptedData;
    }
}

/**
 * Gera hash SHA-256 de um CPF normalizado para busca eficiente
 * Permite buscar por CPF sem descriptografar todos os registros
 *
 * @param cpf - CPF no formato 000.000.000-00 ou 00000000000 (aceita qualquer formato)
 * @returns Hash SHA-256 do CPF normalizado (apenas dígitos)
 */
export function hashCPFForSearch(cpf: string): string {
    if (!cpf || cpf.trim() === '') {
        return '';
    }

    // Normalizar CPF: remover formatação e manter apenas dígitos
    const normalized = cpf.replace(/\D/g, '');

    if (normalized.length !== 11) {
        return '';
    }

    // Gerar hash SHA-256
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Gera hash SHA-256 de um telefone normalizado para busca eficiente
 *
 * @param phone - Telefone no formato (11) 99999-9999
 * @returns Hash SHA-256 do telefone normalizado (apenas dígitos)
 */
export function hashPhoneForSearch(phone: string): string {
    if (!phone || phone.trim() === '') {
        return '';
    }

    // Normalizar telefone: remover formatação e manter apenas dígitos
    const normalized = phone.replace(/\D/g, '');

    if (normalized.length < 10 || normalized.length > 11) {
        return '';
    }

    // Gerar hash SHA-256
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verifica se uma string está criptografada
 *
 * @param data - String a verificar
 * @returns true se parece estar criptografada (formato "iv:authTag:encryptedData")
 */
export function isEncrypted(data: string): boolean {
    if (!data || data.trim() === '') {
        return false;
    }
    // Formato criptografado: 3 partes separadas por ':'
    const parts = data.split(':');
    return parts.length === 3 && parts.every((part) => /^[0-9a-f]+$/i.test(part));
}
