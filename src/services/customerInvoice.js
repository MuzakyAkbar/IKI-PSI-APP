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
const iotToken     = btoa(`${IOT_USERNAME}:${IOT_PASSWORD}`)

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
export const AR_INVOICE_DOCTYPE_ID = 'BAF9EDB72D024FA9AFF8CED783CB8CE1'
export const DEFAULT_ORGANIZATION  = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CURRENCY      = '303'
export const DEFAULT_PRICE_LIST    = '01D7BA2E3F234527B861CBAB12AE0DDE'
export const DEFAULT_TAX_ID        = 'F3F273F648784C858549A45FF0A69AFA'
export const ADJUSTMENT_PRODUCT_ID = '64556432E0644B86A2E01BE25309F9F4'
export const ADJUSTMENT_UOM_ID     = '100'

// ════════════════════════════════════════════════════
// INVOICE HEADER  (tabel: C_INVOICE)
// ════════════════════════════════════════════════════
const INV_BASE  = '/org.openbravo.service.json.jsonrest/Invoice'
const LINE_BASE = '/org.openbravo.service.json.jsonrest/InvoiceLine'
const FACT_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'

function buildInvoiceWhere(searchKey = '') {
  let where = `e.salesTransaction = true and e.documentType.id = '${AR_INVOICE_DOCTYPE_ID}'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  return where
}

// Ambil satu halaman (window) data invoice. totalRows dari respons
// berjendela TIDAK bisa dipercaya di instance ini (sama seperti BusinessPartner,
// lihat catatan di customer.js) -> dipakai hanya sebagai preview cepat, totalRows
// akurat dihitung terpisah lewat fetchInvoiceCount.
export async function fetchInvoicePage({
  startRow = 0, pageSize = 20, searchKey = '',
  sortCol = 'invoiceDate', sortDir = 'desc', signal,
} = {}) {
  const where = buildInvoiceWhere(searchKey)

  let sortBy  = (sortDir === 'desc' ? '-' : '') + sortCol
  if (sortCol !== 'documentNo') sortBy += ',-documentNo'

  let orderBy = `e.${sortCol} ${sortDir}`
  if (sortCol !== 'documentNo') orderBy += `, e.documentNo desc`

  const res = await api.get(INV_BASE, {
    params: {
      _startRow:  startRow,
      _endRow:    startRow + pageSize,
      _noCount:   false,
      _sortBy:    sortBy,
      _orderBy:   orderBy,
      _where:     where,
      _selectedProperties:
        'id,documentNo,invoiceDate,businessPartner,businessPartner$_identifier,' +
        'kodePelanggan,grandTotalAmount,summedLineAmount,documentStatus,posted,' +
        'paymentComplete,organization,organization$_identifier',
    },
    signal,
  })
  const response = res.data?.response ?? res.data
  const previewTotal = typeof response?.totalRows === 'number' ? response.totalRows : null
  return { data: response?.data ?? [], previewTotal }
}

// Hitung total baris invoice secara AKURAT dengan memecah data per jendela
// sampai jendela terakhir lebih pendek dari ukuran jendela (sama seperti
// fetchCustomerCount di customer.js). Jendela ditembak paralel per gelombang
// dan hanya mengambil kolom `id` (paling ringan) supaya cepat.
const COUNT_WINDOW = 500
const COUNT_BATCH  = 8
export async function fetchInvoiceCount({ searchKey = '', signal } = {}) {
  const where = buildInvoiceWhere(searchKey)
  let total = 0
  let base = 0
  let more = true
  let guard = 0
  while (more) {
    const reqs = []
    for (let k = 0; k < COUNT_BATCH; k++) {
      const start = base + k * COUNT_WINDOW
      reqs.push(
        api.get(INV_BASE, {
          params: { _startRow: start, _endRow: start + COUNT_WINDOW, _where: where, _selectedProperties: 'id' },
          signal,
        }).then(r => (r.data?.response?.data?.length ?? 0)).catch(() => 0)
      )
    }
    const counts = await Promise.all(reqs)
    total += counts.reduce((a, b) => a + b, 0)
    more = counts[counts.length - 1] === COUNT_WINDOW
    base += COUNT_BATCH * COUNT_WINDOW
    if (++guard > 50) break // pengaman: maksimum ~200.000 baris
  }
  return total
}

// Backward-compat: pemanggil lama tetap berfungsi (mengembalikan bentuk lama
// { data, totalRows } memakai previewTotal sebagai totalRows, TIDAK akurat
// untuk dataset besar — pemanggil baru sebaiknya pakai fetchInvoicePage +
// fetchInvoiceCount langsung, lihat loadInvoices() di CustomerInvoice.vue).
export async function fetchAllInvoices({
  startRow = 0, pageSize = 20, searchKey = '',
  sortCol = 'invoiceDate', sortDir = 'desc',
} = {}) {
  const { data, previewTotal } = await fetchInvoicePage({ startRow, pageSize, searchKey, sortCol, sortDir })
  return { data, totalRows: previewTotal ?? data.length }
}

export async function fetchInvoice(id) {
  const res     = await api.get(`${INV_BASE}/${id}`)
  const wrapped = res.data?.response?.data
  if (wrapped) return Array.isArray(wrapped) ? wrapped[0] : wrapped
  if (res.data?.id) return res.data
  return null
}

export async function createInvoice(data) {
  const payload = buildInvoicePayload(data)
  const res     = await api.post(INV_BASE, {
    data: { _entityName: 'Invoice', salesTransaction: true, ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateInvoice(id, data) {
  const payload = buildInvoicePayload(data)
  const res     = await api.put(`${INV_BASE}/${id}`, {
    data: { id, _entityName: 'Invoice', ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteInvoice(id) {
  const ex = await api.get(`${INV_BASE}/${id}`)
  const r  = (ex.data?.response?.data ?? [])[0] ?? {}
  const res = await api.put(`${INV_BASE}/${id}`, {
    data: { id, _entityName: 'Invoice', active: false, documentNo: r.documentNo },
  })
  return res.data?.response?.data ?? res.data
}

export async function postInvoice(data) {
  const getId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))

  const orgId = getId(data.organization)   || DEFAULT_ORGANIZATION
  const bpId  = getId(data.businessPartner)
  const paId  = getId(data.partnerAddress)
  const ptId  = getId(data.paymentTerms)
  const pmId  = getId(data.paymentMethod)
  const curId = getId(data.currency)       || DEFAULT_CURRENCY
  const plId  = getId(data.priceList)      || DEFAULT_PRICE_LIST

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
    currency:            { id: currency     || DEFAULT_CURRENCY },
    priceList:           { id: priceList    || DEFAULT_PRICE_LIST },
    documentStatus:      'DR',
    documentAction:      'CO',
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
// INVOICE LINE  (tabel: C_INVOICELINE)
// ════════════════════════════════════════════════════

export async function fetchInvoiceLines(invoiceId) {
  const res = await api.get(LINE_BASE, {
    params: {
      _where:    `e.invoice.id = '${invoiceId}'`,
      _startRow: 0, _endRow: 200, _orderBy: 'e.lineNo asc',
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
// ACCOUNTING FACTS  (tabel: FACT_ACCT)
// ════════════════════════════════════════════════════
export async function fetchAccountingFacts(invoiceId) {
  const res = await api.get(FACT_BASE, {
    params: {
      _where:    `e.recordID = '${invoiceId}' and e.table.id = '318'`,
      _startRow: 0, _endRow: 100, _orderBy: 'e.sequenceNumber asc',
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
    params: { _where: `e.businessPartner.id = '${businessPartnerId}'`, _startRow: 0, _endRow: 50 },
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
    params: { _where: `e.paymentTerms.id = '${paymentTermId}'`, _startRow: 0, _endRow: 50, _orderBy: 'e.line asc' },
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
    params: { _where: `e.active = true`, _startRow: 0, _endRow: 200, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// COMPLETE INVOICE  — tombol "Complete" (DocAction='CO')
//
// Meniru alur c_invoice_post:
//   1. Validasi: minimal 1 invoice line (cek @InvoicesNeedLines@)
//   2. INSERT FIN_Payment_Schedule (meniru C_DEBT_PAYMENT generation)
//   3. UPDATE C_INVOICE SET DocStatus='CO', Processed='Y', DocAction='RE'
//
// Tabel yang terlibat:
//   C_INVOICE, C_INVOICELINE, FIN_Payment_Schedule,
//   C_PaymentTerm, C_PaymentTermLine, FIN_PaymentMethod
// ════════════════════════════════════════════════════
let _cachedProcessId = null
export async function fetchInvoiceProcessId() {
  if (_cachedProcessId) return _cachedProcessId
  const res    = await api.get('/org.openbravo.service.json.jsonrest/ADProcess', {
    params: { _where: `e.searchKey = 'C_Invoice Post'`, _startRow: 0, _endRow: 1 },
  })
  const record = (res.data?.response?.data ?? [])[0]
  if (!record?.id) throw new Error('Process "C_Invoice Post" tidak ditemukan di sistem.')
  _cachedProcessId = record.id
  return _cachedProcessId
}

export async function runInvoiceProcess(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'DR') {
    throw new Error(`Invoice sudah dalam status "${invoiceData?.documentStatus}", tidak bisa di-Complete.`)
  }

  // Validasi: harus ada minimal 1 invoice line
  // Meniru: IF (v_count=0) THEN RAISE EXCEPTION '@InvoicesNeedLines@'
  const linesCheck = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 1 },
  })
  if ((linesCheck.data?.response?.data ?? []).length === 0) {
    throw new Error('Invoice harus memiliki minimal satu baris item sebelum bisa di-Complete.')
  }

  // Buat Payment Plan → INSERT FIN_Payment_Schedule
  try {
    await createPaymentPlan(invoiceId, invoiceData)
  } catch (e) {
    console.warn('[runInvoiceProcess] Pembuatan Payment Plan gagal:', e.message)
  }

  // UPDATE C_INVOICE: DocStatus='CO', Processed='Y', DocAction='RE'
  // Meniru akhir c_invoice_post:
  //   UPDATE C_INVOICE SET DocStatus='CO', Processed='Y', DocAction='RE'
  //   WHERE C_Invoice_ID = v_Record_ID
  // outstandingAmount, totalPaid, paymentComplete di-set manual karena
  // Openbravo native engine tidak ter-trigger saat bypass via JSON REST API.
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

  // UPDATE BusinessPartner.creditUsed += grandTotalAmount
  // Meniru c_invoice_post: UPDATE C_BPartner SET SO_CreditUsed = SO_CreditUsed + grandTotal
  const getId = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const bpId  = getId(invoiceData.businessPartner)
  if (bpId) {
    try {
      const bpRes          = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`)
      const bpData         = bpRes.data?.response?.data
      const bp             = Array.isArray(bpData) ? bpData[0] : (bpData ?? {})
      const currentCredit  = Number(bp?.creditUsed ?? bp?.soCreditused ?? 0)

      await api.put(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`, {
        data: {
          id:          bpId,
          _entityName: 'BusinessPartner',
          creditUsed:  currentCredit + grandTotal,
        },
      })
    } catch (e) {
      console.warn('[runInvoiceProcess] Update creditUsed BusinessPartner gagal:', e.message)
    }
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
// POST ACCOUNTING — tombol "Post"
//
// Meniru posting engine Openbravo setelah c_invoice_post CO.
// Pola jurnal double-entry AR Invoice:
//   DEBIT  Piutang Usaha (AR)         = grandTotalAmount
//   CREDIT Pendapatan (Revenue)       = lineNetAmount per line
//   CREDIT Hutang Pajak (Tax Payable) = taxAmount per tax line
//
// Tabel yang terlibat:
//   FACT_ACCT            — target INSERT jurnal
//   C_AcctSchema         — schema akuntansi aktif (C_AcctSchema)
//   C_Period             — periode akuntansi (C_Period)
//   C_BP_Customer_Acct   — akun AR dari BP
//   C_BP_Group_Acct      — akun AR dari kategori BP (fallback)
//   C_ElementValue       — chart of account (fallback terakhir)
//   M_Product_Acct       — akun Revenue per produk
//   C_Tax_Acct           — akun Tax Payable per pajak
//   C_INVOICE            — update posted='Y'
// ════════════════════════════════════════════════════
const INVOICE_TABLE_ID = '318'

// Resolve AccountingCombination → { accountId, combId, value, accountingEntryDescription }
async function resolveAcctCombination(combId) {
  if (!combId) return null
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
    params: { _where: `e.id = '${combId}'`, _startRow: 0, _endRow: 1 },
  })
  const rec = res.data?.response?.data?.[0] ?? null
  if (!rec) return null
  const raw       = rec.account
  const accountId = !raw ? null : typeof raw === 'object' ? (raw.id ?? null) : String(raw).trim() || null
  if (!accountId) return null
  const parts = (rec['account$_identifier'] || '').split(' - ')
  return {
    accountId,
    combId: rec.id,
    value:  rec.combination || rec.alias || parts[0] || '',
    accountingEntryDescription: parts.slice(1).join(' - ') || '',
  }
}

// Fetch AcctSchema aktif untuk org → C_AcctSchema
async function fetchDefaultAcctSchema(orgId) {
  const res  = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema', {
    params: { _where: `e.active = true`, _startRow: 0, _endRow: 10 },
  })
  const list = res.data?.response?.data ?? []
  return list.find(s => {
    const sOrg = s.organization?.id ?? s.organization
    return sOrg === orgId
  }) ?? list[0] ?? null
}

// Fetch C_Period berdasarkan tanggal akuntansi
async function fetchPeriodForDate(dateStr) {
  if (!dateStr) return null
  const res  = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPeriod', {
    params: {
      _where:    `e.periodType = 'M' and e.startingDate <= '${dateStr}' and e.endingDate >= '${dateStr}'`,
      _startRow: 0, _endRow: 5,
    },
  })
  const list = res.data?.response?.data ?? []
  return list[0] ?? null
}

// Fetch M_Product_Acct untuk akun Revenue
async function fetchProductAcct(productId, schemaId) {
  const entityNames = ['ProductAccounts', 'FinancialMgmtProductAcct', 'MaterialMgmtProductAcct']
  const whereBase   = schemaId
    ? `e.product.id = '${productId}' and e.accountingSchema.id = '${schemaId}'`
    : `e.product.id = '${productId}'`

  for (const entityName of entityNames) {
    try {
      const res  = await api.get(`/org.openbravo.service.json.jsonrest/${entityName}`, {
        params: { _where: whereBase, _startRow: 0, _endRow: 1 },
      })
      const data = res.data?.response?.data ?? []
      if (data.length > 0) return data[0]
    } catch { /* coba entity berikutnya */ }
  }
  return null
}

export async function postAccountingProcess(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'CO') {
    throw new Error(
      `Invoice harus berstatus Complete (CO) sebelum di-Post. Status saat ini: "${invoiceData?.documentStatus}"`
    )
  }

  // Guard: jika sudah ada jurnal harus Unpost dulu
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

  // Step 1: Fetch C_AcctSchema
  let schemaId  = extractId(invoiceData.accountingSchema) ?? null
  let schemaRec = null
  if (!schemaId) {
    schemaRec = await fetchDefaultAcctSchema(orgId)
    schemaId  = schemaRec?.id ?? null
  }

  // Step 2: Fetch C_Period berdasarkan v_DateAcct
  let periodId = extractId(invoiceData.period) ?? null
  if (!periodId && accDate) {
    const period = await fetchPeriodForDate(accDate)
    periodId = period?.id ?? null
  }

  // Step 3: Fetch C_INVOICELINE
  const linesRes = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 200, _orderBy: 'e.lineNo asc' },
  })
  const lines = linesRes.data?.response?.data ?? []
  if (lines.length === 0) throw new Error('Tidak ada invoice lines untuk di-post.')

  // Helper: ekstrak AR combination ID dari berbagai kemungkinan nama field
  const extractArCombId = (rec) => {
    if (!rec) return null
    return extractId(rec.customerReceivables)
      || extractId(rec.receivables)
      || extractId(rec.cReceivableAcct)
      || extractId(rec.customerReceivablesNo)
      || extractId(rec.receivablesAccount)
      || extractId(rec.acctReceivable)
      || extractId(rec.receivableAccount)
      || extractId(rec.bpartnerReceivables)
      || Object.entries(rec).reduce((found, [k, v]) => {
           if (found) return found
           const lk = k.toLowerCase()
           if ((lk.includes('receiv') || lk.includes('piutang')) && v) return extractId(v)
           return null
         }, null)
  }

  // Step 4: Resolve akun AR (Piutang)
  // Prioritas: C_BP_Customer_Acct → C_BP_Group_Acct → C_AcctSchema → C_ElementValue
  let arAccount = null
  const bpId    = extractId(invoiceData.businessPartner)

  // 4a. C_BP_Customer_Acct
  if (bpId && schemaId) {
    for (const entityName of ['BusinessPartnerAccounts', 'BusinessPartnerAccts', 'C_BP_Customer_Acct', 'FinancialMgmtBPAcct', 'C_BPartner_Acct']) {
      try {
        const res = await api.get(`/org.openbravo.service.json.jsonrest/${entityName}`, {
          params: { _where: `e.businessPartner.id = '${bpId}' and e.accountingSchema.id = '${schemaId}'`, _startRow: 0, _endRow: 1 },
        })
        const rec = res.data?.response?.data?.[0]
        if (rec) {
          const combId = extractArCombId(rec)
          if (combId) { arAccount = await resolveAcctCombination(combId); break }
        }
      } catch { /* coba entity berikutnya */ }
    }
  }

  // 4b. C_BP_Group_Acct (dari kategori BP)
  if (!arAccount && bpId && schemaId) {
    try {
      const bpRes  = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`)
      const bpData = bpRes.data?.response?.data
      const bp     = Array.isArray(bpData) ? bpData[0] : (bpData ?? bpRes.data)
      const categoryId = extractId(bp?.businessPartnerCategory)

      if (categoryId) {
        for (const catEntity of ['BusinessPartnerCategoryAccount', 'C_BP_Group_Acct']) {
          try {
            const catRes  = await api.get(`/org.openbravo.service.json.jsonrest/${catEntity}`, {
              params: {
                _where: `e.businessPartnerCategory.id = '${categoryId}' and e.accountingSchema.id = '${schemaId}'`,
                _startRow: 0, _endRow: 1,
              },
            })
            const catAcct = catRes.data?.response?.data?.[0]
            if (catAcct) {
              const combId = extractArCombId(catAcct)
              if (combId) { arAccount = await resolveAcctCombination(combId); break }
            }
          } catch { /* coba entity berikutnya */ }
          if (arAccount) break
        }
      }
    } catch (e) {
      console.log('[POST ACCOUNTING] BPCategoryAccount lookup failed:', e.message)
    }
  }

  // 4c. Fallback C_AcctSchema.C_Receivable_Acct
  if (!arAccount && schemaId) {
    try {
      const schemaFullRes = await api.get(`/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema/${schemaId}`)
      const schemaFull    = schemaFullRes.data?.response?.data?.[0] ?? schemaFullRes.data
      if (schemaFull && typeof schemaFull === 'object') {
        const arCombId = extractArCombId(schemaFull)
          || extractId(schemaFull.notFinRecReceivables)
          || extractId(schemaFull.receivablesNoCurrency)
        if (arCombId) arAccount = await resolveAcctCombination(arCombId)
      }
    } catch (e) {
      console.log('[POST ACCOUNTING] AcctSchema full fetch failed:', e.message)
    }
  }

  // 4d. Last resort: C_ElementValue dengan nama mengandung 'piutang'/'receivable'
  if (!arAccount) {
    try {
      const evRes  = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue', {
        params: {
          _where:
            `e.active = true and e.accountType = 'A' and ` +
            `(upper(e.name) like upper('%piutang%') or upper(e.name) like upper('%receivable%') ` +
            `or (e.searchKey like '12%' and e.summaryLevel = false))`,
          _startRow: 0, _endRow: 10, _orderBy: 'e.searchKey asc',
        },
      })
      const evList = evRes.data?.response?.data ?? []
      if (evList.length > 0) {
        const bestEv  = evList.find(e => /piutang usaha|trade receiv|account.*receiv.*trade/i.test(e.name)) ?? evList[0]
        const combRes = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
          params: {
            _where:    `e.account.id = '${bestEv.id}'` + (schemaId ? ` and e.accountingSchema.id = '${schemaId}'` : ''),
            _startRow: 0, _endRow: 1,
          },
        })
        const combRec = combRes.data?.response?.data?.[0]
        arAccount = combRec
          ? await resolveAcctCombination(combRec.id)
          : { accountId: bestEv.id, combId: null, value: bestEv.searchKey || '', accountingEntryDescription: bestEv.name || '' }
      }
    } catch (e) {
      console.warn('[POST ACCOUNTING] ElementValue AR search failed:', e.message)
    }
  }

  if (!arAccount) {
    throw new Error(
      'Akun AR (Piutang) tidak ditemukan. Pastikan:\n' +
      '1. Business Partner Category memiliki akun "Customer Receivables"\n' +
      '2. Atau Accounting Schema dikonfigurasi dengan akun Receivables\n' +
      '3. Atau ada akun dengan nama "Piutang" / "Receivable" di Chart of Accounts'
    )
  }

  // Step 5: Resolve Revenue account per produk (M_Product_Acct.P_Revenue_Acct)
  const revenueCache = {}
  async function getRevenueAccount(productId) {
    if (!productId) return null
    if (productId in revenueCache) return revenueCache[productId]
    const productAcct = await fetchProductAcct(productId, schemaId)
    let account       = null
    if (productAcct) {
      const revCombId = extractId(productAcct.pRevenueAcct)
        || extractId(productAcct.revenue)
        || extractId(productAcct.revenueRecognition)
        || extractId(productAcct.p_revenue_acct)
        || extractId(productAcct.productRevenue)
      if (revCombId) account = await resolveAcctCombination(revCombId)
    }
    revenueCache[productId] = account
    return account
  }

  // Step 5b: Resolve Tax Payable account per tax (C_Tax_Acct.T_Due_Acct)
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
      console.log('[POST ACCOUNTING] TaxAcct lookup failed for', taxId)
    }
    taxAcctCache[taxId] = null
    return null
  }

  // Step 6: Build & insert jurnal FACT_ACCT (double-entry)
  const grandTotal = Number(invoiceData.grandTotalAmount) || 0
  let seqNo        = 10

  const buildFact = ({ isDebit, amount, lineId, desc }) => ({
    _entityName:           'FinancialMgmtAccountingFact',
    client:                { id: clientId },
    organization:          { id: orgId },
    ...(schemaId        && { accountingSchema: { id: schemaId } }),
    transactionDate:       txDate,
    accountingDate:        accDate,
    ...(periodId        && { period: { id: periodId } }),
    table:                 { id: INVOICE_TABLE_ID },
    recordID:              invoiceId,
    ...(lineId          && { lineID: lineId }),
    postingType:           'A',
    currency:              { id: curId },
    foreignCurrencyDebit:  isDebit ? amount : 0,
    foreignCurrencyCredit: isDebit ? 0 : amount,
    debit:                 isDebit ? amount : 0,
    credit:                isDebit ? 0 : amount,
    quantity:              0,
    description:           desc,
    groupID,
    sequenceNumber:        seqNo,
    type:                  'N',
    documentCategory:      'ARI',
    ...(docTypeId       && { documentType: { id: docTypeId } }),
    active:                true,
  })

  const invoiceDesc = invoiceData.description
    || invoiceData['businessPartner$_identifier']?.split(' - ').slice(1).join(' - ')
    || ''

  // 6a. DEBIT AR — grandTotalAmount (net + pajak)
  const firstLine = lines[0]
  await api.post(FACT_BASE, {
    data: {
      ...buildFact({ isDebit: true, amount: grandTotal, lineId: firstLine?.id, desc: `${invoiceData.documentNo} # ${invoiceDesc}`.trim() }),
      account:                   { id: arAccount.accountId },
      ...(arAccount.combId     && { accountingCombination: { id: arAccount.combId } }),
      value:                      arAccount.value,
      accountingEntryDescription: arAccount.accountingEntryDescription,
    },
  })
  seqNo += 10

  // 6b. CREDIT Revenue per invoice line (C_INVOICELINE.LineNetAmt)
  for (const line of lines) {
    const lineNo     = line.lineNo ?? seqNo
    const lineAmount = Number(line.lineNetAmount) || 0
    if (lineAmount === 0) continue
    const lineDesc   = line.description || invoiceData.documentNo || ''
    const productId  = extractId(line.product)
    const revAccount = await getRevenueAccount(productId)

    if (revAccount?.accountId) {
      await api.post(FACT_BASE, {
        data: {
          ...buildFact({ isDebit: false, amount: lineAmount, lineId: line.id, desc: `${invoiceData.documentNo} # ${lineNo} ${lineDesc}`.trim() }),
          account:                       { id: revAccount.accountId },
          ...(revAccount.combId        && { accountingCombination: { id: revAccount.combId } }),
          value:                          revAccount.value,
          accountingEntryDescription:     revAccount.accountingEntryDescription,
        },
      })
      seqNo += 10
    } else {
      console.warn(`[POST ACCOUNTING] Line ${lineNo}: Revenue account tidak ditemukan — entri Credit Revenue dilewati.`)
    }
  }

  // 6c. CREDIT Tax Payable per C_INVOICETAX.TaxAmt
  try {
    const taxLinesRes = await api.get('/org.openbravo.service.json.jsonrest/InvoiceTax', {
      params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 50 },
    })
    const taxLines = taxLinesRes.data?.response?.data ?? []

    for (const taxLine of taxLines) {
      const taxAmount = Number(taxLine.taxAmount) || 0
      if (taxAmount === 0) continue
      const taxId   = extractId(taxLine.tax)
      const taxAcct = await getTaxAccount(taxId)

      if (taxAcct?.accountId) {
        await api.post(FACT_BASE, {
          data: {
            ...buildFact({ isDebit: false, amount: taxAmount, lineId: null, desc: `${invoiceData.documentNo} # Tax ${taxLine['tax$_identifier'] || ''}`.trim() }),
            account:                   { id: taxAcct.accountId },
            ...(taxAcct.combId       && { accountingCombination: { id: taxAcct.combId } }),
            value:                      taxAcct.value,
            accountingEntryDescription: taxAcct.accountingEntryDescription,
          },
        })
        seqNo += 10
      } else {
        console.warn(`[POST ACCOUNTING] Tax account tidak ditemukan untuk tax ${taxId} — amount ${taxAmount} tidak tercatat.`)
      }
    }
  } catch (e) {
    console.warn('[POST ACCOUNTING] Gagal fetch invoice tax lines:', e.message)
  }

  // Step 7: UPDATE C_INVOICE SET posted='Y'
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
// UNPOST — hapus jurnal, set posted='N'  — tombol "Unpost"
//
// Meniru: DELETE FROM FACT_ACCT WHERE RecordID = invoiceId
//         UPDATE C_INVOICE SET posted='N'
//
// Tabel: FACT_ACCT, C_INVOICE
// ════════════════════════════════════════════════════
export async function unpostAccountingProcess(invoiceId, invoiceData) {
  const isPosted = invoiceData?.posted === true || invoiceData?.posted === 'Y'
  if (!isPosted) {
    throw new Error('Invoice belum di-Post, tidak bisa di-Unpost.')
  }

  // DELETE semua FACT_ACCT untuk invoice ini
  const factsRes = await api.get(FACT_BASE, {
    params: { _where: `e.recordID = '${invoiceId}' and e.table.id = '318'`, _startRow: 0, _endRow: 200 },
  })
  const facts = factsRes.data?.response?.data ?? []
  await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))

  // UPDATE C_INVOICE SET posted='N'
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: { id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo, posted: 'N' },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Unpost Invoice gagal.')
  }
  return await fetchInvoice(invoiceId)
}

