import axios from 'axios'

// ==============================
// Runtime Config
// ==============================
const BASE_URL = window.APP_CONFIG?.API_BASE_URL || '/openbravo/'

// ==============================
// Basic Auth
// ==============================
const USERNAME = 'APIService'
const PASSWORD = 'wrt'
const token = btoa(`${USERNAME}:${PASSWORD}`)

// ==============================
// Axios Instance
// ==============================
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  },
})

// ==============================
// Axios response interceptor
// ==============================
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      console.error('[Openbravo API error body]', JSON.stringify(res.data?.response))
    }
    return res
  },
  (err) => {
    console.error('[Openbravo HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

// ==============================
// Constants — JSON REST endpoints
// ==============================
const PT_BASE  = '/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTerm'
const PTL_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTermLine'
const PTT_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtPaymentTermTrl'

// ==============================
// Constants — Org
// ==============================
const ORG_ID = 'B3FE20F490CF49989D7250C0D3341603'

// ==============================
// Helper: detect errors
// ==============================
function checkActionAllowed(res, label = '') {
  const response = res.data?.response
  const err = response?.error
  const status = response?.status
  if (err?.message === 'OBUIAPP_ActionNotAllowed') {
    throw new Error('User APIService tidak memiliki akses write.')
  }
  if (status !== undefined && status < 0) {
    console.error(`[Openbravo ${label}] error status=${status}`, JSON.stringify(response))
    const detail = err?.message ?? err?.type ?? JSON.stringify(err) ?? 'Unknown error'
    throw new Error(`Server error: ${detail}`)
  }
}

// ══════════════════════════════════════════════════════════════
// PAYMENT TERMS
// ══════════════════════════════════════════════════════════════

// ==============================
// GET - list payment terms
// ==============================
export async function fetchPaymentTerms({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  const params = {
    _startRow: startRow,
    _endRow: startRow + pageSize,
    _noCount: false,
    _sortBy: 'name',
  }
  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    params._where = `upper(e.name) like upper('%${escaped}%') or upper(e.searchKey) like upper('%${escaped}%')`
  }
  const res = await api.get(PT_BASE, { params })
  return res.data?.response ?? res.data
}

// ==============================
// POST - create payment term
// ==============================
export async function createPaymentTerm(data) {
  const payload = {
    data: {
      _entityName: 'FinancialMgmtPaymentTerm',
      organization: ORG_ID,
      active: data.active ?? true,
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      offsetMonthDue: data.offsetMonthDue ?? 0,
      overduePaymentDaysRule: data.overduePaymentDaysRule ?? 0,
      fixedDueDate: data.fixedDueDate ?? false,
      nextBusinessDay: data.nextBusinessDay ?? false,
      default: data.default ?? false,
    },
  }
  const res = await api.post(PT_BASE, payload)
  checkActionAllowed(res, 'createPaymentTerm')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create payment term: no ID returned from server.')
  return result
}

// ==============================
// PUT - update payment term
// ==============================
export async function updatePaymentTerm(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'FinancialMgmtPaymentTerm',
      active: data.active ?? true,
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      offsetMonthDue: data.offsetMonthDue ?? 0,
      overduePaymentDaysRule: data.overduePaymentDaysRule ?? 0,
      fixedDueDate: data.fixedDueDate ?? false,
      nextBusinessDay: data.nextBusinessDay ?? false,
      default: data.default ?? false,
    },
  }
  const res = await api.put(`${PT_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updatePaymentTerm')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// DELETE - payment term (hard delete)
// ==============================
export async function deletePaymentTerm(id) {
  const res = await api.delete(`${PT_BASE}/${id}`)
  checkActionAllowed(res, 'deletePaymentTerm')
  return res.data?.response ?? res.data
}

// ══════════════════════════════════════════════════════════════
// PAYMENT TERM LINES
// ══════════════════════════════════════════════════════════════

// ==============================
// GET - lines by payment term id
// ==============================
export async function fetchPaymentTermLines(paymentTermId) {
  const res = await api.get(PTL_BASE, {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `e.paymentTerms.id = '${paymentTermId}'`,
      _sortBy: 'lineNo',
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// POST - create line
// ==============================
export async function createPaymentTermLine(data) {
  const payload = {
    data: {
      _entityName: 'FinancialMgmtPaymentTermLine',
      organization: ORG_ID,
      active: true,
      paymentTerms: { id: data.paymentTerms },
      lineNo: data.lineNo,
      percentageDue: data.percentageDue ?? 100,
      rest: data.rest ?? false,
      excludeTax: data.excludeTax ?? false,
      fixedDueDate: data.fixedDueDate ?? false,
      overduePaymentDaysRule: data.overduePaymentDaysRule ?? 0,
      offsetMonthDue: data.offsetMonthDue ?? null,
      nextBusinessDay: data.nextBusinessDay ?? false,
    },
  }
  const res = await api.post(PTL_BASE, payload)
  checkActionAllowed(res, 'createPaymentTermLine')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create payment term line: no ID returned from server.')
  return result
}

// ==============================
// PUT - update line
// ==============================
export async function updatePaymentTermLine(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'FinancialMgmtPaymentTermLine',
      paymentTerms: { id: data.paymentTerms },
      lineNo: data.lineNo,
      percentageDue: data.percentageDue ?? 100,
      rest: data.rest ?? false,
      excludeTax: data.excludeTax ?? false,
      fixedDueDate: data.fixedDueDate ?? false,
      overduePaymentDaysRule: data.overduePaymentDaysRule ?? 0,
      offsetMonthDue: data.offsetMonthDue ?? null,
      nextBusinessDay: data.nextBusinessDay ?? false,
    },
  }
  const res = await api.put(`${PTL_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updatePaymentTermLine')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// DELETE - line (hard delete)
// ==============================
export async function deletePaymentTermLine(id) {
  const res = await api.delete(`${PTL_BASE}/${id}`)
  checkActionAllowed(res, 'deletePaymentTermLine')
  return res.data?.response ?? res.data
}

// ══════════════════════════════════════════════════════════════
// PAYMENT TERM TRANSLATIONS
// ══════════════════════════════════════════════════════════════

// ==============================
// GET - translations by payment term id
// ==============================
export async function fetchPaymentTermTranslations(paymentTermId) {
  const res = await api.get(PTT_BASE, {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `e.paymentTerms.id = '${paymentTermId}'`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// POST - create translation
// ==============================
export async function createPaymentTermTranslation(data) {
  const payload = {
    data: {
      _entityName: 'FinancialMgmtPaymentTermTrl',
      organization: ORG_ID,
      active: true,
      paymentTerms: { id: data.paymentTerms },
      language: data.language,
      name: data.name,
      description: data.description || null,
      comments: data.comments || null,
      translation: data.translation ?? false,
    },
  }
  const res = await api.post(PTT_BASE, payload)
  checkActionAllowed(res, 'createPaymentTermTranslation')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create translation: no ID returned from server.')
  return result
}

// ==============================
// PUT - update translation
// ==============================
export async function updatePaymentTermTranslation(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'FinancialMgmtPaymentTermTrl',
      paymentTerms: { id: data.paymentTerms },
      language: data.language,
      name: data.name,
      description: data.description || null,
      comments: data.comments || null,
      translation: data.translation ?? false,
    },
  }
  const res = await api.put(`${PTT_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updatePaymentTermTranslation')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// DELETE - translation (hard delete)
// ==============================
export async function deletePaymentTermTranslation(id) {
  const res = await api.delete(`${PTT_BASE}/${id}`)
  checkActionAllowed(res, 'deletePaymentTermTranslation')
  return res.data?.response ?? res.data
}