// src/services/customer.js
import axios from 'axios'

// ==============================
// Runtime Config
// ==============================
const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'

// ==============================
// Basic Auth (sementara, via popup login — TIDAK di-hardcode)
// ==============================
// Username & password tidak lagi ditulis langsung di source code.
// Disimpan sementara di sessionStorage (hilang saat tab ditutup) dan
// di-set ke header axios lewat setAuthCredentials() / clearAuthCredentials().
const SESSION_KEY = 'ob_auth_token'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Pulihkan sesi login sebelumnya (kalau masih ada di tab ini)
const savedToken = sessionStorage.getItem(SESSION_KEY)
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Basic ${savedToken}`
}

/**
 * Set kredensial Basic Auth secara dinamis (dipanggil setelah user
 * mengisi popup login). Token disimpan di sessionStorage saja, bukan
 * di kode sumber.
 */
export function setAuthCredentials(username, password) {
  const tok = btoa(`${username}:${password}`)
  sessionStorage.setItem(SESSION_KEY, tok)
  api.defaults.headers.common['Authorization'] = `Basic ${tok}`
}

/** Cek apakah sudah ada kredensial tersimpan di sesi ini */
export function hasAuthCredentials() {
  return !!sessionStorage.getItem(SESSION_KEY)
}

/** Hapus kredensial (logout) */
export function clearAuthCredentials() {
  sessionStorage.removeItem(SESSION_KEY)
  delete api.defaults.headers.common['Authorization']
}

/**
 * Validasi kredensial dengan memanggil endpoint ringan ke Openbravo.
 * Mengembalikan true/false. Dipakai oleh popup login agar user tahu
 * kalau username/password salah, bukan baru gagal di tengah-tengah halaman.
 */
export async function testAuthCredentials(username, password) {
  const tok = btoa(`${username}:${password}`)
  try {
    await axios.get(`${BASE_URL}org.openbravo.service.json.jsonrest/BusinessPartner`, {
      params: { _noActiveFilter: true, _startRow: 0, _endRow: 0 },
      headers: { Authorization: `Basic ${tok}`, 'Content-Type': 'application/json' },
    })
    return true
  } catch (e) {
    return false
  }
}

// ==============================
// Constants — JSON REST endpoints
// ==============================
const BP_BASE       = '/org.openbravo.service.json.jsonrest/BusinessPartner'
const USER_BASE     = '/org.openbravo.service.json.jsonrest/ADUser'
const LOC_BASE      = '/org.openbravo.service.json.jsonrest/Location'
const BPLOC_REST    = '/org.openbravo.service.json.jsonrest/BusinessPartnerLocation'
const BPC_BASE      = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategory'
const BPC_ACCT_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategoryAccount'

// Helper: wrap FK value as { id } object
const fkWrap = (val) => (val ? { id: val } : undefined)

// Real organization ID from Openbravo
const ORG_ID = 'B3FE20F490CF49989D7250C0D3341603'

// ==============================
// GET - list customers
// ==============================

// Bangun klausa WHERE dari objek filter.
//   filters = {
//     global, searchKey, name, address, phone,   // teks per kolom
//     statuses: ['A','P','S']                     // status terpilih (checkbox)
//   }
// Kode/Nama/Status difilter langsung di entity BusinessPartner (cepat & pasti
// jalan). Alamat/Telepon difilter lewat relasi (BusinessPartnerLocation/Location)
// memakai subquery `exists`.
function buildCustomerWhere(filters = {}) {
  const esc = (v) => String(v).trim().replace(/'/g, "''")
  const like = (field, v) => `upper(${field}) like upper('%${esc(v)}%')`
  const parts = ['e.customer = true']

  // ── STATUS ──────────────────────────────────────────────────
  const all = ['A', 'P', 'S']
  const st = Array.isArray(filters.statuses) ? filters.statuses.filter(s => all.includes(s)) : all
  if (st.length === 0) {
    parts.push('1 = 0') // tidak ada status dicentang -> tidak ada hasil
  } else if (st.length >= all.length) {
    // semua dicentang = tampilan default: aktif + yang Putus (active=false)
    parts.push(`(e.active = true or e.status = 'P')`)
  } else {
    parts.push(`e.status in (${st.map(s => `'${s}'`).join(',')})`)
  }

  // ── TEKS per kolom ──────────────────────────────────────────
  if (filters.global && filters.global.trim()) {
    const s = esc(filters.global)
    parts.push(`(upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`)
  }
  if (filters.searchKey && filters.searchKey.trim()) parts.push(like('e.searchKey', filters.searchKey))
  if (filters.name && filters.name.trim())           parts.push(like('e.name', filters.name))

  // Telepon ada di BusinessPartnerLocation.phone (lihat enrich + import).
  if (filters.phone && filters.phone.trim()) {
    parts.push(`exists (from BusinessPartnerLocation bplP where bplP.businessPartner = e and ${like('bplP.phone', filters.phone)})`)
  }
  // Alamat tersebar di beberapa field Location (lewat BusinessPartnerLocation).
  if (filters.address && filters.address.trim()) {
    const fields = [
      'bplA.locationAddress.addressLine1', 'bplA.locationAddress.cityName',
      'bplA.locationAddress.regionName', 'bplA.locationAddress.postalCode',
      'bplA.locationAddress.district', 'bplA.locationAddress.subdistrict',
    ]
    const ors = fields.map(f => like(f, filters.address)).join(' or ')
    parts.push(`exists (from BusinessPartnerLocation bplA where bplA.businessPartner = e and (${ors}))`)
  }

  return parts.join(' and ')
}

// Field yang BENAR-BENAR dibutuhkan untuk render tabel list (kode, nama, status)
// PLUS field skalar ringan yang dipakai form edit. Tetap eksplisit agar Openbravo
// tidak mengembalikan seluruh kolom + relasi lazy-loaded per baris.
const LIST_SELECTED_PROPERTIES = [
  'id', 'searchKey', 'name', 'description', 'active', 'taxExempt',
  'businessPartnerCategory', 'businessPartnerCategory$_identifier',
  'paymentTerms', 'priceList', 'paymentMethod', 'account', 'creditLimit',
  'diameter', 'meter', 'cycle', 'status',
  'creationDate', 'updated', 'createdBy$_identifier', 'updatedBy$_identifier',
].join(',')

// Ambil SATU halaman data customer saja (tanpa count, tanpa enrich).
// Ini query paling ringan -> dipakai untuk render tabel secepat mungkin.
// `signal` (AbortSignal) memungkinkan request dibatalkan saat user pindah
// halaman cepat-cepat, supaya tidak menumpuk dan bikin terasa "hang".
export async function fetchCustomerPage({
  startRow = 0, pageSize = 20, filters = {}, sortCol = 'searchKey', sortDir = 'asc', signal,
} = {}) {
  // Sort satu kolom saja. Sort dua kolom (mis. name,searchKey) menambah beban
  // sort server di tabel besar tanpa manfaat nyata untuk UI.
  const sortBy = (sortDir === 'desc' ? '-' : '') + sortCol

  const res = await api.get(BP_BASE, {
    params: {
      _startRow: startRow,
      _endRow:   startRow + pageSize,
      _sortBy:   sortBy,
      _where:    buildCustomerWhere(filters),
      _selectedProperties: LIST_SELECTED_PROPERTIES,
    },
    signal,
  })
  const response = res.data?.response ?? res.data
  // totalRows dari respons berjendela dipakai sebagai PREVIEW cepat saja.
  // Pada instance ini nilainya tidak bisa dipercaya (lihat fetchCustomerCount),
  // jadi UI akan mengoreksinya dengan hasil count akurat di latar belakang.
  const previewTotal = typeof response?.totalRows === 'number' ? response.totalRows : null
  return { data: response?.data ?? [], previewTotal }
}

// Hitung total baris secara AKURAT.
//
// Catatan penting: parameter `_onlyCount=true` TIDAK dikenali Openbravo JSON REST
// di instance ini -> server mengabaikannya, mengembalikan satu jendela default,
// dan melaporkan totalRows yang salah (mis. ~160). Itu penyebab pagination
// "mentok di 16". Satu-satunya cara yang terbukti andal (lihat scripts/
// import-pelanggan.mjs -> fetchAllPaged) adalah memecah data per jendela sampai
// jendela terakhir lebih pendek dari ukuran jendela.
//
// Supaya cepat, jendela-jendela ditembak PARALEL per gelombang dan hanya
// mengambil kolom `id` (paling ringan). Untuk ~9.000 baris cukup ~3 gelombang.
// Dipanggil sekali (di-cache di UI) dan non-blocking, jadi tidak menahan tabel.
const COUNT_WINDOW = 500   // terbukti aman di instance ini (import-pelanggan pakai 500)
const COUNT_BATCH  = 8     // jumlah jendela paralel per gelombang
export async function fetchCustomerCount({ filters = {}, signal } = {}) {
  const where = buildCustomerWhere(filters)
  let total = 0
  let base = 0
  let more = true
  let guard = 0
  while (more) {
    const reqs = []
    for (let k = 0; k < COUNT_BATCH; k++) {
      const start = base + k * COUNT_WINDOW
      reqs.push(
        api.get(BP_BASE, {
          params: { _startRow: start, _endRow: start + COUNT_WINDOW, _where: where, _selectedProperties: 'id' },
          signal,
        }).then(r => (r.data?.response?.data?.length ?? 0)).catch(() => 0)
      )
    }
    const counts = await Promise.all(reqs)
    total += counts.reduce((a, b) => a + b, 0)
    // Jika jendela terakhir di gelombang ini masih penuh, mungkin masih ada lagi.
    more = counts[counts.length - 1] === COUNT_WINDOW
    base += COUNT_BATCH * COUNT_WINDOW
    if (++guard > 50) break // pengaman: maksimum ~200.000 baris
  }
  return total
}

// Ambil satu record BusinessPartner lengkap berdasarkan id.
// Dipakai form edit agar tidak bergantung pada hasil enrich list.
export async function fetchCustomerById(id) {
  const res = await api.get(`${BP_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// Backward-compat: pemanggil lama (jika ada) tetap berfungsi.
export async function fetchCustomers({ startRow = 0, pageSize = 20, searchKey = '', sortCol = 'searchKey', sortDir = 'asc', skipCount = false } = {}) {
  const filters = { global: searchKey, statuses: ['A', 'P', 'S'] }
  const { data } = await fetchCustomerPage({ startRow, pageSize, filters, sortCol, sortDir })
  let totalRows
  if (!skipCount) totalRows = await fetchCustomerCount({ filters })
  return { data, totalRows }
}

// ==============================
// Lookup: Business Partner Category
// ==============================
async function fetchCategoryIdByName(name) {
  const res = await api.get(BPC_BASE, {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `upper(e.name) = upper('${name}')`,
    },
  })
  const data = res.data?.response?.data ?? []
  if (!data.length) throw new Error(`Kategori "${name}" tidak ditemukan di server.`)
  return data[0].id
}

let _customerCategoryId = null

function normalizeString(str) {
  if (!str) return '';
  // Ubah ke huruf kecil dan hapus semua karakter selain huruf & angka (solusi untuk spasi & typo minor)
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}


// Helper: Menghitung jarak Levenshtein
function findBestMatch(list, targetName, fieldName) {
  if (!list || list.length === 0) return null;
  const target = targetName.toLowerCase().trim();
  
  let best = list[0];
  let minDistance = Infinity;

  for (const item of list) {
    const current = (item[fieldName] || '').toLowerCase().trim();
    const distance = getLevenshteinDistance(target, current);
    if (distance < minDistance) {
      minDistance = distance;
      best = item;
    }
  }
  return best;
}

// Fungsi inti penghitung kemiripan teks
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
    }
  }
  return matrix[b.length][a.length];
}

