import axios from 'axios'

// ==============================
// Runtime Config
// ==============================
const BASE_URL =
  window.APP_CONFIG?.API_BASE_URL || '/openbravo/'

// ==============================
// Basic Auth
// ==============================
const USERNAME = 'APIService'
const PASSWORD = 'wrt'
const token = btoa(`${USERNAME}:${PASSWORD}`)

// ==============================
// Axios Instance
// ==============================
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  },
})

// ==============================
// Constants
// ==============================
const BASE = '/org.openbravo.service.json.jsonrest/BusinessPartner'
const LOC_BASE = '/org.openbravo.service.json.jsonrest/Location'
const BPLOC_REST = '/org.openbravo.service.json.jsonrest/BusinessPartnerLocation'

// Real organization ID from Openbravo
const ORG_ID = 'B3FE20F490CF49989D7250C0D3341603'

// Helper: wrap FK value as { id } object (Openbravo JSON REST format)
const fkWrap = (val) => (val ? { id: val } : undefined)

// ==============================
// GET - list dengan pagination & search
// ==============================
export async function fetchVendors({ startRow = 0, pageSize = 10, searchKey = '' } = {}) {
  let where = `e.vendor = true`

  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${escaped}%') or upper(e.searchKey) like upper('%${escaped}%'))`
  }

  const res = await api.get(BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _where: where,
      _noCount: false,
    },
  })

  return res.data?.response ?? res.data
}

// ==============================
// Lookup: Business Partner Category by name
// ==============================
async function fetchCategoryIdByName(name) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartnerCategory', {
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

// Cache agar tidak fetch ulang setiap kali create
let _vendorCategoryId = null

// ==============================
// POST - create vendor
// ==============================
export async function createVendor(data) {
  const { paymentTerms, priceList, paymentMethod, currency, phone, city, name2, province, postalCode, contactName, email, linkGL, ...rest } = data

  if (!_vendorCategoryId) {
    _vendorCategoryId = await fetchCategoryIdByName('Vendor')
  }

  const payload = {
    data: {
      _entityName: 'BusinessPartner',
      active: true,
      customer: false,
      vendor: true,
      employee: false,
      businessPartnerCategory: { id: _vendorCategoryId },
      language: 'en_US',
      invoiceTerms: 'I',
      creditStatus: 'O',
      pricesShownInOrder: false,
      paymentOut: false,
      salesInvoice: false,
      salesOrder: false,
      goodsShipment: false,
      purchaseInvoice: true,
      purchaseOrder: true,
      currency: fkWrap(currency) ?? { id: '303' },
      ...rest,
      name2: name2 ?? null,
      ...(phone        && { hp: phone }),
      ...(paymentTerms && { paymentTerms:  fkWrap(paymentTerms) }),
      ...(priceList    && { priceList:     fkWrap(priceList) }),
      ...(paymentMethod && { paymentMethod: fkWrap(paymentMethod) }),
    },
  }

  const res = await api.post(BASE, payload)
  const raw = res.data?.response?.data ?? res.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ==============================
// PUT - update vendor
// ==============================
export async function updateVendor(id, data) {
  const { paymentTerms, priceList, paymentMethod, currency, phone, city, name2, province, postalCode, contactName, email, linkGL, ...rest } = data

  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartner',
      ...rest,
      name2: name2 ?? null,
      hp: phone ?? null,
      ...(currency      && { currency:      fkWrap(currency) }),
      ...(paymentTerms  && { paymentTerms:  fkWrap(paymentTerms) }),
      ...(priceList     && { priceList:     fkWrap(priceList) }),
      ...(paymentMethod && { paymentMethod: fkWrap(paymentMethod) }),
    },
  }

  const res = await api.put(`${BASE}/${id}`, payload)
  const raw = res.data?.response?.data ?? res.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ==============================
// TOGGLE ACTIVE - set vendor active/inactive
// ==============================
export async function toggleVendorActive(id, active) {
  const res = await api.put(`${BASE}/${id}`, {
    data: {
      id,
      _entityName: 'BusinessPartner',
      active,
    },
  })
  return res.data?.response?.data ?? res.data
}

