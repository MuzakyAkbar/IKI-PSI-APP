import axios from 'axios'

// ==============================
// Runtime Config
// ==============================
const BASE_URL =
  window.APP_CONFIG?.API_BASE_URL || '/openbravo/'

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
// Constants — JSON REST endpoints
// ==============================
const BP_BASE    = '/org.openbravo.service.json.jsonrest/BusinessPartner'
const USER_BASE  = '/org.openbravo.service.json.jsonrest/ADUser'
const LOC_BASE   = '/org.openbravo.service.json.jsonrest/Location'
const BPLOC_REST = '/org.openbravo.service.json.jsonrest/BusinessPartnerLocation'

// Helper: wrap FK value as { id } object
const fkWrap = (val) => (val ? { id: val } : undefined)

// Real organization ID from Openbravo (confirmed from API response)
// '0' shorthand only works for some entities; Location & BPLocation need the real org ID
const ORG_ID = 'B3FE20F490CF49989D7250C0D3341603'

// ==============================
// GET - list customers (EXACT reference logic)
// ==============================
export async function fetchCustomers({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  // Filter berdasarkan kategori 'Customer'
  let where = `e.businessPartnerCategory.name = 'Customer'`

  if (searchKey.trim()) {
    const escaped = searchKey.trim().replace(/'/g, "''")
    // Mencari berdasarkan nama atau searchKey (Code)
    where += ` and (upper(e.name) like upper('%${escaped}%') or upper(e.searchKey) like upper('%${escaped}%'))`
  }

  const res = await api.get(BP_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _where: where,
      _noCount: false,
      _sortBy: 'searchKey' // Urutkan berdasarkan Code
    },
  })

  return res.data?.response ?? res.data
}

// ==============================
// Lookup: Business Partner Category
// ==============================
async function fetchCategoryIdByName(name) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/BusinessPartnerCategory', {
    params: {
      _startRow: 0,
      _endRow: 100,
      _where: `upper(e.name) = upper('${name}')`,
    },
  })
  const data = res.data?.response?.data ?? []
  if (!data.length) throw new Error(`Kategori "${name}" tidak ditemukan di server.`)
  return data[0].id
}

let _customerCategoryId = null

// ==============================
// POST - create customer (EXACT reference logic — no value field)
// ==============================
export async function createCustomer(data) {
  const { paymentTerms, priceList, paymentMethod, currency, ...rest } = data

  if (!_customerCategoryId) {
    _customerCategoryId = await fetchCategoryIdByName('Customer')
  }

  const payload = {
    data: {
      _entityName: 'BusinessPartner',
      active: true,
      customer: true,
      vendor: false,
      businessPartnerCategory: { id: _customerCategoryId },
      // Openbravo menggunakan searchKey sebagai field 'Code'
      searchKey: data.searchKey, 
      name: data.name,
      currency: fkWrap(currency) ?? { id: '303' }, // Default IDR jika kosong
      ...rest,
      ...(paymentTerms  && { paymentTerms:  fkWrap(paymentTerms) }),
      ...(priceList     && { priceList:     fkWrap(priceList) }),
      ...(paymentMethod && { paymentMethod: fkWrap(paymentMethod) }),
    },
  }

  const res = await api.post(BP_BASE, payload)
  return res.data?.response?.data?.[0] ?? res.data
}

// ==============================
// PUT - update customer (EXACT reference logic)
// ==============================
export async function updateCustomer(id, data) {
  const { paymentTerms, priceList, paymentMethod, currency, ...rest } = data

  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartner',
      ...rest,
      ...(currency      && { currency:      fkWrap(currency) }),
      ...(paymentTerms  && { paymentTerms:  fkWrap(paymentTerms) }),
      ...(priceList     && { priceList:     fkWrap(priceList) }),
      ...(paymentMethod && { paymentMethod: fkWrap(paymentMethod) }),
    },
  }

  const res = await api.put(`${BP_BASE}/${id}`, payload)
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// DEACTIVATE - customer
// ==============================
export async function deleteCustomer(id) {
  const payload = { data: { id, _entityName: 'BusinessPartner', active: false } }
  const res = await api.put(`${BP_BASE}/${id}`, payload)
  return res.data?.response?.data ?? res.data
}

