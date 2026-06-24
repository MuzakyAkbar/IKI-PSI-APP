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
    console.error('[GoodReceipt HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

const today = () => new Date().toISOString().slice(0, 10)

// ════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════
export const DEFAULT_ORGANIZATION     = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CURRENCY         = '303'                               // IDR
export const MM_RECEIPT_DOCTYPE_ID    = '06A7011485684572BAACBB6D9966C151' // MM Receipt
export const MM_RECEIPT_MOVEMENT_TYPE = 'V+'  // Vendor Receipt (masuk dari vendor)
// ID Costing Algorithm yang aktif — dari kolom m_costing_algorithm_id di data M_Transaction nyata
const COSTING_ALGORITHM_ID            = 'B069080A0AE149A79CF1FA0E24F16AB6'

// ════════════════════════════════════════════════════
// BASE URLS — semua entity endpoint
// ════════════════════════════════════════════════════
const GR_BASE          = '/org.openbravo.service.json.jsonrest/MaterialMgmtShipmentInOut'
const LINE_BASE        = '/org.openbravo.service.json.jsonrest/MaterialMgmtShipmentInOutLine'
const TRANSACTION_BASE = '/org.openbravo.service.json.jsonrest/MaterialMgmtMaterialTransaction'
const TRXCOST_BASE     = '/org.openbravo.service.json.jsonrest/TransactionCost'       // M_Transaction_Cost
const MATCHPO_BASE     = '/org.openbravo.service.json.jsonrest/ProcurementPOInvoiceMatch'
const MATCHINV_BASE    = '/org.openbravo.service.json.jsonrest/ProcurementReceiptInvoiceMatch'
const ORDERLINE_BASE   = '/org.openbravo.service.json.jsonrest/OrderLine'
const INVOICELINE_BASE = '/org.openbravo.service.json.jsonrest/InvoiceLine'
const FACT_BASE        = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'

// Helper: extract ID from string or object
const xId = (v) => (!v ? null : typeof v === 'object' ? v.id : String(v))

export async function fetchAllReceipts({
  startRow  = 0,
  pageSize  = 20,
  searchKey = '',
  sortCol   = 'movementDate',
  sortDir   = 'desc',
} = {}) {
  // Filter: salesTransaction=false AND documentType=MM Receipt
  let where = `e.salesTransaction = false and e.documentType.id = '${MM_RECEIPT_DOCTYPE_ID}'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }

  const sortBy  = (sortDir === 'desc' ? '-' : '') + sortCol
  const orderBy = `e.${sortCol} ${sortDir}, e.documentNo desc`

  const res = await api.get(GR_BASE, {
    params: {
      _startRow: startRow,
      _endRow:   startRow + pageSize,
      _noCount:  false,
      _sortBy:   sortBy,
      _orderBy:  orderBy,
      _where:    where,
      _selectedProperties: [
        'id', 'documentNo', 'movementDate', 'accountingDate',
        'businessPartner', 'businessPartner$_identifier',
        'partnerAddress', 'partnerAddress$_identifier',
        'warehouse', 'warehouse$_identifier',
        'documentStatus', 'documentType', 'documentType$_identifier',
        'organization', 'organization$_identifier',
        'description', 'orderReference', 'posted',
        'salesTransaction', 'processed', 'movementType',
      ].join(','),
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchReceipt(id) {
  const res = await api.get(`${GR_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// AUTO-GENERATE DOCUMENT NUMBER (client-side)
// Format: GR-YYYY/MM-XXXX  contoh: GR-2026/06-0001
// Sama dengan pola generateDocumentNo() di vendorInvoice.js
// ════════════════════════════════════════════════════
export async function generateDocumentNo() {
  const now    = new Date()
  const year   = now.getFullYear()
  const month  = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `GR-${year}/${month}-`

  try {
    const res = await api.get(GR_BASE, {
      params: {
        _where: `e.salesTransaction = false and e.documentType.id = '${MM_RECEIPT_DOCTYPE_ID}' and e.documentNo != '' and e.documentNo is not null and e.documentNo like '${prefix}%'`,
        _startRow: 0,
        _endRow:   1,
        _orderBy:  'e.documentNo desc',
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
    console.warn('[GR generateDocumentNo] Query gagal, fallback ke 0001:', e.message)
  }

  return prefix + '0001'
}

export async function createReceipt(data) {
  // Generate documentNo client-side (pola sama seperti vendorInvoice.js)
  if (!data.documentNo) {
    data = { ...data, documentNo: await generateDocumentNo() }
  }

  const payload = buildReceiptPayload(data)

  // Field defaults diambil dari data M_InOut asli yang sudah berhasil di-Post:
  //   deliveryrule='A', freightcostrule='I', deliveryviarule='P', priorityrule='5'
  const res = await api.post(GR_BASE, {
    data: {
      _entityName:        'MaterialMgmtShipmentInOut',
      salesTransaction:   false,
      documentType:       MM_RECEIPT_DOCTYPE_ID,
      movementType:       MM_RECEIPT_MOVEMENT_TYPE,
      documentStatus:     'DR',
      documentAction:     '--',
      processed:          'N',
      posted:             'N',
      documentNo:         data.documentNo,

      // ── Field wajib dari struktur tabel M_InOut ──────────────────────
      deliveryRule:       'A',       // A = Availability
      freightCostRule:    'I',       // I = Included
      freightAmount:      0,
      deliveryViaRule:    'P',       // P = Pickup
      priorityRule:       '5',       // 5 = Medium
      chargeAmount:       0,
      printed:            'N',
      createFrom:         'N',
      generateTo:         'N',
      logistic:           'N',
      calculateFreight:   'N',
      nettingShipment:    'N',
      completelyInvoiced: 'N',
      invoiceFromShipment: 'N',

      ...payload,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateReceipt(id, data) {
  const payload = buildReceiptPayload(data)
  const res = await api.put(`${GR_BASE}/${id}`, {
    data: { id, _entityName: 'MaterialMgmtShipmentInOut', ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteReceipt(id) {
  const ex  = await api.get(`${GR_BASE}/${id}`)
  const r   = (ex.data?.response?.data ?? [])[0] ?? {}
  const res = await api.put(`${GR_BASE}/${id}`, {
    data: { id, _entityName: 'MaterialMgmtShipmentInOut', documentNo: r.documentNo, active: false },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) throw new Error(res.data?.response?.error?.message || 'Delete Good Receipt gagal.')
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════════════════════════
// COMPLETE GOOD RECEIPT
// Mereplikasi logika m_inout_post (PostgreSQL function) via JSON REST API
//
// Tabel yang dimodifikasi (sesuai function PostgreSQL):
//   INSERT → MaterialMgmtMaterialTransaction  (M_Transaction)   per line stocked
//   INSERT → ProcurementPOInvoiceMatch         (M_MatchPO)       per line dari PO
//   INSERT → ProcurementReceiptInvoiceMatch    (M_MatchInv)      per line yg ada invoice
//   UPDATE → OrderLine                         (C_OrderLine)     update qty delivered/reserved
//   UPDATE → MaterialMgmtShipmentInOut         (M_InOut)         status → CO
// ════════════════════════════════════════════════════════════════════════

export async function completeReceipt(receiptId, receiptData) {
  // ── VALIDASI STATUS ──────────────────────────────────────────────────
  if (receiptData?.documentStatus !== 'DR') {
    throw new Error(
      `Good Receipt harus berstatus Draft (DR). Status saat ini: "${receiptData?.documentStatus}"`
    )
  }

  // ── FETCH SEMUA LINES ────────────────────────────────────────────────
  // (MaterialMgmtShipmentInOutLine = M_InOutLine)
  const linesRes = await api.get(LINE_BASE, {
    params: {
      _where:    `e.shipmentReceipt.id = '${receiptId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
      _selectedProperties: [
        'id', 'lineNo', 'movementQuantity', 'product', 'product$_identifier',
        'uOM', 'storageBin', 'attributeSetInstance',
        'salesOrderLine',                      // C_OrderLine ID (dari PO)
        'organization', 'organization$_identifier',
        'descriptionOnly',
        'unitPrice',                           // harga satuan jika sudah diisi di line
      ].join(','),
    },
  })
  const lines = linesRes.data?.response?.data ?? []

  // Validasi: minimal 1 line (m_inout_post: IF v_Aux=0 THEN RAISE @ReceiptWithoutLines@)
  if (lines.length === 0) {
    throw new Error('Good Receipt harus memiliki minimal satu baris item sebelum bisa di-Complete.')
  }

  // Validasi: setiap line harus punya product jika qty != 0
  // (m_inout_post: ProductNullAndMovementQtyGreaterZero)
  const lineErrors = []
  for (const ln of lines) {
    if (!xId(ln.product) && ln.movementQuantity !== 0) {
      lineErrors.push(`Baris ${ln.lineNo}: Produk wajib diisi jika Qty ≠ 0.`)
    }
    if (xId(ln.product) && (ln.movementQuantity ?? 0) === 0) {
      lineErrors.push(`Baris ${ln.lineNo}: Qty tidak boleh 0 jika produk sudah dipilih.`)
    }
  }
  if (lineErrors.length > 0) throw new Error(lineErrors.join('\n'))

  const orgId    = xId(receiptData.organization)   || DEFAULT_ORGANIZATION
  const clientId = xId(receiptData.client)         || null
  const movDate  = receiptData.movementDate?.slice(0, 10)  || new Date().toISOString().slice(0, 10)
  const accDate  = receiptData.accountingDate?.slice(0, 10) || movDate

  // ── STEP 1: Cek apakah semua lines dari satu C_Order yang sama ────────
  // (m_inout_post: UPDATE M_InOut SET C_Order_Id = ...)
  const orderIds = new Set(
    lines
      .map(ln => xId(ln.salesOrderLine))
      .filter(Boolean)
  )
  // Kita skip update C_Order_ID di header karena perlu resolve OrderLine → Order
  // dan tidak kritis untuk proses complete

  // ── STEP 2: PER LINE — buat M_Transaction & update OrderLine ─────────
  for (const ln of lines) {
    const productId = xId(ln.product)
    if (!productId || ln.descriptionOnly) continue

    const lineQty   = ln.movementQuantity ?? 0
    const locatorId = xId(ln.storageBin)
    const asiId     = xId(ln.attributeSetInstance) || null
    const lineOrgId = xId(ln.organization) || orgId

    // ── 2a+2b. Resolve isStocked & Unit Price sekaligus ───────────────
    // isStocked: hanya stocked item (isstocked='Y', producttype='I') yang dapat M_Transaction
    // unitPrice prioritas: 1) dari OrderLine PO 2) dari InvoiceLine 3) purchasePrice produk
    // Catatan: MaterialMgmtShipmentInOutLine tidak punya field unitPrice di Openbravo,
    // jadi kita selalu fetch dari sumber aslinya (OrderLine / InvoiceLine / Product)
    let isStocked = false
    let unitPrice = 0
    const orderLineId = xId(ln.salesOrderLine)

    console.log(`[completeReceipt] line ${ln.lineNo} — orderLineId: ${orderLineId}, ln.salesOrderLine raw:`, ln.salesOrderLine)

    if (orderLineId) {
      // Fetch harga dari OrderLine (PO) — gunakan _where agar response selalu array
      try {
        const olRes = await api.get(ORDERLINE_BASE, {
          params: {
            _where:    `e.id = '${orderLineId}'`,
            _startRow: 0,
            _endRow:   1,
            _selectedProperties: 'id,unitPrice,listPrice,orderedQuantity,deliveredQuantity,reservedQuantity',
          },
        })
        const ol = olRes.data?.response?.data?.[0]
        console.log(`[completeReceipt] OrderLine fetched:`, ol)
        if (ol) {
          unitPrice = Number(ol.unitPrice) || Number(ol.listPrice) || 0
          ln._ol = ol  // cache untuk step 2d — hindari fetch ulang
        }
      } catch (e) {
        console.warn(`[completeReceipt] Gagal fetch OrderLine price (${orderLineId}):`, e.message)
      }
    }

    // Fallback: ambil harga dari InvoiceLine yang terhubung ke ShipmentInOutLine ini
    // (untuk GR yang di-import dari Vendor Invoice tanpa salesOrderLine)
    if (unitPrice === 0) {
      try {
        const invLineRes = await api.get(INVOICELINE_BASE, {
          params: {
            _where:    `e.goodsShipmentLine.id = '${ln.id}'`,
            _startRow: 0,
            _endRow:   1,
            _selectedProperties: 'id,unitPrice,listPrice,priceActual',
          },
        })
        const il = invLineRes.data?.response?.data?.[0]
        console.log(`[completeReceipt] InvoiceLine fetched:`, il)
        if (il) {
          unitPrice = Number(il.unitPrice) || Number(il.listPrice) || Number(il.priceActual) || 0
        }
      } catch (e) {
        console.warn(`[completeReceipt] Gagal fetch InvoiceLine price untuk line ${ln.lineNo}:`, e.message)
      }
    }

    // Fetch product untuk isStocked + purchasePrice (fallback jika price masih 0)
    try {
      const prodRes = await api.get('/org.openbravo.service.json.jsonrest/Product', {
        params: {
          _where:              `e.id = '${productId}'`,
          _startRow:           0,
          _endRow:             1,
          _selectedProperties: 'id,stocked,productType,purchasePrice',
        },
      })
      const prod = prodRes.data?.response?.data?.[0]
      isStocked = prod?.stocked === true && prod?.productType === 'I'
      if (unitPrice === 0) unitPrice = Number(prod?.purchasePrice) || 0
    } catch (e) {
      console.warn(`[completeReceipt] Gagal fetch Product (${productId}):`, e.message)
    }

    // Hitung cost values:
    // unitCost        = Unit Cost = harga per unit
    // totalCost       = Total Cost = unitCost × qty
    // transactionCost = Trx Original Cost = cost total pada saat transaksi terjadi
    const unitCost        = unitPrice
    const totalCost       = unitCost * Math.abs(lineQty)
    const transactionCost = totalCost

    // ── 2c. INSERT MaterialMgmtMaterialTransaction (M_Transaction) ──────
    // Field yang valid di M_Transaction (dari data nyata):
    //   transactionCost   = Trx Original Cost — ADA DI M_TRANSACTION LANGSUNG
    //   costCalculated    = Y — harus diset true agar bisa di-Post
    //   costingStatus     = 'CC' (Cost Calculated)
    //   currency          = c_currency_id = '303' (IDR)
    //   costingAlgorithm  = ID algoritma costing yang aktif
    if (isStocked && locatorId) {
      let newTrxId = null
      try {
        const trxRes = await api.post(TRANSACTION_BASE, {
          data: {
            _entityName:        'MaterialMgmtMaterialTransaction',
            organization:       lineOrgId,
            goodsShipmentLine:  ln.id,            // M_InOutLine_ID
            movementType:       MM_RECEIPT_MOVEMENT_TYPE,
            storageBin:         locatorId,         // M_Locator_ID
            product:            productId,
            attributeSetValue:  asiId || '0',      // COALESCE(..., '0')
            movementDate:       movDate,
            movementQuantity:   lineQty,
            ...(xId(ln.uOM) && { uOM: xId(ln.uOM) }),
            currency:           DEFAULT_CURRENCY,
            costingAlgorithm:   COSTING_ALGORITHM_ID,
            processed:          'Y',
            checkReservedQty:   'Y',
            // transactionCost & costCalculated di-update via PUT setelah INSERT
            // karena server ignore nilai ini saat POST
          },
        })
        const trxRaw = trxRes.data?.response?.data
        const trxRecord = Array.isArray(trxRaw) ? trxRaw[0] : trxRaw
        newTrxId = trxRecord?.id
      } catch (e) {
        throw new Error(
          `Gagal membuat stock transaction baris ${ln.lineNo} (${ln['product$_identifier']}): ${e.message}`
        )
      }

      // ── PUT setelah INSERT untuk set cost fields ──────────────────────
      // transactionCost & costCalculated tidak bisa diset via POST (server ignore)
      // Harus di-update via PUT setelah record ada.
      // Guard: cukup cek newTrxId — jangan block jika cost=0 (bisa jadi produk gratis)
      console.log(`[completeReceipt] line ${ln.lineNo} cost resolution:`, { unitPrice, unitCost, totalCost, transactionCost, newTrxId })
      if (newTrxId) {
        try {
          await api.put(`${TRANSACTION_BASE}/${newTrxId}`, {
            data: {
              id:               newTrxId,
              _entityName:      'MaterialMgmtMaterialTransaction',
              transactionCost:  transactionCost,
              isCostCalculated: true,
              costingStatus:    'CC',
            },
          })
        } catch (e) {
          console.warn(`[completeReceipt] Gagal update cost fields baris ${ln.lineNo}:`, e.message)
        }
      }

      // ── 2c.i INSERT TransactionCost (M_Transaction_Cost) ──────────────
      // Field mapping dari tabel M_Transaction_Cost:
      //   cost      = Trx Original Cost  (UI label: "Trx Original Cost")
      //   totalCost = Total Cost          (UI label: "Total Cost")
      //   price     = Unit Cost           (UI label: "Unit Cost")
      //   currency  = wajib, mata uang transaksi
      //   manual    = true karena kita isi manual (bukan dari costing engine)
      // Guard: cukup cek newTrxId — insert tetap dilakukan meski cost=0
      if (newTrxId) {
        try {
          const tcRes = await api.post(TRXCOST_BASE, {
            data: {
              _entityName:          'TransactionCost',
              organization:         lineOrgId,
              inventoryTransaction: newTrxId,       // M_Transaction_ID
              accountingDate:       accDate,         // dateacct — wajib diisi
              cost:                 transactionCost, // Trx Original Cost
              totalCost:            totalCost,       // Total Cost
              price:                unitCost,         // Unit Cost
              currency:             DEFAULT_CURRENCY, // wajib — ID currency (IDR='303')
              manual:               true,            // diisi manual, bukan costing engine
              permanent:            false,           // bisa diupdate oleh costing engine
            },
          })
          console.log(`[completeReceipt] TransactionCost inserted baris ${ln.lineNo}:`, tcRes.data?.response?.data?.[0] ?? tcRes.data?.response?.data)
        } catch (e) {
          console.warn(`[completeReceipt] Gagal insert TransactionCost baris ${ln.lineNo}:`, e.message)
        }
      }
    }

    // ── 2d. UPDATE OrderLine (C_OrderLine) ──────────────────────────────
    // (m_inout_post: UPDATE C_ORDERLINE SET QtyReserved=..., QtyDelivered=...)
    // Hanya jika line ini berasal dari PO (salesOrderLine != null)
    if (orderLineId) {
      try {
        // Gunakan data ol yang sudah di-fetch saat resolve price (jika ada)
        // supaya tidak fetch 2x
        let ol = ln._ol
        if (!ol) {
          const olRes = await api.get(`${ORDERLINE_BASE}/${orderLineId}`, {
            params: { _selectedProperties: 'id,orderedQuantity,deliveredQuantity,reservedQuantity' },
          })
          ol = olRes.data?.response?.data?.[0] ?? olRes.data?.response?.data
        }

        if (ol) {
          const newDelivered = (Number(ol.deliveredQuantity)  || 0) + lineQty
          const newReserved  = Math.max(0, (Number(ol.reservedQuantity) || 0) - lineQty)

          // UPDATE C_OrderLine: qtyDelivered += movementQty, qtyReserved -= movementQty
          await api.put(`${ORDERLINE_BASE}/${orderLineId}`, {
            data: {
              id:                 orderLineId,
              _entityName:        'OrderLine',
              deliveredQuantity:  newDelivered,
              reservedQuantity:   newReserved,
              scheduledDeliveryDate: movDate,
            },
          })
        }
      } catch (e) {
        console.warn(`[completeReceipt] Gagal update OrderLine ${orderLineId}:`, e.message)
      }
    }
  } // end for each line

  // ── STEP 3: PO MATCHING (M_MatchPO) — DILEWATI ─────────────────────
  // INSERT manual ke ProcurementPOInvoiceMatch melalui REST API tidak bisa dilakukan
  // karena trigger DB `m_matchpo_trg` memanggil M_UPDATE_STORAGE_PENDING
  // yang membutuhkan M_Warehouse_ID dari C_Order — field ini tidak selalu terisi
  // dan tidak bisa di-patch dari luar secara reliable.
  //
  // MatchPO akan dibuat otomatis oleh Openbravo saat:
  //   - Openbravo native "Complete" flow dijalankan dari UI
  //   - Atau background process "PO Invoice Matching" (M_MatchPO) dijadwalkan
  //
  // Proses GR tetap valid tanpa MatchPO — stock transaction & status sudah benar.

  // ── STEP 4: RECEIPT-INVOICE MATCHING (M_MatchInv) ───────────────────
  // (m_inout_post: INSERT INTO M_MATCHINV ... jika line sudah punya InvoiceLine)
  // Cek apakah ada InvoiceLine yang sudah link ke ShipmentInOutLine ini
  for (const ln of lines) {
    const productId = xId(ln.product)
    if (!productId || ln.descriptionOnly) continue

    const lineQty   = ln.movementQuantity ?? 0
    const lineOrgId = xId(ln.organization) || orgId

    try {
      // Cari InvoiceLine yang referencing line ini
      // (m_inout_post: SELECT ... FROM M_INOUTLINE sl, C_INVOICE i, C_INVOICELINE il
      //  WHERE sl.M_InOutLine_ID=il.M_InOutLine_ID ...)
      const invLinesRes = await api.get(INVOICELINE_BASE, {
        params: {
          _where:    `e.goodsShipmentLine.id = '${ln.id}'`,
          _startRow: 0,
          _endRow:   50,
          _selectedProperties: 'id,product,invoice,invoice$_identifier',
        },
      })
      const invLines = invLinesRes.data?.response?.data ?? []

      for (const il of invLines) {
        const invLineId = il.id
        const invDate   = receiptData.accountingDate?.slice(0, 10) || movDate

        try {
          // INSERT ProcurementReceiptInvoiceMatch (M_MatchInv)
          // (m_inout_post: INSERT INTO M_MATCHINV ...)
          await api.post(MATCHINV_BASE, {
            data: {
              _entityName:       'ProcurementReceiptInvoiceMatch',
              organization:      lineOrgId,
              goodsShipmentLine: ln.id,
              invoiceLine:       invLineId,
              product:           productId,
              transactionDate:   invDate,
              quantity:          lineQty,
              processing:        'N',
              processed:         'Y',
              posted:            'N',
            },
          })
        } catch (e) {
          console.warn(`[completeReceipt] Gagal insert M_MatchInv:`, e.message)
        }
      }
    } catch (e) {
      console.warn(`[completeReceipt] Gagal cek InvoiceLine untuk line ${ln.lineNo}:`, e.message)
    }
  }

  // ── STEP 5: FINALIZE — UPDATE M_InOut header ─────────────────────────
  // (m_inout_post: UPDATE M_INOUT SET Processed='Y', DocStatus='CO',
  //   DocAction='--', Process_Goods_Java='--')
  const finalRes = await api.put(`${GR_BASE}/${receiptId}`, {
    data: {
      id:               receiptId,
      _entityName:      'MaterialMgmtShipmentInOut',
      documentNo:       receiptData.documentNo,
      documentStatus:   'CO',
      documentAction:   '--',
      processGoodsJava: '--',
      processed:        'Y',
      posted:           'N',   // 'N' = siap di-Post ke accounting; jangan biarkan 'D' (Disabled)
    },
  })
  const st = finalRes.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(finalRes.data?.response?.error?.message || 'Complete Good Receipt gagal saat finalisasi.')
  }

  return await fetchReceipt(receiptId)
}

// ════════════════════════════════════════════════════════════════════════
// VOID GOOD RECEIPT (Reverse Correction)
// Mereplikasi logika m_inout_post DocAction='RC'
//
// Tabel yang dimodifikasi:
//   INSERT → MaterialMgmtShipmentInOut         (header reversal baru)
//   INSERT → MaterialMgmtShipmentInOutLine      (lines reversal dengan qty negatif)
//   INSERT → MaterialMgmtMaterialTransaction    (M_Transaction dengan qty negatif)
//   INSERT → ProcurementReceiptInvoiceMatch     (M_MatchInv dengan qty negatif)
//   UPDATE → MaterialMgmtShipmentInOut original (DocStatus='VO')
//   UPDATE → OrderLine                          (rollback qty delivered/reserved)
// ════════════════════════════════════════════════════════════════════════
export async function voidReceipt(receiptId, receiptData) {
  if (receiptData?.documentStatus !== 'CO') {
    throw new Error(
      `Hanya Good Receipt berstatus Complete (CO) yang bisa di-Void. Status saat ini: "${receiptData?.documentStatus}"`
    )
  }

  // Fetch header lengkap
  const header = await fetchReceipt(receiptId)
  if (!header) throw new Error('Good Receipt tidak ditemukan.')

  // Fetch semua lines original
  const linesRes = await api.get(LINE_BASE, {
    params: {
      _where:    `e.shipmentReceipt.id = '${receiptId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  const lines   = linesRes.data?.response?.data ?? []
  const orgId   = xId(header.organization)   || DEFAULT_ORGANIZATION
  const movDate = header.movementDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  const accDate = header.accountingDate?.slice(0, 10) || movDate

  // ── STEP 1: Buat header reversal baru ────────────────────────────────
  // (m_inout_post: INSERT INTO M_INOUT ... '(*R*: ' || Cur_InOut.DocumentNo || ')' ...)
  const reversalDocNo = `*R*: ${header.documentNo}`

  const newHeaderRes = await api.post(GR_BASE, {
    data: {
      _entityName:        'MaterialMgmtShipmentInOut',
      salesTransaction:   false,
      documentType:       xId(header.documentType)     || MM_RECEIPT_DOCTYPE_ID,
      movementType:       header.movementType           || MM_RECEIPT_MOVEMENT_TYPE,
      organization:       orgId,
      businessPartner:    xId(header.businessPartner),
      partnerAddress:     xId(header.partnerAddress),
      warehouse:          xId(header.warehouse),
      movementDate:       movDate,
      accountingDate:     accDate,
      documentNo:         reversalDocNo,
      description:        `(*R*: ${header.documentNo}) ${header.description || ''}`.trim(),
      orderReference:     header.orderReference || null,
      documentStatus:     'DR',
      documentAction:     '--',
      processGoodsJava:   '--',
      processed:          'N',
      posted:             'N',
      // Field wajib sesuai struktur M_InOut
      deliveryRule:       header.deliveryRule     || 'A',
      freightCostRule:    header.freightCostRule   || 'I',
      freightAmount:      0,
      deliveryViaRule:    header.deliveryViaRule   || 'P',
      priorityRule:       header.priorityRule      || '5',
      chargeAmount:       0,
      printed:            'N',
      createFrom:         'N',
      generateTo:         'N',
      logistic:           'N',
      calculateFreight:   'N',
      nettingShipment:    'N',
      completelyInvoiced: 'N',
      invoiceFromShipment: 'N',
    },
  })
  const newHeaderSt = newHeaderRes.data?.response?.status
  if (newHeaderSt !== undefined && newHeaderSt < 0) {
    throw new Error(newHeaderRes.data?.response?.error?.message || 'Gagal membuat header reversal.')
  }
  const newHeaderRaw = newHeaderRes.data?.response?.data
  const newHeader    = Array.isArray(newHeaderRaw) ? newHeaderRaw[0] : newHeaderRaw
  const newReceiptId = newHeader?.id
  if (!newReceiptId) throw new Error('Gagal mendapatkan ID header reversal.')

  // ── STEP 2: Buat lines reversal dengan qty negatif ───────────────────
  // (m_inout_post: INSERT INTO M_INOUTLINE ... MovementQty * -1 ...)
  for (const ln of lines) {
    if (!xId(ln.product)) continue
    const negQty = -(ln.movementQuantity ?? 0)

    try {
      await api.post(LINE_BASE, {
        data: {
          _entityName:         'MaterialMgmtShipmentInOutLine',
          shipmentReceipt:     newReceiptId,
          organization:        xId(ln.organization) || orgId,
          lineNo:              ln.lineNo,
          product:             xId(ln.product),
          uOM:                 xId(ln.uOM) || null,
          storageBin:          xId(ln.storageBin) || null,
          movementQuantity:    negQty,
          description:         `*R*: ${ln.description || ''}`.trim(),
          // Link ke line original (canceled_inoutline_id → field: cancelledInoutline)
          cancelledInoutline:  ln.id,
          // Salin link PO line jika ada
          ...(xId(ln.salesOrderLine) && { salesOrderLine: xId(ln.salesOrderLine) }),
          descriptionOnly:     false,
          reinvoice:           false,
        },
      })
    } catch (e) {
      console.warn(`[voidReceipt] Gagal buat line reversal ${ln.lineNo}:`, e.message)
    }
  }

  // ── STEP 3: Insert M_Transaction dengan qty negatif per line ─────────
  // (m_inout_post: PERFORM M_INOUT_POST(NULL, v_RInOut_ID) → recursive call)
  // Kita eksekusi sendiri logika insert transaction untuk reversal
  for (const ln of lines) {
    const productId = xId(ln.product)
    if (!productId || ln.descriptionOnly) continue

    const negQty    = -(ln.movementQuantity ?? 0)
    const locatorId = xId(ln.storageBin)
    const lineOrgId = xId(ln.organization) || orgId

    // Cek stocked
    let isStocked = false
    try {
      const prodRes = await api.get('/org.openbravo.service.json.jsonrest/Product', {
        params: { _where: `e.id = '${productId}'`, _startRow: 0, _endRow: 1, _selectedProperties: 'id,stocked,productType' },
      })
      const prod = prodRes.data?.response?.data?.[0]
      isStocked = prod?.stocked === true && prod?.productType === 'I'
    } catch (_) {}

    if (isStocked && locatorId) {
      let newTrxId = null
      try {
        // cost fields tidak dikirim di POST — server ignore nilai ini saat INSERT
        const trxRes = await api.post(TRANSACTION_BASE, {
          data: {
            _entityName:       'MaterialMgmtMaterialTransaction',
            organization:      lineOrgId,
            goodsShipmentLine: ln.id,
            movementType:      MM_RECEIPT_MOVEMENT_TYPE,
            storageBin:        locatorId,
            product:           productId,
            attributeSetValue: xId(ln.attributeSetInstance) || '0',
            movementDate:      movDate,
            movementQuantity:  negQty,
            ...(xId(ln.uOM) && { uOM: xId(ln.uOM) }),
            currency:          DEFAULT_CURRENCY,
            costingAlgorithm:  COSTING_ALGORITHM_ID,
            processed:         'Y',
            checkReservedQty:  'Y',
          },
        })
        const trxRaw = trxRes.data?.response?.data
        const trxRecord = Array.isArray(trxRaw) ? trxRaw[0] : trxRaw
        newTrxId = trxRecord?.id
      } catch (e) {
        console.warn(`[voidReceipt] Gagal insert M_Transaction reversal line ${ln.lineNo}:`, e.message)
      }

      // PUT setelah INSERT untuk set cost fields (server ignore saat POST)
      if (newTrxId) {
        const origUnitCost = Number(ln.unitPrice) || 0
        const negTrxCost   = -(origUnitCost * Math.abs(ln.movementQuantity ?? 0))

        try {
          await api.put(`${TRANSACTION_BASE}/${newTrxId}`, {
            data: {
              id:               newTrxId,
              _entityName:      'MaterialMgmtMaterialTransaction',
              transactionCost:  negTrxCost,
              isCostCalculated: true,
              costingStatus:    'CC',
            },
          })
        } catch (e) {
          console.warn(`[voidReceipt] Gagal update cost fields reversal line ${ln.lineNo}:`, e.message)
        }
      }
    }

    // Rollback OrderLine qty
    const orderLineId = xId(ln.salesOrderLine)
    if (orderLineId) {
      try {
        const olRes = await api.get(`${ORDERLINE_BASE}/${orderLineId}`, {
          params: { _selectedProperties: 'id,deliveredQuantity,reservedQuantity' },
        })
        const ol = olRes.data?.response?.data?.[0] ?? olRes.data?.response?.data
        if (ol) {
          const origQty     = ln.movementQuantity ?? 0
          const newDelivered = Math.max(0, (Number(ol.deliveredQuantity) || 0) - origQty)
          const newReserved  = (Number(ol.reservedQuantity) || 0) + origQty

          await api.put(`${ORDERLINE_BASE}/${orderLineId}`, {
            data: {
              id:                orderLineId,
              _entityName:       'OrderLine',
              deliveredQuantity: newDelivered,
              reservedQuantity:  newReserved,
            },
          })
        }
      } catch (e) {
        console.warn(`[voidReceipt] Gagal rollback OrderLine ${orderLineId}:`, e.message)
      }
    }
  }

  // ── STEP 4: Finalize reversal header → CO ────────────────────────────
  // (m_inout_post: UPDATE M_INOUT SET DocStatus='VO' WHERE M_InOut_ID=v_RInOut_ID)
  try {
    await api.put(`${GR_BASE}/${newReceiptId}`, {
      data: {
        id:               newReceiptId,
        _entityName:      'MaterialMgmtShipmentInOut',
        documentStatus:   'VO',
        documentAction:   '--',
        processGoodsJava: '--',
        processed:        'Y',
      },
    })
  } catch (e) {
    console.warn('[voidReceipt] Gagal finalize header reversal:', e.message)
  }

  // ── STEP 5: Update dokumen original → Voided ─────────────────────────
  // (m_inout_post: UPDATE M_INOUT SET Description=...||' (*R*=...')',
  //   Processed='Y', DocStatus='VO', DocAction='--')
  const voidRes = await api.put(`${GR_BASE}/${receiptId}`, {
    data: {
      id:               receiptId,
      _entityName:      'MaterialMgmtShipmentInOut',
      documentNo:       header.documentNo,
      description:      `${header.description || ''} (*R*=${reversalDocNo})`.trim(),
      documentStatus:   'VO',
      documentAction:   '--',
      processGoodsJava: '--',
      processed:        'Y',
    },
  })
  const voidSt = voidRes.data?.response?.status
  if (voidSt !== undefined && voidSt < 0) {
    throw new Error(voidRes.data?.response?.error?.message || 'Void Good Receipt gagal.')
  }

  return await fetchReceipt(receiptId)
}

function buildReceiptPayload(data) {

  return {
    organization:    xId(data.organization)   || DEFAULT_ORGANIZATION,
    ...(data.movementDate   && { movementDate:   data.movementDate }),
    ...(data.accountingDate && { accountingDate: data.accountingDate }),
    ...(data.businessPartner && { businessPartner: xId(data.businessPartner) }),
    ...(data.partnerAddress  && { partnerAddress:  xId(data.partnerAddress)  }),
    ...(data.warehouse       && { warehouse:       xId(data.warehouse)       }),
    ...(data.purchaseOrder   && { purchaseOrder:   xId(data.purchaseOrder)   }),
    ...(data.description    && { description:    data.description    }),
    ...(data.orderReference && { orderReference: data.orderReference }),
  }
}

// ════════════════════════════════════════════════════
// RECEIPT LINES (MaterialMgmtShipmentInOutLine)
// ════════════════════════════════════════════════════

export async function fetchReceiptLines(receiptId) {
  const res = await api.get(LINE_BASE, {
    params: {
      _where:   `e.shipmentReceipt.id = '${receiptId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createReceiptLine(receiptId, data) {
  const res = await api.post(LINE_BASE, {
    data: {
      _entityName:      'MaterialMgmtShipmentInOutLine',
      shipmentReceipt:  receiptId,
      organization:     xId(data.organization) || DEFAULT_ORGANIZATION,
      lineNo:           data.lineNo,
      movementQuantity: data.movementQuantity ?? 1,
      ...(data.product     && { product:      xId(data.product)     }),
      ...(data.uOM         && { uOM:           xId(data.uOM)         }),
      ...(data.storageBin  && { storageBin:    xId(data.storageBin)  }),
      // Link ke order line (dari PO) — dipakai untuk M_MatchPO dan cost resolution
      ...(data.salesOrderLine && { salesOrderLine: xId(data.salesOrderLine) }),
      // Simpan unitPrice di line agar tersedia saat complete untuk cost fields M_Transaction
      ...(data.unitPrice != null && data.unitPrice !== 0 && { unitPrice: data.unitPrice }),
      ...(data.description   && { description:     data.description }),
      reinvoice:        data.reinvoice ?? true,
      descriptionOnly:  false,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateReceiptLine(id, data) {
  const res = await api.put(`${LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName:      'MaterialMgmtShipmentInOutLine',
      lineNo:           data.lineNo,
      movementQuantity: data.movementQuantity ?? 1,
      ...(data.product    && { product:     xId(data.product)    }),
      ...(data.uOM        && { uOM:          xId(data.uOM)        }),
      ...(data.storageBin && { storageBin:   xId(data.storageBin) }),
      ...(data.salesOrderLine && { salesOrderLine: xId(data.salesOrderLine) }),
      ...(data.unitPrice != null && data.unitPrice !== 0 && { unitPrice: data.unitPrice }),
      ...(data.description   && { description:     data.description }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteReceiptLine(id) {
  await api.delete(`${LINE_BASE}/${id}`)
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════

// Vendor (Business Partner)
export async function fetchVendors(search = '') {
  let where = `e.vendor = true and e.active = true`
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

export async function fetchVendorById(id) {
  const res = await api.get(`/org.openbravo.service.json.jsonrest/BusinessPartner/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function fetchPartnerLocations(businessPartnerId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartnerLocation', {
    params: {
      _where:    `e.businessPartner.id = '${businessPartnerId}' and e.active = true`,
      _startRow: 0,
      _endRow:   50,
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// REFERENCE PREVIEW LOOKUPS
// ════════════════════════════════════════════════════

export async function fetchPurchaseOrderById(id) {
  // Fetch by ID menggunakan _where agar response selalu array — lebih konsisten di Openbravo
  const res = await api.get('/org.openbravo.service.json.jsonrest/Order', {
    params: {
      _where: `e.id = '${id}'`,
      _startRow: 0,
      _endRow: 1,
      _selectedProperties: [
        'id', 'documentNo', 'orderDate', 'scheduledDeliveryDate',
        'grandTotalAmount', 'documentStatus',
        'businessPartner', 'businessPartner$_identifier',
        'partnerAddress', 'partnerAddress$_identifier',
        'currency', 'currency$_identifier',
        'description', 'salesTransaction',
      ].join(','),
    },
  })
  const raw = res.data?.response?.data ?? []
  return raw[0] ?? null
}

export async function fetchVendorInvoiceById(id) {
  // Fetch by ID menggunakan _where agar response selalu array — lebih konsisten di Openbravo
  const res = await api.get('/org.openbravo.service.json.jsonrest/Invoice', {
    params: {
      _where: `e.id = '${id}'`,
      _startRow: 0,
      _endRow: 1,
      _selectedProperties: [
        'id', 'documentNo', 'invoiceDate', 'accountingDate',
        'grandTotalAmount', 'documentStatus',
        'businessPartner', 'businessPartner$_identifier',
        'partnerAddress', 'partnerAddress$_identifier',
        'currency', 'currency$_identifier',
        'description', 'salesTransaction',
      ].join(','),
    },
  })
  const raw = res.data?.response?.data ?? []
  return raw[0] ?? null
}

export async function fetchPurchaseOrderLineById(id) {
  // Fetch by ID menggunakan _where agar response selalu array — lebih konsisten di Openbravo
  const res = await api.get('/org.openbravo.service.json.jsonrest/OrderLine', {
    params: {
      _where: `e.id = '${id}'`,
      _startRow: 0,
      _endRow: 1,
      _selectedProperties: [
        'id', 'lineNo', 'orderedQuantity', 'deliveredQuantity',
        'unitPrice', 'listPrice', 'lineNetAmount',
        'product', 'product$_identifier',
        'uOM', 'uOM$_identifier',
        'salesOrder', 'salesOrder$_identifier',
        'description',
      ].join(','),
    },
  })
  const raw = res.data?.response?.data ?? []
  return raw[0] ?? null
}

export async function fetchVendorInvoiceLineByReceiptLine(receiptLineId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/InvoiceLine', {
    params: {
      _where: `e.goodsShipmentLine.id = '${receiptLineId}'`,
      _startRow: 0,
      _endRow: 1,
      _selectedProperties: [
        'id', 'lineNo', 'invoicedQuantity',
        'unitPrice', 'listPrice', 'priceActual', 'lineNetAmount',
        'product', 'product$_identifier',
        'uOM', 'uOM$_identifier',
        'invoice', 'invoice$_identifier',
        'description',
      ].join(','),
    },
  })
  const raw = res.data?.response?.data ?? []
  return raw[0] ?? null
}

// Warehouses
export async function fetchWarehouses() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Warehouse', {
    params: { _where: `e.active = true`, _startRow: 0, _endRow: 100, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// Storage Bins (Locator) filtered by warehouse
export async function fetchStorageBins(warehouseId = '') {
  let where = `e.active = true`
  if (warehouseId) where += ` and e.warehouse.id = '${warehouseId}'`
  const res = await api.get('/org.openbravo.service.json.jsonrest/Locator', {
    params: { _where: where, _startRow: 0, _endRow: 200, _orderBy: 'e.searchKey asc' },
  })
  return res.data?.response?.data ?? []
}

// Purchase Orders (CO/Booked) by vendor — untuk "Create Lines From PO"
export async function fetchPurchaseOrdersByVendor(vendorId) {
  const PURCHASE_ORDER_DOCTYPE_ID = '53F55A814CA045AE9561B7E247FF9569'
  let where = `e.salesTransaction = false and e.transactionDocument.id = '${PURCHASE_ORDER_DOCTYPE_ID}' and e.documentStatus = 'CO'`
  if (vendorId) where += ` and e.businessPartner.id = '${vendorId}'`
  const res = await api.get('/org.openbravo.service.json.jsonrest/Order', {
    params: {
      _where:    where,
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.documentNo desc',
      _selectedProperties: 'id,documentNo,orderDate,grandTotalAmount,documentStatus',
    },
  })
  return res.data?.response?.data ?? []
}

// Lines of a PO
export async function fetchPurchaseOrderLines(orderId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/OrderLine', {
    params: {
      _where:    `e.salesOrder.id = '${orderId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

// Vendor Invoices (CO) by vendor — untuk "Create Lines From Invoice"
export async function fetchVendorInvoicesByVendor(vendorId) {
  const AP_INVOICE_DOCTYPE_ID = '7C138667263E4818AC96EBDF41557D33'
  let where = `e.salesTransaction = false and e.documentType.id = '${AP_INVOICE_DOCTYPE_ID}' and e.documentStatus = 'CO'`
  if (vendorId) where += ` and e.businessPartner.id = '${vendorId}'`
  const res = await api.get('/org.openbravo.service.json.jsonrest/Invoice', {
    params: {
      _where:    where,
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.documentNo desc',
      _selectedProperties: 'id,documentNo,invoiceDate,grandTotalAmount,documentStatus',
    },
  })
  return res.data?.response?.data ?? []
}

// Lines of a Vendor Invoice
export async function fetchVendorInvoiceLines(invoiceId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/InvoiceLine', {
    params: {
      _where:    `e.invoice.id = '${invoiceId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

// Products
export async function fetchProducts(search = '') {
  let where = `e.purchase = true and e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Product', {
    params: { _where: where, _startRow: 0, _endRow: 50, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// UOMs
export async function fetchUOMs() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/UOM', {
    params: { _startRow: 0, _endRow: 200, _orderBy: 'e.name asc' },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════
export function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Completed', VO: 'Voided', RE: 'Reversed', CL: 'Closed' }
  return map[s] || s || '—'
}

export function statusClass(s) {
  const map = { DR: 'status-pill--draft', CO: 'status-pill--completed', VO: 'status-pill--voided', CL: 'status-pill--closed' }
  return map[s] || ''
}

export function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ════════════════════════════════════════════════════
// ACCOUNTING FACTS (tab Accounting di view modal)
// M_InOut table ID di AD_Table = '319' (standard Openbravo)
// ════════════════════════════════════════════════════
const M_INOUT_TABLE_ID = '319' // AD_Table.AD_Table_ID for M_InOut

// ════════════════════════════════════════════════════
// ENABLE POSTING — fix dokumen yang posted='D' (Disabled)
// Jalankan ini untuk GR yang sudah CO tapi masih "Document disabled for accounting"
// ════════════════════════════════════════════════════
export async function enablePosting(receiptId, documentNo) {
  const res = await api.put(`${GR_BASE}/${receiptId}`, {
    data: {
      id:          receiptId,
      _entityName: 'MaterialMgmtShipmentInOut',
      documentNo,
      posted:      'N',  // ubah dari 'D' (Disabled) → 'N' (Not Yet Posted)
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Gagal enable posting.')
  }
  return await fetchReceipt(receiptId)
}

export async function fetchGRAccountingFacts(receiptId) {
  // Coba dengan table ID '319' (M_InOut standard Openbravo)
  // Jika kosong, fallback ke query tanpa filter table
  const res = await api.get(FACT_BASE, {
    params: {
      _where: `e.recordID = '${receiptId}' and e.table.id = '${M_INOUT_TABLE_ID}'`,
      _startRow: 0,
      _endRow: 200,
      _orderBy: 'e.sequenceNumber asc',
    },
  })
  const data = res.data?.response?.data ?? []
  if (data.length > 0) return data

  // Fallback: tanpa filter table (jika table ID berbeda)
  const res2 = await api.get(FACT_BASE, {
    params: {
      _where: `e.recordID = '${receiptId}'`,
      _startRow: 0,
      _endRow: 200,
      _orderBy: 'e.sequenceNumber asc',
    },
  })
  return res2.data?.response?.data ?? []
}