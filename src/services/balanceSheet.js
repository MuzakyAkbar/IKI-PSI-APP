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
// BALANCE SHEET — Neraca (Laporan Posisi Keuangan)
//
// Persamaan Akuntansi: ASET = LIABILITAS + EKUITAS
//
// COA di-load dari API FinancialMgmtElementValue (bukan CSV).
// Mapping accountType dari API → Kategori Neraca:
//   'A' / 'Asset'          → balanceSheetType: 'asset'     (saldo normal: DEBIT)
//   'L' / 'Liability'      → balanceSheetType: 'liability' (saldo normal: KREDIT)
//   'O' / "Owner's Equity" → balanceSheetType: 'equity'    (saldo normal: KREDIT)
//
// Saldo kumulatif: accountingDate <= asOfDate (point-in-time),
// berbeda dengan P&L yang memakai range periode (startDate..endDate).
// ════════════════════════════════════════════════════

// ── Cache COA agar tidak fetch ulang setiap kali runSearch
let coaListCache = null

/**
 * Fetch Chart of Accounts dari API FinancialMgmtElementValue.
 * Hanya ambil akun dengan accountType Asset, Liability, Owner's Equity.
 * Hasil di-cache setelah pertama kali di-load.
 *
 * @returns {Promise<Array>} array of COA objects:
 *   { id, searchKey, name, description, elementLevel,
 *     accountType, summaryLevel, balanceSheetType }
 */
export async function fetchCoaList() {
  if (coaListCache) return coaListCache

  const PAGE = 2000
  let startRow = 0
  let allElements = []

  while (true) {
    const res = await api.get(
      '/org.openbravo.service.json.jsonrest/FinancialMgmtElementValue',
      {
        params: {
          // accountType: A=Asset, L=Liability, O=Owner's Equity
          // (Revenue=R, Expense=E — tidak dibutuhkan untuk Neraca)
          _where:    `e.active = true and (e.accountType = 'A' or e.accountType = 'L' or e.accountType = 'O')`,
          _startRow: startRow,
          _endRow:   startRow + PAGE,
          _orderBy:  'e.searchKey asc',
        },
      }
    )
    const data = res.data?.response?.data ?? []
    allElements = allElements.concat(data)
    if (data.length < PAGE) break
    startRow += PAGE
  }

  // Beberapa versi Openbravo mengembalikan kode huruf ('A','L','O'),
  // versi lain mengembalikan nama lengkap. Tangani keduanya.
  const typeMap = {
    'A':              'asset',
    'Asset':          'asset',
    'L':              'liability',
    'Liability':      'liability',
    'O':              'equity',
    "Owner's Equity": 'equity',
  }

  coaListCache = allElements
    .map(el => {
      const accountType      = (el.accountType || '').trim()
      const balanceSheetType = typeMap[accountType] ?? null
      if (!balanceSheetType) return null  // skip tipe lain (Revenue, Expense)

      const searchKey    = (el.searchKey || el.value || '').trim()
      // summaryLevel bisa berupa boolean true/false atau string 'true'/'false'
      const summaryLevel = el.summaryLevel === true || el.summaryLevel === 'true' ||
                           el.isSummaryAccount === true

      return {
        id:               el.id,
        searchKey,
        name:             (el.name || el['$_identifier'] || searchKey).trim(),
        description:      (el.description || '').trim(),
        elementLevel:     (el.elementLevel || el.accountingLevel || '').trim(),
        accountType,
        summaryLevel,
        balanceSheetType,
      }
    })
    .filter(Boolean)

  return coaListCache
}

/**
 * Invalidasi cache COA.
 * Panggil ini jika master Chart of Accounts berubah.
 */
export function clearCoaCache() {
  coaListCache = null
}

// ════════════════════════════════════════════════════
// BALANCE MAP — Saldo kumulatif s.d. asOfDate
// ════════════════════════════════════════════════════

/**
 * Fetch semua AccountingFact KUMULATIF s.d. asOfDate dengan paginasi.
 * Mengembalikan Map<searchKey, { debit, credit }>.
 * Key adalah searchKey (kode akun), di-join dengan COA dari fetchCoaList().
 *
 * @param {string} asOfDate  YYYY-MM-DD
 * @param {object} opts
 * @param {string} opts.organization
 * @param {string} opts.accountingSchema
 * @param {string} opts.postingType   default 'A' (Actual)
 * @returns {Promise<Map<string, { debit: number, credit: number }>>}
 */
