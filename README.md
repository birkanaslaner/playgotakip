# Cocuk Oyun Alani Takip Yazilimi

Cocuk oyun alanlari icin giris/cikis takibi, sure bazli ucretlendirme (kasa), veli/cocuk uyelik yonetimi, guvenlik (bileklik) ve raporlama saglayan yazilim.

Ortak bir REST API etrafinda calisan web arayuzu (simdi) ve mobil uygulama (sonra) mimarisi kullanir.

## Yapi

- `backend/` : Node.js + Express + TypeScript + Prisma + SQLite REST API
- `web/` : React + Vite + TypeScript + Tailwind web arayuzu
- `mobile/` : (Sonraki asama) React Native / Expo mobil uygulama

## Hizli Baslangic

### 1. Backend

```bash
cd backend
npm install
npm run db:setup   # prisma generate + migrate + seed
npm run dev        # http://localhost:4000
```

Varsayilan yonetici girisi (seed):

- Kullanici adi: `admin`
- Sifre: `admin123`

### 2. Web

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Web arayuzu API'ye `http://localhost:4000` adresinden baglanir (bkz. `web/.env`).

## Ozellikler (Web MVP)

- Personel girisi (JWT)
- Panel: aktif ziyaretler, anlik doluluk, gunluk gelir
- Giris ekrani: veli/cocuk sec veya ekle, bileklik + tarife ile giris
- Cikis / kasa: sureye gore ucret hesaplama ve odeme
- Veli ve cocuk yonetimi
- Tarife yonetimi
- Raporlar: gunluk gelir ve ziyaret gecmisi