// ==============================
// Auto-generate Customer Code
// ==============================
export async function generateCustomerCode(districtName, subdistrictName) {
  if (!districtName || !subdistrictName) return { code: '', officialKec: '', officialKel: '' };

  try {
    const kecWhere = `upper(e.namaKecamatan) = upper('${districtName.replace(/'/g, "''")}')`;
    
    // PERBAIKAN 1: Buat pola fuzzy search dengan mengubah vokal/spasi jadi wildcard '%'
    // Contoh: "SARUA" -> "S%R%" sehingga "SERUA" di Openbravo tetap ikut terambil
    let fuzzySub = subdistrictName.replace(/[aeiouAEIOU\s\-]/g, '%').replace(/%+/g, '%');
    
    // Fallback aman jika nama kelurahan terlalu pendek / isinya vokal semua
    if (fuzzySub === '%' || fuzzySub.length < 2) {
      fuzzySub = subdistrictName.substring(0, 2); 
    }
    
    const kelWhere = `upper(e.namaKelurahan) like upper('%${fuzzySub}%')`;

    const [kecRes, kelRes] = await Promise.all([
      api.get('/org.openbravo.service.json.jsonrest/bhj_format', { params: { _where: kecWhere } }),
      
      // PERBAIKAN 2: Naikkan _endRow menjadi 200 (sebelumnya 50)
      // Karena fuzzy search akan menarik lebih banyak data kasar, kita pastikan data 
      // yang benar tidak terpotong limit sebelum sempat di-filter oleh findBestMatch
      api.get('/org.openbravo.service.json.jsonrest/bhj_formatl', { params: { _where: kelWhere, _endRow: 200 } })
    ]);

    const listKec = kecRes.data?.response?.data || [];
    const listKel = kelRes.data?.response?.data || [];

    const kecMatch = listKec[0];
    
    // Karena listKel sekarang mereturn data hasil fuzzy (termasuk "SERUA"), 
    // findBestMatch milikmu sekarang akan bekerja dengan sempurna untuk auto-koreksi!
    const kelMatch = findBestMatch(listKel, subdistrictName, 'namaKelurahan');

    const kodeKecamatan = kecMatch?.kodeKecamatan || '00';
    const kodeKelurahan = kelMatch?.kodeKelurahan || '00';

    // Ambil nama resmi dari database
    const officialKec = kecMatch?.namaKecamatan || districtName;
    const officialKel = kelMatch?.namaKelurahan || subdistrictName;

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const prefix = `${kodeKecamatan}${kodeKelurahan}${yy}`;

    const res = await api.get(BP_BASE, {
      params: { _startRow: 0, _endRow: 1, _sortBy: '-searchKey', _where: `e.customer = true and e.searchKey like '${prefix}%'` },
    });

    const list = res.data?.response?.data || [];
    let nextSeq = 1;
    if (list.length > 0) {
      const lastCode = list[0].searchKey || '';
      const lastSeq = parseInt(lastCode.substring(prefix.length), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    // Kembalikan objek lengkap
    return {
      code: `${prefix}${String(nextSeq).padStart(5, '0')}`,
      officialKec,
      officialKel
    };
  } catch (error) {
    console.error('Error:', error);
    return { code: '', officialKec: districtName, officialKel: subdistrictName };
  }
}

// ==============================
// POST - create customer
// ==============================
export async function createCustomer(data) {
  if (!_customerCategoryId) {
    _customerCategoryId = await fetchCategoryIdByName('Customer')
  }
  // PERBAIKAN: pakai Golongan (businessPartnerCategory) dari data jika diisi,
  // jika tidak baru fallback ke kategori default "Customer"
  const categoryId = data.businessPartnerCategory || _customerCategoryId
  const payload = {
    data: {
      _entityName: 'BusinessPartner',
      active: data.active ?? true,
      customer: true,
      vendor: false,
      businessPartnerCategory: { id: categoryId },
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      taxExempt: data.taxExempt ?? false,
      creditLimit: data.creditLimit ?? 0,
      currency: fkWrap(data.currency) ?? { id: '303' },
      diameter: data.diameter ?? null,
      meter: data.meter ?? null,
      ...(data.cycle         && { cycle:  data.cycle }),
      ...(data.status        && { status: data.status }),
      ...(data.paymentTerms  && { paymentTerms:  fkWrap(data.paymentTerms) }),
      ...(data.priceList     && { priceList:     fkWrap(data.priceList) }),
      ...(data.paymentMethod && { paymentMethod: fkWrap(data.paymentMethod) }),
      ...(data.account       && { account:       fkWrap(data.account) }),
    },
  }
  const res = await api.post(BP_BASE, payload)
  checkActionAllowed(res, 'createCustomer', 'menyimpan customer')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Gagal menyimpan customer: server tidak mengembalikan ID.')
  return result
}

// ==============================
// PUT - update customer
// ==============================
export async function updateCustomer(id, data) {
  const { paymentTerms, priceList, paymentMethod, account, currency, ...rest } = data
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartner',
      ...rest,
      ...(currency      && { currency:      fkWrap(currency) }),
      ...(paymentTerms  && { paymentTerms:  fkWrap(paymentTerms) }),
      ...(priceList     && { priceList:     fkWrap(priceList) }),
      ...(paymentMethod && { paymentMethod: fkWrap(paymentMethod) }),
      ...(account       && { account:       fkWrap(account) }),
    },
  }
  const res = await api.put(`${BP_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateCustomer', 'memperbarui customer')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

export async function deleteCustomer(id) {
  const payload = { data: { id, _entityName: 'BusinessPartner', active: false } }
  const res = await api.put(`${BP_BASE}/${id}`, payload)
  checkActionAllowed(res, 'deleteCustomer', 'menonaktifkan customer')
  return res.data?.response?.data ?? res.data
}

// ==============================
// Lookups
// ==============================
export async function fetchPaymentTerms() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTerm', { params: { _startRow: 0, _endRow: 100 } })
  return res.data?.response?.data ?? []
}
export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PricingPriceList', { params: { _startRow: 0, _endRow: 100, _where: `e.salesPriceList = true and e.active = true` } })
  return res.data?.response?.data ?? []
}
export async function fetchPaymentMethods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', { params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' } })
  return res.data?.response?.data ?? []
}
export async function fetchFinancialAccounts() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Financial_Account', { params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' } })
  return res.data?.response?.data ?? []
}
export async function fetchBPCategories() {
  const res = await api.get(BPC_BASE, { params: { _startRow: 0, _endRow: 100, _where: 'e.active = true and e.iscust = true', _sortBy: 'creationDate' } })
  return res.data?.response?.data ?? []
}

// Cycle (billing cycle) — daftar nilai dari ADList berdasarkan ad_reference_id
const CYCLE_REFERENCE_ID = '4231CE0A14014B2A9D0D901B0B105A48'
export async function fetchCycleList() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/ADList', {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `e.reference.id = '${CYCLE_REFERENCE_ID}' and e.active = true`,
      _sortBy: 'sequenceNumber',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createBPCategory(data) { /* ... omitted for brevity ... */ }
export async function updateBPCategory(id, data) { /* ... omitted for brevity ... */ }
export async function deleteBPCategory(id) { /* ... omitted for brevity ... */ }

export async function fetchBPCategoryAccounts() {
  const res = await api.get(BPC_ACCT_BASE, { params: { _startRow: 0, _endRow: 200 } })
  return res.data?.response?.data ?? []
}
export async function fetchBPCategoryAccountsByCategory(categoryId) {
  const res = await api.get(BPC_ACCT_BASE, { params: { _startRow: 0, _endRow: 50, _where: `e.businessPartnerCategory.id = '${categoryId}'` } })
  return res.data?.response?.data ?? []
}

export async function createBPCategoryAccount(data) {
  const payload = {
    data: {
      _entityName: 'BusinessPartnerCategoryAccount', organization: '0', active: true,
      businessPartnerCategory: fkWrap(data.businessPartnerCategory), accountingSchema: fkWrap(data.accountingSchema),
      ...(data.customerReceivablesNo && { customerReceivablesNo: fkWrap(data.customerReceivablesNo) }),
      ...(data.customerPrepayment    && { customerPrepayment:    fkWrap(data.customerPrepayment) }),
      ...(data.vendorLiability       && { vendorLiability:       fkWrap(data.vendorLiability) }),
      ...(data.vendorPrepayment      && { vendorPrepayment:      fkWrap(data.vendorPrepayment) }),
      ...(data.writeoff              && { writeoff:              fkWrap(data.writeoff) }),
      ...(data.nonInvoicedReceipts   && { nonInvoicedReceipts:   fkWrap(data.nonInvoicedReceipts) }),
    },
  }
  const res = await api.post(BPC_ACCT_BASE, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function updateBPCategoryAccount(id, data) {
  const payload = {
    data: {
      id, _entityName: 'BusinessPartnerCategoryAccount', organization: '0', active: data.active ?? true,
      businessPartnerCategory: fkWrap(data.businessPartnerCategory), accountingSchema: fkWrap(data.accountingSchema),
      ...(data.customerReceivablesNo && { customerReceivablesNo: fkWrap(data.customerReceivablesNo) }),
      ...(data.customerPrepayment    && { customerPrepayment:    fkWrap(data.customerPrepayment) }),
      ...(data.vendorLiability       && { vendorLiability:       fkWrap(data.vendorLiability) }),
      ...(data.vendorPrepayment      && { vendorPrepayment:      fkWrap(data.vendorPrepayment) }),
      ...(data.writeoff              && { writeoff:              fkWrap(data.writeoff) }),
      ...(data.nonInvoicedReceipts   && { nonInvoicedReceipts:   fkWrap(data.nonInvoicedReceipts) }),
    },
  }
  const res = await api.put(`${BPC_ACCT_BASE}/${id}`, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function deleteBPCategoryAccount(id) {
  const payload = { data: { id, _entityName: 'BusinessPartnerCategoryAccount', active: false } }
  const res = await api.put(`${BPC_ACCT_BASE}/${id}`, payload)
  return res.data?.response?.data ?? res.data
}

export async function fetchGLAccounts(search = '') {
  let where = `e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.value) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue', { params: { _startRow: 0, _endRow: 50, _where: where } })
  return res.data?.response?.data ?? []
}

