# Kasir Apotek — sumber aplikasi

Repositori ini menyimpan payload sumber aplikasi dari tabel `public.app_versions` pada proyek Supabase `kasir-apotek`, diambil pada 2026-10-26.

## Isi
- `source-payloads/base-v1.html.gz.b64`: HTML dasar aplikasi yang dikompresi dengan gzip lalu dikodekan Base64.
- `source-payloads/patch-*.json`: perubahan aplikasi berurutan dalam bentuk pasangan penggantian teks (`o` = teks lama, `n` = teks baru).
- `source-payloads/manifest.json`: urutan versi dan metadata sumber.
- `reconstruct.mjs`: menyusun kembali HTML aplikasi dari base dan semua patch secara berurutan.

Tidak disertakan tabel `public.docs` atau `public.backups`; data transaksi dan pasien tidak diunggah. Tinjau konfigurasi dan hasil rekonstruksi sebelum deploy. Jangan menambahkan kata sandi, service-role key, atau data pelanggan ke repositori.

## Menyusun HTML
Gunakan Node.js 18 atau lebih baru:
```sh
node reconstruct.mjs
```
Hasil ditulis ke `dist/index.html`. Skrip menghentikan proses jika suatu penggantian teks tidak cocok tepat satu kali.
