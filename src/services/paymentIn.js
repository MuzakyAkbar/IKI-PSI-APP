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
// OUTSTANDING INVOICES
// Query Invoice -> dapat daftar outstanding
// scheduleId di-resolve via FIN_Payment_ScheduleDetail
// (FIN_PaymentSchedule entity tidak dikenal di instance ini)
// ════════════════════════════════════════════════════
const INV_BASE_PAY = '/org.openbravo.service.json.jsonrest/Invoice'

/**
 * Fetch semua invoice outstanding milik customer.
 * scheduleId diambil langsung dari Invoice via _selectedProperties=paymentSchedules
 * sehingga tidak perlu query entitas FIN_PaymentSchedule secara terpisah.
 *
 * Openbravo Invoice response menyertakan array paymentSchedules ketika diminta,
 * tiap elemen punya: id (= FIN_PaymentSchedule.id), dueDate, amount, paidAmount, outstandingAmount
 */
export async function fetchOutstandingInvoices(businessPartnerId) {
  // Request dengan _selectedProperties agar Openbravo sertakan paymentSchedules
  const invRes = await api.get(INV_BASE_PAY, {
    params: {
      _where:               `e.businessPartner.id = '${businessPartnerId}' and e.salesTransaction = true and e.documentStatus = 'CO'`,
      _startRow:            0,
      _endRow:              200,
      _orderBy:             'e.invoiceDate asc',
    },
  })
  const invRows = invRes.data?.response?.data ?? []

  // Filter outstanding
  const outstanding = invRows.filter(r => {
    const grand = Number(r.grandTotalAmount) || 0
    const paid  = Number(r.totalPaid)        || 0
    return grand > paid
  })

  if (!outstanding.length) return []

  // Fetch scheduleId untuk setiap invoice outstanding via FIN_Payment_ScheduleDetail
  // Strategy: query ScheduleDetail yang sudah ada dulu (untuk invoice yang pernah dibayar sebagian)
  // kemudian fallback ke query langsung FIN_Payment_ScheduleDetail by invoice
  const invoiceIds = outstanding.map(r => r.id)
  const scheduleMap = await resolveScheduleIdsDirectly(invoiceIds)

  return outstanding.map(r => ({
    ...r,
    outstandingAmount: (Number(r.grandTotalAmount) || 0) - (Number(r.totalPaid) || 0),
    scheduleId: scheduleMap[r.id] ?? null,
  }))
}

/**
 * Resolve FIN_Payment_Schedule.id untuk setiap invoice.
 * Entity name yang benar: FIN_Payment_Schedule (terkonfirmasi dari error message Openbravo).
 * Query: e.invoice.id in (...) — direct relation dari schedule ke invoice.
 */
async function resolveScheduleIdsDirectly(invoiceIds) {
  if (!invoiceIds.length) return {}
  const idList = invoiceIds.map(id => `'${id}'`).join(',')
  const map = {}
  try {
    const res = await api.get(
      '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule',
      {
        params: {
          _where:    `e.invoice.id in (${idList})`,
          _startRow: 0,
          _endRow:   invoiceIds.length * 5,
          _orderBy:  'e.dueDate asc',
        },
      }
    )
    const status = res.data?.response?.status
    if (status < 0) {
      console.warn('[paymentIn] FIN_Payment_Schedule query failed:', res.data?.response?.error?.message)
      return {}
    }
    const rows = res.data?.response?.data ?? []
    console.info('[paymentIn] FIN_Payment_Schedule rows found:', rows.length)
    for (const r of rows) {
      // invoice field is a plain ID string in jsonrest responses
      const invId = typeof r.invoice === 'object' ? r.invoice?.id : r.invoice
      if (invId && !map[invId]) map[invId] = r.id
    }
  } catch (e) {
    console.warn('[paymentIn] resolveScheduleIds failed:', e.message)
  }
  console.info('[paymentIn] scheduleMap:', map)
  return map
}


// ════════════════════════════════════════════════════
// PAYMENT LINES — baris yang sudah terhubung ke payment ini
// Query FIN_Payment_ScheduleDetail by paymentDetails.finPayment.id
// ════════════════════════════════════════════════════

export async function fetchPaymentLines(paymentId) {
  const res = await api.get(
    '/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail',
    {
      params: {
        _where:    `e.paymentDetails.finPayment.id = '${paymentId}'`,
        _startRow: 0,
        _endRow:   200,
        _orderBy:  'e.creationDate asc',
      },
    }
  )
  const rows = res.data?.response?.data ?? []
  return rows.map(r => ({
    ...r,
    documentNo:       r['invoicePaymentSchedule$invoice$documentNo']
                    || r['orderPaymentSchedule$order$documentNo']
                    || '\u2014',
    invoiceDate:      r['invoicePaymentSchedule$invoice$invoiceDate'] || null,
    dueDate:          r.dueDate || null,
    grandTotalAmount: r.invoiceAmount ?? r.amount,
    orderReference:   r['orderPaymentSchedule$order$documentNo'] || null,
  }))
}

