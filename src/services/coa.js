import axios from 'axios'

const BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'http://202.59.169.83:8080/openbravo/'
const USERNAME = 'APIService'
const PASSWORD = 'wrt'
const token = btoa(`${USERNAME}:${PASSWORD}`)

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Interceptor: expose full Openbravo error message
api.interceptors.response.use(
  (res) => {
    const status = res.data?.response?.status
    if (status === -1) {
      const err = res.data?.response?.error
      const msg = err?.message || err?.title || JSON.stringify(err) || 'Unknown Openbravo error'
      const error = new Error(msg)
      error.obResponse = res.data?.response
      throw error
    }
    return res
  },
  (err) => Promise.reject(err)
)

// ════════════════════════════════════════════════════
// COA (Chart of Accounts) - FinancialMgmtElementValue
// ════════════════════════════════════════════════════
const COA_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue'
const ACC_ELEMENT_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtElement'

export async function fetchAllCOAs({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = ''
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.name) like upper('%${e}%') or upper(e.searchKey) like upper('%${e}%')`
  }
  const res = await api.get(COA_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      ...(where && { _where: where }),
      _noCount: false,
    },
  })
  return res.data?.response ?? res.data
}

// Fetch list AccountingElement untuk dropdown di form
export async function fetchAccountingElements() {
  const res = await api.get(ACC_ELEMENT_BASE, {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// Fetch organizations yang valid (exclude org "0" / *)
export async function fetchOrganizations() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Organization', {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: "e.id != '0'",
    },
  })
  return res.data?.response?.data ?? []
}

export async function createCOA(data) {
  const { accountingElement, organization, ...rest } = data
  const res = await api.post(COA_BASE, {
    data: {
      _entityName: 'FinancialMgmtElementValue',
      organization: '0',
      active: true,
      summaryLevel: false,
      documentControlled: false,
      postActual: true,
      postBudget: false,
      postEncumbrance: false,
      postStatistical: false,
      isBankAccount: false,
      foreignCurrencyAccount: false,
      elementShown: true,
      titleNode: false,
      ...rest,
      ...(accountingElement && { accountingElement: { id: accountingElement } }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function updateCOA(id, data) {
  const { accountingElement, ...rest } = data
  const res = await api.put(`${COA_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtElementValue',
      ...rest,
      // accountingElement dikirim sebagai plain string
      ...(accountingElement && { accountingElement }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function deleteCOA(id) {
  const ex = await api.get(`${COA_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${COA_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtElementValue',
      searchKey: r.searchKey,
      name: r.name,
      active: false,
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function setActiveCOA(id) {
  const ex = await api.get(`${COA_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${COA_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtElementValue',
      searchKey: r.searchKey,
      name: r.name,
      active: true,
    },
  })
  return res.data?.response?.data ?? res.data
}