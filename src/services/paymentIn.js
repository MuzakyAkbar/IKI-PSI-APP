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
export const AR_RECEIPT_DOCTYPE_ID  = 'EDA8FC3A49DB4E839C9EC941C8BE088E' // AR Receipt
export const DEFAULT_ORGANIZATION   = 'B3FE20F490CF49989D7250C0D3341603' // XYZ
export const DEFAULT_CURRENCY       = '303'                                // IDR
export const DEFAULT_FIN_ACCOUNT_ID = 'A9BD9C3ADFA640FDAD392AECEF0B8C07' // Receive Bank - IDR
export const DEFAULT_PAYMETHOD_ID   = '075FF4E8F87E448F9E4E3828F1E91180' // Transfer

// ════════════════════════════════════════════════════
// PAYMENT HEADER (FIN_Payment)
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
      _startRow:  startRow,
      _endRow:    startRow + pageSize,
      _noCount:   false,
      _orderBy:   'e.creationDate desc',
      _where:     where,
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
  const res = await api.post(PAY_BASE, {
    data: {
      _entityName:     'FIN_Payment',
      organization:    data.organization || DEFAULT_ORGANIZATION,
      receipt:         true,
      documentType:    AR_RECEIPT_DOCTYPE_ID,
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
      ...(data.referenceNo  && { referenceNo:  data.referenceNo }),
      ...(data.description  && { description:  data.description }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// FIX #5: handle dua format key (financialAccount dari form, account dari viewRow)
export async function updatePaymentHeader(id, data) {
  const finAccId = data.financialAccount ?? data.account
  const res = await api.put(`${PAY_BASE}/${id}`, {
    data: {
      id,
      _entityName:      'FIN_Payment',
      ...(data.referenceNo        !== undefined && { referenceNo:      data.referenceNo }),
      ...(data.description        !== undefined && { description:      data.description }),
      ...(data.paymentDate        !== undefined && { paymentDate:      data.paymentDate }),
      ...(data.amount             !== undefined && { amount:           data.amount }),
      ...(data.status             !== undefined && { status:           data.status }),
      ...(data.processed          !== undefined && { processed:        data.processed }),
      ...(data.processProcedure   !== undefined && { processProcedure: data.processProcedure }),
      ...(finAccId                !== undefined && { account:          finAccId }),
      ...(data.paymentMethod      !== undefined && { paymentMethod:    data.paymentMethod }),
      ...(data.writeOffAmt        !== undefined && { writeOffAmt:      data.writeOffAmt }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// Soft-delete: set active=false. Hanya jika status masih RPAP.
export async function deletePaymentHeader(id) {
  const res = await api.put(`${PAY_BASE}/${id}`, {
    data: { id, _entityName: 'FIN_Payment', active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// BUSINESS PARTNER SEARCH
// ════════════════════════════════════════════════════
const BP_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartner'

export async function searchBusinessPartners(q) {
  const s = q.trim().replace(/'/g, "''")
  const res = await api.get(BP_BASE, {
    params: {
      _where:    `e.customer = true and e.active = true and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`,
      _startRow: 0,
      _endRow:   30,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// OUTSTANDING INVOICES
// FIX #1 & #2: outstandingAmount diambil dari FIN_Payment_Schedule.outstanding (bukan grandTotal-totalPaid)
// ════════════════════════════════════════════════════
const INV_BASE_PAY = '/org.openbravo.service.json.jsonrest/Invoice'

export async function fetchOutstandingInvoices(businessPartnerId) {
  const invRes = await api.get(INV_BASE_PAY, {
    params: {
      _where:    `e.businessPartner.id = '${businessPartnerId}' and e.salesTransaction = true and e.documentStatus = 'CO' and e.paymentComplete = false`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.invoiceDate asc',
    },
  })
  const invRows = invRes.data?.response?.data ?? []
  if (!invRows.length) return []

  // FIX: Resolve scheduleId DAN outstandingAmount dari FIN_Payment_Schedule
  const invoiceIds = invRows.map(r => r.id)
  const scheduleMap = await resolveScheduleIdsDirectly(invoiceIds)

  // Filter: hanya invoice yang punya outstanding > 0 di schedule
  return invRows
    .map(r => {
      const sched = scheduleMap[r.id]
      // Fallback ke grandTotal - totalPaid jika schedule tidak ditemukan
      const grand = Number(r.grandTotalAmount) || 0
      const paid  = Number(r.totalPaid) || 0
      const outstandingAmount = sched
        ? sched.outstandingAmount
        : Math.max(0, grand - paid)
      if (outstandingAmount <= 0) return null
      return {
        ...r,
        _type:             'invoice',
        outstandingAmount,
        scheduleId:        sched?.scheduleId ?? null,
        orderReference:    r['order$documentNo'] || null,
      }
    })
    .filter(Boolean)
}

export async function fetchOutstandingOrders(businessPartnerId) {
  try {
    const orderRes = await api.get(
      '/org.openbravo.service.json.jsonrest/Order',
      {
        params: {
          _where:    `e.businessPartner.id = '${businessPartnerId}' and e.salesTransaction = true and e.documentStatus = 'CO'`,
          _startRow: 0,
          _endRow:   200,
          _orderBy:  'e.orderDate asc',
          _selectedProperties: 'id,documentNo,orderDate,grandTotalAmount,totalPaid',
        },
      }
    )
    const orders = orderRes.data?.response?.data ?? []
    if (!orders.length) return []

    const unpaid = orders.filter(o => {
      const grand = Number(o.grandTotalAmount) || 0
      const paid  = Number(o.totalPaid) || 0
      return grand > paid
    })
    if (!unpaid.length) return []

    const orderIds = unpaid.map(o => o.id)
    const idList   = orderIds.map(id => `'${id}'`).join(',')

    const schedRes = await api.get(
      '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule',
      {
        params: {
          _where:    `e.order.id in (${idList})`,
          _startRow: 0,
          _endRow:   orderIds.length * 5,
          _orderBy:  'e.dueDate asc',
          _selectedProperties: 'id,dueDate,amount,outstanding,order',
        },
      }
    )
    const schedRows = schedRes.data?.response?.data ?? []

    const schedMap = {}
    for (const s of schedRows) {
      const oid = typeof s.order === 'object' ? s.order?.id : s.order
      if (!oid) continue
      // FIX: gunakan field `outstanding` dari schedule, bukan amount
      // Cek semua kemungkinan nama field outstanding
      const rawOutstanding =
        s.outstanding       !== undefined ? s.outstanding :
        s.outstandingAmount !== undefined ? s.outstandingAmount :
        s.pendingAmount     !== undefined ? s.pendingAmount :
        null
      const outstanding = rawOutstanding !== null
        ? Math.max(0, Number(rawOutstanding) || 0)
        : Math.max(0, Number(s.amount) || 0)
      if (outstanding > 0 && !schedMap[oid]) {
        schedMap[oid] = { scheduleId: s.id, dueDate: s.dueDate, outstandingAmount: outstanding }
      }
    }

    return unpaid
      .map(o => {
        const sched = schedMap[o.id]
        const grand = Number(o.grandTotalAmount) || 0
        const paid  = Number(o.totalPaid) || 0
        const outstanding = sched ? sched.outstandingAmount : Math.max(0, grand - paid)
        if (outstanding <= 0) return null
        return {
          id:                o.id,
          _type:             'order',
          scheduleId:        sched?.scheduleId || null,
          documentNo:        null,
          invoiceDate:       o.orderDate || null,
          dueDate:           sched?.dueDate || null,
          grandTotalAmount:  grand,
          outstandingAmount: outstanding,
          orderReference:    o.documentNo,
        }
      })
      .filter(Boolean)
  } catch (e) {
    console.warn('[paymentIn] fetchOutstandingOrders failed:', e.message)
    return []
  }
}

// resolveScheduleIdsDirectly: return { invoiceId: { scheduleId, outstandingAmount } }
// Tidak pakai _selectedProperties agar semua field dikembalikan OB —
// beberapa versi OB tidak mengembalikan field tertentu saat _selectedProperties dipakai.
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
          // Tidak pakai _selectedProperties agar OB return semua field
        },
      }
    )
    const status = res.data?.response?.status
    if (status < 0) {
      console.warn('[paymentIn] FIN_Payment_Schedule query failed:', res.data?.response?.error?.message)
      return {}
    }
    const rows = res.data?.response?.data ?? []
    for (const r of rows) {
      const invId = typeof r.invoice === 'object' ? r.invoice?.id : r.invoice
      if (!invId || map[invId]) continue

      // Cek semua kemungkinan nama field outstanding di berbagai versi OB.
      // Operator ?? tidak cukup karena Number(undefined) = NaN (bukan null/undefined).
      const rawOutstanding =
        r.outstanding       !== undefined ? r.outstanding :
        r.outstandingAmount !== undefined ? r.outstandingAmount :
        r.pendingAmount     !== undefined ? r.pendingAmount :
        null

      // Jika tidak ada field outstanding sama sekali, fallback ke amount (total tagihan schedule)
      const outstandingAmount = rawOutstanding !== null
        ? Math.max(0, Number(rawOutstanding) || 0)
        : Math.max(0, Number(r.amount) || 0)

      map[invId] = { scheduleId: r.id, outstandingAmount }
    }
  } catch (e) {
    console.warn('[paymentIn] resolveScheduleIds failed:', e.message)
  }
  return map
}

// ════════════════════════════════════════════════════
// PAYMENT LINES — FIN_Payment_ScheduleDetail
// ════════════════════════════════════════════════════
export async function fetchPaymentLines(paymentId) {
  const res = await api.get(
    '/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail',
    {
      params: {
        _where: `e.paymentDetails.finPayment.id = '${paymentId}'`,
        _startRow: 0,
        _endRow: 200,
        _orderBy: 'e.creationDate asc',
        _selectedProperties: [
          'id',
          'amount',
          'expectedAmount',
          'invoiceAmount',
          'writeOffAmt',
          'dueDate',
          'canceled',
          'invoicePaid',
          'businessPartner',
          'businessPartner$_identifier',
          'invoicePaymentSchedule',
          'invoicePaymentSchedule$_identifier',
          'invoicePaymentSchedule$invoice',
          'invoicePaymentSchedule$invoice$documentNo',
          'invoicePaymentSchedule$invoice$invoiceDate',
          'invoicePaymentSchedule$invoice$grandTotalAmount',
          'invoicePaymentSchedule$dueDate',
          'orderPaymentSchedule',
          'orderPaymentSchedule$_identifier',
          'orderPaymentSchedule$order$documentNo',
          'orderPaymentSchedule$order$orderDate',
        ].join(','),
      },
    }
  )
  const rows = res.data?.response?.data ?? []
  if (!rows.length) return []

  let lines = rows.map(r => {
    let documentNo   = r['invoicePaymentSchedule$invoice$documentNo'] || null
    let invoiceDate  = r['invoicePaymentSchedule$invoice$invoiceDate'] || null
    let grandTotal   = r['invoicePaymentSchedule$invoice$grandTotalAmount'] ?? null

    const hasOrder   = !!(r.orderPaymentSchedule || r['orderPaymentSchedule$order$documentNo'])
    const orderDocNo = r['orderPaymentSchedule$order$documentNo'] || null
    const orderDate  = r['orderPaymentSchedule$order$orderDate'] || null

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
      invoiceDate:         invoiceDate || (hasOrder ? orderDate : null),
      dueDate:             r['invoicePaymentSchedule$dueDate'] || r.dueDate || null,
      grandTotalAmount:    grandTotal ?? r.invoiceAmount ?? r.amount ?? 0,
      expectedAmount:      r.expectedAmount ?? r.invoiceAmount ?? r.amount ?? 0,
      orderReference:      orderDocNo || null,
      businessPartnerName: r['businessPartner$_identifier'] || null,
      _isOrderLine:        hasOrder && !r.invoicePaymentSchedule,
    }
  })

  // Step 2 — secondary fetch jika documentNo masih null
  const missingDocNo = lines.filter(l => !l.documentNo)
  if (missingDocNo.length > 0) {
    const scheduleIds = missingDocNo
      .map(l => {
        const s = l.invoicePaymentSchedule
        return typeof s === 'object' ? s?.id : s
      })
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
          documentNo:       sched?.documentNo       || '—',
          invoiceDate:      sched?.invoiceDate       || l.invoiceDate || null,
          dueDate:          sched?.dueDate           || l.dueDate || null,
          grandTotalAmount: sched?.grandTotalAmount  ?? l.grandTotalAmount,
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
    const res = await api.get(
      '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule',
      {
        params: {
          _where: `e.id in (${idList})`,
          _startRow: 0,
          _endRow: scheduleIds.length,
          _selectedProperties: [
            'id',
            'dueDate',
            'amount',
            'invoice',
            'invoice$_identifier',
            'invoice$documentNo',
            'invoice$invoiceDate',
            'invoice$grandTotalAmount',
          ].join(','),
        },
      }
    )
    const rows = res.data?.response?.data ?? []
    for (const r of rows) {
      let documentNo       = r['invoice$documentNo'] || r.invoice?.documentNo || null
      let invoiceDate      = r['invoice$invoiceDate'] || r.invoice?.invoiceDate || null
      let grandTotalAmount = r['invoice$grandTotalAmount'] ?? r.invoice?.grandTotalAmount ?? null

      const identifier = r['invoice$_identifier'] || r.invoice?._identifier || ''
      if (identifier && (!documentNo || !invoiceDate)) {
        const parts = identifier.split(' - ')
        if (parts.length >= 3) {
          if (!documentNo)      documentNo      = parts[0].trim()
          if (!invoiceDate)     invoiceDate     = parts[1].trim()
          if (grandTotalAmount == null) grandTotalAmount = parseFloat(parts[2].replace(/,/g, '')) || 0
        }
      }

      map[r.id] = {
        documentNo,
        invoiceDate,
        dueDate:          r.dueDate || null,
        grandTotalAmount: grandTotalAmount ?? r.amount ?? 0,
      }
    }
  } catch (e) {
    console.warn('[paymentIn] resolveScheduleDetails failed:', e.message)
  }
  return map
}

// ════════════════════════════════════════════════════
// FIN_PAYMENT_DETAIL
// FIX #4: field reference pakai string ID langsung (bukan object)
// ════════════════════════════════════════════════════
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

  // 2. Not found — POST
  console.info('[paymentIn] fetchPaymentDetail: creating for', paymentId)
  try {
    const postRes = await api.post(
      '/org.openbravo.service.json.jsonrest/FIN_Payment_Detail',
      {
        data: {
          _entityName:  'FIN_Payment_Detail',
          organization: DEFAULT_ORGANIZATION,
          finPayment:   paymentId,  // plain string ID sudah cukup di OB REST
          refund:       false,
          amount:       0,
          writeOffAmt:  0,
        }
      }
    )
    const raw = postRes.data?.response?.data
    const created = Array.isArray(raw) ? raw[0] : raw
    if (created?.id) {
      console.info('[paymentIn] fetchPaymentDetail created:', created.id)
      return created
    }
  } catch (e) {
    console.warn('[paymentIn] fetchPaymentDetail POST failed:', e.message)
  }

  // 3. Fallback — kembalikan object dengan finPayment agar caller bisa fallback
  console.warn('[paymentIn] fetchPaymentDetail: returning fallback')
  return { id: null, finPayment: paymentId }
}

// ════════════════════════════════════════════════════
// FIN_PAYMENT_SCHEDULEDETAIL
// FIX #3: field `paymentDetails` sudah benar, hapus aPRMFinancialAccount/aPRMPaymentMethod
//         karena field custom APRM tersebut tidak selalu ada di semua instalasi.
//         Jika ingin tetap dikirim, pastikan nama field sesuai modul APRM yang terpasang.
// ════════════════════════════════════════════════════
export async function addPaymentScheduleDetail(
  paymentDetailId,
  scheduleId,
  invoiceOrOrderId,
  amount,
  businessPartnerId,
  organizationId,
  financialAccountId = null,
  paymentMethodId    = null,
  paymentId          = null,
  itemType           = 'invoice',
) {
  if (!scheduleId) {
    throw new Error(
      `FIN_Payment_Schedule tidak ditemukan untuk ${itemType} ${invoiceOrOrderId}. ` +
      `Pastikan sudah memiliki payment schedule di Openbravo.`
    )
  }

  const schedId = typeof scheduleId === 'object' ? scheduleId.id : scheduleId

  // FIX #9: jika paymentDetailId null, gunakan finPayment sebagai referensi langsung
  const linkField = paymentDetailId
    ? { paymentDetails: paymentDetailId }
    : paymentId
      ? { finPayment: paymentId }
      : {}

  const payload = {
    _entityName:        'FIN_Payment_ScheduleDetail',
    organization:       organizationId || DEFAULT_ORGANIZATION,
    businessPartner:    businessPartnerId,
    amount:             amount,
    expectedAmount:     amount,
    invoiceAmount:      amount,
    writeOffAmt:        0,
    doubtfulDebtAmount: 0,
    canceled:           false,
    invoicePaid:        false,
    ...(itemType === 'order'
      ? { orderPaymentSchedule: schedId }
      : { invoicePaymentSchedule: schedId }
    ),
    ...linkField,
  }

  const res = await api.post(
    '/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail',
    { data: payload },
  )
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
      status:           'RDNC',
      processed:        true,
      processProcedure: 'P',
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// RESOLVE FINANCIAL ACCOUNT dari FIN_Payment_Schedule
// ════════════════════════════════════════════════════
export async function resolveFinancialAccountFromSchedules(scheduleIds) {
  if (!scheduleIds?.length) return DEFAULT_FIN_ACCOUNT_ID
  const idList = scheduleIds.filter(Boolean).map(id => `'${id}'`).join(',')
  if (!idList) return DEFAULT_FIN_ACCOUNT_ID
  try {
    const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule', {
      params: { _where: `e.id in (${idList})`, _startRow: 0, _endRow: scheduleIds.length, _selectedProperties: 'id,finFinancialAccount' },
    })
    const rows = res.data?.response?.data ?? []
    for (const r of rows) {
      const accId = typeof r.finFinancialAccount === 'object' ? r.finFinancialAccount?.id : r.finFinancialAccount
      if (accId) return accId
    }
  } catch (e) { console.warn('[paymentIn] resolveFinancialAccountFromSchedules failed:', e.message) }
  return DEFAULT_FIN_ACCOUNT_ID
}

// ════════════════════════════════════════════════════
// FIN_FINACC_TRANSACTION
// FIX #6: hapus `isReconciled` — bukan field standar OB. Gunakan `reconciled` saja.
// ════════════════════════════════════════════════════
const FINACC_TXN_BASE = '/org.openbravo.service.json.jsonrest/FIN_Finacc_Transaction'

export async function createFinaccTransaction({
  paymentId, financialAccountId, paymentDate, amount,
  businessPartnerId, organizationId, currencyId, description,
}) {
  const accId = financialAccountId || DEFAULT_FIN_ACCOUNT_ID

  let lineNo = 10
  try {
    const countRes = await api.get(FINACC_TXN_BASE, {
      params: { _where: `e.account.id = '${accId}'`, _startRow: 0, _endRow: 1, _noCount: false, _selectedProperties: 'id' },
    })
    lineNo = (Number(countRes.data?.response?.totalRows ?? 0) + 1) * 10
  } catch (e) { console.warn('[paymentIn] lineNo fetch failed:', e.message) }

  const res = await api.post(FINACC_TXN_BASE, {
    data: {
      _entityName:     'FIN_Finacc_Transaction',
      organization:    organizationId || DEFAULT_ORGANIZATION,
      account:         accId,
      finPayment:      paymentId,
      businessPartner: businessPartnerId,
      paymentDate:     paymentDate,
      dateAcct:        paymentDate,
      transactionDate: paymentDate,
      depositAmount:   amount,
      paymentAmount:   0,
      currency:        currencyId || DEFAULT_CURRENCY,
      lineNo:          lineNo,
      processed:       false,
      reconciled:      false,           // FIX: hapus isReconciled, pakai reconciled saja
      ...(description && { description }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// FIN_PAYMENT_SCHEDULE — Update setelah payment
// ════════════════════════════════════════════════════
const PAY_SCHED_BASE_PAYIN = '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule'

export async function updatePaymentSchedulePaid(scheduleId, paidNow, currentPaid = 0, expectedAmt = 0) {
  const newPaid        = Number(currentPaid) + Number(paidNow)
  const newOutstanding = Math.max(0, Number(expectedAmt) - newPaid)
  const res = await api.put(`${PAY_SCHED_BASE_PAYIN}/${scheduleId}`, {
    data: {
      id:                scheduleId,
      _entityName:       'FIN_Payment_Schedule',
      paidAmount:        newPaid,
      outstanding:       newOutstanding,  // FIX: field yang benar adalah `outstanding`, bukan `outstandingAmount`
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// INVOICE — Update paymentComplete
// ════════════════════════════════════════════════════
const INV_BASE_PAYIN = '/org.openbravo.service.json.jsonrest/Invoice'

export async function updateInvoicePaymentComplete(invoiceId, paymentComplete) {
  const res = await api.put(`${INV_BASE_PAYIN}/${invoiceId}`, {
    data: {
      id:              invoiceId,
      _entityName:     'Invoice',
      paymentComplete: paymentComplete,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function fetchPaymentScheduleById(scheduleId) {
  const res = await api.get(`${PAY_SCHED_BASE_PAYIN}/${scheduleId}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// BHM_CASHFLOW_WIP
// ════════════════════════════════════════════════════
const CASHFLOW_BASE = '/org.openbravo.service.json.jsonrest/BHM_Cashflow_Wip'

export async function fetchCashflowByScheduleDetails(scheduleDetailIds) {
  if (!scheduleDetailIds?.length) return []
  const idList = scheduleDetailIds.map(id => `'${id}'`).join(',')
  try {
    const res = await api.get(CASHFLOW_BASE, {
      params: {
        _where:    `e.finPaymentScheduledetail.id in (${idList})`,
        _startRow: 0,
        _endRow:   scheduleDetailIds.length * 5,
        _orderBy:  'e.creationDate asc',
      },
    })
    return res.data?.response?.data ?? []
  } catch (e) {
    console.warn('[paymentIn] fetchCashflowByScheduleDetails failed:', e.message)
    return []
  }
}

export async function updateCashflowCategory(cashflowId, categoryId) {
  const res = await api.put(`${CASHFLOW_BASE}/${cashflowId}`, {
    data: {
      id:                  cashflowId,
      _entityName:         'BHM_Cashflow_Wip',
      bhmCashflowCategory: categoryId,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// CUSTOM PAYMENT API (Spring Boot)
// ════════════════════════════════════════════════════
const CUSTOM_API_BASE = window.APP_CONFIG?.CUSTOM_API_BASE_URL || 'http://localhost:8080/api'

const customApi = axios.create({
  baseURL: CUSTOM_API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

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
// FINANCIAL ACCOUNT
// FIX #7: tambahkan filter active=true
// ════════════════════════════════════════════════════
const FIN_ACC_BASE = '/org.openbravo.service.json.jsonrest/FIN_Financial_Account'

export async function fetchFinancialAccounts() {
  const res = await api.get(FIN_ACC_BASE, {
    params: {
      _where:    `e.active = true`,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// PAYMENT METHOD
// FIX #7: tambahkan filter active=true
// ════════════════════════════════════════════════════
const PAY_METHOD_BASE = '/org.openbravo.service.json.jsonrest/FIN_PaymentMethod'

export async function fetchPaymentMethods() {
  const res = await api.get(PAY_METHOD_BASE, {
    params: {
      _where:    `e.active = true`,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// ERROR INTERCEPTOR
// ════════════════════════════════════════════════════
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