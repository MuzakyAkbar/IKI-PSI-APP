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
// Constants
// ==============================
const BPC_BASE = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategory'

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

// ==============================
// GET - list business partner categories
// ==============================
export async function fetchBPCategories({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = ''
  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.name) like upper('%${escaped}%') or upper(e.searchKey) like upper('%${escaped}%')`
  }
  const params = {
    _startRow: startRow,
    _endRow: startRow + pageSize,
    _noCount: false,
    _sortBy: 'searchKey',
  }
  if (where) params._where = where
  const res = await api.get(BPC_BASE, { params })
  return res.data?.response ?? res.data
}

// ==============================
// POST - create business partner category
// ==============================
export async function createBPCategory(data) {
  const payload = {
    data: {
      _entityName: 'BusinessPartnerCategory',
      organization: '0',
      active: data.active ?? true,
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      default: data.default ?? false,
    },
  }
  const res = await api.post(BPC_BASE, payload)
  checkActionAllowed(res, 'createBPCategory')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create category: no ID returned from server.')
  return result
}

// ==============================
// PUT - update business partner category
// ==============================
export async function updateBPCategory(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartnerCategory',
      organization: '0',
      active: data.active ?? true,
      searchKey: data.searchKey,
      name: data.name,
      description: data.description || null,
      default: data.default ?? false,
    },
  }
  const res = await api.put(`${BPC_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateBPCategory')
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

// ==============================
// DELETE - business partner category
// ==============================
export async function deleteBPCategory(id) {
  const res = await api.delete(`${BPC_BASE}/${id}`)
  checkActionAllowed(res, 'deleteBPCategory')
  return res.data?.response?.data ?? res.data
}

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