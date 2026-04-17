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
// GL JOURNAL (Header)
// ════════════════════════════════════════════════════
const JOURNAL_BASE  = '/org.openbravo.service.json.jsonrest/FinancialMgmtGLJournal'
const JOURNAL_LINE_BASE = '/org.openbravo.service.json.jsonrest/FinancialMgmtGLJournalLine'
const FACT_BASE     = '/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingFact'

// GL Journal table ID di Openbravo (GL_Journal = table id 224)
const GL_JOURNAL_TABLE_ID = '224'

export async function fetchAllJournals({ startRow = 0, pageSize = 20, searchKey = '', sortCol = 'documentNo', sortDir = 'desc' } = {}) {
  let where = `e.active = true`
  if (searchKey.trim()) {
    const s = searchKey.trim().replace(/'/g, "''")
    where += ` and (upper(e.documentNo) like upper('%${s}%') or upper(e.description) like upper('%${s}%'))`
  }

  // 1. Format _sortBy (Standar DataSource Openbravo)
  let sortBy = (sortDir === 'desc' ? '-' : '') + sortCol
  if (sortCol !== 'documentNo') sortBy += ',-documentNo'

  // 2. Format _orderBy (Standar HQL Openbravo fallback)
  let orderBy = `e.${sortCol} ${sortDir}`
  if (sortCol !== 'documentNo') orderBy += `, e.documentNo desc`

  const res = await api.get(JOURNAL_BASE, {
    params: {
      _startRow:  startRow,
      _endRow:    startRow + pageSize,
      _noCount:   false,
      _sortBy:    sortBy,   // <--- Tambahkan untuk sorting dinamis
      _orderBy:   orderBy,  // <--- Timpa nilai statis sebelumnya
      _where:     where,
      _selectedProperties: 'id,documentNo,documentDate,description,documentStatus,posted,totalDebitAmount,totalCreditAmount,organization,organization$_identifier,currency,currency$_identifier',
    },
  })
  return res.data?.response ?? res.data
}

export async function fetchJournal(id) {
  const res = await api.get(`${JOURNAL_BASE}/${id}`)
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function createJournal(data) {
  const payload = buildJournalPayload(data)
  console.log('[createJournal] payload:', JSON.stringify({ _entityName: 'FinancialMgmtGLJournal', ...payload }, null, 2))
  const res = await api.post(JOURNAL_BASE, { data: { _entityName: 'FinancialMgmtGLJournal', ...payload } })
  console.log('[createJournal] response:', JSON.stringify(res.data, null, 2))
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateJournal(id, data) {
  const payload = buildJournalPayload(data)
  const res = await api.put(`${JOURNAL_BASE}/${id}`, { data: { id, _entityName: 'FinancialMgmtGLJournal', ...payload } })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteJournal(id) {
  const ex = await api.get(`${JOURNAL_BASE}/${id}`)
  const r = (ex.data?.response?.data ?? [])[0] ?? {}
  const res = await api.put(`${JOURNAL_BASE}/${id}`, {
    data: { id, _entityName: 'FinancialMgmtGLJournal', active: false, documentNo: r.documentNo },
  })
  return res.data?.response?.data ?? res.data
}

function buildJournalPayload(data) {
  const {
    organization, accountingSchema, documentType, documentNo, description,
    gLCategory, documentDate, accountingDate, period, currency,
    postingType, controlAmount,
  } = data

  return {
    ...(documentType     ? { documentType:     fkWrap(documentType) } : {}),
    currency: fkWrap(currency || '303'),
    postingType: postingType || 'A',
    ...(documentNo       && { documentNo }),
    ...(organization     && { organization:     fkWrap(organization) }),
    ...(accountingSchema && { accountingSchema: fkWrap(accountingSchema) }),
    ...(gLCategory       && { gLCategory:       fkWrap(gLCategory) }),
    ...(description      && { description }),
    ...(documentDate     && { documentDate, accountingDate: accountingDate || documentDate }),
    ...(accountingDate   && { accountingDate }),
    ...(period           && { period:           fkWrap(period) }),
    controlAmount: controlAmount ?? 0,
  }
}

// ════════════════════════════════════════════════════
// COMPLETE JOURNAL (DR → CO)
// PUT documentStatus=CO, documentAction=RE, processed=Y
// ════════════════════════════════════════════════════
export async function runJournalComplete(journalId, journalData) {
  if (journalData?.documentStatus !== 'DR') {
    throw new Error(`Journal sudah dalam status "${journalData?.documentStatus}", tidak bisa di-Complete.`)
  }

  const res = await api.put(`${JOURNAL_BASE}/${journalId}`, {
    data: {
      id:             journalId,
      _entityName:    'FinancialMgmtGLJournal',
      documentNo:     journalData.documentNo,
      documentStatus: 'CO',
      documentAction: 'RE',
      processed:      true,
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Complete Journal gagal.')
  }
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

// ════════════════════════════════════════════════════
// POST ACCOUNTING
// 1. Fetch journal lines
// 2. Insert FinancialMgmtAccountingFact per line
// 3. Set posted='Y' pada header
// ════════════════════════════════════════════════════
export async function postAccountingProcess(journalId, journalData) {
  if (journalData?.documentStatus !== 'CO') {
    throw new Error(`Journal harus berstatus Complete (CO) sebelum di-Post. Status saat ini: "${journalData?.documentStatus}"`)
  }

  const extractId = (v) => (v && typeof v === 'object') ? v.id : (v || null)

  // Step 1: fetch journal lines
  const linesRes = await api.get(JOURNAL_LINE_BASE, {
    params: {
      _where:   `e.journalEntry.id = '${journalId}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.lineNo asc',
    },
  })
  const lines = linesRes.data?.response?.data ?? []
  if (lines.length === 0) throw new Error('Tidak ada journal lines untuk di-post.')

  // Step 2: insert AccountingFact per line
  const orgId    = extractId(journalData.organization)
  const clientId = extractId(journalData.client) || '53AD31E21D624632B2F171194EC6E887'
  const schemaId = extractId(journalData.accountingSchema)
  const periodId = extractId(journalData.period)
  const curId    = extractId(journalData.currency) || '303'
  const catId    = extractId(journalData.gLCategory)
  const docTypeId = extractId(journalData.documentType)
  const accDate  = journalData.accountingDate || journalData.documentDate
  const txDate   = journalData.documentDate

  // generate groupID — pakai journalId sebagai base (consistent per journal)
  const groupID = journalId.replace(/-/g, '').slice(0, 32).toUpperCase()

  for (const line of lines) {
    const accCombId = extractId(line.accountingCombination)
    const lineNo    = line.lineNo ?? 10
    const debit     = Number(line.debit)  || 0
    const credit    = Number(line.credit) || 0
    const lineDesc  = line.description || journalData.description || ''

    // account_id is NOT NULL — fetch from FinancialMgmtAccountingCombination
    // Response field: "account": "6E331E426FBD4616964B8AAD945D9A0F" (string ID)
    if (!accCombId) throw new Error(`Line ${lineNo}: accountingCombination tidak ditemukan.`)

    // Fetch AccountingCombination — pakai _where agar response selalu array[data]
    const accRes = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
      params: { _where: `e.id = '${accCombId}'`, _startRow: 0, _endRow: 1 },
    })
    const accList   = accRes.data?.response?.data ?? []
    const accRecord = accList[0] ?? null
    // 'account' adalah string UUID langsung: "6E331E426FBD4616964B8AAD945D9A0F"
    const rawAccount = accRecord?.account
    const accountId  = !rawAccount
      ? null
      : typeof rawAccount === 'object'
        ? (rawAccount.id ?? null)
        : String(rawAccount).trim() || null
    if (!accountId) throw new Error(`Line ${lineNo}: field 'account' tidak ditemukan. accRecord = ${JSON.stringify(accRecord)}`)

    // value = account code (e.g. "12159900"), accountingEntryDescription = account name
    // dari account$_identifier: "12159900 - WIP - Other" → split by ' - '
    const accountIdentifier = accRecord?.['account$_identifier'] || ''
    const identifierParts   = accountIdentifier.split(' - ')
    const value                    = accRecord?.combination || accRecord?.alias || identifierParts[0] || ''
    const accountingEntryDescription = identifierParts.slice(1).join(' - ') || ''

    await api.post(FACT_BASE, {
      data: {
        _entityName:                 'FinancialMgmtAccountingFact',
        client:                      { id: clientId },
        organization:                { id: orgId },
        accountingSchema:            { id: schemaId },
        account:                     { id: accountId },
        accountingCombination:       { id: accCombId },
        transactionDate:             txDate,
        accountingDate:              accDate,
        ...(periodId               && { period:      { id: periodId } }),
        table:                       { id: GL_JOURNAL_TABLE_ID },
        recordID:                    journalId,
        lineID:                      line.id,
        ...(catId                  && { gLCategory:  { id: catId } }),
        postingType:                 journalData.postingType || 'A',
        currency:                    { id: curId },
        foreignCurrencyDebit:        debit,
        foreignCurrencyCredit:       credit,
        debit,
        credit,
        uOM:                         { id: '100' },
        quantity:                    0,
        description:                 `${journalData.documentNo} # ${lineNo} (${lineDesc})`,
        groupID,
        sequenceNumber:              lineNo,
        type:                        'N',
        documentCategory:            'GLJ',
        value,
        accountingEntryDescription,
        ...(docTypeId              && { documentType: { id: docTypeId } }),
        modify:                      false,
        active:                      true,
      },
    })
  }

  // Step 3: set posted='Y' pada header
  const res = await api.put(`${JOURNAL_BASE}/${journalId}`, {
    data: {
      id:          journalId,
      _entityName: 'FinancialMgmtGLJournal',
      documentNo:  journalData.documentNo,
      posted:      'Y',
    },
  })
  const status = res.data?.response?.status
  if (status !== undefined && status < 0) {
    throw new Error(res.data?.response?.error?.message || 'Post Journal gagal.')
  }
  return await fetchJournal(journalId)
}

// ════════════════════════════════════════════════════
// UNPOST — hapus AccountingFact rows, set posted=N
// Mengikuti pola unpostAccountingProcess di CustomerInvoice
// ════════════════════════════════════════════════════
export async function unpostAccountingProcess(journalId, journalData) {
  const isPosted = journalData?.posted === true || journalData?.posted === 'Y'
  if (!isPosted) {
    throw new Error(`Journal belum di-Post, tidak bisa di-Unpost.`)
  }

  // Step 1: ambil semua accounting facts untuk journal ini
  const factsRes = await api.get(FACT_BASE, {
    params: {
      _where: `e.recordID = '${journalId}' and e.table.id = '${GL_JOURNAL_TABLE_ID}'`,
      _startRow: 0,
      _endRow: 200,
    },
  })
  const facts = factsRes.data?.response?.data ?? []

  // Step 2: delete semua facts satu per satu
  await Promise.all(facts.map(f => api.delete(`${FACT_BASE}/${f.id}`)))

  // Step 3: set posted='N' pada journal
  const res = await api.put(`${JOURNAL_BASE}/${journalId}`, {
    data: {
      id:          journalId,
      _entityName: 'FinancialMgmtGLJournal',
      documentNo:  journalData.documentNo,
      posted:      'N',
    },
  })
  const st = res.data?.response?.status
  if (st !== undefined && st < 0) {
    throw new Error(res.data?.response?.error?.message || 'Unpost Journal gagal.')
  }
  return await fetchJournal(journalId)
}

// ════════════════════════════════════════════════════
// GL JOURNAL LINE
// ════════════════════════════════════════════════════

export async function fetchJournalLines(journalId) {
  const res = await api.get(JOURNAL_LINE_BASE, {
    params: {
      _where: `e.journalEntry.id = '${journalId}'`,
      _startRow: 0,
      _endRow: 200,
      _orderBy: 'e.lineNo asc',
    },
  })
  return res.data?.response?.data ?? []
}

export async function createJournalLine(journalId, data) {
  const { accountingCombination, currency, uOM, ...rest } = data
  const res = await api.post(JOURNAL_LINE_BASE, {
    data: {
      _entityName: 'FinancialMgmtGLJournalLine',
      journalEntry: { id: journalId },
      ...rest,
      ...(accountingCombination && { accountingCombination: fkWrap(accountingCombination) }),
      ...(currency              && { currency:              fkWrap(currency) }),
      ...(uOM                   && { uOM:                   fkWrap(uOM) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function updateJournalLine(id, data) {
  const { accountingCombination, currency, uOM, ...rest } = data
  const res = await api.put(`${JOURNAL_LINE_BASE}/${id}`, {
    data: {
      id,
      _entityName: 'FinancialMgmtGLJournalLine',
      ...rest,
      ...(accountingCombination && { accountingCombination: fkWrap(accountingCombination) }),
      ...(currency              && { currency:              fkWrap(currency) }),
      ...(uOM                   && { uOM:                   fkWrap(uOM) }),
    },
  })
  const raw = res.data?.response?.data
  return Array.isArray(raw) ? raw[0] : raw
}

export async function deleteJournalLine(id) {
  const res = await api.delete(`${JOURNAL_LINE_BASE}/${id}`)
  return res.data?.response?.data ?? res.data
}

// ════════════════════════════════════════════════════
// ACCOUNTING FACTS
// ════════════════════════════════════════════════════

export async function fetchAccountingFacts(journalId) {
  const res = await api.get(FACT_BASE, {
    params: {
      _where:   `e.recordID = '${journalId}' and e.table.id = '${GL_JOURNAL_TABLE_ID}'`,
      _startRow: 0,
      _endRow:   200,
      _orderBy:  'e.sequenceNumber asc',
    },
  })
  const data = res.data?.response?.data ?? []
  // sort client-side as extra safety
  return data.sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
}

// ════════════════════════════════════════════════════
// LOOKUPS
// ════════════════════════════════════════════════════

export async function fetchCurrentUser() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/ADUser', {
    params: { _startRow: 0, _endRow: 1, _where: `username = '${USERNAME}'` },
  })
  const data = res.data?.response?.data ?? []
  return data[0] ?? null
}

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

export async function fetchGLCategories() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtGLCategory', {
    params: { _startRow: 0, _endRow: 100, _where: `e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchDocumentTypes() {
  const res = await api.get('/org.openbravo.service.json.jsonrest/DocumentType', {
    params: { _startRow: 0, _endRow: 200, _where: `e.active = true` },
  })
  return res.data?.response?.data ?? []
}

export async function fetchPeriodByDate(dateStr) {
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtPeriod', {
    params: {
      _startRow: 0,
      _endRow: 1,
      _where: `e.active = true and e.startingDate <= '${dateStr}' and e.endingDate >= '${dateStr}'`,
    },
  })
  const data = res.data?.response?.data ?? []
  return data[0] ?? null
}

export async function fetchCurrencies(search = '') {
  let where = `e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and (upper(e.iSOCode) like upper('%${s}%') or upper(e.description) like upper('%${s}%'))`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/Currency', {
    params: { _where: where, _startRow: 0, _endRow: 50 },
  })
  return res.data?.response?.data ?? []
}

export async function fetchAccountingCombinations(search = '') {
  let where = `e.active = true`
  if (search.trim()) {
    const s = search.trim().replace(/'/g, "''")
    where += ` and upper(e.account.name) like upper('%${s}%')`
  }
  const res = await api.get('/org.openbravo.service.json.jsonrest/FinancialMgmtAccountingCombination', {
    params: { _where: where, _startRow: 0, _endRow: 50 },
  })
  return res.data?.response?.data ?? []
}

// ── Error interceptor
api.interceptors.response.use(
  (res) => {
    const s = res.data?.response?.status
    if (s !== undefined && s < 0) {
      console.error('[GL Journal API error]', JSON.stringify(res.data?.response))
      const msg = res.data?.response?.error?.message
      if (msg) throw new Error(msg)
    }
    return res
  },
  (err) => {
    console.error('[GL Journal HTTP error]', err.response?.status, JSON.stringify(err.response?.data))
    return Promise.reject(err)
  }
)