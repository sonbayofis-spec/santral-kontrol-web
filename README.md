# Santral Kontrol Defteri (web sürümü)

GitHub Pages üzerinden açılan, Firebase (Firestore + e-posta girişi) ile çalışan saha kontrol uygulaması.

- `index.html` — iki parkın seçim sayfası
- `solaris.html`, `olba.html` — park uygulamaları (TR/RO)
- `adapter.js` — claude.ai veritabanı çağrılarını Firebase'e çevirir, giriş ekranını gösterir
- `firebase-config.js` — Firebase proje ayarları
- `firestore.rules` — park başına erişim kuralları
- `sw.js`, `manifest-*.webmanifest` — ana ekrana ekleme ve çevrimdışı kabuk
