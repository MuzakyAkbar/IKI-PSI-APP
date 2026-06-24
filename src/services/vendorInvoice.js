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

// Error interceptor — must be registered immediately after api creation
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      const msg = res.data?.response?.error?.message
      if (msg) throw new Error(msg)
    }
    return res
  },
  (err) => {
    console.error('[VendorInvoice HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

const fkWrap = (val) => (val ? { id: val } : undefined)
const today = () => new Date().toISOString().slice(0, 10)


// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════
export const AP_INVOICE_DOCTYPE_ID = '7C138667263E4818AC96EBDF41557D33' // AP Invoice
export const DEFAULT_ORGANIZATION  = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CURRENCY      = '303'                               // IDR
export const DEFAULT_PRICE_LIST    = '90D80A99C19046C3ADC0ED0759E3F648' // Purchase Price IDR
export const DEFAULT_TAX_ID        = 'F3F273F648784C858549A45FF0A69AFA'

// ════════════════════════════════════════════════════
// INVOICE HEADER
// ════════════════════════════════════════════════════
const INV_BASE = '/org.openbravo.service.json.jsonrest/Invoice'

// ════════════════════════════════════════════════════
// GENERATE DOCUMENT NUMBER
// Format : VI-YYYY/MM-NNNN  (contoh: VI-2025/06-0042)
// ════════════════════════════════════════════════════
export async function generateDocumentNo() {
  const now    = new Date()
  const year   = now.getFullYear()
  const month  = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `VI-${year}/${month}-`

  // Filter e.documentNo != '' untuk skip invoice lama yang tidak punya nomor
  // Gunakan 'like' biasa — karakter '/' aman di HQL Openbravo
  try {
    const res = await api.get(INV_BASE, {
      params: {
        _where: `e.salesTransaction = false and e.documentType.id = '${AP_INVOICE_DOCTYPE_ID}' and e.documentNo != '' and e.documentNo is not null and e.documentNo like '${prefix}%'`,
        _startRow: 0,
        _endRow: 1,
        _orderBy: 'e.documentNo desc',
        _selectedProperties: 'documentNo',
      },
    })
    const data = res.data?.response?.data ?? []
    if (data.length > 0) {
      const lastNo  = data[0].documentNo || ''
      const seqPart = lastNo.substring(prefix.length)
      const seq     = parseInt(seqPart, 10)
      if (!isNaN(seq) && seq > 0) {
        return prefix + String(seq + 1).padStart(4, '0')
      }
    }
  } catch (e) {
    console.warn('[generateDocumentNo] Query gagal, fallback ke 0001:', e.message)
  }

  return prefix + '0001'
}

export async function fetchAllInvoices({ startRow = 0, pageSize = 20, searchKey = '', sortCol = 'invoiceDate', sortDir = 'desc' } = {}) {
  let where = `e.salesTransaction = false and e.documentType.id = '${AP_INVOICE_DOCTYPE_ID}'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }

  // 1. Format _sortBy (Standar DataSource Openbravo)
  let sortBy = (sortDir === 'desc' ? '-' : '') + sortCol
  if (sortCol !== 'documentNo') sortBy += ',-documentNo'

  // 2. Format _orderBy (Standar HQL Openbravo fallback)
  let orderBy = `e.${sortCol} ${sortDir}`
  if (sortCol !== 'documentNo') orderBy += `, e.documentNo desc`

  const res = await api.get(INV_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _noCount: false,
      _sortBy: sortBy,      // <--- Parameter sort dari klik tabel
      _orderBy: orderBy,    // <--- Fallback query
      _where: where,
      _selectedProperties: 'id,documentNo,invoiceDate,accountingDate,businessPartner,businessPartner$_identifier,partnerAddress,partnerAddress$_identifier,paymentTerms,paymentTerms$_identifier,paymentMethod,paymentMethod$_identifier,priceList,priceList$_identifier,grandTotalAmount,summedLineAmount,documentStatus,posted,organization,organization$_identifier,orderReference,description,currency,currency$_identifier',
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchInvoice(id) {
  const FIELDS = [
    'id', 'documentNo', 'documentStatus', 'documentAction', 'processed', 'posted',
    'invoiceDate', 'accountingDate', 'orderReference', 'description',
    'salesTransaction', 'summedLineAmount', 'grandTotalAmount',
    'organization', 'organization$_identifier',
    'businessPartner', 'businessPartner$_identifier',
    'partnerAddress', 'partnerAddress$_identifier',
    'paymentTerms', 'paymentTerms$_identifier',
    'paymentMethod', 'paymentMethod$_identifier',
    'priceList', 'priceList$_identifier',
    'currency', 'currency$_identifier',
    'documentType', 'documentType$_identifier',
  ].join(',')
  const res = await api.get(INV_BASE, {
    params: {
      _where: `e.id = '${id}'`,
      _startRow: 0,
      _endRow: 1,
      _selectedProperties: FIELDS,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createInvoice(data) {
  // Auto-generate documentNo jika belum diisi
  if (!data.documentNo) {
    data = { ...data, documentNo: await generateDocumentNo() }
  }
  const payload = buildInvoicePayload(data)
  const res = await api.post(INV_BASE, {
    data: { _entityName: 'Invoice', salesTransaction: false, ...payload },
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
  const docStatus = r.documentStatus

  // Jika invoice sudah Complete (CO), harus di-Void dulu sebelum bisa dihapus/dinon-aktifkan.
  // Direct active=false akan gagal dengan "associated with other existing elements".
  if (docStatus === 'CO') {
    const voidRes = await api.put(`${INV_BASE}/${id}`, {
      data: {
        id,
        _entityName:    'Invoice',
        documentNo:     r.documentNo,
        documentAction: 'VO',
      },
    })
    const voidSt = voidRes.data?.response?.status
    if (voidSt !== undefined && voidSt < 0) {
      throw new Error(voidRes.data?.response?.error?.message || 'Void sebelum delete gagal.')
    }
  }

  // Setelah Void (atau jika masih Draft), set active=false
  const res = await api.put(`${INV_BASE}/${id}`, {
    data: { id, _entityName: 'Invoice', active: false, documentNo: r.documentNo },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Delete Invoice gagal.')
  }
  return res.data?.response?.data ?? res.data
}

export async function postInvoice(data) {
  const getId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))

  const orgId = getId(data.organization)  || DEFAULT_ORGANIZATION
  const bpId  = getId(data.businessPartner)
  const paId  = getId(data.partnerAddress)
  const ptId  = getId(data.paymentTerms)
  const pmId  = getId(data.paymentMethod)
  const curId = getId(data.currency)      || DEFAULT_CURRENCY
  const plId  = getId(data.priceList)     || DEFAULT_PRICE_LIST

  // Auto-generate documentNo — postInvoice dipanggil saat duplicate/copy invoice
  const docNo = data.documentNo || await generateDocumentNo()

  const res = await api.post(INV_BASE, {
    data: {
      _entityName:         'Invoice',
      salesTransaction:    false,
      documentType:        { id: AP_INVOICE_DOCTYPE_ID },
      transactionDocument: { id: AP_INVOICE_DOCTYPE_ID },
      organization:        { id: orgId },
      currency:            { id: curId },
      priceList:           { id: plId },
      documentNo:          docNo,
      ...(bpId && { businessPartner: { id: bpId } }),
      ...(paId && { partnerAddress:  { id: paId } }),
      ...(ptId && { paymentTerms:    { id: ptId } }),
      ...(pmId && { paymentMethod:   { id: pmId } }),
      documentCategory:    'API',
      invoiceDate:         data.invoiceDate    || today(),
      accountingDate:      data.accountingDate || data.invoiceDate || today(),
      ...(data.description    && { description:    data.description }),
      ...(data.orderReference && { orderReference: data.orderReference }),
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
  } = data

  return {
    documentType:        { id: AP_INVOICE_DOCTYPE_ID },
    transactionDocument: { id: transactionDocument || AP_INVOICE_DOCTYPE_ID },
    documentCategory:    'API',
    organization:        { id: organization || DEFAULT_ORGANIZATION },
    currency:            { id: currency     || DEFAULT_CURRENCY },
    priceList:           { id: priceList    || DEFAULT_PRICE_LIST },
    salesTransaction:    false,
    documentStatus:      'DR',
    documentAction:      'CO',
    documentNo,
    ...(businessPartner && { businessPartner: fkWrap(businessPartner) }),
    ...(partnerAddress  && { partnerAddress:  fkWrap(partnerAddress)  }),
    ...(paymentTerms    && { paymentTerms:    fkWrap(paymentTerms)    }),
    ...(paymentMethod   && { paymentMethod:   fkWrap(paymentMethod)   }),
    ...(invoiceDate     && { invoiceDate, accountingDate: accountingDate || invoiceDate }),
    ...(description     && { description }),
    ...(orderReference  && { orderReference }),
  }
}

// ════════════════════════════════════════════════════
// INVOICE LINE
// ════════════════════════════════════════════════════
const LINE_BASE = '/org.openbravo.service.json.jsonrest/InvoiceLine'
const FACT_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'

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
  // Openbravo JSON REST expects plain string IDs for InvoiceLine fields (not { id: } wrapped)
  const xId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const res = await api.post(LINE_BASE, {
    data: {
      _entityName:      'InvoiceLine',
      invoice:          invoiceId,
      organization:     xId(data.organization) || DEFAULT_ORGANIZATION,
      lineNo:           data.lineNo,
      invoicedQuantity: data.invoicedQuantity,
      unitPrice:        data.unitPrice,
      ...(data.product         && { product:         xId(data.product) }),
      ...(data.uOM             && { uOM:             xId(data.uOM) }),
      ...(data.tax             && { tax:             xId(data.tax) }),
      ...(data.taxCategory     && { taxCategory:     xId(data.taxCategory) }),
      ...(data.businessPartner && { businessPartner: xId(data.businessPartner) }),
      ...(data.lineNetAmount != null && { lineNetAmount:  data.lineNetAmount }),
      ...(data.listPrice     != null && { listPrice:      data.listPrice }),
      ...(data.grossUnitPrice!= null && { grossUnitPrice: data.grossUnitPrice }),
      ...(data.discount      != null && { discount:       data.discount }),
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
      ...(data.lineNetAmount != null && { lineNetAmount:  data.lineNetAmount }),
      ...(data.listPrice     != null && { listPrice:      data.listPrice }),
      ...(data.grossUnitPrice!= null && { grossUnitPrice: data.grossUnitPrice }),
      ...(data.discount      != null && { discount:       data.discount }),
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
  const res = await api.get(FACT_BASE, {
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

// Vendor search (vendor = true)
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

export async function fetchVendorById(id) {
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
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true and e.salesPriceList = false' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchProducts(search = '') {
  let where = `e.purchase = true and e.active = true`
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
// ════════════════════════════════════════════════════
// COMPLETE VIA PUT — dipanggil setelah header+lines berhasil POST
// ════════════════════════════════════════════════════
export async function completeInvoiceViaPUT(invoiceId, documentNo) {
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentNo:     documentNo,
      documentStatus: 'CO',
      documentAction: 'CL',
      processed:      true,
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Complete Invoice gagal.')
  }
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function runInvoiceProcess(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'DR') {
    throw new Error(`Invoice sudah dalam status "${invoiceData?.documentStatus}", tidak bisa di-Complete.`)
  }

  // Validasi: harus ada minimal 1 invoice line
  const linesCheck = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 1 },
  })
  if ((linesCheck.data?.response?.data ?? []).length === 0) {
    throw new Error('Invoice harus memiliki minimal satu baris item sebelum bisa di-Complete.')
  }

  // Buat Payment Plan => INSERT FIN_Payment_Schedule
  try {
    await createPaymentPlan(invoiceId, invoiceData)
  } catch (e) {
    console.warn('[runInvoiceProcess] Pembuatan Payment Plan gagal:', e.message)
  }

  // UPDATE C_INVOICE: DocStatus='CO', Processed='Y', DocAction='RE', outstandingAmount
  const grandTotal = Number(invoiceData.grandTotalAmount) || 0
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:               invoiceId,
      _entityName:      'Invoice',
      documentStatus:   'CO',
      documentAction:   'RE',
      processed:        true,
      outstandingAmount: grandTotal,
      totalPaid:        0,
      paymentComplete:  false,
    },
  })

  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Complete Invoice gagal.')
  }

  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}



// ════════════════════════════════════════════════════
// POST ACCOUNTING
// ════════════════════════════════════════════════════
const INVOICE_TABLE_ID = '318'

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
    accountId, combId: rec.id,
    value: rec.combination || rec.alias || parts[0] || '',
    accountingEntryDescription: parts.slice(1).join(' - ') || '',
  }
}

async function fetchDefaultAcctSchema(orgId) {
  const tryOrg = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema', {
    params: { _where: `e.active = true`, _startRow: 0, _endRow: 10 },
  })
  const list = tryOrg.data?.response?.data ?? []
  return list.find(s => {
    const sOrg = s.organization?.id ?? s.organization
    return sOrg === orgId
  }) ?? list[0] ?? null
}

async function fetchPeriodForDate(dateStr, schemaId) {
  if (!dateStr) return null
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPeriod', {
    params: {
      _where: `e.periodType = 'M' and e.startingDate <= '${dateStr}' and e.endingDate >= '${dateStr}'`,
      _startRow: 0, _endRow: 5,
    },
  })
  const list = res.data?.response?.data ?? []
  return list[0] ?? null
}

async function fetchProductAcct(productId, schemaId) {
  const entityNames = ['ProductAccounts', 'FinancialMgmtProductAcct', 'MaterialMgmtProductAcct', 'M_Product_Acct']
  const whereBase = schemaId
    ? `e.product.id = '${productId}' and e.accountingSchema.id = '${schemaId}'`
    : `e.product.id = '${productId}'`
  for (const entityName of entityNames) {
    try {
      const res = await api.get(`/org.openbravo.service.json.jsonrest/${entityName}`, {
        params: { _where: whereBase, _startRow: 0, _endRow: 1 },
      })
      const data = res.data?.response?.data ?? []
      if (data.length > 0) return data[0]
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

  const extractId = (v) => (v && typeof v === 'object') ? v.id : (v || null)
  const orgId    = extractId(invoiceData.organization) || DEFAULT_ORGANIZATION
  const clientId = extractId(invoiceData.client)       || '53AD31E21D624632B2F171194EC6E887'
  const curId    = extractId(invoiceData.currency)     || DEFAULT_CURRENCY
  const docTypeId = extractId(invoiceData.documentType)
  const accDate  = invoiceData.accountingDate || invoiceData.invoiceDate
  const txDate   = invoiceData.invoiceDate
  const groupID  = invoiceId.replace(/-/g, '').slice(0, 32).toUpperCase()

  let schemaId = null, schemaRec = null
  schemaRec = await fetchDefaultAcctSchema(orgId)
  schemaId  = schemaRec?.id ?? null

  let periodId = null
  if (accDate) {
    const period = await fetchPeriodForDate(accDate, schemaId)
    periodId = period?.id ?? null
  }

  const linesRes = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 200, _orderBy: 'e.lineNo asc' },
  })
  const lines = linesRes.data?.response?.data ?? []
  if (lines.length === 0) throw new Error('Tidak ada invoice lines untuk di-post.')

  // AP: CREDIT Payable (liability), DEBIT Expense/COGS
  let apAccount = null
  if (schemaRec) {
    const apCombId = extractId(schemaRec.payables)
      || extractId(schemaRec.vendorPayables)
      || extractId(schemaRec.notFinRecPayables)
    if (apCombId) apAccount = await resolveAcctCombination(apCombId)
  }

  let seqNo = 10
  for (const line of lines) {
    const lineNo  = line.lineNo ?? seqNo
    const amount  = Number(line.lineNetAmount) || 0
    const lineDesc = line.description || invoiceData.description || invoiceData.documentNo || ''
    const productId = extractId(line.product)

    let expenseAccount = null
    if (productId) {
      const productAcct = await fetchProductAcct(productId, schemaId)
      if (productAcct) {
        const expCombId = extractId(productAcct.pExpenseAcct)
          || extractId(productAcct.expense)
          || extractId(productAcct.productExpense)
          || extractId(productAcct.p_expense_acct)
        if (expCombId) expenseAccount = await resolveAcctCombination(expCombId)
      }
    }

    const buildFact = (isDebit) => ({
      _entityName: 'FinancialMgmtAccountingFact',
      client: { id: clientId },
      organization: { id: orgId },
      ...(schemaId  && { accountingSchema: { id: schemaId } }),
      transactionDate: txDate,
      accountingDate:  accDate,
      ...(periodId  && { period: { id: periodId } }),
      table:    { id: INVOICE_TABLE_ID },
      recordID: invoiceId,
      lineID:   line.id,
      postingType: 'A',
      currency: { id: curId },
      foreignCurrencyDebit:  isDebit ? amount : 0,
      foreignCurrencyCredit: isDebit ? 0 : amount,
      debit:  isDebit ? amount : 0,
      credit: isDebit ? 0 : amount,
      quantity: 0,
      description: `${invoiceData.documentNo} # ${lineNo} ${lineDesc}`.trim(),
      groupID,
      sequenceNumber: seqNo,
      type: 'N',
      documentCategory: 'API',
      ...(docTypeId && { documentType: { id: docTypeId } }),
      active: true,
    })

    // DEBIT — Expense/COGS
    if (expenseAccount?.accountId) {
      await api.post(FACT_BASE, {
        data: {
          ...buildFact(true),
          account: { id: expenseAccount.accountId },
          ...(expenseAccount.combId && { accountingCombination: { id: expenseAccount.combId } }),
          value: expenseAccount.value,
          accountingEntryDescription: expenseAccount.accountingEntryDescription,
        },
      })
      seqNo += 10
    }

    // CREDIT — AP Payable
    if (apAccount?.accountId) {
      await api.post(FACT_BASE, {
        data: {
          ...buildFact(false),
          account: { id: apAccount.accountId },
          ...(apAccount.combId && { accountingCombination: { id: apAccount.combId } }),
          value: apAccount.value,
          accountingEntryDescription: apAccount.accountingEntryDescription,
        },
      })
      seqNo += 10
    }
    seqNo += 10
  }

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
// UNPOST
// ════════════════════════════════════════════════════
export async function unpostAccountingProcess(invoiceId, invoiceData) {
  const isPosted = invoiceData?.posted === true || invoiceData?.posted === 'Y'
  if (!isPosted) throw new Error(`Invoice belum di-Post, tidak bisa di-Unpost.`)

  const factsRes = await api.get(FACT_BASE, {
    params: { _where: `e.recordID = '${invoiceId}' and e.table.id = '318'`, _startRow: 0, _endRow: 200 },
  })
  const facts = factsRes.data?.response?.data ?? []
  await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))

  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: { id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo, posted: 'N' },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) throw new Error(res.data?.response?.error?.message || 'Unpost Invoice gagal.')
  return await fetchInvoice(invoiceId)
}

