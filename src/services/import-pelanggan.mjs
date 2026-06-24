// scripts/import-pelanggan.mjs
//
// Import bulk data pelanggan dari CSV ke Openbravo via JSON REST API.
// Dijalankan terpisah dari aplikasi Vue (Node.js), BUKAN dari browser,
// karena ~10.000 baris akan membuat browser freeze / kena timeout.
//
// CARA PAKAI:
//   1. npm install csv-parse axios
//   2. Sesuaikan KONFIGURASI di bawah (BASE_URL, USERNAME, PASSWORD, ORG_ID)
//   3. node scripts/import-pelanggan.mjs "Sampel_Data_Pelanggan_PITS_Data_Pelanggan_.csv"
//
// CATATAN PENTING:
//   - Kolom "Alokasi" di CSV selalu berisi "Customer" (tidak dipakai, diabaikan).
//   - Kolom "Golongan" dipetakan ke BusinessPartnerCategory (Golongan di UI).
//   - Kolom "Cycle" (mis. "Cycle 7") dipetakan ke kode value ADList (mis. "C7").
//   - Kolom "Status" (AKTIF/PUTUS/SEGEL) dipetakan ke kode A/P/S + flag active.
//   - CSV menggunakan separator TITIK KOMA (;) — bukan koma.
//   - CSV dibaca dengan encoding 'latin1' karena mengandung byte non-UTF8.
//   - Nomor telepon yang berformat scientific notation Excel (mis. 6,28522E+12)
//     akan dikonversi ke string digit penuh secara otomatis.
//   - Strategi UPSERT: GET dulu ke Openbravo per searchKey.
//     Jika ADA  -> UPDATE data yang ada.
//     Jika TIDAK ADA -> CREATE baru.
//     Cara ini robust terhadap kode pelanggan yang tidak cocok antara CSV
//     dan data existing di Openbravo, tanpa harus pre-fetch semua BP.

import fs from 'fs'
import axios from 'axios'
import { parse } from 'csv-parse/sync'

// ════════════════════════════════════════════════════════════
// KONFIGURASI — SESUAIKAN DENGAN ENVIRONMENT ANDA
// ════════════════════════════════════════════════════════════
const BASE_URL  = process.env.OB_BASE_URL || 'http://202.59.169.83:8080/openbravo'
const USERNAME  = process.env.OB_USERNAME || 'APIService'
const PASSWORD  = process.env.OB_PASSWORD || 'wrt'
const ORG_ID    = 'B3FE20F490CF49989D7250C0D3341603'
const CYCLE_REFERENCE_ID = '4231CE0A14014B2A9D0D901B0B105A48'
const CONCURRENCY = 10          // dikurangi sedikit karena setiap baris kini ada GET lookup
const CSV_PATH   = process.argv[2]
const REPORT_DIR = process.argv[3] || '.'

// Default Payment Term / Price List / Payment Method / Account
const DEFAULTS = {
  paymentTerms : 'EA2086B4DC3046ACAED8CF97AADBCFFE', // "15 Days"
  priceList    : '01D7BA2E3F234527B861CBAB12AE0DDE', // "Sales Price IDR"
  paymentMethod: '075FF4E8F87E448F9E4E3828F1E91180', // "Transfer"
  account      : 'A9BD9C3ADFA640FDAD392AECEF0B8C07', // "Receive Bank"
}

const STATUS_MAP = { AKTIF: 'A', PUTUS: 'P', SEGEL: 'S' }

if (!CSV_PATH) {
  console.error('Penggunaan: node scripts/import-pelanggan.mjs <path-csv> [folder-laporan]')
  process.exit(1)
}

// ════════════════════════════════════════════════════════════
// AXIOS / REST CONSTANTS
// ════════════════════════════════════════════════════════════
const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
  timeout: 30000,
})

const BP_BASE     = '/org.openbravo.service.json.jsonrest/BusinessPartner'
const LOC_BASE    = '/org.openbravo.service.json.jsonrest/Location'
const BPLOC_BASE  = '/org.openbravo.service.json.jsonrest/BusinessPartnerLocation'
const BPC_BASE    = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategory'
const ADLIST_BASE = '/org.openbravo.service.json.jsonrest/ADList'

const fkWrap = (v) => (v ? { id: v } : undefined)

function checkOk(res, label) {
  const response = res.data?.response
  const status = response?.status
  if (status !== undefined && status < 0) {
    const err = response?.error
    throw new Error(`[${label}] ${err?.message || JSON.stringify(err) || 'Unknown error'}`)
  }
}

