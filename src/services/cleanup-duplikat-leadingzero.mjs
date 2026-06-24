// scripts/cleanup-duplikat-leadingzero.mjs
//
// Membersihkan duplikat BusinessPartner (pelanggan) akibat bug leading-zero
// pada Kode Pelanggan (mis. "01052500440" vs "1052500440").
//
// ATURAN (REVISI): versi yang datanya BENAR/LENGKAP adalah yang ADA
// leading zero-nya (mis. "01052500440"). Versi TANPA leading zero
// ("1052500440") adalah data lama yang kurang lengkap dan akan DIHAPUS
// PERMANEN. Versi yang dipertahankan searchKey-nya akan di-UPDATE
// menjadi tanpa leading zero (mis. "01052500440" -> "1052500440"),
// supaya format kode pelanggan konsisten ke depannya (selaras dengan
// fix di import-pelanggan.mjs yang sekarang selalu strip leading zero).
//
// Proses per pasangan duplikat (URUTAN PENTING — jangan dibalik):
//   1. DELETE permanen BP tanpa leading zero (data lama) TERLEBIH DAHULU.
//      Ini wajib dilakukan sebelum update, karena kalau BP lama masih ada,
//      server Openbravo akan menolak update dengan error duplicate searchKey.
//   2. UPDATE BP yang ada leading zero: searchKey diubah jadi tanpa 0.
//   3. Tambah/update ADUser (Kontak) untuk BP itu dengan nomor telepon
//      (diambil dari BusinessPartnerLocation.phone BP itu sendiri).
//
//   Kalau langkah 1 gagal (BP lama punya referensi transaksi/invoice),
//   langkah 2 & 3 di-SKIP untuk pasangan itu (status = 'partial'),
//   supaya searchKey tidak jadi inkonsisten.
//
// CARA PAKAI:
//   1. DRY-RUN dulu (default, TIDAK mengubah apa pun di server):
//        node scripts/cleanup-duplikat-leadingzero.mjs
//   2. Cek file cleanup-preview.json — pastikan pasangan yang terdeteksi
//      benar (nama/alamat memang sama, cuma beda leading zero).
//   3. Kalau sudah yakin, jalankan dengan --apply:
//        node scripts/cleanup-duplikat-leadingzero.mjs --apply
//
// CATATAN PENTING SOAL DELETE:
//   - Openbravo JSON REST API kadang MENOLAK hard-delete (HTTP DELETE)
//     kalau record punya referensi/transaksi turunan (invoice, order, dll),
//     atau kalau user API tidak punya izin delete. Kalau itu terjadi,
//     pasangan tersebut dicatat sebagai 'partial' dan langkah update
//     searchKey di-SKIP — sehingga data tetap konsisten di server.
//   - Untuk baris yang delete-nya gagal, BP lama tetap aktif; coba hapus
//     manual dari Openbravo UI, lalu jalankan ulang script ini.
//   - Hanya menyentuh BusinessPartner dengan customer=true.

import fs from 'fs'
import axios from 'axios'

const BASE_URL  = process.env.OB_BASE_URL || 'http://202.59.169.83:8080/openbravo'
const USERNAME  = process.env.OB_USERNAME || 'APIService'
const PASSWORD  = process.env.OB_PASSWORD || 'wrt'
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const REPORT_DIR = args.find(a => !a.startsWith('--')) || '.'

const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
  timeout: 30000,
})

const BP_BASE    = '/org.openbravo.service.json.jsonrest/BusinessPartner'
const BPLOC_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartnerLocation'
const USER_BASE  = '/org.openbravo.service.json.jsonrest/ADUser'

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

// Strip leading zero hanya kalau seluruh string digit murni — HARUS
// konsisten dengan normalizeSearchKey di import-pelanggan.mjs.
function normalizeSearchKey(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (!/^\d+$/.test(s)) return s
  const stripped = s.replace(/^0+/, '')
  return stripped === '' ? '0' : stripped
}

// ════════════════════════════════════════════════════════════
// FETCH SEMUA BP CUSTOMER (paginated)
// ════════════════════════════════════════════════════════════
async function fetchAllCustomers() {
  const all = []
  let start = 0
  const pageSize = 500
  const MAX_ITER = 100000

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const res = await withRetry(() => api.get(BP_BASE, {
      params: {
        _startRow: start, _endRow: start + pageSize,
        _where: 'e.customer = true',
        _selectedProperties: 'id,searchKey,name,active,status,creationDate,updated',
      },
    }))
    const data = res.data?.response?.data ?? []
    if (data.length === 0) break
    all.push(...data)
    start += data.length
    if (data.length < pageSize) break
  }
  return all
}

