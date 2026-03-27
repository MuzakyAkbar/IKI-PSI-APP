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
// PROFIT & LOSS
// CoA Categories:
//   4.xxxxx  → Pendapatan (Revenue)
//   5.xxxxx  → Beban Pokok Penjualan (COGS)
//   6.xxxxx  → Beban Umum & Administrasi (OpEx)
// Balances from FinancialMgmtAccountingFact
//   period: accountingDate between startDate and endDate
// ════════════════════════════════════════════════════

/**
 * Fetch Chart-of-Account elements filtered by searchKey prefix.
 * @param {string} prefix  e.g. '4', '5', '6'
 * @returns {Promise<Array>}  array of ElementValue records
 */
export async function fetchElementsByPrefix(prefix) {
  const res = await api.get(
    '/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue',
    {
      params: {
        _where:    `e.active = true and e.searchKey like '${prefix}%'`,
        _startRow: 0,
        _endRow:   2000,
        _orderBy:  'e.searchKey asc',
      },
    }
  )
  return res.data?.response?.data ?? []
}

/**
 * Fetch accounting facts for a period (startDate..endDate), then
 * aggregate into Map<elementValueId, { debit, credit, net }>.
 *
 * net = debit - credit  (positive = debit-heavy, negative = credit-heavy)
 *
 * @param {string} startDate  YYYY-MM-DD
 * @param {string} endDate    YYYY-MM-DD
 * @param {object} opts
 * @param {string} opts.organization
 * @param {string} opts.accountingSchema
 * @param {string} opts.postingType   default 'A'
 * @returns {Promise<Map<string, { debit: number, credit: number, net: number }>>}
 */
export async function fetchPeriodFactMap(startDate, endDate, {
  organization = '',
  accountingSchema = '',
  postingType = 'A',
} = {}) {
  if (!startDate || !endDate) return new Map()

  let where = `e.active = true and e.accountingDate >= '${startDate}' and e.accountingDate <= '${endDate}'`
  if (postingType)      where += ` and e.postingType = '${postingType}'`
  if (organization)     where += ` and e.organization.id = '${organization}'`
  if (accountingSchema) where += ` and e.accountingSchema.id = '${accountingSchema}'`

  // Paginate to avoid hard limits
  const PAGE = 5000
  let startRow = 0
  let allFacts = []

  while (true) {
    const res = await api.get(
      '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact',
      {
        params: {
          _where:    where,
          _startRow: startRow,
          _endRow:   startRow + PAGE,
          _orderBy:  'e.account.value asc',
        },
      }
    )
    const data = res.data?.response?.data ?? []
    allFacts = allFacts.concat(data)
    if (data.length < PAGE) break
    startRow += PAGE
  }

  const map = new Map()
  for (const f of allFacts) {
    const accountId = typeof f.account === 'object' ? f.account?.id : f.account
    if (!accountId) continue
    const prev = map.get(accountId) ?? { debit: 0, credit: 0, net: 0 }
    const d = Number(f.debit)  || 0
    const c = Number(f.credit) || 0
    map.set(accountId, {
      debit:  prev.debit  + d,
      credit: prev.credit + c,
      net:    prev.net    + d - c,
    })
  }
  return map
}

/**
 * Build a P&L category (e.g. Pendapatan, COGS, OpEx).
 *
 * Each account line:
 *   { id, searchKey, name, debit, credit, amount }
 *
 * `amount` is the "natural" value for P&L:
 *   - Revenue (prefix 4): credit > debit → amount = credit - debit  (positive = income)
 *   - Cost/Expense (prefix 5,6): debit > credit → amount = debit - credit (positive = cost)
 *
 * @param {string}   prefix   '4' | '5' | '6'
 * @param {Map}      factMap  period fact map
 * @param {Map}      refMap   reference period fact map
 * @param {'revenue'|'expense'} type
 */
async function buildCategory(prefix, factMap, refMap, type) {
  const elements = await fetchElementsByPrefix(prefix)

  const lines = elements.map(el => {
    const facts    = factMap.get(el.id) ?? { debit: 0, credit: 0, net: 0 }
    const refFacts = refMap.get(el.id)  ?? { debit: 0, credit: 0, net: 0 }

    // For revenue: positive when credit-heavy; for expense: positive when debit-heavy
    const amount    = type === 'revenue'
      ? (facts.credit - facts.debit)
      : (facts.debit  - facts.credit)
    const refAmount = type === 'revenue'
      ? (refFacts.credit - refFacts.debit)
      : (refFacts.debit  - refFacts.credit)

    return {
      id:         el.id,
      searchKey:  el.searchKey,
      name:       el.name || el['$_identifier'] || el.searchKey,
      debit:      facts.debit,
      credit:     facts.credit,
      amount,
      refAmount,
    }
  }).filter(l => l.debit !== 0 || l.credit !== 0 || l.refAmount !== 0)
    .sort((a, b) => a.searchKey.localeCompare(b.searchKey, undefined, { numeric: true }))

  const total    = lines.reduce((s, l) => s + l.amount,    0)
  const refTotal = lines.reduce((s, l) => s + l.refAmount, 0)

  return { prefix, lines, total, refTotal }
}

/**
 * Build full P&L report.
 *
 * Returns:
 * {
 *   pendapatan: { lines, total, refTotal },
 *   bpp:        { lines, total, refTotal },   // Beban Pokok Penjualan
 *   buaAdmin:   { lines, total, refTotal },   // Beban Umum & Admin
 *   labaKotor, refLabaKotor,
 *   labaUsaha,  refLabaUsaha,
 * }
 */
export async function buildProfitLoss(startDate, endDate, refStartDate, refEndDate, opts = {}) {
  const [factMap, refMap] = await Promise.all([
    fetchPeriodFactMap(startDate, endDate, opts),
    refStartDate && refEndDate
      ? fetchPeriodFactMap(refStartDate, refEndDate, opts)
      : Promise.resolve(new Map()),
  ])

  const [pendapatan, bpp, buaAdmin] = await Promise.all([
    buildCategory('4', factMap, refMap, 'revenue'),
    buildCategory('5', factMap, refMap, 'expense'),
    buildCategory('6', factMap, refMap, 'expense'),
  ])

  const labaKotor    = pendapatan.total    - bpp.total
  const refLabaKotor = pendapatan.refTotal - bpp.refTotal
  const labaUsaha    = labaKotor    - buaAdmin.total
  const refLabaUsaha = refLabaKotor - buaAdmin.refTotal

  return {
    pendapatan,
    bpp,
    buaAdmin,
    labaKotor,
    refLabaKotor,
    labaUsaha,
    refLabaUsaha,
  }
}

// ════════════════════════════════════════════════════
// LOOKUPS (shared)
// ════════════════════════════════════════════════════

export async function fetchOrganizations() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Organization', {
    params: { _startRow: 0, _endRow: 100, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? []
}

export async function fetchAccountingSchemas() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema', {
    params: { _startRow: 0, _endRow: 50, _where: 'e.active = true' },
  })
  return res.data?.response?.data ?? []
}