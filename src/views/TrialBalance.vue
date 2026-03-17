<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Trial Balance</h2>
        </div>

        <!-- ══ FILTER PANEL ══ -->
        <div class="filter-panel">

          <div class="filter-section">
            <div class="filter-section-title">Primary Filters</div>
            <div class="filter-grid">
              <div class="filter-group">
                <label>From</label>
                <input :value="displayDate(filters.dateFrom)" class="form-input" placeholder="dd/mm/yyyy" maxlength="10" @input="onDateInput('dateFrom', $event)" @blur="onDateBlur('dateFrom', $event)" />
              </div>
              <div class="filter-group">
                <label>To</label>
                <input :value="displayDate(filters.dateTo)" class="form-input" placeholder="dd/mm/yyyy" maxlength="10" @input="onDateInput('dateTo', $event)" @blur="onDateBlur('dateTo', $event)" />
              </div>
              <div class="filter-group">
                <label>Organization</label>
                <select v-model="filters.organization" class="form-input">
                  <option value="">* (All)</option>
                  <option v-for="o in organizations" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </div>
              <div class="filter-group">
                <label>General Ledger</label>
                <select v-model="filters.accountingSchema" class="form-input">
                  <option value="">All</option>
                  <option v-for="s in accountingSchemas" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Advanced Filters -->
          <div class="filter-section">
            <div class="filter-section-title adv-toggle" @click="showAdvanced=!showAdvanced">
              Advanced Filters
              <svg :class="['adv-chevron', showAdvanced && 'adv-chevron--open']" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div v-if="showAdvanced" class="filter-grid" style="margin-top:12px">
              <div class="filter-group">
                <label>Include Zero Figures</label>
                <div class="check-row">
                  <input type="checkbox" v-model="filters.includeZero" class="checkbox" id="includeZero" />
                  <label for="includeZero" class="check-label">Show accounts with zero balance</label>
                </div>
              </div>
              <div class="filter-group">
                <label>Posting Type</label>
                <select v-model="filters.postingType" class="form-input">
                  <option value="A">Actual</option>
                  <option value="B">Budget</option>
                  <option value="E">Encumbrance</option>
                  <option value="S">Statistical</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="filter-actions">
            <button class="btn btn--search" :disabled="loading" @click="runSearch">
              <span v-if="loading" class="spinner"></span>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              {{ loading ? 'Loading...' : 'Search' }}
            </button>
            <button class="btn btn--ghost" @click="resetFilters">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
            <template v-if="searched && displayRows.length > 0">
              <div class="btn-sep"></div>
              <button class="btn btn--xlsx" :disabled="exporting==='xlsx'" @click="exportXlsx">
                <span v-if="exporting==='xlsx'" class="spinner spinner--dark"></span>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m8 13 3 3 3-3"/><path d="M11 16V11"/></svg>
                {{ exporting==='xlsx' ? 'Exporting...' : 'Export Excel' }}
              </button>
              <button class="btn btn--pdf" :disabled="exporting==='pdf'" @click="exportPdf">
                <span v-if="exporting==='pdf'" class="spinner spinner--dark"></span>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                {{ exporting==='pdf' ? 'Exporting...' : 'Export PDF' }}
              </button>
            </template>
          </div>

        </div>

        <!-- ══ ERROR ══ -->
        <div v-if="error" class="tb-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <!-- ══ RESULTS ══ -->
        <div v-if="searched">

          <!-- Summary cards -->
          <div class="summary-cards">
            <div class="summary-card">
              <span class="summary-label">Period</span>
              <span class="summary-value summary-value--period">{{ formatDate(filters.dateFrom) }} — {{ formatDate(filters.dateTo) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Total Debit</span>
              <span class="summary-value summary-value--debit">{{ formatCurrency(totals.debit) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Total Credit</span>
              <span class="summary-value summary-value--credit">{{ formatCurrency(totals.credit) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Net Activity</span>
              <span class="summary-value" :class="(totals.debit - totals.credit) >= 0 ? 'summary-value--debit' : 'summary-value--credit'">
                {{ formatCurrency(Math.abs(totals.debit - totals.credit)) }}
                <span class="net-badge">{{ (totals.debit - totals.credit) >= 0 ? 'Dr' : 'Cr' }}</span>
              </span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Accounts</span>
              <span class="summary-value">{{ displayRows.length }}</span>
            </div>
          </div>

          <!-- Table -->
          <div class="table-wrap">
            <table class="table tb-table" id="tb-table">
              <thead>
                <tr>
                  <th rowspan="2" class="tb-col-no">Account No.</th>
                  <th rowspan="2" class="tb-col-name">Name</th>
                  <th class="tb-col-bal-hdr">Balance As Of<br /><span class="tb-date-sub">{{ formatDate(filters.dateFrom) }}</span></th>
                  <th colspan="2" class="tb-col-act-hdr">Activity</th>
                  <th class="tb-col-bal-hdr">Balance As Of<br /><span class="tb-date-sub">{{ formatDate(filters.dateTo) }}</span></th>
                </tr>
                <tr>
                  <th class="tb-num tb-sub-hdr"></th>
                  <th class="tb-num tb-sub-hdr">Debit</th>
                  <th class="tb-num tb-sub-hdr">Credit</th>
                  <th class="tb-num tb-sub-hdr"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="6" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td>
                </tr>
                <tr v-else-if="displayRows.length === 0">
                  <td colspan="6" class="td-empty">No data found for the selected period.</td>
                </tr>
                <template v-else>
                  <tr v-for="row in displayRows" :key="row.accountNo" class="tr-data">
                    <td><span class="acc-code">{{ row.accountNo }}</span></td>
                    <td class="tb-name">{{ row.accountName }}</td>
                    <td class="tb-num" :class="row.openingBalance !== 0 ? 'tb-debit' : ''">{{ fmt(row.openingBalance) }}</td>
                    <td class="tb-num tb-debit">{{ fmt(row.debit) }}</td>
                    <td class="tb-num tb-credit">{{ fmt(row.credit) }}</td>
                    <td class="tb-num" :class="row.closingBalance !== 0 ? 'tb-debit' : ''">{{ fmt(row.closingBalance) }}</td>
                  </tr>
                </template>
              </tbody>
              <tfoot v-if="displayRows.length > 0">
                <tr class="tb-totals">
                  <td colspan="2" class="tb-totals-label">Totals</td>
                  <td class="tb-num tb-debit">{{ fmt(totals.openingBalance) }}</td>
                  <td class="tb-num tb-debit">{{ fmt(totals.debit) }}</td>
                  <td class="tb-num tb-credit">{{ fmt(totals.credit) }}</td>
                  <td class="tb-num tb-debit">{{ fmt(totals.closingBalance) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!loading" class="tb-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:#cbd5e1;margin:0 auto 12px;display:block"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <p>Set the date range and click <strong>Search</strong> to view the trial balance.</p>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  fetchAccountingFacts, fetchOpeningFacts, aggregateTrialBalance,
  fetchOrganizations, fetchAccountingSchemas,
} from '@/services/trialBalance.js'

// ── lookups
const organizations     = ref([])
const accountingSchemas = ref([])

// ── filters
const today    = () => new Date().toISOString().slice(0, 10)
const firstDOM = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
const defaultFilters = () => ({
  dateFrom: firstDOM(), dateTo: today(),
  organization: '', accountingSchema: '',
  postingType: 'A', includeZero: false,
})
const filters      = ref(defaultFilters())
const showAdvanced = ref(false)

// ── state
const loading   = ref(false)
const error     = ref('')
const searched  = ref(false)
const rows      = ref([])
const exporting = ref('')   // 'xlsx' | 'pdf' | ''

// ── display rows
const displayRows = computed(() => {
  if (filters.value.includeZero) return rows.value
  return rows.value.filter(r =>
    r.openingBalance !== 0 || r.debit !== 0 || r.credit !== 0 || r.closingBalance !== 0
  )
})

// ── totals
const totals = computed(() => displayRows.value.reduce((acc, r) => {
  acc.openingBalance += r.openingBalance
  acc.debit          += r.debit
  acc.credit         += r.credit
  acc.closingBalance += r.closingBalance
  return acc
}, { openingBalance: 0, debit: 0, credit: 0, closingBalance: 0 }))

// ── helpers
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatCurrency(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)
}
// fmt: always show numeric, never dash — 0 shows as "0.00"
function fmt(v) {
  const n = Number(v) || 0
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
// raw number for export
function num(v) { return Number(v) || 0 }

// ── date input helpers (dd/mm/yyyy masking)
// internal value selalu YYYY-MM-DD, display dd/mm/yyyy
function displayDate(isoVal) {
  if (!isoVal) return ''
  const [y, m, d] = isoVal.split('-')
  return `${d}/${m}/${y}`
}
function parseDisplay(val) {
  // accept dd/mm/yyyy or dd-mm-yyyy
  const clean = val.replace(/[-\.]/g, '/')
  const parts  = clean.split('/')
  if (parts.length !== 3) return ''
  const [d, m, y] = parts
  if (!d || !m || !y || y.length !== 4) return ''
  const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  if (isNaN(new Date(iso).getTime())) return ''
  return iso
}
function onDateInput(field, e) {
  let v = e.target.value.replace(/[^\d/]/g, '')
  // auto-insert slashes
  if (v.length === 2 && !v.includes('/')) v += '/'
  if (v.length === 5 && v.split('/').length === 2) v += '/'
  e.target.value = v
}
function onDateBlur(field, e) {
  const iso = parseDisplay(e.target.value)
  if (iso) filters.value[field] = iso
  else e.target.value = displayDate(filters.value[field])
}

// ── search
async function runSearch() {
  if (!filters.value.dateFrom || !filters.value.dateTo) {
    error.value = 'Tanggal From dan To wajib diisi.'
    return
  }
  loading.value = true; error.value = ''; searched.value = true
  try {
    const [opening, activity] = await Promise.all([
      fetchOpeningFacts({
        dateFrom: filters.value.dateFrom,
        organization: filters.value.organization,
        accountingSchema: filters.value.accountingSchema,
        postingType: filters.value.postingType,
      }),
      fetchAccountingFacts({
        dateFrom: filters.value.dateFrom,
        dateTo: filters.value.dateTo,
        organization: filters.value.organization,
        accountingSchema: filters.value.accountingSchema,
        postingType: filters.value.postingType,
      }),
    ])
    rows.value = aggregateTrialBalance(opening, activity)
  } catch (e) {
    error.value = e?.response?.data?.response?.error?.message || e.message
    rows.value  = []
  } finally { loading.value = false }
}

function resetFilters() {
  filters.value = defaultFilters(); rows.value = []; searched.value = false; error.value = ''
}

// ════════════════════════════════════════════════════
// EXPORT XLSX — SheetJS (xlsx via CDN)
// ════════════════════════════════════════════════════
async function exportXlsx() {
  exporting.value = 'xlsx'
  try {
    // dynamic import SheetJS from CDN
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')

    const schemaName = accountingSchemas.value.find(s => s.id === filters.value.accountingSchema)?.name || 'All'
    const orgName    = organizations.value.find(o => o.id === filters.value.organization)?.name || 'All'

    // Header info rows
    const info = [
      ['Trial Balance'],
      [`Period: ${formatDate(filters.value.dateFrom)} - ${formatDate(filters.value.dateTo)}`],
      [`General Ledger: ${schemaName}`, '', `Organization: ${orgName}`],
      [],
      ['Account No.', 'Name',
       `Balance As Of ${formatDate(filters.value.dateFrom)}`,
       'Debit', 'Credit',
       `Balance As Of ${formatDate(filters.value.dateTo)}`],
    ]

    // Data rows
    const data = displayRows.value.map(r => [
      r.accountNo,
      r.accountName,
      num(r.openingBalance),
      num(r.debit),
      num(r.credit),
      num(r.closingBalance),
    ])

    // Totals row
    const tot = [
      'Totals', '',
      num(totals.value.openingBalance),
      num(totals.value.debit),
      num(totals.value.credit),
      num(totals.value.closingBalance),
    ]

    const sheetData = [...info, ...data, [], tot]
    const ws = XLSX.utils.aoa_to_sheet(sheetData)

    // Column widths
    ws['!cols'] = [
      { wch: 14 }, { wch: 36 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance')

    const filename = `TrialBalance_${filters.value.dateFrom}_${filters.value.dateTo}.xlsx`
    XLSX.writeFile(wb, filename)
  } catch (e) {
    alert('Export Excel gagal: ' + e.message)
  } finally { exporting.value = '' }
}

// ════════════════════════════════════════════════════
// EXPORT PDF — jsPDF + jsPDF-AutoTable
// ════════════════════════════════════════════════════
// load UMD script dynamically (avoids @babel/runtime ES module issue)
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

async function exportPdf() {
  exporting.value = 'pdf'
  try {
    // Load UMD builds — no @babel/runtime dependency
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js')
    const { jsPDF } = window.jspdf
    const autoTable = (doc, opts) => doc.autoTable(opts)

    const schemaName = accountingSchemas.value.find(s => s.id === filters.value.accountingSchema)?.name || 'All'
    const orgName    = organizations.value.find(o => o.id === filters.value.organization)?.name || 'All'

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Trial Balance', 14, 16)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Period : ${formatDate(filters.value.dateFrom)} – ${formatDate(filters.value.dateTo)}`, 14, 23)
    doc.text(`General Ledger : ${schemaName}     Organization : ${orgName}`, 14, 28)

    const dateFromLabel = formatDate(filters.value.dateFrom)
    const dateToLabel   = formatDate(filters.value.dateTo)

    const head = [[
      'Account No.', 'Name',
      `Balance As Of\n${dateFromLabel}`,
      'Debit', 'Credit',
      `Balance As Of\n${dateToLabel}`,
    ]]

    const body = displayRows.value.map(r => [
      r.accountNo,
      r.accountName,
      fmt(r.openingBalance),
      fmt(r.debit),
      fmt(r.credit),
      fmt(r.closingBalance),
    ])

    // Totals row
    body.push([
      { content: 'Totals', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt(totals.value.openingBalance), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmt(totals.value.debit),          styles: { fontStyle: 'bold', halign: 'right', textColor: [29, 78, 216] } },
      { content: fmt(totals.value.credit),         styles: { fontStyle: 'bold', halign: 'right', textColor: [21, 128, 61] } },
      { content: fmt(totals.value.closingBalance), styles: { fontStyle: 'bold', halign: 'right' } },
    ])

    autoTable(doc, {
      head,
      body,
      startY: 33,
      styles:      { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
      headStyles:  { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'left',  cellWidth: 24 },
        1: { halign: 'left',  cellWidth: 70 },
        2: { halign: 'right', cellWidth: 38 },
        3: { halign: 'right', cellWidth: 38 },
        4: { halign: 'right', cellWidth: 38 },
        5: { halign: 'right', cellWidth: 38 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        // colour debit blue, credit green in body
        if (data.section === 'body' && data.column.index === 3) data.cell.styles.textColor = [29, 78, 216]
        if (data.section === 'body' && data.column.index === 4) data.cell.styles.textColor = [21, 128, 61]
      },
    })

    // Page numbers
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
    }

    const filename = `TrialBalance_${filters.value.dateFrom}_${filters.value.dateTo}.pdf`
    doc.save(filename)
  } catch (e) {
    alert('Export PDF gagal: ' + e.message)
    console.error(e)
  } finally { exporting.value = '' }
}

// ── load lookups
async function loadLookups() {
  const [org, schema] = await Promise.allSettled([fetchOrganizations(), fetchAccountingSchemas()])
  organizations.value     = org.value    ?? []
  accountingSchemas.value = schema.value ?? []
  if (accountingSchemas.value.length === 1) filters.value.accountingSchema = accountingSchemas.value[0].id
}

onMounted(loadLookups)
</script>

<style scoped>
:root {
  --font: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --accent: #2563eb; --accent-light: #eff6ff;
  --danger: #dc2626; --bg: #f1f5f9;
  --surface: #fff; --surface2: #f8fafc;
  --border: #e2e8f0; --text-primary: #0f172a;
  --text-secondary: #475569; --text-muted: #94a3b8;
  --radius: 12px; --radius-sm: 7px;
  --shadow-md: 0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}

.layout { display: flex; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); overflow: hidden; }
.page-header { padding: 20px 20px 0; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }

/* Filter */
.filter-panel { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; }
.filter-section { display: flex; flex-direction: column; gap: 10px; }
.filter-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); padding: 6px 10px; background: var(--surface2); border-radius: var(--radius-sm); border-left: 3px solid var(--accent); }
.adv-toggle { cursor: pointer; display: flex; align-items: center; gap: 6px; user-select: none; }
.adv-chevron { transition: transform .2s; }
.adv-chevron--open { transform: rotate(180deg); }
.filter-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.filter-group { display: flex; flex-direction: column; gap: 5px; }
.filter-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.check-row { display: flex; align-items: center; gap: 8px; height: 36px; }
.check-label { font-size: 13px; color: var(--text-secondary); font-weight: 400; cursor: pointer; }
.checkbox { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

/* Buttons */
.filter-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding-top: 4px; }
.btn-sep { width: 1px; height: 28px; background: var(--border); margin: 0 4px; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 38px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; font-family: var(--font); white-space: nowrap; }
.btn--search { background: var(--accent); color: #fff; }
.btn--search:hover { background: #1d4ed8; }
.btn--search:disabled { opacity: .6; cursor: not-allowed; }
.btn--ghost { background: var(--surface2); color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover { background: var(--border); }
.btn--xlsx { background: #16a34a; color: #fff; }
.btn--xlsx:hover { background: #15803d; }
.btn--xlsx:disabled { opacity: .6; cursor: not-allowed; }
.btn--pdf { background: #dc2626; color: #fff; }
.btn--pdf:hover { background: #b91c1c; }
.btn--pdf:disabled { opacity: .6; cursor: not-allowed; }

/* Error */
.tb-error { margin: 16px 20px 0; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

/* Summary */
.summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1px solid var(--border); }
.summary-card { padding: 14px 20px; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
.summary-card:last-child { border-right: none; }
.summary-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.summary-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.summary-value--period { font-size: 13px; }
.summary-value--debit  { color: #1d4ed8; }
.summary-value--credit { color: #15803d; }
.net-badge { font-size: 11px; font-weight: 500; opacity: .7; margin-left: 3px; }

/* Table */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.tb-table thead th { background: var(--surface2); border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); padding: 10px 14px; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); white-space: nowrap; }
.tb-table thead th:last-child { border-right: none; }
.tb-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); vertical-align: middle; }
.tb-table td:last-child { border-right: none; }
.tb-table tr:last-child td { border-bottom: none; }
.tr-data:hover td { background: #f8fafc; }

.tb-col-no       { text-align: left; min-width: 120px; }
.tb-col-name     { text-align: left; }
.tb-col-bal-hdr  { text-align: center; min-width: 150px; line-height: 1.4; }
.tb-col-act-hdr  { text-align: center; }
.tb-date-sub     { font-size: 10.5px; font-weight: 500; opacity: .75; }
.tb-sub-hdr      { text-align: right; background: #f1f5f9; }
.tb-num          { text-align: right; font-family: var(--font-mono); font-size: 12.5px; white-space: nowrap; min-width: 130px; }
.tb-name         { font-weight: 500; color: var(--text-primary); }
.tb-debit        { color: #1d4ed8; }
.tb-credit       { color: #15803d; }
.acc-code        { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); padding: 2px 8px; border-radius: 5px; }
.tb-totals { background: var(--surface2); border-top: 2px solid var(--border); }
.tb-totals td { font-weight: 700; font-size: 13px; padding: 12px 14px; border-bottom: none !important; }
.tb-totals-label { text-align: right; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }

/* Empty */
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.tb-empty-state { padding: 56px 24px; text-align: center; color: var(--text-muted); font-size: 13.5px; line-height: 1.6; }
.tb-empty-state strong { color: var(--text-secondary); }

/* Loading */
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

/* Spinner */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.spinner--dark { border-color: rgba(0,0,0,.12); border-top-color: currentColor; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .filter-grid { grid-template-columns: 1fr 1fr; }
  .summary-cards { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .filter-grid { grid-template-columns: 1fr; }
  .summary-cards { grid-template-columns: 1fr 1fr; }
}
</style>