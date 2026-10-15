# INVOICE FREE DEL OBRERO

**Invoices in your language. Hecho por un obrero.**
Hecho gratis por Roofs by Hopkins, para el emprendedor.

Free, open-source invoicing app for roofers, siding, gutter crews and every trade.
English / Español. Works on any phone, installs to the home screen, and works offline.

## Features / Funciones
- Invoices and estimates (convert estimate → invoice in one tap), numbering you choose
- Clients with **Choose from contacts** (Android Chrome) or **.vcf import** (iPhone and others)
- **Job site address per project**, with "Open in Maps"
- **All invoices per client**: totals, filters, group by job
- Invoice list with **Unpaid / Paid** tabs, sorting, due-day counter, status badges and running total
- Record full or partial payments (check, Zelle, cash, crypto, …) — balances update automatically
- **Up to 9 job photos** per invoice (location data removed), added to the PDF
- **My wallet / Mi cartera**: Bitcoin, Lightning, Monero (one subaddress per invoice), Ethereum, USDC/USDT (pick the network), Litecoin, Solana, custom coins, Zelle, Cash App, Venmo, PayPal — QR codes on the invoice and PDF. **Non-custodial**: the app never holds money or keys.
- PDF download and share, CSV import from Invoice2go, CSV export, full JSON backup/restore
- Jobs & balances, reports by month and by client

## Privacy / Privacidad
No accounts, no server, no ads, no trackers. Everything is saved **only on the device**
(localStorage + IndexedDB). Use **More → Import & backup → Download full backup** regularly.
The only outside calls: Google Fonts, the cdnjs libraries, and CoinGecko for live crypto prices.

## Publish free with GitHub Pages / Publicar gratis
1. Create a public repository (for example `invoice-free-del-obrero`).
2. Upload every file in this folder: `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`, `README.md`, `LICENSE`.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save.**
4. In 1–2 minutes your app is live at `https://YOUR-USER.github.io/invoice-free-del-obrero/`.
5. Open it in Chrome on your phone → **Install app** (or ⋮ → Add to Home screen).

When you change files, bump `VERSION` in `sw.js` so phones pick up the update.

## License
MIT — free to use, copy and improve. See `LICENSE`.
