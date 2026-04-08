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
// IOT / PSI API — Back to Draft
// ════════════════════════════════════════════════════
const IOT_API_BASE = window.APP_CONFIG?.IOT_API_BASE_URL || 'https://api-erp-psi-dev.nebulaiot.io'
const IOT_USERNAME = window.APP_CONFIG?.IOT_USERNAME || 'ERP_TO_IOT'
const IOT_PASSWORD = window.APP_CONFIG?.IOT_PASSWORD || 'sad21341!WadSSAGGC'
const iotToken = btoa(`${IOT_USERNAME}:${IOT_PASSWORD}`)

export async function backToDraftIot(idErp) {
  const res = await fetch(`${IOT_API_BASE}/billing/back/draft/${idErp}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${iotToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    let errMessage = `Back to Draft IoT gagal [${res.status}]`
    try {
      const errJson = await res.json()
      if (errJson?.message) errMessage = errJson.message
    } catch {
      const errText = await res.text().catch(() => '')
      if (errText) errMessage = errText
    }
    throw new Error(errMessage)
  }

  return res.status === 204 ? null : await res.json().catch(() => null)
}

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════
export const AR_INVOICE_DOCTYPE_ID  = 'BAF9EDB72D024FA9AFF8CED783CB8CE1' // AR Invoice
export const DEFAULT_ORGANIZATION   = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CURRENCY       = '303'                               // IDR
export const DEFAULT_PRICE_LIST     = '01D7BA2E3F234527B861CBAB12AE0DDE'
export const DEFAULT_TAX_ID         = 'F3F273F648784C858549A45FF0A69AFA'
export const ADJUSTMENT_PRODUCT_ID  = '64556432E0644B86A2E01BE25309F9F4' // Product Adjustment
export const ADJUSTMENT_UOM_ID      = '100'                               // Unit

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
      _startRow:  startRow,
      _endRow:    startRow + pageSize,
      _noCount:   false,
      _orderBy:   'e.documentNo desc',
      _where:     where,
      _selectedProperties: 'id,documentNo,invoiceDate,businessPartner,businessPartner$_identifier,kodePelanggan,grandTotalAmount,summedLineAmount,documentStatus,posted,paymentComplete,organization,organization$_identifier',
    },
  })
  const result = res.data?.response ?? res.data
  console.log('[DEBUG] startRow:', startRow, '| totalRows:', result.totalRows, '| data.length:', result.data?.length, '| paymentComplete[0]:', result.data?.[0]?.paymentComplete)
  return result
}

export async function fetchInvoice(id) {
  const res = await api.get(`${INV_BASE}/${id}`)
  // Openbravo GET by ID bisa return dua struktur:
  // 1. { response: { data: [{...}] } }  -> list wrapper
  // 2. { id, documentNo, ... }          -> flat object langsung
  const wrapped = res.data?.response?.data
  if (wrapped) return Array.isArray(wrapped) ? wrapped[0] : wrapped
  if (res.data?.id) return res.data
  return null
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
const LINE_BASE  = '/org.openbravo.service.json.jsonrest/InvoiceLine'
const FACT_BASE  = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'

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

export async function fetchTaxRates() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtTaxRate', {
    params: {
      _where:    `e.active = true`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.name asc',
    },
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
      documentAction: 'RE',
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
// POST ACCOUNTING
// Pola: fetch AcctSchema → fetch ProductAcct → insert double-entry Facts
// ════════════════════════════════════════════════════

// Invoice table ID di Openbravo (C_Invoice)
const INVOICE_TABLE_ID = '318'

// ── Helper: resolve account info dari AccountingCombination ID ──
async function resolveAcctCombination(combId) {
  if (!combId) return null
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
    params: { _where: `e.id = '${combId}'`, _startRow: 0, _endRow: 1 },
  })
  const rec = res.data?.response?.data?.[0] ?? null
  if (!rec) return null
  const raw = rec.account
  const accountId = !raw ? null : typeof raw === 'object' ? (raw.id ?? null) : String(raw).trim() || null
  if (!accountId) return null
  const parts = (rec['account$_identifier'] || '').split(' - ')
  return {
    accountId,
    combId: rec.id,
    value: rec.combination || rec.alias || parts[0] || '',
    accountingEntryDescription: parts.slice(1).join(' - ') || '',
  }
}

// ── Helper: fetch AcctSchema pertama yang aktif untuk org ini ──
async function fetchDefaultAcctSchema(orgId) {
  // Coba filter by org dulu, kalau kosong ambil yang pertama aktif
  const tryOrg = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema', {
    params: {
      _where: `e.active = true`,
      _startRow: 0,
      _endRow: 10,
    },
  })
  const list = tryOrg.data?.response?.data ?? []
  // Pilih yang orgId-nya cocok, atau fallback ke index 0
  return list.find(s => {
    const sOrg = s.organization?.id ?? s.organization
    return sOrg === orgId
  }) ?? list[0] ?? null
}

// ── Helper: fetch periode berdasarkan tanggal & schemaId ──
async function fetchPeriodForDate(dateStr, schemaId) {
  if (!dateStr) return null
  const month = dateStr.slice(0, 7) // "YYYY-MM"
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPeriod', {
    params: {
      _where: `e.periodType = 'M' and e.startingDate <= '${dateStr}' and e.endingDate >= '${dateStr}'`,
      _startRow: 0,
      _endRow: 5,
    },
  })
  const list = res.data?.response?.data ?? []
  return list.find(p => {
    if (!schemaId) return true
    const pYear = p.year?.id ?? p.year
    return true // ambil yang pertama saja
  }) ?? list[0] ?? null
}

// ── Helper: fetch product accounting — coba beberapa entity name ──
async function fetchProductAcct(productId, schemaId) {
  // Entity names yang mungkin ada di Openbravo untuk M_Product_Acct
  const entityNames = [
    'ProductAccounts',
    'FinancialMgmtProductAcct',
    'MaterialMgmtProductAcct',
    'M_Product_Acct',
  ]
  const whereBase = schemaId
    ? `e.product.id = '${productId}' and e.accountingSchema.id = '${schemaId}'`
    : `e.product.id = '${productId}'`

  for (const entityName of entityNames) {
    try {
      const res = await api.get(`/org.openbravo.service.json.jsonrest/${entityName}`, {
        params: { _where: whereBase, _startRow: 0, _endRow: 1 },
      })
      const data = res.data?.response?.data ?? []
      if (data.length > 0) {
        console.log(`[fetchProductAcct] Found using entity: ${entityName}`, Object.keys(data[0]))
        return data[0]
      }
    } catch (e) {
      console.log(`[fetchProductAcct] ${entityName} not found:`, e.message?.slice(0, 80))
    }
  }
  return null
}

export async function postAccountingProcess(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'CO') {
    throw new Error(`Invoice harus berstatus Complete (CO) sebelum di-Post. Status saat ini: "${invoiceData?.documentStatus}"`)
  }

  // Guard: cek apakah sudah ada jurnal akuntansi — jika ada, harus Unpost dulu
  const existingFacts = await api.get(FACT_BASE, {
    params: { _where: `e.recordID = '${invoiceId}' and e.table.id = '${INVOICE_TABLE_ID}'`, _startRow: 0, _endRow: 1 },
  })
  if ((existingFacts.data?.response?.data ?? []).length > 0) {
    throw new Error('Invoice ini sudah memiliki jurnal akuntansi. Klik Unpost terlebih dahulu sebelum Post ulang.')
  }

  const extractId = (v) => (v && typeof v === 'object') ? v.id : (v || null)

  const orgId     = extractId(invoiceData.organization) || DEFAULT_ORGANIZATION
  const clientId  = extractId(invoiceData.client)       || '53AD31E21D624632B2F171194EC6E887'
  const curId     = extractId(invoiceData.currency)     || DEFAULT_CURRENCY
  const docTypeId = extractId(invoiceData.documentType)
  const accDate   = invoiceData.accountingDate || invoiceData.invoiceDate
  const txDate    = invoiceData.invoiceDate
  const groupID   = invoiceId.replace(/-/g, '').slice(0, 32).toUpperCase()

  // ── Step 1: fetch AcctSchema ──
  let schemaId = extractId(invoiceData.accountingSchema) ?? null
  let schemaRec = null
  if (!schemaId) {
    schemaRec = await fetchDefaultAcctSchema(orgId)
    schemaId  = schemaRec?.id ?? null
    console.log('[POST ACCOUNTING] AcctSchema:', schemaId)
    if (schemaRec) console.log('[POST ACCOUNTING] AcctSchema fields:', JSON.stringify(schemaRec, null, 2))
  }

  // ── Step 2: fetch Period ──
  let periodId = extractId(invoiceData.period) ?? null
  if (!periodId && accDate) {
    const period = await fetchPeriodForDate(accDate, schemaId)
    periodId = period?.id ?? null
    console.log('[POST ACCOUNTING] Period:', periodId)
  }

  // ── Step 3: fetch invoice lines ──
  const linesRes = await api.get(LINE_BASE, {
    params: {
      _where:    `e.invoice.id = '${invoiceId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  const lines = linesRes.data?.response?.data ?? []
  if (lines.length === 0) throw new Error('Tidak ada invoice lines untuk di-post.')

  // ── Step 4: resolve AR Receivable account ──
  // Strategy order:
  //   4a. BusinessPartner-level — coba 5 entity name berbeda
  //   4b. BusinessPartnerCategoryAccount — via BP category + schema
  //   4c. AcctSchema-level fallback
  //   4d. LAST RESORT — cari akun Piutang langsung dari ElementValue (account code)
  let arAccount = null

  const bpId = extractId(invoiceData.businessPartner)

  // Helper: coba semua field name AR yang mungkin di satu record
  const extractArCombId = (rec) => {
    if (!rec) return null
    // Log semua key agar mudah debug
    console.log('[POST ACCOUNTING] Record keys:', Object.keys(rec))
    return extractId(rec.customerReceivables)
      || extractId(rec.receivables)
      || extractId(rec.cReceivableAcct)
      || extractId(rec.customerReceivablesNo)
      || extractId(rec.receivablesAccount)
      || extractId(rec.acctReceivable)
      || extractId(rec.receivableAccount)
      || extractId(rec.bpartnerReceivables)
      // nilai numerik di field *Acct* yang berisi ID combination (nama field Openbravo asli)
      || Object.entries(rec).reduce((found, [k, v]) => {
           if (found) return found
           const lk = k.toLowerCase()
           if ((lk.includes('receiv') || lk.includes('piutang')) && v) return extractId(v)
           return null
         }, null)
  }

  // 4a. Try BusinessPartner-level customer accounts — try multiple entity names
  if (bpId && schemaId) {
    const bpAcctEntities = [
      'BusinessPartnerAccounts',
      'BusinessPartnerAccts',
      'C_BP_Customer_Acct',
      'FinancialMgmtBPAcct',
      'C_BPartner_Acct',          // nama tabel DB asli Openbravo
    ]
    for (const entityName of bpAcctEntities) {
      try {
        const res = await api.get(`/org.openbravo.service.json.jsonrest/${entityName}`, {
          params: {
            _where: `e.businessPartner.id = '${bpId}' and e.accountingSchema.id = '${schemaId}'`,
            _startRow: 0, _endRow: 1,
          },
        })
        const rec = res.data?.response?.data?.[0]
        if (rec) {
          console.log(`[POST ACCOUNTING] BP Acct found via ${entityName}`)
          const combId = extractArCombId(rec)
          if (combId) {
            arAccount = await resolveAcctCombination(combId)
            console.log('[POST ACCOUNTING] AR from BP acct:', arAccount)
            break
          } else {
            console.warn(`[POST ACCOUNTING] ${entityName} found but no AR field. Full record:`, JSON.stringify(rec))
          }
        }
      } catch (e) {
        console.log(`[POST ACCOUNTING] ${entityName} not found:`, e.message?.slice(0, 80))
      }
    }
  }

  // 4b. Try BusinessPartnerCategoryAccount (BP Category → schema → customerReceivablesNo)
  if (!arAccount && bpId && schemaId) {
    try {
      const bpRes = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`)
      const bpData = bpRes.data?.response?.data
      const bp = Array.isArray(bpData) ? bpData[0] : (bpData ?? bpRes.data)
      const categoryId = extractId(bp?.businessPartnerCategory)
      console.log('[POST ACCOUNTING] BP category:', categoryId)

      if (categoryId) {
        // Coba dua entity name untuk category account
        for (const catEntity of ['BusinessPartnerCategoryAccount', 'C_BP_Group_Acct']) {
          try {
            const catAcctRes = await api.get(`/org.openbravo.service.json.jsonrest/${catEntity}`, {
              params: {
                _where: `e.businessPartnerCategory.id = '${categoryId}' and e.accountingSchema.id = '${schemaId}'`,
                _startRow: 0, _endRow: 1,
              },
            })
            const catAcct = catAcctRes.data?.response?.data?.[0]
            if (catAcct) {
              console.log(`[POST ACCOUNTING] ${catEntity} found`)
              const combId = extractArCombId(catAcct)
              if (combId) {
                arAccount = await resolveAcctCombination(combId)
                console.log('[POST ACCOUNTING] AR from BPCategoryAcct:', arAccount)
                break
              } else {
                console.warn(`[POST ACCOUNTING] ${catEntity} found but no AR field. Full record:`, JSON.stringify(catAcct))
              }
            }
          } catch (e) {
            console.log(`[POST ACCOUNTING] ${catEntity} failed:`, e.message?.slice(0, 80))
          }
          if (arAccount) break
        }
      }
    } catch (e) {
      console.log('[POST ACCOUNTING] BPCategoryAccount lookup failed:', e.message)
    }
  }

  // 4c. Fallback: AcctSchema-level AR
  if (!arAccount) {
    const schema = schemaRec || {}
    if (Object.keys(schema).length > 0) {
      console.log('[POST ACCOUNTING] Trying AcctSchema-level AR. Keys:', Object.keys(schema))
      const arCombId = extractArCombId(schema)
        || extractId(schema.notFinRecReceivables)
        || extractId(schema.receivablesNoCurrency)
      if (arCombId) {
        arAccount = await resolveAcctCombination(arCombId)
        console.log('[POST ACCOUNTING] AR from AcctSchema:', arAccount)
      }
    }
    // Juga coba fetch AcctSchema dengan _selectedProperties lebih luas
    if (!arAccount && schemaId) {
      try {
        const schemaFullRes = await api.get(`/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema/${schemaId}`)
        const schemaFull = schemaFullRes.data?.response?.data?.[0] ?? schemaFullRes.data
        if (schemaFull && typeof schemaFull === 'object') {
          console.log('[POST ACCOUNTING] AcctSchema full keys:', Object.keys(schemaFull))
          const arCombId2 = extractArCombId(schemaFull)
            || extractId(schemaFull.notFinRecReceivables)
            || extractId(schemaFull.receivablesNoCurrency)
          if (arCombId2) {
            arAccount = await resolveAcctCombination(arCombId2)
            console.log('[POST ACCOUNTING] AR from AcctSchema full:', arAccount)
          }
        }
      } catch (e) {
        console.log('[POST ACCOUNTING] AcctSchema full fetch failed:', e.message?.slice(0, 80))
      }
    }
  }

  // 4d. LAST RESORT: cari akun Piutang langsung dari ElementValue berdasarkan nama/kode akun
  if (!arAccount) {
    console.warn('[POST ACCOUNTING] All BP/Schema AR lookups failed. Trying ElementValue search...')
    try {
      // Cari account element yang namanya mengandung "piutang" atau "receivable", atau code dimulai dengan 12
      const evRes = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue', {
        params: {
          _where: `e.active = true and e.accountType = 'A' and (upper(e.name) like upper('%piutang%') or upper(e.name) like upper('%receivable%') or (e.searchKey like '12%' and e.summaryLevel = false))`,
          _startRow: 0,
          _endRow: 10,
          _orderBy: 'e.searchKey asc',
        },
      })
      const evList = evRes.data?.response?.data ?? []
      console.log('[POST ACCOUNTING] ElementValue AR candidates:', evList.map(e => `${e.searchKey} - ${e.name}`))

      if (evList.length > 0) {
        // Pilih yang paling spesifik: lebih prefer "piutang usaha" / "accounts receivable trade"
        const bestEv = evList.find(e =>
          /piutang usaha|trade receiv|account.*receiv.*trade/i.test(e.name)
        ) ?? evList[0]

        // Cari AccountingCombination yang pakai element ini
        const combRes = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
          params: {
            _where: `e.account.id = '${bestEv.id}'` + (schemaId ? ` and e.accountingSchema.id = '${schemaId}'` : ''),
            _startRow: 0, _endRow: 1,
          },
        })
        const combRec = combRes.data?.response?.data?.[0]
        if (combRec) {
          arAccount = await resolveAcctCombination(combRec.id)
          console.log('[POST ACCOUNTING] AR from ElementValue fallback:', arAccount, '| account:', bestEv.searchKey, bestEv.name)
        } else {
          // Buat fake arAccount langsung dari elementValue id (tanpa combination)
          arAccount = {
            accountId: bestEv.id,
            combId:    null,
            value:     bestEv.searchKey || '',
            accountingEntryDescription: bestEv.name || '',
          }
          console.log('[POST ACCOUNTING] AR from ElementValue (no combination):', arAccount)
        }
      }
    } catch (e) {
      console.warn('[POST ACCOUNTING] ElementValue AR search failed:', e.message)
    }
  }

  if (!arAccount) {
    throw new Error(
      'Akun AR (Piutang) tidak ditemukan. Pastikan:\n' +
      '1. Business Partner Category sudah memiliki akun "Customer Receivables" di tab Customer Accounting\n' +
      '2. Atau Accounting Schema sudah dikonfigurasi dengan akun Receivables\n' +
      '3. Atau pastikan ada akun dengan nama "Piutang" / "Receivable" di Chart of Accounts\n\n' +
      'Cek browser console (F12) untuk detail field yang tersedia di setiap entity.'
    )
  }

  // ── Step 5: Resolve Revenue accounts per line (deduplicated by productId) ──
  const revenueCache = {}
  async function getRevenueAccount(productId) {
    if (!productId) return null
    if (productId in revenueCache) return revenueCache[productId]
    const productAcct = await fetchProductAcct(productId, schemaId)
    let account = null
    if (productAcct) {
      console.log('[POST ACCOUNTING] ProductAcct keys for', productId, ':', Object.keys(productAcct))
      const revCombId = extractId(productAcct.pRevenueAcct)
        || extractId(productAcct.revenue)
        || extractId(productAcct.revenueRecognition)
        || extractId(productAcct.p_revenue_acct)
        || extractId(productAcct.productRevenue)
      if (revCombId) {
        account = await resolveAcctCombination(revCombId)
        console.log('[POST ACCOUNTING] Revenue account for product', productId, ':', account)
      }
    }
    revenueCache[productId] = account
    return account
  }

  // ── Step 5b: Resolve Tax account per tax rate ──
  const taxAcctCache = {}
  async function getTaxAccount(taxId) {
    if (!taxId) return null
    if (taxId in taxAcctCache) return taxAcctCache[taxId]
    try {
      const taxAcctRes = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtTaxAccounts', {
        params: {
          _where: `e.tax.id = '${taxId}'` + (schemaId ? ` and e.accountingSchema.id = '${schemaId}'` : ''),
          _startRow: 0, _endRow: 1,
        },
      })
      const taxAcct = taxAcctRes.data?.response?.data?.[0]
      if (taxAcct) {
        console.log('[POST ACCOUNTING] TaxAcct keys:', Object.keys(taxAcct))
        // taxDue = Tax Payable (for sales/AR invoices)
        const combId = extractId(taxAcct.taxDue)
          || extractId(taxAcct.taxDueAcct)
          || extractId(taxAcct.t_due_acct)
        if (combId) {
          const account = await resolveAcctCombination(combId)
          taxAcctCache[taxId] = account
          return account
        }
      }
    } catch (e) {
      console.log('[POST ACCOUNTING] TaxAcct lookup failed for', taxId, ':', e.message?.slice(0, 80))
    }
    taxAcctCache[taxId] = null
    return null
  }

  // ── Step 6: Build entries ──
  // Standard AR Invoice double-entry:
  //   Debit  AR (Piutang)    = grandTotalAmount  (net + tax)
  //   Credit Revenue         = lineNetAmount     (per line)
  //   Credit Tax Payable     = taxAmount         (per tax line, if any)
  // grandTotalAmount = sum(lineNetAmount) + sum(taxAmount)
  const grandTotal = Number(invoiceData.grandTotalAmount) || 0
  let seqNo = 10

  const buildFact = ({ isDebit, amount, lineId, lineNo, desc }) => ({
    _entityName:                 'FinancialMgmtAccountingFact',
    client:                      { id: clientId },
    organization:                { id: orgId },
    ...(schemaId               && { accountingSchema: { id: schemaId } }),
    transactionDate:             txDate,
    accountingDate:              accDate,
    ...(periodId               && { period: { id: periodId } }),
    table:                       { id: INVOICE_TABLE_ID },
    recordID:                    invoiceId,
    ...(lineId                 && { lineID: lineId }),
    postingType:                 'A',
    currency:                    { id: curId },
    foreignCurrencyDebit:        isDebit ? amount : 0,
    foreignCurrencyCredit:       isDebit ? 0 : amount,
    debit:                       isDebit ? amount : 0,
    credit:                      isDebit ? 0 : amount,
    quantity:                    0,
    description:                 desc,
    groupID,
    sequenceNumber:              seqNo,
    type:                        'N',
    documentCategory:            'ARI',
    ...(docTypeId              && { documentType: { id: docTypeId } }),
    active:                      true,
  })

  const invoiceDesc = invoiceData.description || invoiceData['businessPartner$_identifier']?.split(' - ').slice(1).join(' - ') || ''

  // 6a. ONE Debit AR — grandTotalAmount (net + tax), referencing first line
  const firstLine = lines[0]
  await api.post(FACT_BASE, {
    data: {
      ...buildFact({ isDebit: true, amount: grandTotal, lineId: firstLine?.id, lineNo: 10, desc: `${invoiceData.documentNo} # ${invoiceDesc}`.trim() }),
      account:                   { id: arAccount.accountId },
      ...(arAccount.combId     && { accountingCombination: { id: arAccount.combId } }),
      value:                      arAccount.value,
      accountingEntryDescription: arAccount.accountingEntryDescription,
    },
  })
  seqNo += 10

  // 6b. Credit Revenue per invoice line (lineNetAmount)
  for (const line of lines) {
    const lineNo      = line.lineNo ?? seqNo
    const lineAmount  = Number(line.lineNetAmount) || 0
    if (lineAmount === 0) continue
    const lineDesc    = line.description || invoiceData.documentNo || ''
    const productId   = extractId(line.product)
    const revAccount  = await getRevenueAccount(productId)

    if (revAccount?.accountId) {
      await api.post(FACT_BASE, {
        data: {
          ...buildFact({ isDebit: false, amount: lineAmount, lineId: line.id, lineNo, desc: `${invoiceData.documentNo} # ${lineNo} ${lineDesc}`.trim() }),
          account:                       { id: revAccount.accountId },
          ...(revAccount.combId        && { accountingCombination: { id: revAccount.combId } }),
          value:                          revAccount.value,
          accountingEntryDescription:     revAccount.accountingEntryDescription,
        },
      })
      seqNo += 10
    } else {
      console.warn(`[POST ACCOUNTING] Line ${lineNo}: Revenue account not resolved — Credit Revenue entry skipped.`)
    }
  }

  // 6c. Credit Tax Payable per invoice tax line (taxAmount)
  // Fetch invoice tax lines (C_InvoiceTax)
  try {
    const taxLinesRes = await api.get('/org.openbravo.service.json.jsonrest/InvoiceTax', {
      params: {
        _where: `e.invoice.id = '${invoiceId}'`,
        _startRow: 0, _endRow: 50,
      },
    })
    const taxLines = taxLinesRes.data?.response?.data ?? []
    console.log('[POST ACCOUNTING] Tax lines count:', taxLines.length)

    for (const taxLine of taxLines) {
      const taxAmount = Number(taxLine.taxAmount) || 0
      if (taxAmount === 0) continue
      const taxId     = extractId(taxLine.tax)
      const taxAcct   = await getTaxAccount(taxId)

      if (taxAcct?.accountId) {
        await api.post(FACT_BASE, {
          data: {
            ...buildFact({ isDebit: false, amount: taxAmount, lineId: null, lineNo: seqNo, desc: `${invoiceData.documentNo} # Tax ${taxLine['tax$_identifier'] || ''}`.trim() }),
            account:                   { id: taxAcct.accountId },
            ...(taxAcct.combId       && { accountingCombination: { id: taxAcct.combId } }),
            value:                      taxAcct.value,
            accountingEntryDescription: taxAcct.accountingEntryDescription,
          },
        })
        seqNo += 10
        console.log('[POST ACCOUNTING] Tax Credit entry posted:', taxAmount, taxAcct)
      } else {
        // If tax account not found, still need balance — add tax to revenue of first line
        console.warn(`[POST ACCOUNTING] Tax account not found for tax ${taxId} — tax amount ${taxAmount} unaccounted.`)
      }
    }
  } catch (e) {
    console.warn('[POST ACCOUNTING] Failed to fetch invoice tax lines:', e.message)
  }

  // ── Step 7: set posted='Y' pada header invoice ──
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: { id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo, posted: 'Y' },
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
  // Hapus semua payment schedule lama agar tidak menggantung saat invoice kembali ke Draft
  try {
    await deletePaymentSchedules(invoiceId)
  } catch (e) {
    console.warn("[reactivateInvoice] Gagal hapus payment schedules:", e.message)
  }
  return await fetchInvoice(invoiceId)
}