const ACCT_SCHEMA_ENTITIES = ['FinancialMgmtAcctSchema', 'FinancialMgmtAccountingSchema', 'AcctSchema']
export async function fetchAccountingSchemas() {
  for (const entity of ACCT_SCHEMA_ENTITIES) {
    try {
      const res = await api.get(`/org.openbravo.service.json.jsonrest/${entity}`, { params: { _startRow: 0, _endRow: 50, _where: 'e.active = true' } })
      const data = res.data?.response?.data
      if (Array.isArray(data) && data.length > 0) return data
    } catch (_) { }
  }
  try {
    const res = await api.get(BPC_ACCT_BASE, { params: { _startRow: 0, _endRow: 10 } })
    const rows = res.data?.response?.data ?? []
    const seen = new Map()
    for (const r of rows) {
      const s = r.accountingSchema
      if (s) {
        const id = typeof s === 'object' ? s.id : s
        const name = typeof s === 'object' ? (s.name ?? s.id) : s
        if (id && !seen.has(id)) seen.set(id, { id, name })
      }
    }
    if (seen.size) return [...seen.values()]
  } catch (_) { }
  return []
}

// ==============================
// CONTACT (ADUser)
// ==============================
export async function fetchContacts(businessPartnerId) {
  const res = await api.get(USER_BASE, { params: { _startRow: 0, _endRow: 200, _where: `e.businessPartner.id = '${businessPartnerId}' and e.active = true` } })
  return res.data?.response?.data ?? []
}

