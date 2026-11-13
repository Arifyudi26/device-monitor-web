# Device Monitor — Web Dashboard

Dashboard web untuk memantau dan mengontrol perangkat Android dari jarak jauh secara realtime. Pasangan dari aplikasi [device-monitor](https://github.com/Arifyudi26/device-monitor) (Expo/React Native).

---

## Fitur

- **Realtime monitoring** — baterai, status app (foreground/background), jaringan, dan lokasi GPS via SSE (Server-Sent Events)
- **Remote command** — trigger dari web langsung ke HP: ambil kontak, SMS, call log, foto, video
- **Device pairing** — hubungkan HP ke akun dengan kode 4 digit yang tampil di APK, tanpa perlu memegang HP setelahnya
- **Multi-device** — satu akun bisa terhubung ke lebih dari satu perangkat
- **Event log** — riwayat semua aktivitas device tersimpan di database dengan filter dan pagination
- **Auth** — login dengan email/password, Google OAuth, Facebook OAuth, atau OTP email

---

## Cara Pairing HP

1. Install APK device-monitor di HP target
2. Buka APK → lihat **kode 4 digit** di halaman Dashboard atau Settings
3. Login ke web dashboard → buka halaman **Monitor** → klik **+ Add**
4. Masukkan kode 4 digit → HP langsung terhubung
5. Selesai — pantau dan kontrol HP dari web kapan saja

---

## Jalankan di Local

```bash
# 1. Clone & install
git clone https://github.com/Arifyudi26/device-monitor-web
cd device-monitor-web
yarn install

# 2. Buat file .env
cp .env.example .env
# Edit .env (lihat bagian Environment Variables)

# 3. Setup database
npx prisma migrate dev --name init

# 4. Jalankan dev server
yarn dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```env
# Database (PostgreSQL — Neon atau lainnya)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT & NextAuth
JWT_SECRET="random_string_minimal_32_karakter"
NEXTAUTH_SECRET="random_string_minimal_32_karakter"

# Google OAuth (opsional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Facebook OAuth (opsional)
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# SMTP — kirim OTP email (opsional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

Generate secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## API Endpoints

### Device (dari APK — tidak butuh auth)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `GET` | `/api/devices` | List semua device |
| `POST` | `/api/events` | Terima batch event dari HP |
| `POST` | `/api/realtime` | HP push realtime state (baterai, app state) |
| `GET` | `/api/realtime` | SSE stream — web subscribe realtime state |
| `GET` | `/api/commands` | HP polling command pending |
| `POST` | `/api/commands` | Web kirim command ke HP |
| `PATCH` | `/api/commands` | HP update status command + hasil |

### Auth & Pairing (butuh JWT user)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `POST` | `/api/devices/link` | Link device ke akun via kode 4 digit |
| `POST` | `/api/auth/login` | Login email/password |
| `POST` | `/api/auth/register` | Register akun baru |
| `POST` | `/api/auth/send-otp` | Kirim OTP ke email |
| `POST` | `/api/auth/verify-otp` | Verifikasi OTP |

### Remote Commands

Command yang bisa dikirim dari web ke HP:

| Command | Fungsi |
|---------|--------|
| `fetch_contacts` | Ambil daftar kontak HP |
| `fetch_sms` | Ambil riwayat SMS *(butuh native module)* |
| `fetch_calls` | Ambil call log *(butuh native module)* |
| `take_photo` | Trigger kamera foto |
| `take_video` | Trigger kamera video |

---

## Tech Stack

Next.js 15 · TypeScript · PostgreSQL (Neon) · Prisma 6 · JWT + NextAuth v4 · Zustand · Tailwind CSS · SSE (Server-Sent Events)

---

## Scripts

```bash
yarn dev      # development server
yarn build    # production build
yarn start    # production server
yarn lint     # ESLint
```

---

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan semua env vars di Vercel dashboard
4. Jalankan migration database:
   ```bash
   npx prisma migrate deploy
   ```
5. Set `EXPO_PUBLIC_API_URL` di APK ke URL production Vercel

---

## Skema Database

```
User          — akun pengguna web
Device        — perangkat Android yang terdaftar (relasi ke User)
DeviceEvent   — log aktivitas device (battery, network, location, dll)
DeviceCommand — antrian perintah dari web ke HP
OtpCode       — kode OTP untuk verifikasi email
```

Field realtime di `Device` (`batteryLevel`, `batteryState`, `appState`) di-update langsung via `POST /api/realtime` tanpa disimpan sebagai event log.

---

## Update Prisma / Database

Lakukan langkah-langkah berikut setiap kali ada perubahan pada `prisma/schema.prisma` (tambah model, ubah field, hapus relasi, dll).

### Development (local)

```bash
# 1. Buat migration baru dari perubahan schema
npx prisma migrate dev --name <nama_perubahan>
# Contoh:
npx prisma migrate dev --name add_user_role

# 2. Regenerate Prisma Client agar tipe TypeScript ikut update
npx prisma generate
```

> `migrate dev` otomatis menjalankan `prisma generate` di akhir, tapi menjalankan keduanya secara eksplisit lebih aman.

### Production / Vercel

```bash
# Jalankan migration yang sudah ada ke database production
npx prisma migrate deploy

# Regenerate client (biasanya sudah dijalankan saat build)
npx prisma generate
```

> Di Vercel, tambahkan `npx prisma generate` ke build command:
> ```
> npx prisma generate && next build
> ```

### Prototyping cepat (tanpa migration file)

Kalau sedang eksperimen dan belum perlu migration history:

```bash
# Push schema langsung ke database (tidak membuat file migration)
npx prisma db push

# Regenerate Prisma Client
npx prisma generate
```

> ⚠️ Jangan gunakan `db push` di production — tidak ada rollback dan tidak tercatat di migration history.

### Urutan yang benar

```
Edit schema.prisma
       ↓
npx prisma migrate dev    ← dev (buat + apply migration)
npx prisma migrate deploy ← production (apply migration yang ada)
       ↓
npx prisma generate       ← update Prisma Client
       ↓
Restart dev server (yarn dev)
```

### Prisma Studio — lihat & edit data langsung

```bash
npx prisma studio
```

Buka di [http://localhost:5555](http://localhost:5555)
