# Dashboard Kritikalitas & Risiko Partner — BRIAPI 2026

Web dashboard lokal untuk data partner dari sheet **Data Dummy** di file
`BRIAPI 2026 - Data Kuadran Patner.xlsx`. Spesifikasi lengkap: [../REQUIREMENTS.md](../REQUIREMENTS.md).

## Menjalankan (Windows)

Butuh Node.js 20+ (sudah terpasang: v22).

```powershell
cd "C:\Users\Haikal\Downloads\Magang BRI\Web Dashboard\web-dashboard"
npm install      # sekali saja
npm run dev      # buka http://127.0.0.1:5173
```

Hentikan server dengan `Ctrl+C` di terminal.

> Jangan membuka `dist/index.html` langsung dari Explorer — halaman tidak akan jalan lewat
> `file://`. Selalu pakai `npm run dev` (atau `npm run build` lalu `npm run preview`).

## Cara pakai

1. Buka menu **Input Data** → tarik & lepas file `.xlsx` (atau klik untuk memilih file).
2. Cek ringkasan: jumlah partner, peringatan validasi, dan "Cek hasil hitung vs Excel".
3. Klik **Lihat Dashboard**.

Data terakhir disimpan di browser, jadi dashboard tetap tampil setelah refresh. Untuk mengganti
data, upload file baru di Input Data (atau klik **Hapus data**). File hanya diproses di browser
dan tidak dikirim ke mana pun.

Di Dashboard:
- Filter di bagian atas (kuadran, kelompok, level, profil, skor, nama) berlaku untuk semua angka.
- Klik bar/irisan grafik untuk memfilter; klik lagi untuk melepas.
- Klik baris tabel atau bar Top 10/Pareto untuk melihat detail partner.
- **Ekspor ke Excel** mengunduh daftar partner sesuai filter aktif.

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm test` | Unit test: angka dashboard dicocokkan dengan dashboard Excel |
| `npm run build` | Build produksi ke folder `dist/` |
| `npm run preview` | Menjalankan hasil build |

## Deploy ke GitHub Pages

Repo cukup berisi folder `web-dashboard` ini saja (file Excel sudah dikecualikan lewat `.gitignore`).

1. Buat repo baru di GitHub (mis. `briapi-dashboard`), lalu dari folder ini:
   ```powershell
   git init -b main
   git add .
   git commit -m "Dashboard partner BRIAPI"
   git remote add origin https://github.com/<username>/briapi-dashboard.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Buka tab **Actions** — workflow `Deploy ke GitHub Pages` berjalan otomatis (± 1–2 menit).
   Setelah hijau, situs ada di `https://<username>.github.io/briapi-dashboard/`.

Setiap `git push` ke `main` akan men-deploy ulang otomatis. Nama repo bebas — aset memakai
path relatif dan routing memakai hash (`/#/input`), jadi tidak ada yang perlu diubah di kode.

## Struktur

```
src/
├─ logic/        aturan bisnis (rules.ts), agregasi, pembaca Excel, filter, format angka + test
├─ state/        penyimpanan dataset (localStorage)
├─ components/   Header, grafik (charts.ts + EChart), FilterBar, PartnerTable, PartnerDetail
├─ pages/        InputPage (upload), DashboardPage
└─ theme.ts      warna (kuadran, kelompok, level, profil)
```

Ambang & pita klasifikasi dibaca dari sheet **Parameter Dummy**; jika tidak ada, dipakai nilai
default di `src/logic/rules.ts`.
