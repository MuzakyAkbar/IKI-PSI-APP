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

// Gunakan ORG_ID yang sama untuk pembuatan entitas dasar
const ORG_ID = 'B3FE20F490CF49989D7250C0D3341603'

// ════════════════════════════════════════════════════
// LOCATION (Master Data)
// ════════════════════════════════════════════════════
const LOC_MASTER_BASE = '/org.openbravo.service.json.jsonrest/Location'

export async function createLocation(data) {
  const payload = {
    data: {
      _entityName: 'Location',
      organization: ORG_ID,
      active: true,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      cityName: data.cityName,
      postalCode: data.postalCode || null,
      country: data.country || '209',
      region: null,
    },
  }
  const res = await api.post(LOC_MASTER_BASE, payload)
  const raw = res.data?.response?.data
  const result = Array.isArray(raw) ? raw[0] : raw
  if (!result?.id) throw new Error('Failed to create location: no ID returned from server.')
  return result
}

export async function updateLocation(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'Location',
      organization: ORG_ID,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      cityName: data.cityName,
      postalCode: data.postalCode || null,
      country: data.country || '209',
      region: null,
    },
  }
  const res = await api.put(`${LOC_MASTER_BASE}/${id}`, payload)
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

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