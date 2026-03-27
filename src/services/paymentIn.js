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
// Kolom kunci: Fin_Financial_Account_ID -> "account" di JSON
//              Fin_Paymentmethod_ID     -> "paymentMethod"
//              C_Bpartner_ID            -> "businessPartner"
//              Paymentdate              -> "paymentDate"
//              DocumentNo               -> "documentNo"
//              Referenceno              -> "referenceNo"
//              Status                   -> "status"  (list: RPAP, RDNC, RPVD, RPAE)
//              Generated_Credit         -> "generatedCredit"
//              Used_Credit              -> "usedCredit"
//              Writeoffamt              -> "writeOffAmt"
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

/**
 * Buat Payment Header.
 * FIX: field "account" (Fin_Financial_Account_ID) — field JSON yang benar
 *      "paymentMethod" (Fin_Paymentmethod_ID)
 *      "writeOffAmt" (Writeoffamt) eksplisit 0
 *      "generatedCredit" (Generated_Credit) eksplisit 0
 */
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
      ...(data.referenceNo && { referenceNo: data.referenceNo }),
      ...(data.description && { description: data.description }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updatePaymentHeader(id, data) {
  const res = await api.put(`${PAY_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FIN_Payment',
      ...(data.referenceNo  !== undefined && { referenceNo:  data.referenceNo }),
      ...(data.description  !== undefined && { description:  data.description }),
      ...(data.paymentDate  !== undefined && { paymentDate:  data.paymentDate }),
      ...(data.amount       !== undefined && { amount:       data.amount }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

/**
 * Soft-delete: set active=false.
 * Hanya bisa jika status masih RPAP (Awaiting Payment).
 */
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
// Query Invoice dengan status 'CO' (Completed) yang belum lunas.
// Gunakan FIN_Payment_Schedule untuk mendapat scheduleId.
// ════════════════════════════════════════════════════
const INV_BASE_PAY = '/org.openbravo.service.json.jsonrest/Invoice'

/**
 * Fetch outstanding invoices milik customer.
 * FIX: Filter outstanding sekarang berdasarkan outstandingAmount dari FIN_Payment_Schedule,
 *      bukan grandTotalAmount - totalPaid (karena totalPaid kadang null).
 *      Field yang di-map: grandTotalAmount, dueDate, outstandingAmount, scheduleId.
 */
export async function fetchOutstandingInvoices(businessPartnerId) {
  const invRes = await api.get(INV_BASE_PAY, {
    params: {
      _where:    `e.businessPartner.id = '${businessPartnerId}' and e.salesTransaction = true and e.documentStatus = 'CO'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.invoiceDate asc',
    },
  })
  const invRows = invRes.data?.response?.data ?? []

  // Filter: hanya yang ada outstanding
  const outstanding = invRows.filter(r => {
    const grand = Number(r.grandTotalAmount) || 0
    const paid  = Number(r.totalPaid) || 0
    return grand > paid
  })

  if (!outstanding.length) return []

  // Resolve scheduleId dari FIN_Payment_Schedule
  const invoiceIds = outstanding.map(r => r.id)
  const scheduleMap = await resolveScheduleIdsDirectly(invoiceIds)

  return outstanding.map(r => {
    const grand = Number(r.grandTotalAmount) || 0
    const paid  = Number(r.totalPaid) || 0
    return {
      ...r,
      _type: 'invoice',
      outstandingAmount: grand - paid,
      scheduleId: scheduleMap[r.id] ?? null,
      orderReference: r['order$documentNo'] || null,
    }
  })
}

/**
 * Fetch outstanding orders untuk customer tertentu.
 *
 * Strategi dua tahap (Openbravo tidak support deep-path di _where):
 * 1. Query Order entity — filter by businessPartner.id, salesTransaction=true,
 *    documentStatus='CO' (Completed), dan grandTotalAmount > 0.
 * 2. Resolve FIN_Payment_Schedule per order ID untuk cek outstandingAmount
 *    (field `outstanding` di FIN_Payment_Schedule).
 */
