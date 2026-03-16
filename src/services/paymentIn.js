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

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════
// IDs diambil dari response JSON Openbravo aktual
export const AR_RECEIPT_DOCTYPE_ID  = 'EDA8FC3A49DB4E839C9EC941C8BE088E' // AR Receipt (Openbravo)
export const DEFAULT_ORGANIZATION   = 'B3FE20F490CF49989D7250C0D3341603' // XYZ
export const DEFAULT_CURRENCY       = '303'                                // IDR
export const DEFAULT_FIN_ACCOUNT_ID = 'A9BD9C3ADFA640FDAD392AECEF0B8C07' // Receive Bank - IDR
export const DEFAULT_PAYMETHOD_ID   = '075FF4E8F87E448F9E4E3828F1E91180' // Transfer

// ════════════════════════════════════════════════════
// PAYMENT HEADER (FIN_PAYMENT via Openbravo JSON REST)
// ════════════════════════════════════════════════════
const PAY_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment'

export async function fetchAllPayments({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = `e.receipt = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  const res = await api.get(PAY_BASE, {
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

export async function fetchPayment(id) {
  const res = await api.get(`${PAY_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

/**
 * Step 1: Create Payment Header di Openbravo (status Awaiting Payment / RPAP)
 * Ini HANYA membuat header dulu, belum ada detail invoice
 */
export async function createPaymentHeader(data) {
  const res = await api.post(PAY_BASE, {
    data: {
      _entityName:              'FIN_Payment',
      organization:             data.organization || DEFAULT_ORGANIZATION,
      receipt:                  true,
      documentType:             AR_RECEIPT_DOCTYPE_ID,
      businessPartner:          data.businessPartner,
      paymentDate:              data.paymentDate,
      currency:                 data.currency || DEFAULT_CURRENCY,
      amount:                   0,
      account:                  data.financialAccount || DEFAULT_FIN_ACCOUNT_ID,
      paymentMethod:            data.paymentMethod || DEFAULT_PAYMETHOD_ID,
      status:                   'RPAP',
      processed:                false,
      ...(data.referenceNo     && { referenceNo: data.referenceNo }),
      ...(data.description     && { description: data.description }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updatePaymentHeader(id, data) {
  const res = await api.put(`${PAY_BASE}/${id}`, {
    data: {
      id,
      _entityName:      'FIN_Payment',
      ...(data.referenceNo  !== undefined && { referenceNo:  data.referenceNo }),
      ...(data.description  !== undefined && { description:  data.description }),
      ...(data.paymentDate  !== undefined && { paymentDate:  data.paymentDate }),
      ...(data.amount       !== undefined && { amount:       data.amount }),
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
// BUSINESS PARTNER SEARCH (reuse pattern dari invoice)
// ════════════════════════════════════════════════════
const BP_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartner'

export async function searchBusinessPartners(q) {
  const s = q.trim().replace(/'/g, "''")
  const res = await api.get(BP_BASE, {
    params: {
      _where:    `e.customer = true and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`,
      _startRow: 0,
      _endRow:   30,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// OUTSTANDING INVOICES — query dari /Invoice Openbravo
// Mengambil invoice yang belum lunas milik business partner
// ════════════════════════════════════════════════════
const INV_BASE_PAY = '/org.openbravo.service.json.jsonrest/Invoice'

/**
 * Fetch semua invoice outstanding milik customer
 * isPaid = false dan salesTransaction = true
 */
export async function fetchOutstandingInvoices(businessPartnerId) {
  // documentStatus='CO' = sudah complete, isPaid tidak ada di HQL
  // outstandingAmount tidak ada di HQL, filter pakai totalpaid = 0 atau grandTotalAmount > 0
  const res = await api.get(INV_BASE_PAY, {
    params: {
      _where:    `e.businessPartner.id = '${businessPartnerId}' and e.salesTransaction = true and e.documentStatus = 'CO'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.invoiceDate asc',
    },
  })
  // Filter outstanding di frontend: grandTotalAmount > totalpaid (field yang ada di response)
  const rows = res.data?.response?.data ?? []
  return rows.filter(r => {
    const grand = Number(r.grandTotalAmount) || 0
    const paid  = Number(r.totalPaid)        || 0
    return grand > paid
  })
}

// ════════════════════════════════════════════════════
// ADD PAYMENT DETAIL LINE ke FIN_Payment
// Menghubungkan payment header dengan invoice schedule
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
// PAYMENT LINES — invoice yang sudah terhubung ke payment
// Openbravo: query Invoice yang outstandingAmount sudah 0 / isPaid = true
// linked ke payment ini via FIN_Payment_ScheduleDetail
// ════════════════════════════════════════════════════

/**
 * Fetch lines — Invoice yang sudah dibayar via payment ini
 * Pakai endpoint Invoice dengan filter payment schedule detail
 */
export async function fetchPaymentLines(paymentId, businessPartnerId) {
  // Fetch invoice CO dan isPaid='Y' milik business partner ini
  // Filter per businessPartner karena Openbravo HQL tidak support subquery via JSON REST
  const where = businessPartnerId
    ? `e.salesTransaction = true and e.documentStatus = 'CO' and e.businessPartner.id = '${businessPartnerId}'`
    : `e.salesTransaction = true and e.documentStatus = 'CO'`
  const res = await api.get('/org.openbravo.service.json.jsonrest/Invoice', {
    params: {
      _where:    where,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.invoiceDate asc',
    },
  })
  const rows = res.data?.response?.data ?? []
  // Filter yang sudah lunas: grandTotalAmount <= totalPaid
  return rows.filter(r => {
    const grand = Number(r.grandTotalAmount) || 0
    const paid  = Number(r.totalPaid)        || 0
    return grand > 0 && paid >= grand
  })
}

// ════════════════════════════════════════════════════
// ADD PAYMENT DETAIL — link invoice ke payment header
// Openbravo: POST ke FIN_Payment_ScheduleDetail
// ════════════════════════════════════════════════════
export async function addPaymentDetail(paymentId, scheduleData) {
  // scheduleData.invoiceScheduleId = FIN_PaymentSchedule.id milik invoice
  // Kita ambil dari invoice.id via FIN_Payment_ScheduleDetail
  const res = await api.post('/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail', {
    data: {
      _entityName:              'FIN_Payment_ScheduleDetail',
      organization:             DEFAULT_ORGANIZATION,
      paymentDetails:           scheduleData.paymentDetailId,
      invoicePaymentSchedule:   scheduleData.invoiceScheduleId,
      amount:                   scheduleData.amount,
      writeoffAmount:           0,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

/**
 * Update amount di payment header setelah detail ditambahkan
 */
export async function finalizePaymentAmount(paymentId, totalAmount) {
  const res = await api.put(`${PAY_BASE}/${paymentId}`, {
    data: {
      id:          paymentId,
      _entityName: 'FIN_Payment',
      amount:      totalAmount,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// PAYMENT DETAIL API (Spring Boot custom)
// Untuk process payment / full settlement
// ════════════════════════════════════════════════════
const CUSTOM_API_BASE = window.APP_CONFIG?.CUSTOM_API_BASE_URL || 'http://localhost:8080/api'

const customApi = axios.create({
  baseURL: CUSTOM_API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * POST payment — full settlement semua invoice outstanding
 */
export async function postPayment(c_bpartner_id, amount) {
  try {
    const res = await customApi.post('/payment', {
      c_bpartner_id: String(c_bpartner_id),
      amount:        String(amount),
    })
    return res.data
  } catch (err) {
    const detail = err.response?.data?.responseDetail
    throw new Error(Array.isArray(detail) ? detail[0] : (err.message || 'Payment gagal'))
  }
}

// ════════════════════════════════════════════════════
// FINANCIAL ACCOUNT (for dropdown Deposit To)
// ════════════════════════════════════════════════════
const FIN_ACC_BASE = '/org.openbravo.service.json.jsonrest/FIN_Financial_Account'

export async function fetchFinancialAccounts() {
  const res = await api.get(FIN_ACC_BASE, {
    params: { _startRow: 0, _endRow: 50, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// PAYMENT METHOD (for dropdown)
// ════════════════════════════════════════════════════
const PAY_METHOD_BASE = '/org.openbravo.service.json.jsonrest/FIN_PaymentMethod'

export async function fetchPaymentMethods() {
  const res = await api.get(PAY_METHOD_BASE, {
    params: { _startRow: 0, _endRow: 50, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// Error interceptor
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
    console.error('[Payment API HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)