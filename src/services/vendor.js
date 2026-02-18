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
  return res.data?.response?.data ?? res.data
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
  return res.data?.response?.data ?? res.data
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
  const res = await api.get('/org.openbravo.service.json.jsonrest/PaymentTerm', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// Lookup: Price List (hanya purchase)
// ==============================
export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PriceList', {
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
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_Method', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// LINK GL - BusinessPartnerGLAccount
// ==============================
const GL_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartnerGLAccount'

export async function fetchVendorLinkGL({ startRow = 0, pageSize = 10, searchKey = '' } = {}) {
  let where = `e.businessPartner.businessPartnerCategory.name = 'Vendor'`

  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.businessPartner.name) like upper('%${escaped}%') or upper(e.businessPartner.searchKey) like upper('%${escaped}%'))`
  }

  const res = await api.get(GL_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _where: where,
      _noCount: false,
    },
  })
  return res.data?.response ?? res.data
}

export async function createVendorLinkGL(data) {
  const { businessPartner, vendorLiability, prePayment, ...rest } = data

  const res = await api.post(GL_BASE, {
    data: {
      _entityName: 'BusinessPartnerGLAccount',
      active: true,
      ...rest,
      ...(businessPartner  && { businessPartner:  fkWrap(businessPartner) }),
      ...(vendorLiability  && { vendorLiability:  fkWrap(vendorLiability) }),
      ...(prePayment       && { prePayment:        fkWrap(prePayment) }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function updateVendorLinkGL(id, data) {
  const { businessPartner, vendorLiability, prePayment, ...rest } = data

  const res = await api.put(`${GL_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'BusinessPartnerGLAccount',
      ...rest,
      ...(businessPartner  && { businessPartner:  fkWrap(businessPartner) }),
      ...(vendorLiability  && { vendorLiability:  fkWrap(vendorLiability) }),
      ...(prePayment       && { prePayment:        fkWrap(prePayment) }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function deleteVendorLinkGL(id) {
  const res = await api.delete(`${GL_BASE}/${id}`)
  return res.data?.response?.data ?? res.data
}

// ==============================
// Lookup: Accounting Combinations (untuk dropdown Vendor Liability & Pre Payment)
// ==============================
export async function fetchAccountingCombinations(searchKey = '') {
  let where = ''
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.combination) like upper('%${e}%') or upper(e.description) like upper('%${e}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
    params: { _startRow: 0, _endRow: 500, ...(where && { _where: where }) },
  })
  return res.data?.response?.data ?? []
}