# Generation Pipeline — Mimari Dokümanı

**Durum:** Draft v1 · **Tarih:** 2026-04-16 · **Sahip:** Emre

Bu doküman, "şarkı üret → UI'da göster" akışının mevcut haldeki kırılganlıklarını
belgeleyip tek bir tutarlı state modeline taşıyan mimariyi tanımlar. Amaç, kullanıcının
gördüğü **"panel 10-20 saniye sonra kayboluyor, şarkı hiçbir yerde yok"** hatasını
kökten çözmek ve benzer sınıftan bug'ların tekrar etmesini engellemek.

İlgili kod referansları bu dokümanda `dosya:satır` formatında verilmiştir.

---

## 1. Semptom

`/create` sayfasında "Generate Music" butonuna basılır. İşlem paneli görünür.
10-20 saniye sonra:

- Inline Processing Banner (panel) UI'dan kaybolur.
- Şarkı, Create sayfasının "tamamlananlar" bölümünde görünmez.
- Ana sayfa, Profil ve Kütüphane'de de görünmez.
- Push notification gelmez veya geç gelir.
- Sayfa yenilense bile şarkı geri gelmez.

Kısacası: Kullanıcı, üretim başlattığını sanır; sonra her şey ortadan kaybolur.

---

## 2. Kök Neden Analizi (Root Cause)

Sorun, **tek bir bug** değil, birden fazla state kaynağının yarış (race condition)
durumunda buluşmasıdır. Aşağıdaki dört problem birlikte çalıştığı için semptom ortaya
çıkar:

### 2.1. `getProcessingTasks` `'complete'` task'ları listeden düşürür

**Dosya:** `src/lib/taskStore.ts:229`

```sql
WHERE status IN ('processing', 'failed')
  AND created_at > NOW() - INTERVAL '2 hours'
```

Callback geldiği anda `markTaskComplete(taskId)` çalışır ve `tasks.status = 'complete'`
olur. Ancak Bunny CDN upload'u `after()` ile asenkron devam ettiği için
`songs.audio_key` hâlâ `NULL`'dur. **Bu pencerede:**

- `/api/all-songs` → `getProcessingTasks()` task'ı listeden atar → panel kaybolur.
- `/api/all-songs` → `getAllSongs(userId)` ise `audio_key IS NOT NULL` filtresi
  nedeniyle şarkıyı döndürmez (`taskStore.ts:386-398`).

**Sonuç:** Task "complete" ama şarkı "henüz yok" → ikisinin arası bir kara delik.

### 2.2. Frontend polling'in completion koşulu çok sert

**Dosya:** `src/app/create/page.tsx:317-323`

```ts
const playableSongs = (data.songs ?? []).filter((s) => s.audioUrl);
if (
  data.status === "complete" &&
  playableSongs.length > 0 &&
  playableSongs.length >= (data.songs?.length ?? 1)
) { ... }
```

Suno **2 şarkı varyantı** üretir. Biri Bunny'ye daha önce kopyalanır, diğeri gecikir.
Bu aradaki pencerede:

- `playableSongs.length = 1`, `data.songs.length = 2` → koşul FALSE.
- Polling 2 saniyelik interval'de devam eder.
- Paralelde 5 saniyelik `fetchTasks` task'ı "complete" görüp listeden düşürür.
- **Panel UI'dan gider; polling sessizce arka planda devam eder.**
- Bunny upload başarısız olursa (60s timeout / network), `audio_key` hiç set olmaz;
  10 dakika MAX_ATTEMPTS'ten sonra task "failed" markalansa bile panel çoktan yok.

### 2.3. `completedSongs` tamamen local state

**Dosya:** `src/app/create/page.tsx:328-332`

Polling başarıyla tamamlanınca şarkı sadece `useState` içindeki `completedSongs`'a
eklenir. Sayfa yenilenince, sekme kapanınca veya user başka route'a gidince bu state
yok olur. DB'de şarkı var ama Create sayfası onu tekrar göstermez çünkü yalnızca
**o anki session'da tamamlanan** şarkıları tutar.

### 2.4. Birden fazla paralel state kaynağı (fragmented state)

Aynı "task var mı, nerede, ne durumda" sorusunun **5 farklı cevabı** var:

| Katman                        | Lokasyon          | Güncelleme              | Sorun                             |
| ----------------------------- | ----------------- | ----------------------- | --------------------------------- |
| In-memory `taskStore`         | `taskStore.ts:12` | Callback + polling      | Serverless instance başına farklı |
| DB `tasks` tablosu            | Postgres          | Callback + markComplete | 2 saatlik TTL ile filtrelenir     |
| DB `songs` tablosu            | Postgres          | upsertSongs + Bunny     | `audio_key IS NOT NULL` filtresi  |
| Create page `processingTasks` | React useState    | 5sn interval fetch      | `complete` olunca düşer           |
| Create page `completedSongs`  | React useState    | Polling sonucu          | Yalnızca aynı sekmede             |

**Zustand/Redux/SWR/TanStack Query yok.** Her bileşen kendi fetch'ini yazar.
Cache invalidation protokolü yok. Optimistic update yok.

### 2.5. Kayboluş Senaryosu — zaman çizelgesi

```
t = 0s    POST /api/generate → Suno'ya çağrı → tasks(status=processing) + banner görünür
t = 3s    Suno callback gelir → setTaskSongs() + upsertSongs() + markTaskComplete()
          tasks.status='complete', songs.audio_key=NULL, after() başlar (Bunny)
t = 5s    Create: fetchTasks() → getProcessingTasks() task'ı DÖNDÜRMEZ
          → setProcessingTasks'ten düşer → ★ PANEL KAYBOLUR ★
t = 5-60s Create: startPolling hâlâ /api/songs çağırıyor; audio_url NULL
t = 10s   Create: getAllSongs → audio_key NULL → ŞARKI YOK
t = 45s   Bunny upload biter → updateSongAudioKey(id, key) → artık playlistte görünür
t = 45s+  AMA user bu sırada Create'ten çıktı → completedSongs state silindi → HİÇBİR YER
```

Hatanın **gerçek süresi 10-60 saniye arasıdır**. Kullanıcı kaybolmaya 20sn'de şahit
olur, şarkının geri gelmesini izlemez — sayfa yeniler, "hiçbir yerde yok" sonucuna
varır.

---

## 3. Tasarım Prensipleri

Yeni mimari şu prensiplere uyar:

1. **Single Source of Truth:** "Bu task ne durumda?" sorusunun tek bir yetkili cevabı
   vardır: veritabanı. UI daima DB'nin temsilidir, DB'nin önünde değil.
2. **Şarkı, `audio_key` varlığına göre değil, `status`'a göre listelenir.**
   Kalıcılık (Bunny) bir görünürlük koşulu değil, bir kalite optimizasyonudur.
   Stream URL veya audio URL varsa şarkı çalınabilir ve GÖRÜNÜR olmalıdır.
3. **Terminal state = sticky UI:** Bir task bir kez `complete` veya `failed` olduysa,
   TTL ile silinmez; kullanıcı kendi açıkça kapatana veya 24 saat sonra
   arşivlenene kadar durur.
4. **Polling, gerçeğin kaynağı değil; UI'ın yerel önbelleğidir.** Periyodik
   re-fetch her zaman winning source'tur.
5. **Optimistic-first UX:** Kullanıcı "Generate" der demez UI'da placeholder çizilir;
   server response'u onu ya onaylar ya düzeltir.
6. **Cancelable ve resumable:** Refresh, tab switch, mobile lock sonrası state aynı
   kalır. Polling local state'e değil, server-side task ID'ye bağlıdır.

---

## 4. Hedef Mimari

### 4.1. State Machine

Task tek bir kesin state machine'e bağlıdır:

```
queued ──► submitting ──► processing ──► rendering ──► complete
   │            │              │              │
   │            └──────────────┴──────────────┴──► failed
   │
   └──► canceled
```

| State        | Anlamı                                                  | UI                                |
| ------------ | ------------------------------------------------------- | --------------------------------- |
| `queued`     | /api/generate çağrılmak üzere (optimistic)              | Skeleton                          |
| `submitting` | Suno'ya POST atılıyor                                   | Spinner                           |
| `processing` | Suno oluşturuyor                                        | Processing banner, canlı ilerleme |
| `rendering`  | Callback geldi, Bunny upload devam                      | Banner "%95, finalleniyor"        |
| `complete`   | En az bir şarkı çalınabilir (stream_url VEYA audio_url) | Tamamlandı kartı                  |
| `failed`     | Error code alındı / timeout                             | Failed kartı + Retry              |
| `canceled`   | Kullanıcı iptal etti                                    | Gizli                             |

**Önemli:** `rendering` → `complete` geçişi `audio_key` değil, **çalınabilir URL'nin
varlığıyla** tetiklenir. `audio_key` sonradan asenkron olarak gelir ve kalıcılığı
artırır ama görünürlük kararını etkilemez.

### 4.2. Veri Modeli Değişiklikleri

