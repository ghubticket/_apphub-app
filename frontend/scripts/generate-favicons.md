# Script para Gerar Ícones Faltantes

## Opção 1: Usando ImageMagick (CLI)

Se você tiver ImageMagick instalado, execute no PowerShell:

```powershell
cd frontend/public

# Criar ícones básicos
magick icon-192x192.png -resize 16x16 icon-16x16.png
magick icon-192x192.png -resize 32x32 icon-32x32.png
magick icon-192x192.png -resize 72x72 icon-72x72.png
magick icon-192x192.png -resize 128x128 icon-128x128.png
magick icon-192x192.png -resize 144x144 icon-144x144.png
magick icon-192x192.png -resize 152x152 icon-152x152.png
magick icon-192x192.png -resize 384x384 icon-384x384.png

# Criar tiles do Windows
magick icon-192x192.png -resize 70x70 mstile-70x70.png
magick icon-192x192.png -resize 150x150 mstile-150x150.png
magick icon-192x192.png -resize 310x150 mstile-310x150.png
magick icon-192x192.png -resize 310x310 mstile-310x310.png
```

## Opção 2: Usando Ferramenta Online

1. Acesse: https://realfavicongenerator.net/
2. Faça upload do `icon-512x512.png` ou `icon-192x192.png`
3. Configure:
   - iOS: Cor de fundo #f5f1e8
   - Windows: Cor #1a1a1d
   - Safari: Ativar pinned tab
4. Baixe o pacote completo
5. Extraia para `frontend/public/`

## Opção 3: Criar safari-pinned-tab.svg

Crie um arquivo SVG monocromático. Você pode usar o favicon.svg como base e converter para monocromático.

