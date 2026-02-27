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
    params: { _startRow: startRow, _endRow: startRow + pageSize, ...(where && { _where: where }), _noCount: false },
  })
  return res.data?.response ?? res.data
}

export async function fetchAccountingElements() {
  const res = await api.get(ACC_ELEMENT_BASE, {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function createCOA(data) {
  const res = await api.post(COA_BASE, {
    data: {
      _entityName: 'FinancialMgmtElementValue',
      organization: { id: '0' },
      searchKey: data.searchKey,
      name: data.name,
      accountSign: data.accountSign || 'D',
      accountType: data.accountType || 'E',
      elementLevel: data.elementLevel || 'S',
      accountingElement: data.accountingElement,
      active: data.active ?? true,
      ...(data.description ? { description: data.description } : {}),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function updateCOA(id, data) {
  const res = await api.put(`${COA_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtElementValue',
      searchKey: data.searchKey,
      name: data.name,
      accountSign: data.accountSign,
      accountType: data.accountType,
      elementLevel: data.elementLevel,
      accountingElement: data.accountingElement,
      active: data.active ?? true,
      ...(data.description ? { description: data.description } : {}),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function deleteCOA(id) {
  const ex = await api.get(`${COA_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${COA_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtElementValue', searchKey: r.searchKey, name: r.name, active: false },
  })
  return res.data?.response?.data ?? res.data
}

export async function setActiveCOA(id) {
  const ex = await api.get(`${COA_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${COA_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtElementValue', searchKey: r.searchKey, name: r.name, active: true },
  })
  return res.data?.response?.data ?? res.data
}