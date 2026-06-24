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
// ENTITY & FIELD NAMES
// ════════════════════════════════════════════════════
// DB: C_ElementValue       → Entity: FinancialMgmtElementValue
//   DB column: value       → JSON field: searchKey  (account code)
//   DB column: name        → JSON field: name
//   DB column: isactive    → JSON field: active (boolean)
//   DB column: accounttype → JSON field: accountType
//   DB column: issummary   → JSON field: summaryLevel (boolean, native true/false)
//
// DB: Fact_Acct            → Entity: FinancialMgmtAccountingFact
//   DB column: dateacct    → JSON field: accountingDate
//   DB column: amtacctdr   → JSON field: debit
//   DB column: amtacctcr   → JSON field: credit
//   DB column: postingtype → JSON field: postingType
//   DB column: account_id  → JSON field: account (object ref)
//
// CoA PREFIX MAPPING (sesuai instance):
//   4.xxxxx → Pendapatan (Revenue)
//   5.xxxxx → Beban Pokok Penjualan / COGS
//   6.xxxxx → Beban Umum & Administrasi / OpEx
//   7.xxxxx → Pendapatan Lain-Lain (Other Income)
//   8.xxxxx → Beban Lain-Lain (Other Expense)

// ════════════════════════════════════════════════════
// FETCH CHART OF ACCOUNTS by prefix
// ════════════════════════════════════════════════════

/**
 * Fetch ElementValue records filtered by searchKey prefix.
 * summaryLevel = false → hanya detail account (bukan header/group).
 * NOTE: instance ini pakai boolean native (true/false), bukan 'Y'/'N'
 */
export async function fetchElementsByPrefix(prefix) {
  const res = await api.get(
    '/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue',
    {
      params: {
        _where:    `e.active = true and e.searchKey like '${prefix}%' and e.summaryLevel = false`,
        _startRow: 0,
        _endRow:   2000,
        _orderBy:  'e.searchKey asc',
        _selectedProperties: 'id,searchKey,name,accountType,summaryLevel',
      },
    }
  )
  return res.data?.response?.data ?? []
}

// ════════════════════════════════════════════════════
// FETCH ACCOUNTING FACTS & BUILD PERIOD MAP
// ════════════════════════════════════════════════════

/**
 * Fetch semua FinancialMgmtAccountingFact untuk periode tertentu,
 * lalu aggregate menjadi Map<elementValueId, { debit, credit, net }>.
 *
 * net = debit - credit
 */
