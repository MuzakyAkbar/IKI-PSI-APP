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
export async function fetchCustomers({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = `e.businessPartnerCategory.name = 'Customer'`

  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${escaped}%')`
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
let _customerCategoryId = null

// ==============================
// POST - create customer
// ==============================
export async function createCustomer(data) {
  const { paymentTerms, priceList, paymentMethod, currency, ...rest } = data

  if (!_customerCategoryId) {
    _customerCategoryId = await fetchCategoryIdByName('Customer')
  }

  const payload = {
    data: {
      _entityName: 'BusinessPartner',
      active: true,
      customer: true,
      vendor: false,
      employee: false,
      businessPartnerCategory: { id: _customerCategoryId },
      language: 'en_US',
      invoiceTerms: 'I',
      creditStatus: 'O',
      pricesShownInOrder: true,
      paymentOut: true,
      salesInvoice: true,
      salesOrder: true,
      goodsShipment: true,
      purchaseInvoice: true,
      purchaseOrder: true,
      currency: fkWrap(currency) ?? { id: '303' },
      ...rest,
      ...(paymentTerms  && { paymentTerms:  fkWrap(paymentTerms) }),
      ...(priceList     && { priceList:     fkWrap(priceList) }),
      ...(paymentMethod && { paymentMethod: fkWrap(paymentMethod) }),
    },
  }

  const res = await api.post(BASE, payload)
  return res.data?.response?.data ?? res.data
}

// ==============================
// PUT - update customer
// ==============================
export async function updateCustomer(id, data) {
  const { paymentTerms, priceList, paymentMethod, currency, ...rest } = data

  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartner',
      ...rest,
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
// DELETE - deactivate customer
// Openbravo tidak mengizinkan hard delete jika record sudah berelasi
// dengan transaksi/invoice. Gunakan deactivate (active: false).
// ==============================
export async function deleteCustomer(id) {
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartner',
      active: false,
    },
  }
  const res = await api.put(`${BASE}/${id}`, payload)
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
// Lookup: Price List (hanya sales)
// ==============================
export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PriceList', {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `e.salesPriceList = true`,
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