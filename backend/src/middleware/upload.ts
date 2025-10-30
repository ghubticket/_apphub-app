import multer from 'multer'
import path from 'path'
import fs from 'fs'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const uploadsRoot = path.join(process.cwd(), 'uploads', 'events')
fs.mkdirSync(uploadsRoot, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const safeBase = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '_')
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${safeBase}-${unique}.png`)
  }
})

function pngOnlyFilter(_req: any, file: any, cb: multer.FileFilterCallback) {
  if (file.mimetype !== 'image/png') {
    return cb(new Error('Apenas arquivos PNG são permitidos'))
  }
  cb(null, true)
}

export const eventImageUpload = multer({
  storage,
  fileFilter: pngOnlyFilter,
  limits: { fileSize: MAX_SIZE_BYTES }
})


