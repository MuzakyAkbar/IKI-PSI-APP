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
// ERROR INTERCEPTOR
// ════════════════════════════════════════════════════
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      const msg = res.data?.response?.error?.message
      if (msg) throw new Error(msg)
    }
    return res
  },
  (err) => {
    console.error('[FinancialAccount API error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)

// ════════════════════════════════════════════════════
// FIN_FINANCIAL_ACCOUNT
// ════════════════════════════════════════════════════
const FIN_ACC_BASE = '/org.openbravo.service.json.jsonrest/FIN_Financial_Account'

/**
 * Fetch semua financial account.
 */
export async function fetchFinancialAccounts() {
  const res = await api.get(FIN_ACC_BASE, {
    params: {
      _startRow: 0,
      _endRow:   100,
      _orderBy:  'e.name asc',
      _noCount:  false,
    },
  })
  return res.data?.response?.data ?? []
}

/**
 * Fetch satu financial account by ID.
 */
export async function fetchFinancialAccountById(id) {
  const res = await api.get(`${FIN_ACC_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// FIN_FINACC_TRANSACTION
// ════════════════════════════════════════════════════
const TXN_BASE = '/org.openbravo.service.json.jsonrest/FIN_Finacc_Transaction'

/**
 * Fetch transaksi untuk satu financial account dengan pagination & filter.
 *
 * @param {object} p
 * @param {string}  p.accountId       - FIN_Financial_Account.id
 * @param {number}  p.startRow
 * @param {number}  p.pageSize
 * @param {string}  [p.statusFilter]  - RPAP | RDNC | RPVD | RPAE | ''
 * @param {string}  [p.searchKey]     - free-text search
 */
export async function fetchFinaccTransactions({
  accountId,
  startRow  = 0,
  pageSize  = 20,
  statusFilter = '',
  searchKey    = '',
} = {}) {
  let where = `e.account.id = '${accountId}'`

  if (statusFilter) {
    where += ` and e.status = '${statusFilter}'`
  }

  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.finPayment$_identifier) like upper('%${s}%')`
            + ` or upper(e.businessPartner$_identifier) like upper('%${s}%')`
            + ` or upper(e.description) like upper('%${s}%'))`
  }

  const res = await api.get(TXN_BASE, {
    params: {
      _where:    where,
      _startRow: startRow,
      _endRow:   startRow + pageSize,
      _noCount:  false,
      _orderBy:  'e.transactionDate desc, e.lineNo asc',
    },
  })

  const resp = res.data?.response ?? {}
  return {
    data:      resp.data      ?? [],
    totalRows: resp.totalRows ?? resp.total ?? null,
    startRow:  resp.startRow  ?? startRow,
    endRow:    resp.endRow    ?? null,
  }
}

/**
 * Fetch satu transaksi by ID.
 */
export async function fetchFinaccTransactionById(id) {
  const res = await api.get(`${TXN_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// ACCOUNTING HISTORY — FinancialMgmtAccountingFact
// ════════════════════════════════════════════════════
//
// Entity   : FinancialMgmtAccountingFact
// Relasi   : e.recordID = FIN_Finacc_Transaction.id
//            e.table    = '4D8C3B3C31D1410DA046140C9F024D17'
//            (AD_Table.id untuk FIN_Finacc_Transaction — terlihat dari JSON response)
//
const ACCT_FACT_BASE          = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'
const FIN_FINACC_TXN_TABLE_ID = '4D8C3B3C31D1410DA046140C9F024D17'

/**
 * Fetch accounting fact entries untuk satu FIN_Finacc_Transaction.
 * Filter: recordID = txnId  AND  table = FIN_Finacc_Transaction's AD_Table.id
 *
 * @param {string} finaccTransactionId - FIN_Finacc_Transaction.id
 */
export async function fetchFinaccTransactionAcct(finaccTransactionId) {
  const res = await api.get(ACCT_FACT_BASE, {
    params: {
      _where:    `e.recordID = '${finaccTransactionId}' and e.table = '${FIN_FINACC_TXN_TABLE_ID}'`,
      _startRow: 0,
      _endRow:   50,
      _noCount:  false,
      _orderBy:  'e.debit desc, e.sequenceNumber asc',
    },
  })
  return res.data?.response?.data ?? []
}