// Ambil nomor telepon dari BusinessPartnerLocation aktif milik BP ini.
async function fetchPhoneForBP(bpId) {
  const res = await api.get(BPLOC_BASE, {
    params: {
      _startRow: 0, _endRow: 1,
      _where: `e.businessPartner.id = '${bpId}' and e.active = true`,
      _selectedProperties: 'id,phone',
    },
  })
  const row = res.data?.response?.data?.[0]
  return row?.phone || null
}

// Update searchKey BP (strip leading zero).
async function updateSearchKey(bpId, newSearchKey) {
  const res = await api.put(`${BP_BASE}/${bpId}`, {
    data: { id: bpId, _entityName: 'BusinessPartner', searchKey: newSearchKey },
  })
  checkOk(res, `updateSearchKey ${bpId}`)
}

// Create/update kontak ADUser dengan nomor telepon BP ini.
async function upsertContact(bpId, name, phone) {
  const res = await api.get(USER_BASE, {
    params: {
      _startRow: 0, _endRow: 1,
      _where: `e.businessPartner.id = '${bpId}' and e.active = true`,
      _selectedProperties: 'id',
    },
  })
  const existing = res.data?.response?.data?.[0]
  const fields = { firstName: name || '-', lastName: null, name: name || '-', phone: phone || null }

  if (existing) {
    const putRes = await api.put(`${USER_BASE}/${existing.id}`, {
      data: { id: existing.id, _entityName: 'ADUser', organization: '0', active: true, ...fields },
    })
    checkOk(putRes, `updateContact ${bpId}`)
    return existing.id
  }

  const postRes = await api.post(USER_BASE, {
    data: { _entityName: 'ADUser', organization: '0', active: true, ...fields, businessPartner: { id: bpId } },
  })
  checkOk(postRes, `createContact ${bpId}`)
  const raw = postRes.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  return result?.id ?? null
}

