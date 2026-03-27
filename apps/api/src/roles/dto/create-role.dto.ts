import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsArray()
  @IsString({ each: true })
  permissions: string[]
}

// Mövcud permission-lar — 12 qrup, 53 yetki
export const ALL_PERMISSIONS = [
  // ── TAPŞIRIQLAR (GÖREV) ──
  'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete',
  'tasks.approve', 'tasks.assign',
  'tasks.assign_upward',   // Üstdəkilərə GÖREV atamaq (ierarxiya bypass)
  'tasks.finalize',        // Görevi tamamla + son fayl yüklə
  'tasks.status_change',   // Başqasının statusunu dəyiş (approver)
  'tasks.bulk_action',     // Toplu əməliyyat (complete/delete/move)

  // ── ŞABLONLAR (Təkrarlanan görevlər) ──
  'templates.create',      // Şablon yarat
  'templates.update',      // Şablon redaktə
  'templates.delete',      // Şablon sil
  'templates.execute',     // Şablonu indi icra et (manual dispatch)
  'templates.toggle',      // Şablonu aktiv/deaktiv et

  // ── MALİYYƏ ──
  'finance.read', 'finance.create', 'finance.update', 'finance.delete',
  'finance.reports',       // Maliyyə hesabatları
  'finance.export',        // Excel/PDF ixrac

  // ── İSTİFADƏÇİLƏR ──
  'users.read', 'users.create', 'users.update', 'users.delete',

  // ── ROLLAR ──
  'roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.assign',

  // ── HESABATLAR ──
  'reports.read', 'reports.export',

  // ── ŞÖBƏLƏR ──
  'departments.read', 'departments.create', 'departments.update', 'departments.delete',

  // ── FİLİALLAR ──
  'businesses.read', 'businesses.create', 'businesses.update', 'businesses.delete',

  // ── BİLDİRİŞLƏR ──
  'notifications.read', 'notifications.manage',

  // ── MAAŞ ──
  'salary.read', 'salary.create', 'salary.update', 'salary.delete',
  'salary.payments',       // Ödəmə yaratmaq / görmək

  // ── FAYLLAR ──
  'files.upload',          // Fayl yükləmə
  'files.download',        // Fayl endirmə
  'files.delete',          // Fayl silmə

  // ── ŞƏRHLƏR ──
  'comments.create',       // Şərh yazmaq
  'comments.delete',       // Şərh silmək

  // ── TODO (Şəxsi tapşırıqlar) ──
  'todo.access',           // TODO moduluna giriş (görsün/görməsin)
  'todo.create',           // TODO yaratmaq
] as const

// Default rol yetkiləri
export const DEFAULT_ROLE_PERMISSIONS = {
  'Şirkət Sahibi': [...ALL_PERMISSIONS],
  'Müdir': [
    'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.approve', 'tasks.assign',
    'tasks.finalize', 'tasks.status_change', 'tasks.bulk_action',
    'templates.create', 'templates.update', 'templates.delete', 'templates.execute', 'templates.toggle',
    'finance.read', 'finance.reports',
    'users.read', 'users.create', 'users.update',
    'roles.read',
    'reports.read', 'reports.export',
    'departments.read',
    'businesses.read',
    'notifications.read', 'notifications.manage',
    'salary.read',
    'files.upload', 'files.download', 'files.delete',
    'comments.create', 'comments.delete',
    'todo.access', 'todo.create',
  ],
  'İşçi': [
    'tasks.read', 'tasks.update',
    'notifications.read',
    'files.upload', 'files.download',
    'comments.create',
    'todo.access', 'todo.create',
  ],
} as const
