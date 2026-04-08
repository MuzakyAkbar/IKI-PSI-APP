import axios from 'axios'

// ==============================
// Runtime Config
// ==============================
const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'

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

// Real organization ID from Openbravo (confirmed from API response)
const ORG_ID = 'B3FE20F490CF49989D7250C0D3341603'

// ==============================
// GET - list customers
// ==============================
export async function fetchCustomers({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = `e.businessPartnerCategory.name = 'Customer'`
  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${escaped}%') or upper(e.searchKey) like upper('%${escaped}%'))`
  }
  const res = await api.get(BP_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _where: where,
      _noCount: false,
      _sortBy: 'searchKey',
    },
  })
  return res.data?.response ?? res.data
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

// ==============================
// POST - create customer
// ==============================
export async function createCustomer(data) {
  if (!_customerCategoryId) {
    _customerCategoryId = await fetchCategoryIdByName('Customer')
  }
  const payload = {
    data: {
      _entityName: 'BusinessPartner',
      active: data.active ?? true,
      customer: true,
      vendor: false,
      businessPartnerCategory: { id: _customerCategoryId },
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      taxExempt: data.taxExempt ?? false,
      creditLimit: data.creditLimit ?? 0,
      currency: fkWrap(data.currency) ?? { id: '303' },
      ...(data.paymentTerms  && { paymentTerms:  fkWrap(data.paymentTerms) }),
      ...(data.priceList     && { priceList:     fkWrap(data.priceList) }),
      ...(data.paymentMethod && { paymentMethod: fkWrap(data.paymentMethod) }),
      ...(data.account       && { account:       fkWrap(data.account) }),
    },
  }
  const res = await api.post(BP_BASE, payload)
  checkActionAllowed(res, 'createCustomer')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create customer: no ID returned from server.')
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
  checkActionAllowed(res, 'updateCustomer')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// DEACTIVATE - customer
// ==============================
export async function deleteCustomer(id) {
  const payload = { data: { id, _entityName: 'BusinessPartner', active: false } }
  const res = await api.put(`${BP_BASE}/${id}`, payload)
  return res.data?.response?.data ?? res.data
}

// ==============================
// Lookups
// ==============================
export async function fetchPaymentTerms() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTerm', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PricingPriceList', {
    params: { _startRow: 0, _endRow: 100, _where: `e.salesPriceList = true and e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentMethods() {
  // Endpoint menggunakan nama tabel DB: FIN_PaymentMethod (bukan nama entitas Java)
  // Kolom target di BusinessPartner: FIN_Paymentmethod_ID
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchFinancialAccounts() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Financial_Account', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// LINK GL — BusinessPartnerCategory
// ==============================
export async function fetchBPCategories() {
  const res = await api.get(BPC_BASE, {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' },
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
// LINK GL — BusinessPartnerCategoryAccount
// ==============================
export async function fetchBPCategoryAccounts() {
  const res = await api.get(BPC_ACCT_BASE, {
    params: { _startRow: 0, _endRow: 200 },
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
// Lookup: GL Accounts (FinancialMgmtElementValue / AccountingCombination)
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

// Openbravo entity name varies by version — try known variants
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
  // Last resort: extract accountingSchema ID from existing BPCategoryAccount records
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
// CONTACT (ADUser) — GET
// ==============================
export async function fetchContacts(businessPartnerId) {
  const res = await api.get(USER_BASE, {
    params: {
      _startRow: 0,
      _endRow: 200,
      _where: `e.businessPartner.id = '${businessPartnerId}' and e.active = true`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// CONTACT (ADUser) — GET batch for multiple BP ids
// ==============================
export async function fetchContactsForIds(idsInClause) {
  const res = await api.get(USER_BASE, {
    params: {
      _startRow: 0,
      _endRow: 500,
      _where: `e.businessPartner.id in (${idsInClause}) and e.active = true`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// CONTACT — POST (create)
// ==============================
export async function createContact(data) {
  const payload = {
    data: {
      _entityName: 'ADUser',
      organization: '0',
      active: true,
      firstName: data.firstName,
      lastName: data.lastName || null,
      name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      position: data.position || null,
      comments: data.comments || null,
      businessPartner: fkWrap(data.businessPartner),
    },
  }
  const res = await api.post(USER_BASE, payload)
  checkActionAllowed(res, 'createContact')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// CONTACT — PUT (update)
// ==============================
export async function updateContact(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'ADUser',
      organization: '0',
      firstName: data.firstName,
      lastName: data.lastName || null,
      name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      position: data.position || null,
      comments: data.comments || null,
    },
  }
  const res = await api.put(`${USER_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateContact')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// CONTACT — deactivate
// ==============================
export async function deleteContact(id) {
  const payload = {
    data: { id, _entityName: 'ADUser', organization: '0', active: false },
  }
  const res = await api.put(`${USER_BASE}/${id}`, payload)
  checkActionAllowed(res, 'deleteContact')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// LOCATION master — POST
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
  checkActionAllowed(res, 'createLocation')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create location: no ID returned from server.')
  return result
}

// ==============================
// LOCATION master — PUT
// ==============================
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
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// BP LOCATION — GET by businessPartner id
// ==============================
export async function fetchBPLocations(businessPartnerId) {
  const res = await api.get(BPLOC_REST, {
    params: {
      _startRow: 0,
      _endRow: 200,
      _where: `e.businessPartner.id = '${businessPartnerId}'`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// BP LOCATION — GET batch for multiple BP ids
// ==============================
export async function fetchBPLocationsForIds(idsInClause) {
  const res = await api.get(BPLOC_REST, {
    params: {
      _startRow: 0,
      _endRow: 500,
      _where: `e.businessPartner.id in (${idsInClause}) and e.active = true`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// BP LOCATION — POST (create)
// ==============================
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
      taxLocation: false,
      businessPartner: { id: xId(data.businessPartner) },
      locationAddress: { id: xId(data.locationAddress) },
    },
  }
  const res = await api.post(BPLOC_REST, payload)
  checkActionAllowed(res, 'createBPLocation')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create BP location: no ID returned from server.')
  return result
}

// ==============================
// BP LOCATION — PUT (update)
// ==============================
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
      taxLocation: false,
      businessPartner: { id: xId(data.businessPartner) },
      locationAddress: { id: xId(data.locationAddress) },
    },
  }
  const res = await api.put(`${BPLOC_REST}/${id}`, payload)
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// BP LOCATION — deactivate
// ==============================
export async function deleteBPLocation(id, oldRecord = null) {
  const payload = {
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
        businessPartner: (typeof oldRecord.businessPartner === 'object') ? oldRecord.businessPartner.id : oldRecord.businessPartner,
        locationAddress: (typeof oldRecord.locationAddress === 'object') ? oldRecord.locationAddress.id : oldRecord.locationAddress,
      } : {}),
    },
  }
  const res = await api.put(`${BPLOC_REST}/${id}`, payload)
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// Helper: detect errors
// ==============================
function checkActionAllowed(res, label = '') {
  const response = res.data?.response
  const err = response?.error
  const status = response?.status
  if (err?.message === 'OBUIAPP_ActionNotAllowed') {
    throw new Error('User APIService tidak memiliki akses write.')
  }
  if (status !== undefined && status < 0) {
    console.error(`[Openbravo ${label}] error status=${status}`, JSON.stringify(response))
    const detail = err?.message ?? err?.type ?? JSON.stringify(err) ?? 'Unknown error'
    throw new Error(`Server error: ${detail}`)
  }
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