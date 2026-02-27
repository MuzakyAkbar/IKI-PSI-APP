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

const fkWrap = (val) => (val ? { id: val } : undefined)

// ════════════════════════════════════════════════════
// GOODS SHIPMENT HEADER
// ════════════════════════════════════════════════════
const BASE = '/org.openbravo.service.json.jsonrest/MaterialMgmtShipmentInOut'

export async function fetchAllShipments({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  // Sales shipments: movementType = 'C-' (Customer Shipment Out)
  let where = `e.movementType = 'C-'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%'))`
  }
  const res = await api.get(BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _where: where,
      _noCount: false,
      _orderBy: 'e.creationDate desc',
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchShipment(id) {
  const res = await api.get(`${BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createShipment(data) {
  const payload = buildShipmentPayload(data)
  const res = await api.post(BASE, {
    data: { _entityName: 'ShipmentInOut', movementType: 'C-', ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateShipment(id, data) {
  const payload = buildShipmentPayload(data)
  const res = await api.put(`${BASE}/${id}`, {
    data: { id, _entityName: 'ShipmentInOut', ...payload },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteShipment(id) {
  const ex = await api.get(`${BASE}/${id}`)
  const r = (ex.data?.response?.data ?? [])[0] ?? {}
  const res = await api.put(`${BASE}/${id}`, {
    data: { id, _entityName: 'ShipmentInOut', documentNo: r.documentNo, active: false },
  })
  return res.data?.response?.data ?? res.data
}

function buildShipmentPayload(data) {
  const {
    businessPartner, partnerAddress, warehouse, documentType,
    salesOrder, deliveryLocation, movementDate, accountingDate,
    documentNo, description, orderReference, isNettingShipment,
    ...rest
  } = data
  const { active, movementType, ...safeRest } = rest
  return {
    ...safeRest,
    ...(documentNo         && { documentNo }),
    ...(businessPartner    && { businessPartner:  fkWrap(businessPartner) }),
    ...(partnerAddress     && { partnerAddress:   fkWrap(partnerAddress) }),
    ...(warehouse          && { warehouse:        fkWrap(warehouse) }),
    ...(documentType       && { documentType:     fkWrap(documentType) }),
    ...(salesOrder         && { salesOrder:       fkWrap(salesOrder) }),
    ...(deliveryLocation   && { deliveryLocation: fkWrap(deliveryLocation) }),
    ...(movementDate       && { movementDate }),
    ...(accountingDate     && { accountingDate }),
    ...(description        && { description }),
    ...(orderReference     && { orderReference }),
    ...(isNettingShipment != null && { isNettingShipment }),
  }
}

// ════════════════════════════════════════════════════
// GOODS SHIPMENT LINES
// ════════════════════════════════════════════════════
const LINE_BASE = '/org.openbravo.service.json.jsonrest/MaterialMgmtShipmentInOutLine'

export async function fetchShipmentLines(shipmentId) {
  const res = await api.get(LINE_BASE, {
    params: {
      _where: `e.shipmentReceipt.id = '${shipmentId}'`,
      _startRow: 0,
      _endRow: 200,
      _orderBy: 'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createShipmentLine(shipmentId, data) {
  const { product, uOM, storageBin, orderLine, ...rest } = data
  const res = await api.post(LINE_BASE, {
    data: {
      _entityName: 'ShipmentInOutLine',
      shipmentReceipt: { id: shipmentId },
      ...rest,
      ...(product    && { product:    fkWrap(product) }),
      ...(uOM        && { uOM:        fkWrap(uOM) }),
      ...(storageBin && { storageBin: fkWrap(storageBin) }),
      ...(orderLine  && { salesOrderLine: fkWrap(orderLine) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateShipmentLine(id, data) {
  const { product, uOM, storageBin, orderLine, ...rest } = data
  const res = await api.put(`${LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'ShipmentInOutLine',
      ...rest,
      ...(product    && { product:    fkWrap(product) }),
      ...(uOM        && { uOM:        fkWrap(uOM) }),
      ...(storageBin && { storageBin: fkWrap(storageBin) }),
      ...(orderLine  && { salesOrderLine: fkWrap(orderLine) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteShipmentLine(id) {
  const res = await api.delete(`${LINE_BASE}/${id}`)
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════

export async function fetchCustomers(search = '') {
  let where = `e.businessPartnerCategory.name = 'Customer'`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${s}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartner', {
    params: { _where: where, _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPartnerLocations(businessPartnerId) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartnerLocation', {
    params: {
      _where: `e.businessPartner.id = '${businessPartnerId}'`,
      _startRow: 0, _endRow: 50,
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchWarehouses() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Warehouse', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchDocumentTypes() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
    params: { _startRow: 0, _endRow: 100, _where: `e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchSalesOrders(search = '') {
  let where = ``
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where = `upper(e.documentNo) like upper('%${s}%') or upper(e.businessPartner.name) like upper('%${s}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Order', {
    params: { _startRow: 0, _endRow: 50, ...(where && { _where: where }) },
  })
  return res.data?.response?.data ?? []
}

export async function fetchProducts(search = '') {
  let where = `e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.name) like upper('%${s}%') or upper(e.searchKey) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Product', {
    params: { _where: where, _startRow: 0, _endRow: 50 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchUOMs() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/UOM', {
    params: { _startRow: 0, _endRow: 200 },
  })
  return res.data?.response?.data ?? []
}