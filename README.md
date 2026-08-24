# Fosionz League — FPL Monthly Tracker

Dashboard buat liga classic FPL **Fosionz League** (League ID `754072`). Nunjukin poin gameweek dikelompokkan per bulan, buat nentuin siapa yang menang hadiah bulanan.

Beda dari versi Claude Artifact sebelumnya: ini situs statis biasa yang di-host di GitHub Pages, dan datanya di-refresh otomatis oleh GitHub Actions (bukan Claude) tiap beberapa jam — jadi nggak tergantung akses/izin akun Claude siapa pun, dan bisa lo cek langsung Actions log-nya kalau ada yang gagal.

## Cara deploy (sekali doang)

1. Buat repo baru di GitHub (public — biar GitHub Pages gratis).
2. Push semua isi folder ini ke repo itu:
   ```bash
   git remote add origin https://github.com/<username>/<nama-repo>.git
   git branch -M main
   git push -u origin main
   ```
3. Buka **Settings → Pages** di repo itu. Di "Build and deployment", pilih Source = **Deploy from a branch**, Branch = `main`, folder = `/ (root)`. Save.
   Setelah ~1 menit, dashboard bisa dibuka di `https://<username>.github.io/<nama-repo>/`.
4. Buka **Settings → Actions → General → Workflow permissions**, pastikan opsinya **"Read and write permissions"**. Ini supaya workflow bisa commit `data.json` yang sudah di-update. (Biasanya ini sudah default, tapi kalau nanti Actions gagal push, cek di sini dulu.)

Selesai. Situsnya sekarang live dan bakal update sendiri.

## Cara kerja auto-update

`.github/workflows/update-data.yml` jalan otomatis tiap 6 jam (bisa diubah di file itu, cron `0 */6 * * *`), atau bisa dipicu manual lewat tab **Actions → Update FPL data → Run workflow**.

Setiap jalan, dia:
1. Menjalankan `scripts/fetch-data.mjs` — narik data terbaru dari API publik FPL (standing liga + riwayat poin tiap manajer + jadwal deadline tiap gameweek).
2. Menulis ulang `data.json`.
3. Kalau ada perubahan, commit & push otomatis — yang otomatis bikin GitHub Pages re-deploy.

`index.html` murni baca `data.json` di folder yang sama, jadi nggak ada masalah CORS (beda dengan kalau halaman coba fetch langsung ke fantasy.premierleague.com dari browser, yang memang diblokir browser karena FPL tidak mengizinkan cross-origin request).

## Ubah jadwal refresh

Edit baris cron di `.github/workflows/update-data.yml`. Contoh: `0 */3 * * *` = tiap 3 jam, `0 6 * * *` = sekali sehari jam 06:00 UTC.

## Ganti liga

Kalau suatu saat mau pakai League ID lain, cukup ubah `LEAGUE_ID` di `scripts/fetch-data.mjs` (baris paling atas), atau set environment variable `LEAGUE_ID` di step workflow-nya.

## Test lokal

```bash
node scripts/fetch-data.mjs   # butuh Node 18+ (pakai fetch bawaan)
npx serve .                    # atau python3 -m http.server, lalu buka localhost
```

Jangan buka `index.html` langsung dari file lokal (`file://`) — browser akan blokir `fetch('./data.json')`. Harus lewat server (lokal atau GitHub Pages).