export async function fetchOutstandingOrders(businessPartnerId) {
  try {
    // Step 1 — ambil completed sales orders untuk BP ini
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

    // Filter: hanya order yang belum lunas (grandTotalAmount > totalPaid)
    const unpaid = orders.filter(o => {
      const grand = Number(o.grandTotalAmount) || 0
      const paid  = Number(o.totalPaid) || 0
      return grand > paid
    })
    if (!unpaid.length) return []

    // Step 2 — resolve FIN_Payment_Schedule per order
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

    // Build map: orderId → schedule (ambil yang outstanding > 0)
    const schedMap = {}
    for (const s of schedRows) {
      const oid = typeof s.order === 'object' ? s.order?.id : s.order
      if (!oid) continue
      const outstanding = Number(s.outstanding) || Number(s.amount) || 0
      if (outstanding > 0 && !schedMap[oid]) {
        schedMap[oid] = { scheduleId: s.id, dueDate: s.dueDate, outstandingAmount: outstanding }
      }
    }

    // Jika tidak ada schedule sama sekali, fallback ke order amount - totalPaid
    return unpaid
      .map(o => {
        const sched = schedMap[o.id]
        const grand = Number(o.grandTotalAmount) || 0
        const paid  = Number(o.totalPaid) || 0
        const outstanding = sched ? sched.outstandingAmount : (grand - paid)
        if (outstanding <= 0) return null
        return {
          id:                o.id,
          _type:             'order',
          scheduleId:        sched?.scheduleId || null,
          documentNo:        null,           // order tidak punya invoice no
          invoiceDate:       o.orderDate || null,
          dueDate:           sched?.dueDate || null,
          grandTotalAmount:  grand,
          outstandingAmount: outstanding,
          orderReference:    o.documentNo,   // Order No. tampil di kolom Order No.
        }
      })
      .filter(Boolean)
  } catch (e) {
    console.warn('[paymentIn] fetchOutstandingOrders failed:', e.message)
    return []
  }
}

/**
 * Resolve FIN_Payment_Schedule.id untuk setiap invoice.
 * Entity: FIN_Payment_Schedule, relasi: e.invoice.id
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
// PAYMENT LINES — baris FIN_Payment_ScheduleDetail
// Kolom kunci di FIN_Payment_ScheduleDetail:
//   FIN_Payment_Detail_ID       -> "paymentDetails" (link ke parent)
//   FIN_Payment_Schedule_Invoice-> "invoicePaymentSchedule"
//   FIN_Payment_Schedule_Order  -> "orderPaymentSchedule"
//   Amount                      -> "amount"
//   Writeoffamt                 -> "writeOffAmt"
//   InvoiceAmount               -> "invoiceAmount"
//   ExpectedAmount              -> "expectedAmount"
//   DueDate                     -> "dueDate"
//   C_Bpartner_ID               -> "businessPartner"
//   Isinvoicepaid               -> "invoicePaid"
//   Iscanceled                  -> "canceled"
//   EM_APRM_FinancialAccount    -> "aPRMFinancialAccount"
//   EM_APRM_PaymentMethod       -> "aPRMPaymentMethod"
// ════════════════════════════════════════════════════

/**
 * Fetch payment lines (FIN_Payment_ScheduleDetail) untuk satu payment.
 *
 * Strategi dua tahap:
 * 1. Query ScheduleDetail dengan _selectedProperties agar Openbravo menyertakan
 *    nested fields invoice (documentNo, invoiceDate, grandTotalAmount, dueDate).
 * 2. Jika nested fields masih kosong (Openbravo kadang tidak support semua path),
 *    lakukan secondary fetch ke FIN_Payment_Schedule menggunakan invoicePaymentSchedule IDs
 *    lalu join hasilnya untuk dapat invoice documentNo dan invoiceDate.
 */
