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

const fkWrap = (val) => (val ? { id: val } : undefined)

// ════════════════════════════════════════════════════
// ORDER (Purchase Order Header)
// ════════════════════════════════════════════════════
const ORDER_BASE = '/org.openbravo.service.json.jsonrest/Order'

// Purchase Order transaction document ID
const PURCHASE_ORDER_DOCTYPE_ID = '53F55A814CA045AE9561B7E247FF9569'

export async function fetchAllOrders({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = `e.transactionDocument.id = '${PURCHASE_ORDER_DOCTYPE_ID}'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  const res = await api.get(ORDER_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _noCount: false,
      _orderBy: 'e.creationDate desc',
      _where: where,
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchOrder(id) {
  const res = await api.get(`${ORDER_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createOrder(data) {
  const payload = buildOrderPayload(data)
  const res = await api.post(ORDER_BASE, { data: { _entityName: 'Order', ...payload } })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateOrder(id, data) {
  const payload = buildOrderPayload(data)
  const res = await api.put(`${ORDER_BASE}/${id}`, { data: { id, _entityName: 'Order', ...payload } })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteOrder(id) {
  const ex = await api.get(`${ORDER_BASE}/${id}`)
  const r = (ex.data?.response?.data ?? [])[0] ?? {}
  const res = await api.put(`${ORDER_BASE}/${id}`, {
    data: { id, _entityName: 'Order', active: false, documentNo: r.documentNo },
  })
  return res.data?.response?.data ?? res.data
}

function buildOrderPayload(data) {
  const {
    businessPartner, partnerAddress, warehouse, transactionDocument,
    paymentTerms, paymentMethod, invoiceTerm, orderDate, scheduledDeliveryDate,
    orderReference, salesRepresentative, description, invoiceAddress, deliveryLocation,
    organization, documentNo, priceList,
  } = data

  return {
    documentType: { id: '0' },
    currency: { id: '303' },
    salesTransaction: false, // Purchase Order
    ...(documentNo            && { documentNo }),
    ...(businessPartner       && { businessPartner:      fkWrap(businessPartner) }),
    ...(partnerAddress        && { partnerAddress:       fkWrap(partnerAddress) }),
    ...(warehouse             && { warehouse:            fkWrap(warehouse) }),
    transactionDocument:       fkWrap(transactionDocument || PURCHASE_ORDER_DOCTYPE_ID),
    ...(paymentTerms          && { paymentTerms:         fkWrap(paymentTerms) }),
    ...(paymentMethod         && { paymentMethod:        fkWrap(paymentMethod) }),
    ...(invoiceTerm           && { invoiceTerms:         invoiceTerm }),
    ...(orderDate             && { orderDate, accountingDate: orderDate }),
    ...(scheduledDeliveryDate && { scheduledDeliveryDate }),
    ...(orderReference        && { orderReference }),
    ...(salesRepresentative   && { salesRepresentative:  fkWrap(salesRepresentative) }),
    ...(description           && { description }),
    ...(invoiceAddress        && { invoiceAddress:       fkWrap(invoiceAddress) }),
    ...(deliveryLocation      && { deliveryLocation }),
    ...(organization          && { organization:         fkWrap(organization) }),
    ...(priceList             && { priceList:            fkWrap(priceList) }),
  }
}

// ════════════════════════════════════════════════════
// ORDER LINE
// ════════════════════════════════════════════════════
const LINE_BASE = '/org.openbravo.service.json.jsonrest/OrderLine'

export async function fetchOrderLines(orderId) {
  const res = await api.get(LINE_BASE, {
    params: {
      _where: `e.salesOrder.id = '${orderId}'`,
      _startRow: 0,
      _endRow: 200,
      _orderBy: 'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createOrderLine(orderId, data) {
  const { product, uOM, taxCategory, warehouse, currency, businessPartner, partnerAddress, tax, ...rest } = data
  const res = await api.post(LINE_BASE, {
    data: {
      _entityName: 'OrderLine',
      salesOrder: { id: orderId },
      ...rest,
      ...(product         && { product:         fkWrap(product) }),
      ...(uOM             && { uOM:             fkWrap(uOM) }),
      ...(taxCategory     && { taxCategory:     fkWrap(taxCategory) }),
      ...(warehouse       && { warehouse:       fkWrap(warehouse) }),
      ...(currency        && { currency:        fkWrap(currency) }),
      ...(businessPartner && { businessPartner: fkWrap(businessPartner) }),
      ...(partnerAddress  && { partnerAddress:  fkWrap(partnerAddress) }),
      ...(tax             && { tax:             fkWrap(tax) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateOrderLine(id, data) {
  const { product, uOM, taxCategory, ...rest } = data
  const res = await api.put(`${LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'OrderLine',
      ...rest,
      ...(product     && { product:     fkWrap(product) }),
      ...(uOM         && { uOM:         fkWrap(uOM) }),
      ...(taxCategory && { taxCategory: fkWrap(taxCategory) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteOrderLine(id) {
  const res = await api.delete(`${LINE_BASE}/${id}`)
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════

// Organizations
export async function fetchOrganizations() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Organization', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? []
}

// Fetch single vendor by ID — untuk auto-fill form Purchase Order
export async function fetchVendorById(id) {
  const res = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// Vendors only (vendor = true)
export async function fetchVendors(search = '') {
  let where = `e.vendor = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${s}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', {
    params: { _where: where, _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// Partner locations for a given business partner
export async function fetchPartnerLocations(businessPartnerId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartnerLocation', {
    params: {
      _where: `e.businessPartner.id = '${businessPartnerId}'`,
      _startRow: 0,
      _endRow: 50,
    },
  })
  return res.data?.response?.data ?? []
}

// Warehouses
export async function fetchWarehouses() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Warehouse', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// Purchase Order document type
export async function fetchDocumentSequences() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `e.active = true and e.id = '${PURCHASE_ORDER_DOCTYPE_ID}'`,
    },
  })
  return res.data?.response?.data ?? []
}

// Payment Terms
export async function fetchPaymentTerms() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTerm', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// Payment Term Lines
export async function fetchPaymentTermLines(paymentTermId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTermLine', {
    params: {
      _where: `e.paymentTerms.id = '${paymentTermId}'`,
      _startRow: 0,
      _endRow: 50,
      _orderBy: 'e.line asc',
    },
  })
  return res.data?.response?.data ?? []
}

// Payment Methods
export async function fetchPaymentMethods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtFinAccPaymentMethod', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// Price Lists (Purchase)
export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PricingPriceList', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true and e.salesPriceList = false' },
  })
  return res.data?.response?.data ?? []
}

// Products for order line
export async function fetchProducts(search = '') {
  let where = `e.purchase = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Product', {
    params: { _where: where, _startRow: 0, _endRow: 50 },
  })
  return res.data?.response?.data ?? []
}

// UOMs
export async function fetchUOMs() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/UOM', {
    params: { _startRow: 0, _endRow: 200 },
  })
  return res.data?.response?.data ?? []
}