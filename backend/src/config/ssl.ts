import fs from 'fs';
import path from 'path';

export interface SSLOptions {
    key: Buffer;
    cert: Buffer;
}

export function getSSLOptions(): SSLOptions | null {
    // Caminho relativo à raiz do projeto (backend/)
    // __dirname = backend/src/config/ ou backend/dist/config/
    // ../../ = raiz do projeto
    const projectRoot = path.resolve(__dirname, '../../..');
    const certsDir = path.join(projectRoot, 'certificates');

    // Procurar automaticamente pelo certificado mais recente (localhost+X.pem)
    function findLatestCert(): string | null {
        if (!fs.existsSync(certsDir)) {
           
            return null;
        }
        const allFiles = fs.readdirSync(certsDir);
       
        const certs = allFiles
            .filter((f) => f.startsWith('localhost+') && f.endsWith('.pem') && !f.includes('-key'))
            .map((f) => {
                const filePath = path.join(certsDir, f);
                return {
                    name: f,
                    path: filePath,
                    mtime: fs.statSync(filePath).mtime.getTime(),
                };
            })
            .sort((a, b) => b.mtime - a.mtime);

       

        return certs.length > 0 ? certs[0].path : null;
    }

    const latestCert = findLatestCert();
    let certPath: string;
    let keyPath: string;

   

    if (process.env.SSL_CERT_PATH) {
        if (process.env.NODE_ENV !== 'production') {
        }
        certPath = process.env.SSL_CERT_PATH;
        keyPath = process.env.SSL_KEY_PATH || certPath.replace('.pem', '-key.pem');
    } else if (latestCert) {
        if (process.env.NODE_ENV !== 'production') {
        }
        certPath = latestCert;
        keyPath = certPath.replace('.pem', '-key.pem');
    } else {
        if (process.env.NODE_ENV !== 'production') {
        }
        // Fallback: procurar qualquer certificado localhost+
        const allCerts = fs.existsSync(certsDir)
            ? fs
                  .readdirSync(certsDir)
                  .filter(
                      (f) => f.startsWith('localhost+') && f.endsWith('.pem') && !f.includes('-key')
                  )
                  .map((f) => path.join(certsDir, f))
            : [];
        if (allCerts.length > 0) {
            certPath = allCerts[0];
            keyPath = certPath.replace('.pem', '-key.pem');
        } else {
            certPath = path.join(certsDir, 'localhost+2.pem');
            keyPath = path.join(certsDir, 'localhost+2-key.pem');
        }
    }

    // Verificar se SSL está habilitado
    const sslEnabled = process.env.SSL_ENABLED === 'true';
    if (!sslEnabled) {
        return null;
    }

    // Debug: mostrar caminhos
    if (process.env.NODE_ENV !== 'production') {
        if (fs.existsSync(certsDir)) {
            const files = fs.readdirSync(certsDir);
        }
    }

    // Verificar se os arquivos existem
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        if (process.env.NODE_ENV !== 'production') {
        }
        return null;
    }

    try {
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
        }
        return null;
    }
}
