import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'vicente';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {}

// Criar cliente S3 compatível com R2 (apenas se credenciais estiverem configuradas)
let s3Client: S3Client | null = null;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
        region: 'auto', // R2 usa 'auto'
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });
}

/**
 * Upload de imagem para R2
 * @param file Buffer do arquivo
 * @param filename Nome do arquivo
 * @param folder Pasta dentro do bucket (ex: 'events')
 * @returns URL pública da imagem
 */
export async function uploadImageToR2(
    file: Buffer,
    filename: string,
    folder: string = 'events'
): Promise<string> {
    // Se R2 não estiver configurado, retornar null para usar sistema local
    if (!s3Client) {
        throw new Error('R2 não configurado. Configure as variáveis de ambiente R2_*');
    }

    const key = `${folder}/${filename}`;

    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: 'image/png',
        });

        await s3Client.send(command);

        // Retornar URL pública
        if (R2_PUBLIC_URL) {
            // Remover barra final se houver
            const cleanUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
            return `${cleanUrl}/${key}`;
        }

        // Se não tiver R2_PUBLIC_URL configurado, usar URL do R2 diretamente
        // NOTA: Isso só funciona se o bucket tiver public access habilitado
        // Para produção, configure R2_PUBLIC_URL ou domínio customizado
        return `https://pub-${R2_ACCOUNT_ID}.r2.dev/${key}`;
    } catch (error: any) {throw new Error(`Erro ao fazer upload para R2: ${error.message}`);
    }
}

/**
 * Deletar imagem do R2
 * @param key Chave do objeto (ex: 'events/filename.png')
 */
export async function deleteImageFromR2(key: string): Promise<void> {
    if (!s3Client) {
        return; // Se R2 não estiver configurado, não fazer nada
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
    } catch (error: any) {// Não lançar erro - apenas logar
    }
}

/**
 * Obter URL pública da imagem
 * @param key Chave do objeto (ex: 'events/filename.png')
 * @returns URL pública
 */
export function getR2ImageUrl(key: string): string {
    if (R2_PUBLIC_URL) {
        return `${R2_PUBLIC_URL}/${key}`;
    }

    // Fallback: URL do R2
    if (R2_ACCOUNT_ID) {
        return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
    }

    return key; // Fallback
}

/**
 * Verifica se R2 está configurado
 */
export function isR2Configured(): boolean {
    return !!(
        R2_ACCOUNT_ID &&
        R2_ACCESS_KEY_ID &&
        R2_SECRET_ACCESS_KEY &&
        s3Client
    );
}