// ════════════════════════════════════════════════════
// REACTIVATE
// ════════════════════════════════════════════════════
export async function reactivateInvoice(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'CO') {
    throw new Error(`Invoice harus berstatus Complete (CO) untuk di-Reactivate. Status saat ini: "${invoiceData?.documentStatus}"`)
  }

  // DELETE FIN_Payment_Schedule (sama dengan customer)
  try {
    await deletePaymentSchedules(invoiceId)
  } catch (e) {
    console.warn('[reactivateInvoice] Gagal hapus payment schedules:', e.message)
  }

  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentStatus: 'DR',
      documentAction: 'CO',
      processed:      false,
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) throw new Error(res.data?.response?.error?.message || 'Reactivate Invoice gagal.')
  return await fetchInvoice(invoiceId)
}

// ════════════════════════════════════════════════════
// VOID
// ════════════════════════════════════════════════════
export async function voidInvoice(invoiceId, invoiceData) {
  if (!['CO', 'DR'].includes(invoiceData?.documentStatus)) {
    throw new Error(`Invoice tidak bisa di-Void dari status "${invoiceData?.documentStatus}".`)
  }
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: { id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo, documentAction: 'VO' },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) throw new Error(res.data?.response?.error?.message || 'Void Invoice gagal.')
  return await fetchInvoice(invoiceId)
}
// ════════════════════════════════════════════════════
// PAYMENT PLAN  (tabel: FIN_Payment_Schedule)
// ════════════════════════════════════════════════════
const PAY_SCHED_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule'