// ==============================
// Lookup: Payment Terms
// ==============================
export async function fetchPaymentTerms() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTerm', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// Lookup: Price List (hanya purchase)
// ==============================
export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PricingPriceList', {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `e.salesPriceList = false`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// Lookup: Payment Method
// ==============================
export async function fetchPaymentMethods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// Constants — Link GL endpoints
// ==============================
const BPC_BASE      = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategory'
const BPC_ACCT_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategoryAccount'

// ==============================
// LINK GL — BusinessPartnerCategory (filter: Vendor)
// ==============================
export async function fetchBPCategories() {
  const res = await api.get(BPC_BASE, {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `e.active = true and upper(e.name) like upper('%Vendor%')`,
    },
  })
  return res.data?.response?.data ?? []
}

export async function createBPCategory(data) {
  const payload = {
    data: {
      _entityName: 'BusinessPartnerCategory',
      organization: '0',
      active: data.active ?? true,
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      default: data.default ?? false,
    },
  }
  const res = await api.post(BPC_BASE, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function updateBPCategory(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartnerCategory',
      organization: '0',
      active: data.active ?? true,
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      default: data.default ?? false,
    },
  }
  const res = await api.put(`${BPC_BASE}/${id}`, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function deleteBPCategory(id) {
  const payload = { data: { id, _entityName: 'BusinessPartnerCategory', active: false } }
  const res = await api.put(`${BPC_BASE}/${id}`, payload)
  return res.data?.response?.data ?? res.data
}

// ==============================
// LINK GL — BusinessPartnerCategoryAccount (filter: Vendor category)
// ==============================
export async function fetchBPCategoryAccounts() {
  const res = await api.get(BPC_ACCT_BASE, {
    params: {
      _startRow: 0,
      _endRow: 200,
      _where: `upper(e.businessPartnerCategory.name) like upper('%Vendor%')`,
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchBPCategoryAccountsByCategory(categoryId) {
  const res = await api.get(BPC_ACCT_BASE, {
    params: {
      _startRow: 0,
      _endRow: 50,
      _where: `e.businessPartnerCategory.id = '${categoryId}'`,
    },
  })
  return res.data?.response?.data ?? []
}

export async function createBPCategoryAccount(data) {
  const payload = {
    data: {
      _entityName: 'BusinessPartnerCategoryAccount',
      organization: '0',
      active: true,
      businessPartnerCategory: fkWrap(data.businessPartnerCategory),
      accountingSchema: fkWrap(data.accountingSchema),
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
      id,
      _entityName: 'BusinessPartnerCategoryAccount',
      organization: '0',
      active: data.active ?? true,
      businessPartnerCategory: fkWrap(data.businessPartnerCategory),
      accountingSchema: fkWrap(data.accountingSchema),
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

// ==============================
// Lookup: GL Accounts (FinancialMgmtElementValue)
// ==============================
export async function fetchGLAccounts(search = '') {
  let where = `e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.value) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue', {
    params: { _startRow: 0, _endRow: 50, _where: where },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// Lookup: Accounting Schemas
// ==============================
const ACCT_SCHEMA_ENTITIES = [
  'FinancialMgmtAcctSchema',
  'FinancialMgmtAccountingSchema',
  'AcctSchema',
]

export async function fetchAccountingSchemas() {
  for (const entity of ACCT_SCHEMA_ENTITIES) {
    try {
      const res = await api.get(`/org.openbravo.service.json.jsonrest/${entity}`, {
        params: { _startRow: 0, _endRow: 50, _where: 'e.active = true' },
      })
      const data = res.data?.response?.data
      if (Array.isArray(data) && data.length > 0) return data
    } catch (_) { /* try next */ }
  }
  // Last resort: extract from existing BPCategoryAccount records
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
  } catch (_) { /* ignore */ }
  return []
}

// ==============================
// LOCATION & BP LOCATION (VENDOR)
// ==============================
export async function createLocation(data) {
  const payload = {
    data: {
      _entityName: 'Location',
      organization: ORG_ID,
      active: true,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      cityName: data.cityName,
      postalCode: data.postalCode || null,
      country: data.country || '209',
      region: null,
    },
  }
  const res = await api.post(LOC_BASE, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function createBPLocation(data) {
  const xId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const payload = {
    data: {
      _entityName: 'BusinessPartnerLocation',
      organization: ORG_ID,
      active: true,
      name: data.name,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      fax: null,
      invoiceToAddress: data.invoiceToAddress ?? true,
      shipToAddress: data.shipToAddress ?? true,
      payFromAddress: data.payFromAddress ?? true,
      remitToAddress: data.remitToAddress ?? true,
      businessPartner: { id: xId(data.businessPartner) },
      locationAddress: { id: xId(data.locationAddress) },
    },
  }
  const res = await api.post(BPLOC_REST, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function updateLocation(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'Location',
      organization: ORG_ID,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      cityName: data.cityName,
      postalCode: data.postalCode || null,
      country: data.country || '209',
      region: null,
    },
  }
  const res = await api.put(`${LOC_BASE}/${id}`, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function updateBPLocation(id, data) {
  const xId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartnerLocation',
      organization: ORG_ID,
      active: data.active ?? true,
      name: data.name,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      fax: null,
      invoiceToAddress: data.invoiceToAddress ?? true,
      shipToAddress: data.shipToAddress ?? true,
      payFromAddress: data.payFromAddress ?? true,
      remitToAddress: data.remitToAddress ?? true,
      businessPartner: { id: xId(data.businessPartner) },
      locationAddress: { id: xId(data.locationAddress) },
    },
  }
  const res = await api.put(`${BPLOC_REST}/${id}`, payload)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

// ==============================
// CONTACT — ADUser
// ==============================
const USER_BASE = '/org.openbravo.service.json.jsonrest/ADUser'

export async function fetchContacts(bpId) {
  const res = await api.get(USER_BASE, {
    params: { _startRow: 0, _endRow: 200, _where: `e.businessPartner.id = '${bpId}' and e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchContactsForIds(idsInClause) {
  const res = await api.get(USER_BASE, {
    params: { _startRow: 0, _endRow: 500, _where: `e.businessPartner.id in (${idsInClause}) and e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function createContact(data) {
  const res = await api.post(USER_BASE, {
    data: {
      _entityName: 'ADUser',
      organization: '0',
      active: true,
      firstName: data.firstName,
      lastName: data.lastName || null,
      name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null,
      phone: data.phone || null,
      position: data.position || null,
      businessPartner: fkWrap(data.businessPartner),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function updateContact(id, data) {
  const res = await api.put(`${USER_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'ADUser',
      organization: '0',
      firstName: data.firstName,
      lastName: data.lastName || null,
      name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null,
      phone: data.phone || null,
      position: data.position || null,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

export async function deleteContact(id) {
  const res = await api.put(`${USER_BASE}/${id}`, {
    data: { id, _entityName: 'ADUser', organization: '0', active: false },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

// ==============================
// BP LOCATION — deactivate
// ==============================
export async function deleteBPLocation(id, oldRecord = null) {
  const xId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const res = await api.put(`${BPLOC_REST}/${id}`, {
    data: {
      id,
      _entityName: 'BusinessPartnerLocation',
      organization: ORG_ID,
      active: false,
      ...(oldRecord ? {
        name: oldRecord.name,
        phone: oldRecord.phone || null,
        invoiceToAddress: oldRecord.invoiceToAddress,
        shipToAddress: oldRecord.shipToAddress,
        payFromAddress: oldRecord.payFromAddress,
        remitToAddress: oldRecord.remitToAddress,
        taxLocation: oldRecord.taxLocation ?? false,
        businessPartner: { id: xId(oldRecord.businessPartner) },
        locationAddress: { id: xId(oldRecord.locationAddress) },
      } : {}),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

// ==============================
// Axios response interceptor
// ==============================
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      console.error('[Openbravo API error body]', JSON.stringify(res.data?.response))
    }
    return res
  },
  (err) => {
    console.error('[Openbravo HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)