// ════════════════════════════════════════════════════
// PAYMENT PLAN (FIN_Payment_Schedule)
// Dibuat otomatis setelah invoice di-Complete
// ════════════════════════════════════════════════════
const PAY_SCHED_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule'

/**
 * Hapus semua payment schedule milik invoice ini.
 * Dipanggil saat Reactivate supaya schedule lama tidak menggantung.
 */
export async function deletePaymentSchedules(invoiceId) {
  const res = await api.get(PAY_SCHED_BASE, {
    params: {
      _where: `e.invoice.id = '${invoiceId}'`,
      _startRow: 0,
      _endRow: 50,
    },
  })
  const schedules = res.data?.response?.data ?? []
  for (const sched of schedules) {
    await api.delete(`${PAY_SCHED_BASE}/${sched.id}`)
  }
}

export async function fetchPaymentSchedules(invoiceId) {
  const res = await api.get(PAY_SCHED_BASE, {
    params: {
      _where: `e.invoice.id = '${invoiceId}'`,
      _startRow: 0,
      _endRow: 50,
      _orderBy: 'e.dueDate asc',
    },
  })
  return res.data?.response?.data ?? []
}

/**
 * Fetch total outstanding balance untuk satu customer (Business Partner).
 * Menjumlahkan outstandingAmount dari semua payment schedules invoice yang belum lunas.
 * Returns: { totalOutstanding, totalDue, schedules }
 */
