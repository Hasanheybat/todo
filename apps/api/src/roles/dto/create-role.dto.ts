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

// Mövcud permission-lar — 4 qrup, 9 yetki
export const ALL_PERMISSIONS = [
  // ── TAPŞIRIQLAR ──
  'tasks.read',            // Atanan tapşırıqları görmə, status dəyişmə, mesaj yazma
  'tasks.create',          // TASK yaratma, düzənləmə, silmə, onaylama (öz yaratdıqları)
  'gorev.create',          // GÖREV yaratma, düzənləmə, silmə, onaylama (öz yaratdıqları)
  'gorev.approve',         // Yetkili kişi olaraq təyin edilə bilir — tamamlayır, söhbət edir
  'tasks.assign_upward',   // Öz filialı daxilində hər kəsə tapşırıq atama

  // ── İSTİFADƏÇİLƏR ──
  'users.read',            // İşçi siyahısını görmə
  'users.manage',          // İşçi, rol, filial, şöbə — tam idarəetmə

  // ── MALİYYƏ ──
  'finance.manage',        // Maliyyə tam idarəetmə

  // ── MAAŞ / HR ──
  'salary.manage',         // Maaş/HR tam idarəetmə
] as const

// Default rol yetkiləri
export const DEFAULT_ROLE_PERMISSIONS = {
  'Şirkət Sahibi': [...ALL_PERMISSIONS],
  'Müdir': [
    'tasks.read', 'tasks.create', 'gorev.create', 'gorev.approve', 'tasks.assign_upward',
    'users.read',
  ],
  'Komanda Lideri': [
    'tasks.read', 'tasks.create', 'gorev.approve',
  ],
  'İşçi': [
    'tasks.read',
  ],
} as const
