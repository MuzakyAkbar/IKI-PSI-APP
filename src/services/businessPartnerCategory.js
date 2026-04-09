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
// withCredentials: true is CRITICAL — tells the browser to send the
// session cookie (JSESSIONID + CSRF_TOKEN) that Openbravo sets.
// Without it, every request is treated as a brand-new anonymous session
// and no CSRF token is ever established.
// ==============================
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,           // ← send/receive cookies on every request
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  },
})

// ==============================
// Constants
// ==============================
const BPC_BASE        = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategory'
const BPC_ACCT_BASE   = '/org.openbravo.service.json.jsonrest/BusinessPartnerCategoryAccount'
const ACCT_COMBO_BASE = '/org.openbravo.service.datasource/FinancialMgmtAccountingCombination'
const BPC_DS_BASE     = '/org.openbravo.service.datasource/BusinessPartnerCategoryAccount'

// ==============================
// CSRF Token
//
// Openbravo stores a CSRF token in the server-side HTTP session and also
// sets it as the "CSRF_TOKEN" cookie (readable by JS).
//
// Flow:
//   1. Any GET to Openbravo (with withCredentials:true) establishes a session
//      and sets the CSRF_TOKEN cookie.
//   2. We read that cookie and send it as the "csrfToken" form field on
//      every datasource POST.
//
// The token is cached in memory; it is refreshed automatically when the
// server returns InvalidCSRFToken (e.g. after session expiry).
// ==============================
let _csrfToken = null