export async function fetchContactsForIds(idsInClause, signal, limit = 500) {
  const res = await api.get(USER_BASE, { params: { _startRow: 0, _endRow: limit, _where: `e.businessPartner.id in (${idsInClause}) and e.active = true` }, signal })
  return res.data?.response?.data ?? []
}

export async function createContact(data) {
  const payload = {
    data: {
      _entityName: 'ADUser', organization: '0', active: true,
      firstName: data.firstName, lastName: data.lastName || null, name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null, phone: data.phone || null, alternativePhone: data.alternativePhone || null,
      position: data.position || null, comments: data.comments || null, nik: data.nik || null, nkk: data.nkk || null,
      sim: data.sim || null, passport: data.passport || null, siup: data.siup || null, businessPartner: fkWrap(data.businessPartner),
    },
  }
  const res = await api.post(USER_BASE, payload)
  checkActionAllowed(res, 'createContact', 'menyimpan kontak')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

export async function updateContact(id, data) {
  const payload = {
    data: {
      id, _entityName: 'ADUser', organization: '0',
      firstName: data.firstName, lastName: data.lastName || null, name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null, phone: data.phone || null, alternativePhone: data.alternativePhone || null,
      position: data.position || null, comments: data.comments || null, nik: data.nik || null, nkk: data.nkk || null,
      sim: data.sim || null, passport: data.passport || null, siup: data.siup || null,
    },
  }
  const res = await api.put(`${USER_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateContact', 'memperbarui kontak')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

export async function deleteContact(id) {
  const payload = { data: { id, _entityName: 'ADUser', organization: '0', active: false } }
  const res = await api.put(`${USER_BASE}/${id}`, payload)
  checkActionAllowed(res, 'deleteContact', 'menghapus kontak')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// LOCATION master
// ==============================
export async function fetchLocation(id) {
  const res = await api.get(`${LOC_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// Batch fetch multiple Location records in one request
export async function fetchLocationsByIds(ids, signal) {
  if (!ids || !ids.length) return []
  const where = `e.id in (${ids.map(id => `'${id}'`).join(',')})`
  const res = await api.get(LOC_BASE, { params: { _startRow: 0, _endRow: ids.length + 10, _where: where }, signal })
  return res.data?.response?.data ?? []
}

export async function createLocation(data) {
  const payload = {
    data: {
      _entityName: 'Location', organization: ORG_ID, active: true,
      addressLine1: data.addressLine1, addressLine2: data.addressLine2 || null,
      cityName: data.cityName || null,
      postalCode: data.postalCode ? String(data.postalCode) : null,
      country: data.country || '209',
      region: null,
      regionName: data.province || null,
      district: data.district || null,
      subdistrict: data.subdistrict || null,
      em_idn_province: data.province || null,
      em_idn_district: data.district || null,
      em_idn_subdistrict: data.subdistrict || null,
    },
  }
  const res = await api.post(LOC_BASE, payload)
  checkActionAllowed(res, 'createLocation', 'menyimpan alamat')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Gagal menyimpan alamat: server tidak mengembalikan ID.')
  return result
}

export async function updateLocation(id, data) {
  const payload = {
    data: {
      id, _entityName: 'Location', organization: ORG_ID,
      addressLine1: data.addressLine1, addressLine2: data.addressLine2 || null,
      cityName: data.cityName || null,
      postalCode: data.postalCode ? String(data.postalCode) : null,
      country: data.country || '209',
      region: null,
      regionName: data.province || null,
      district: data.district || null,
      subdistrict: data.subdistrict || null,
      em_idn_province: data.province || null,
      em_idn_district: data.district || null,
      em_idn_subdistrict: data.subdistrict || null,
    },
  }
  const res = await api.put(`${LOC_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateLocation', 'memperbarui alamat')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// BP LOCATION
// ==============================
export async function fetchBPLocations(businessPartnerId) {
  const res = await api.get(BPLOC_REST, { params: { _startRow: 0, _endRow: 200, _where: `e.businessPartner.id = '${businessPartnerId}'` } })
  return res.data?.response?.data ?? []
}

export async function fetchBPLocationsForIds(idsInClause, signal, limit = 500) {
  const res = await api.get(BPLOC_REST, { params: { _startRow: 0, _endRow: limit, _where: `e.businessPartner.id in (${idsInClause}) and e.active = true` }, signal })
  return res.data?.response?.data ?? []
}

export async function createBPLocation(data) {
  const xId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const payload = {
    data: {
      _entityName: 'BusinessPartnerLocation', organization: ORG_ID, active: true,
      name: data.name, phone: data.phone || null, alternativePhone: data.alternativePhone || null, fax: null,
      invoiceToAddress: data.invoiceToAddress ?? true, shipToAddress: data.shipToAddress ?? true,
      payFromAddress: data.payFromAddress ?? true, remitToAddress: data.remitToAddress ?? true, taxLocation: false,
      businessPartner: { id: xId(data.businessPartner) }, locationAddress: { id: xId(data.locationAddress) },
    },
  }
  const res = await api.post(BPLOC_REST, payload)
  checkActionAllowed(res, 'createBPLocation', 'menyimpan lokasi customer')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Gagal menyimpan lokasi customer: server tidak mengembalikan ID.')
  return result
}

export async function updateBPLocation(id, data) {
  const xId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const payload = {
    data: {
      id, _entityName: 'BusinessPartnerLocation', organization: ORG_ID, active: data.active ?? true,
      name: data.name, phone: data.phone || null, alternativePhone: data.alternativePhone || null, fax: null,
      invoiceToAddress: data.invoiceToAddress ?? true, shipToAddress: data.shipToAddress ?? true,
      payFromAddress: data.payFromAddress ?? true, remitToAddress: data.remitToAddress ?? true, taxLocation: false,
      businessPartner: { id: xId(data.businessPartner) }, locationAddress: { id: xId(data.locationAddress) },
    },
  }
  const res = await api.put(`${BPLOC_REST}/${id}`, payload)
  checkActionAllowed(res, 'updateBPLocation', 'memperbarui lokasi customer')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

export async function deleteBPLocation(id, oldRecord = null) {
  const payload = {
    data: {
      id, _entityName: 'BusinessPartnerLocation', organization: ORG_ID, active: false,
      ...(oldRecord ? {
        name: oldRecord.name, phone: oldRecord.phone || null,
        invoiceToAddress: oldRecord.invoiceToAddress, shipToAddress: oldRecord.shipToAddress,
        payFromAddress: oldRecord.payFromAddress, remitToAddress: oldRecord.remitToAddress, taxLocation: oldRecord.taxLocation ?? false,
        businessPartner: (typeof oldRecord.businessPartner === 'object') ? oldRecord.businessPartner.id : oldRecord.businessPartner,
        locationAddress: (typeof oldRecord.locationAddress === 'object') ? oldRecord.locationAddress.id : oldRecord.locationAddress,
      } : {}),
    },
  }
  const res = await api.put(`${BPLOC_REST}/${id}`, payload)
  checkActionAllowed(res, 'deleteBPLocation', 'menghapus lokasi customer')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

function checkActionAllowed(res, label = '', friendlyLabel = '') {
  const response = res.data?.response
  const err = response?.error
  const status = response?.status
  if (err?.message === 'OBUIAPP_ActionNotAllowed') {
    const who = friendlyLabel ? `Gagal ${friendlyLabel}: ` : ''
    throw new Error(`${who}User APIService tidak memiliki izin untuk operasi ini.`)
  }
  if (status !== undefined && status < 0) {
    console.error(`[Openbravo ${label}] error status=${status}`, JSON.stringify(response))
    const detail = err?.message ?? err?.type ?? JSON.stringify(err) ?? 'Unknown error'
    const who = friendlyLabel ? `Gagal ${friendlyLabel}: ` : 'Server error: '
    throw new Error(`${who}${detail}`)
  }
}

api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      console.error('[Openbravo API error body]', JSON.stringify(res.data?.response))
    }
    return res
  },
  (err) => {
    // Request yang sengaja dibatalkan (AbortController) bukan error nyata.
    if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
      return Promise.reject(err)
    }
    console.error('[Openbravo HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)