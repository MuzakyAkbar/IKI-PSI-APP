import axios from 'axios'
import { ref, computed, onMounted } from 'vue'

// ── API Setup ─────────────────────────────────────────────
const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'
const USERNAME = 'APIService'
const PASSWORD = 'wrt'
const token = btoa(`${USERNAME}:${PASSWORD}`)

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
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
    console.error('[PR HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

// ── Constants ─────────────────────────────────────────────
export const DEFAULT_ORGANIZATION = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_PRICE_LIST   = '90D80A99C19046C3ADC0ED0759E3F648'
export const DEFAULT_CURRENCY     = '303'
export const DEFAULT_USER_CONTACT = 'A2662207ED7F49EB87929B6337108594'

export const PR_BASE      = '/org.openbravo.service.json.jsonrest/ProcurementRequisition'
export const PR_LINE_BASE = '/org.openbravo.service.json.jsonrest/ProcurementRequisitionLine'
export const PR_POMATCH   = '/org.openbravo.service.json.jsonrest/ProcurementRequisitionPOMatch'

// ── Helpers ───────────────────────────────────────────────
export function statusLabel(s) {
  const map = { DR: 'Draft', CO: 'Completed', CL: 'Closed', VO: 'Voided', IN: 'In Progress' }
  return map[s] || s || '—'
}
export function statusClass(s) {
  const map = { DR: 'status-pill--draft', CO: 'status-pill--completed', CL: 'status-pill--closed', VO: 'status-pill--voided' }
  return map[s] || ''
}
export function approvalLabel(s) {
  const map = { '0': 'Submit Approval', '1': 'Pending', '2': 'Approved', '3': 'Rejected' }
  return map[s] || s || '—'
}
export function approvalClass(s) {
  const map = { '0': 'approval-pill--submit', '1': 'approval-pill--pending', '2': 'approval-pill--approved', '3': 'approval-pill--rejected' }
  return map[s] || ''
}
export function lineStatusLabel(s) {
  const map = { O: 'Open', C: 'Closed', CA: 'Cancelled', P: 'Processed' }
  return map[s] || s || '—'
}
export function lineStatusClass(s) {
  const map = { O: 'status-pill--draft', C: 'status-pill--closed', CA: 'status-pill--voided', P: 'status-pill--completed' }
  return map[s] || ''
}
export function bpName(identifier) {
  if (!identifier) return '—'
  return identifier.includes(' - ') ? identifier.split(' - ').slice(1).join(' - ') : identifier
}
export function formatCurrency(v) {
  if (v == null || v === '') return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
}
export function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Fetch List ────────────────────────────────────────────
export async function fetchPRList({ searchQuery, sortCol, sortDir, currentPage, pageSize }) {
  let where = `e.active = true`
  if (searchQuery.trim()) {
    const s = searchQuery.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  const sortBy   = (sortDir === 'desc' ? '-' : '') + sortCol
  const startRow = (currentPage - 1) * pageSize
  const res = await api.get(PR_BASE, {
    params: { _startRow: startRow, _endRow: startRow + pageSize, _noCount: false, _sortBy: sortBy, _where: where },
  })
  const data = res.data?.response ?? res.data
  return { rows: data?.data ?? [], totalRows: data?.totalRows ?? 0 }
}

// ── Fetch Lines ───────────────────────────────────────────
export async function fetchPRLines(prId) {
  const res = await api.get(PR_LINE_BASE, {
    params: { _where: `e.requisition.id='${prId}'`, _startRow: 0, _endRow: 200, _orderBy: 'e.lineNo asc' },
  })
  return res.data?.response?.data ?? []
}

// ── Fetch Matched PO ──────────────────────────────────────
export async function fetchMatchedPO(prId) {
  const res = await api.get(PR_POMATCH, {
    params: { _where: `e.requisitionLine.requisition.id='${prId}'`, _startRow: 0, _endRow: 200 },
  })
  return res.data?.response?.data ?? []
}

// ── Sequence ADSequence ───────────────────────────────────
const SEQ_BASE = '/org.openbravo.service.json.jsonrest/ADSequence'

export async function fetchNextDocumentNo() {
  // Nama sequence standar Openbravo untuk Procurement Requisition
  const res = await api.get(SEQ_BASE, {
    params: {
      _where: "e.name = 'DocumentNo_M_Requisition' and e.active = true",
      _startRow: 0,
      _endRow: 1,
    },
  })
  const seq = res.data?.response?.data?.[0] ?? null
  
  // Jika nama sequence di databasemu berbeda, sesuaikan parameter e.name di atas
  if (!seq) throw new Error('Sequence DocumentNo_M_Requisition tidak ditemukan.')
  return buildDocumentNo(seq)
}

async function buildDocumentNo(seq) {
  const nextNo = seq.nextAssignedNumber ?? seq.currentNextSystem ?? seq.startingNo ?? 10000000

  // Increment sequence di server
  await api.put(`${SEQ_BASE}/${seq.id}`, {
    data: {
      id:                 seq.id,
      _entityName:        'ADSequence',
      nextAssignedNumber: nextNo + 1,
      currentNextSystem:  nextNo + 1,
    },
  })

  const prefix = seq.prefix ?? ''
  const suffix = seq.suffix ?? ''
  return `${prefix}${nextNo}${suffix}`
}

// ── Business Partner Search (vendor only) ─────────────────
export async function searchVendors(query) {
  const s = query.trim().replace(/'/g, "''")
  if (!s) return []
  // Filter vendor: isVendor = true
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', {
    params: {
      _startRow: 0,
      _endRow: 20,
      _where: `e.active=true and e.vendor=true and upper(e.name) like upper('%${s}%')`,
      _selectedProperties: 'id,name,_identifier',
    },
  })
  return res.data?.response?.data ?? []
}

// ── Department Search ─────────────────────────────────────
export async function searchDepts(query = '') {
  const s = query.trim().replace(/'/g, "''")
  const where = s
    ? `e.active=true and (upper(e.value) like upper('%${s}%') or upper(e.name) like upper('%${s}%'))`
    : `e.active=true`
  const res = await api.get('/org.openbravo.service.json.jsonrest/Gmm_Departement', {
    params: { _startRow: 0, _endRow: 100, _where: where, _selectedProperties: 'id,value,name' },
  })
  return res.data?.response?.data ?? []
}

// ── Product Search ────────────────────────────────────────
export async function searchProducts(query) {
  const s = query.trim().replace(/'/g, "''")
  if (!s) return []
  const res = await api.get('/org.openbravo.service.json.jsonrest/Product', {
    params: {
      _startRow: 0, _endRow: 20,
      _where: `e.active=true and upper(e.name) like upper('%${s}%')`,
      _selectedProperties: 'id,name,_identifier,uOM,uOM$_identifier',
    },
  })
  return res.data?.response?.data ?? []
}

// ── Budget Search ─────────────────────────────────────────
export async function searchBudgets(query) {
  const s = query.trim().replace(/'/g, "''")
  if (!s) return []
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtBudgetLine', {
    params: {
      _startRow: 0, _endRow: 20,
      _where: `e.active=true and upper(e.budget.name) like upper('%${s}%')`,
      _selectedProperties: 'id,_identifier',
    },
  })
  return res.data?.response?.data ?? []
}

// ── Save PR (Create / Edit) ───────────────────────────────
// ── Save PR (Create / Edit) ───────────────────────────────
export async function savePR({ form, lines, isEdit }) {
  let prId = form.id
  let docNo = form.documentNo

  // Generate Document No jika sedang create baru dan docNo masih kosong
  if (!isEdit && !docNo) {
    docNo = await fetchNextDocumentNo()
  }

  const headerData = {
    _entityName: 'ProcurementRequisition',
    ...(docNo && { documentNo: docNo }), // Sisipkan documentNo ke payload
    organization: DEFAULT_ORGANIZATION,
    description: form.description || null,
    businessPartner: form.businessPartner || null,
    priceList: DEFAULT_PRICE_LIST,
    currency: DEFAULT_CURRENCY,
    userContact: DEFAULT_USER_CONTACT,
    gmmDepartement: form.gmmDepartement,
    documentStatus: 'DR',
    documentAction: 'CO',
    processed: false,
    rapvStatus: '0',
    rapvBtnstatus: '0',
    active: true,
  }

  if (isEdit) {
    await api.put(`${PR_BASE}/${prId}`, { data: { id: prId, ...headerData } })
  } else {
    const res = await api.post(PR_BASE, { data: headerData })
    const raw = res.data?.response?.data
    prId = (Array.isArray(raw) ? raw[0] : raw)?.id
  }

  if (!prId) throw new Error('Failed to get PR id')

  let lineNo = 10
  for (const ln of lines) {
    const lineData = {
      _entityName: 'ProcurementRequisitionLine',
      requisition: prId,
      organization: DEFAULT_ORGANIZATION,
      lineNo: ln.lineNo || lineNo,
      needByDate: ln.needByDate || null,
      product: ln.product || null,
      quantity: ln.quantity || 1,
      uOM: ln.uom || '100',
      businessPartner: ln.businessPartner || null,
      bgtCBudgetline: ln.budget || null,
      unitPrice: ln.unitPrice || 0,
      listPrice: ln.listPrice || 0,
      lineNetAmount: ln.lineNetAmount || 0,
      currency: DEFAULT_CURRENCY,
      priceList: DEFAULT_PRICE_LIST,
      active: true,
    }
    if (ln.id) {
      await api.put(`${PR_LINE_BASE}/${ln.id}`, { data: { id: ln.id, ...lineData } })
    } else {
      await api.post(PR_LINE_BASE, { data: lineData })
    }
    lineNo += 10
  }

  return prId
}

// ── Complete PR ───────────────────────────────────────────
export async function completePR(id) {
  await api.put(`${PR_BASE}/${id}`, {
    data: { id, _entityName: 'ProcurementRequisition', documentStatus: 'CO', documentAction: 'CO' },
  })
}

// ── Close PR ──────────────────────────────────────────────
export async function closePR(id) {
  await api.put(`${PR_BASE}/${id}`, {
    data: { id, _entityName: 'ProcurementRequisition', documentStatus: 'CL', documentAction: 'CL' },
  })
}

// ── Delete PR (soft) ──────────────────────────────────────
export async function deletePR(id) {
  await api.put(`${PR_BASE}/${id}`, {
    data: { id, _entityName: 'ProcurementRequisition', active: false },
  })
}

// ── Update Line Status ────────────────────────────────────
export async function updateLineStatus(lineId, status) {
  // status: 'O' = Open, 'C' = Closed, 'CA' = Cancelled
  await api.put(`${PR_LINE_BASE}/${lineId}`, {
    data: { id: lineId, _entityName: 'ProcurementRequisitionLine', requisitionLineStatus: status },
  })
}

// ── Check if all lines are matched (qty matched >= qty ordered) ──
export function isFullyMatched(lines, matchedPO) {
  if (!lines.length) return false
  // Sum matched qty per requisition line
  const matchedQtyMap = {}
  for (const m of matchedPO) {
    const lineId = m['requisitionLine'] || m['requisitionLine$_identifier']
    matchedQtyMap[lineId] = (matchedQtyMap[lineId] || 0) + (m.quantity || 0)
  }
  return lines.every(ln => {
    const matched = matchedQtyMap[ln.id] || 0
    return matched >= (ln.quantity || 0)
  })
}