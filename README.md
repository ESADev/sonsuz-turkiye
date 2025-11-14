# Sonsuz Türkiye

## Oyuncular için

Sonsuz Türkiye, Türk internet ve popüler kültürünü merkeze alan bir tarayıcı tabanlı crafting oyunudur. Başlangıçta "Su", "Ateş", "Toprak" ve "Hava" öğeleriyle başlar, yeni öğeleri ortaya çıkarmak için onları tuval üzerinde sürükleyip birleştirirsin. Google Gemini API'si (veya yerleşik simülasyon) her kombinasyon için Türkçe isim, emoji ve kısa açıklama üretir. Keşfettiğin öğeler kenar çubuğunda listelenir, favorilerini sabitleyebilir, dokunarak da kombinasyon yapabilirsin. Yeni öğe ortaya çıktığında küçük bir animasyon ve "İlk Keşif" rozeti görürsün; ilk kez senin ürettiğin kombinasyonlar özel bildirimlerle kutlanır.

Öne çıkan özellikler:

- Türk kültürü ve mizahı öncelikli yapay zekâ yönlendirmesi
- Dokunarak ya da sürükleyip bırakma ile kombinasyon denemeleri
- Güvenli mod anahtarı sayesinde moderasyon seviyesini değiştirme
- Kombinasyon sınırı aşıldığında nazik mola mesajı
- Masaüstü ve mobil tarayıcılar için duyarlı arayüz

## Geliştiriciler için

### Proje yapısı

- `backend/`: FastAPI tabanlı REST API.
  - SQLite veritabanı (SQLModel) ile elementler, kombinasyonlar, oturumlar.
  - Google Gemini entegrasyonu (simülasyon modu dahil), güvenlik filtresi ve loglama.
  - `/api/session`, `/api/elements`, `/api/combine`, `/admin/stats` uç noktaları.
- `frontend/`: Vite + React + TypeScript SPA.
  - Sürükle-bırak tuval, kenar çubuğu, modallar ve ses efektleri.
  - React Query ile veri önbellekleme, LocalStorage ile oturum/pin tutma.

### Başlangıç

1. **Bağımlılıkları yükle**
   ```bash
   # Backend
   python -m pip install -r backend/requirements.txt

   # Frontend
   cd frontend
   npm install
   cd ..
   ```

2. **Konfigürasyon**
   - `backend/.env.example` dosyasını `backend/.env` olarak kopyala ve `GEMINI_API_KEY` değerini doldur.
   - Geliştirme sırasında API anahtarı yoksa servis otomatik simülasyon moduna döner.

3. **Geliştirme sunucularını çalıştır**
   ```bash
   # Backend
   uvicorn app.main:app --reload --app-dir backend

   # Frontend
   cd frontend
   npm run dev
   ```
   Varsayılan portlar: API `http://localhost:8000`, arayüz `http://localhost:5173`.

### Ek notlar

- Veritabanı dosyası otomatik olarak `backend/sonsuz_turkiye.db` olarak oluşturulur.
- Google Gemini çağrılarında hata alınırsa veya içerik güvenli değilse güvenli yedek öğe döner.
- `/admin/stats` uç noktası en popüler öğeler ve kombinasyon çiftleri hakkında JSON döner.
- Ön uç bileşenleri TypeScript ile yazıldı, `npm run build` ile statik üretim yapılabilir.
