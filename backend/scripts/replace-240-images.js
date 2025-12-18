/**
 * Script para substituir imagens que começam com "240"
 * 
 * Uso:
 * 1. Coloque as novas imagens na pasta frontend/public/images/
 * 2. Execute: node backend/scripts/replace-240-images.js
 * 
 * O script irá:
 * - Listar todas as imagens que começam com "240"
 * - Criar backup na pasta frontend/public/images/backup-240/
 * - Substituir pelas novas imagens (se você renomear as novas para os mesmos nomes)
 */

const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../../frontend/public/images');
const backupDir = path.join(imagesDir, 'backup-240');

// Criar diretório de backup se não existir
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('✅ Diretório de backup criado:', backupDir);
}

// Listar todas as imagens que começam com "240"
const files = fs.readdirSync(imagesDir).filter(file => 
    file.startsWith('240') && 
    (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp'))
);

if (files.length === 0) {
    console.log('❌ Nenhuma imagem encontrada que comece com "240"');
    process.exit(0);
}

console.log(`\n📸 Encontradas ${files.length} imagens que começam com "240":\n`);
files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
});

console.log(`\n💾 Fazendo backup das imagens antigas...\n`);

// Fazer backup de cada arquivo
files.forEach(file => {
    const sourcePath = path.join(imagesDir, file);
    const backupPath = path.join(backupDir, file);
    
    try {
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`✅ Backup criado: ${file}`);
    } catch (error) {
        console.error(`❌ Erro ao fazer backup de ${file}:`, error.message);
    }
});

console.log(`\n✨ Backup concluído! As imagens antigas estão em: ${backupDir}\n`);
console.log('📝 Próximos passos:');
console.log('1. Coloque as novas imagens na pasta frontend/public/images/');
console.log('2. Renomeie as novas imagens para os mesmos nomes das antigas (ou atualize as referências no código)');
console.log('3. As imagens antigas estão salvas em backup-240/ caso precise restaurar\n');