// ════════════════════════════════════════════════════
// REACTIVATE — CO → DR  — tombol "Reactivate"
//
// Meniru c_invoice_post DocAction='RE':
//   DELETE FIN_Payment_Schedule WHERE invoice = invoiceId
//   UPDATE C_INVOICE SET DocStatus='DR', Processed='N', DocAction='CO'
//
// Tabel: FIN_Payment_Schedule, C_INVOICE
// ════════════════════════════════════════════════════
export async function reactivateInvoice(invoiceId, invoiceData) {
  if (invoiceData?.documentStatus !== 'CO') {
    throw new Error('Invoice harus berstatus Complete (CO) untuk di-Reactivate.')
  }

  // DELETE FIN_Payment_Schedule
  try {
    await deletePaymentSchedules(invoiceId)
  } catch (e) {
    console.warn('[reactivateInvoice] Gagal hapus payment schedules:', e.message)
  }

  // UPDATE C_INVOICE: DocStatus='DR', Processed='N', DocAction='CO'
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
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Reactivate Invoice gagal.')
  }

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
 * Fix payment plan yang sudah terlanjur dobel/salah:
 * - Hapus semua schedule lama (termasuk yang amount=0)
 * - Buat ulang 1 schedule bersih berdasarkan grandTotalAmount
 *
 * Dipanggil manual untuk invoice CO yang sudah terlanjur punya schedule ganda.
 */
