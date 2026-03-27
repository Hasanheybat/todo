# WorkFlow Pro — Layihə Qaydaları və Məlumat

## Layihə Haqqında

WorkFlow Pro — müəssisələrin daxili iş proseslərini, tapşırıqlarını, işçi maaşlarını və maliyyə axınlarını vahid platformada idarə etməsinə imkan verən çoxkiracılı (multi-tenant) SaaS sistemidir.

- **Hədəf:** 20+ işletmə, SaaS satış modeli
- **Platform:** Web + Mobil
- **Layihə sənədi:** `/Users/hasan/Downloads/WorkflowPro_Layihe.md`

---

## Modullar

| Modul | Əsas Funksiyalar |
|---|---|
| **Task & Todo** | Tapşırıq atama, prioritet, fayl, tarix, zamanlama, avtomatik tapşırıqlar |
| **İşletmə & Tenant** | Çox işletmə dəstəyi, hər işletmənin öz kiracısı, ayrı maliyyə kassası |
| **İstifadəçi & Rol** | Ağac ierarxiya, müdir/işçi rolları, RBAC |
| **Maaş & HR** | Maaş atama, bonus, aylıq ödəmə izləmə |
| **Maliyyə** | Gələn/gedən pul, kateqoriyalar, layihə kassaları, Excel import |
| **Bildiriş** | Real-time bildiriş, e-poçt, mobil push, tapşırıq xatırlatması |

---

## Texniki Stack

| Qat | Texnologiya |
|---|---|
| **Frontend (Web)** | React.js + Next.js |
| **Mobil** | React Native |
| **Backend** | Node.js (NestJS) |
| **Verilənlər bazası** | PostgreSQL + Redis |
| **Fayl saxlama** | AWS S3 / DigitalOcean Spaces |
| **Cron / Zamanlama** | Bull Queue (Redis əsaslı) |
| **Auth** | JWT + Refresh Token, RBAC |
| **Bildiriş** | Firebase (push) + SendGrid (e-poçt) + Socket.io |

---

## İnkişaf Fazaları

| Faza | Dövr | İş |
|---|---|---|
| **Faza 1** | Ay 1–2 | Auth, istifadəçi/rol sistemi, ağac ierarxiya, əsas todo/tapşırıq |
| **Faza 2** | Ay 3 | Zamanlama, avtomatik tapşırıq şablonları, fayl əlavəsi, onay mexanizmi |
| **Faza 3** | Ay 4 | Maliyyə modulu, maaş/HR, şəxsi kassa, layihə kassaları |
| **Faza 4** | Ay 5 | Excel import/vizual, işletmə paneli, maliyyə hesabatları |
| **Faza 5** | Ay 6 | Mobil tətbiq (React Native), push bildiriş, tenant paneli |
| **Faza 6** | Ay 7–8 | SaaS onboarding, ödəmə inteqrasiyası, subdomain, plan idarəsi |
| **Faza 7** | Davam | Analitika, KPI paneli, açıq API, əlavə inteqrasiyalar |

---

## İş Qaydaları (MƏCBURI)

Bu qaydalar layihənin bütün inkişaf prosesində pozulmaz qanunlardır:

### 1. Əvvəlcə Plan
- Hər faza və hər addım üçün əvvəlcə detallı plan yaradılmalıdır.
- Plan onaylanmadan işə başlanılmaz.

### 2. UI/UX Birinci
- Hər addımda əvvəlcə UI/UX yazılır və test edilir.
- Backend və ya digər kodlamaya UI hazır olmadan keçilməz.

### 3. Canlı Test və Onay
- İstifadəçi hər addımı özü canlı test edir.
- **Onay olmadan növbəti addıma keçilməz.**
- Onaysız kodlama qadağandır.

### 4. Pulsuz Alətlər
- Yalnız pulsuz və açıq mənbəli (open-source) alətlər istifadə edilməlidir.
- Ödənişli xidmət və ya alət istifadə edilməz.

### 5. Skill / Paket Quraşdırma
- Əgər bir skill və ya paket lazımdırsa, əvvəlcə yazılır/göstərilir.
- İstifadəçinin onayı olmadan heç bir şey yüklənməz və ya quraşdırılmaz.

---

## İş Axını

```
Plan yaradılır
    ↓
Plan onaylanır
    ↓
UI/UX yazılır
    ↓
Canlı test edilir (istifadəçi tərəfindən)
    ↓
Onay verilir
    ↓
Backend kodlanır
    ↓
Test edilir
    ↓
Onay verilir
    ↓
Növbəti addıma keçilir
```

---

*Son yenilənmə: 18 Mart 2026*
