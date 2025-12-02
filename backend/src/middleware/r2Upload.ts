import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { uploadImageToR2, isR2Configured } from '../services/r2Service';

/**
 * Middleware para fazer upload de imagens para R2 após validação
 * Se R2 não estiver configurado, mantém o comportamento local
 */
export const uploadToR2 = async (req: Request, res: Response, next: NextFunction) => {
    // Se R2 não estiver configurado, pular este middleware
    if (!isR2Configured()) {
        return next();
    }

    const filesMap = req.files as { [field: string]: any[] } | undefined;

    if (!filesMap) {
        return next();
    }

    const files = Object.values(filesMap).flat();

    try {
        // Processar cada arquivo
        for (const file of files) {
            if (!file.path) continue;

            try {
                // Ler o arquivo do disco
                const buffer = fs.readFileSync(file.path);

                // Fazer upload para R2
                const r2Url = await uploadImageToR2(buffer, file.filename, 'events');

                // Adicionar URL do R2 ao objeto file
                (file as any).r2Url = r2Url;

                // Remover arquivo local após upload bem-sucedido
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }

                // Atualizar path para URL do R2 (para compatibilidade)
                file.path = r2Url;
            } catch (error: any) {
                // Se falhar o upload para R2, manter arquivo local
                console.error(`Erro ao fazer upload para R2: ${error.message}`);
                // Continuar com arquivo local
            }
        }

        next();
    } catch (error: any) {
        console.error('Erro no middleware de upload R2:', error);
        // Em caso de erro, continuar com arquivos locais
        next();
    }
};

