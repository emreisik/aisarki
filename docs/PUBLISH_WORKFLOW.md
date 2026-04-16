# Workspace & Publish Workflow — Mimari Dokümanı

**Durum:** Draft v1 · **Tarih:** 2026-04-16 · **Sahip:** Emre
**İlişkili:** [GENERATION_ARCHITECTURE.md](./GENERATION_ARCHITECTURE.md)

Bu doküman, kullanıcının ürettiği şarkıların **"Workspace → Publish → Discover"**
yolculuğunu tanımlar. Şu anda eksik olan "draft/published" ayrımı, Workspace
sayfası, batch action'lar ve publish-zamanı onay akışlarını kapsar.

---

## 1. Executive Summary

**Problem:** Projede üretilen her şarkı `status='complete'` olduğu an otomatik
olarak Discover, Trending ve public profile feed'lerine düşüyor. Kullanıcının
şarkısını önce dinleyip değerlendirme, metadata düzeltme ve yayın kararı verme
fırsatı yok. Bu hem bir **UX hatası** (kullanıcı alınan sonucu beğenmeden paylaşılmış
oluyor) hem de bir **gizlilik riski** (KVKK/GDPR açısından opt-in olması gereken bir
işlem opt-out olarak çalışıyor).

**Çözüm:** Üç katmanlı bir visibility modeli (**Private / Unlisted / Public**),
dedicated bir **Workspace** sayfası, açık bir **Publish** akışı ve terminal-state
koruyucu soft-unpublish davranışı. Aynı altyapı üzerine sonradan bulk actions,
creator analytics ve Extend/Cover/Remix pipeline'ları kurulacak.

**Kullanıcıya net vaat:** "Ürettiğin şarkı sen 'Publish' diyene kadar yalnızca
senin Workspace'inde durur. Link paylaşabilirsin, istersen profiline koyarsın,
istersen silersin — kontrol sende."

---

## 2. Mevcut Durum Tespiti

Paralel agent keşfinden özet:

| Alan                                    | Durum                                 | Dosya / Kanıt                                |
| --------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `songs.is_public` / `visibility` kolonu | ❌ Yok                                | `src/lib/taskStore.ts:31-85`                 |
| `songs.published_at`                    | ❌ Yok                                | —                                            |
| `/api/songs/[id]/publish` endpoint      | ❌ Yok                                | —                                            |
| Workspace / Library / My Songs sayfası  | ❌ Yok                                | `src/app/` altında yok                       |
| Discover feed visibility filtresi       | ❌ Yok, tüm `complete` şarkılar       | `src/app/api/discover-songs/route.ts:7-20`   |
| Profile visibility filtresi             | ❌ Yok, başkası da tümünü görüyor     | `src/app/api/profile/[username]/route.ts:30` |
| Like / Follow / Stream tracking         | ✅ Olgun                              | `taskStore.ts:580-1065`                      |
| Playlist'te `is_public`                 | ✅ Var, pattern olarak kopyalanabilir | `src/app/api/playlists/[id]/route.ts:39`     |
| SongCard `⋯` menüsü                     | ⚠️ Placeholder, boş                   | `src/components/SongCard.tsx:214`            |
| Batch select                            | ❌ Yok                                | —                                            |
| Upload (kullanıcı mp3 yükleme)          | ❌ Yok                                | —                                            |

**Özetle:** Sosyal altyapının **~%85'i hazır**, sadece **"yayın kararı"** katmanı
tamamen eksik. Bu, feature'ı "büyük refactor" değil, "sistematik ekleme" kılıyor.

---

## 3. Tasarım Prensipleri

Publish mimarisi şu prensiplere uyar:

1. **Opt-in > Opt-out.** Yeni şarkı default **Private**'tır. Kullanıcı açıkça bir
   eylem yapmadan hiçbir şarkı başkasına gözükmez.
2. **Soft > Hard.** Unpublish, like/stream sayılarını silmez, sadece görünürlüğü
   kapatır. Delete ayrı bir iki-aşamalı akıştır (Trash → Permanent).
3. **Ayrılabilir geri dönülebilir.** Publish yapılmış her karar, metrik kaybı
   olmadan geri alınabilir.