function extractErr(e) {
  const body = e?.response?.data
  const obMsg = body?.response?.error?.message || body?.message
  const status = e?.response?.status
  if (obMsg) return status ? `[HTTP ${status}] ${obMsg}` : obMsg
  return e?.message || String(e)
}

async function withRetry(fn, retries = 2) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try { return await fn() }
    catch (e) { lastErr = e; if (i < retries) await new Promise(r => setTimeout(r, 500 * (i + 1))) }
  }
  throw lastErr
}

// ════════════════════════════════════════════════════════════
// SIMPLE CONCURRENCY POOL
// ════════════════════════════════════════════════════════════
async function runPool(items, limit, worker) {
  let idx = 0
  async function next() {
    const i = idx++
    if (i >= items.length) return
    await worker(items[i], i)
    return next()
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next))
}

// ════════════════════════════════════════════════════════════
// KONVERSI NOMOR TELEPON SCIENTIFIC NOTATION
// Excel kadang export angka panjang (HP) sebagai "6,28522E+12".
// Fungsi ini mengubahnya kembali ke string digit penuh.
// ════════════════════════════════════════════════════════════
function normalizePhone(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null

  // Deteksi format scientific notation dengan koma desimal (Excel Indonesia)
  // Contoh: "6,28522E+12"  atau  "6.28522E+12"
  const sciMatch = s.match(/^(\d+)[,.](\d+)[Ee]\+(\d+)$/)
  if (sciMatch) {
    // Rekonstruksi: gabungkan digit integer + desimal, lalu geser koma
    const intPart  = sciMatch[1]          // "6"
    const fracPart = sciMatch[2]          // "28522"
    const exp      = parseInt(sciMatch[3], 10) // 12
    const full     = intPart + fracPart   // "628522"
    // Jumlah digit yang dibutuhkan setelah titik awal = exp + 1
    const targetLen = exp + 1
    const padded = full.padEnd(targetLen, '0')
    return padded.slice(0, targetLen)
  }

  return s
}

// ════════════════════════════════════════════════════════════
// LOAD CSV
// ════════════════════════════════════════════════════════════
function loadRows() {
  let raw = fs.readFileSync(CSV_PATH, 'latin1')

  // Strip BOM manual kalau ada (UTF-8 BOM = \uFEFF atau byte EF BB BF)
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)

  // PRE-PROCESS: konversi scientific notation Excel di dalam CSV sebelum
  // csv-parse membacanya. Excel kadang menyimpan nomor HP panjang sebagai
  // "6,28522E+12" — koma di sini BUKAN delimiter, tapi akan dibaca sebagai
  // delimiter oleh csv-parse dan memecah baris jadi dua record.
  // Regex ini mencocokkan pola: satu digit, koma/titik, beberapa digit, E+angka
  // yang berada di antara dua titik koma (artinya isi satu field CSV).
  // Contoh: ";6,28522E+12;" -> ";628522000000;"
  raw = raw.replace(/(?<=;)(\d+)[,.](\d+)[Ee]\+(\d+)(?=;)/g, (_, int, frac, exp) => {
    const full = int + frac
    const targetLen = parseInt(exp, 10) + 1
    return full.padEnd(targetLen, '0').slice(0, targetLen)
  })

  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';',
    // JANGAN pakai bom:true — file ini tidak ada BOM dan opsi itu
    // mengacaukan deteksi delimiter sehingga header dibaca sebagai 1 kolom.
  })
}

// ════════════════════════════════════════════════════════════
// FETCH MASTER DATA (paginated)
// ════════════════════════════════════════════════════════════
async function fetchAllPaged(entityBase, where, selectedProperties) {
  const byId = new Map()
  let start = 0
  const pageSize = 500
  const MAX_ITER = 100000

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const res = await withRetry(() => api.get(entityBase, {
      params: {
        _startRow: start, _endRow: start + pageSize, _where: where,
        ...(selectedProperties && { _selectedProperties: selectedProperties }),
      },
    }))
    const resp = res.data?.response ?? {}
    const data = resp.data ?? []

    if (data.length === 0) break

    let added = 0
    let noIdSeq = 0
    for (const row of data) {
      const id = row?.id
      if (id == null) { byId.set(`__noid_${start}_${noIdSeq++}`, row); added++; continue }
      if (!byId.has(id)) { byId.set(id, row); added++ }
    }

    if (added === 0) break
    start += data.length
  }
  return [...byId.values()]
}

async function buildCategoryMap() {
  const cats = await fetchAllPaged(BPC_BASE, 'e.active = true and e.iscust = true')
  const map = new Map()
  let defaultId = null
  for (const c of cats) {
    map.set((c.name || '').trim().toUpperCase(), c.id)
    if (c.default === true && !defaultId) defaultId = c.id
  }
  if (!defaultId && cats.length) defaultId = cats[0].id
  return { map, defaultId }
}

