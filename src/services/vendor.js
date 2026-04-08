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
// GET - list vendors
// ==============================
export async function fetchVendors({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = `e.businessPartnerCategory.name = 'Vendor'`
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
// Lookup: Business Partner Category by name
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

let _vendorCategoryId = null

// ==============================
// POST - create vendor
// ==============================
export async function createVendor(data) {
  if (!_vendorCategoryId) {
    _vendorCategoryId = await fetchCategoryIdByName('Vendor')
  }
  const payload = {
    data: {
      _entityName: 'BusinessPartner',
      active: data.active ?? true,
      customer: false,
      vendor: true,
      businessPartnerCategory: { id: _vendorCategoryId },
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
  checkActionAllowed(res, 'createVendor')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create vendor: no ID returned from server.')
  return result
}

// ==============================
// PUT - update vendor
// ==============================
export async function updateVendor(id, data) {
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
  checkActionAllowed(res, 'updateVendor')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// DEACTIVATE / ACTIVATE - vendor
// ==============================
export async function deleteVendor(id) {
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
    params: { _startRow: 0, _endRow: 100, _where: `e.salesPriceList = false and e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentMethods() {
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
// BusinessPartnerCategory — Vendor filter
// ==============================
export async function fetchBPCategories() {
  const res = await api.get(BPC_BASE, {
    params: { _startRow: 0, _endRow: 100, _where: `e.active = true and upper(e.name) like upper('%Vendor%')` },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// CONTACTS — ADUser
// ==============================
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
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create contact: no ID returned from server.')
  return result
}

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