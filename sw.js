// Inspection Performans Paneli — Service Worker v2
// Bu dosyayı panel-v1.html (panel HTML dosyanız) ile AYNI KLASÖRE koyun.
//
// Not: panel-v1.html içindeki registerSW() fonksiyonu önce bu dosyayı
// (aynı klasördeki sw.js) kaydetmeye çalışır. Bu dosya bulunamazsa veya
// kayıt başarısız olursa, sayfa kendi içine gömülü bir "blob" Service
// Worker ile devam eder (tryBlobSW). Bu yüzden bu dosyanın söz dizimi
// HATASIZ olması ve kurulumu (install) hiçbir koşulda BLOKE ETMEMESİ
// gerekir — aksi halde register() reddedilir ve blob'a düşülür.

const CACHE_NAME = 'ip-v4';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        // Service Worker'ın kapsadığı sayfayı (panel HTML) önbelleğe almayı
        // dene. Dosya adı farklı olsa da self.registration.scope üzerinden
        // doğru adres bulunur. Hata olursa kurulumu DURDURMA — sadece yut.
        return cache.add(self.registration.scope).catch(function () {});
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // NETWORK-FIRST: her istekte önce ağdan güncel dosyayı çekmeyi dene.
    // Başarılı olursa cache'i güncelle ve o güncel yanıtı döndür — böylece
    // panel.js/panel.css gibi dosyalar her yeniledinizde ANINDA güncel
    // gelir, "bir sonraki yenilemede geçerli oluyor" gecikmesi yaşanmaz.
    // Ağ erişilemezse (offline vb.) cache'teki en son bilinen sürüme düş.
    fetch(e.request).then(function (resp) {
      if (resp && resp.ok && resp.type === 'basic') {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
      }
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        if (cached) return cached;
        throw new Error('Network error and no cache available');
      });
    })
  );
});