export async function fixPaymentPlan(invoiceId, invoiceData) {
  // Hapus semua schedule lama
  await deletePaymentSchedules(invoiceId)

  // Buat ulang via createPaymentPlan (sudah ada filter amount > 0)
  return await createPaymentPlan(invoiceId, invoiceData)
}

export async function fetchCustomerOutstandingBalance(businessPartnerId) {
  if (!businessPartnerId) return { totalOutstanding: 0, totalDue: 0, schedules: [] }
  const bpId    = typeof businessPartnerId === 'object' ? businessPartnerId.id : String(businessPartnerId)
  const res     = await api.get(PAY_SCHED_BASE, {
    params: {
      _where:    `e.invoice.businessPartner.id = '${bpId}' and e.outstandingAmount != 0 and e.invoice.salesTransaction = true`,
      _startRow: 0, _endRow: 200, _orderBy: 'e.dueDate asc',
    },
  })
  const schedules = res.data?.response?.data ?? []
  const today     = new Date().toISOString().slice(0, 10)
  let totalOutstanding = 0
  let totalDue         = 0
  for (const s of schedules) {
    const amt = Number(s.outstandingAmount) || 0
    totalOutstanding += amt
    if (s.dueDate && s.dueDate <= today) totalDue += amt
  }
  return { totalOutstanding, totalDue, schedules }
}

