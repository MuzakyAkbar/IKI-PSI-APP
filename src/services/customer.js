import axios from 'axios'

// ==============================
// Runtime Config
// ==============================
const BASE_URL =
  window.APP_CONFIG?.API_BASE_URL || 'http://110.35.83.236:8080/bhmc'

// ==============================
// Basic Auth
// ==============================
const USERNAME = 'api-service'
const PASSWORD = '4dm1n@bhm2025'
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
// POST - create customer
// ==============================
export async function createCustomer(data) {
  const payload = {
    data: {
      _entityName: 'BusinessPartner',
      active: true,
      customer: true,
      vendor: false,
      employee: false,
      businessPartnerCategory: '076902564B5D41AE926FCCC3D110B7C2',
      'businessPartnerCategory$_identifier': 'Customer',
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
      currency: '303',
      ...data,
    },
  }

  const res = await api.post(BASE, payload)
  return res.data?.response?.data ?? res.data
}

// ==============================
// PUT - update customer
// ==============================
export async function updateCustomer(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartner',
      ...data,
    },
  }

  const res = await api.put(`${BASE}/${id}`, payload)
  return res.data?.response?.data ?? res.data
}

// ==============================
// DELETE - delete customer
// ==============================
export async function deleteCustomer(id) {
  const res = await api.delete(`${BASE}/${id}`)
  return res.data
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
