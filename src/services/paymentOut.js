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
    console.error('[PaymentOut HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
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

// AP Payment document type — resolved lazily from the server on first use
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
    if (rows.length > 0) {
      _apPaymentDoctypeId = rows[0].id
      console.info('[paymentOut] AP Payment doctype resolved:', _apPaymentDoctypeId, rows[0].name)
      return _apPaymentDoctypeId
    }
    // Fallback: ambil semua doctype non-sales dan cari yang mengandung "Payment"
    const fallbackRes = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
      params: {
        _where:    `e.salesTransaction = false and upper(e.name) like upper('%Payment%')`,
        _startRow: 0,
        _endRow:   10,
        _orderBy:  'e.name asc',
      },
    })
    const fallbackRows = fallbackRes.data?.response?.data ?? []
    if (fallbackRows.length > 0) {
      _apPaymentDoctypeId = fallbackRows[0].id
      console.info('[paymentOut] AP Payment doctype (fallback):', _apPaymentDoctypeId, fallbackRows[0].name)
      return _apPaymentDoctypeId
    }
  } catch (e) {
    console.warn('[paymentOut] Could not resolve AP Payment doctype:', e.message)
  }
  // Last resort: kirim tanpa documentType, biarkan OB assign default
  return null
}

// ════════════════════════════════════════════════════
// PAYMENT HEADER (FIN_Payment)  receipt = false → Payment Out
// ════════════════════════════════════════════════════
const PAY_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment'