export async function fetchCustomerOutstandingBalance(businessPartnerId) {
  if (!businessPartnerId) return { totalOutstanding: 0, totalDue: 0, schedules: [] }
  const bpId = typeof businessPartnerId === 'object' ? businessPartnerId.id : String(businessPartnerId)

  const res = await api.get(PAY_SCHED_BASE, {
    params: {
      _where:    `e.invoice.businessPartner.id = '${bpId}' and e.outstandingAmount != 0 and e.invoice.salesTransaction = true`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.dueDate asc',
    },
  })
  const schedules = res.data?.response?.data ?? []
  const today = new Date().toISOString().slice(0, 10)
  let totalOutstanding = 0
  let totalDue = 0
  for (const s of schedules) {
    const amt = Number(s.outstandingAmount) || 0
    totalOutstanding += amt
    if (s.dueDate && s.dueDate <= today) totalDue += amt
  }
  return { totalOutstanding, totalDue, schedules }
}

/**
 * Membuat payment plan (FIN_Payment_Schedule) untuk invoice yang sudah di-Complete.
 *
 * Logika:
 * 1. Ambil payment term lines untuk menghitung due date & amount per instalment.
 * 2. Jika tidak ada term lines, buat satu jadwal tunggal sejumlah grandTotalAmount.
 * 3. POST ke FIN_Payment_Schedule untuk setiap baris.
 *
 * Field yang di-POST (mengacu contoh GET):
 *   invoice, organization, dueDate, expectedDate, finPaymentmethod,
 *   currency, amount, paidAmount, outstandingAmount,
 *   active, updatePaymentPlan, numberOfPayments
 */
