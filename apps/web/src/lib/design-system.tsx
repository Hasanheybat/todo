/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  FocusFlow Design System — Qanun Kitabı                    ║
 * ║  Bütün komponentlər bu fayldan oxumalıdır.                 ║
 * ║  Kənara çıxmaq QADAĞANDIR.                                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * İstifadə:
 *   import { DS } from '@/lib/design-system'
 *   <div style={{ color: DS.colors.text.primary }}>
 *   <DS.icons.Calendar className="w-4 h-4" />
 */

// ═══════════════════════════════════════════════════════════════
// 1. RƏNGLƏR
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Brand
  primary: '#4F46E5',        // Indigo — əsas rəng
  primaryDark: '#4338CA',    // Hover/active
  primaryLight: '#EEF2FF',   // Background tint
  secondary: '#64748B',      // Slate — ikinci dərəcəli

  // Fon
  bg: {
    main: '#F8FAFC',         // Əsas fon
    card: '#FFFFFF',         // Kart fonu
    sidebar: '#FFFFFF',      // Sidebar fonu
    sidebarHover: '#F1F5F9', // Sidebar hover
    input: '#F8FAFC',        // Input fonu
    modal: '#FFFFFF',        // Modal fonu
    overlay: 'rgba(15, 23, 42, 0.5)', // Overlay
  },

  // Mətn
  text: {
    primary: '#0F172A',      // Başlıqlar — koyu lacivert
    secondary: '#334155',    // Bədən mətni
    tertiary: '#94A3B8',     // Köməkçi mətn
    inverse: '#FFFFFF',      // Açıq fonda tünd mətn
    link: '#4F46E5',         // Link rəngi
  },

  // Sərhəd
  border: {
    default: '#E2E8F0',      // Standart sərhəd
    light: '#F1F5F9',        // Yüngül sərhəd
    focus: '#4F46E5',        // Focus halı
  },

  // Prioritet / Zorluk
  priority: {
    critical: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', dot: '#7C3AED' },
    high:     { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA', dot: '#EF4444' },
    medium:   { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A', dot: '#F59E0B' },
    low:      { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0', dot: '#10B981' },
  },

  // Status
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0EA5E9',
    neutral: '#64748B',
  },

  // Semantik
  debit: '#10B981',          // Gəlir — yaşıl
  credit: '#EF4444',         // Xərc — qırmızı
  balance: '#3B82F6',        // Bakiyə — mavi

  // Etiket rəngləri
  label: {
    RED: '#EF4444',
    ORANGE: '#F97316',
    YELLOW: '#EAB308',
    GREEN: '#22C55E',
    BLUE: '#3B82F6',
    PURPLE: '#8B5CF6',
    TEAL: '#14B8A6',
    GREY: '#6B7280',
    PINK: '#EC4899',
  } as Record<string, string>,
}

// ═══════════════════════════════════════════════════════════════
// 2. TİPOQRAFİYA
// ═══════════════════════════════════════════════════════════════

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  letterSpacing: '-0.01em',

  h1: { size: '24px', weight: 700, lineHeight: 1.2 },
  h2: { size: '18px', weight: 600, lineHeight: 1.3 },
  h3: { size: '15px', weight: 600, lineHeight: 1.4 },
  body: { size: '14px', weight: 400, lineHeight: 1.6 },
  small: { size: '12px', weight: 500, lineHeight: 1.5 },
  tiny: { size: '10px', weight: 600, lineHeight: 1.4 },
  badge: { size: '10px', weight: 700, lineHeight: 1.2 },
}

// ═══════════════════════════════════════════════════════════════
// 3. ÖLÇÜLƏR & SPACING
// ═══════════════════════════════════════════════════════════════

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
}

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px',
  full: '9999px',
  card: '16px',
  button: '10px',
  badge: '6px',
  input: '10px',
  modal: '20px',
}

export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
}

// ═══════════════════════════════════════════════════════════════
// 4. İKONLAR — Hər funksiya üçün TƏK 1 ikon
// ═══════════════════════════════════════════════════════════════
// Lucide-style SVG ikonlar — inline, dependency yox
// İstifadə: <DS.icons.Calendar className="w-4 h-4" />

type IconProps = { className?: string; style?: React.CSSProperties }
const icon = (path: string, viewBox = '0 0 24 24') =>
  ({ className = 'w-4 h-4', style }: IconProps) => (
    <svg className={className} style={style} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: path }} />
  )

export const icons = {
  // ── Naviqasiya ──
  home:         icon('<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  inbox:        icon('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>'),
  calendar:     icon('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  tasks:        icon('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>'),
  todo:         icon('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
  template:     icon('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
  project:      icon('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),

  // ── Əməliyyat ──
  add:          icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  edit:         icon('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>'),
  delete:       icon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>'),
  close:        icon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  check:        icon('<polyline points="20 6 9 17 4 12"/>'),
  save:         icon('<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>'),
  copy:         icon('<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>'),
  link:         icon('<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>'),
  search:       icon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  filter:       icon('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'),
  sort:         icon('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'),
  menu:         icon('<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>'),
  more:         icon('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'),
  chevronDown:  icon('<polyline points="6 9 12 15 18 9"/>'),
  chevronRight: icon('<polyline points="9 18 15 12 9 6"/>'),
  chevronLeft:  icon('<polyline points="15 18 9 12 15 6"/>'),

  // ── TODO / Tapşırıq xüsusiyyətləri — HƏR BİRİ TƏK İKON ──
  priority:     icon('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'),
  date:         icon('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  reminder:     icon('<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>'),
  duration:     icon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  label:        icon('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  location:     icon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>'),
  attachment:   icon('<path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>'),
  subtask:      icon('<path d="M16 3h5v5"/><line x1="4" y1="20" x2="21" y2="3"/>'),
  comment:      icon('<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'),
  recurring:    icon('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>'),
  move:         icon('<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>'),

  // ── İdarəetmə ──
  users:        icon('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'),
  roles:        icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  finance:      icon('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>'),
  salary:       icon('<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>'),
  settings:     icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>'),
  notification: icon('<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>'),
  logout:       icon('<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
  theme:        icon('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'),

  // ── Maliyyə ──
  debitArrow:   icon('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
  creditArrow:  icon('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'),
  category:     icon('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),

  // ── Status ──
  checkCircle:  icon('<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
  alertCircle:  icon('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'),
  clock:        icon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  eye:          icon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
  activity:     icon('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
  star:         icon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
}

// ═══════════════════════════════════════════════════════════════
// 5. KOMPOZİT EXPORT
// ═══════════════════════════════════════════════════════════════

export const DS = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  icons,
}

export default DS
