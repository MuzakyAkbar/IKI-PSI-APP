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
// WAREHOUSE
// ════════════════════════════════════════════════════
const WH_BASE = '/org.openbravo.service.json.jsonrest/Warehouse'

export async function fetchWarehousesPage({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = ''
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.name) like upper('%${e}%')`
  }
  const res = await api.get(WH_BASE, {
    params: { _startRow: startRow, _endRow: startRow + pageSize, ...(where && { _where: where }), _noCount: false },
  })
  return res.data?.response ?? res.data
}

export async function createWarehouse(data) {
  const res = await api.post(WH_BASE, {
    data: {
      _entityName: 'Warehouse',
      active: true,
      ...data,
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function updateWarehouse(id, data) {
  const res = await api.put(`${WH_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'Warehouse',
      ...data,
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function deleteWarehouse(id) {
  const ex = await api.get(`${WH_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${WH_BASE}/${id}`, {
    data: { id, _entityName: 'Warehouse', name: r.name, active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// STORAGE BIN (Locator)
// ════════════════════════════════════════════════════
const LOC_BASE = '/org.openbravo.service.json.jsonrest/Locator'

export async function fetchStorageBinsPage({ startRow = 0, pageSize = 20, searchKey = '', warehouseId = '' } = {}) {
  const conditions = []
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    conditions.push(`(upper(e.searchKey) like upper('%${e}%') or upper(e.warehouse.name) like upper('%${e}%'))`)
  }
  if (warehouseId) {
    conditions.push(`e.warehouse.id = '${warehouseId}'`)
  }
  const where = conditions.join(' and ')
  const res = await api.get(LOC_BASE, {
    params: { _startRow: startRow, _endRow: startRow + pageSize, ...(where && { _where: where }), _noCount: false },
  })
  return res.data?.response ?? res.data
}

export async function createStorageBin(data) {
  const { warehouseId, ...rest } = data
  const res = await api.post(LOC_BASE, {
    data: {
      _entityName: 'Locator',
      active: true,
      ...rest,
      ...(warehouseId && { warehouse: { id: warehouseId } }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function updateStorageBin(id, data) {
  const { warehouseId, ...rest } = data
  const res = await api.put(`${LOC_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'Locator',
      ...rest,
      ...(warehouseId && { warehouse: { id: warehouseId } }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function deleteStorageBin(id) {
  const ex = await api.get(`${LOC_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${LOC_BASE}/${id}`, {
    data: { id, _entityName: 'Locator', searchKey: r.searchKey, active: false },
  })
  return res.data?.response?.data ?? res.data
}

// Fetch all warehouses for dropdown
export async function fetchAllWarehouses() {
  const res = await api.get(WH_BASE, {
    params: { _startRow: 0, _endRow: 200, _where: "e.active = true" },
  })
  return res.data?.response?.data ?? []
}