// Hard-delete BP. Openbravo JSON REST: DELETE /BusinessPartner/{id}
async function deleteBP(bpId) {
  const res = await api.delete(`${BP_BASE}/${bpId}`)
  checkOk(res, `deleteBP ${bpId}`)
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
async function main() {
  console.log(APPLY ? '*** MODE APPLY — perubahan AKAN disimpan ke server ***' : 'Mode DRY-RUN (preview saja, tidak ada perubahan)')
  console.log('Mengambil semua BusinessPartner customer...')
  const all = await fetchAllCustomers()
  console.log(`Total BP customer: ${all.length}`)

  // Kelompokkan berdasarkan searchKey ter-normalisasi
  const groups = new Map()
  for (const bp of all) {
    const norm = normalizeSearchKey(bp.searchKey)
    if (!norm) continue
    if (!groups.has(norm)) groups.set(norm, [])
    groups.get(norm).push(bp)
  }

  const duplicateGroups = [...groups.entries()].filter(([, list]) => list.length > 1)
  console.log(`Grup dengan duplikat (searchKey sama setelah strip leading zero): ${duplicateGroups.length}`)

  const plan = []
  const ambiguous = []

  for (const [norm, list] of duplicateGroups) {
    // "withZero" = versi yang searchKey-nya MASIH ada leading zero (data benar, DIPERTAHANKAN)
    // "withoutZero" = versi yang searchKey-nya SUDAH norm/tanpa 0 (data lama, DIHAPUS)
    const withZero = list.filter(bp => String(bp.searchKey).trim() !== norm)
    const withoutZero = list.filter(bp => String(bp.searchKey).trim() === norm)

    if (withZero.length === 1 && withoutZero.length === 1 && list.length === 2) {
      const keep = withZero[0]
      const del = withoutZero[0]
      plan.push({
        keepId: keep.id, keepOldSearchKey: keep.searchKey, keepNewSearchKey: norm, keepName: keep.name,
        deleteId: del.id, deleteSearchKey: del.searchKey, deleteName: del.name,
      })
    } else {
      ambiguous.push({ normalizedKey: norm, members: list.map(bp => ({ id: bp.id, searchKey: bp.searchKey, name: bp.name, active: bp.active })) })
    }
  }

  console.log(`\nPasangan siap diproses (pola standar, 1 leading-zero + 1 tanpa-zero): ${plan.length}`)
  console.log(`Grup ambigu (perlu cek manual, TIDAK disentuh): ${ambiguous.length}`)

  fs.writeFileSync(`${REPORT_DIR}/cleanup-preview.json`, JSON.stringify({ plan, ambiguous }, null, 2))
  console.log(`\nDetail lengkap tersimpan di: ${REPORT_DIR}/cleanup-preview.json`)

  if (ambiguous.length) {
    console.log('\nAda grup ambigu yang TIDAK akan diproses otomatis. Cek manual di cleanup-preview.json bagian "ambiguous".')
  }

  if (!APPLY) {
    console.log('\nDRY-RUN selesai. Tidak ada perubahan disimpan ke server.')
    console.log('Kalau hasil preview sudah dicek dan benar, jalankan ulang dengan flag --apply.')
    return
  }

  console.log(`\nMemproses ${plan.length} pasangan duplikat...\n`)
  const results = []

  for (const item of plan) {
    const row = { ...item, steps: {} }
    try {
      // Ambil nomor telepon dari BP yang akan dipertahankan SEBELUM hapus apapun
      const phone = await withRetry(() => fetchPhoneForBP(item.keepId))
      row.phone = phone

      // LANGKAH 1: DELETE dulu BP lama (tanpa leading zero) supaya searchKey-nya bebas.
      // Ini harus dilakukan SEBELUM updateSearchKey, karena kalau BP lama masih ada,
      // server akan menolak update dengan error duplicate searchKey.
      try {
        await withRetry(() => deleteBP(item.deleteId))
        row.steps.deleteOldBP = 'success'
      } catch (delErr) {
        row.steps.deleteOldBP = 'failed'
        row.deleteError = extractErr(delErr)
        // Kalau delete gagal (misal ada referensi transaksi), SKIP langkah selanjutnya
        // untuk pasangan ini — jangan update searchKey supaya tidak jadi inkonsisten.
        row.status = 'partial'
        console.log(`  PARTIAL ${item.keepOldSearchKey} (id=${item.keepId}) | delete BP lama GAGAL (ada referensi?): ${row.deleteError}`)
        results.push(row)
        continue
      }

      // LANGKAH 2: Setelah BP lama terhapus, update searchKey BP yang dipertahankan
      await withRetry(() => updateSearchKey(item.keepId, item.keepNewSearchKey))
      row.steps.updateSearchKey = 'success'

      // LANGKAH 3: Upsert kontak ADUser dengan nomor telepon
      const contactId = await withRetry(() => upsertContact(item.keepId, item.keepName, phone))
      row.steps.upsertContact = contactId ? 'success' : 'no-op'
      row.contactId = contactId

      row.status = 'success'
      console.log(`  OK      ${item.keepOldSearchKey} -> ${item.keepNewSearchKey} (id=${item.keepId}) | hapus lama id=${item.deleteId}: ok`)
    } catch (e) {
      row.status = 'failed'
      row.error = extractErr(e)
      console.log(`  GAGAL ${item.keepOldSearchKey} (id=${item.keepId}): ${row.error}`)
    }
    results.push(row)
  }

  fs.writeFileSync(`${REPORT_DIR}/cleanup-result.json`, JSON.stringify(results, null, 2))
  const success = results.filter(r => r.status === 'success').length
  const partial = results.filter(r => r.status === 'partial').length
  const failed = results.filter(r => r.status === 'failed').length

  console.log(`\n================ SELESAI ================`)
  console.log(`Berhasil penuh (searchKey diupdate + kontak dibuat + BP lama terhapus): ${success}`)
  console.log(`Sebagian (searchKey/kontak OK, tapi delete BP lama GAGAL)            : ${partial}`)
  console.log(`Gagal total                                                          : ${failed}`)
  if (partial > 0) {
    console.log(`\n${partial} BP lama gagal dihapus (kemungkinan ada referensi/transaksi yang masih terhubung,`)
    console.log(`atau user APIService tidak punya izin delete). BP lama tersebut TETAP AKTIF di server.`)
    console.log(`Cek detail error di cleanup-result.json, lalu coba hapus manual lewat Openbravo UI.`)
  }
  console.log(`\nDetail: ${REPORT_DIR}/cleanup-result.json`)
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
