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
    console.error('[SalesOrder HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

const fkWrap = (val) => (val ? { id: val } : undefined)
const today = () => new Date().toISOString().slice(0, 10)

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════
export const DEFAULT_ORGANIZATION = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CURRENCY     = '303'  // IDR
export const DEFAULT_TAX_ID       = 'F3F273F648784C858549A45FF0A69AFA'
export const STANDARD_ORDER_DOCTYPE_ID = '3F571AFD234A4811AFA75C22AEC72B4F'

// ════════════════════════════════════════════════════
// ORDER HEADER
// ════════════════════════════════════════════════════
const ORDER_BASE = '/org.openbravo.service.json.jsonrest/Order'

export async function fetchAllOrders({ startRow = 0, pageSize = 20, searchKey = '', sortCol = 'documentNo', sortDir = 'desc' } = {}) {
  let where = `e.salesTransaction = true`
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

  const res = await api.get(ORDER_BASE, {
    params: {
      _startRow:  startRow,
      _endRow:    startRow + pageSize,
      _noCount:   false,
      _sortBy:    sortBy,   // <--- Tambahkan ini
      _orderBy:   orderBy,  // <--- Timpa nilai statis sebelumnya
      _where:     where,
      _selectedProperties: 'id,documentNo,orderDate,scheduledDeliveryDate,businessPartner,businessPartner$_identifier,documentStatus,grandTotalAmount,summedLineAmount,transactionDocument,transactionDocument$_identifier,organization,organization$_identifier,processed,posted',
    },
  })
  
  const response = res.data?.response ?? res.data
  
  // NOTE: Blok "if (Array.isArray(response?.data)) { ... sort(...) }" 
  // sudah dihapus sepenuhnya di sini agar pengurutan dari API tidak tertimpa.

  return response
}

export async function fetchOrder(id) {
  const res = await api.get(`${ORDER_BASE}/${id}`)
  const wrapped = res.data?.response?.data
  if (wrapped) return Array.isArray(wrapped) ? wrapped[0] : wrapped
  if (res.data?.id) return res.data
  return null
}

export async function createOrder(data) {
  const payload = buildOrderPayload(data)
  const fallbackDate = data.orderDate || today()
  const res = await api.post(ORDER_BASE, {
    data: {
      _entityName:      'Order',
      salesTransaction: true,
      documentStatus:   'DR',
      documentAction:   'CO',
      processed:        false,
      accountingDate:   fallbackDate,
      ...payload,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateOrder(id, data) {
  const payload = buildOrderPayload(data)
  const res = await api.put(`${ORDER_BASE}/${id}`, {
    data: { id, _entityName: 'Order', ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteOrder(id) {
  const ex = await api.get(`${ORDER_BASE}/${id}`)
  const r = (ex.data?.response?.data ?? [])[0] ?? {}
  const res = await api.put(`${ORDER_BASE}/${id}`, {
    data: { id, _entityName: 'Order', active: false, documentNo: r.documentNo },
  })
  return res.data?.response?.data ?? res.data
}

function buildOrderPayload(data) {
  const extractId = (v) => {
    if (!v) return null
    if (typeof v === 'object') return v.id ?? null
    return String(v)
  }

  const orgId  = extractId(data.organization)  || DEFAULT_ORGANIZATION
  const bpId   = extractId(data.businessPartner)
  const paId   = extractId(data.partnerAddress)
  const iaId   = extractId(data.invoiceAddress)
  const ptId   = extractId(data.paymentTerms)
  const pmId   = extractId(data.paymentMethod)
  const whId   = extractId(data.warehouse)
  const plId   = extractId(data.priceList)
  const srId   = extractId(data.salesRepresentative)

  return {
    organization:        orgId,
    transactionDocument: STANDARD_ORDER_DOCTYPE_ID,
    documentType:        STANDARD_ORDER_DOCTYPE_ID,
    currency:            DEFAULT_CURRENCY,
    ...(data.orderDate             && { orderDate:      data.orderDate,
                                        accountingDate: data.accountingDate || data.orderDate }),
    ...(data.scheduledDeliveryDate && { scheduledDeliveryDate: data.scheduledDeliveryDate }),
    ...(bpId  && { businessPartner: bpId }),
    ...(paId  && { partnerAddress:  paId }),
    ...(iaId  && { invoiceAddress:  iaId }),
    ...(ptId  && { paymentTerms:    ptId }),
    ...(pmId  && { paymentMethod:   pmId }),
    ...(whId  && { warehouse:       whId }),
    ...(plId  && { priceList:       plId }),
    ...(srId  && { salesRepresentative: srId }),
    ...(data.invoiceTerm    && { invoiceTerms:  data.invoiceTerm }),
    ...(data.orderReference && { orderReference: data.orderReference }),
    ...(data.description    && { description:    data.description }),
    ...(data.deliveryLocation != null && data.deliveryLocation !== '' && { deliveryLocation: data.deliveryLocation }),
  }
}

// ════════════════════════════════════════════════════
// ORDER LINES
// ════════════════════════════════════════════════════
const LINE_BASE = '/org.openbravo.service.json.jsonrest/OrderLine'

export async function fetchOrderLines(orderId) {
  const res = await api.get(LINE_BASE, {
    params: {
      _where:    `e.salesOrder.id = '${orderId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createOrderLine(orderId, data) {
  const res = await api.post(LINE_BASE, {
    data: {
      _entityName:       'OrderLine',
      salesOrder:        orderId,
      organization:      data.organization || DEFAULT_ORGANIZATION,
      lineNo:            data.lineNo,
      product:           data.product,
      uOM:               data.uOM,
      orderedQuantity:   data.orderedQuantity,
      unitPrice:         data.unitPrice,
      listPrice:         data.listPrice    ?? data.unitPrice,
      standardPrice:     data.standardPrice ?? data.unitPrice,
      priceLimit:        data.priceLimit    ?? 0,
      lineNetAmount:     data.lineNetAmount,
      discount:          data.discount      ?? 0,
      freightAmount:     data.freightAmount ?? 0,
      chargeAmount:      data.chargeAmount  ?? 0,
      tax:               data.tax || DEFAULT_TAX_ID,
      currency:          data.currency || DEFAULT_CURRENCY,
      directShipment:    data.directShipment    ?? false,
      descriptionOnly:   data.descriptionOnly   ?? false,
      cancelPriceAdjustment: data.cancelPriceAdjustment ?? false,
      editLineAmount:    data.editLineAmount    ?? false,
      manageReservation: data.manageReservation ?? false,
      managePrereservation: data.managePrereservation ?? false,
      explode:           data.explode           ?? false,
      printDescription:  data.printDescription  ?? false,
      selectOrderLine:   data.selectOrderLine   ?? false,
      ...(data.warehouse       && { warehouse:       data.warehouse }),
      ...(data.businessPartner && { businessPartner: data.businessPartner }),
      ...(data.partnerAddress  && { partnerAddress:  data.partnerAddress }),
      ...(data.orderDate             && { orderDate:             data.orderDate }),
      ...(data.scheduledDeliveryDate && { scheduledDeliveryDate: data.scheduledDeliveryDate }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateOrderLine(id, data) {
  const res = await api.put(`${LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName:     'OrderLine',
      lineNo:          data.lineNo,
      product:         data.product,
      uOM:             data.uOM,
      orderedQuantity: data.orderedQuantity,
      unitPrice:       data.unitPrice,
      listPrice:       data.listPrice    ?? data.unitPrice,
      standardPrice:   data.standardPrice ?? data.unitPrice,
      lineNetAmount:   data.lineNetAmount,
      discount:        data.discount     ?? 0,
      tax:             data.tax || DEFAULT_TAX_ID,
      ...(data.warehouse             && { warehouse:             data.warehouse }),
      ...(data.businessPartner       && { businessPartner:       data.businessPartner }),
      ...(data.partnerAddress        && { partnerAddress:        data.partnerAddress }),
      ...(data.orderDate             && { orderDate:             data.orderDate }),
      ...(data.scheduledDeliveryDate && { scheduledDeliveryDate: data.scheduledDeliveryDate }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteOrderLine(id) {
  await api.delete(`${LINE_BASE}/${id}`)
}

// ════════════════════════════════════════════════════
// PAYMENT SCHEDULE (after Book)
// ════════════════════════════════════════════════════
const PAYMENT_SCHEDULE_BASE = '/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule'

export async function fetchOrderPaymentSchedule(orderId) {
  const res = await api.get(PAYMENT_SCHEDULE_BASE, {
    params: {
      _where:    `e.order.id = '${orderId}'`,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.dueDate asc',
    },
  })
  return res.data?.response?.data ?? []
}

async function deleteOrderPaymentSchedules(orderId) {
  const res = await api.get(PAYMENT_SCHEDULE_BASE, {
    params: {
      _where:    `e.order.id = '${orderId}'`,
      _startRow: 0,
      _endRow:   50,
    },
  })
  const schedules = res.data?.response?.data ?? []
  for (const s of schedules) {
    await api.delete(`${PAYMENT_SCHEDULE_BASE}/${s.id}`).catch(e =>
      console.warn('[deleteOrderPaymentSchedules] skip:', e.message)
    )
  }
}

// ════════════════════════════════════════════════════
// DOCUMENT ACTIONS
// ════════════════════════════════════════════════════

export async function processOrder(orderId, orderData) {
  if (orderData?.documentStatus !== 'DR') {
    throw new Error(`Order tidak bisa di-Process dari status "${orderData?.documentStatus}". Harus Draft.`)
  }
  const res = await api.put(`${ORDER_BASE}/${orderId}`, {
    data: {
      id:             orderId,
      _entityName:    'Order',
      documentNo:     orderData.documentNo,
      documentStatus: 'IP',   // Set status menjadi In Progress
      documentAction: 'CO',   // Action selanjutnya adalah Book (Complete)
      processed:      false,
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Process Order gagal.')
  }
  return await fetchOrder(orderId)
}

export async function bookOrder(orderId, orderData) {
  if (!['DR', 'IP'].includes(orderData?.documentStatus)) {
    throw new Error(`Order tidak bisa di-Book dari status "${orderData?.documentStatus}". Harus Draft (DR) atau In Progress (IP).`)
  }
  const res = await api.put(`${ORDER_BASE}/${orderId}`, {
    data: {
      id:             orderId,
      _entityName:    'Order',
      documentNo:     orderData.documentNo,
      documentStatus: 'CO',   // Set status menjadi Completed (Booked)
      documentAction: 'CL',   // Action selanjutnya Close
      processed:      true,   // Proses diselesaikan
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Book Order gagal.')
  }
  return await fetchOrder(orderId)
}

export async function voidOrder(orderId, orderData) {
  if (!['DR', 'IP'].includes(orderData?.documentStatus)) {
    throw new Error(`Order tidak bisa di-Void dari status "${orderData?.documentStatus}".`)
  }
  const res = await api.put(`${ORDER_BASE}/${orderId}`, {
    data: {
      id:             orderId,
      _entityName:    'Order',
      documentNo:     orderData.documentNo,
      documentStatus: 'VO',   // Set status menjadi Void
      documentAction: '--',   // Mentok (tidak ada action lagi)
      processed:      true,
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Void Order gagal.')
  }
  return await fetchOrder(orderId)
}

export async function reactivateOrder(orderId, orderData) {
  if (orderData?.documentStatus !== 'CO') {
    throw new Error(`Order tidak bisa di-Reactivate dari status "${orderData?.documentStatus}". Harus Booked (CO).`)
  }

  // Hapus payment schedule lama
  try {
    await deleteOrderPaymentSchedules(orderId)
  } catch (e) {
    console.warn('[reactivateOrder] Gagal hapus payment schedule:', e.message)
  }

  const res = await api.put(`${ORDER_BASE}/${orderId}`, {
    data: {
      id:             orderId,
      _entityName:    'Order',
      documentNo:     orderData.documentNo,
      documentStatus: 'DR',   // Kembali ke Draft
      documentAction: 'CO',   // Action selanjutnya Complete (Book)
      processed:      false,  // Proses dibuka kembali
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Reactivate Order gagal.')
  }
  return await fetchOrder(orderId)
}

export async function closeOrder(orderId, orderData) {
  if (orderData?.documentStatus !== 'CO') {
    throw new Error(`Order tidak bisa di-Close dari status "${orderData?.documentStatus}". Harus Booked (CO).`)
  }

  // 1. Nol-kan semua payment schedule (expected amount & outstanding = 0)
  try {
    const schedRes = await api.get(PAYMENT_SCHEDULE_BASE, {
      params: { _where: `e.order.id = '${orderId}'`, _startRow: 0, _endRow: 50 },
    })
    const schedules = schedRes.data?.response?.data ?? []
    for (const s of schedules) {
      await api.put(`${PAYMENT_SCHEDULE_BASE}/${s.id}`, {
        data: {
          id:                s.id,
          _entityName:       'FIN_Payment_Schedule',
          amount:            0,
          outstandingAmount: 0,
        },
      }).catch(e => console.warn('[closeOrder] skip zero-out schedule:', e.message))
    }
  } catch (e) {
    console.warn('[closeOrder] Gagal nol-kan payment schedule:', e.message)
  }

  // 2. Reactivate: Kembalikan status ke Draft (DR) sementara agar dokumen "terbuka"
  const reactivateRes = await api.put(`${ORDER_BASE}/${orderId}`, {
    data: {
      id:             orderId,
      _entityName:    'Order',
      documentNo:     orderData.documentNo,
      documentStatus: 'DR',
      documentAction: 'CO',
      processed:      false,
    },
  })
  
  const st = reactivateRes.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(reactivateRes.data?.response?.error?.message || 'Gagal membuka kembali order (Reactivate).')
  }

  // 3. Set status ke Closed (CL) dan PAKSA nilai total header menjadi 0
  const closeRes = await api.put(`${ORDER_BASE}/${orderId}`, {
    data: {
      id:               orderId,
      _entityName:      'Order',
      documentNo:       orderData.documentNo,
      documentStatus:   'CL',
      documentAction:   '--',
      processed:        true,
      grandTotalAmount: 0, // <-- Memaksa Grand Total jadi 0
      summedLineAmount: 0  // <-- Memaksa Summed Line jadi 0
    },
  })

  const closeSt = closeRes.data?.response?.status
  if (closeSt !== undefined && closeSt < 0) {
    throw new Error(closeRes.data?.response?.error?.message || 'Gagal menutup order ke status Closed.')
  }

  return await fetchOrder(orderId)
}

// ════════════════════════════════════════════════════
// CREATE PAYMENT PLAN (Manual Generation for SO)
// ════════════════════════════════════════════════════

export async function createOrderPaymentPlan(orderId, orderData) {
  const extractId = (v) => (v && typeof v === 'object') ? v.id : (v || null)

  const orgId       = extractId(orderData.organization) || DEFAULT_ORGANIZATION
  const curId       = extractId(orderData.currency)     || DEFAULT_CURRENCY
  const ptId        = extractId(orderData.paymentTerms)
  const orderDate   = orderData.orderDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  const totalAmount = Number(orderData.grandTotalAmount) || 0

  // ── Resolve Payment Method ──
  let pmId = extractId(orderData.paymentMethod)
    || extractId(orderData.finPaymentmethod)
    || (typeof orderData.paymentMethod === 'string' && orderData.paymentMethod ? orderData.paymentMethod : null)
    || null

  if (!pmId) {
    const bpId = extractId(orderData.businessPartner)
    if (bpId) {
      try {
        const bpRes = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${bpId}`)
        const bp = (bpRes.data?.response?.data ?? [])[0] ?? bpRes.data?.response?.data
        pmId = extractId(bp?.paymentMethod) || extractId(bp?.fin_paymentmethod_id)
      } catch (e) {}
    }
  }

  if (!pmId) {
    try {
      const pmRes = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', {
        params: { _where: 'e.active = true', _startRow: 0, _endRow: 1 },
      })
      pmId = pmRes.data?.response?.data?.[0]?.id ?? null
    } catch (e) {}
  }

  if (!pmId) {
    throw new Error('Payment Method tidak ditemukan untuk order ini. Pastikan customer memiliki Payment Method yang valid.')
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
          const dueDate = addDays(orderDate, offsetDays)

          let lineAmount
          if (idx === termLines.length - 1) {
            lineAmount = remaining // Baris terakhir memakan sisa tagihan
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
      console.warn('[createOrderPaymentPlan] Gagal fetch payment term lines:', e.message)
    }
  }

  // Fallback: satu jadwal penuh jika term line tidak ada
  if (schedules.length === 0) {
    schedules = [{ dueDate: orderDate, amount: totalAmount }]
  }

  // ── POST setiap jadwal ke Openbravo ──
  const created = []
  for (const sched of schedules) {
    const payload = {
      _entityName:       'FIN_Payment_Schedule',
      organization:      orgId,
      order:             orderId,  // CATATAN: Di Invoice field-nya 'invoice', di Order field-nya 'order'
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
      const res = await api.post('/org.openbravo.service.json.jsonrest/FIN_Payment_Schedule', { data: payload })
      const raw = res.data?.response?.data
      created.push(Array.isArray(raw) ? raw[0] : raw)
    } catch (e) {
      throw new Error(`Gagal membuat payment plan (${sched.dueDate}): ${e?.response?.data?.response?.error?.message || e.message}`)
    }
  }

  return created
}

// Helper penambah hari
function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════

export async function fetchDocumentTypes() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
    params: {
      _where:    `e.documentCategory = 'SOO' and e.salesTransaction = true and e.sOSubType = 'SO' and e.active = true`,
      _startRow: 0,
      _endRow:   10,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchCustomers(search = '') {
  let where = `e.businessPartnerCategory.name = 'Customer' and e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', {
    params: {
      _where:    where,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchCustomerById(id) {
  const res = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${id}`)
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  if (raw) return raw
  return res.data?.id ? res.data : null
}

export async function fetchPartnerLocations(businessPartnerId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartnerLocation', {
    params: {
      _where:    `e.businessPartner.id = '${businessPartnerId}' and e.active = true`,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchWarehouses() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Warehouse', {
    params: {
      _where:    `e.active = true`,
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchOrganizations() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Organization', {
    params: {
      _where:    `e.active = true`,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentTerms() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTerm', {
    params: {
      _where:    `e.active = true`,
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentTermLines(paymentTermId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTermLine', {
    params: {
      _where:    `e.paymentTerms.id = '${paymentTermId}'`,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.line asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentMethods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_PaymentMethod', {
    params: {
      _where:    `e.active = true`,
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PricingPriceList', {
    params: {
      _where:    `e.active = true and e.salesPriceList = true`,
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.name asc',
    },
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
    params: {
      _where:    where,
      _startRow: 0,
      _endRow:   50,
      _orderBy:  'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchUOMs() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/UOM', {
    params: {
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.name asc',
    },
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

export async function fetchCurrentUser() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/ADUser', {
    params: {
      _where: `e.username = '${USERNAME}'`,
      _startRow: 0,
      _endRow: 1
    }
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}