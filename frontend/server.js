const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

// Caminhos dos certificados (na raiz do projeto)
const projectRoot = path.resolve(__dirname, '..');
const certsDir = path.join(projectRoot, 'certificates');

// Procurar automaticamente pelo certificado mais recente (localhost+X.pem)
function findLatestCert() {
    if (!fs.existsSync(certsDir)) return null;
    const certs = fs.readdirSync(certsDir)
        .filter(f => f.startsWith('localhost+') && f.endsWith('.pem') && !f.includes('-key'))
        .map(f => ({
            name: f,
            path: path.join(certsDir, f),
            mtime: fs.statSync(path.join(certsDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
    return certs.length > 0 ? certs[0] : null;
}

const latestCert = findLatestCert();
const certPath = process.env.SSL_CERT_PATH || (latestCert ? latestCert.path : path.join(certsDir, 'localhost+2.pem'));
const keyPath = process.env.SSL_KEY_PATH || (latestCert ? certPath.replace('.pem', '-key.pem') : path.join(certsDir, 'localhost+2-key.pem'));

// Verificar se os certificados existem
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('❌ Certificados SSL não encontrados!');
    console.error(`   Certificado esperado em: ${certPath}`);
    console.error(`   Chave esperada em: ${keyPath}`);
    console.error('   Execute: .\\gerar-certificados.ps1');
    process.exit(1);
}

const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
};

app.prepare().then(() => {
    createServer(httpsOptions, async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Erro ao processar requisição:', err);
            res.statusCode = 500;
            res.end('Erro interno do servidor');
        }
    }).listen(port, hostname, (err) => {
        if (err) throw err;
        console.log('');
        console.log('🚀 ========================================');
        console.log('🚀  Next.js rodando com HTTPS! 🔒');
        console.log('🚀 ========================================');
        console.log(`📡  Porta HTTPS: ${port}`);
        console.log(`🌍  URL Local: https://localhost:${port}`);
        if (hostname === '0.0.0.0') {
            // Tentar descobrir o IP da rede
            const os = require('os');
            const interfaces = os.networkInterfaces();
            let ip = null;
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                        ip = iface.address;
                        break;
                    }
                }
                if (ip) break;
            }
            if (ip) {
                console.log(`🌐  URL Rede: https://${ip}:${port} (acessível por outros dispositivos na rede)`);
            } else {
                console.log(`🌐  URL Rede: https://[SEU_IP]:${port} (acessível por outros dispositivos na rede)`);
            }
        }
        console.log(`📚  Ambiente: ${dev ? 'development' : 'production'}`);
        console.log('🚀 ========================================');
        console.log('');
    });
});