**`tasks` tablosu:**

```sql
ALTER TABLE tasks
  ADD COLUMN phase TEXT NOT NULL DEFAULT 'queued'
    CHECK (phase IN ('queued','submitting','processing','rendering','complete','failed','canceled')),
  ADD COLUMN visible_until TIMESTAMPTZ,   -- UI'da ne zamana kadar sticky
  ADD COLUMN user_dismissed_at TIMESTAMPTZ;

CREATE INDEX idx_tasks_user_phase ON tasks(created_by, phase, created_at DESC);
```

Eski `status` kolonu backward-compat için bir süre korunur, migration script `phase`
değerini doldurur. Yeni kod sadece `phase` kullanır.

**`songs` tablosu:**

```sql
ALTER TABLE songs
  ADD COLUMN playable BOOLEAN GENERATED ALWAYS AS
    ( (stream_url IS NOT NULL) OR (audio_url IS NOT NULL) OR (audio_key IS NOT NULL) )
    STORED;

CREATE INDEX idx_songs_playable ON songs(created_by, playable, created_at DESC)
  WHERE playable = TRUE;
```

Şarkı listelerinde filtre: `WHERE playable = TRUE`. `audio_key IS NOT NULL` filtresi
**tüm query'lerden kaldırılır.**

### 4.3. Tek Bir "Feed" Endpoint'i

Üç ayrı endpoint (`/api/all-songs`, `/api/songs`, `/api/discover-songs`) yerine tek
bir endpoint:

```
GET /api/feed?scope=me|discover&since=<ts>&includeTasks=true
```

Response:

```jsonc
{
  "tasks": [
    {
      "taskId": "...",
      "phase": "rendering",
      "progress": 0.8,
      "songs": [
        { "id": "...", "title": "...", "streamUrl": "...", "playable": true },
      ],
    },
  ],
  "songs": [
    { "id": "...", "title": "...", "audioUrl": "...", "playable": true },
  ],
  "serverTime": "2026-04-16T12:00:00Z",
}
```

Aynı endpoint hem "üretimdeki task'ları" hem "bitmiş şarkıları" döndürür. UI, iki
ayrı state'i senkronize etmek zorunda kalmaz.

### 4.4. Polling Stratejisi — tek katman

Mevcut: page'de `setInterval` (5sn) + taskId başına `setTimeout` (2sn) = iki katman.
Hedef: **Tek bir SWR/TanStack Query hook'u.**

```ts
useSWR(["/api/feed", scope], fetcher, {
  refreshInterval: hasActiveTasks ? 3000 : 15000,
  revalidateOnFocus: true,
  keepPreviousData: true,
});
```

- Aktif task varsa 3 saniyede bir poll.
- Hiç aktif task yoksa 15 saniye.
- Sekme focus geri gelince otomatik revalidate.
- Tek query = tek cache = tek gerçek.

`startPolling(taskId)` fonksiyonu ve `pollingRef` tamamen silinir.

### 4.5. Optimistic Flow

Kullanıcı "Generate" basınca:

1. UI anında `{ phase: 'queued', id: tempId }` satırı ekler.
2. `POST /api/generate` yapılır.
3. Response 200 → `tempId` → real `taskId` map'lenir, `phase: 'processing'`.
4. Response hata → `phase: 'failed'` + Retry butonu.
5. Sonraki feed pull'u gerçeği onaylar.

UI asla "boş" görünmez. Network kesilse bile `queued` stuck kalmaz çünkü UI
client-side timeout (15sn) ile `failed` işaretler.

### 4.6. Sticky Terminal State

```sql
-- Callback'te:
UPDATE tasks SET
  phase = 'complete',
  visible_until = NOW() + INTERVAL '24 hours'
WHERE task_id = $1;

-- getActiveTasks query'si:
SELECT * FROM tasks
WHERE created_by = $userId
  AND user_dismissed_at IS NULL
  AND (
    phase IN ('queued','submitting','processing','rendering') OR
    (phase = 'failed' AND created_at > NOW() - INTERVAL '2 hours') OR
    (phase = 'complete' AND visible_until > NOW())
  )
ORDER BY created_at DESC;
```

- `processing` task'lar: yaş sınırsız görünür (tamamlanana kadar).
- `complete` task'lar: 24 saat sticky → kullanıcı "Dismiss" basarsa veya süre dolarsa
  banner'dan çıkar.
- `failed`: 2 saat sticky + retry butonu.
- Şarkılar `/api/feed?scope=me` içinde ayrıca döner, banner kaybolsa da kütüphanede
  kalır.

