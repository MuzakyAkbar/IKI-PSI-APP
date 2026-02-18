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
// PRODUCT
// ════════════════════════════════════════════════════
const BASE = '/org.openbravo.service.json.jsonrest/Product'

export async function fetchAllProducts({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = ''
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.name) like upper('%${e}%') or upper(e.searchKey) like upper('%${e}%')`
  }
  const res = await api.get(BASE, {
    params: { _startRow: startRow, _endRow: startRow + pageSize, ...(where && { _where: where }), _noCount: false },
  })
  return res.data?.response ?? res.data
}

export async function createProduct(data) {
  const { productCategory, uOM, taxCategory, ...rest } = data
  const res = await api.post(BASE, {
    data: {
      _entityName: 'Product',
      active: true,
      purchase: true,
      sale: true,
      stocked: true,
      ...rest,
      ...(productCategory && { productCategory: fkWrap(productCategory) }),
      ...(uOM             && { uOM:             fkWrap(uOM) }),
      ...(taxCategory     && { taxCategory:     fkWrap(taxCategory) }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function updateProduct(id, data) {
  const { productCategory, uOM, taxCategory, ...rest } = data
  const res = await api.put(`${BASE}/${id}`, {
    data: {
      id,
      _entityName: 'Product',
      ...rest,
      ...(productCategory && { productCategory: fkWrap(productCategory) }),
      ...(uOM             && { uOM:             fkWrap(uOM) }),
      ...(taxCategory     && { taxCategory:     fkWrap(taxCategory) }),
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function deleteProduct(id) {
  const ex = await api.get(`${BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${BASE}/${id}`, {
    data: { id, _entityName: 'Product', searchKey: r.searchKey, name: r.name, active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════
export async function fetchProductCategories() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/ProductCategory', {
    params: { _startRow: 0, _endRow: 200 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchUOMs() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/UOM', {
    params: { _startRow: 0, _endRow: 200 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchTaxCategories() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtTaxCategory', {
    params: { _startRow: 0, _endRow: 100 },
  })
  return res.data?.response?.data ?? []
}

// Accounting Combinations - untuk dropdown 4 account fields
export async function fetchAccountingCombinations(searchKey = '') {
  let where = ''
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.combination) like upper('%${e}%') or upper(e.description) like upper('%${e}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
    params: { _startRow: 0, _endRow: 500, ...(where && { _where: where }) },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// PRODUCT CATEGORY + ACCOUNTS
// ════════════════════════════════════════════════════
const CAT_BASE = '/org.openbravo.service.json.jsonrest/ProductCategory'
const CAT_ACC_BASE = '/org.openbravo.service.json.jsonrest/ProductCategoryAccounts'

export async function fetchCategoriesPage({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = ''
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.name) like upper('%${e}%') or upper(e.value) like upper('%${e}%')`
  }
  const res = await api.get(CAT_BASE, {
    params: { _startRow: startRow, _endRow: startRow + pageSize, ...(where && { _where: where }), _noCount: false },
  })
  return res.data?.response ?? res.data
}

// Fetch existing CategoryAccounts record for a given category id
export async function fetchCategoryAccounts(productCategoryId) {
  const res = await api.get(CAT_ACC_BASE, {
    params: { _where: `e.productCategory.id = '${productCategoryId}'`, _startRow: 0, _endRow: 5 },
  })
  const data = res.data?.response?.data ?? []
  return data[0] ?? null
}

