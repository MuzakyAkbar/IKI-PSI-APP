# Customer App — NexERP

Vue 3 + Vite app untuk menampilkan data Customer dari API Openbravo.

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Jalankan dev server
npm run dev
```

Buka: http://localhost:5173/app/

## Struktur

```
src/
├── App.vue              # Main component (list, pagination, search, modal)
├── main.js
├── assets/main.css      # Global styles
└── services/
    └── api.js           # Axios instance + fetchCustomers()
```

## Cara Kerja

- Basic Auth otomatis (username: `api-service`, password: `4dm1n@bhm2025`) di `src/services/api.js`
- Proxy `/bhmc` → `http://110.35.83.236:8080` di `vite.config.js`
- Filter customer: `businessPartnerCategory$_identifier === 'Customer'`
- Search by name dengan debounce 400ms
- Pagination 10 rows per halaman

## Build Production

```bash
npm run build
```
Output di folder `dist/`, base path `/app/`.