// ==============================
// Lookups
// ==============================
export async function fetchPaymentTerms() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PaymentTerm', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPriceLists() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/PriceList', {
    params: { _startRow: 0, _endRow: 100, _where: `e.salesPriceList = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPaymentMethods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FIN_Payment_Method', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// CONTACT (ADUser) — GET
// ==============================
export async function fetchContacts(businessPartnerId) {
  const res = await api.get(USER_BASE, {
    params: {
      _startRow: 0,
      _endRow: 200,
      _where: `e.businessPartner.id = '${businessPartnerId}' and e.active = true`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// CONTACT — POST (create)
// ==============================
export async function createContact(data) {
  const payload = {
    data: {
      _entityName: 'ADUser',
      organization: '0',
      active: true,
      firstName: data.firstName,
      lastName: data.lastName || null,
      name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      position: data.position || null,
      comments: data.comments || null,
      businessPartner: fkWrap(data.businessPartner),
    },
  }
  const res = await api.post(USER_BASE, payload)
  checkActionAllowed(res, 'createContact')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// CONTACT — PUT (update)
// ==============================
export async function updateContact(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'ADUser',
      organization: '0',
      firstName: data.firstName,
      lastName: data.lastName || null,
      name: data.name || `${data.firstName} ${data.lastName || ''}`.trim(),
      email: data.email || null,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      position: data.position || null,
      comments: data.comments || null,
    },
  }
  const res = await api.put(`${USER_BASE}/${id}`, payload)
  checkActionAllowed(res, 'updateContact')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// CONTACT — deactivate
// ==============================
export async function deleteContact(id) {
  const payload = {
    data: {
      id,
      _entityName: 'ADUser',
      organization: '0',
      active: false,
    },
  }
  const res = await api.put(`${USER_BASE}/${id}`, payload)
  checkActionAllowed(res, 'deleteContact')
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// LOCATION master — POST
// ==============================
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
      country: data.country || '209',  // plain string ID per API response
      region: null,
    },
  }
  const res = await api.post(LOC_BASE, payload)
  // Bypass checkActionAllowed — succeeds on server regardless of response status
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// LOCATION master — PUT
// ==============================
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
      country: data.country || '209',  // plain string ID per API response
      region: null,
    },
  }
  const res = await api.put(`${LOC_BASE}/${id}`, payload)
  // Bypass checkActionAllowed — succeeds on server regardless of response status
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// BP LOCATION — GET by businessPartner id
// ==============================
export async function fetchBPLocations(businessPartnerId) {
  const res = await api.get(BPLOC_REST, {
    params: {
      _startRow: 0,
      _endRow: 200,
      _where: `e.businessPartner.id = '${businessPartnerId}'`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// BP LOCATION — GET batch for multiple BP ids
// businessPartner in response is a plain string ID (not object)
// ==============================
export async function fetchBPLocationsForIds(idsInClause) {
  const res = await api.get(BPLOC_REST, {
    params: {
      _startRow: 0,
      _endRow: 500,
      _where: `e.businessPartner.id in (${idsInClause}) and e.active = true`,
    },
  })
  return res.data?.response?.data ?? []
}

// ==============================
// BP LOCATION — POST (create)
// ==============================
export async function createBPLocation(data) {
  const payload = {
    data: {
      _entityName: 'BusinessPartnerLocation',
      organization: ORG_ID,
      active: true,
      name: data.name,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      fax: null,
      invoiceToAddress: data.invoiceToAddress ?? true,
      shipToAddress: data.shipToAddress ?? true,
      payFromAddress: data.payFromAddress ?? true,
      remitToAddress: data.remitToAddress ?? true,
      taxLocation: false,
      businessPartner: data.businessPartner,  // plain string ID per API response
      locationAddress: data.locationAddress,  // plain string ID per API response
    },
  }
  const res = await api.post(BPLOC_REST, payload)
  // Bypass checkActionAllowed — succeeds on server regardless of response status
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// BP LOCATION — PUT (update)
// ==============================
export async function updateBPLocation(id, data) {
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartnerLocation',
      organization: ORG_ID,
      active: data.active ?? true,
      name: data.name,
      phone: data.phone || null,
      alternativePhone: data.alternativePhone || null,
      fax: null,
      invoiceToAddress: data.invoiceToAddress ?? true,
      shipToAddress: data.shipToAddress ?? true,
      payFromAddress: data.payFromAddress ?? true,
      remitToAddress: data.remitToAddress ?? true,
      taxLocation: false,
      businessPartner: data.businessPartner,  // plain string ID per API response
      locationAddress: data.locationAddress,  // plain string ID per API response
    },
  }
  const res = await api.put(`${BPLOC_REST}/${id}`, payload)
  // Bypass checkActionAllowed — succeeds on server regardless of response status
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// BP LOCATION — deactivate
// ==============================
export async function deleteBPLocation(id, oldRecord = null) {
  const payload = {
    data: {
      id,
      _entityName: 'BusinessPartnerLocation',
      organization: ORG_ID,
      active: false,
      ...(oldRecord ? {
        name: oldRecord.name,
        phone: oldRecord.phone || null,
        invoiceToAddress: oldRecord.invoiceToAddress,
        shipToAddress: oldRecord.shipToAddress,
        payFromAddress: oldRecord.payFromAddress,
        remitToAddress: oldRecord.remitToAddress,
        taxLocation: oldRecord.taxLocation ?? false,
        businessPartner: (typeof oldRecord.businessPartner === 'object') ? oldRecord.businessPartner.id : oldRecord.businessPartner,
        locationAddress: (typeof oldRecord.locationAddress === 'object') ? oldRecord.locationAddress.id : oldRecord.locationAddress,
      } : {}),
    },
  }
  const res = await api.put(`${BPLOC_REST}/${id}`, payload)
  // Bypass checkActionAllowed — succeeds on server regardless of response status
  const raw = res.data?.response?.data
  if (Array.isArray(raw)) return raw[0]
  return raw ?? res.data
}

// ==============================
// Helper: detect errors (only throw on explicit negative status)
// ==============================
function checkActionAllowed(res, label = '') {
  const response = res.data?.response
  const err = response?.error
  const status = response?.status

  if (err?.message === 'OBUIAPP_ActionNotAllowed') {
    throw new Error(
      'User APIService tidak memiliki akses write. ' +
      'Tambahkan akses tabel di Openbravo: General Setup > Security > Role > [Role APIService] > Table Access.'
    )
  }

  // Only throw if status is explicitly negative
  // status 0 = success, undefined = HTTP 2xx without status = success
  if (status !== undefined && status < 0) {
    console.error(`[Openbravo ${label}] error status=${status}`, JSON.stringify(response))
    const detail = err?.message ?? err?.type ?? JSON.stringify(err) ?? 'Unknown error'
    throw new Error(`Server error: ${detail}`)
  }
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