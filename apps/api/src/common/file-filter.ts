import { BadRequestException } from '@nestjs/common'

// YALNIZ icazə verilən uzantılar
const ALLOWED_EXTENSIONS = [
  // Şəkillər
  '.png', '.jpg', '.jpeg',
  // PDF
  '.pdf',
  // MS Office
  '.doc', '.docx',       // Word
  '.xls', '.xlsx',       // Excel
  '.ppt', '.pptx',       // PowerPoint
]

// İcazə verilən MIME tipləri
const ALLOWED_MIMETYPES = [
  // Şəkillər
  'image/png', 'image/jpeg',
  // PDF
  'application/pdf',
  // MS Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream', // fallback — extension ilə yoxlanır
]

export function secureFileFilter(_req: any, file: Express.Multer.File, cb: Function) {
  const ext = '.' + file.originalname.split('.').pop()?.toLowerCase()
  const originalName = file.originalname.toLowerCase()

  // Null byte yoxla
  if (originalName.includes('\0') || originalName.includes('%00')) {
    return cb(new BadRequestException('Yanlış fayl adı'), false)
  }

  // Path traversal yoxla
  if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
    return cb(new BadRequestException('Yanlış fayl adı'), false)
  }

  // Double extension yoxla (image.jpg.exe)
  const parts = file.originalname.split('.')
  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i++) {
      if (!ALLOWED_EXTENSIONS.includes('.' + parts[i].toLowerCase())) {
        return cb(new BadRequestException(`İcazə verilməyən fayl formatı: .${parts[i]}`), false)
      }
    }
  }

  // Uzantı whitelist yoxla
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new BadRequestException(
      `Yalnız bu formatlar qəbul edilir: PNG, JPG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX`
    ), false)
  }

  // MIME type yoxla
  if (file.mimetype !== 'application/octet-stream' && !ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(new BadRequestException(
      `Yalnız bu formatlar qəbul edilir: PNG, JPG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX`
    ), false)
  }

  cb(null, true)
}
