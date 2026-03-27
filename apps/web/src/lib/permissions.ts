// RBAC Permission Registry — WorkFlow Pro
// 12 qrup, 52 yetki

export interface PermissionGroup {
  key: string
  label: string
  icon: string
  permissions: { key: string; label: string; description: string }[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'tasks',
    label: 'Tapşırıqlar',
    icon: '📋',
    permissions: [
      { key: 'tasks.read', label: 'Oxu', description: 'Tapşırıqları görə bilər' },
      { key: 'tasks.create', label: 'Yarat', description: 'Yeni tapşırıq yarada bilər' },
      { key: 'tasks.update', label: 'Redaktə', description: 'Tapşırıqları redaktə edə bilər' },
      { key: 'tasks.delete', label: 'Sil', description: 'Tapşırıqları silə bilər' },
      { key: 'tasks.approve', label: 'Onayla', description: 'Tapşırıqları onaylaya/rədd edə bilər' },
      { key: 'tasks.assign', label: 'Ata', description: 'Tapşırıq başqasına ata bilər' },
      { key: 'tasks.finalize', label: 'Tamamla', description: 'Görevi tamamlaya bilər + son fayl yükləyə bilər' },
      { key: 'tasks.status_change', label: 'Status dəyiş', description: 'Başqasının tapşırıq statusunu dəyişə bilər' },
      { key: 'tasks.bulk_action', label: 'Toplu əməliyyat', description: 'Toplu tamamla/sil/köçür əməliyyatları' },
    ],
  },
  {
    key: 'templates',
    label: 'Şablonlar',
    icon: '🔁',
    permissions: [
      { key: 'templates.create', label: 'Yarat', description: 'Təkrarlanan görev şablonu yarada bilər' },
      { key: 'templates.update', label: 'Redaktə', description: 'Şablonu redaktə edə bilər' },
      { key: 'templates.delete', label: 'Sil', description: 'Şablonu silə bilər' },
      { key: 'templates.execute', label: 'İcra et', description: 'Şablonu manual icra edə bilər (dispatch)' },
      { key: 'templates.toggle', label: 'Aktiv/Deaktiv', description: 'Şablonu durdura/davam etdirə bilər' },
    ],
  },
  {
    key: 'finance',
    label: 'Maliyyə',
    icon: '💰',
    permissions: [
      { key: 'finance.read', label: 'Oxu', description: 'Maliyyə məlumatlarını görə bilər' },
      { key: 'finance.create', label: 'Yarat', description: 'Yeni tranzaksiya əlavə edə bilər' },
      { key: 'finance.update', label: 'Redaktə', description: 'Tranzaksiyaları redaktə edə bilər' },
      { key: 'finance.delete', label: 'Sil', description: 'Tranzaksiyaları silə bilər' },
      { key: 'finance.reports', label: 'Hesabat', description: 'Maliyyə hesabatlarını görə bilər' },
      { key: 'finance.export', label: 'İxrac', description: 'Maliyyə datalarını Excel/PDF ixrac edə bilər' },
    ],
  },
  {
    key: 'users',
    label: 'İstifadəçilər',
    icon: '👥',
    permissions: [
      { key: 'users.read', label: 'Oxu', description: 'İstifadəçi siyahısını görə bilər' },
      { key: 'users.create', label: 'Yarat', description: 'Yeni istifadəçi əlavə edə bilər' },
      { key: 'users.update', label: 'Redaktə', description: 'İstifadəçi məlumatlarını dəyişə bilər' },
      { key: 'users.delete', label: 'Sil', description: 'İstifadəçini silə bilər' },
    ],
  },
  {
    key: 'roles',
    label: 'Rollar',
    icon: '🛡️',
    permissions: [
      { key: 'roles.read', label: 'Oxu', description: 'Rol siyahısını görə bilər' },
      { key: 'roles.create', label: 'Yarat', description: 'Yeni rol yarada bilər' },
      { key: 'roles.update', label: 'Redaktə', description: 'Rolları redaktə edə bilər' },
      { key: 'roles.delete', label: 'Sil', description: 'Rolları silə bilər' },
      { key: 'roles.assign', label: 'Ata', description: 'İstifadəçiyə rol ata bilər' },
    ],
  },
  {
    key: 'reports',
    label: 'Hesabatlar',
    icon: '📊',
    permissions: [
      { key: 'reports.read', label: 'Oxu', description: 'Hesabatları görə bilər' },
      { key: 'reports.export', label: 'İxrac', description: 'Hesabatları export edə bilər' },
    ],
  },
  {
    key: 'departments',
    label: 'Şöbələr',
    icon: '🏷️',
    permissions: [
      { key: 'departments.read', label: 'Oxu', description: 'Şöbələri görə bilər' },
      { key: 'departments.create', label: 'Yarat', description: 'Yeni şöbə yarada bilər' },
      { key: 'departments.update', label: 'Redaktə', description: 'Şöbələri redaktə edə bilər' },
      { key: 'departments.delete', label: 'Sil', description: 'Şöbələri silə bilər' },
    ],
  },
  {
    key: 'businesses',
    label: 'Filiallar',
    icon: '🏢',
    permissions: [
      { key: 'businesses.read', label: 'Oxu', description: 'Filialları görə bilər' },
      { key: 'businesses.create', label: 'Yarat', description: 'Yeni filial yarada bilər' },
      { key: 'businesses.update', label: 'Redaktə', description: 'Filialları redaktə edə bilər' },
      { key: 'businesses.delete', label: 'Sil', description: 'Filialları silə bilər' },
    ],
  },
  {
    key: 'notifications',
    label: 'Bildirişlər',
    icon: '🔔',
    permissions: [
      { key: 'notifications.read', label: 'Oxu', description: 'Bildirişləri görə bilər' },
      { key: 'notifications.manage', label: 'İdarə', description: 'Bildiriş parametrlərini idarə edə bilər' },
    ],
  },
  {
    key: 'salary',
    label: 'Maaş / HR',
    icon: '💵',
    permissions: [
      { key: 'salary.read', label: 'Oxu', description: 'Maaş məlumatlarını görə bilər' },
      { key: 'salary.create', label: 'Yarat', description: 'Maaş təyin edə bilər' },
      { key: 'salary.update', label: 'Redaktə', description: 'Maaş məlumatlarını dəyişə bilər' },
      { key: 'salary.delete', label: 'Sil', description: 'Maaş qeydini silə bilər' },
      { key: 'salary.payments', label: 'Ödəmələr', description: 'Ödəmə yarada/görə bilər' },
    ],
  },
  {
    key: 'files',
    label: 'Fayllar',
    icon: '📎',
    permissions: [
      { key: 'files.upload', label: 'Yüklə', description: 'Fayl yükləyə bilər' },
      { key: 'files.download', label: 'Endir', description: 'Fayl endirə bilər' },
      { key: 'files.delete', label: 'Sil', description: 'Fayl silə bilər' },
    ],
  },
  {
    key: 'comments',
    label: 'Şərhlər',
    icon: '💬',
    permissions: [
      { key: 'comments.create', label: 'Yaz', description: 'Şərh yaza bilər' },
      { key: 'comments.delete', label: 'Sil', description: 'Şərh silə bilər' },
    ],
  },
  {
    key: 'todo',
    label: 'TODO',
    icon: '✅',
    permissions: [
      { key: 'todo.access', label: 'Giriş', description: 'Şəxsi TODO moduluna girişi var' },
    ],
  },
]

// Bütün yetki key-ləri düz siyahı
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key))

// Default rol yetkiləri
export const DEFAULT_ROLES = {
  'Şirkət Sahibi': ALL_PERMISSIONS,
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
    'todo.access',
  ],
  'İşçi': [
    'tasks.read', 'tasks.create', 'tasks.update',
    'notifications.read',
    'files.upload', 'files.download',
    'comments.create',
    'todo.access',
  ],
} as const
