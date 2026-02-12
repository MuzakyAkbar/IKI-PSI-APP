import axios from 'axios'

const USERNAME = 'api-service'
const PASSWORD = '4dm1n@bhm2025'
const token = btoa(`${USERNAME}:${PASSWORD}`)

const api = axios.create({
  baseURL: '/bhmc',
  headers: {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  },
})

export async function fetchCustomers({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  // _where pakai HQL Openbravo untuk filter category Customer
  let where = `e.businessPartnerCategory.name = 'Customer'`
  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${escaped}%')`
  }

  const params = {
    _startRow: startRow,
    _endRow: startRow + pageSize,
    _where: where,
    _noCount: false,
  }

  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', { params })
  return res.data?.response ?? res.data
}