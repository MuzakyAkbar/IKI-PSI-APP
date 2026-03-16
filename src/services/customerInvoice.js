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
// CONSTANTS
// ════════════════════════════════════════════════════
export const AR_INVOICE_DOCTYPE_ID = 'BAF9EDB72D024FA9AFF8CED783CB8CE1' // AR Invoice
export const DEFAULT_ORGANIZATION  = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CURRENCY      = '303'                               // IDR
export const DEFAULT_PRICE_LIST    = '01D7BA2E3F234527B861CBAB12AE0DDE'
export const DEFAULT_TAX_ID        = 'F3F273F648784C858549A45FF0A69AFA'

// ════════════════════════════════════════════════════
// INVOICE HEADER
// ════════════════════════════════════════════════════
const INV_BASE = '/org.openbravo.service.json.jsonrest/Invoice'

export async function fetchAllInvoices({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = `e.salesTransaction = true and e.documentType.id = '${AR_INVOICE_DOCTYPE_ID}'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  const res = await api.get(INV_BASE, {
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
    data: { id, _entityName: 'Invoice', active: false, documentNo: r.documentNo },
  })
  return res.data?.response?.data ?? res.data
}

export async function postInvoice(data) {
  const getId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))

  const orgId  = getId(data.organization)  || DEFAULT_ORGANIZATION
  const bpId   = getId(data.businessPartner)
  const paId   = getId(data.partnerAddress)
  const ptId   = getId(data.paymentTerms)
  const pmId   = getId(data.paymentMethod)
  const curId  = getId(data.currency)      || DEFAULT_CURRENCY
  const plId   = getId(data.priceList)     || DEFAULT_PRICE_LIST

  const res = await api.post(INV_BASE, {
    data: {
      _entityName:         'Invoice',
      organization:        orgId,
      salesTransaction:    true,
      documentType:        AR_INVOICE_DOCTYPE_ID,
      transactionDocument: AR_INVOICE_DOCTYPE_ID,
      invoiceDate:         data.invoiceDate,
      accountingDate:      data.accountingDate || data.invoiceDate,
      businessPartner:     bpId,
      ...(paId && { partnerAddress: paId }),
      currency:            curId,
      paymentTerms:        ptId,
      paymentMethod:       pmId,
      priceList:           plId,
      documentStatus:      'DR',
      documentAction:      'CO',
      ...(data.description    && { description:    data.description }),
      ...(data.orderReference && { orderReference: data.orderReference }),
      ...(data.kodePelanggan  && { kodePelanggan:  data.kodePelanggan }),
      ...(data.standAwal  != null && data.standAwal  !== '' && { standAwal:  Number(data.standAwal) }),
      ...(data.standAkhir != null && data.standAkhir !== '' && { standAkhir: Number(data.standAkhir) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

function buildInvoicePayload(data) {
  const {
    businessPartner, partnerAddress, paymentTerms, paymentMethod,
    transactionDocument, currency, priceList, organization,
    invoiceDate, accountingDate, documentNo, description, orderReference,
    standAwal, standAkhir, kodePelanggan,
  } = data

  return {
    documentType:        { id: AR_INVOICE_DOCTYPE_ID },
    transactionDocument: { id: transactionDocument || AR_INVOICE_DOCTYPE_ID },
    organization:        { id: organization || DEFAULT_ORGANIZATION },
    currency:            { id: currency    || DEFAULT_CURRENCY },
    priceList:           { id: priceList   || DEFAULT_PRICE_LIST },
    documentStatus: 'DR',
    documentAction: 'CO',
    ...(documentNo      && { documentNo }),
    ...(businessPartner && { businessPartner: fkWrap(businessPartner) }),
    ...(partnerAddress  && { partnerAddress:  fkWrap(partnerAddress) }),
    ...(paymentTerms    && { paymentTerms:    fkWrap(paymentTerms) }),
    ...(paymentMethod   && { paymentMethod:   fkWrap(paymentMethod) }),
    ...(invoiceDate     && { invoiceDate, accountingDate: accountingDate || invoiceDate }),
    ...(description     && { description }),
    ...(orderReference  && { orderReference }),
    ...(standAwal  != null && standAwal  !== '' && { standAwal:  Number(standAwal) }),
    ...(standAkhir != null && standAkhir !== '' && { standAkhir: Number(standAkhir) }),
    ...(kodePelanggan   && { kodePelanggan }),
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
  const res = await api.post(LINE_BASE, {
    data: {
      _entityName:      'InvoiceLine',
      invoice:          invoiceId,
      organization:     data.organization || DEFAULT_ORGANIZATION,
      lineNo:           data.lineNo,
      invoicedQuantity: data.invoicedQuantity,
      unitPrice:        data.unitPrice,
      ...(data.product         && { product:         data.product }),
      ...(data.uOM             && { uOM:             data.uOM }),
      ...(data.tax             && { tax:             data.tax }),
      ...(data.taxCategory     && { taxCategory:     data.taxCategory }),
      ...(data.businessPartner && { businessPartner: data.businessPartner }),
      ...(data.lineNetAmount != null && { lineNetAmount: data.lineNetAmount }),
      ...(data.listPrice     != null && { listPrice:     data.listPrice }),
      ...(data.grossUnitPrice!= null && { grossUnitPrice:data.grossUnitPrice }),
      ...(data.discount      != null && { discount:      data.discount }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateInvoiceLine(id, data) {
  const res = await api.put(`${LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName:      'InvoiceLine',
      lineNo:           data.lineNo,
      invoicedQuantity: data.invoicedQuantity,
      unitPrice:        data.unitPrice,
      ...(data.product         && { product:         data.product }),
      ...(data.uOM             && { uOM:             data.uOM }),
      ...(data.tax             && { tax:             data.tax }),
      ...(data.businessPartner && { businessPartner: data.businessPartner }),
      ...(data.lineNetAmount != null && { lineNetAmount: data.lineNetAmount }),
      ...(data.listPrice     != null && { listPrice:     data.listPrice }),
      ...(data.grossUnitPrice!= null && { grossUnitPrice:data.grossUnitPrice }),
      ...(data.discount      != null && { discount:      data.discount }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteInvoiceLine(id) {
  await api.delete(`${LINE_BASE}/${id}`)
}

// ════════════════════════════════════════════════════
// ACCOUNTING FACTS
// ════════════════════════════════════════════════════
export async function fetchAccountingFacts(invoiceId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact', {
    params: {
      _where: `e.recordID = '${invoiceId}' and e.table.id = '318'`,
      _startRow: 0,
      _endRow: 100,
      _orderBy: 'e.sequenceNumber asc',
    },
  })
  return res.data?.response?.data ?? []
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

export async function fetchCustomerById(id) {
  const res = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
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

export async function fetchPaymentTermLines(paymentTermId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTermLine', {
    params: {
      _where: `e.paymentTerms.id = '${paymentTermId}'`,
      _startRow: 0, _endRow: 50, _orderBy: 'e.line asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentMethods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PricingPriceList', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true and e.salesPriceList = true' },
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

// ════════════════════════════════════════════════════
// PROCESS INVOICE (Complete / DocAction)
// ════════════════════════════════════════════════════

// Fetch the AD_Process_ID (numeric "111") for "Process Invoice"
let _cachedProcessId = null
export async function fetchInvoiceProcessId() {
  if (_cachedProcessId) return _cachedProcessId
  const res = await api.get('/org.openbravo.service.json.jsonrest/ADProcess', {
    params: {
      _where: `e.searchKey = 'C_Invoice Post'`,
      _startRow: 0,
      _endRow: 1,
    },
  })
  const data = res.data?.response?.data ?? []
  const record = data[0]
  if (!record) throw new Error('Process "C_Invoice Post" tidak ditemukan di sistem.')
  const id = record.id
  if (!id) throw new Error('Process ID tidak ditemukan.')
  _cachedProcessId = id
  return id
}

// Complete invoice — tries multiple Openbravo endpoints in order


export async function runInvoiceProcess(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'DR') {
    throw new Error(`Invoice sudah dalam status "${invoiceData?.documentStatus}", tidak bisa di-Complete.`)
  }

  // ── Attempt 1: Standard Openbravo process servlet (ad_process)
  // This is the actual endpoint behind the "Complete" button dialog in Openbravo UI
  try {
    const formData = new URLSearchParams({
      inpTableId:         '318',
      inpwindowId:        '167',
      inpcInvoiceId:      invoiceId,
      inpdocAction:       'CO',
      inpDocStatus:       'DR',
      inpProcessing:      'Y',
      processId:          '111',
      reportId:           'C_Invoice Post',
      Command:            'OK',
    })
    const r1 = await fetch(`${BASE_URL}ad_process/C_InvoicePost`, {
      method:      'POST',
      credentials: 'include',
      headers: {
        Authorization:  `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
    const t1 = await r1.text()
    console.log('[ad_process/C_InvoicePost]', r1.status, t1.slice(0, 300))
    const isHtml1 = t1.trimStart().startsWith('<')
    if (r1.ok && !isHtml1 && !t1.includes('Error') && !t1.includes('error')) {
      return { status: 'ok', raw: t1 }
    }
  } catch (e) {
    console.warn('[Attempt 1 ad_process failed]', e.message)
  }

  // ── Attempt 2: servlet C_Invoice_Post (alternate URL pattern)
  try {
    const formData2 = new URLSearchParams({
      inpTableId:    '318',
      inpcInvoiceId: invoiceId,
      inpdocAction:  'CO',
      Command:       'OK',
    })
    const r2 = await fetch(`${BASE_URL}C_Invoice_Post`, {
      method:      'POST',
      credentials: 'include',
      headers: {
        Authorization:  `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData2.toString(),
    })
    const t2 = await r2.text()
    console.log('[C_Invoice_Post servlet]', r2.status, t2.slice(0, 300))
    if (r2.ok) return { status: 'ok', raw: t2 }
  } catch (e) {
    console.warn('[Attempt 2 servlet failed]', e.message)
  }

  // ── Attempt 3: JSON REST PUT — directly set fields
  // NOTE: Openbravo may protect processed/docAction fields after CO,
  // but we try anyway as fallback
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentNo:     invoiceData.documentNo,
      documentStatus: 'CO',
      documentAction: 'CL',
      processed:      true,
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Complete Invoice gagal di semua attempt.')
  }
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// Error interceptor
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      console.error('[Invoice API error]', JSON.stringify(res.data?.response))
      const msg = res.data?.response?.error?.message
      if (msg) throw new Error(msg)
    }
    return res
  },
  (err) => {
    console.error('[Invoice HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

// ════════════════════════════════════════════════════
// POST ACCOUNTING (docAction=PO → posted=Y, creates journal)
// ════════════════════════════════════════════════════
export async function postAccountingProcess(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'CO') {
    throw new Error(`Invoice harus berstatus Complete (CO) sebelum di-Post. Status saat ini: "${invoiceData?.documentStatus}"`)
  }

  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentNo:     invoiceData.documentNo,
      documentStatus: 'CO',
      documentAction: 'PO',
      processed:      true,
    },
  })
  const status = res.data?.response?.status
  if (status !== undefined && status < 0) {
    throw new Error(res.data?.response?.error?.message || 'Post Invoice gagal.')
  }
  return await fetchInvoice(invoiceId)
}
// ════════════════════════════════════════════════════
// UNPOST (hapus jurnal accounting, posted=N)
// 1. Fetch semua AccountingFact untuk invoice ini
// 2. DELETE satu per satu
// 3. PUT posted=false pada invoice
// ════════════════════════════════════════════════════
const FACT_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'

export async function unpostAccountingProcess(invoiceId, invoiceData) {
  const isPosted = invoiceData?.posted === true || invoiceData?.posted === 'Y'
  if (!isPosted) {
    throw new Error(`Invoice belum di-Post, tidak bisa di-Unpost.`)
  }

  // Step 1: ambil semua accounting facts
  const factsRes = await api.get(FACT_BASE, {
    params: {
      _where: `e.recordID = '${invoiceId}' and e.table.id = '318'`,
      _startRow: 0,
      _endRow: 200,
    },
  })
  const facts = factsRes.data?.response?.data ?? []

  // Step 2: delete semua facts
  await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))

  // Step 3: set posted=false pada invoice
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:          invoiceId,
      _entityName: 'Invoice',
      documentNo:  invoiceData.documentNo,
      posted:      'N',
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Unpost Invoice gagal.')
  }
  return await fetchInvoice(invoiceId)
}

