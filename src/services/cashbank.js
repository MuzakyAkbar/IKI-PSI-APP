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
    console.error('[Cashbank HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════
export const DEFAULT_ORGANIZATION   = 'B3FE20F490CF49989D7250C0D3341603' // XYZ
export const DEFAULT_CURRENCY       = '303'                                // IDR
export const DEFAULT_FIN_ACCOUNT_ID = 'A9BD9C3ADFA640FDAD392AECEF0B8C07' // Bank - IDR
export const DEFAULT_PAYMETHOD_ID   = '075FF4E8F87E448F9E4E3828F1E91180' // Transfer
export const AR_RECEIPT_DOCTYPE_ID  = 'EDA8FC3A49DB4E839C9EC941C8BE088E' // AR Receipt (Cashbank In)

// Status akhir setelah GL Item diproses, berbeda untuk in (receipt) vs out.
export function finalStatus(receipt) {
  return receipt ? 'RDNC' : 'RPPC'
}

// AP Payment document type (Cashbank Out) — resolved lazily dari server
let _apPaymentDoctypeId = null
async function resolveApPaymentDoctypeId() {
  if (_apPaymentDoctypeId) return _apPaymentDoctypeId
  try {
    const res = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
      params: {
        _where:    `e.salesTransaction = false and (upper(e.name) like upper('%AP Payment%') or upper(e.name) like upper('%Payment Out%') or upper(e.name) like upper('%Vendor Payment%'))`,
        _startRow: 0,
        _endRow:   5,
        _orderBy:  'e.name asc',
      },
    })
    const rows = res.data?.response?.data ?? []
    if (rows.length > 0) { _apPaymentDoctypeId = rows[0].id; return _apPaymentDoctypeId }
    const fallbackRes = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
      params: {
        _where:    `e.salesTransaction = false and upper(e.name) like upper('%Payment%')`,
        _startRow: 0,
        _endRow:   10,
        _orderBy:  'e.name asc',
      },
    })
    const fallbackRows = fallbackRes.data?.response?.data ?? []
    if (fallbackRows.length > 0) { _apPaymentDoctypeId = fallbackRows[0].id; return _apPaymentDoctypeId }
  } catch (e) {
    console.warn('[cashbank] Could not resolve AP Payment doctype:', e.message)
  }
  return null
}

// ════════════════════════════════════════════════════
// PAYMENT HEADER (FIN_Payment)
// receipt = true  → Cashbank In  (uang masuk)
// receipt = false → Cashbank Out (uang keluar)
// ════════════════════════════════════════════════════
const PAY_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment'