function readCSRFCookie() {
  const match = document.cookie.match(/(?:^|;\s*)CSRF_TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

async function fetchCSRFToken() {
  // A lightweight GET to Openbravo — just enough to establish a session and
  // receive the CSRF_TOKEN cookie. Any authenticated endpoint works.
  try {
    await api.get(BPC_BASE, { params: { _startRow: 0, _endRow: 1, _noCount: true } })
  } catch (_) {
    // Even a failed request may have set the cookie; continue.
  }
  _csrfToken = readCSRFCookie()
  if (!_csrfToken) {
    console.warn(
      '[CSRF] CSRF_TOKEN cookie not found after session warm-up. ' +
      'Datasource POSTs may fail. Make sure the Openbravo server is ' +
      'reachable and the app is served from the same origin (or a proxied path).',
    )
  }
  return _csrfToken
}

async function getCSRFToken() {
  // Return cached value, or try reading the cookie directly first (it may
  // already be set from a previous page load), then warm up a session.
  if (_csrfToken) return _csrfToken
  _csrfToken = readCSRFCookie()
  if (_csrfToken) return _csrfToken
  return fetchCSRFToken()
}

// ==============================
// Helper: detect errors
// ==============================
function checkActionAllowed(res, label = '') {
  const response = res.data?.response
  const err      = response?.error
  const status   = response?.status

  if (err?.message === 'OBUIAPP_ActionNotAllowed') {
    throw new Error('User APIService tidak memiliki akses write.')
  }
  if (err?.message === 'InvalidCSRFToken') {
    _csrfToken = null   // force refresh on next call
    throw new Error('InvalidCSRFToken')
  }
  if (status !== undefined && status < 0) {
    console.error(`[Openbravo ${label}] error status=${status}`, JSON.stringify(response))
    const detail = err?.message ?? err?.type ?? JSON.stringify(err) ?? 'Unknown error'
    throw new Error(`Server error: ${detail}`)
  }
}

// ==============================
// Helper: POST to datasource with automatic CSRF retry (once)
// ==============================
async function datasourcePost(url, buildParams, label) {
  const doRequest = async () => {
    const params = new URLSearchParams()
    buildParams(params)
    const tok = await getCSRFToken()
    if (tok) params.append('csrfToken', tok)
    return api.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  }

  const res1 = await doRequest()
  if (res1.data?.response?.error?.message === 'InvalidCSRFToken') {
    // Session expired — refresh token and retry once
    _csrfToken = null
    await fetchCSRFToken()
    const res2 = await doRequest()
    checkActionAllowed(res2, label)
    return res2
  }
  checkActionAllowed(res1, label)
  return res1
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
// GET - BPCategoryAccount by category id
// ==============================
export async function fetchBPCategoryAccount(categoryId) {
  const res = await api.get(BPC_ACCT_BASE, {
    params: {
      _startRow: 0,
      _endRow: 10,
      _where: `e.businessPartnerCategory.id = '${categoryId}'`,
    },
  })
  const data = res.data?.response?.data ?? []
  return data[0] ?? null
}

// ==============================
// POST - create BPCategoryAccount  (jsonrest — no CSRF needed)
// ==============================
export async function createBPCategoryAccount(data) {
  const payload = {
    data: {
      _entityName:             'BusinessPartnerCategoryAccount',
      organization:            { id: data.organization ?? '0' },
      active:                  data.active ?? true,
      businessPartnerCategory: { id: data.businessPartnerCategory },
      accountingSchema:        { id: data.accountingSchema },
      customerReceivablesNo:   data.customerReceivablesNo ? { id: data.customerReceivablesNo } : null,
      customerPrepayment:      data.customerPrepayment    ? { id: data.customerPrepayment }    : null,
      vendorLiability:         data.vendorLiability       ? { id: data.vendorLiability }       : null,
      vendorPrepayment:        data.vendorPrepayment      ? { id: data.vendorPrepayment }      : null,
      writeoff:                data.writeoff              ? { id: data.writeoff }              : null,
      notInvoicedReceipts:     data.nonInvoicedReceipts   ? { id: data.nonInvoicedReceipts }   : null,
    },
  }
  const res = await api.post(BPC_ACCT_BASE, payload)
  checkActionAllowed(res, 'createBPCategoryAccount')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create account: no ID returned from server.')
  return result
}

// ==============================
// PUT - update BPCategoryAccount  (jsonrest — no CSRF needed)
// ==============================
export async function updateBPCategoryAccount(id, data) {
  const payload = {
    data: {
      id,
      _entityName:             'BusinessPartnerCategoryAccount',
      organization:            { id: data.organization ?? '0' },
      active:                  data.active ?? true,
      businessPartnerCategory: { id: data.businessPartnerCategory },
      accountingSchema:        { id: data.accountingSchema },
      customerReceivablesNo:   data.customerReceivablesNo ? { id: data.customerReceivablesNo } : null,
      customerPrepayment:      data.customerPrepayment    ? { id: data.customerPrepayment }    : null,
      vendorLiability:         data.vendorLiability       ? { id: data.vendorLiability }       : null,
      vendorPrepayment:        data.vendorPrepayment      ? { id: data.vendorPrepayment }      : null,
      writeoff:                data.writeoff              ? { id: data.writeoff }              : null,
      notInvoicedReceipts:     data.nonInvoicedReceipts   ? { id: data.nonInvoicedReceipts }   : null,
    },
  }
  const res = await api.put(`${BPC_ACCT_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateBPCategoryAccount')
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

// ==============================
// FALLBACK datasource variants — use these if jsonrest above returns
// OBUIAPP_ActionNotAllowed for the APIService user.
// They rely on the session-cookie CSRF mechanism above.
// ==============================
function _buildDSParams(params, id, data) {
  params.append('inpcBpGroupAcctId',  id ?? '')
  params.append('C_Bp_Group_Acct_ID', id ?? '')
  params.append('inpcBpGroupId',      data.businessPartnerCategory ?? '')
  params.append('C_BP_Group_ID',      data.businessPartnerCategory ?? '')
  params.append('inpTabId',           '323')
  params.append('inpwindowId',        '192')
  params.append('inpTableId',         '395')
  params.append('inpkeyColumnId',     'C_Bp_Group_Acct_ID')
  params.append('keyProperty',        'id')
  params.append('inpKeyName',         'inpcBpGroupAcctId')
  params.append('keyColumnName',      'C_Bp_Group_Acct_ID')
  params.append('keyPropertyType',    '_id_13')
  params.append('windowId',           '192')
  params.append('tabId',              '323')
  params.append('moduleId',           '0')
  params.append('_org',               data.organization ?? '0')
  params.append('inpcAcctschemaId',   data.accountingSchema ?? '')
  params.append('inpcReceivableAcct',            data.customerReceivablesNo ?? '')
  params.append('inpcPrepaymentAcct',            data.customerPrepayment    ?? '')
  params.append('inpvLiabilityAcct',             data.vendorLiability       ?? '')
  params.append('inpvPrepaymentAcct',            data.vendorPrepayment      ?? '')
  params.append('inpwriteoffAcct',               data.writeoff              ?? '')
  params.append('inpnotinvoicedreceiptsAcct',    data.nonInvoicedReceipts   ?? '')
  params.append('inpnotinvoicedreceivablesAcct', '')
  params.append('inpnotinvoicedrevenueAcct',     '')
  params.append('inppaydiscountExpAcct',         '')
  params.append('inppaydiscountRevAcct',         '')
  params.append('inprealizedgainAcct',           '')
  params.append('inprealizedlossAcct',           '')
  params.append('inpunearnedrevenueAcct',        '')
  params.append('inpunrealizedgainAcct',         '')
  params.append('inpunrealizedlossAcct',         '')
  params.append('inpvLiabilityServicesAcct',     '')
  params.append('inpwriteoffRevAcct',            '')
  params.append('inpdoubtfuldebtAcct',           '')
  params.append('inpbaddebtexpenseAcct',         '')
  params.append('inpbaddebtrevenueAcct',         '')
  params.append('inpallowancefordoubtfulAcct',   '')
  params.append('inpvalue',       data.searchKey    ?? '')
  params.append('inpname',        data.name         ?? '')
  params.append('inpdescription', data.description  ?? '')
  params.append('inpisactive',    data.active !== false ? 'true' : 'false')
  params.append('inpisdefault',   data.default ? 'true' : 'false')
  params.append('inpadClientId',  data.clientId     ?? '')
  params.append('inpadOrgId',     data.organization ?? '0')
  params.append('inpprocessing',  '')
  params.append('inpstatus',      '')
}

export async function createBPCategoryAccountDS(data) {
  const res = await datasourcePost(BPC_DS_BASE, (p) => _buildDSParams(p, '', data), 'createBPCategoryAccountDS')
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create account: no ID returned from server.')
  return result
}

export async function updateBPCategoryAccountDS(id, data) {
  const res = await datasourcePost(BPC_DS_BASE, (p) => _buildDSParams(p, id, data), 'updateBPCategoryAccountDS')
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw ?? res.data
}

// ==============================
// GET - GL Accounts / COA (search)
// ==============================
export async function fetchGLAccounts(search = '') {
  const params = {
    _startRow: 1,
    _endRow: 76,
    _noCount: true,
    _OrExpression: true,
    _constructor: 'AdvancedCriteria',
    _operationType: 'fetch',
    _textMatchStyle: 'substring',
    _sortBy: '_identifier',
    _selectedProperties: 'id',
    _extraProperties: 'id,',
    Constants_IDENTIFIER: '_identifier',
    Constants_FIELDSEPARATOR: '$',
    IsSelectorItem: true,
    operator: 'or',
  }
  if (search.trim()) {
    params['criteria'] = JSON.stringify({ fieldName: '_identifier', operator: 'iContains', value: search.trim() })
  }
  const res = await api.get(ACCT_COMBO_BASE, { params })
  return res.data?.response?.data ?? []
}

// ==============================
// GET - Accounting Schemas
// ==============================
const ACCT_SCHEMA_ENTITIES = [
  'FinancialMgmtAcctSchema',
  'FinancialMgmtAccountingSchema',
  'AcctSchema',
]

export async function fetchAccountingSchemas() {
  for (const entity of ACCT_SCHEMA_ENTITIES) {
    try {
      const res = await api.get(`/org.openbravo.service.json.jsonrest/${entity}`, {
        params: { _startRow: 0, _endRow: 50, _where: 'e.active = true' },
      })
      const data = res.data?.response?.data
      if (Array.isArray(data) && data.length > 0) return data
    } catch (_) { /* try next */ }
  }

  // Fallback: derive schemas from existing BPCategoryAccount records
  try {
    const res = await api.get(BPC_ACCT_BASE, { params: { _startRow: 0, _endRow: 10 } })
    const rows = res.data?.response?.data ?? []
    const seen = new Map()
    for (const r of rows) {
      const s = r.accountingSchema
      if (s) {
        const id         = typeof s === 'object' ? s.id : s
        const identifier = r['accountingSchema$_identifier']
        const name       = typeof s === 'object' ? (s.name ?? s.id) : (identifier || s)
        if (id && !seen.has(id)) seen.set(id, { id, name })
      }
    }
    if (seen.size) return [...seen.values()]
  } catch (_) { /* ignore */ }
  return []
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
  },
)