export async function fetchPaymentLines(paymentId) {
  // Step 1 — query ScheduleDetail dengan _selectedProperties
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

  // Petakan dulu dari nested properties (dengan fallback _identifier parsing)
  let lines = rows.map(r => {
    let documentNo   = r['invoicePaymentSchedule$invoice$documentNo'] || null
    let invoiceDate  = r['invoicePaymentSchedule$invoice$invoiceDate'] || null
    let grandTotal   = r['invoicePaymentSchedule$invoice$grandTotalAmount'] ?? null

    // Cek apakah ini order-based payment (punya orderPaymentSchedule tapi tidak punya invoicePaymentSchedule)
    const hasOrder   = !!(r.orderPaymentSchedule || r['orderPaymentSchedule$order$documentNo'])
    const orderDocNo = r['orderPaymentSchedule$order$documentNo'] || null
    const orderDate  = r['orderPaymentSchedule$order$orderDate'] || null

    // Parse invoicePaymentSchedule$_identifier sebagai fallback:
    // format: "1000022 - 27-03-2026 - 25000.00"  (documentNo - date - amount)
    // atau FIN_Payment_Schedule _identifier: "11-04-2026 - 0.00" (date - outstandingAmount)
    const invSchedIdentifier = r['invoicePaymentSchedule$_identifier'] || ''
    if (invSchedIdentifier && (!documentNo || !invoiceDate)) {
      const parts = invSchedIdentifier.split(' - ')
      // If first part looks like a document number (not a date), use it
      if (parts.length >= 3 && !/^\d{2}-\d{2}-\d{4}$/.test(parts[0].trim())) {
        if (!documentNo)  documentNo  = parts[0].trim()
        if (!invoiceDate) invoiceDate = parts[1].trim()
        if (grandTotal == null) grandTotal = parseFloat((parts[2] || '').replace(/,/g, '')) || 0
      }
    }

    // If still missing invoiceDate, try FIN_Payment_Schedule _identifier (date-first format)
    const ordSchedIdentifier = r['orderPaymentSchedule$_identifier'] || ''

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

/**
 * Secondary lookup: ambil FIN_Payment_Schedule (+ invoice info) berdasarkan IDs.
 * Openbravo sering mengembalikan info invoice via _identifier field:
 *   "1000022 - 27-03-2026 - 25000.00"  →  documentNo - invoiceDate - amount
 * Kita parse _identifier sebagai fallback jika nested properties kosong.
 */
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
      // Try nested properties first, fallback to _identifier parsing
      let documentNo      = r['invoice$documentNo'] || r.invoice?.documentNo || null
      let invoiceDate     = r['invoice$invoiceDate'] || r.invoice?.invoiceDate || null
      let grandTotalAmount = r['invoice$grandTotalAmount'] ?? r.invoice?.grandTotalAmount ?? null

      // Parse _identifier: "1000022 - 27-03-2026 - 25000.00"
      const identifier = r['invoice$_identifier'] || r.invoice?._identifier || ''
      if (identifier && (!documentNo || !invoiceDate)) {
        const parts = identifier.split(' - ')
        if (parts.length >= 3) {
          if (!documentNo)      documentNo      = parts[0].trim()
          if (!invoiceDate)     invoiceDate     = parts[1].trim()  // "27-03-2026" or ISO
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
// Jembatan antara FIN_Payment (header) dan FIN_Payment_ScheduleDetail (lines).
// ════════════════════════════════════════════════════

/**
 * Ambil FIN_Payment_Detail untuk payment ini.
 * Jika belum ada, buat dengan POST.
 * Jika POST juga gagal, return { id: null }.
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

  // 2. Not found — POST minimal payload
  console.info('[paymentIn] fetchPaymentDetail: not found, trying POST for', paymentId)
  try {
    const postRes = await api.post(
      '/org.openbravo.service.json.jsonrest/FIN_Payment_Detail',
      {
        data: {
          _entityName:  'FIN_Payment_Detail',
          organization: DEFAULT_ORGANIZATION,
          finPayment:   paymentId,
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
    console.warn('[paymentIn] fetchPaymentDetail POST response:', JSON.stringify(postRes.data))
  } catch (e) {
    console.warn('[paymentIn] fetchPaymentDetail POST failed:', e.message)
  }

  // 3. Fallback
  console.warn('[paymentIn] fetchPaymentDetail: no paymentDetail found, will use finPayment ref')
  return { id: null }
}

/**
 * Buat FIN_Payment_ScheduleDetail (satu baris invoice yang dibayar).
 *
 * FIX: Nama field yang benar sesuai skema Openbravo:
 *   - "expectedAmount"   (bukan "expected")
 *   - "invoiceAmount"    ✓ (sudah benar)
 *   - "writeOffAmt"      (bukan "writeoffAmount") — sesuai kolom Writeoffamt
 *   - "doubtfulDebtAmount" ✓
 *   - "invoicePaymentSchedule" ✓
 *   - "paymentDetails"   ✓ (link ke FIN_Payment_Detail)
 *   - "aPRMFinancialAccount" (dari EM_APRM_FinancialAccount)
 *   - "aPRMPaymentMethod"    (dari EM_APRM_PaymentMethod)
 */
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
  itemType           = 'invoice',  // 'invoice' | 'order'
) {
  if (!scheduleId) {
    throw new Error(
      `FIN_Payment_Schedule tidak ditemukan untuk ${itemType} ${invoiceOrOrderId}. ` +
      `Pastikan sudah memiliki payment schedule di Openbravo.`
    )
  }

  const schedId = typeof scheduleId === 'object' ? scheduleId.id : scheduleId

  const payload = {
    _entityName:          'FIN_Payment_ScheduleDetail',
    organization:         organizationId || DEFAULT_ORGANIZATION,
    businessPartner:      businessPartnerId,
    amount:               amount,
    expectedAmount:       amount,
    invoiceAmount:        amount,
    writeOffAmt:          0,
    doubtfulDebtAmount:   0,
    canceled:             false,
    invoicePaid:          false,
    // Gunakan field yang tepat berdasarkan tipe item
    ...(itemType === 'order'
      ? { orderPaymentSchedule: schedId }
      : { invoicePaymentSchedule: schedId }
    ),
    // Link ke FIN_Payment_Detail (atau fallback ke finPayment langsung)
    ...(paymentDetailId
      ? { paymentDetails: paymentDetailId }
      : paymentId
        ? { finPayment: paymentId }
        : {}),
    // Extended fields dari APRM
    ...(financialAccountId && { aPRMFinancialAccount: financialAccountId }),
    ...(paymentMethodId    && { aPRMPaymentMethod:    paymentMethodId }),
  }

  const res = await api.post(
    '/org.openbravo.service.json.jsonrest/FIN_Payment_ScheduleDetail',
    { data: payload },
  )
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

/**
 * Update total amount di payment header setelah semua detail ditambahkan.
 * FIX: Juga update writeOffAmt = 0 secara eksplisit.
 */
export async function finalizePaymentAmount(paymentId, totalAmount) {
  const res = await api.put(`${PAY_BASE}/${paymentId}`, {
    data: {
      id:          paymentId,
      _entityName: 'FIN_Payment',
      amount:      totalAmount,
      writeOffAmt: 0,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// BHM_CASHFLOW_WIP — Tab Cashflow (custom)
// Kolom: BHM_Cashflow_Wip_ID, FIN_Payment_Scheduledetail_ID,
//        GL_Journalline_ID, BHM_Wip_ID, BHM_Cashflow_Category_ID,
//        AD_Client_ID, AD_Org_ID, Isactive
// ════════════════════════════════════════════════════

const CASHFLOW_BASE = '/org.openbravo.service.json.jsonrest/BHM_Cashflow_Wip'

/**
 * Fetch cashflow entries untuk payment ini (via FIN_Payment_ScheduleDetail IDs).
 * @param {string[]} scheduleDetailIds - array of FIN_Payment_ScheduleDetail IDs
 */
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

/**
 * Update BHM_Cashflow_Category untuk satu cashflow entry.
 */
export async function updateCashflowCategory(cashflowId, categoryId) {
  const res = await api.put(`${CASHFLOW_BASE}/${cashflowId}`, {
    data: {
      id:                    cashflowId,
      _entityName:           'BHM_Cashflow_Wip',
      bhmCashflowCategory:   categoryId,
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

/**
 * POST payment ke custom Spring Boot service (full settlement).
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
// FINANCIAL ACCOUNT
// ════════════════════════════════════════════════════
const FIN_ACC_BASE = '/org.openbravo.service.json.jsonrest/FIN_Financial_Account'

export async function fetchFinancialAccounts() {
  const res = await api.get(FIN_ACC_BASE, {
    params: { _startRow: 0, _endRow: 50, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// PAYMENT METHOD
// ════════════════════════════════════════════════════
const PAY_METHOD_BASE = '/org.openbravo.service.json.jsonrest/FIN_PaymentMethod'

export async function fetchPaymentMethods() {
  const res = await api.get(PAY_METHOD_BASE, {
    params: { _startRow: 0, _endRow: 50, _orderBy: 'e.name asc' },
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