export async function createPaymentPlan(invoiceId, invoiceData) {
  const extractId = (v) => (v && typeof v === 'object') ? v.id : (v || null)

  const orgId       = extractId(invoiceData.organization) || DEFAULT_ORGANIZATION
  const curId       = extractId(invoiceData.currency)     || DEFAULT_CURRENCY
  const ptId        = extractId(invoiceData.paymentTerms)
  const invoiceDate = invoiceData.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  const totalAmount = Number(invoiceData.grandTotalAmount) || 0

  // ── Resolve Payment Method — wajib tidak null ──
  // Openbravo can return this as: paymentMethod (object/id), finPaymentmethod, or fin_paymentmethod_id
  let pmId = extractId(invoiceData.paymentMethod)
    || extractId(invoiceData.finPaymentmethod)
    || (typeof invoiceData.paymentMethod === 'string' && invoiceData.paymentMethod ? invoiceData.paymentMethod : null)
    || null
  console.log('[createPaymentPlan] pmId from invoiceData:', pmId, '| paymentMethod field:', invoiceData.paymentMethod)

  if (!pmId) {
    // Try from businessPartner
    const bpId = extractId(invoiceData.businessPartner)
    if (bpId) {
      try {
        const bpRes = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`)
        const bp = (bpRes.data?.response?.data ?? [])[0] ?? bpRes.data?.response?.data
        pmId = extractId(bp?.paymentMethod) || extractId(bp?.fin_paymentmethod_id)
        if (pmId) console.log('[createPaymentPlan] PM from BP:', pmId)
      } catch (e) {
        console.warn('[createPaymentPlan] BP fetch failed:', e.message)
      }
    }
  }

  if (!pmId) {
    // Last resort: fetch first active payment method from system
    try {
      const pmRes = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', {
        params: { _where: 'e.active = true', _startRow: 0, _endRow: 1 },
      })
      pmId = pmRes.data?.response?.data?.[0]?.id ?? null
      if (pmId) console.log('[createPaymentPlan] PM fallback from system:', pmId)
    } catch (e) {
      console.warn('[createPaymentPlan] PM system fetch failed:', e.message)
    }
  }

  if (!pmId) {
    throw new Error('Payment Method tidak ditemukan untuk invoice ini. Pastikan customer memiliki Payment Method yang valid.')
  }

  // ── Hitung jadwal berdasarkan Payment Term Lines ──
  let schedules = []

  if (ptId) {
    try {
      const termLinesRes = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTermLine', {
        params: {
          _where: `e.paymentTerms.id = '${ptId}'`,
          _startRow: 0,
          _endRow: 50,
          _orderBy: 'e.line asc',
        },
      })
      const termLines = termLinesRes.data?.response?.data ?? []

      if (termLines.length > 0) {
        let remaining = totalAmount
        termLines.forEach((tl, idx) => {
          const offsetDays = Number(tl.offsetDays ?? tl.netDays ?? tl.dueDateOffset ?? tl.dayOffset ?? 0)
          const dueDate = addDays(invoiceDate, offsetDays)

          let lineAmount
          if (idx === termLines.length - 1) {
            // Baris terakhir: pakai sisa supaya tidak ada selisih pembulatan
            lineAmount = remaining
          } else {
            const pct = Number(tl.percentage ?? tl.fixedPercentage ?? 0)
            const fixed = Number(tl.fixedAmount ?? tl.amount ?? 0)
            lineAmount = pct > 0 ? Math.round(totalAmount * pct / 100) : (fixed || remaining)
          }
          remaining -= lineAmount

          schedules.push({ dueDate, amount: lineAmount })
        })
      }
    } catch (e) {
      console.warn('[createPaymentPlan] Gagal fetch payment term lines:', e.message)
    }
  }

  // ── Fallback: satu jadwal penuh ──
  if (schedules.length === 0) {
    schedules = [{ dueDate: invoiceDate, amount: totalAmount }]
  }

  // ── POST setiap jadwal ──
  const created = []
  for (const sched of schedules) {
    const payload = {
      _entityName:       'FIN_Payment_Schedule',
      organization:      orgId,
      invoice:           invoiceId,
      dueDate:           sched.dueDate,
      expectedDate:      sched.dueDate,
      currency:          curId,
      amount:            sched.amount,
      paidAmount:        0,
      outstandingAmount: sched.amount,
      active:            true,
      updatePaymentPlan: true,
      numberOfPayments:  0,
      finPaymentmethod:  pmId,  // required NOT NULL
    }

    try {
      const res = await api.post(PAY_SCHED_BASE, { data: payload })
      const raw = res.data?.response?.data
      created.push(Array.isArray(raw) ? raw[0] : raw)
      console.log('[createPaymentPlan] Created schedule:', sched.dueDate, sched.amount)
    } catch (e) {
      console.error('[createPaymentPlan] Gagal POST schedule:', e.message, JSON.stringify(e.response?.data))
      throw new Error(`Gagal membuat payment plan (${sched.dueDate}): ${e?.response?.data?.response?.error?.message || e.message}`)
    }
  }

  return created
}

// ── Helper: tambah hari ke date string "YYYY-MM-DD" ──
function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ════════════════════════════════════════════════════
// CANCEL INVOICE
// Alur:
//   1. Validasi — tolak jika sudah ada Payment In atau Financial Account Transaction
//   2. (Opsional) Unpost jurnal accounting jika invoice sudah di-Post
//   3. Reactivate ke Draft (CO → DR)
//   4. Set semua invoicedQuantity di invoice lines menjadi 0
//   5. Tutup invoice dengan documentStatus = 'CL'
// ════════════════════════════════════════════════════
const FINACC_TXN_CHECK_BASE = '/org.openbravo.service.json.jsonrest/FIN_Finacc_Transaction'
const PAY_SCHED_DETAIL_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail'

export async function cancelInvoice(invoiceId, invoiceData) {
  if (!['CO', 'DR'].includes(invoiceData?.documentStatus)) {
    throw new Error(`Invoice tidak bisa di-Cancel dari status "${invoiceData?.documentStatus}".`)
  }

  let iotError = null

  // ── Step 1a: Cek apakah sudah ada Payment In yang terhubung ke invoice ini ──
  // Caranya: cari FIN_Payment_ScheduleDetail yang merujuk ke schedule invoice ini,
  // lalu cek apakah paymentDetails.finPayment masih aktif (status bukan RPAP kosong)
  try {
    const schedRes = await api.get(PAY_SCHED_BASE, {
      params: {
        _where:    `e.invoice.id = '${invoiceId}'`,
        _startRow: 0,
        _endRow:   50,
        _selectedProperties: 'id',
      },
    })
    const schedules = schedRes.data?.response?.data ?? []
    if (schedules.length > 0) {
      const schedIds = schedules.map(s => `'${s.id}'`).join(',')
      const detailRes = await api.get(PAY_SCHED_DETAIL_BASE, {
        params: {
          _where:    `e.invoicePaymentSchedule.id in (${schedIds}) and e.canceled = false`,
          _startRow: 0,
          _endRow:   1,
          _selectedProperties: 'id,amount,invoicePaymentSchedule',
        },
      })
      const details = detailRes.data?.response?.data ?? []
      if (details.length > 0) {
        throw new Error(
          'Invoice ini tidak bisa di-Cancel karena sudah memiliki Payment In yang terhubung. ' +
          'Hapus atau batalkan Payment In terkait terlebih dahulu sebelum melakukan Cancel.'
        )
      }
    }
  } catch (e) {
    // Re-throw error validasi, abaikan error network/query
    if (e.message?.includes('Payment In')) throw e
    console.warn('[cancelInvoice] Cek Payment In gagal (diabaikan):', e.message)
  }

  // ── Step 1b: Cek apakah sudah ada Financial Account Transaction untuk invoice ini ──
  // FIN_Finacc_Transaction terhubung ke invoice melalui finPayment, dan finPayment
  // terhubung ke invoice melalui FIN_Payment_ScheduleDetail.
  // Cara lebih langsung: cek via finPayment yang terhubung ke schedule detail invoice ini.
  try {
    const schedRes2 = await api.get(PAY_SCHED_BASE, {
      params: {
        _where:    `e.invoice.id = '${invoiceId}'`,
        _startRow: 0,
        _endRow:   50,
        _selectedProperties: 'id',
      },
    })
    const schedules2 = schedRes2.data?.response?.data ?? []
    if (schedules2.length > 0) {
      const schedIds2 = schedules2.map(s => `'${s.id}'`).join(',')
      // Ambil payment IDs dari schedule detail yang tidak di-cancel
      const detailRes2 = await api.get(PAY_SCHED_DETAIL_BASE, {
        params: {
          _where:    `e.invoicePaymentSchedule.id in (${schedIds2}) and e.canceled = false`,
          _startRow: 0,
          _endRow:   50,
          _selectedProperties: 'id,paymentDetails',
        },
      })
      const details2 = detailRes2.data?.response?.data ?? []
      if (details2.length > 0) {
        // Sudah dicek di step 1a — jika sampai sini ada details2, berarti ada payment
        // Step ini sebagai double-check sekaligus cek Finacc Transaction via finPayment
        const paymentIds = [...new Set(
          details2
            .map(d => {
              const pd = d.paymentDetails
              return typeof pd === 'object' ? pd?.finPayment?.id ?? pd?.finPayment : null
            })
            .filter(Boolean)
        )]
        if (paymentIds.length > 0) {
          const payIdList = paymentIds.map(id => `'${id}'`).join(',')
          const txnRes = await api.get(FINACC_TXN_CHECK_BASE, {
            params: {
              _where:    `e.finPayment.id in (${payIdList})`,
              _startRow: 0,
              _endRow:   1,
              _selectedProperties: 'id,finPayment',
            },
          })
          const txns = txnRes.data?.response?.data ?? []
          if (txns.length > 0) {
            throw new Error(
              'Invoice ini tidak bisa di-Cancel karena sudah tercatat di Financial Account Transaction. ' +
              'Batalkan transaksi keuangan terkait terlebih dahulu sebelum melakukan Cancel.'
            )
          }
        }
      }
    }
  } catch (e) {
    if (e.message?.includes('Financial Account Transaction')) throw e
    console.warn('[cancelInvoice] Cek Financial Account Transaction gagal (diabaikan):', e.message)
  }

  const isPostedFlag = invoiceData?.posted === true || invoiceData?.posted === 'Y'

  // ── Step 2: Jika sudah di-post, hapus jurnal accounting (Unpost) ──
  if (isPostedFlag) {
    const factsRes = await api.get(FACT_BASE, {
      params: {
        _where:    `e.recordID = '${invoiceId}' and e.table.id = '318'`,
        _startRow: 0,
        _endRow:   200,
      },
    })
    const facts = factsRes.data?.response?.data ?? []
    await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))

    await api.put(`${INV_BASE}/${invoiceId}`, {
      data: {
        id:          invoiceId,
        _entityName: 'Invoice',
        documentNo:  invoiceData.documentNo,
        posted:      'N',
      },
    })
  }

  // ── Step 3: Jika status CO, kembalikan ke Draft (Reactivate) ──
  if (invoiceData?.documentStatus === 'CO') {
    const reactivateRes = await api.put(`${INV_BASE}/${invoiceId}`, {
      data: {
        id:             invoiceId,
        _entityName:    'Invoice',
        documentNo:     invoiceData.documentNo,
        documentStatus: 'DR',
        documentAction: 'CO',
        processed:      'N',
      },
    })
    const st = reactivateRes.data?.response?.status
    if (st !== undefined && st < 0) {
      throw new Error(reactivateRes.data?.response?.error?.message || 'Reactivate saat Cancel gagal.')
    }

    // Hapus payment schedules agar tidak menggantung
    try {
      await deletePaymentSchedules(invoiceId)
    } catch (e) {
      console.warn('[cancelInvoice] Gagal hapus payment schedules:', e.message)
    }

    // Sync status Back to Draft ke IoT/PSI
    try {
      await backToDraftIot(invoiceId)
    } catch (e) {
      iotError = e.message
      console.warn('[cancelInvoice] Back to Draft IoT gagal:', e.message)
    }
  }

  // ── Step 4: Set semua invoicedQuantity di invoice lines menjadi 0 ──
  const linesRes = await api.get(LINE_BASE, {
    params: {
      _where:    `e.invoice.id = '${invoiceId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  const invoiceLines = linesRes.data?.response?.data ?? []

  for (const line of invoiceLines) {
    await api.put(`${LINE_BASE}/${line.id}`, {
      data: {
        id:               line.id,
        _entityName:      'InvoiceLine',
        invoicedQuantity: 0,
        lineNetAmount:    0,
        grossUnitPrice:   line.grossUnitPrice ?? line.unitPrice ?? 0,
        unitPrice:        line.unitPrice ?? 0,
        listPrice:        line.listPrice ?? line.unitPrice ?? 0,
      },
    })
  }

  // ── Step 5: Tutup invoice → documentStatus = 'CL' ──
  const closeRes = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentNo:     invoiceData.documentNo,
      documentStatus: 'CL',
      documentAction: 'CL',
    },
  })
  const closeSt = closeRes.data?.response?.status
  if (closeSt !== undefined && closeSt < 0) {
    throw new Error(closeRes.data?.response?.error?.message || 'Menutup invoice (CL) gagal.')
  }

  const invoice = await fetchInvoice(invoiceId)
  return { invoice, iotError }
}


