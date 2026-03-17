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
// TRIAL BALANCE
// Aggregate FinancialMgmtAccountingFact by account
// filtered by accountingDate range + optional org + schema
// ════════════════════════════════════════════════════

/**
 * Fetch raw AccountingFact rows for the given filters.
 * We fetch all rows (up to 5000) then aggregate client-side.
 */
export async function fetchAccountingFacts({
  dateFrom,
  dateTo,
  organization = '',
  accountingSchema = '',
  postingType = 'A',
} = {}) {
  let where = `e.active = true`

  if (postingType)     where += ` and e.postingType = '${postingType}'`
  if (organization)    where += ` and e.organization.id = '${organization}'`
  if (accountingSchema) where += ` and e.accountingSchema.id = '${accountingSchema}'`

  // Activity period: accountingDate within [dateFrom, dateTo]
  if (dateFrom) where += ` and e.accountingDate >= '${dateFrom}'`
  if (dateTo)   where += ` and e.accountingDate <= '${dateTo}'`

  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact', {
    params: {
      _where:    where,
      _startRow: 0,
      _endRow:   5000,
      _orderBy:  'e.account.value asc',
    },
  })
  return res.data?.response?.data ?? []
}

/**
 * Fetch facts for "Balance As Of dateFrom - 1 day" (opening balance).
 * This fetches everything BEFORE dateFrom.
 */
export async function fetchOpeningFacts({
  dateFrom,
  organization = '',
  accountingSchema = '',
  postingType = 'A',
} = {}) {
  if (!dateFrom) return []

  // day before dateFrom
  const d = new Date(dateFrom)
  d.setDate(d.getDate() - 1)
  const dateBefore = d.toISOString().slice(0, 10)

  let where = `e.active = true and e.accountingDate <= '${dateBefore}'`
  if (postingType)      where += ` and e.postingType = '${postingType}'`
  if (organization)     where += ` and e.organization.id = '${organization}'`
  if (accountingSchema) where += ` and e.accountingSchema.id = '${accountingSchema}'`

  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact', {
    params: {
      _where:    where,
      _startRow: 0,
      _endRow:   5000,
      _orderBy:  'e.account.value asc',
    },
  })
  return res.data?.response?.data ?? []
}

/**
 * Aggregate facts into trial balance rows grouped by account.
 * Returns array of:
 * { accountNo, accountName, openingBalance, debit, credit, closingBalance }
 */
export function aggregateTrialBalance(openingFacts, activityFacts) {
  const map = new Map() // key: accountNo

  const getOrCreate = (fact) => {
    const accountNo   = fact.value || fact['account$_identifier']?.split(' - ')[0] || '?'
    const accountName = fact.accountingEntryDescription
      || fact['account$_identifier']?.split(' - ').slice(1).join(' - ')
      || '—'
    if (!map.has(accountNo)) {
      map.set(accountNo, {
        accountNo,
        accountName,
        accountId: typeof fact.account === 'object' ? fact.account?.id : fact.account,
        openingBalance: 0,
        debit:          0,
        credit:         0,
        closingBalance: 0,
      })
    }
    return map.get(accountNo)
  }

  // Opening balance (before period)
  for (const f of openingFacts) {
    const row = getOrCreate(f)
    row.openingBalance += (Number(f.debit) || 0) - (Number(f.credit) || 0)
  }

  // Activity (debit/credit within period)
  for (const f of activityFacts) {
    const row = getOrCreate(f)
    row.debit  += Number(f.debit)  || 0
    row.credit += Number(f.credit) || 0
  }

  // Compute closing balance
  const rows = Array.from(map.values())
  for (const row of rows) {
    row.closingBalance = row.openingBalance + row.debit - row.credit
  }

  // Sort by accountNo
  rows.sort((a, b) => a.accountNo.localeCompare(b.accountNo))

  return rows
}

// ════════════════════════════════════════════════════
// LOOKUPS
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