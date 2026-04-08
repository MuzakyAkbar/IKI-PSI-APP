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
// CONSTANTS
// ════════════════════════════════════════════════════
export const DEFAULT_ORGANIZATION = 'B3FE20F490CF49989D7250C0D3341603'
export const DEFAULT_CLIENT       = '53AD31E21D624632B2F171194EC6E887'

const TAX_RATE_BASE     = '/org.openbravo.service.json.jsonrest/FinancialMgmtTaxRate'
const TAX_CATEGORY_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtTaxCategory'
const TAX_ACCOUNTING_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtTaxRateAccounts'
const TAX_TRL_BASE      = '/org.openbravo.service.json.jsonrest/FinancialMgmtTaxTrl'
const TAX_ZONE_BASE     = '/org.openbravo.service.json.jsonrest/FinancialMgmtTaxZone'
const COA_BASE          = '/org.openbravo.service.json.jsonrest/FinancialMgmtElement'

// ════════════════════════════════════════════════════
// TAX CATEGORY
// ════════════════════════════════════════════════════
export async function fetchTaxCategories({ startRow = 0, pageSize = 100, searchKey = '' } = {}) {
  let where = `e.active = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${s}%')`
  }
  const res = await api.get(TAX_CATEGORY_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _noCount: false,
      _orderBy: 'e.name asc',
      _where: where,
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchTaxCategory(id) {
  const res = await api.get(`${TAX_CATEGORY_BASE}/${id}`)
  const wrapped = res.data?.response?.data
  if (wrapped) return Array.isArray(wrapped) ? wrapped[0] : wrapped
  if (res.data?.id) return res.data
  return null
}

export async function createTaxCategory(data) {
  const res = await api.post(TAX_CATEGORY_BASE, {
    data: {
      _entityName: 'FinancialMgmtTaxCategory',
      organization: DEFAULT_ORGANIZATION,
      active: true,
      name: data.name,
      ...(data.description && { description: data.description }),
      default: data.default ?? false,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateTaxCategory(id, data) {
  const res = await api.put(`${TAX_CATEGORY_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtTaxCategory',
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
      default: data.default ?? false,
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteTaxCategory(id) {
  const res = await api.put(`${TAX_CATEGORY_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtTaxCategory', active: false },
  })
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// TAX RATE
// ════════════════════════════════════════════════════
export async function fetchTaxRates({ startRow = 0, pageSize = 20, searchKey = '', categoryId = '' } = {}) {
  let where = `e.active = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${s}%')`
  }
  if (categoryId) {
    where += ` and e.taxCategory.id = '${categoryId}'`
  }
  const res = await api.get(TAX_RATE_BASE, {
    params: {
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _noCount: false,
      _orderBy: 'e.name asc',
      _where: where,
      _selectedProperties:
        'id,name,rate,validFromDate,taxCategory,taxCategory$_identifier,salesPurchaseType,country,country$_identifier,baseAmount,docTaxAmount,summaryLevel,active,description',
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchTaxRate(id) {
  const res = await api.get(`${TAX_RATE_BASE}/${id}`)
  const wrapped = res.data?.response?.data
  if (wrapped) return Array.isArray(wrapped) ? wrapped[0] : wrapped
  if (res.data?.id) return res.data
  return null
}

export async function createTaxRate(data) {
  const res = await api.post(TAX_RATE_BASE, {
    data: buildTaxRatePayload(data),
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateTaxRate(id, data) {
  const res = await api.put(`${TAX_RATE_BASE}/${id}`, {
    data: { id, ...buildTaxRatePayload(data) },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteTaxRate(id) {
  const res = await api.put(`${TAX_RATE_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtTaxRate', active: false },
  })
  return res.data?.response?.data ?? res.data
}

function buildTaxRatePayload(data) {
  return {
    _entityName: 'FinancialMgmtTaxRate',
    organization: data.organization || DEFAULT_ORGANIZATION,
    active: true,
    name: data.name,
    rate: Number(data.rate ?? 0),
    validFromDate: data.validFromDate,
    taxCategory: data.taxCategory ? { id: data.taxCategory } : undefined,
    salesPurchaseType: data.salesPurchaseType || 'B',
    baseAmount: data.baseAmount || 'LNA',
    docTaxAmount: data.docTaxAmount || 'L',
    summaryLevel: data.summaryLevel ?? false,
    lineNo: data.lineNo ?? 10,
    ...(data.description && { description: data.description }),
    ...(data.country && { country: { id: data.country } }),
    ...(data.destinationCountry && { destinationCountry: { id: data.destinationCountry } }),
    ...(data.region && { region: { id: data.region } }),
    ...(data.destinationRegion && { destinationRegion: { id: data.destinationRegion } }),
    ...(data.parentTaxRate && { parentTaxRate: { id: data.parentTaxRate } }),
    cascade: data.cascade ?? false,
    default: data.default ?? false,
    taxExempt: data.taxExempt ?? false,
    withholdingTax: data.withholdingTax ?? false,
    notTaxable: data.notTaxable ?? false,
    isCashVAT: data.isCashVAT ?? false,
  }
}

// ════════════════════════════════════════════════════
// TAX ACCOUNTING (TaxRateAccounts)
// ════════════════════════════════════════════════════
export async function fetchTaxAccounting(taxId) {
  const res = await api.get(TAX_ACCOUNTING_BASE, {
    params: {
      _where: `e.tax.id = '${taxId}'`,
      _startRow: 0,
      _endRow: 50,
    },
  })
  return res.data?.response?.data ?? []
}

export async function upsertTaxAccounting(taxId, data) {
  // Update if exists, create if not
  if (data.id) {
    const res = await api.put(`${TAX_ACCOUNTING_BASE}/${data.id}`, {
      data: {
        id: data.id,
        _entityName: 'FinancialMgmtTaxRateAccounts',
        ...(data.taxDue && { taxDue: { id: data.taxDue } }),
        ...(data.taxCredit && { taxCredit: { id: data.taxCredit } }),
        ...(data.taxLiability && { taxLiability: { id: data.taxLiability } }),
        ...(data.taxReceivables && { taxReceivables: { id: data.taxReceivables } }),
        ...(data.taxExpense && { taxExpense: { id: data.taxExpense } }),
      },
    })
    const raw = res.data?.response?.data
    return Array.isArray(raw) ? raw[0] : raw
  } else {
    const res = await api.post(TAX_ACCOUNTING_BASE, {
      data: {
        _entityName: 'FinancialMgmtTaxRateAccounts',
        tax: taxId,
        organization: DEFAULT_ORGANIZATION,
        ...(data.accountingSchema && { accountingSchema: { id: data.accountingSchema } }),
        ...(data.taxDue && { taxDue: { id: data.taxDue } }),
        ...(data.taxCredit && { taxCredit: { id: data.taxCredit } }),
        ...(data.taxLiability && { taxLiability: { id: data.taxLiability } }),
        ...(data.taxReceivables && { taxReceivables: { id: data.taxReceivables } }),
        ...(data.taxExpense && { taxExpense: { id: data.taxExpense } }),
      },
    })
    const raw = res.data?.response?.data
    return Array.isArray(raw) ? raw[0] : raw
  }
}

// ════════════════════════════════════════════════════
// TAX TRANSLATION
// ════════════════════════════════════════════════════
export async function fetchTaxTranslations(taxId) {
  const res = await api.get(TAX_TRL_BASE, {
    params: {
      _where: `e.tax.id = '${taxId}'`,
      _startRow: 0,
      _endRow: 50,
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// TAX ZONE
// ════════════════════════════════════════════════════
export async function fetchTaxZones(taxId) {
  const res = await api.get(TAX_ZONE_BASE, {
    params: {
      _where: `e.tax.id = '${taxId}'`,
      _startRow: 0,
      _endRow: 50,
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// GENERAL LEDGER (Chart of Accounts) — for accounting dropdowns
// ════════════════════════════════════════════════════
export async function fetchGLAccounts({ searchKey = '', startRow = 0, pageSize = 30 } = {}) {
  let where = `e.active = true and e.elementType = 'A'`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.value) like upper('%${s}%') or upper(e.name) like upper('%${s}%'))`
  }
  const res = await api.get(COA_BASE, {
    params: {
      _where: where,
      _startRow: startRow,
      _endRow: startRow + pageSize,
      _orderBy: 'e.value asc',
      _selectedProperties: 'id,value,name',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// COUNTRIES — for country/region dropdowns
// ════════════════════════════════════════════════════
export async function fetchCountries({ searchKey = '' } = {}) {
  let where = `e.active = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and upper(e.name) like upper('%${s}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Country', {
    params: {
      _where: where,
      _startRow: 0,
      _endRow: 50,
      _orderBy: 'e.name asc',
      _selectedProperties: 'id,name,iSOCountryCode',
    },
  })
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// ACCOUNTING SCHEMA
// ════════════════════════════════════════════════════
export async function fetchAccountingSchemas() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema', {
    params: {
      _where: 'e.active = true',
      _startRow: 0,
      _endRow: 20,
      _selectedProperties: 'id,name',
    },
  })
  return res.data?.response?.data ?? []
}