### 4.7. Bunny Upload Dayanıklılığı

`after()` içindeki upload:

- 60sn timeout'tan önce "checkpoint"ler yazılır (her şarkı tamamlandığında
  `updateSongAudioKey` anında).
- Upload tamamen fail olursa `songs.audio_key` NULL kalır; **bu artık bir problem
  değil** çünkü `playable` = `stream_url` varlığına bakıyor.
- Bir cron (`/api/cron/heal-songs`) her 10 dakikada `audio_key NULL` olan şarkıları
  bulup Bunny'ye taşır. Kullanıcı deneyiminde fark yok; maliyet/kalıcılık iyileştirmesi.

---

## 5. Migration Planı

Implementasyon **4 aşamalı**, her aşama tek başına değer üretir ve geri alınabilir.

### Aşama 1 — Görünürlük Düzeltmesi (Hot-fix, <1 gün)

Mevcut sorunu derhal dindiren minimum değişiklik. Yeni mimariye geçmeden uygulanır.

- [ ] `taskStore.ts:229` → `getProcessingTasks` query'sini güncelle:
  ```sql
  WHERE status IN ('processing','failed','complete')
    AND (status != 'complete' OR created_at > NOW() - INTERVAL '24 hours')
    AND created_at > NOW() - INTERVAL '24 hours'
  ```
- [ ] `taskStore.ts:386` → `getAllSongs` query'sinden `audio_key IS NOT NULL` kaldır,
      yerine `(audio_key IS NOT NULL OR stream_url IS NOT NULL OR audio_url IS NOT NULL)`.
- [ ] `create/page.tsx:317` → `playableSongs` filter'ına `stream_url` ekle:
  ```ts
  const playableSongs = (data.songs ?? []).filter(
    (s) => s.audioUrl || s.streamUrl,
  );
  ```
- [ ] `create/page.tsx:322` → `>=` yerine `> 0` kullan, tek şarkı gelince göster,
      ikincisi ayrı eklenebilir.

**Beklenen etki:** Panel "complete" olunca kaybolmuyor; şarkı stream URL ile anında
kütüphanede görünüyor; Bunny gecikmesi UX'i bozmuyor.

### Aşama 2 — Single Feed Endpoint (1-2 gün)

- [ ] `/api/feed` endpoint'ini yaz (scope=me|discover, includeTasks).
- [ ] `useFeed(scope)` SWR hook'u ekle.
- [ ] Create, HomePage, Profile, Library sayfalarını `useFeed`'e taşı.
- [ ] Eski `fetchTasks` interval + `startPolling` loop'unu kaldır.
- [ ] `GlobalProcessingBanner`'ı da `useFeed`'den besle.

**Beklenen etki:** Tek cache, tek polling, tab-consistent state.

### Aşama 3 — State Machine & Schema (2-3 gün)

- [ ] Migration: `tasks.phase`, `tasks.visible_until`, `tasks.user_dismissed_at`,
      `songs.playable` (generated column), yeni index'ler.
- [ ] Backfill script: mevcut `status` → `phase`.
- [ ] Callback, generate, retry, songs endpoint'lerini `phase` kullanacak şekilde
      refactor et.
- [ ] TypeScript types: `TaskPhase` enum, tüm response DTO'ları.
- [ ] Dismiss endpoint: `POST /api/tasks/:id/dismiss`.

**Beklenen etki:** Kod iki status alanını koordine etmek zorunda değil;
terminal state sticky; kullanıcı dismiss kontrolü var.

### Aşama 4 — Observability & Cron Heal (1 gün)

- [ ] `/api/cron/heal-songs` — saatlik, `audio_key IS NULL AND created_at > 1h`
      olanları Bunny'ye taşır (daha önce manuel `admin/heal-songs` vardı).
- [ ] Structured logging: her state transition `[generation] taskId=X from=Y to=Z`.
- [ ] Sentry / Vercel log alerts: 5 dakika üst üste `processing`'de kalanlara uyarı.
- [ ] `docs/GENERATION_RUNBOOK.md` — incident response adımları.

---

## 6. Acceptance Kriterleri

Yeni mimari aşağıdaki test case'leri **geçmelidir**:

| #   | Senaryo                                       | Beklenen                                                                                        |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Generate bas → network normal                 | 3-30sn içinde şarkı Create'te ve Kütüphane'de. Panel, şarkı çalınabilir olana kadar görünür.    |
| 2   | Generate bas → sayfayı 5sn sonra yenile       | Banner aynı durumla geri döner.                                                                 |
| 3   | Generate bas → tab'ı kapat, 2 dakika sonra aç | Şarkı bitmişse kütüphanede; hâlâ çalışıyorsa banner'da.                                         |
| 4   | Callback geldi ama Bunny upload 90sn sürüyor  | Şarkı stream_url ile hemen çalınabilir. Upload bitince sessizce `audio_key` set olur.           |
| 5   | Suno 2 varyant üretir, biri 10sn gecikmeli    | İlk gelen şarkı anında listelenir; ikincisi geldiğinde eklenir. Panel ikisi de bitince kapanır. |
| 6   | Callback hiç gelmez (webhook kaybı)           | Polling 10 dakikada `failed` işaretler. Kullanıcı "Tekrar Dene" görür.                          |
| 7   | Bunny upload tamamen başarısız                | Şarkı yine çalınabilir (stream_url 15 gün), cron heal-songs sonradan Bunny'ye kopyalar.         |
| 8   | Kullanıcı Dismiss basar                       | Banner gider; `user_dismissed_at` set olur; şarkı kütüphanede kalır.                            |
| 9   | Aynı anda 3 farklı task başlat                | Hepsi banner'da ayrı ayrı görünür; her biri bağımsız ilerler.                                   |
| 10  | Error code 533 (sanatçı adı)                  | Anında `failed`, Türkçe mesaj gösterilir.                                                       |

---

## 7. Silinecek / Basitleşecek Kod

Yeni mimari kabul edildiğinde aşağıdakiler kaldırılır:

- `create/page.tsx`: `startPolling`, `pollingRef`, `fetchTasks` interval'i.
- `taskStore.ts`: in-memory `taskStore` Map (Postgres + `playable` ile gerek kalmaz;
  sadece callback'in çok kısa süreli buffer'ı olarak tutulabilir).
- `GlobalProcessingBanner.tsx`: kendi fetch'i yerine `useFeed` kullanır.
- `/api/all-songs`, `/api/songs`, `/api/discover-songs`: deprecate edilip `/api/feed`'e
  yönlendirilir. Tam silme migration sonrası.
- `ProcessingBanner`'daki 180sn stale detection: `phase === 'rendering'` daha
  açıklayıcı olduğu için "takıldı" kurgusu sadeleşir.

---

## 8. Açık Sorular

Implementasyona başlamadan netleşmesi gereken noktalar:

1. **Dismiss davranışı:** Kullanıcı bir `complete` task'ı dismiss edince kütüphanedeki
   şarkı da gizlensin mi? (Önerim: Hayır, sadece banner'dan gider.)
2. **Free plan kısıtı:** `queued` state'i için server-side quota check'i bu
   mimaride nereye yerleşir? (Muhtemelen `POST /api/generate` girişinde, aynı yer.)
3. **SWR mi, TanStack Query mi?** Proje zaten bir şey kullanıyor mu, yoksa yeni
   dependency olarak SWR mi tercih edilir? (SWR bundle'a daha küçük ekler.)
4. **Realtime:** Uzun vadede polling yerine SSE/WebSocket geçişi planlanmalı mı?
   (Aşama 5 olarak "future work" şeklinde bırakılıyor.)

---

## 9. İlgili Dosyalar (Referans Haritası)

| Amaç                           | Dosya                                                           |
| ------------------------------ | --------------------------------------------------------------- |
| Create sayfası UI + polling    | `src/app/create/page.tsx`                                       |
| Inline banner (Create)         | `src/components/ProcessingBanner.tsx`                           |
| Global banner (diğer sayfalar) | `src/components/GlobalProcessingBanner.tsx`                     |
| Generate endpoint              | `src/app/api/generate/route.ts`                                 |
| Suno callback webhook          | `src/app/api/callback/route.ts`                                 |
| Per-task polling endpoint      | `src/app/api/songs/route.ts`                                    |
| Feed endpoint (combined)       | `src/app/api/all-songs/route.ts`                                |
| Task + Song persistence        | `src/lib/taskStore.ts`                                          |
| Suno error mapping             | `src/lib/sunoErrors.ts`                                         |
| Retry endpoint                 | `src/app/api/tasks/[id]/retry/route.ts`                         |
| Heal-songs admin               | `src/app/api/admin/heal-songs/route.ts`                         |
| Player state                   | `src/contexts/PlayerContext.tsx`                                |
| DB schema                      | `prisma/schema.prisma` (+ runtime ensureSchema in taskStore.ts) |

---

**Sonraki adım:** Aşama 1 (Hot-fix) onayı ve uygulanması. Aşama 2-4 ayrı
PR'larda, her biri kendi test suite'iyle.
