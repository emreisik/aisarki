#!/usr/bin/env node
/**
 * Bunny Storage smoke test.
 * Usage: node scripts/test-bunny.mjs
 *
 * .env.local yüklemek için: node --env-file=.env.local scripts/test-bunny.mjs
 */

const ZONE = process.env.BUNNY_STORAGE_ZONE;
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD;
const HOST = process.env.BUNNY_STORAGE_HOST ?? "storage.bunnycdn.com";
const CDN_URL = (process.env.BUNNY_CDN_URL ?? "").replace(/\/$/, "");

console.log("── Bunny Config ──");
console.log("ZONE     :", ZONE || "❌ MISSING");
console.log("PASSWORD :", PASSWORD ? `${PASSWORD.slice(0, 8)}…` : "❌ MISSING");
console.log("HOST     :", HOST);
console.log("CDN_URL  :", CDN_URL || "❌ MISSING");
console.log("");

if (!ZONE || !PASSWORD || !CDN_URL) {
  console.error("❌ Eksik env değişkenleri. .env.local kontrol et.");
  process.exit(1);
}

// Küçük bir test dosyası oluştur (10KB rastgele data)
const testContent = Buffer.alloc(10 * 1024, 42);
const key = `aisarki/test/smoke-${Date.now()}.bin`;
const putUrl = `https://${HOST}/${ZONE}/${key}`;

console.log(`▶ Upload: ${putUrl}`);
const putRes = await fetch(putUrl, {
  method: "PUT",
  headers: {
    AccessKey: PASSWORD,
    "Content-Type": "application/octet-stream",
  },
  body: testContent,
});

if (!putRes.ok) {
  const text = await putRes.text().catch(() => "");
  console.error(`❌ Upload failed: ${putRes.status}`);
  console.error(text);
  process.exit(1);
}
console.log(`✓ Upload OK (${putRes.status})`);

const cdnUrl = `${CDN_URL}/${key}`;
console.log(`▶ Fetch from CDN: ${cdnUrl}`);
// CDN cache propagation için 1 sn bekle
await new Promise((r) => setTimeout(r, 1000));
const getRes = await fetch(cdnUrl);
if (!getRes.ok) {
  console.error(`❌ CDN fetch failed: ${getRes.status}`);
  console.error("CDN henüz propagate olmamış olabilir — birkaç saniye sonra tekrar dene.");
  process.exit(1);
}
const bytes = await getRes.arrayBuffer();
console.log(`✓ CDN OK — ${bytes.byteLength} byte alındı`);

// Cleanup
const delRes = await fetch(putUrl, {
  method: "DELETE",
  headers: { AccessKey: PASSWORD },
});
console.log(`✓ Cleanup: ${delRes.status}`);

console.log("\n🎉 Bunny Storage çalışıyor!");
