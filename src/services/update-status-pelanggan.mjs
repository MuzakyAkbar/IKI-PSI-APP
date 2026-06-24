// scripts/update-searchkey-status.mjs
//
// Update field `searchKey` (tambah angka '0' di depan), 
// serta update `status` dan `active` BusinessPartner dari CSV ke Openbravo.
//
// Pemetaan kolom "Status" di CSV (mengabaikan teks dalam kurung):
//   A(...) -> status = 'A', active = true
//   P(...) -> status = 'P', active = false
//   S(...) -> status = 'S', active = true
//
// CARA PAKAI:
//   1. DRY-RUN (default — TIDAK mengubah apapun di server):
//        node scripts/update-searchkey-status.mjs "path/ke/data.csv"
//   2. Cek update-preview.json — pastikan rencana perubahannya benar.
//   3. Kalau sudah yakin, jalankan dengan --apply:
//        node scripts/update-searchkey-status.mjs "path/ke/data.csv" --apply

import fs from 'fs'
import axios from 'axios'
import { parse } from 'csv-parse/sync'

// ════════════════════════════════════════════════════════════
// KONFIGURASI
// ════════════════════════════════════════════════════════════
const BASE_URL = process.env.OB_BASE_URL || 'http://202.59.169.83:8080/openbravo'
const USERNAME = process.env.OB_USERNAME || 'APIService'
const PASSWORD = process.env.OB_PASSWORD || 'wrt'

const args       = process.argv.slice(2)
const CSV_PATH   = args.find(a => !a.startsWith('--'))
const APPLY      = args.includes('--apply')
const REPORT_DIR = '.'
const CONCURRENCY = 10

if (!CSV_PATH) {
  console.error('Penggunaan: node scripts/update-searchkey-status.mjs <path-csv> [--apply]')
  process.exit(1)
}

// ════════════════════════════════════════════════════════════
// AXIOS
// ════════════════════════════════════════════════════════════
const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
  timeout: 30000,
})

const BP_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartner'

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function checkOk(res, label) {
  const response = res.data?.response
  const status   = response?.status
  if (status !== undefined && status < 0) {
    const err = response?.error
    throw new Error(`[${label}] ${err?.message || JSON.stringify(err) || 'Unknown error'}`)
  }
}

function extractErr(e) {
  const body   = e?.response?.data
  const obMsg  = body?.response?.error?.message || body?.message
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

// Parsing status: Ambil huruf pertama (A, P, S), abaikan teks di dalam kurung
function parseStatus(rawStatus) {
  const s = String(rawStatus || '').trim().toUpperCase()
  const firstChar = s.charAt(0)
  
  if (firstChar === 'A') return { status: 'A', active: true }
  if (firstChar === 'P') return { status: 'P', active: false }
  if (firstChar === 'S') return { status: 'S', active: true }
  
  return null // Jika format tidak dikenali
}

// ════════════════════════════════════════════════════════════
// LOOKUP BP BY SEARCH KEY
// ════════════════════════════════════════════════════════════
const searchKeyCache = new Map()

async function lookupBP(searchKey) {
  const k = String(searchKey).toUpperCase()

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
        _where: `e.searchKey = '${safe}' and e.customer = true`,
        _selectedProperties: 'id,searchKey,name,status,active',
      },
    }))
    const row = res.data?.response?.data?.[0]
    const result = row ? { id: row.id, name: row.name, currentSearchKey: row.searchKey, currentStatus: row.status, currentActive: row.active } : null
    searchKeyCache.set(k, result)
    return result
  } catch (e) {
    searchKeyCache.delete(k)
    throw e
  }
}

// ════════════════════════════════════════════════════════════
// UPDATE BP (SearchKey + Status + Active)
// ════════════════════════════════════════════════════════════
async function updateBP(bpId, newSearchKey, newStatus, newActive) {
  const res = await api.put(`${BP_BASE}/${bpId}`, {
    data: { 
      id: bpId, 
      _entityName: 'BusinessPartner', 
      searchKey: newSearchKey,
      status: newStatus, 
      active: newActive 
    },
  })
  checkOk(res, `updateBP ${bpId}`)
}