async function buildCycleMap() {
  const list = await fetchAllPaged(ADLIST_BASE, `e.reference.id = '${CYCLE_REFERENCE_ID}' and e.active = true`)
  const map = new Map()
  for (const c of list) map.set((c.name || '').trim().toUpperCase(), c.value ?? c.searchKey)
  return map
}

// ════════════════════════════════════════════════════════════
// LOOKUP BP BY SEARCH KEY (GET per baris — bukan pre-fetch semua)
//
// Kenapa tidak pre-fetch semua BP?
//   - Di lingkungan ini totalRows Openbravo sering under-count, jadi
//     pre-fetch tidak bisa diandalkan untuk tahu semua BP yang sudah ada.
//   - Kode Pelanggan di CSV bisa berbeda format dengan searchKey Openbravo,
//     sehingga exact-match map pre-fetch sering meleset.
//   - GET per-baris (di-cache in-memory) lebih reliable: kalau BP ada
//     di server, PASTI ketemu; kalau tidak ada, PASTI create.
//
// Cache (searchKeyCache) dipakai supaya baris duplikat di CSV tidak
// memicu GET berulang untuk searchKey yang sama.
// ════════════════════════════════════════════════════════════
const searchKeyCache = new Map()   // searchKey.upper -> id | null | 'PENDING'