4. **Tier başına hak.** Free kullanıcı publish edebilir ama
   **non-commercial** lisansla; Pro kullanıcı **commercial** lisans alır.
   Lisans transferi sonradan yapılamaz (retroaktif yok).
5. **Tek onay, zorunlu minimum alan.** Publish modal'ı maksimum 3 alan sorar:
   başlık (zaten var), AI disclosure onayı, community guidelines onayı.
6. **Gerçek analytics, day-1.** Publish eden kullanıcı stream/listener zaman
   serisini görebilir. (Suno'nun en zayıf yanı; bizim farklılaşma alanımız.)
7. **URL stabil.** `/song/[id]` URL'i publish öncesi ve sonrası aynı kalır.
   Unlisted şarkı da aynı URL'den paylaşılır, sadece noindex + sitemap'tan çıkar.
8. **Workspace tek source-of-truth.** Kullanıcının tüm şarkıları (draft + unlisted
   - public) burada. Profil, Discover, Library hepsi bu tek store'dan beslenir.

---

## 4. Visibility Modeli

Üç katmanlı model:

| Katman                | Anlamı              | Kim Erişir        | Discover'da | Profile'da | URL ile      |
| --------------------- | ------------------- | ----------------- | ----------- | ---------- | ------------ |
| **PRIVATE** (default) | Taslak              | Sadece yaratıcı   | ❌          | ❌         | ❌ (404)     |
| **UNLISTED**          | Link ile paylaşımlı | Linki olan herkes | ❌          | ❌         | ✅ (noindex) |
| **PUBLIC**            | Herkese açık        | Herkes            | ✅          | ✅         | ✅ (indexed) |

**Neden 3 katman?**

- Suno'da sadece 2 var (Unlisted + Public), "gerçek private" yok. Bu bir eksik.
- 3 katman hem taslak koruma hem esnek paylaşım sunar.
- 4+ katman (Team, Friends-only vb.) karmaşa yaratır; şu an kaçınılır.

**State geçişleri:**

```
  ┌─────────┐ publish ┌──────────┐ make public ┌────────┐
  │ PRIVATE ├────────►│ UNLISTED ├────────────►│ PUBLIC │
  └────┬────┘ share   └────┬─────┘             └───┬────┘
       │◄──────unpublish───┘                       │
       │◄─────────────────unpublish────────────────┘
       │
       ▼
  ┌─────────┐   purge (30 gün sonra)   ┌─────────┐
  │  TRASH  ├──────────────────────────► (hard delete)
  └─────────┘
     ▲
     └── delete from any state
```

- **Publish butonu** Private → Unlisted veya direkt → Public (kullanıcı seçer).
- **Unpublish** her zaman Private'a döner. Like/stream sayıları **korunur** ama
  discover/trending query'lerinden düşer.
- **Delete** → TRASH 30 gün. İptal edilebilir. 30 gün sonra gerçekten silinir.

---

## 5. Veri Modeli

### 5.1. `songs` tablosu

```sql
ALTER TABLE songs
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','unlisted','public','trash')),
  ADD COLUMN published_at TIMESTAMPTZ,
  ADD COLUMN unpublished_at TIMESTAMPTZ,
  ADD COLUMN trashed_at TIMESTAMPTZ,
  ADD COLUMN license TEXT NOT NULL DEFAULT 'non-commercial'
    CHECK (license IN ('non-commercial','commercial')),
  ADD COLUMN remix_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN ai_disclosure BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN explicit BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN parent_song_id TEXT REFERENCES songs(id),
  ADD COLUMN parent_kind TEXT CHECK (parent_kind IN ('remix','cover','extend','sample','mashup')),
  ADD COLUMN share_token TEXT;

CREATE UNIQUE INDEX idx_songs_share_token ON songs(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX idx_songs_visibility_created
  ON songs(visibility, created_at DESC)
  WHERE visibility = 'public';

CREATE INDEX idx_songs_owner_visibility
  ON songs(created_by, visibility, created_at DESC);

CREATE INDEX idx_songs_trash
  ON songs(trashed_at)
  WHERE visibility = 'trash';
```

**Backfill (Karar: A).** Tüm mevcut şarkılar `private` olarak migrate edilir;
her birine bir `share_token` atanır (eski şarkılar için de). Kullanıcı
Workspace'e girdiğinde kendi eski şarkılarını görür, hangilerini public
yapacağına kendi karar verir.

> ⚠️ Bu, yayındaki mevcut "otomatik public" davranışını kaldırır. Duyuru + in-app
> bildirim zorunludur: "Şarkılarının gizliliği kontrolüne verildi. Workspace'e
> gel, publish etmek istediklerini seç."

### 5.2. Yeni tablolar

```sql
-- Kullanıcı başka birinin şarkısını reportladığında
CREATE TABLE song_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT
);
CREATE INDEX idx_reports_pending ON song_reports(created_at) WHERE resolved_at IS NULL;

-- Moderasyon log'u (admin action'ları)
CREATE TABLE moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  song_id TEXT REFERENCES songs(id) ON DELETE SET NULL,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,       -- 'hide','delete','warn','restore'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. API Endpoint'leri

### 6.1. Visibility yönetimi

```
POST   /api/songs/:id/publish     { visibility: 'unlisted' | 'public' }
POST   /api/songs/:id/unpublish
POST   /api/songs/:id/trash
POST   /api/songs/:id/restore
DELETE /api/songs/:id/permanent
PATCH  /api/songs/:id             { title?, description?, explicit?, remixAllowed? }
```

Hepsi **ownership check** yapar (`song.created_by === session.user.id`).
Pro-only eylemler (`license: 'commercial'` set etme) ayrıca plan kontrolü geçer.

### 6.2. Bulk action

```
POST /api/songs/bulk
  body: { ids: string[], action: 'publish'|'unpublish'|'trash'|'restore'|'delete' }
```

Tek transaction'da işlenir; her id için ownership + state-validity kontrolü.
Response per-id başarı/hata detayı döndürür.

### 6.3. Workspace feed

`/api/feed?scope=me` ([GENERATION_ARCHITECTURE.md](./GENERATION_ARCHITECTURE.md)
§4.3) bir query parametresi daha alır:

```
GET /api/feed?scope=me&visibility=all|private|unlisted|public|trash&sort=...&q=...
```

Scope=me sahibi olduğu için `private` + `trash` dahil her şeyi görür.
Scope=discover ise **sadece** `visibility='public'` döner.

### 6.4. Public okuma endpoint'leri

Şu anda public olan endpoint'lere filtre eklenir:

- `/api/discover-songs` → `WHERE visibility='public'`
- `/api/charts/trending` → `WHERE visibility='public'`
- `/api/charts/top` → `WHERE visibility='public'`
- `/api/profile/[username]` → kendi profilim → tümü; başkası → `WHERE visibility='public'`
- `/api/feed` (follow feed) → `WHERE visibility='public'`
- `/api/song/[id]` → `visibility='public'` herkese, `'unlisted'` linki bilene,
  `'private'` sadece sahibine, `'trash'` 404

---

## 7. Workspace Sayfası — UI Mimarisi

Yeni route: `/workspace` (yetkilendirme zorunlu, yoksa `/login`'e redirect).

### 7.1. Layout

```
┌────────────────────────┬──────────────────────────────────────────┐
│                        │  Workspaces › My Workspace               │
│  [Create Panel]        ├──────────────────────────────────────────┤
│                        │  [🔍 Search]  [Filters (n)] [Sort ▾]      │
│  - Simple / Advanced   │  ─────────────────────────────────────── │
│  - Song Description    │  [All] [Private] [Unlisted] [Public]     │
│  - + Audio  + Lyrics   │  ─────────────────────────────────────── │
│  - Instrumental        │                                          │
│  - Inspiration chips   │  ☐ 🎵 Şarkı A    [badge] [⋯]            │
│  - [Create] (credit)   │  ☐ 🎵 Şarkı B    [badge] [⋯]            │
│                        │  ...                                     │
│                        │                                          │
│                        │  [Bulk bar] ← seçim varken görünür      │
└────────────────────────┴──────────────────────────────────────────┘
```

Solda: mevcut `/create` formunun Workspace'e gömülmüş hali (MusicGenerator bileşeni
yeniden kullanılır; ayrı route olarak `/create` geriye dönük uyumluluk için kalır
ama `/workspace`'e redirect önerilir).

### 7.2. Filtreler

- **Visibility sekmeleri:** All, Private, Unlisted, Public, Trash
- **Filters dropdown:** tarih aralığı, genre/style, duration, model (v4.5 vs
  legacy), liked-only, "Has streams"
- **Sort:** Newest, Oldest, Most Played, Most Liked, A–Z
- **Search:** title + prompt + description full-text (basit `ILIKE` yeterli,
  sonradan tsvector'a taşınabilir)

### 7.3. Song Row — Anatomi

```
 ☐  [thumb]  Title ✏           [v4.5-all]  [🔒 private]
 3:11        prompt/description özeti...
            👍  👎  🔗  ▶   streams: 1.2K                [⋯]
```

- **Checkbox:** multi-select (Shift+click range select).
- **Düzenle ikonu:** başlık inline edit.
- **Visibility badge:** 🔒 private · 🔗 unlisted · 🌐 public · 🗑 trash.
- **Version badge:** `v4.5-all`, `v4.5 Preview`, `Upload` (ileride).
- **Share ikonu:** private/trash'te disabled, tooltip "Publish or make unlisted
  to share".
- **⋯ menüsü:** Publish/Unpublish, Make Unlisted, Make Public, Edit details,
  Download (Pro), Move to Trash, Use as Inspiration, Extend (Pro), Cover (Pro),
  Remix (Pro), Reuse prompt.

### 7.4. Bulk Action Bar

Herhangi bir satır seçilince alt kenarda fixed bir bar belirir:

```
 3 seçildi   [Publish ▾]  [Move to Trash]  [Deselect all]
```

`Publish ▾` dropdown: "Make Public" / "Make Unlisted".
Her action bir confirmation modal'ıyla: "3 şarkı public yapılacak. Emin misin?"

---

## 8. Publish Flow Detayı

Kullanıcı bir şarkıda `⋯ → Publish` dediğinde **tek ekran modal**:

```
┌─────────────────────────────────────────────┐
│ Publish: "Kulüpte Kayboldu"                  │
├─────────────────────────────────────────────┤
│                                              │
│  Kim görebilir?                              │
│  ( ) 🔗 Unlisted — sadece linki olanlar       │
│  (•) 🌐 Public  — herkes, Discover'da görünür │
│                                              │
│  Başlık:     [Kulüpte Kayboldu          ]   │
│  Açıklama:   [...                       ]   │
│  Explicit içerik:  ☐                         │
│  Remix izni:       ☑  (başkaları remix yapabilir) │
│                                              │
│  ☑ AI tarafından üretildiğini belirtiyorum   │
│  ☑ Topluluk kurallarına uyduğunu onaylıyorum │
│                                              │
│                        [İptal]  [Publish]    │
└─────────────────────────────────────────────┘
```

**Onay checkbox'larının ikisi de zorunludur** ve uncheck durumunda "Publish"
butonu disabled. Bu, `moderation_actions` audit'inin kullanıcı tarafını doldurur
(ToS ihlali durumunda hangi tarihte onay verdiği kanıtlanabilir).

**Free kullanıcı:**

- `Public` seçebilir ama modalda küçük bir uyarı: "Bu şarkı non-commercial lisansta
  kalacak. Pro'ya geçersen yeni şarkılarına commercial lisans eklenir."
- Eski şarkıların lisansı geriye dönük değişmez (Suno'nun pattern'i, hukuken
  güvenli).

**Pro kullanıcı:**

- Ek seçenek: "Commercial lisans uygula ☑". Default: ON.

---

## 9. Unpublish & Delete

### 9.1. Unpublish

- `visibility='public'|'unlisted'` → `visibility='private'`
- `unpublished_at = NOW()`
- `like_count`, `play_count`, `song_plays`, `song_likes` **dokunulmaz**.
- Public/Discover query'lerinden o anda düşer.
- Kullanıcı tekrar publish ederse eski metrikler kaldığı yerden devam eder.
- Follow feed notifikasyonları rewind edilmez (takipçilere "bir şarkı kaybolmuş"
  hissiyatı yaratmaz; sadece sonraki pull'da görünmez).

### 9.2. Trash (Soft Delete)

- Herhangi bir state'ten → `visibility='trash'`, `trashed_at=NOW()`.
- Kullanıcı Workspace'in Trash sekmesinde 30 gün boyunca görür.
- "Restore" ile eski visibility'ye döner (unpublished'e değil, Private'a).
- 30 gün sonra günlük cron (`/api/cron/purge-trash`) gerçek DELETE yapar:
  - `songs`, `song_likes`, `song_plays`, `song_reports` zincirleme silinir.
  - Bunny CDN'deki audio/image dosyaları da silinir.

### 9.3. Hard Delete

- Sadece `visibility='trash'` iken UI'da `Permanent Delete` butonu görünür.
- İkinci bir modal: "Bu geri alınamaz. Devam?" + kullanıcı şarkı başlığını
  yazdığı confirm input.
- Endpoint: `DELETE /api/songs/:id/permanent` — ownership + trash state check.

---

## 10. Attribution — Remix / Cover / Extend / Sample / Mashup

Her derivative üretim yeni bir `songs` row'u oluşturur; `parent_song_id` ve
`parent_kind` doldurulur.

**Kurallar:**

- Parent'ın `remix_allowed = false` ise Remix/Cover denemesi 403.
- Derivative şarkı Workspace'e aynen draft olarak düşer (default Private).
- Publish edilirse şarkı kartında "Remix of [X] by @user" badge'i zorunlu.
- Parent creator push notification alır: "@user şarkını remix'ledi."
- Parent silinirse derivatif şarkılar **kalır** (`parent_song_id` NULL'a düşer,
  attribution string persist edilmek isteniyorsa `parent_title_snapshot` kolonu
  sonradan eklenir).

**Royalty/komisyon:** v1'de yok. Platform sadece attribution sağlar; para akışı
ilerideki bir faz.

---

## 11. Moderation & Content Policy

### 11.1. Pre-generation

Zaten var ([sunoErrors.ts](../src/lib/sunoErrors.ts)): Suno error code'ları
(531-534) telif, sanatçı adı, içerik filtresi senaryolarını yakalar → task
`failed` markalanır. Bu layer'a dokunmuyoruz.

### 11.2. Publish-time

- AI disclosure + community guidelines onay checkbox'ları zorunlu (§8).
- Explicit flag kullanıcı tarafından işaretlenir; discover feed'de çocuk-safe
  mode varsa (henüz yok) bu bayrağa bakar.
- Sunucu-side ek bir check: publish edilen şarkının `parent_song_id` varsa,
  parent'ın `remix_allowed` değerini yeniden doğrula (TOCTOU riskini kapat).

### 11.3. Post-publish — Report

- Kullanıcı public bir şarkıyı `song_reports` tablosuna report edebilir.
- Kategoriler: Copyright, Hate/abuse, NSFW, Impersonation, Other.
- 3+ aktif rapor biriken şarkı otomatik `visibility='unlisted'` yapılır
  ("shadow hide"), admin review'ına düşer.
- Admin `moderation_actions` ile karar verir: warn, hide (trash), delete, restore.

### 11.4. Takedown

Hukuki bir talep geldiğinde admin `moderation_actions.action='delete'` kaydı
bırakır ve şarkı purge edilir. Log tutulur, kullanıcıya e-posta gider.

---

## 12. Creator Analytics

Publish eden kullanıcıya **`/workspace/analytics`** sayfası açılır:

- Günlük stream / listener / like zaman serisi (30 gün).
- Top 5 şarkı.
- Geo breakdown (ülke/şehir bazında, IP → coarse location, KVKK uyumlu).
- Referrer kırılımı (internal / direct / external / twitter / whatsapp).

**Veri kaynağı:** `song_plays` zaten tutuluyor ([taskStore.ts:86-128](../src/lib/taskStore.ts)).
Agregasyon bir materialized view üzerinden (`mv_song_daily_stats`), saatlik
refresh. Yüksek kardinalite sorun olursa ClickHouse gibi bir OLAP'a v2'de
geçeriz; v1'de Postgres yeterli.

Bu, Suno'nun en büyük eksiği. **Day-1 farklılaşma noktamız.**

---

## 13. Plan Tier Stratejisi

| Yetenek                            | Free | Pro                |
| ---------------------------------- | ---- | ------------------ |
| Şarkı üretme                       | ✅   | ✅                 |
| Workspace + Private                | ✅   | ✅                 |
| Unlisted paylaşım                  | ✅   | ✅                 |
| Public publish                     | ✅   | ✅                 |
| Commercial lisans                  | ❌   | ✅ (yeni şarkılar) |
| Download (mp3)                     | ❌   | ✅                 |
| Remix / Cover / Extend             | ❌   | ✅                 |
| Upload (kullanıcı mp3)             | ❌   | ✅                 |
| Bulk actions                       | ✅   | ✅                 |
| Creator analytics (basic)          | ✅   | ✅                 |
| Creator analytics (geo + referrer) | ❌   | ✅                 |
| Batch export                       | ❌   | ✅                 |

**Lisans retroaktivite politikası:** Free iken public'lenen şarkılar Pro'ya
geçişten sonra da non-commercial kalır. Kullanıcı Pro'ya geçtikten sonra yeniden
publish etmek isterse şarkıyı unpublish → edit → publish döngüsüyle commercial'a
taşıyabilir. Bu explicit yapılır, sessizce yükseltilmez.

---

## 14. Migration Planı

**Pre-requisite:** [GENERATION_ARCHITECTURE.md](./GENERATION_ARCHITECTURE.md)
Aşama 1 (Hot-fix) uygulanmış olmalı. Şarkıların görünürlüğü stabil olmadan
publish UX'i anlam kazanmaz.

### Aşama A — Veri Modeli & Default Private (1-2 gün)

- [ ] DB migration: §5.1 kolonlarını ekle.
- [ ] `ensureSchema()` ([taskStore.ts:46-85](../src/lib/taskStore.ts)) aynı
      kolonları runtime'da da ekleyecek şekilde güncelle.
- [ ] **Backfill — KARAR: A.** Tüm mevcut şarkılar `visibility='private'`
      olarak migrate edilir. KVKK/gizlilik açısından en temiz yol; kullanıcı
      hangi şarkısını public göstereceğine bilinçli karar verir. Discover
      feed'i migration sonrası kısa süreli "zayıf" görünebilir — bu, tasarımın
      sonucu, hatası değil. - Migration SQL: `UPDATE songs SET visibility='private' WHERE visibility IS NULL;` - Eş zamanlı ihtiyaç: bildirim akışı hazır olmalı (aşağıdaki madde). - Top-streamed şarkılar bir anda düşecek; ops team'i haberdar olmalı.
- [ ] Tüm public okuma endpoint'lerine `WHERE visibility='public'` filtresi.
- [ ] `POST /api/songs/:id/publish` + `/unpublish` endpoint'leri.
- [ ] Create akışı: yeni şarkı `visibility='private'` ile insert.
- [ ] **Bildirim:** in-app banner + e-posta — "Şarkılarının gizliliği senin
      kontrolüne verildi. Workspace'i incele."

**Test:** Mevcut kullanıcılar kendi şarkılarını kaybetmiyor; başka kullanıcıların
public olmayan şarkıları gözükmüyor.

### Aşama B — Workspace Sayfası (2-3 gün)

- [ ] `/workspace` route, layout, Create paneli solda.
- [ ] Feed integration: `useFeed({ scope: 'me', visibility })` hook'u.
- [ ] Song row component (checkbox, badge, ⋯ menü).
- [ ] Visibility sekmeleri, search, sort dropdown.
- [ ] Visibility badge'i SongCard'a ekle.
- [ ] ⋯ menüsündeki Publish/Unpublish/Make Unlisted action'ları.

### Aşama C — Publish Modal & Bulk Actions (1-2 gün)

- [ ] Publish modal component (§8).
- [ ] `POST /api/songs/bulk` endpoint.
- [ ] Bulk action bar (fixed bottom).
- [ ] Shift+click range select.
- [ ] Optimistic UI + server reconcile.

### Aşama D — Trash & Cron (1 gün)

- [ ] Trash sekmesi Workspace'te.
- [ ] `POST /api/songs/:id/trash`, `/restore`, `/permanent`.
- [ ] Permanent delete confirmation (title-retype).
- [ ] `/api/cron/purge-trash` — günlük, >30 gün olanları gerçekten sil.

### Aşama E — Moderation & Analytics (3-5 gün)

- [ ] `song_reports` tablosu, report modal.
- [ ] Admin moderation dashboard (v1: basit liste + action butonları).
- [ ] Auto shadow-hide (≥3 rapor → unlisted).
- [ ] Creator analytics sayfası: stream time-series, top songs.
- [ ] Pro-only geo + referrer breakdown.

### Aşama F — Derivatives (sonraya ertelenebilir)

- [ ] Remix / Cover / Extend / Sample / Mashup endpoint'leri.
- [ ] Attribution UI + badge.
- [ ] Parent remix_allowed enforcement.
- [ ] Creator notification on derivative publish.

---

## 15. Acceptance Kriterleri

| #   | Senaryo                                          | Beklenen                                                        |
| --- | ------------------------------------------------ | --------------------------------------------------------------- |
| 1   | Yeni şarkı üret                                  | `visibility='private'`, sadece Workspace'te görünür             |
| 2   | Başka kullanıcı profilime bakar                  | Yalnızca `public` şarkılarımı görür                             |
| 3   | Unlisted şarkının linkini paylaş                 | Linki bilen çalabilir, Discover'da yok, Google'da yok (noindex) |
| 4   | Private şarkının URL'ini başkası açar            | 404                                                             |
| 5   | Publish et → Unpublish et                        | Like ve stream sayıları korunur                                 |
| 6   | Trash'e at → 30 gün içinde restore               | Şarkı eski visibility'sine geri döner                           |
| 7   | Trash'ten permanent delete                       | Songs + Bunny + ilişkili tüm kayıtlar silinir                   |
| 8   | 5 şarkı seç → Make Public                        | Hepsi tek transaction'da public olur, hata olanlar raporlanır   |
| 9   | Free kullanıcı public publish eder               | Lisans non-commercial, küçük not gösterilir                     |
| 10  | Pro kullanıcı → aynı                             | Default commercial, değiştirebilir                              |
| 11  | 3+ rapor alan public şarkı                       | Otomatik unlisted, admin queue'suna düşer                       |
| 12  | Publish modal'ı iki onay checkbox'ı boşken       | "Publish" butonu disabled                                       |
| 13  | Remix edilmeye kapalı bir şarkıyı remix denemesi | 403                                                             |
| 14  | Creator analytics sayfası                        | Son 30 gün stream time-series, zero-state uygun mesaj           |
| 15  | Bulk action sırasında bir id sahibim değil       | O id skip edilir, kalanlar işler, response detayı gösterir      |

---

## 16. Silinecek / Basitleşecek Kod

Publish sistemi kurulduktan sonra aşağıdakiler sadeleşir:

- Discover/charts query'lerindeki `audio_key IS NOT NULL` filtresi
  ([GENERATION_ARCHITECTURE.md](./GENERATION_ARCHITECTURE.md) Aşama 1 ile zaten
  `playable` sütununa taşınıyor; burada ek olarak `visibility` filtresi eklenir).
- `getUserSongs()` içindeki "sahibi misin?" dallanması tek satırda toparlanır:
  `viewer.id === owner.id ? allVisibilities : ['public']`.
- SongCard'daki boş `⋯` placeholder gerçek menüye dönüşür.

---

## 17. Kararlar (eskiden Açık Sorular)

Tüm açık sorular aşağıdaki şekilde karara bağlandı. Implementasyon bu kararları
takip eder; değişiklik istenirse doküman güncellenir.

1. **Backfill.** Karar: **A** — tüm mevcut şarkılar `private`. Detay: §14 Aşama A.

2. **Unlisted link güvenliği.** Karar: **ID + token ikilisi.** URL şeması:
   `/song/:id?t=<16-char-opaque-token>`.
   - `songs` tablosuna `share_token TEXT` kolonu eklenir (nullable).
   - Token `crypto.randomBytes(12).toString('base64url')` ile üretilir, şarkı
     üretim anında **bir kez** set edilir (tüm şarkılar için — publish zamanı
     değil, create zamanı).
   - `visibility='unlisted'` iken `/song/:id` route'u `t` parametresi olmadan
     erişimi 404'le reddeder. `visibility='public'` iken token ignore edilir.
   - Rotasyon: kullanıcı Workspace'te "Generate new share link" diyebilir
     (eski token invalidate olur). v1'de opsiyonel, v2'ye ertelenebilir.

3. **Analytics depolama.** Karar: **Postgres v1'de yeterli.** `song_plays`
   tablosu üzerinden günlük materialized view (`mv_song_daily_stats`), saatlik
   `REFRESH MATERIALIZED VIEW CONCURRENTLY`. Eşik: tablo 100M satırı veya
   view refresh > 60sn'yi aşınca ClickHouse/Tinybird değerlendirmesi.

4. **`/create` vs `/workspace`.** Karar: **İkisi de korunur, paylaşık form.**
   - `/create` — mobile-first, tek amaçlı (üret ve dinle). Geçmişte paylaşılan
     bookmark'ları bozmaz.
   - `/workspace` — desktop-first, Create paneli + liste + filter + bulk.
   - Her iki sayfa da aynı `MusicGenerator` bileşenini kullanır.
   - Navigation default'u: desktop → `/workspace`, mobile → `/create`.

5. **Auto-explicit detection.** Karar: **v2'ye ertelendi.** v1'de sadece
   kullanıcı checkbox'ı. Otomatik tespit false-positive riski yüksek
   (Türkçe argo tanıma modelinin olgunluğu düşük), UX maliyeti ağır basıyor.

6. **Kullanıcı mp3 upload.** Karar: **v1 kapsamında yok, ayrı faz.** Suno
   tabanlı üretim + attribution iş yükünü stabilize etmeden upload'a (depolama
   kontrolü, moderation, lisans yönetimi) girilmez. Referans UI'daki "Upload"
   badge'i v1'de gizli.

---

## 18. İlgili Dosyalar (Hedef Harita)

### Yeni dosyalar

```
src/app/workspace/page.tsx
src/app/workspace/analytics/page.tsx
src/app/workspace/trash/page.tsx

src/app/api/songs/[id]/publish/route.ts
src/app/api/songs/[id]/unpublish/route.ts
src/app/api/songs/[id]/trash/route.ts
src/app/api/songs/[id]/restore/route.ts
src/app/api/songs/[id]/permanent/route.ts
src/app/api/songs/bulk/route.ts
src/app/api/songs/[id]/report/route.ts
src/app/api/cron/purge-trash/route.ts
src/app/api/admin/moderation/route.ts
src/app/api/admin/moderation/[songId]/route.ts

src/components/workspace/WorkspaceLayout.tsx
src/components/workspace/SongRow.tsx
src/components/workspace/VisibilityBadge.tsx
src/components/workspace/PublishModal.tsx
src/components/workspace/BulkActionBar.tsx
src/components/workspace/FilterBar.tsx
src/components/workspace/ReportModal.tsx
```

### Değişecek dosyalar

```
src/lib/taskStore.ts              # ensureSchema() + query'ler
src/app/api/discover-songs/*      # visibility filter
src/app/api/charts/*              # visibility filter
src/app/api/profile/[username]/*  # viewer vs owner filter
src/app/api/feed/*                # visibility filter (follow feed)
src/app/api/song/[id]/*           # ownership + visibility gate
src/app/song/[id]/page.tsx        # metadata noindex logic
src/components/SongCard.tsx       # visibility badge + ⋯ menü
src/types/index.ts                # Song interface + Visibility type
prisma/schema.prisma              # migration
```

---

**Sonraki adım:** §17'deki açık soruları karara bağla (özellikle backfill
yaklaşımı), sonra Aşama A'ya başla. Her aşama ayrı PR, kendi test'iyle.
