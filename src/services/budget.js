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

export const DEFAULT_ORGANIZATION = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CURRENCY = '303' // IDR
export const DEFAULT_ACCOUNTING_SCHEMA = 'AF6E2A7FA1A448008AAC5D9B30202589'

// ════════════════════════════════════════════════════
// BUDGET HEADER
// ════════════════════════════════════════════════════
const BUDGET_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtBudget'

export async function fetchAllBudgets({ startRow = 0, pageSize = 20, searchKey = '', sortCol = 'name', sortDir = 'asc' } = {}) {
  let where = `e.active = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${s}%')`
  }

  const sortBy = (sortDir === 'desc' ? '-' : '') + sortCol
  const orderBy = `e.${sortCol} ${sortDir}`

  const res = await api.get(BUDGET_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _noCount: false,
      _sortBy: sortBy,
      _orderBy: orderBy,
      _where: where,
      _selectedProperties: 'id,name,description,year,year$_identifier,exportActualData,active,cbudTipebudget,cbudTipebudget$_identifier',
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchBudget(id) {
  const res = await api.get(`${BUDGET_BASE}/${id}`)
  const wrapped = res.data?.response?.data
  if (wrapped) return Array.isArray(wrapped) ? wrapped[0] : wrapped
  if (res.data?.id) return res.data
  return null
}

export async function createBudget(data) {
  const res = await api.post(BUDGET_BASE, {
    data: {
      _entityName: 'FinancialMgmtBudget',
      organization: data.organization || DEFAULT_ORGANIZATION,
      name: data.name,
      description: data.description || null,
      year: data.year || null,
      exportActualData: data.exportActualData || false,
      active: true,
      cbudTipebudget: data.cbudTipebudget || null,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateBudget(id, data) {
  const res = await api.put(`${BUDGET_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtBudget',
      organization: data.organization || DEFAULT_ORGANIZATION,
      name: data.name,
      description: data.description || null,
      year: data.year || null,
      exportActualData: data.exportActualData || false,
      cbudTipebudget: data.cbudTipebudget || null,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteBudget(id) {
  const res = await api.put(`${BUDGET_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtBudget', active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// BUDGET LINE
// ════════════════════════════════════════════════════
const BUDGET_LINE_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtBudgetLine'

export async function fetchBudgetLines(budgetId) {
  const res = await api.get(BUDGET_LINE_BASE, {
    params: {
      _where: `e.budget.id = '${budgetId}'`,
      _startRow: 0,
      _endRow: 500,
      _orderBy: 'e.sequenceNumber asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createBudgetLine(budgetId, data) {
  const res = await api.post(BUDGET_LINE_BASE, {
    data: {
      _entityName: 'FinancialMgmtBudgetLine',
      budget: budgetId,
      organization: DEFAULT_ORGANIZATION,
      accountingSchema: data.accountingSchema || DEFAULT_ACCOUNTING_SCHEMA,
      sequenceNumber: data.sequenceNumber || 10,
      accountElement: data.accountElement || null,
      currency: data.currency || DEFAULT_CURRENCY,
      amount: data.amount != null ? Number(data.amount) : null,
      quantity: data.quantity != null ? Number(data.quantity) : 0,
      price: data.price != null ? Number(data.price) : null,
      period: data.period || null,
      cbudMasterbudget: data.cbudMasterbudget || null,
      cbudTipebudget: data.cbudTipebudget || null,
      description: data.description || null,
      active: true,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateBudgetLine(id, data) {
  const res = await api.put(`${BUDGET_LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtBudgetLine',
      accountElement: data.accountElement || null,
      currency: data.currency || DEFAULT_CURRENCY,
      amount: data.amount != null ? Number(data.amount) : null,
      quantity: data.quantity != null ? Number(data.quantity) : 0,
      price: data.price != null ? Number(data.price) : null,
      period: data.period || null,
      cbudMasterbudget: data.cbudMasterbudget || null,
      cbudTipebudget: data.cbudTipebudget || null,
      description: data.description || null,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteBudgetLine(id) {
  const res = await api.delete(`${BUDGET_LINE_BASE}/${id}`)
  return res.data
}

// ════════════════════════════════════════════════════
// MASTER BUDGET (cbud_masterbudget)
// ════════════════════════════════════════════════════
const MASTER_BUDGET_BASE = '/org.openbravo.service.json.jsonrest/cbud_masterbudget'

export async function fetchAllMasterBudgets({ startRow = 0, pageSize = 20, searchKey = '', sortCol = 'value', sortDir = 'asc' } = {}) {
  let where = `e.active = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.value) like upper('%${s}%') or upper(e.name) like upper('%${s}%'))`
  }
  const sortBy = (sortDir === 'desc' ? '-' : '') + sortCol
  const orderBy = `e.${sortCol} ${sortDir}`

  const res = await api.get(MASTER_BUDGET_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _noCount: false,
      _sortBy: sortBy,
      _orderBy: orderBy,
      _where: where,
      _selectedProperties: 'id,value,name,active',
    },
  })
  return res.data?.response ?? res.data
}

export async function createMasterBudget(data) {
  const res = await api.post(MASTER_BUDGET_BASE, {
    data: {
      _entityName: 'cbud_masterbudget',
      organization: DEFAULT_ORGANIZATION,
      value: data.value,
      name: data.name,
      active: true,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateMasterBudget(id, data) {
  const res = await api.put(`${MASTER_BUDGET_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'cbud_masterbudget',
      value: data.value,
      name: data.name,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteMasterBudget(id) {
  const res = await api.put(`${MASTER_BUDGET_BASE}/${id}`, {
    data: { id, _entityName: 'cbud_masterbudget', active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// LOOKUP APIs
// ════════════════════════════════════════════════════

export async function fetchYears() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtYear', {
    // Menghapus _selectedProperties agar property _identifier ikut ke-load
    params: { _startRow: 0, _endRow: 100, _orderBy: 'e.year desc' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchTipeBudget() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/cbud_tipebudget', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true', _selectedProperties: 'id,name' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchMasterBudget(search = '') {
  let where = 'e.active = true'
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.value) like upper('%${s}%') or upper(e.name) like upper('%${s}%'))`
  }
  const res = await api.get(MASTER_BUDGET_BASE, {
    params: { _startRow: 0, _endRow: 50, _where: where, _selectedProperties: 'id,value,name' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchAccountElements(search = '') {
  let where = 'e.active = true'
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    // Di Openbravo, kode akun biasanya disimpan di kolom searchKey, bukan value
    where += ` and (upper(e.searchKey) like upper('%${s}%') or upper(e.value) like upper('%${s}%') or upper(e.name) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue', {
    params: { _startRow: 0, _endRow: 50, _where: where, _selectedProperties: 'id,searchKey,value,name' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchCurrencies() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Currency', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true', _selectedProperties: 'id,iSOCode' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPeriods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPeriod', {
    params: { _startRow: 0, _endRow: 200, _where: 'e.active = true', _orderBy: 'e.startingDate asc', _selectedProperties: 'id,name,startingDate' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchOrganizations() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Organization', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true', _selectedProperties: 'id,name' },
  })
  return res.data?.response?.data ?? []
}