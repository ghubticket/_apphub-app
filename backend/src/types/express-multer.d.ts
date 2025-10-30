import 'express'

declare global {
    namespace Express {
        // Minimal file shape we need from Multer without depending on Multer's types
        interface UploadedFile {
            filename: string
            path?: string
            size?: number
            mimetype?: string
            originalname?: string
        }

        // Multer adds `files` when using .fields()/.array().
        // Can be an array (single field) or a map of arrays (multiple fields)
        interface Request {
            files?: { [fieldname: string]: UploadedFile[] } | UploadedFile[]
        }
    }
}

export { }


