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
// INVOICE HEADER
// ════════════════════════════════════════════════════
const INV_BASE = '/org.openbravo.service.json.jsonrest/Invoice'

export async function fetchAllInvoices({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  // salesTransaction = true untuk customer invoice
  let where = `e.salesTransaction = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  const res = await api.get(INV_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _where: where,
      _noCount: false,
      _orderBy: 'e.creationDate desc',
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchInvoice(id) {
  const res = await api.get(`${INV_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createInvoice(data) {
  const payload = buildInvoicePayload(data)
  const res = await api.post(INV_BASE, {
    data: { _entityName: 'Invoice', salesTransaction: true, ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateInvoice(id, data) {
  const payload = buildInvoicePayload(data)
  const res = await api.put(`${INV_BASE}/${id}`, {
    data: { id, _entityName: 'Invoice', ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteInvoice(id) {
  const ex = await api.get(`${INV_BASE}/${id}`)
  const r = (ex.data?.response?.data ?? [])[0] ?? {}
  const res = await api.put(`${INV_BASE}/${id}`, {
    data: { id, _entityName: 'Invoice', documentNo: r.documentNo, active: false },
  })
  return res.data?.response?.data ?? res.data
}

function buildInvoicePayload(data) {
  const {
    businessPartner, partnerAddress, paymentTerms, paymentMethod,
    transactionDocument, currency, priceList,
    invoiceDate, accountingDate, salesOrder,
    documentNo, description, orderReference,
    standAwal, standAkhir, totalUsage, kodePelanggan,
    salesTransaction, active,
    ...rest
  } = data

  return {
    ...rest,
    ...(documentNo         && { documentNo }),
    ...(businessPartner    && { businessPartner:      fkWrap(businessPartner) }),
    ...(partnerAddress     && { partnerAddress:       fkWrap(partnerAddress) }),
    ...(paymentTerms       && { paymentTerms:         fkWrap(paymentTerms) }),
    ...(paymentMethod      && { paymentMethod:        fkWrap(paymentMethod) }),
    ...(transactionDocument && { documentType:        fkWrap(transactionDocument) }),
    ...(currency           && { currency:             fkWrap(currency) }),
    ...(priceList          && { priceList:            fkWrap(priceList) }),
    ...(invoiceDate        && { invoiceDate }),
    ...(accountingDate     && { accountingDate }),
    ...(salesOrder         && { salesOrder:           fkWrap(salesOrder) }),
    ...(description        && { description }),
    ...(orderReference     && { orderReference }),
    // Custom/additional fields
    ...(standAwal  != null && standAwal  !== '' && { standAwal:  Number(standAwal) }),
    ...(standAkhir != null && standAkhir !== '' && { standAkhir: Number(standAkhir) }),
    ...(kodePelanggan      && { kodePelanggan }),
  }
}

// ════════════════════════════════════════════════════
// INVOICE LINE
// ════════════════════════════════════════════════════
const LINE_BASE = '/org.openbravo.service.json.jsonrest/InvoiceLine'

export async function fetchInvoiceLines(invoiceId) {
  const res = await api.get(LINE_BASE, {
    params: {
      _where: `e.invoice.id = '${invoiceId}'`,
      _startRow: 0,
      _endRow: 200,
      _orderBy: 'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createInvoiceLine(invoiceId, data) {
  const { product, uOM, taxCategory, ...rest } = data
  const res = await api.post(LINE_BASE, {
    data: {
      _entityName: 'InvoiceLine',
      invoice: { id: invoiceId },
      ...rest,
      ...(product     && { product:     fkWrap(product) }),
      ...(uOM         && { uOM:         fkWrap(uOM) }),
      ...(taxCategory && { taxCategory: fkWrap(taxCategory) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateInvoiceLine(id, data) {
  const { product, uOM, taxCategory, ...rest } = data
  const res = await api.put(`${LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'InvoiceLine',
      ...rest,
      ...(product     && { product:     fkWrap(product) }),
      ...(uOM         && { uOM:         fkWrap(uOM) }),
      ...(taxCategory && { taxCategory: fkWrap(taxCategory) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteInvoiceLine(id) {
  await api.delete(`${LINE_BASE}/${id}`)
}

// ════════════════════════════════════════════════════
// INVOICE DISCOUNT
// ════════════════════════════════════════════════════
const DISC_BASE = '/org.openbravo.service.json.jsonrest/InvoiceDiscount'

export async function fetchInvoiceDiscounts(invoiceId) {
  const res = await api.get(DISC_BASE, {
    params: {
      _where: `e.invoice.id = '${invoiceId}'`,
      _startRow: 0,
      _endRow: 50,
    },
  })
  return res.data?.response?.data ?? []
}

export async function createInvoiceDiscount(invoiceId, data) {
  const res = await api.post(DISC_BASE, {
    data: {
      _entityName: 'InvoiceDiscount',
      invoice: { id: invoiceId },
      ...data,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteInvoiceDiscount(id) {
  await api.delete(`${DISC_BASE}/${id}`)
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════

export async function fetchCustomers(search = '') {
  let where = `e.businessPartnerCategory.name = 'Customer'`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${s}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', {
    params: { _where: where, _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPartnerLocations(businessPartnerId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartnerLocation', {
    params: {
      _where: `e.businessPartner.id = '${businessPartnerId}'`,
      _startRow: 0, _endRow: 50,
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentTerms() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTerm', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentMethods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentMethod', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchDocumentTypes() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
    params: { _startRow: 0, _endRow: 100, _where: `e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchSalesOrders(search = '') {
  let where = ''
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where = `upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Order', {
    params: { _startRow: 0, _endRow: 50, ...(where && { _where: where }) },
  })
  return res.data?.response?.data ?? []
}

export async function fetchProducts(search = '') {
  let where = `e.sale = true and e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Product', {
    params: { _where: where, _startRow: 0, _endRow: 50 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchUOMs() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/UOM', {
    params: { _startRow: 0, _endRow: 200 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchTaxCategories() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/TaxCategory', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// Error interceptor
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      console.error('[Invoice API error]', JSON.stringify(res.data?.response))
    }
    return res
  },
  (err) => {
    console.error('[Invoice HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)