// ════════════════════════════════════════════════════
// ADJUSTMENT
// Mirip Cancel namun:
//  - Invoice dikembalikan ke Draft (bukan CL)
//  - Ditambahkan satu line baru: product Adjustment, qty -1,
//    unitPrice = grandTotalAmount invoice, tax = Free Tax (0%)
// ════════════════════════════════════════════════════

// Cari Tax Rate dengan name mengandung "Free" atau rate = 0
let _freeTaxId = null
export async function fetchFreeTaxId() {
  if (_freeTaxId) return _freeTaxId
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtTaxRate', {
    params: {
      _where:    `e.active = true and (upper(e.name) like upper('%free%') or e.rate = 0)`,
      _startRow: 0,
      _endRow:   10,
      _orderBy:  'e.name asc',
    },
  })
  const list = res.data?.response?.data ?? []
  if (!list.length) throw new Error('Free Tax (rate 0%) tidak ditemukan di sistem.')
  _freeTaxId = list[0].id
  return _freeTaxId
}

export async function adjustmentInvoice(invoiceId, invoiceData) {
  if (!['CO', 'DR'].includes(invoiceData?.documentStatus)) {
    throw new Error(`Invoice tidak bisa di-Adjustment dari status "${invoiceData?.documentStatus}".`)
  }

  const isPostedFlag = invoiceData?.posted === true || invoiceData?.posted === 'Y'

  // Step 1: Jika sudah di-post, Unpost dulu
  if (isPostedFlag) {
    const factsRes = await api.get(FACT_BASE, {
      params: {
        _where:    `e.recordID = '${invoiceId}' and e.table.id = '318'`,
        _startRow: 0,
        _endRow:   200,
      },
    })
    const facts = factsRes.data?.response?.data ?? []
    await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))
    await api.put(`${INV_BASE}/${invoiceId}`, {
      data: { id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo, posted: 'N' },
    })
  }

  // Step 2: Jika status CO, kembalikan ke Draft
  if (invoiceData?.documentStatus === 'CO') {
    const reactivateRes = await api.put(`${INV_BASE}/${invoiceId}`, {
      data: {
        id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo,
        documentStatus: 'DR', documentAction: 'CO', processed: 'N',
      },
    })
    const st = reactivateRes.data?.response?.status
    if (st !== undefined && st < 0) {
      throw new Error(reactivateRes.data?.response?.error?.message || 'Reactivate saat Adjustment gagal.')
    }
    try { await deletePaymentSchedules(invoiceId) } catch (e) {
      console.warn('[adjustmentInvoice] Gagal hapus payment schedules:', e.message)
    }
  }

  // Step 3: Tentukan lineNo berikutnya
  const linesRes = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 200, _orderBy: 'e.lineNo desc' },
  })
  const existingLines = linesRes.data?.response?.data ?? []
  const maxLineNo = existingLines.reduce((max, l) => Math.max(max, l.lineNo || 0), 0)
  const nextLineNo = maxLineNo + 10

  // Step 4: Cari Free Tax ID
  const freeTaxId = await fetchFreeTaxId()

  // Step 5: Tambah line Adjustment: qty -1, unitPrice = grandTotalAmount
  const adjustAmount = invoiceData.grandTotalAmount ?? 0
  const getId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const bpId  = getId(invoiceData.businessPartner)
  const orgId = getId(invoiceData.organization) || DEFAULT_ORGANIZATION

  await api.post(LINE_BASE, {
    data: {
      _entityName:      'InvoiceLine',
      invoice:          invoiceId,
      organization:     orgId,
      lineNo:           nextLineNo,
      product:          ADJUSTMENT_PRODUCT_ID,
      uOM:              ADJUSTMENT_UOM_ID,
      invoicedQuantity: -1,
      unitPrice:        adjustAmount,
      listPrice:        adjustAmount,
      grossUnitPrice:   adjustAmount,
      lineNetAmount:    -adjustAmount,
      discount:         0,
      tax:              freeTaxId,
      ...(bpId && { businessPartner: bpId }),
    },
  })

  const invoice = await fetchInvoice(invoiceId)
  return { invoice }
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