// ════════════════════════════════════════════════════
// FIN_PAYMENT_DETAIL
// ════════════════════════════════════════════════════

/**
 * Ambil FIN_Payment_Detail untuk payment ini.
 * Kalau belum ada (payment baru via API), coba POST dengan payload minimal.
 * Kalau POST juga gagal, return { id: null } — ScheduleDetail akan dikirim
 * tanpa paymentDetails field.
 */
export async function fetchPaymentDetail(paymentId) {
  // 1. GET first
  const getRes = await api.get(
    '/org.openbravo.service.json.jsonrest/FIN_Payment_Detail',
    { params: { _where: `e.finPayment.id = '${paymentId}'`, _startRow: 0, _endRow: 1 } }
  )
  const existing = getRes.data?.response?.data ?? []
  if (existing.length > 0) {
    console.info('[paymentIn] fetchPaymentDetail found:', existing[0].id)
    return existing[0]
  }

  // 2. Not found — POST with minimal payload (no amount/refund which caused errors before)
  console.info('[paymentIn] fetchPaymentDetail: not found, trying POST for', paymentId)
  try {
    const postRes = await api.post(
      '/org.openbravo.service.json.jsonrest/FIN_Payment_Detail',
      { data: { _entityName: 'FIN_Payment_Detail', organization: DEFAULT_ORGANIZATION, finPayment: paymentId } }
    )
    const raw = postRes.data?.response?.data
    const created = Array.isArray(raw) ? raw[0] : raw
    if (created?.id) {
      console.info('[paymentIn] fetchPaymentDetail created:', created.id)
      return created
    }
    console.warn('[paymentIn] fetchPaymentDetail POST response:', JSON.stringify(postRes.data))
  } catch (e) {
    console.warn('[paymentIn] fetchPaymentDetail POST failed:', e.message)
  }

  // 3. Both failed — proceed without paymentDetails (ScheduleDetail posted with finPayment ref instead)
  console.warn('[paymentIn] fetchPaymentDetail: no paymentDetail found, will use finPayment ref')
  return { id: null }
}

export async function addPaymentScheduleDetail(
  paymentDetailId,
  scheduleId,
  invoiceId,
  amount,
  businessPartnerId,
  organizationId,
  financialAccountId = null,
  paymentMethodId    = null,
  paymentId          = null,   // fallback jika paymentDetailId null
) {
  const payload = {
    _entityName:        'FIN_Payment_ScheduleDetail',
    organization:       organizationId || DEFAULT_ORGANIZATION,
    businessPartner:    businessPartnerId,
    amount:             amount,
    expected:           amount,
    invoiceAmount:      amount,
    writeoffAmount:     0,
    doubtfulDebtAmount: 0,
    canceled:           false,
    ...(financialAccountId && { aPRMFinancialAccount: financialAccountId }),
    ...(paymentMethodId    && { aPRMPaymentMethod:    paymentMethodId }),
    // paymentDetails is the FIN_Payment_Detail ID; if null, reference finPayment directly
    ...(paymentDetailId
      ? { paymentDetails: paymentDetailId }
      : paymentId
        ? { finPayment: paymentId }
        : {}),
  }

  if (!scheduleId) {
    // scheduleId wajib — FIN_Payment_Schedule.id harus ada
    // Kalau null, resolveScheduleIdsDirectly gagal menemukan schedule untuk invoice ini
    throw new Error(
      `FIN_Payment_Schedule tidak ditemukan untuk invoice ${invoiceId}. ` +
      `Pastikan invoice sudah memiliki payment schedule di Openbravo.`
    )
  }

  // scheduleId selalu invoicePaymentSchedule (string ID)
  payload.invoicePaymentSchedule = typeof scheduleId === 'object' ? scheduleId.id : scheduleId

  const res = await api.post(
    '/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail',
    { data: payload },
  )
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

/** @deprecated Gunakan addPaymentScheduleDetail */
export async function addPaymentDetail(paymentId, scheduleData) {
  return addPaymentScheduleDetail(
    scheduleData.paymentDetailId,
    scheduleData.invoiceScheduleId,
    scheduleData.amount,
    scheduleData.businessPartnerId,
    DEFAULT_ORGANIZATION,
  )
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
 * POST payment — full settlement semua invoice outstanding.
 * Calls the custom Spring Boot service. Throws a descriptive error when
 * the service is unreachable so callers can show a meaningful message.
 */
export async function postPayment(c_bpartner_id, amount) {
  try {
    const res = await customApi.post('/payment', {
      c_bpartner_id: String(c_bpartner_id),
      amount:        String(amount),
    })
    return res.data
  } catch (err) {
    if (err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_REFUSED' || !err.response) {
      throw new Error(
        'Custom payment service tidak dapat dijangkau (ERR_CONNECTION_REFUSED). ' +
        'Pastikan Spring Boot API berjalan di ' + CUSTOM_API_BASE + '.'
      )
    }
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