export async function fetchAllPayments({ startRow = 0, pageSize = 20, searchKey = '', receipt = true } = {}) {
  let where = `e.receipt = ${receipt} and e.description like 'GL Item%'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  const res = await api.get(PAY_BASE, {
    params: {
      _startRow: startRow,
      _endRow:   startRow + pageSize,
      _noCount:  false,
      _orderBy:  'e.creationDate desc',
      _where:    where,
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchPayment(id) {
  const res = await api.get(`${PAY_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createPaymentHeader(data, receipt) {
  const doctypeId = receipt ? AR_RECEIPT_DOCTYPE_ID : await resolveApPaymentDoctypeId()
  const res = await api.post(PAY_BASE, {
    data: {
      _entityName:     'FIN_Payment',
      organization:    data.organization || DEFAULT_ORGANIZATION,
      receipt,
      ...(doctypeId && { documentType: doctypeId }),
      ...(data.businessPartner && { businessPartner: data.businessPartner }),
      paymentDate:     data.paymentDate,
      currency:        data.currency || DEFAULT_CURRENCY,
      amount:          0,
      account:         data.financialAccount || DEFAULT_FIN_ACCOUNT_ID,
      paymentMethod:   data.paymentMethod || DEFAULT_PAYMETHOD_ID,
      status:          'RPAP',
      processed:       false,
      writeOffAmt:     0,
      generatedCredit: 0,
      usedCredit:      0,
      description:     'GL Item',
      ...(data.referenceNo && { referenceNo: data.referenceNo }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updatePaymentHeader(id, data) {
  const finAccId = data.financialAccount ?? data.account
  const res = await api.put(`${PAY_BASE}/${id}`, {
    data: {
      id,
      _entityName:    'FIN_Payment',
      ...(data.referenceNo      !== undefined && { referenceNo:      data.referenceNo }),
      ...(data.description      !== undefined && { description:      data.description }),
      ...(data.paymentDate      !== undefined && { paymentDate:      data.paymentDate }),
      ...(data.amount           !== undefined && { amount:           data.amount }),
      ...(data.status           !== undefined && { status:           data.status }),
      ...(data.processed        !== undefined && { processed:        data.processed }),
      ...(data.processProcedure !== undefined && { processProcedure: data.processProcedure }),
      ...(finAccId              !== undefined && { account:          finAccId }),
      ...(data.paymentMethod    !== undefined && { paymentMethod:    data.paymentMethod }),
      ...(data.writeOffAmt      !== undefined && { writeOffAmt:      data.writeOffAmt }),
      ...(data.businessPartner  !== undefined && { businessPartner:  data.businessPartner }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deletePaymentHeader(id) {
  const res = await api.put(`${PAY_BASE}/${id}`, {
    data: { id, _entityName: 'FIN_Payment', active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// BUSINESS PARTNER SEARCH (opsional untuk Cashbank)
// receipt = true  → cari dari customer
// receipt = false → cari dari vendor
// ════════════════════════════════════════════════════
const BP_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartner'

export async function searchBusinessPartners(q, receipt = true) {
  const s = q.trim().replace(/'/g, "''")
  const roleField = receipt ? 'e.customer' : 'e.vendor'
  const res = await api.get(BP_BASE, {
    params: {
      _where:    `${roleField} = true and e.active = true and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`,
      _startRow: 0,
      _endRow:   30,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// GL ITEM — fetch list for dropdown
// ════════════════════════════════════════════════════
const GL_ITEM_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtGLItem'

export async function fetchGLItemsForPayment(search = '') {
  let where = `e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.description) like upper('%${s}%'))`
  }
  const res = await api.get(GL_ITEM_BASE, {
    params: { _where: where, _startRow: 0, _endRow: 100, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// FIN_PAYMENT_DETAIL
// ════════════════════════════════════════════════════
export async function fetchPaymentDetail(paymentId) {
  const getRes = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_Detail', {
    params: { _where: `e.finPayment.id = '${paymentId}'`, _startRow: 0, _endRow: 1 },
  })
  const existing = getRes.data?.response?.data ?? []
  if (existing.length > 0) return existing[0]

  try {
    const postRes = await api.post('/org.openbravo.service.json.jsonrest/FIN_Payment_Detail', {
      data: {
        _entityName:  'FIN_Payment_Detail',
        organization: DEFAULT_ORGANIZATION,
        finPayment:   paymentId,
        refund:       false,
        amount:       0,
        writeOffAmt:  0,
      },
    })
    const raw     = postRes.data?.response?.data
    const created = Array.isArray(raw) ? raw[0] : raw
    if (created?.id) return created
  } catch (e) {
    console.warn('[cashbank] fetchPaymentDetail POST failed:', e.message)
  }
  return { id: null, finPayment: paymentId }
}

// ════════════════════════════════════════════════════
// GL ITEM PAYMENT LINE
// FIN_Payment_ScheduleDetail dengan glitem diisi,
// tanpa invoicePaymentSchedule/orderPaymentSchedule
// ════════════════════════════════════════════════════
export async function addGLItemPaymentDetail(
  paymentDetailId,
  glItemId,
  amount,
  businessPartnerId,
  organizationId,
  description = null,
  paymentId   = null,
) {
  const linkField = paymentDetailId
    ? { paymentDetails: paymentDetailId }
    : paymentId
      ? { finPayment: paymentId }
      : {}

  const res = await api.post('/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail', {
    data: {
      _entityName:        'FIN_Payment_ScheduleDetail',
      organization:       organizationId || DEFAULT_ORGANIZATION,
      ...(businessPartnerId && { businessPartner: businessPartnerId }),
      amount,
      expectedAmount:     0,
      invoiceAmount:      amount,
      writeOffAmt:        0,
      doubtfulDebtAmount: 0,
      canceled:           false,
      invoicePaid:        false,
      glitem:             glItemId,
      ...(description && { description }),
      ...linkField,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// PAYMENT LINES (view modal) — FIN_Payment_ScheduleDetail dengan glitem
// ════════════════════════════════════════════════════
export async function fetchPaymentLines(paymentId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail', {
    params: {
      _where: `e.paymentDetails.finPayment.id = '${paymentId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.creationDate asc',
      _selectedProperties: [
        'id', 'amount', 'description',
        'glitem', 'glitem$_identifier',
        'businessPartner', 'businessPartner$_identifier',
      ].join(','),
    },
  })
  const rows = res.data?.response?.data ?? []
  return rows.map(r => ({
    ...r,
    glItemName: r['glitem$_identifier'] || null,
    businessPartnerName: r['businessPartner$_identifier'] || null,
  }))
}

export async function finalizePaymentAmount(paymentId, totalAmount, receipt) {
  const res = await api.put(`${PAY_BASE}/${paymentId}`, {
    data: {
      id:               paymentId,
      _entityName:      'FIN_Payment',
      amount:           totalAmount,
      writeOffAmt:      0,
      status:           finalStatus(receipt),
      processed:        true,
      processProcedure: 'P',
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// FIN_FINACC_TRANSACTION
// receipt = true  → depositAmount = amount, paymentAmount = 0
// receipt = false → depositAmount = 0, paymentAmount = amount
// ════════════════════════════════════════════════════
const FINACC_TXN_BASE = '/org.openbravo.service.json.jsonrest/FIN_Finacc_Transaction'

export async function createFinaccTransaction({
  paymentId, financialAccountId, paymentDate, amount,
  businessPartnerId, organizationId, currencyId, description, receipt,
}) {
  const accId = financialAccountId || DEFAULT_FIN_ACCOUNT_ID
  let lineNo  = 10
  try {
    const countRes = await api.get(FINACC_TXN_BASE, {
      params: { _where: `e.account.id = '${accId}'`, _startRow: 0, _endRow: 1, _noCount: false, _selectedProperties: 'id' },
    })
    lineNo = (Number(countRes.data?.response?.totalRows ?? 0) + 1) * 10
  } catch (e) { console.warn('[cashbank] lineNo fetch failed:', e.message) }

  const res = await api.post(FINACC_TXN_BASE, {
    data: {
      _entityName:     'FIN_Finacc_Transaction',
      organization:    organizationId || DEFAULT_ORGANIZATION,
      account:         accId,
      finPayment:      paymentId,
      ...(businessPartnerId && { businessPartner: businessPartnerId }),
      paymentDate,
      dateAcct:        paymentDate,
      transactionDate: paymentDate,
      depositAmount:   receipt ? amount : 0,
      paymentAmount:   receipt ? 0 : amount,
      currency:        currencyId || DEFAULT_CURRENCY,
      lineNo,
      processed:       false,
      reconciled:      false,
      ...(description && { description }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// FINANCIAL ACCOUNT
// ════════════════════════════════════════════════════
const FIN_ACC_BASE = '/org.openbravo.service.json.jsonrest/FIN_Financial_Account'

export async function fetchFinancialAccounts() {
  const res = await api.get(FIN_ACC_BASE, {
    params: { _where: 'e.active = true', _startRow: 0, _endRow: 50, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// PAYMENT METHOD
// ════════════════════════════════════════════════════
const PAY_METHOD_BASE = '/org.openbravo.service.json.jsonrest/FIN_PaymentMethod'

export async function fetchPaymentMethods() {
  const res = await api.get(PAY_METHOD_BASE, {
    params: { _where: 'e.active = true', _startRow: 0, _endRow: 50, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// ACCOUNTING FACTS (FinancialMgmtAccountingFact)
// Table ID for FIN_Payment = 800008
// ════════════════════════════════════════════════════
const FACT_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'

export async function fetchAccountingFacts(paymentId) {
  const res = await api.get(FACT_BASE, {
    params: {
      _where:    `e.recordID = '${paymentId}' and e.table.id = 'D1A97202E832470285C9B1EB026D54E2'`,
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.sequenceNumber asc',
    },
  })
  return res.data?.response?.data ?? []
}