export async function fetchAllPayments({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = `e.receipt = false`
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

export async function createPaymentHeader(data) {
  const doctypeId = await resolveApPaymentDoctypeId()
  const res = await api.post(PAY_BASE, {
    data: {
      _entityName:     'FIN_Payment',
      organization:    data.organization || DEFAULT_ORGANIZATION,
      receipt:         false,
      ...(doctypeId && { documentType: doctypeId }),
      businessPartner: data.businessPartner,
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
      ...(data.referenceNo && { referenceNo: data.referenceNo }),
      ...(data.description && { description: data.description }),
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
// VENDOR SEARCH
// ════════════════════════════════════════════════════
const BP_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartner'

export async function searchVendors(q) {
  const s = q.trim().replace(/'/g, "''")
  const res = await api.get(BP_BASE, {
    params: {
      _where:    `e.vendor = true and e.active = true and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`,
      _startRow: 0,
      _endRow:   30,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// OUTSTANDING AP INVOICES (vendor invoice belum lunas)
// ════════════════════════════════════════════════════
const INV_BASE = '/org.openbravo.service.json.jsonrest/Invoice'

export async function fetchOutstandingInvoices(businessPartnerId) {
  const invRes = await api.get(INV_BASE, {
    params: {
      _where:    `e.businessPartner.id = '${businessPartnerId}' and e.salesTransaction = false and e.documentStatus = 'CO' and e.paymentComplete = false`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.invoiceDate asc',
    },
  })
  const invRows = invRes.data?.response?.data ?? []
  if (!invRows.length) return []

  const invoiceIds  = invRows.map(r => r.id)
  const scheduleMap = await resolveScheduleIdsDirectly(invoiceIds)

  return invRows
    .map(r => {
      const sched   = scheduleMap[r.id]
      const grand   = Number(r.grandTotalAmount) || 0
      const paid    = Number(r.totalPaid) || 0
      const schedOutstanding = sched ? sched.outstandingAmount : null
      const outstandingAmount =
        (schedOutstanding !== null && schedOutstanding > 0) ? schedOutstanding :
        (Number(r.outstandingAmount) > 0)                   ? Number(r.outstandingAmount) :
        Math.max(0, grand - paid)
      if (outstandingAmount <= 0) return null
      return {
        ...r,
        _type:          'invoice',
        outstandingAmount,
        scheduleId:     sched?.scheduleId ?? null,
        orderReference: r['order$documentNo'] || null,
      }
    })
    .filter(Boolean)
}

async function resolveScheduleIdsDirectly(invoiceIds) {
  if (!invoiceIds.length) return {}
  const idList = invoiceIds.map(id => `'${id}'`).join(',')
  const map = {}
  try {
    const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule', {
      params: {
        _where:    `e.invoice.id in (${idList})`,
        _startRow: 0,
        _endRow:   invoiceIds.length * 5,
        _orderBy:  'e.dueDate asc',
      },
    })
    const status = res.data?.response?.status
    if (status < 0) {
      console.warn('[paymentOut] FIN_Payment_Schedule query failed:', res.data?.response?.error?.message)
      return {}
    }
    const rows = res.data?.response?.data ?? []
    for (const r of rows) {
      const invId = typeof r.invoice === 'object' ? r.invoice?.id : r.invoice
      if (!invId || map[invId]) continue
      const rawOutstanding =
        r.outstanding       !== undefined ? r.outstanding :
        r.outstandingAmount !== undefined ? r.outstandingAmount :
        r.pendingAmount     !== undefined ? r.pendingAmount :
        null
      const outstandingAmount = rawOutstanding !== null
        ? Math.max(0, Number(rawOutstanding) || 0)
        : Math.max(0, Number(r.amount) || 0)
      map[invId] = { scheduleId: r.id, outstandingAmount }
    }
  } catch (e) {
    console.warn('[paymentOut] resolveScheduleIds failed:', e.message)
  }
  return map
}

// ════════════════════════════════════════════════════
// PAYMENT LINES — FIN_Payment_ScheduleDetail
// ════════════════════════════════════════════════════
export async function fetchPaymentLines(paymentId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail', {
    params: {
      _where: `e.paymentDetails.finPayment.id = '${paymentId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.creationDate asc',
      _selectedProperties: [
        'id', 'amount', 'expectedAmount', 'invoiceAmount', 'writeOffAmt', 'dueDate',
        'canceled', 'invoicePaid', 'businessPartner', 'businessPartner$_identifier',
        'invoicePaymentSchedule', 'invoicePaymentSchedule$_identifier',
        'invoicePaymentSchedule$invoice', 'invoicePaymentSchedule$invoice$documentNo',
        'invoicePaymentSchedule$invoice$invoiceDate', 'invoicePaymentSchedule$invoice$grandTotalAmount',
        'invoicePaymentSchedule$dueDate',
      ].join(','),
    },
  })
  const rows = res.data?.response?.data ?? []
  if (!rows.length) return []

  let lines = rows.map(r => {
    let documentNo  = r['invoicePaymentSchedule$invoice$documentNo'] || null
    let invoiceDate = r['invoicePaymentSchedule$invoice$invoiceDate'] || null
    let grandTotal  = r['invoicePaymentSchedule$invoice$grandTotalAmount'] ?? null

    const invSchedIdentifier = r['invoicePaymentSchedule$_identifier'] || ''
    if (invSchedIdentifier && (!documentNo || !invoiceDate)) {
      const parts = invSchedIdentifier.split(' - ')
      if (parts.length >= 3 && !/^\d{2}-\d{2}-\d{4}$/.test(parts[0].trim())) {
        if (!documentNo)  documentNo  = parts[0].trim()
        if (!invoiceDate) invoiceDate = parts[1].trim()
        if (grandTotal == null) grandTotal = parseFloat((parts[2] || '').replace(/,/g, '')) || 0
      }
    }

    return {
      ...r,
      documentNo:          documentNo || null,
      invoiceDate:         invoiceDate || null,
      dueDate:             r['invoicePaymentSchedule$dueDate'] || r.dueDate || null,
      grandTotalAmount:    grandTotal ?? r.invoiceAmount ?? r.amount ?? 0,
      expectedAmount:      r.expectedAmount ?? r.invoiceAmount ?? r.amount ?? 0,
      businessPartnerName: r['businessPartner$_identifier'] || null,
    }
  })

  // Secondary fetch if documentNo still null
  const missingDocNo = lines.filter(l => !l.documentNo)
  if (missingDocNo.length > 0) {
    const scheduleIds = missingDocNo
      .map(l => typeof l.invoicePaymentSchedule === 'object' ? l.invoicePaymentSchedule?.id : l.invoicePaymentSchedule)
      .filter(Boolean)

    if (scheduleIds.length > 0) {
      const scheduleMap = await resolveScheduleDetails(scheduleIds)
      lines = lines.map(l => {
        if (l.documentNo) return l
        const sId = typeof l.invoicePaymentSchedule === 'object'
          ? l.invoicePaymentSchedule?.id
          : l.invoicePaymentSchedule
        const sched = sId ? scheduleMap[sId] : null
        return {
          ...l,
          documentNo:       sched?.documentNo      || '—',
          invoiceDate:      sched?.invoiceDate      || l.invoiceDate || null,
          dueDate:          sched?.dueDate          || l.dueDate || null,
          grandTotalAmount: sched?.grandTotalAmount ?? l.grandTotalAmount,
        }
      })
    }
  }
  return lines
}

async function resolveScheduleDetails(scheduleIds) {
  if (!scheduleIds.length) return {}
  const idList = scheduleIds.map(id => `'${id}'`).join(',')
  const map = {}
  try {
    const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule', {
      params: {
        _where: `e.id in (${idList})`,
        _startRow: 0,
        _endRow:   scheduleIds.length,
        _selectedProperties: [
          'id', 'dueDate', 'amount', 'invoice', 'invoice$_identifier',
          'invoice$documentNo', 'invoice$invoiceDate', 'invoice$grandTotalAmount',
        ].join(','),
      },
    })
    const rows = res.data?.response?.data ?? []
    for (const r of rows) {
      let documentNo       = r['invoice$documentNo'] || r.invoice?.documentNo || null
      let invoiceDate      = r['invoice$invoiceDate'] || r.invoice?.invoiceDate || null
      let grandTotalAmount = r['invoice$grandTotalAmount'] ?? r.invoice?.grandTotalAmount ?? null
      const identifier     = r['invoice$_identifier'] || r.invoice?._identifier || ''
      if (identifier && (!documentNo || !invoiceDate)) {
        const parts = identifier.split(' - ')
        if (parts.length >= 3) {
          if (!documentNo)      documentNo      = parts[0].trim()
          if (!invoiceDate)     invoiceDate     = parts[1].trim()
          if (grandTotalAmount == null) grandTotalAmount = parseFloat(parts[2].replace(/,/g, '')) || 0
        }
      }
      map[r.id] = { documentNo, invoiceDate, dueDate: r.dueDate || null, grandTotalAmount: grandTotalAmount ?? r.amount ?? 0 }
    }
  } catch (e) {
    console.warn('[paymentOut] resolveScheduleDetails failed:', e.message)
  }
  return map
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
    console.warn('[paymentOut] fetchPaymentDetail POST failed:', e.message)
  }
  return { id: null, finPayment: paymentId }
}

// ════════════════════════════════════════════════════
// FIN_PAYMENT_SCHEDULEDETAIL
// ════════════════════════════════════════════════════
export async function addPaymentScheduleDetail(
  paymentDetailId,
  scheduleId,
  invoiceId,
  amount,
  businessPartnerId,
  organizationId,
  financialAccountId = null,
  paymentMethodId    = null,
  paymentId          = null,
) {
  if (!scheduleId) {
    throw new Error(
      `FIN_Payment_Schedule tidak ditemukan untuk invoice ${invoiceId}. ` +
      `Pastikan sudah memiliki payment schedule di Openbravo.`
    )
  }
  const schedId  = typeof scheduleId === 'object' ? scheduleId.id : scheduleId
  const linkField = paymentDetailId
    ? { paymentDetails: paymentDetailId }
    : paymentId
      ? { finPayment: paymentId }
      : {}

  const res = await api.post('/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail', {
    data: {
      _entityName:            'FIN_Payment_ScheduleDetail',
      organization:           organizationId || DEFAULT_ORGANIZATION,
      businessPartner:        businessPartnerId,
      amount,
      expectedAmount:         0,
      invoiceAmount:          amount,
      writeOffAmt:            0,
      doubtfulDebtAmount:     0,
      canceled:               false,
      invoicePaid:            true,
      invoicePaymentSchedule: schedId,
      ...linkField,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function finalizePaymentAmount(paymentId, totalAmount) {
  const res = await api.put(`${PAY_BASE}/${paymentId}`, {
    data: {
      id:               paymentId,
      _entityName:      'FIN_Payment',
      amount:           totalAmount,
      writeOffAmt:      0,
      status:           'RPPC',   // Awaiting Payment (AP Payment Out)
      processed:        true,
      processProcedure: 'P',
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// FIN_FINACC_TRANSACTION  (payment = amount, deposit = 0 untuk Payment Out)
// ════════════════════════════════════════════════════
const FINACC_TXN_BASE = '/org.openbravo.service.json.jsonrest/FIN_Finacc_Transaction'

export async function createFinaccTransaction({
  paymentId, financialAccountId, paymentDate, amount,
  businessPartnerId, organizationId, currencyId, description,
}) {
  const accId = financialAccountId || DEFAULT_FIN_ACCOUNT_ID
  let lineNo  = 10
  try {
    const countRes = await api.get(FINACC_TXN_BASE, {
      params: { _where: `e.account.id = '${accId}'`, _startRow: 0, _endRow: 1, _noCount: false, _selectedProperties: 'id' },
    })
    lineNo = (Number(countRes.data?.response?.totalRows ?? 0) + 1) * 10
  } catch (e) { console.warn('[paymentOut] lineNo fetch failed:', e.message) }

  const res = await api.post(FINACC_TXN_BASE, {
    data: {
      _entityName:     'FIN_Finacc_Transaction',
      organization:    organizationId || DEFAULT_ORGANIZATION,
      account:         accId,
      finPayment:      paymentId,
      businessPartner: businessPartnerId,
      paymentDate,
      dateAcct:        paymentDate,
      transactionDate: paymentDate,
      depositAmount:   0,          // ← Payment Out: pengeluaran
      paymentAmount:   amount,     // ← Payment Out: sisi keluar
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
// FIN_PAYMENT_SCHEDULE — Update setelah payment
// ════════════════════════════════════════════════════
const PAY_SCHED_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule'

export async function updatePaymentSchedulePaid(scheduleId, paidNow, currentPaid = 0, expectedAmt = 0) {
  const newPaid        = Number(currentPaid) + Number(paidNow)
  const newOutstanding = Math.max(0, Number(expectedAmt) - newPaid)
  const isPaidFull     = newOutstanding <= 0

  const res = await api.put(`${PAY_SCHED_BASE}/${scheduleId}`, {
    data: {
      id:                scheduleId,
      _entityName:       'FIN_Payment_Schedule',
      paidAmount:        newPaid,
      outstandingAmount: newOutstanding,
      outstanding:       newOutstanding,
      receivedAmount:    newPaid,
      expectedAmount:    isPaidFull ? 0 : Number(expectedAmt),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// INVOICE — Update paymentComplete
// ════════════════════════════════════════════════════
export async function updateInvoicePaymentComplete(invoiceId, paymentComplete, totalPaid = null, grandTotal = null) {
  const outstandingAmount = (totalPaid !== null && grandTotal !== null)
    ? Math.max(0, Number(grandTotal) - Number(totalPaid))
    : undefined

  const res = await api.put(`${INV_BASE}/${invoiceId}`, {
    data: {
      id:              invoiceId,
      _entityName:     'Invoice',
      paymentComplete: paymentComplete,
      ...(totalPaid !== null && { totalPaid: Number(totalPaid) }),
      ...(outstandingAmount !== undefined && { outstandingAmount }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function fetchPaymentScheduleById(scheduleId) {
  const res = await api.get(`${PAY_SCHED_BASE}/${scheduleId}`)
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