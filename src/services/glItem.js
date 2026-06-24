import axios from 'axios'

const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'
const USERNAME = 'APIService'
const PASSWORD = 'wrt'
const token = btoa(`${USERNAME}:${PASSWORD}`)

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      const msg = res.data?.response?.error?.message
      if (msg) throw new Error(msg)
    }
    return res
  },
  (err) => {
    console.error('[GLItem HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════
export const DEFAULT_ORGANIZATION = 'B3FE20F490CF49989D7250C0D3341603' // XYZ

// ════════════════════════════════════════════════════
// GL ITEM  (C_Glitem → FinancialMgmtGLItem)
//
// Field asli pada entity (lihat dokumentasi API):
//   name, description, enableInCash, enableInFinancialInvoices,
//   taxCategory, tax, withholding
// CATATAN: entity ini TIDAK memiliki kolom "searchKey" — field itu
// sebelumnya salah diasumsikan ada (tidak muncul pada form Openbravo
// asli maupun pada response API), sehingga dihapus dari sini.
// ════════════════════════════════════════════════════
const GL_ITEM_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtGLItem'

export async function fetchAllGLItems({ startRow = 0, pageSize = 20, search = '' } = {}) {
  let where = `e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.description) like upper('%${s}%'))`
  }
  const res = await api.get(GL_ITEM_BASE, {
    params: {
      _startRow: startRow,
      _endRow:   startRow + pageSize,
      _noCount:  false,
      _orderBy:  'e.name asc',
      _where:    where,
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchGLItem(id) {
  const res = await api.get(`${GL_ITEM_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createGLItem(data) {
  const res = await api.post(GL_ITEM_BASE, {
    data: {
      _entityName:               'FinancialMgmtGLItem',
      organization:               data.organization || DEFAULT_ORGANIZATION,
      name:                       data.name,
      description:                data.description || '',
      enableInCash:               !!data.enableInCash,
      enableInFinancialInvoices:  !!data.enableInFinancialInvoices,
      ...(data.taxCategory && { taxCategory: data.taxCategory }),
      active: true,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateGLItem(id, data) {
  const res = await api.put(`${GL_ITEM_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtGLItem',
      ...(data.name                      !== undefined && { name:                      data.name }),
      ...(data.description               !== undefined && { description:               data.description }),
      ...(data.enableInCash              !== undefined && { enableInCash:              !!data.enableInCash }),
      ...(data.enableInFinancialInvoices !== undefined && { enableInFinancialInvoices: !!data.enableInFinancialInvoices }),
      ...(data.taxCategory               !== undefined && { taxCategory:               data.taxCategory || null }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteGLItem(id) {
  const res = await api.put(`${GL_ITEM_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtGLItem', active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// GL ITEM ACCOUNTS  (C_Glitem_Acct → FinancialMgmtGLItemAccounts)
//
// Field asli pada entity (lihat dokumentasi API, perhatikan huruf besar/kecil):
//   gLItem            ← referensi ke G/L Item (BUKAN "glItem")
//   accountingSchema  ← General Ledger, WAJIB diisi
//   glitemDebitAcct   ← BUKAN "glItemDebitAcct"
//   glitemCreditAcct  ← BUKAN "glItemCreditAcct"
// ════════════════════════════════════════════════════
const GL_ACCT_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtGLItemAccounts'

export async function fetchGLItemAccounts(glItemId) {
  const res = await api.get(GL_ACCT_BASE, {
    params: {
      _where:    `e.gLItem.id = '${glItemId}' and e.active = true`,
      _startRow: 0,
      _endRow:   50,
    },
  })
  return res.data?.response?.data ?? []
}

export async function createGLItemAccount(glItemId, data) {
  const res = await api.post(GL_ACCT_BASE, {
    data: {
      _entityName:       'FinancialMgmtGLItemAccounts',
      organization:       data.organization || DEFAULT_ORGANIZATION,
      gLItem:              glItemId,
      accountingSchema:    data.accountingSchema,
      glitemDebitAcct:     data.glitemDebitAcct  || null,
      glitemCreditAcct:    data.glitemCreditAcct || null,
      active: true,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateGLItemAccount(id, data) {
  const res = await api.put(`${GL_ACCT_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtGLItemAccounts',
      ...(data.accountingSchema  !== undefined && { accountingSchema:  data.accountingSchema }),
      ...(data.glitemDebitAcct   !== undefined && { glitemDebitAcct:   data.glitemDebitAcct }),
      ...(data.glitemCreditAcct  !== undefined && { glitemCreditAcct:  data.glitemCreditAcct }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteGLItemAccount(id) {
  const res = await api.put(`${GL_ACCT_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtGLItemAccounts', active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// ACCOUNTING SCHEMA / GENERAL LEDGER  (C_AcctSchema → FinancialMgmtAcctSchema)
// Dipakai untuk memilih "General Ledger" saat menambah baris Akuntansi.
// ════════════════════════════════════════════════════
const ACCT_SCHEMA_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema'

export async function fetchAcctSchemas() {
  const res = await api.get(ACCT_SCHEMA_BASE, {
    params: {
      _where:    'e.active = true',
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// TAX CATEGORY  (C_TaxCategory → FinancialMgmtTaxCategory)
// Dipakai untuk dropdown "Kategori Pajak" pada form G/L Item.
// ════════════════════════════════════════════════════
const TAX_CATEGORY_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtTaxCategory'

export async function fetchTaxCategories() {
  const res = await api.get(TAX_CATEGORY_BASE, {
    params: {
      _where:    'e.active = true',
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// COA SEARCH  (C_ValidCombination → FinancialMgmtAccountingCombination)
// untuk dropdown akun Debit / Kredit
// ════════════════════════════════════════════════════
const COA_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination'

export async function searchAccounts(q) {
  const s = q.trim().replace(/'/g, "''")
  const res = await api.get(COA_BASE, {
    params: {
      // CATATAN: field "description" pada C_ValidCombination hampir selalu kosong.
      // Nama akun yang sebenarnya ada pada relasi e.account (C_ElementValue) → e.account.name.
      _where:    `e.active = true and (upper(e.combination) like upper('%${s}%') or upper(e.account.name) like upper('%${s}%'))`,
      _startRow: 0,
      _endRow:   30,
      _orderBy:  'e.combination asc',
    },
  })
  return res.data?.response?.data ?? []
}