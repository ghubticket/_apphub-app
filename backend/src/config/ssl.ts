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
            if (process.env.NODE_ENV !== 'production') {
                console.log(`   [findLatestCert] Pasta não existe: ${certsDir}`);
            }
            return null;
        }
        const allFiles = fs.readdirSync(certsDir);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   [findLatestCert] Todos os arquivos: ${allFiles.join(', ')}`);
        }
        const certs = allFiles
            .filter(f => f.startsWith('localhost+') && f.endsWith('.pem') && !f.includes('-key'))
            .map(f => {
                const filePath = path.join(certsDir, f);
                return {
                    name: f,
                    path: filePath,
                    mtime: fs.statSync(filePath).mtime.getTime()
                };
            })
            .sort((a, b) => b.mtime - a.mtime);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   [findLatestCert] Certificados filtrados: ${certs.length}`);
            if (certs.length > 0) {
                console.log(`   [findLatestCert] Certificado mais recente: ${certs[0].path}`);
            }
        }
        
        return certs.length > 0 ? certs[0].path : null;
    }
    
    const latestCert = findLatestCert();
    let certPath: string;
    let keyPath: string;
    
    // Debug: verificar qual branch será executado
    if (process.env.NODE_ENV !== 'production') {
        console.log(`   [SSL Logic] SSL_CERT_PATH definido: ${!!process.env.SSL_CERT_PATH}`);
        console.log(`   [SSL Logic] latestCert existe: ${!!latestCert}`);
    }
    
    if (process.env.SSL_CERT_PATH) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   [SSL Logic] Usando SSL_CERT_PATH do .env`);
        }
        certPath = process.env.SSL_CERT_PATH;
        keyPath = process.env.SSL_KEY_PATH || certPath.replace('.pem', '-key.pem');
    } else if (latestCert) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   [SSL Logic] Usando latestCert encontrado`);
        }
        certPath = latestCert;
        keyPath = certPath.replace('.pem', '-key.pem');
    } else {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`   [SSL Logic] Usando fallback`);
        }
        // Fallback: procurar qualquer certificado localhost+
        const allCerts = fs.existsSync(certsDir) 
            ? fs.readdirSync(certsDir)
                .filter(f => f.startsWith('localhost+') && f.endsWith('.pem') && !f.includes('-key'))
                .map(f => path.join(certsDir, f))
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
        console.log('🔍 [SSL Debug] Procurando certificados...');
        console.log(`   Pasta: ${certsDir}`);
        console.log(`   Existe pasta: ${fs.existsSync(certsDir)}`);
        if (fs.existsSync(certsDir)) {
            const files = fs.readdirSync(certsDir);
            console.log(`   Arquivos encontrados: ${files.join(', ')}`);
        }
        console.log(`   SSL_CERT_PATH env: ${process.env.SSL_CERT_PATH || 'não definido'}`);
        console.log(`   latestCert encontrado: ${latestCert || 'null'}`);
        console.log(`   Certificado final: ${certPath}`);
        console.log(`   Chave final: ${keyPath}`);
        console.log(`   Certificado existe: ${fs.existsSync(certPath)}`);
        console.log(`   Chave existe: ${fs.existsSync(keyPath)}`);
    }

    // Verificar se os arquivos existem
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.warn('⚠️  Certificados SSL não encontrados. Servidor rodará em HTTP.');
        console.warn(`   Certificado esperado em: ${certPath}`);
        console.warn(`   Chave esperada em: ${keyPath}`);
        console.warn(`   Certificado existe: ${fs.existsSync(certPath)}`);
        console.warn(`   Chave existe: ${fs.existsSync(keyPath)}`);
        console.warn('   Para usar HTTPS, execute: .\\fix-certificado-desktop.ps1');
        console.warn('   E configure SSL_ENABLED=true no .env');
        return null;
    }

    try {
        return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
    } catch (error) {
        console.error('❌ Erro ao ler certificados SSL:', error);
        return null;
    }
}