// ════════════════════════════════════════════════════
// REACTIVATE (Complete → Draft kembali)
// PUT documentAction='RC' → documentStatus=DR, bisa diedit lagi
// ════════════════════════════════════════════════════
export async function reactivateInvoice(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'CO') {
    throw new Error(`Invoice harus berstatus Complete (CO) untuk di-Reactivate. Status saat ini: "${invoiceData?.documentStatus}"`)
  }
  // Set langsung documentStatus=DR dan documentAction=CO (kembali ke Draft siap di-Complete lagi)
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentNo:     invoiceData.documentNo,
      documentStatus: 'DR',
      documentAction: 'CO',
      processed:      'N',
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Reactivate Invoice gagal.')
  }
  return await fetchInvoice(invoiceId)
}

// ════════════════════════════════════════════════════
// VOID (batalkan invoice, documentStatus=VO)
// PUT documentAction='VO' → invoice dibatalkan permanen
// ════════════════════════════════════════════════════
export async function voidInvoice(invoiceId, invoiceData) {
  if (!['CO', 'DR'].includes(invoiceData?.documentStatus)) {
    throw new Error(`Invoice tidak bisa di-Void dari status "${invoiceData?.documentStatus}".`)
  }
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentNo:     invoiceData.documentNo,
      documentAction: 'VO',
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Void Invoice gagal.')
  }
  return await fetchInvoice(invoiceId)
}
