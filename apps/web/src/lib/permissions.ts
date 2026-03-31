// RBAC Permission Registry — WorkFlow Pro
// 4 qrup, 9 yetki

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
      { key: 'tasks.read', label: 'Görmə', description: 'Özünə atanan tapşırıqları görə, status dəyişə, mesaj yaza bilər' },
      { key: 'tasks.create', label: 'TASK yaratma', description: 'Adi tapşırıq (TASK) yarada, düzənləyə, silə, onaylaya bilər' },
      { key: 'gorev.create', label: 'GÖREV yaratma', description: 'Toplu tapşırıq (GÖREV) yarada, düzənləyə, silə, onaylaya bilər' },
      { key: 'gorev.approve', label: 'Yetkili kişi', description: 'GÖREV-də yetkili kişi olaraq təyin edilə bilər — tamamlayır, söhbət edir, status izləyir' },
      { key: 'tasks.assign_upward', label: 'Filial daxili atama', description: 'Öz filialı daxilində hər kəsə tapşırıq ata bilər' },
    ],
  },
  {
    key: 'users',
    label: 'İstifadəçilər',
    icon: '👥',
    permissions: [
      { key: 'users.read', label: 'Görmə', description: 'İşçi siyahısını görə bilər' },
      { key: 'users.manage', label: 'İdarəetmə', description: 'İşçi, rol, filial, şöbə — tam idarəetmə' },
    ],
  },
  {
    key: 'finance',
    label: 'Maliyyə',
    icon: '💰',
    permissions: [
      { key: 'finance.manage', label: 'İdarəetmə', description: 'Maliyyə tam idarəetmə — görmə, yaratma, düzənləmə, silmə' },
    ],
  },
  {
    key: 'salary',
    label: 'Maaş / HR',
    icon: '💵',
    permissions: [
      { key: 'salary.manage', label: 'İdarəetmə', description: 'Maaş/HR tam idarəetmə — görmə, təyin etmə, ödəmə' },
    ],
  },
]

// Bütün yetki key-ləri düz siyahı
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key))

// Default rol yetkiləri
export const DEFAULT_ROLES = {
  'CEO': ALL_PERMISSIONS,
  'Müdir': [
    'tasks.read', 'tasks.create', 'gorev.create', 'gorev.approve', 'tasks.assign_upward', 'users.read',
  ],
  'Komanda Lideri': [
    'tasks.read', 'tasks.create', 'gorev.approve',
  ],
  'İşçi': [
    'tasks.read',
  ],
} as const