/**
 * Buat FIN_Payment_Schedule setelah invoice di-Complete.
 * Meniru bagian generate C_DEBT_PAYMENT di c_invoice_post.
 *
 * Tabel: FIN_Payment_Schedule, C_PaymentTermLine, FIN_PaymentMethod
 */
export async function createPaymentPlan(invoiceId, invoiceData) {
  const extractId   = (v) => (v && typeof v === 'object') ? v.id : (v || null)
  const orgId       = extractId(invoiceData.organization) || DEFAULT_ORGANIZATION
  const curId       = extractId(invoiceData.currency)     || DEFAULT_CURRENCY
  const ptId        = extractId(invoiceData.paymentTerms)
  const invoiceDate = invoiceData.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  const totalAmount = Number(invoiceData.grandTotalAmount) || 0

  // Resolve Payment Method
  let pmId = extractId(invoiceData.paymentMethod)
    || extractId(invoiceData.finPaymentmethod)
    || null

  if (!pmId) {
    const bpId = extractId(invoiceData.businessPartner)
    if (bpId) {
      try {
        const bpRes = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`)
        const bp    = (bpRes.data?.response?.data ?? [])[0] ?? bpRes.data?.response?.data
        pmId        = extractId(bp?.paymentMethod) || extractId(bp?.fin_paymentmethod_id)
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
    throw new Error('Payment Method tidak ditemukan. Pastikan customer memiliki Payment Method yang valid.')
  }

  // Guard: hapus payment schedule lama sebelum buat baru (hindari duplikat)
  try {
    const existingScheds = await api.get(PAY_SCHED_BASE, {
      params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 50, _selectedProperties: 'id' },
    })
    const existing = existingScheds.data?.response?.data ?? []
    for (const s of existing) {
      await api.delete(`${PAY_SCHED_BASE}/${s.id}`)
    }
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
      // Filter hanya termLine yang punya persentase atau fixed amount > 0
      const termLines = (termLinesRes.data?.response?.data ?? []).filter(tl => {
        const pct   = Number(tl.percentage ?? tl.fixedPercentage ?? 0)
        const fixed = Number(tl.fixedAmount ?? tl.amount ?? 0)
        return pct > 0 || fixed > 0
      })

      if (termLines.length > 0) {
        let remaining = totalAmount
        termLines.forEach((tl, idx) => {
          const offsetDays = Number(tl.offsetDays ?? tl.netDays ?? tl.dueDateOffset ?? tl.dayOffset ?? 0)
          const dueDate    = addDays(invoiceDate, offsetDays)
          let lineAmount
          if (idx === termLines.length - 1) {
            lineAmount = remaining
          } else {
            const pct   = Number(tl.percentage ?? tl.fixedPercentage ?? 0)
            const fixed = Number(tl.fixedAmount ?? tl.amount ?? 0)
            lineAmount  = pct > 0 ? Math.round(totalAmount * pct / 100) : fixed
          }
          if (lineAmount <= 0) return // skip jika hasil kalkulasi 0
          remaining -= lineAmount
          schedules.push({ dueDate, amount: lineAmount })
        })
      }
    } catch (e) {
      console.warn('[createPaymentPlan] Gagal fetch payment term lines:', e.message)
    }
  }

  if (schedules.length === 0) {
    schedules = [{ dueDate: invoiceDate, amount: totalAmount }]
  }

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
      finPaymentmethod:  pmId,
    }
    try {
      const res = await api.post(PAY_SCHED_BASE, { data: payload })
      const raw = res.data?.response?.data
      created.push(Array.isArray(raw) ? raw[0] : raw)
    } catch (e) {
      console.error('[createPaymentPlan] Gagal POST schedule:', e.message)
      throw new Error(`Gagal membuat payment plan (${sched.dueDate}): ${e?.response?.data?.response?.error?.message || e.message}`)
    }
  }

  return created
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ════════════════════════════════════════════════════
// CANCEL INVOICE — tombol "Cancel"
//
// Meniru c_invoice_post DocAction='VO' untuk invoice yang sudah CO:
//   1. Validasi: tidak ada Payment aktif (FIN_Payment_ScheduleDetail)
//   2. Validasi: tidak ada Financial Account Transaction (FIN_Finacc_Transaction)
//   3. Unpost: DELETE FACT_ACCT, UPDATE posted='N'
//   4. Reactivate: UPDATE C_INVOICE → DR, DELETE FIN_Payment_Schedule
//   5. Reset lines: UPDATE C_INVOICELINE SET QtyInvoiced=0, LineNetAmt=0
//   6. UPDATE C_INVOICE SET DocStatus='VO', DocAction='--', Processed='Y'
//      PERBAIKAN: Status akhir adalah 'VO' (sesuai c_invoice_post), bukan 'CL'
//
// Tabel: FIN_Payment_Schedule, FIN_Payment_ScheduleDetail,
//        FIN_Finacc_Transaction, FACT_ACCT, C_INVOICELINE, C_INVOICE
// ════════════════════════════════════════════════════
const FINACC_TXN_CHECK_BASE = '/org.openbravo.service.json.jsonrest/FIN_Finacc_Transaction'
const PAY_SCHED_DETAIL_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail'

export async function cancelInvoice(invoiceId, invoiceData) {
  if (!['CO', 'DR'].includes(invoiceData?.documentStatus)) {
    throw new Error(`Invoice tidak bisa di-Cancel dari status "${invoiceData?.documentStatus}".`)
  }

  let iotError = null

  // Validasi 1: tidak ada Payment In aktif (FIN_Payment_ScheduleDetail)
  try {
    const schedRes  = await api.get(PAY_SCHED_BASE, {
      params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 50, _selectedProperties: 'id' },
    })
    const schedules = schedRes.data?.response?.data ?? []
    if (schedules.length > 0) {
      const schedIds  = schedules.map(s => `'${s.id}'`).join(',')
      const detailRes = await api.get(PAY_SCHED_DETAIL_BASE, {
        params: {
          _where:              `e.invoicePaymentSchedule.id in (${schedIds}) and e.canceled = false`,
          _startRow: 0, _endRow: 1, _selectedProperties: 'id,amount',
        },
      })
      if ((detailRes.data?.response?.data ?? []).length > 0) {
        throw new Error(
          'Invoice ini tidak bisa di-Cancel karena sudah memiliki Payment In yang terhubung. ' +
          'Hapus atau batalkan Payment In terkait terlebih dahulu.'
        )
      }
    }
  } catch (e) {
    if (e.message?.includes('Payment In')) throw e
    console.warn('[cancelInvoice] Cek Payment In gagal (diabaikan):', e.message)
  }

  // Validasi 2: tidak ada Financial Account Transaction (FIN_Finacc_Transaction)
  try {
    const schedRes2  = await api.get(PAY_SCHED_BASE, {
      params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 50, _selectedProperties: 'id' },
    })
    const schedules2 = schedRes2.data?.response?.data ?? []
    if (schedules2.length > 0) {
      const schedIds2  = schedules2.map(s => `'${s.id}'`).join(',')
      const detailRes2 = await api.get(PAY_SCHED_DETAIL_BASE, {
        params: {
          _where:              `e.invoicePaymentSchedule.id in (${schedIds2}) and e.canceled = false`,
          _startRow: 0, _endRow: 50, _selectedProperties: 'id,paymentDetails',
        },
      })
      const details2 = detailRes2.data?.response?.data ?? []
      if (details2.length > 0) {
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
          const txnRes    = await api.get(FINACC_TXN_CHECK_BASE, {
            params: { _where: `e.finPayment.id in (${payIdList})`, _startRow: 0, _endRow: 1 },
          })
          if ((txnRes.data?.response?.data ?? []).length > 0) {
            throw new Error(
              'Invoice ini tidak bisa di-Cancel karena sudah tercatat di Financial Account Transaction. ' +
              'Batalkan transaksi keuangan terkait terlebih dahulu.'
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

  // Step 2: Unpost — DELETE FACT_ACCT
  if (isPostedFlag) {
    const factsRes = await api.get(FACT_BASE, {
      params: { _where: `e.recordID = '${invoiceId}' and e.table.id = '318'`, _startRow: 0, _endRow: 200 },
    })
    const facts = factsRes.data?.response?.data ?? []
    await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))
    await api.put(`${INV_BASE}/${invoiceId}`, {
      data: { id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo, posted: 'N' },
    })
  }

  // Step 3: Reactivate ke DR jika status CO
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

    // DELETE FIN_Payment_Schedule
    try {
      await deletePaymentSchedules(invoiceId)
    } catch (e) {
      console.warn('[cancelInvoice] Gagal hapus payment schedules:', e.message)
    }

    // Sync ke IoT/PSI
    try {
      await backToDraftIot(invoiceId)
    } catch (e) {
      iotError = e.message
      console.warn('[cancelInvoice] Back to Draft IoT gagal:', e.message)
    }
  }

  // Step 4: Reset semua C_INVOICELINE → QtyInvoiced=0, LineNetAmt=0
  // Meniru: UPDATE C_INVOICELINE SET QtyInvoiced=0, LineNetAmt=0, line_gross_amount=0
  //         WHERE C_Invoice_ID = v_Record_ID
  const linesRes     = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 200, _orderBy: 'e.lineNo asc' },
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

  // Step 5: UPDATE C_INVOICE SET DocStatus='VO', DocAction='--', Processed='Y'
  // PERBAIKAN dari versi sebelumnya: status akhir adalah 'VO' (void/cancelled)
  // sesuai c_invoice_post, bukan 'CL' (closed).
  // 'CL' hanya dipakai untuk invoice yang diselesaikan via pembayaran.
  const closeRes = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentNo:     invoiceData.documentNo,
      documentStatus: 'VO',
      documentAction: '--',
      processed:      true,
    },
  })
  const closeSt = closeRes.data?.response?.status
  if (closeSt !== undefined && closeSt < 0) {
    throw new Error(closeRes.data?.response?.error?.message || 'Cancel invoice (VO) gagal.')
  }

  const invoice = await fetchInvoice(invoiceId)
  return { invoice, iotError }
}

// ════════════════════════════════════════════════════
// ADJUSTMENT — tombol "Adjustment"
//
// Alur: unpost → reactivate ke DR → tambah line Adjustment qty=-1
//
// Tabel: FACT_ACCT, FIN_Payment_Schedule, C_INVOICE, C_INVOICELINE, C_Tax
// ════════════════════════════════════════════════════

let _freeTaxId = null
export async function fetchFreeTaxId() {
  if (_freeTaxId) return _freeTaxId
  const res  = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtTaxRate', {
    params: { _where: `e.active = true and (upper(e.name) like upper('%free%') or e.rate = 0)`, _startRow: 0, _endRow: 10, _orderBy: 'e.name asc' },
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

  // Step 1: Unpost jika perlu — DELETE FACT_ACCT, UPDATE posted='N'
  if (isPostedFlag) {
    const factsRes = await api.get(FACT_BASE, {
      params: { _where: `e.recordID = '${invoiceId}' and e.table.id = '318'`, _startRow: 0, _endRow: 200 },
    })
    const facts = factsRes.data?.response?.data ?? []
    await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))
    await api.put(`${INV_BASE}/${invoiceId}`, {
      data: { id: invoiceId, _entityName: 'Invoice', documentNo: invoiceData.documentNo, posted: 'N' },
    })
  }

  // Step 2: Reactivate ke DR jika status CO
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
      throw new Error(reactivateRes.data?.response?.error?.message || 'Reactivate saat Adjustment gagal.')
    }
    try { await deletePaymentSchedules(invoiceId) } catch (e) {
      console.warn('[adjustmentInvoice] Gagal hapus payment schedules:', e.message)
    }
  }

  // Step 3: Tentukan lineNo berikutnya (MAX + 10)
  const linesRes      = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 200, _orderBy: 'e.lineNo desc' },
  })
  const existingLines = linesRes.data?.response?.data ?? []
  const maxLineNo     = existingLines.reduce((max, l) => Math.max(max, l.lineNo || 0), 0)
  const nextLineNo    = maxLineNo + 10

  // Step 4: Cari Free Tax ID
  const freeTaxId = await fetchFreeTaxId()

  // Step 5: INSERT C_INVOICELINE Adjustment: qty=-1, unitPrice=grandTotal
  const adjustAmount = invoiceData.grandTotalAmount ?? 0
  const getId        = (v) => !v ? null : (typeof v === 'object' ? v.id : String(v))
  const bpId         = getId(invoiceData.businessPartner)
  const orgId        = getId(invoiceData.organization) || DEFAULT_ORGANIZATION

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
// VOID INVOICE — tombol "Void"
//
// Meniru c_invoice_post DocAction='VO' untuk status belum CO:
//   Validasi: tidak ada C_DEBT_PAYMENT terhubung (@InvoiceWithManualDP@)
//   UPDATE C_INVOICELINE SET QtyInvoiced=0, LineNetAmt=0
//   UPDATE C_INVOICE SET DocStatus='VO', DocAction='--', Processed='Y'
//
// Tabel: C_INVOICELINE, C_INVOICE, FIN_Payment_Schedule, FIN_Payment_ScheduleDetail
// ════════════════════════════════════════════════════
export async function voidInvoice(invoiceId, invoiceData) {
  if (!['CO', 'DR'].includes(invoiceData?.documentStatus)) {
    throw new Error(`Invoice tidak bisa di-Void dari status "${invoiceData?.documentStatus}".`)
  }

  // Validasi: cek tidak ada payment terhubung (meniru @InvoiceWithManualDP@)
  try {
    const schedRes  = await api.get(PAY_SCHED_BASE, {
      params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 10, _selectedProperties: 'id' },
    })
    const schedules = schedRes.data?.response?.data ?? []
    if (schedules.length > 0) {
      const schedIds  = schedules.map(s => `'${s.id}'`).join(',')
      const detailRes = await api.get(PAY_SCHED_DETAIL_BASE, {
        params: { _where: `e.invoicePaymentSchedule.id in (${schedIds}) and e.canceled = false`, _startRow: 0, _endRow: 1 },
      })
      if ((detailRes.data?.response?.data ?? []).length > 0) {
        throw new Error('Invoice ini tidak bisa di-Void karena sudah memiliki Payment yang terhubung.')
      }
    }
  } catch (e) {
    if (e.message?.includes('tidak bisa di-Void')) throw e
    console.warn('[voidInvoice] Cek payment gagal (diabaikan):', e.message)
  }

  // Reset semua C_INVOICELINE: QtyInvoiced=0, LineNetAmt=0
  const linesRes     = await api.get(LINE_BASE, {
    params: { _where: `e.invoice.id = '${invoiceId}'`, _startRow: 0, _endRow: 200 },
  })
  const invoiceLines = linesRes.data?.response?.data ?? []
  for (const line of invoiceLines) {
    await api.put(`${LINE_BASE}/${line.id}`, {
      data: {
        id:               line.id,
        _entityName:      'InvoiceLine',
        invoicedQuantity: 0,
        lineNetAmount:    0,
        grossUnitPrice:   0,
        unitPrice:        0,
        listPrice:        0,
      },
    })
  }

  // UPDATE C_INVOICE: DocStatus='VO', DocAction='--', Processed='Y'
  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:             invoiceId,
      _entityName:    'Invoice',
      documentStatus: 'VO',
      documentAction: '--',
      processed:      true,
    },
  })

  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Void Invoice gagal.')
  }

  return await fetchInvoice(invoiceId)
}