async function lookupBPBySearchKey(searchKey) {
  const k = String(searchKey).trim().toUpperCase()

  // Tunggu kalau ada worker lain yang sedang lookup key yang sama
  while (searchKeyCache.get(k) === 'PENDING') {
    await new Promise(r => setTimeout(r, 50))
  }

  if (searchKeyCache.has(k)) return searchKeyCache.get(k)

  searchKeyCache.set(k, 'PENDING')
  try {
    const safe = k.replace(/'/g, "''")
    const res = await withRetry(() => api.get(BP_BASE, {
      params: {
        _startRow: 0, _endRow: 1,
        _where: `e.searchKey = '${safe}'`,
        _selectedProperties: 'id,searchKey',
      },
    }))
    const row = res.data?.response?.data?.[0]
    const id = row?.id || null
    searchKeyCache.set(k, id)
    return id
  } catch (e) {
    searchKeyCache.delete(k)   // reset supaya bisa di-retry
    throw e
  }
}

// ════════════════════════════════════════════════════════════
// MAPPING 1 BARIS CSV -> OBJEK SIAP PAKAI
// ════════════════════════════════════════════════════════════
function mapRow(row) {
  const statusRaw = (row['Status'] || '').trim().toUpperCase()
  const statusCode = STATUS_MAP[statusRaw] || null
  const diameterStr = (row['Diameter'] || '').trim()
  const diameterNum = diameterStr && !isNaN(parseFloat(diameterStr)) ? parseFloat(diameterStr) : null

  return {
    searchKey: (row['Kode Pelanggan'] || '').trim(),
    name: (row['Nama Pelanggan'] || '').trim(),
    phone: normalizePhone(row['No Telepon']),         // ← FIX: handle scientific notation
    province: (row['Provinsi'] || '').trim() || null,
    city: (row['Kota/Kabupaten'] || '').trim() || null,
    district: (row['Kecamatan'] || '').trim() || null,
    subdistrict: (row['Desa/Kelurahan'] || '').trim() || null,
    postalCode: (row['Kode Pos'] || '').trim() || null,
    streetAddress: (row['Detail Alamat'] || '').trim() || '-',
    golonganRaw: (row['Golongan'] || '').trim(),
    diameter: diameterNum,
    meter: (row['No Meter'] || '').trim() || null,
    cycleRaw: (row['Cycle'] || '').trim(),
    statusCode,
    active: statusCode === 'P' ? false : true,
  }
}

// ════════════════════════════════════════════════════════════
// CREATE / UPDATE BUSINESS PARTNER
// ════════════════════════════════════════════════════════════
async function createBP(data) {
  const payload = {
    data: {
      _entityName: 'BusinessPartner', organization: ORG_ID, active: data.active,
      customer: true, vendor: false,
      searchKey: data.searchKey, name: data.name,
      currency: { id: '303' },
      diameter: data.diameter, meter: data.meter,
      ...(data.businessPartnerCategory && { businessPartnerCategory: fkWrap(data.businessPartnerCategory) }),
      ...(data.cycle  && { cycle: data.cycle }),
      ...(data.status && { status: data.status }),
      paymentTerms:  fkWrap(data.paymentTerms),
      priceList:     fkWrap(data.priceList),
      paymentMethod: fkWrap(data.paymentMethod),
      account:       fkWrap(data.account),
    },
  }
  const res = await api.post(BP_BASE, payload)
  checkOk(res, `createBP ${data.searchKey}`)
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Server tidak mengembalikan ID saat create BP')
  return result.id
}

async function updateBP(id, data) {
  const payload = {
    data: {
      id, _entityName: 'BusinessPartner', active: data.active,
      customer: true,     // ← pastikan di-set customer=true saat update juga
      name: data.name,
      diameter: data.diameter, meter: data.meter,
      ...(data.businessPartnerCategory && { businessPartnerCategory: fkWrap(data.businessPartnerCategory) }),
      ...(data.cycle  && { cycle: data.cycle }),
      ...(data.status && { status: data.status }),
      paymentTerms:  fkWrap(data.paymentTerms),
      priceList:     fkWrap(data.priceList),
      paymentMethod: fkWrap(data.paymentMethod),
      account:       fkWrap(data.account),
    },
  }
  const res = await api.put(`${BP_BASE}/${id}`, payload)
  checkOk(res, `updateBP ${id}`)
}

// ════════════════════════════════════════════════════════════
// CREATE / UPDATE LOCATION + BUSINESS PARTNER LOCATION
// ════════════════════════════════════════════════════════════
async function upsertLocation(bpId, mapped, isUpdate) {
  const locFields = {
    addressLine1: mapped.streetAddress || '-',
    cityName: mapped.city || '-',
    postalCode: mapped.postalCode || null,
    country: '209',
    regionName: mapped.province || null,
    district: mapped.district || null,
    subdistrict: mapped.subdistrict || null,
    em_idn_province: mapped.province || null,
    em_idn_district: mapped.district || null,
    em_idn_subdistrict: mapped.subdistrict || null,
  }

  if (isUpdate) {
    const res = await api.get(BPLOC_BASE, {
      params: { _startRow: 0, _endRow: 1, _where: `e.businessPartner.id = '${bpId}' and e.active = true` },
    })
    const existing = res.data?.response?.data?.[0]
    if (existing) {
      const locId = typeof existing.locationAddress === 'object' ? existing.locationAddress.id : existing.locationAddress
      await api.put(`${LOC_BASE}/${locId}`, {
        data: { id: locId, _entityName: 'Location', organization: ORG_ID, ...locFields },
      })
      await api.put(`${BPLOC_BASE}/${existing.id}`, {
        data: {
          id: existing.id, _entityName: 'BusinessPartnerLocation', organization: ORG_ID, active: true,
          name: mapped.city || 'Main', phone: mapped.phone,
          invoiceToAddress: true, shipToAddress: true, payFromAddress: true, remitToAddress: true,
          businessPartner: { id: bpId }, locationAddress: { id: locId },
        },
      })
      return
    }
    // BPLocation belum ada -> buat baru
  }

  const locRes = await api.post(LOC_BASE, { data: { _entityName: 'Location', organization: ORG_ID, active: true, ...locFields } })
  checkOk(locRes, `createLocation ${bpId}`)
  const rawLoc = locRes.data?.response?.data
  const locId = (Array.isArray(rawLoc) ? rawLoc[0] : rawLoc)?.id
  if (!locId) throw new Error('Server tidak mengembalikan ID saat create Location')

  const bpLocRes = await api.post(BPLOC_BASE, {
    data: {
      _entityName: 'BusinessPartnerLocation', organization: ORG_ID, active: true,
      name: mapped.city || 'Main', phone: mapped.phone,
      invoiceToAddress: true, shipToAddress: true, payFromAddress: true, remitToAddress: true,
      businessPartner: { id: bpId }, locationAddress: { id: locId },
    },
  })
  checkOk(bpLocRes, `createBPLocation ${bpId}`)
}

// ════════════════════════════════════════════════════════════
// PROSES 1 BARIS
// Strategi UPSERT:
//   1. GET ke Openbravo berdasarkan searchKey
//   2. Kalau ketemu -> UPDATE (BP + Location)
//   3. Kalau tidak  -> CREATE (BP + Location)
// Tidak bergantung pada pre-fetch / peta existing yang bisa tidak lengkap.
// ════════════════════════════════════════════════════════════
async function processRow(mapped, ctx) {
  const { categoryMap, cycleMap, unresolved } = ctx

  // Resolve golongan
  let categoryId = mapped.golonganRaw ? (categoryMap.map.get(mapped.golonganRaw.toUpperCase()) || null) : null
  if (mapped.golonganRaw && !categoryId) unresolved.golongan.add(mapped.golonganRaw)
  if (!categoryId) categoryId = categoryMap.defaultId

  // Resolve cycle
  const cycleCode = mapped.cycleRaw ? (cycleMap.get(mapped.cycleRaw.toUpperCase()) || null) : null
  if (mapped.cycleRaw && !cycleCode) unresolved.cycle.add(mapped.cycleRaw)

  const bpData = {
    searchKey: mapped.searchKey, name: mapped.name, active: mapped.active,
    diameter: mapped.diameter, meter: mapped.meter,
    businessPartnerCategory: categoryId,
    cycle: cycleCode, status: mapped.statusCode,
    ...DEFAULTS,
  }

  // ── UPSERT: GET dulu, lalu create atau update ──
  const existingId = await withRetry(() => lookupBPBySearchKey(mapped.searchKey))

  let bpId, mode
  if (existingId) {
    // BP sudah ada -> UPDATE
    await withRetry(() => updateBP(existingId, bpData))
    bpId = existingId
    mode = 'update'
  } else {
    // BP belum ada -> CREATE
    bpId = await withRetry(() => createBP(bpData))
    // Simpan ke cache supaya baris duplikat di CSV tidak double-create
    searchKeyCache.set(mapped.searchKey.toUpperCase(), bpId)
    mode = 'create'
  }

  await withRetry(() => upsertLocation(bpId, mapped, mode === 'update'))

  return { searchKey: mapped.searchKey, bpId, mode }
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
async function main() {
  console.log('Membaca CSV...')
  const rows = loadRows()
  console.log(`Total baris CSV: ${rows.length}`)

  console.log('Mengambil data master (Golongan, Cycle)...')
  const [categoryMap, cycleMap] = await Promise.all([
    buildCategoryMap(), buildCycleMap(),
  ])
  console.log(`  Golongan master : ${categoryMap.map.size} (default: ${categoryMap.defaultId || 'TIDAK ADA — perlu cek master Golongan!'})`)
  console.log(`  Cycle master    : ${cycleMap.size}`)
  console.log(`\nCATATAN: Lookup existing BP dilakukan per-baris via GET (bukan pre-fetch semua).`)
  console.log(`Ini lebih akurat tapi sedikit lebih lambat — setiap baris cek ke server dulu.\n`)

  const unresolved = { golongan: new Set(), cycle: new Set() }
  const success = []
  const failed = []
  let done = 0

  console.log(`Mulai import dengan concurrency ${CONCURRENCY}...\n`)

  await runPool(rows, CONCURRENCY, async (row) => {
    const mapped = mapRow(row)
    if (!mapped.searchKey) { failed.push({ error: 'Kode Pelanggan kosong', row }); done++; return }
    try {
      const result = await processRow(mapped, { categoryMap, cycleMap, unresolved })
      success.push(result)
    } catch (e) {
      failed.push({ searchKey: mapped.searchKey, error: extractErr(e) })
    } finally {
      done++
      if (done % 200 === 0 || done === rows.length) {
        console.log(`Progres: ${done}/${rows.length}  (sukses: ${success.length}, gagal: ${failed.length})`)
      }
    }
  })

  console.log('\n════════════════ SELESAI ════════════════')
  console.log(`Sukses          : ${success.length}`)
  console.log(`  - create baru : ${success.filter(s => s.mode === 'create').length}`)
  console.log(`  - update      : ${success.filter(s => s.mode === 'update').length}`)
  console.log(`Gagal           : ${failed.length}`)
  console.log(`Golongan tidak dikenali di master: ${[...unresolved.golongan].join(', ') || '-'}`)
  console.log(`Cycle tidak dikenali di master   : ${[...unresolved.cycle].join(', ') || '-'}`)

  if (failed.length) {
    const reasonCount = new Map()
    for (const f of failed) {
      const r = (f.error || 'Unknown').slice(0, 160)
      reasonCount.set(r, (reasonCount.get(r) || 0) + 1)
    }
    const top = [...reasonCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    console.log('\nTop alasan gagal:')
    for (const [reason, count] of top) console.log(`  (${count}x) ${reason}`)
  }

  fs.writeFileSync(`${REPORT_DIR}/import-gagal.json`, JSON.stringify(failed, null, 2))
  fs.writeFileSync(`${REPORT_DIR}/import-sukses.json`, JSON.stringify(success, null, 2))
  console.log(`\nDetail tersimpan di: ${REPORT_DIR}/import-gagal.json dan ${REPORT_DIR}/import-sukses.json`)
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
