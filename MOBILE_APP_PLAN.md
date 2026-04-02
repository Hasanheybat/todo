# WorkFlow Pro — Mobil App Detallı Layihə Planı

> **Tarix:** 2 Aprel 2026
> **Platform:** Flutter (iOS + Android)
> **Scope:** Yalnız GÖREV + TODO (Maliyyə, HR, Maaş daxil deyil)
> **Mövcud vəziyyət:** Flutter skeleton var, auth + home screen qismən hazır

---

## Baz Alınacaq: Mövcud Flutter App

**Yer:** `apps/mobile/`
**Stack:** Flutter 3.11 + Riverpod + GoRouter + Dio + Hive

### Artıq Hazır Olan:
- Login/Auth (JWT + refresh token + biometric ready)
- Home screen skeleton (TODO/GÖREV tab)
- DioClient (JWT interceptor, auto-refresh)
- Tema (Material 3, turuncu #E8873A)
- Router (GoRouter, auth guard)

### Hazır OLMAYAN (yazılmalı):
- Tam tapşırıq yaratma formu
- Onay workflow (onaylayıcı → işçi → yaradıcı)
- Şərhlər, fayllar
- WebSocket bildirişlər
- Təkrarlanan tapşırıqlar
- Alt tapşırıqlar
- Board/Kanban görünüş

---

## Ekranlar və Funksiyalar

### 1. GİRİŞ EKRANI (Login)
**Status:** ✅ Hazır
- Email + şifrə input
- JWT token saxlama (secure storage)
- Auto-login (token mövcudsa)
- Biometric auth (Face ID / Touch ID) — hazır, aktivləşdirilməli

---

### 2. ANA EKRAN (Home / Bugün)
**Status:** 🟡 Qismən hazır

**Olmalı:**
```
┌──────────────────────────────────┐
│  Salam, Həsən 👋                │
│  Bugün · 12 tapşırıq            │
├──────────────────────────────────┤
│  [Hamısı] [GÖREV] [TODO]        │  ← Tab filtri
├──────────────────────────────────┤
│  ┌─ GÖREV ── Kritik ──────────┐ │
│  │ İT infrastruktur yeniləmə  │ │
│  │ 🔴 1g gecikmiş · Leyla     │ │
│  └────────────────────────────┘ │
│  ┌─ TODO ── Yüksək ──────────┐ │
│  │ ○ AWS server optimallaşdır │ │
│  │ 📅 Sabah · Maliyyə İdarə  │ │
│  └────────────────────────────┘ │
│  ┌─ GÖREV ── Orta ───────────┐ │
│  │ Gəncə filialı genişlənmə  │ │
│  │ 🔴 9g gecikmiş · Həsən    │ │
│  └────────────────────────────┘ │
├──────────────────────────────────┤
│  [🏠] [📋] [➕] [🔔] [👤]     │  ← Bottom nav
└──────────────────────────────────┘
```

**Funksiyalar:**
- Hamısı/GÖREV/TODO tab keçidi
- Siyahı görünüş (qarışıq — TODO+GÖREV birlikdə)
- Pull-to-refresh
- Swipe → tamamla / sil
- TODO checkbox ilə tamamlama
- Kartı tap → detay ekranı

**API:** `GET /tasks` + `GET /todoist/tasks/today`

---

### 3. TAPŞIRIQ YARATMA (Fab Button → +)
**Status:** ❌ Yazılmalı

**Seçim ekranı:**
```
┌──────────────────────┐
│  Nə yaratmaq?        │
│                      │
│  [📋 GÖREV yarat]    │  → Görev formu
│  [☑️ TODO yarat]     │  → Todo formu
└──────────────────────┘
```

#### 3a. GÖREV Yaratma Formu
```
┌──────────────────────────────┐
│ ← Yeni GÖREV                │
├──────────────────────────────┤
│ Başlıq ___________________  │
│ Açıqlama _________________  │
│                              │
│ Prioritet  [Kritik ▼]       │
│ Son tarix  [📅 Seç]        │
│ İşletmə   [Bakı Fil. ▼]    │
│ Şöbə      [İT ▼]           │
│                              │
│ İşçilər:                     │
│  ☑ Leyla Hüseynova          │
│  ☑ Nigar Əhmədova           │
│  ☐ Rəşad Əliyev            │
│                              │
│ [🔁 Təkrarla]               │  ← Açılınca:
│ ┌───────────────────────┐   │
│ │ Hər [həftənin ▼]      │   │
│ │ [B.e. ▼]              │   │
│ │ 📅 Atanma: B.e.       │   │
│ │ 🔔 Bildiriş: 1-ci gün │   │
│ │ ⏰ Son tarix: 3-cü gün│   │
│ └───────────────────────┘   │
│                              │
│        [YARAT]               │
└──────────────────────────────┘
```
**API:** `POST /tasks` + `POST /templates` (təkrarlanan seçilibsə)

#### 3b. TODO Yaratma Formu
```
┌──────────────────────────────┐
│ ← Yeni TODO                 │
├──────────────────────────────┤
│ Tapşırıq adı ______________ │
│ Açıqlama _________________  │
│                              │
│ [📅 Tarix] [🏷 Prioritet]  │
│ [📂 Layihə] [🏷 Etiket]   │
│ [🔁 Təkrarla]              │
│                              │
│ Alt görevlər:                │
│  │ ○ _____________________  │
│  │ ○ _____________________  │
│  + Əlavə et                  │
│                              │
│        [ƏLAVƏ ET]            │
└──────────────────────────────┘
```
**API:** `POST /todoist/tasks` + `POST /todoist/tasks` (alt görevlər, parentId ilə)

---

### 4. GÖREV DETAY EKRANI
**Status:** 🟡 Skeleton var, tam yazılmalı

**Yaradıcı görünüşü:**
```
┌──────────────────────────────┐
│ ← İT infrastruktur yeniləmə │
│ 🔴 Kritik · GÖREV           │
├──────────────────────────────┤
│ Status: ● Davam edir         │
│ Son tarix: 5 Aprel (1g qalıb)│
│ İşletmə: Bakı Filialı       │
├──────────────────────────────┤
│ İşçilər:                     │
│ ┌────────────────────────┐  │
│ │ 👤 Leyla Hüseynova     │  │
│ │ ● Davam edir           │  │
│ │ "Serverləri yeniləyirəm"│  │
│ │ [Onay ver] [Rədd et]   │  │
│ └────────────────────────┘  │
│ ┌────────────────────────┐  │
│ │ 👤 Nigar Əhmədova      │  │
│ │ ● Gözləyir             │  │
│ └────────────────────────┘  │
├──────────────────────────────┤
│ [💬 Şərhlər (3)]            │
│ [📎 Fayllar (2)]            │
│ [📋 Alt tapşırıqlar (0)]   │
├──────────────────────────────┤
│ Yaradıcı: Həsən Əliyev      │
│ Yaradılıb: 1 Aprel 2026     │
└──────────────────────────────┘
```

**İşçi görünüşü:**
```
┌──────────────────────────────┐
│ ← İT infrastruktur yeniləmə │
├──────────────────────────────┤
│ Status: [Davam edir ▼]      │  ← Dəyişə bilər
│ Qeyd: ___________________   │
│ Fayl: [📎 Yüklə]           │
│                              │
│ Müdirdən qeydlər:           │
│ "Tez başla" — Həsən, dünən  │
│                              │
│ [✅ Tamamla]                 │
└──────────────────────────────┘
```

**API:**
- `GET /tasks/:id`
- `PATCH /tasks/:id/my-status` (işçi status dəyişir)
- `POST /tasks/:id/approve` / `reject` (onaylayıcı)
- `PATCH /tasks/:id/finalize` (bağlama)

---

### 5. TODO DETAY EKRANI
**Status:** 🟡 Modal var, tam yazılmalı

```
┌──────────────────────────────┐
│ ← AWS server optimallaşdır  │
│ 🟠 Yüksək · TODO            │
├──────────────────────────────┤
│ ○ Status: Gözləyir [Dəyiş]  │
│ 📅 Son tarix: 3 Aprel       │
│ 📂 Layihə: Maliyyə İdarəetmə│
│ 🏷 Etiketlər: maliyyə       │
│ ⏱ Müddət: 2 saat           │
│ 🔁 Təkrar: Hər həftə        │
├──────────────────────────────┤
│ Alt tapşırıqlar (2/3):       │
│  ✅ Backup yoxla             │
│  ✅ Log təmizlə              │
│  ○ Monitoring qur            │
│  [+ Əlavə et]               │
├──────────────────────────────┤
│ Açıqlama:                    │
│ Server resurslarını optim... │
├──────────────────────────────┤
│ 📎 Fayllar (1)              │
│ 💬 Şərhlər (2)              │
└──────────────────────────────┘
```

**API:** `GET /todoist/tasks/:id` + `PUT /todoist/tasks/:id`

---

### 6. TAPŞIRIQLAR SİYAHISI (/tasks)
**Status:** ❌ Yazılmalı

```
┌──────────────────────────────┐
│ Tapşırıqlar    [🔍] [⚙️]   │
├──────────────────────────────┤
│ [Gözləyir 5] [Davam 3]      │
│ [Onay gözl. 1] [Tamamlandı] │
├──────────────────────────────┤
│ Filtr: [Hamısı ▼] [Kritik▼] │
├──────────────────────────────┤
│ 📋 Siyahı / 📊 Kart        │  ← Toggle
├──────────────────────────────┤
│ Tapşırıq kartları...         │
└──────────────────────────────┘
```

---

### 7. TODO SİYAHISI (/todo)
**Status:** 🟡 Qismən var

```
┌──────────────────────────────┐
│ Todo       [Siyahı][Board]  │
├──────────────────────────────┤
│ [Hamısı 36] [Gözləyir 28]  │
│ [Davam 2] [Tamamlandı 2]    │
├──────────────────────────────┤
│ Board görünüşü:              │
│ ┌────┐ ┌────┐ ┌────┐ ┌───┐ │
│ │Gözl│ │Dav │ │Tam │ │İpt│ │
│ │    │ │    │ │    │ │   │ │
│ │kart│ │kart│ │kart│ │   │ │
│ │kart│ │    │ │    │ │   │ │
│ └────┘ └────┘ └────┘ └───┘ │
└──────────────────────────────┘
```

---

### 8. BİLDİRİŞLƏR
**Status:** ❌ Yazılmalı

```
┌──────────────────────────────┐
│ Bildirişlər   [Hamısını oxu] │
├──────────────────────────────┤
│ 🔵 Yeni tapşırıq təyin olundu│
│    "İT yeniləmə" — Həsən     │
│    2 saat əvvəl              │
│──────────────────────────────│
│    Leyla status dəyişdi      │
│    "Davam edir" — Leyla      │
│    5 saat əvvəl              │
│──────────────────────────────│
│    TODO vaxtı yaxınlaşır     │
│    "AWS server" — Sabah      │
│    dünən                     │
└──────────────────────────────┘
```

**API:** `GET /notifications` + WebSocket `notification` event

---

### 9. PROFİL / AYARLAR
**Status:** ❌ Yazılmalı

```
┌──────────────────────────────┐
│ 👤 Həsən Əliyev             │
│ hasan@techflow.az            │
│ Baş Müdir · TechFlow MMC    │
├──────────────────────────────┤
│ 🌙 Qaranlıq tema  [toggle]  │
│ 🔐 Biometric auth [toggle]  │
│ 🔔 Bildiriş       [toggle]  │
│ 🌐 Dil: Azərbaycan          │
├──────────────────────────────┤
│ [🚪 Çıxış]                  │
└──────────────────────────────┘
```

---

## Bottom Navigation

```
[🏠 Bugün] [📋 Tapşırıqlar] [➕] [🔔 Bildiriş] [👤 Profil]
```

| Tab | Ekran | Badge |
|-----|-------|-------|
| 🏠 | Ana ekran (Bugün) | Gecikmiş say |
| 📋 | Tapşırıqlar | Gözləyən say |
| ➕ | Yaratma (GÖREV/TODO) | — |
| 🔔 | Bildirişlər | Oxunmamış say |
| 👤 | Profil/Ayarlar | — |

---

## İnkişaf Fazaları

### Faza 1 — MVP (1 həftə)
| # | İş | Müddət |
|---|-----|--------|
| 1 | Login ekranını düzəlt (biometric aktiv) | 2 saat |
| 2 | Ana ekran — qarışıq siyahı (TODO+GÖREV) | 1 gün |
| 3 | TODO yaratma formu (tam: tarix, prioritet, layihə, etiket, alt görev, təkrarla) | 1 gün |
| 4 | GÖREV yaratma formu (tam: prioritet, tarix, işçi seç, təkrarla) | 1 gün |
| 5 | TODO detay ekranı (tam: status dəyiş, alt görev, şərh, fayl) | 1 gün |
| 6 | GÖREV detay ekranı (tam: status dəyiş, onay workflow, qeydlər, fayl) | 1 gün |
| 7 | Bottom navigation + router | 4 saat |

### Faza 2 — Tam Funksional (1 həftə)
| # | İş | Müddət |
|---|-----|--------|
| 8 | Tapşırıqlar siyahısı (filtr, sort, kart/siyahı toggle) | 1 gün |
| 9 | TODO Board görünüşü (drag-drop kanban) | 1 gün |
| 10 | Bildirişlər ekranı + WebSocket real-time | 1 gün |
| 11 | Fayl yükləmə/endirmə (kamera + qalerya + fayl) | 1 gün |
| 12 | Şərhlər sistemi (tapşırıq + TODO) | 4 saat |
| 13 | Pull-to-refresh + loading states + error handling | 4 saat |

### Faza 3 — Polish (3-4 gün)
| # | İş | Müddət |
|---|-----|--------|
| 14 | Profil/Ayarlar ekranı | 4 saat |
| 15 | Qaranlıq tema | 4 saat |
| 16 | Offline cache (Hive) | 1 gün |
| 17 | Push notification (FCM) | 1 gün |
| 18 | App icon + splash screen + store assets | 4 saat |

---

## Texniki Qərarlar

| Qərar | Seçim | Səbəb |
|-------|-------|-------|
| State management | Riverpod | Artıq quraşdırılıb, modern |
| Navigation | GoRouter | Deep link dəstəyi, auth guard |
| HTTP | Dio | JWT interceptor hazır |
| Local DB | Hive | Sürətli, offline cache |
| Bildiriş | socket_io_client + FCM | Real-time + push |
| Tema | Material 3 | Flutter standart |
| Fayl | file_picker + image_picker | Kamera + qalerya + fayl |

---

## API Endpoint Xülasəsi (Mobil üçün lazım olan)

| Modul | Endpoint sayı | Əsas |
|-------|--------------|------|
| Auth | 5 | login, register, me, refresh, logout |
| Tasks (GÖREV) | 16 | CRUD, status, approve, reject, notes, finalize |
| Todoist (TODO) | 14 | CRUD, complete, search, today, upcoming |
| Projects | 4 | CRUD |
| Labels | 4 | CRUD |
| Sections | 4 | CRUD |
| Comments | 4 | CRUD |
| Attachments | 6 | Upload, list, delete (task + todo) |
| Notifications | 4 | List, unread, read, read-all |
| Templates | 6 | CRUD, toggle, execute |
| **TOPLAM** | **~67** | |

---

*Bu sənəd WorkFlow Pro mobil tətbiqinin tam yol xəritəsidir.*
*Hər ekran, hər API, hər funksiya detallı şəkildə sənədlənib.*
