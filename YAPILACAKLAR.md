# WorkFlow Pro — Yapılacaklar Siyahısı

*Son yenilənmə: 31 Mart 2026*

---

## 🎨 Aktiv — V7 Slate Tema Tətbiqi

### ThemeContext + Toggle
- [ ] `ThemeContext.tsx` — `localStorage` ilə tema saxlama
- [ ] `ThemeToggle.tsx` — Header-də keçid düyməsi (Default ↔ Slate)
- [ ] `layout.tsx` — `data-theme` atributu + ThemeProvider

### CSS Tema Faylı
- [ ] `styles/theme-slate.css` — v7 CSS dəyişənləri (rənglər, fontlar, kölgələr)
- [ ] Plus Jakarta Sans Google Font əlavəsi

### Komponent Stilləri (Slate tema üçün)
- [ ] `Sidebar.tsx` — v7 sidebar stili
- [ ] `Header.tsx` — v7 header stili

### Səhifə Stilləri (Slate tema üçün)
- [ ] `dashboard/page.tsx` — KPI kartlar, bento grid
- [ ] `tasks/page.tsx` — task siyahı, filter bar
- [ ] `inbox/page.tsx` — inbox siyahı

---

## 🔴 Kritik — Mövcud Buglar

### Task (Adi Tapşırıq)
- [ ] Eyni kişiyə 2+ görev əlavə edildikdə söhbətlər qarışır (özel mesaj birindən yazılanda digərində də görünür)
- [ ] Toplu mesajda dublikat problem — mesaj 2 dəfə göndərilir
- [ ] Mesaj göndərildikdə anlıq görünmür (kapatıb açınca gəlir)
- [ ] Söhbət bağlandıqda yaradan hələ mesaj göndərə bilir

### Toplu Tapşırıq (GÖREV)
- [ ] Özel söhbətdə fayl göndəriləndə görünmür (hər iki tərəf)
- [ ] Toplu söhbətdə bütün mesajlar yaradan kimi göstərilir (senderId yoxlanmır)
- [ ] 3 nöqtə menusunda əməliyyatlar üçün ConfirmModal lazım

### MentionInput
- [ ] `@` işarəsi yalnız boşluqdan sonra və ya sətir başında işləməli (word@ olanda açılmamalı)

---

## 🟠 Jira Entegrə — Hızlı (1-2 saat)

### 1. SLA / Deadline Xəbərdarlıq
- [ ] Gecikən task-larda qırmızı badge
- [ ] Son gün yaxınlaşanda sarı xəbərdarlıq
- [ ] Keçmiş tarixli task-lar üçün bildiriş

### 2. Activity Stream (Tarixçə)
- [ ] Task/Görev-də kim nə etdi log-u (status dəyişdi, mesaj yazdı, fayl əlavə etdi)
- [ ] Zaman damğası ilə sıralı siyahı
- [ ] Task modal-da "Tarixçə" tab-ı

### 3. Bulk Operations (Toplu Əməliyyat)
- [ ] Tapşırıqlar səhifəsində checkbox ilə çoxlu seçmə
- [ ] Seçilənləri toplu sil / status dəyiş / prioritet dəyiş
- [ ] Bulk action bar (seçim sayı + əməliyyat butonları)

### 4. Task Əlaqələndirmə
- [ ] "Bu task X-i blok edir" əlaqəsi
- [ ] "X-dən asılıdır" əlaqəsi
- [ ] Task modal-da əlaqəli task-lar bölməsi

---

## 🟡 Jira Entegrə — Orta (3-5 saat)

### 5. Kanban Board (Task/Görev üçün)
- [ ] Tapşırıqlar səhifəsində Board görünüşü (Siyahı/Board toggle)
- [ ] Sütunlar: Gözləyir → Davam edir → Onay gözləyir → Tamamlandı
- [ ] Kartları sütunlar arası drag-drop
- [ ] Filial/prioritet filtrləri Board-da da işləsin

### 6. Dashboard / KPI Panel
- [ ] Ana səhifədə widget-lər sistemi
- [ ] Widget-lər: gecikən task sayı, tamamlanan %, filial performansı
- [ ] Dairəvi chart (prioritet paylanması)
- [ ] Son 7/30 gün trendi (xətt chart)
- [ ] Ən aktiv işçilər TOP 5

### 7. Zaman İzləmə (Time Tracking)
- [ ] Hər task-da "Başla/Bitir" timer butonu
- [ ] Toplam sərf olunan vaxt göstəricisi
- [ ] İşçi bazında vaxt hesabatı
- [ ] Gözlənilən vaxt vs real vaxt müqayisəsi

---

## 🔵 Gələcək — Böyük Özəlliklər

### 8. Sprint / Scrum
- [ ] Sprint yaratma (ad, başlama/bitmə tarixi)
- [ ] Backlog → Sprint-ə task köçürmə
- [ ] Sprint Board (aktiv sprint-in Kanban-ı)
- [ ] Burndown chart
- [ ] Velocity chart

### 9. Roadmap / Timeline
- [ ] Gantt chart görünüşü
- [ ] Epic → Story → Subtask ağac strukturu
- [ ] Timeline-da drag ilə tarix dəyişmə

### 10. Workflow Builder
- [ ] Vizual iş axını dizayneri
- [ ] Custom statuslar yaratma
- [ ] Keçid qaydaları (kim hansı statusdan hansına keçə bilər)

### 11. Automation Rules
- [ ] "Task yarananda → bildiriş göndər" qaydası
- [ ] "Deadline keçəndə → müdirə xəbər ver" qaydası
- [ ] "Status dəyişəndə → etiket əlavə et" qaydası
- [ ] If/Then vizual qayda yaratma UI

### 12. Custom Fields
- [ ] İstifadəçi öz sahələrini yarada bilsin (text, number, date, dropdown)
- [ ] Task yaratmada custom field-lər göstərilsin
- [ ] Filtrləmə və hesabatlarda custom field dəstəyi

### 13. Webhooks / API
- [ ] Xarici sistemlərə event göndərmə (task yarandı, tamamlandı)
- [ ] REST API dokumantasiyası (Swagger)
- [ ] API key idarəetmə

---

## ✅ Tamamlanmış

- [x] Yetki sistemi sadələşdirildi (52 → 9 yetki)
- [x] SaaS → Tenant yetki kaskadı (allowedPermissions)
- [x] İerarxiya sistemi (parentId + assign_upward + filial limiti)
- [x] GÖREV update smart sync (sub-task notes/status qorunur)
- [x] Çoxlu fayl əlavəsi (TASK + GÖREV)
- [x] MessageBubble düzənlə/sil butonları silindi
- [x] Backend creator icazəsi (toggleChatClosed, changeAssigneeStatus)
- [x] Yetkili kişi dropdown-da gorev.approve filtrı
