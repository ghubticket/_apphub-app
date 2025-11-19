import multer from 'multer';
import path from 'path';
import fs from 'fs';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const uploadsRoot = path.join(process.cwd(), 'uploads', 'events');
fs.mkdirSync(uploadsRoot, { recursive: true });

// Magic bytes PNG: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsRoot),
    filename: (_req, file, cb) => {
        // Sanitização do nome: remove caracteres perigosos, limita tamanho
        const safeBase = path
            .parse(file.originalname)
            .name.replace(/[^a-zA-Z0-9-_]/g, '_')
            .substring(0, 50); // Limitar tamanho do nome
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${safeBase}-${unique}.png`);
    },
});

/**
 * Validação robusta de arquivo PNG
 * - Verifica MIME type
 * - Verifica extensão do arquivo original
 * - Verifica magic bytes (assinatura real do PNG) após upload
 */
function pngOnlyFilter(_req: any, file: any, cb: multer.FileFilterCallback) {
    // 1. Validar MIME type
    if (file.mimetype !== 'image/png') {
        return cb(new Error('Apenas arquivos PNG são permitidos (MIME type inválido)'));
    }

    // 2. Validar extensão do arquivo original
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.png') {
        return cb(new Error('Apenas arquivos com extensão .png são permitidos'));
    }

    cb(null, true);
}

/**
 * Middleware para validar magic bytes após upload
 * Garante que o arquivo é realmente um PNG, não apenas um arquivo renomeado
 */
export const validatePngMagicBytes = (req: any, res: any, next: any) => {
    const filesMap = req.files as { [field: string]: any[] } | undefined;

    if (!filesMap) {
        return next();
    }

    const files = Object.values(filesMap).flat();

    for (const file of files) {
        if (!file.path) continue;

        try {
            // Ler os primeiros 8 bytes do arquivo
            const buffer = fs.readFileSync(file.path);
            const magicBytes = buffer.slice(0, 8);

            // Verificar se corresponde à assinatura PNG
            if (!magicBytes.equals(PNG_MAGIC_BYTES)) {
                // Remover arquivo inválido
                fs.unlinkSync(file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Arquivo não é um PNG válido (assinatura inválida)',
                    errors: [`Arquivo ${file.originalname} não é um PNG válido`],
                });
            }

            // Verificar tamanho do arquivo (dupla verificação)
            if (buffer.length > MAX_SIZE_BYTES) {
                fs.unlinkSync(file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Arquivo muito grande',
                    errors: [`Arquivo ${file.originalname} excede o limite de 10MB`],
                });
            }
        } catch (error: any) {
            // Se houver erro ao ler o arquivo, remover e bloquear
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Erro ao validar arquivo',
                errors: [error.message || 'Arquivo inválido'],
            });
        }
    }

    next();
};

export const eventImageUpload = multer({
    storage,
    fileFilter: pngOnlyFilter,
    limits: {
        fileSize: MAX_SIZE_BYTES,
        files: 2, // Máximo de 2 arquivos (cover + square)
        fields: 20, // Máximo de campos no form
    },
});