// ════════════════════════════════════════════════════════════
// LOAD CSV
// ════════════════════════════════════════════════════════════
function loadRows() {
  let raw = fs.readFileSync(CSV_PATH, 'latin1')
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)

  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: ';', // Sesuaikan delimiter jika perlu (koma atau titik koma)
  })
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
async function main() {
  console.log(APPLY
    ? '*** MODE APPLY — perubahan AKAN disimpan ke server ***'
    : 'Mode DRY-RUN (preview saja, tidak ada perubahan)')
  console.log(`CSV: ${CSV_PATH}\n`)

  const rows = loadRows()
  console.log(`Total baris CSV: ${rows.length}`)

  const parsed = []
  const invalidStatus = []

  // Validasi format dari CSV
  for (const row of rows) {
    const rawSearchKey = (row['Kode Pelanggan'] || '').trim()
    const statusRaw    = (row['Status'] || '').trim()
    
    if (!rawSearchKey) continue

    const mapped = parseStatus(statusRaw)

    if (!mapped) {
      invalidStatus.push({ rawSearchKey, statusRaw })
      continue
    }

    // Hitung searchKey baru (tambah 0 di depan jika belum ada)
    const newSearchKey = rawSearchKey.startsWith('0') ? rawSearchKey : `0${rawSearchKey}`

    parsed.push({ 
      lookupKey: rawSearchKey, // Dipakai untuk cari di OB (Sesuai CSV)
      newSearchKey: newSearchKey, 
      statusRaw, 
      ...mapped 
    })
  }

  if (invalidStatus.length) {
    console.warn(`\nPERINGATAN: ${invalidStatus.length} baris dengan nilai Status tidak dikenal (diabaikan):`)
    invalidStatus.slice(0, 10).forEach(r => console.warn(`  Kode=${r.rawSearchKey}  Status="${r.statusRaw}"`))
    if (invalidStatus.length > 10) console.warn(`  ... dan ${invalidStatus.length - 10} lainnya`)
  }

  console.log(`Baris valid untuk diproses: ${parsed.length}\n`)

  console.log('Lookup BP di Openbravo...')
  const plan     = []
  const notFound = []
  let done = 0

  await runPool(parsed, CONCURRENCY, async (item) => {
    try {
      const bp = await withRetry(() => lookupBP(item.lookupKey))
      if (!bp) {
        notFound.push({ lookupKey: item.lookupKey, statusRaw: item.statusRaw, reason: 'not_found' })
      } else {
        const isSearchKeySame = bp.currentSearchKey === item.newSearchKey
        const isStatusSame    = bp.currentStatus === item.status && bp.currentActive === item.active
        
        // Skip kalau tidak ada perubahan sama sekali
        const skip = isSearchKeySame && isStatusSame

        plan.push({
          bpId: bp.id,
          name: bp.name,
          oldSearchKey: bp.currentSearchKey,
          newSearchKey: item.newSearchKey,
          currentStatus: bp.currentStatus,
          currentActive: bp.currentActive,
          newStatus: item.status,
          newActive: item.active,
          skip: skip,
        })
      }
    } catch (e) {
      notFound.push({ lookupKey: item.lookupKey, statusRaw: item.statusRaw, reason: 'error', error: extractErr(e) })
      if (notFound.length <= 3) {
        console.error(`\n  LOOKUP ERROR ${item.lookupKey}: ${extractErr(e)}`)
      }
    } finally {
      done++
      if (done % 500 === 0 || done === parsed.length) {
        process.stdout.write(`\r  Lookup: ${done}/${parsed.length}`)
      }
    }
  })
  console.log()

  const toUpdate  = plan.filter(p => !p.skip)
  const alreadyOk = plan.filter(p => p.skip)

  console.log(`\nHasil lookup:`)
  console.log(`  Perlu diupdate : ${toUpdate.length}`)
  console.log(`  Sudah benar    : ${alreadyOk.length} (data sama persis, tidak akan disentuh)`)
  console.log(`  Tidak ditemukan: ${notFound.length}`)
  
  const notFoundErrors = notFound.filter(n => n.reason === 'error')
  if (notFoundErrors.length) console.log(`    - Error API lookup : ${notFoundErrors.length}`)

  fs.writeFileSync(`${REPORT_DIR}/update-preview.json`, JSON.stringify({ toUpdate, alreadyOk, notFound }, null, 2))
  console.log(`\nPreview tersimpan di: update-preview.json`)

  if (!APPLY) {
    console.log('\nDRY-RUN selesai. Tidak ada perubahan disimpan ke server.')
    console.log('Silakan cek update-preview.json, lalu jalankan ulang dengan flag --apply.')
    return
  }

  // ── APPLY ──
  console.log(`\nMemproses ${toUpdate.length} update...\n`)
  const results  = []
  let successCnt = 0
  let failedCnt  = 0
  let applyDone  = 0

  await runPool(toUpdate, CONCURRENCY, async (item) => {
    try {
      await withRetry(() => updateBP(item.bpId, item.newSearchKey, item.newStatus, item.newActive))
      results.push({ ...item, applyStatus: 'success' })
      successCnt++
    } catch (e) {
      const err = extractErr(e)
      results.push({ ...item, applyStatus: 'failed', error: err })
      failedCnt++
      console.log(`  GAGAL ${item.oldSearchKey} (${item.name}): ${err}`)
    } finally {
      applyDone++
      if (applyDone % 200 === 0 || applyDone === toUpdate.length) {
        process.stdout.write(`\r  Progres: ${applyDone}/${toUpdate.length}  (sukses: ${successCnt}, gagal: ${failedCnt})`)
      }
    }
  })
  console.log()

  fs.writeFileSync(`${REPORT_DIR}/update-result.json`, JSON.stringify(results, null, 2))

  console.log(`\n================ SELESAI ================`)
  console.log(`Berhasil diupdate : ${successCnt}`)
  console.log(`Gagal             : ${failedCnt}`)
  console.log(`Tidak ditemukan   : ${notFound.length}`)
  console.log(`\nDetail lengkap: update-result.json`)
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })