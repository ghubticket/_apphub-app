/**
 * Script para descobrir o IP local do computador
 * Execute: node get-ip.js
 */

const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Ignora endereços internos e não IPv4
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }

    return 'localhost';
}

const ip = getLocalIP();
console.log('\n🌐 IP do seu computador:', ip);
console.log('\n📝 Adicione esta linha ao arquivo .env:');
console.log(`VITE_API_URL=http://${ip}:3001/api\n`);
console.log('📱 Acesse no celular:');
console.log(`http://${ip}:5174\n`);