export async function deletePaymentSchedules(invoiceId) {
  const res       = await api.get(PAY_SCHED_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 50 },
  })
  const schedules = res.data?.response?.data ?? []
  for (const sched of schedules) {
    await api.delete(`${PAY_SCHED_BASE}/${sched.id}`)
  }
}

export async function fetchPaymentSchedules(invoiceId) {
  const res = await api.get(PAY_SCHED_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 50, _orderBy: 'e.dueDate asc' },
  })
  return res.data?.response?.data ?? []
}

/**
 * Buat FIN_Payment_Schedule setelah invoice di-Complete.
 * salesTransaction = false (AP / Vendor Invoice)
 */
export async function createPaymentPlan(invoiceId, invoiceData) {
  const extractId   = (v) => (v && typeof v === 'object') ? v.id : (v || null)
  const orgId       = extractId(invoiceData.organization) || DEFAULT_ORGANIZATION
  const curId       = extractId(invoiceData.currency)     || DEFAULT_CURRENCY
  const ptId        = extractId(invoiceData.paymentTerms)
  const invoiceDate = invoiceData.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  const totalAmount = Number(invoiceData.grandTotalAmount) || 0

  // Resolve Payment Method
  let pmId = extractId(invoiceData.paymentMethod) || extractId(invoiceData.finPaymentmethod) || null

  if (!pmId) {
    const bpId = extractId(invoiceData.businessPartner)
    if (bpId) {
      try {
        const bpRes = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`)
        const bp    = (bpRes.data?.response?.data ?? [])[0] ?? bpRes.data?.response?.data
        pmId        = extractId(bp?.pOPaymentMethod) || extractId(bp?.paymentMethod) || extractId(bp?.fin_paymentmethod_id)
      } catch (e) {
        console.warn('[createPaymentPlan] BP fetch failed:', e.message)
      }
    }
  }

  if (!pmId) {
    try {
      const pmRes = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', {
        params: { _where: 'e.active = true', _startRow: 0, _endRow: 1 },
      })
      pmId = pmRes.data?.response?.data?.[0]?.id ?? null
    } catch (e) {
      console.warn('[createPaymentPlan] PM system fetch failed:', e.message)
    }
  }

  if (!pmId) {
    throw new Error('Payment Method tidak ditemukan. Pastikan vendor memiliki Payment Method yang valid.')
  }

  // Guard: hapus payment schedule lama sebelum buat baru (hindari duplikat)
  try {
    const existingScheds = await api.get(PAY_SCHED_BASE, {
      params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 50, _selectedProperties: 'id' },
    })
    const existing = existingScheds.data?.response?.data ?? []
    for (const s of existing) await api.delete(`${PAY_SCHED_BASE}/${s.id}`)
  } catch (e) {
    console.warn('[createPaymentPlan] Gagal hapus schedule lama:', e.message)
  }

  // Hitung jadwal cicilan dari C_PaymentTermLine
  let schedules = []

  if (ptId) {
    try {
      const termLinesRes = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTermLine', {
        params: { _where: `e.paymentTerms.id = '${ptId}'`, _startRow: 0, _endRow: 50, _orderBy: 'e.line asc' },
      })
      const termLines = termLinesRes.data?.response?.data ?? []

      if (termLines.length > 0) {
        let remaining = totalAmount
        for (let i = 0; i < termLines.length; i++) {
          const tl       = termLines[i]
          const isLast   = i === termLines.length - 1
          const pct      = Number(tl.percentage ?? tl.fixedPercentage ?? 0)
          const fixed    = Number(tl.fixedAmount ?? tl.amount ?? 0)
          const offsetDays = Number(tl.offsetDays ?? tl.netDays ?? tl.dueDateOffset ?? tl.dayOffset ?? 0)

          let amount = 0
          if (isLast) {
            amount = remaining
          } else if (pct > 0) {
            amount = Math.round(totalAmount * pct / 100 * 100) / 100
          } else if (fixed > 0) {
            amount = fixed
          } else {
            amount = remaining
          }

          if (amount <= 0) continue
          remaining -= amount

          const dueDate = new Date(invoiceDate)
          dueDate.setDate(dueDate.getDate() + offsetDays)
          schedules.push({ amount, dueDate: dueDate.toISOString().slice(0, 10) })
        }
      }
    } catch (e) {
      console.warn('[createPaymentPlan] Payment term lines fetch failed:', e.message)
    }
  }

  // Fallback: 1 schedule untuk full amount, due date = invoice date
  if (schedules.length === 0 && totalAmount > 0) {
    schedules = [{ amount: totalAmount, dueDate: invoiceDate }]
  }

  // INSERT FIN_Payment_Schedule
  for (const sched of schedules) {
    if (sched.amount <= 0) continue
    await api.post(PAY_SCHED_BASE, {
      data: {
        _entityName:        'FIN_Payment_Schedule',
        invoice:            invoiceId,
        organization:       { id: orgId },
        currency:           { id: curId },
        finPaymentmethod:   { id: pmId },
        amount:             sched.amount,
        outstandingAmount:  sched.amount,
        paidAmount:         0,
        dueDate:            sched.dueDate,
        expectedDate:       sched.dueDate,
        paid:               false,
      },
    })
  }
}