export async function fetchBalanceMap(asOfDate, {
  organization = '',
  accountingSchema = '',
  postingType = 'A',
} = {}) {
  if (!asOfDate) return new Map()

  // Point-in-time: semua transaksi yang di-posting s.d. asOfDate
  let where = `e.active = true and e.accountingDate <= '${asOfDate}'`
  if (postingType)      where += ` and e.postingType = '${postingType}'`
  if (organization)     where += ` and e.organization.id = '${organization}'`
  if (accountingSchema) where += ` and e.accountingSchema.id = '${accountingSchema}'`

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

  // Agregasi per searchKey akun
  const map = new Map()
  for (const f of allFacts) {
    // Identifier dari Openbravo biasanya: "11010101 - Nama Akun"
    const rawIdentifier = f['account$_identifier'] || ''
    const searchKey =
      rawIdentifier.split(' - ')[0].trim() ||
      (typeof f.account === 'object' ? f.account?.value : '') ||
      ''

    if (!searchKey) continue

    const prev = map.get(searchKey) ?? { debit: 0, credit: 0 }
    map.set(searchKey, {
      debit:  prev.debit  + (Number(f.debit)  || 0),
      credit: prev.credit + (Number(f.credit) || 0),
    })
  }
  return map
}

// ════════════════════════════════════════════════════
// BUILD BALANCE SHEET STRUCTURE
// ════════════════════════════════════════════════════

/**
 * Hitung saldo natural sesuai tipe neraca.
 *   Aset (debit normal):          balance = debit - credit  (positif = ada aset)
 *   Liabilitas/Ekuitas (kredit):  balance = credit - debit  (positif = ada kewajiban/modal)
 */
function naturalBalance(facts, balanceSheetType) {
  if (!facts) return 0
  return balanceSheetType === 'asset'
    ? (facts.debit  - facts.credit)
    : (facts.credit - facts.debit)
}

/**
 * Build struktur Balance Sheet dari COA (API) + saldo AccountingFact.
 *
 * Pengelompokan:
 *   - summaryLevel = true  → group header (nama seksi, misalnya "CURRENT ASSETS")
 *   - summaryLevel = false → node/detail di dalam group terdekat di atasnya
 *
 * @param {Array}   coaList      hasil fetchCoaList()
 * @param {Map}     balMap       hasil fetchBalanceMap() untuk tanggal utama
 * @param {Map}     refBalMap    hasil fetchBalanceMap() untuk tanggal pembanding (boleh null/undefined)
 * @param {boolean} includeZero  true = tampilkan akun bersaldo 0
 *
 * @returns {Array} array of group objects:
 *   {
 *     id, searchKey, name, description, balanceSheetType,
 *     nodes: [{ id, searchKey, name, description, balanceSheetType, balance, refBalance }],
 *     total,    // jumlah saldo tanggal utama seluruh node
 *     refTotal  // jumlah saldo tanggal pembanding seluruh node
 *   }
 */
export function buildBalanceSheetFromCoa(coaList, balMap, refBalMap, includeZero = false) {
  const groups = []
  let currentGroup = null

  for (const coa of coaList) {
    if (coa.summaryLevel) {
      // Summary account → mulai group baru
      if (currentGroup) groups.push(currentGroup)
      currentGroup = {
        id:               coa.id || coa.searchKey,
        searchKey:        coa.searchKey,
        name:             coa.name,
        description:      coa.description,
        balanceSheetType: coa.balanceSheetType,
        nodes:            [],
        total:            0,
        refTotal:         0,
      }
    } else {
      // Detail account → masukkan ke group terdekat di atasnya
      if (!currentGroup) {
        // Fallback: group otomatis jika tidak ada summary di atasnya
        currentGroup = {
          id:               coa.searchKey.slice(0, 2) + '000000',
          searchKey:        coa.searchKey.slice(0, 2) + '000000',
          name:             coa.balanceSheetType === 'asset'
                              ? 'ASET LAINNYA'
                              : coa.balanceSheetType === 'liability'
                                ? 'LIABILITAS LAINNYA'
                                : 'EKUITAS LAINNYA',
          description:      '',
          balanceSheetType: coa.balanceSheetType,
          nodes:            [],
          total:            0,
          refTotal:         0,
        }
      }

      const facts    = balMap.get(coa.searchKey)
      const refFacts = refBalMap ? refBalMap.get(coa.searchKey) : null
      const balance    = naturalBalance(facts,    coa.balanceSheetType)
      const refBalance = naturalBalance(refFacts, coa.balanceSheetType)

      if (!includeZero && balance === 0 && refBalance === 0) continue

      currentGroup.nodes.push({
        id:               coa.id || coa.searchKey,
        searchKey:        coa.searchKey,
        name:             coa.name,
        description:      coa.description,
        balanceSheetType: coa.balanceSheetType,
        balance,
        refBalance,
      })
      currentGroup.total    += balance
      currentGroup.refTotal += refBalance
    }
  }

  // Simpan group terakhir
  if (currentGroup) groups.push(currentGroup)

  // Buang group tanpa node (kecuali includeZero aktif)
  return groups.filter(g => g.nodes.length > 0 || includeZero)
}

// ════════════════════════════════════════════════════
// LOOKUPS (shared dengan profitAndLoss.js)
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