// Create: POST category then POST accounts
export async function createCategory({ productRevenue, productExpense, productCOGS, fixedAsset, value, ...catData }) {
  // Step 1: POST ProductCategory
  // Openbravo ProductCategory API menggunakan 'searchKey' bukan 'value'
  const catRes = await api.post(CAT_BASE, {
    data: { _entityName: 'ProductCategory', searchKey: value, plannedMargin: 0, ...catData },
  })

  // Robust ID extraction — API bisa kembalikan array atau object
  const raw = catRes.data?.response?.data
  const createdObj = Array.isArray(raw) ? raw[0] : raw
  const categoryId = createdObj?.id

  if (!categoryId) {
    const msg = catRes.data?.response?.error?.message ?? 'Gagal mendapatkan ID category baru'
    throw new Error(msg)
  }

  // Step 2: POST ProductCategoryAccounts (4 field akun wajib diisi)
  await api.post(CAT_ACC_BASE, {
    data: {
      _entityName: 'ProductCategoryAccounts',
      productCategory: { id: categoryId },
      productRevenue: { id: productRevenue },
      productExpense: { id: productExpense },
      productCOGS:    { id: productCOGS },
      fixedAsset:     { id: fixedAsset },
    },
  })

  return createdObj
}

// Update: PUT category then PUT/POST accounts
export async function updateCategory(id, { productRevenue, productExpense, productCOGS, fixedAsset, value, ...catData }) {
  // Step 1: PUT ProductCategory
  // Openbravo ProductCategory API menggunakan 'searchKey' bukan 'value'
  await api.put(`${CAT_BASE}/${id}`, {
    data: { id, _entityName: 'ProductCategory', searchKey: value, ...catData },
  })

  // Step 2: upsert ProductCategoryAccounts (4 field akun wajib diisi)
  const accPayload = {
    _entityName: 'ProductCategoryAccounts',
    productCategory: { id },
    productRevenue: { id: productRevenue },
    productExpense: { id: productExpense },
    productCOGS:    { id: productCOGS },
    fixedAsset:     { id: fixedAsset },
  }

  const existingRes = await api.get(CAT_ACC_BASE, {
    params: { _where: `e.productCategory.id = '${id}'`, _startRow: 0, _endRow: 1 },
  })
  const existingAcc = existingRes.data?.response?.data?.[0]

  if (existingAcc?.id) {
    await api.put(`${CAT_ACC_BASE}/${existingAcc.id}`, { data: { id: existingAcc.id, ...accPayload } })
  } else {
    await api.post(CAT_ACC_BASE, { data: accPayload })
  }
}

export async function deleteCategory(id) {
  const ex = await api.get(`${CAT_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${CAT_BASE}/${id}`, {
    data: { id, _entityName: 'ProductCategory', value: r.value || r.searchKey, name: r.name, active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// UOM
// ════════════════════════════════════════════════════
const UOM_BASE = '/org.openbravo.service.json.jsonrest/UOM'

export async function fetchUOMsPage({ startRow = 0, pageSize = 20, searchKey = '' } = {}) {
  let where = ''
  if (searchKey.trim()) {
    const e = searchKey.trim().replace(/'/g, "''")
    where = `upper(e.name) like upper('%${e}%') or upper(e.eDICode) like upper('%${e}%')`
  }
  const res = await api.get(UOM_BASE, {
    params: { _startRow: startRow, _endRow: startRow + pageSize, ...(where && { _where: where }), _noCount: false },
  })
  return res.data?.response ?? res.data
}

export async function createUOM({ uOMSymbol, name, active }) {
  const ediCode = (uOMSymbol || '').substring(0, 2) // max 2 chars
  const res = await api.post(UOM_BASE, {
    data: {
      _entityName: 'UOM',
      organization: { id: '0' },
      name,
      active: active ?? true,
      eDICode: ediCode,
      standardPrecision: 2,
      costingPrecision: 0,
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function updateUOM(id, { uOMSymbol, name, active }) {
  const ediCode = (uOMSymbol || '').substring(0, 2)
  const res = await api.put(`${UOM_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'UOM',
      name,
      active,
      eDICode: ediCode,
    },
  })
  return res.data?.response?.data ?? res.data
}

export async function deleteUOM(id) {
  const ex = await api.get(`${UOM_BASE}/${id}`)
  const r = ex.data?.response?.data?.[0] ?? {}
  const res = await api.put(`${UOM_BASE}/${id}`, {
    data: { id, _entityName: 'UOM', eDICode: r.eDICode, name: r.name, active: false },
  })
  return res.data?.response?.data ?? res.data
}