export async function fetchPeriodFactMap(startDate, endDate, {
  organization     = '',
  accountingSchema = '',
  postingType      = 'A',
} = {}) {
  if (!startDate || !endDate) return new Map()

  let where = `e.accountingDate >= '${startDate}' and e.accountingDate <= '${endDate}'`
  if (postingType)      where += ` and e.postingType = '${postingType}'`
  if (organization)     where += ` and e.organization.id = '${organization}'`
  if (accountingSchema) where += ` and e.accountingSchema.id = '${accountingSchema}'`

  const PAGE    = 5000
  let startRow  = 0
  let allFacts  = []

  while (true) {
    const res = await api.get(
      '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact',
      {
        params: {
          _where:    where,
          _startRow: startRow,
          _endRow:   startRow + PAGE,
          _orderBy:  'e.accountingDate asc',
          _selectedProperties: 'id,account,debit,credit,accountingDate,postingType',
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
      net:    prev.net    + (d - c),
    })
  }
  return map
}

// ════════════════════════════════════════════════════
// BUILD CATEGORY
// ════════════════════════════════════════════════════

/**
 * Build satu kategori P&L.
 * type 'revenue': amount = credit - debit (normal balance = credit)
 * type 'expense': amount = debit - credit (normal balance = debit)
 */
async function buildCategory(prefix, factMap, refMap, type) {
  const elements = await fetchElementsByPrefix(prefix)

  const lines = elements
    .map(el => {
      const facts    = factMap.get(el.id) ?? { debit: 0, credit: 0, net: 0 }
      const refFacts = refMap.get(el.id)  ?? { debit: 0, credit: 0, net: 0 }

      const amount    = type === 'revenue'
        ? (facts.credit  - facts.debit)
        : (facts.debit   - facts.credit)
      const refAmount = type === 'revenue'
        ? (refFacts.credit - refFacts.debit)
        : (refFacts.debit  - refFacts.credit)

      return {
        id:        el.id,
        searchKey: el.searchKey,
        name:      el.name || el.searchKey,
        debit:     facts.debit,
        credit:    facts.credit,
        amount,
        refAmount,
      }
    })
    .filter(l => l.debit !== 0 || l.credit !== 0 || l.refAmount !== 0)
    .sort((a, b) => a.searchKey.localeCompare(b.searchKey, undefined, { numeric: true }))

  const total    = lines.reduce((s, l) => s + l.amount,    0)
  const refTotal = lines.reduce((s, l) => s + l.refAmount, 0)

  return { prefix, lines, total, refTotal }
}

// ════════════════════════════════════════════════════
// BUILD FULL P&L REPORT
// ════════════════════════════════════════════════════

/**
 * Build laporan Profit & Loss lengkap.
 *
 * Struktur sesuai format ACCURATE:
 *   Pendapatan (prefix 4)
 *   - Jumlah Pendapatan
 *   Harga Pokok Penjualan (prefix 5)
 *   - Jumlah HPP
 *   LABA KOTOR = Pendapatan - HPP
 *   Beban Operasi (prefix 6)
 *   - Jumlah Beban Operasi
 *   PENDAPATAN OPERASI = Laba Kotor - Beban Operasi
 *   Pendapatan Lain (prefix 7)  → revenue
 *   Beban Lain (prefix 8)       → expense
 *   LABA BERSIH (Before Tax) = Pendapatan Operasi + PendLain - BebanLain
 *
 * @returns {object} {
 *   pendapatan, bpp, bebanOperasi,
 *   pendapatanLain, bebanLain,
 *   labaKotor,        refLabaKotor,
 *   pendapatanOperasi,refPendapatanOperasi,
 *   labaBersih,       refLabaBersih,
 * }
 */
export async function buildProfitLoss(startDate, endDate, refStartDate, refEndDate, opts = {}) {
  const [factMap, refMap] = await Promise.all([
    fetchPeriodFactMap(startDate, endDate, opts),
    refStartDate && refEndDate
      ? fetchPeriodFactMap(refStartDate, refEndDate, opts)
      : Promise.resolve(new Map()),
  ])

  const [pendapatan, bpp, bebanOperasi, pendapatanLain, bebanLain] = await Promise.all([
    buildCategory('4', factMap, refMap, 'revenue'),   // Pendapatan
    buildCategory('5', factMap, refMap, 'expense'),   // COGS / HPP
    buildCategory('6', factMap, refMap, 'expense'),   // Beban Operasi
    buildCategory('7', factMap, refMap, 'revenue'),   // Pendapatan Lain
    buildCategory('8', factMap, refMap, 'expense'),   // Beban Lain
  ])

  // Laba Kotor = Pendapatan - HPP
  const labaKotor    = pendapatan.total    - bpp.total
  const refLabaKotor = pendapatan.refTotal - bpp.refTotal

  // Pendapatan Operasi = Laba Kotor - Beban Operasi
  const pendapatanOperasi    = labaKotor    - bebanOperasi.total
  const refPendapatanOperasi = refLabaKotor - bebanOperasi.refTotal

  // Laba Bersih Before Tax = Pendapatan Operasi + Pend. Lain - Beban Lain
  const labaBersih    = pendapatanOperasi    + pendapatanLain.total    - bebanLain.total
  const refLabaBersih = refPendapatanOperasi + pendapatanLain.refTotal - bebanLain.refTotal

  return {
    pendapatan,
    bpp,
    bebanOperasi,
    pendapatanLain,
    bebanLain,
    labaKotor,
    refLabaKotor,
    pendapatanOperasi,
    refPendapatanOperasi,
    labaBersih,
    refLabaBersih,
  }
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════

export async function fetchOrganizations() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/Organization', {
    params: {
      _where:              `e.active = true`,
      _startRow:           0,
      _endRow:             100,
      _selectedProperties: 'id,name,searchKey',
      _orderBy:            'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchAccountingSchemas() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAcctSchema', {
    params: {
      _where:              `e.active = true`,
      _startRow:           0,
      _endRow:             50,
      _selectedProperties: 'id,name,currency',
      _orderBy:            'e.name asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function fetchFiscalPeriods() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPeriod', {
    params: {
      _where:              `e.active = true`,
      _startRow:           0,
      _endRow:             200,
      _selectedProperties: 'id,name,startingDate,endingDate,periodType,year,year$_identifier',
      _orderBy:            'e.startingDate desc',
    },
  })
  return res.data?.response?.data ?? []
}