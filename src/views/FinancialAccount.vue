<template>
  <div class="layout">
    <main class="main">

      <!-- ══ FINANCIAL ACCOUNT LIST ══ -->
      <div class="content-card">
        <div class="page-header">
          <div class="page-header-inner">
            <div>
              <h2 class="page-title">Financial Account</h2>
            </div>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search account name..." @input="onSearch" />
          </div>
        </div>

        <!-- Account Table -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>Name</th>
              <th>Type</th>
              <th>Currency</th>
              <th>Organization</th>
              <th style="text-align:right">Current Balance</th>
              <th style="text-align:right">Initial Balance</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="filteredAccounts.length === 0"><td colspan="7" class="td-empty">No financial accounts found.</td></tr>
              <template v-else>
                <tr v-for="acc in filteredAccounts" :key="acc.id" class="tr-data" :class="{ 'tr-selected': selectedAccount?.id === acc.id }" @click="selectAccount(acc)">
                  <td>
                    <div class="acc-name-cell">
                      <div class="acc-icon" :class="accIconClass(acc.type)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                        </svg>
                      </div>
                      <div>
                        <div class="acc-name">{{ acc.name }}</div>
                        <div v-if="acc.description" class="acc-desc">{{ acc.description }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span :class="['type-badge', accTypeClass(acc.type)]">{{ accTypeLabel(acc.type) }}</span></td>
                  <td class="td-secondary">{{ acc['currency$_identifier'] || acc.currency || '—' }}</td>
                  <td class="td-secondary">{{ acc['organization$_identifier'] || '—' }}</td>
                  <td style="text-align:right">
                    <span class="balance-val" :class="Number(acc.currentBalance) >= 0 ? 'balance-pos' : 'balance-neg'">
                      {{ formatCurrency(acc.currentBalance, acc['currency$_identifier']) }}
                    </span>
                  </td>
                  <td class="td-secondary" style="text-align:right">{{ formatCurrency(acc.initialBalance, acc['currency$_identifier']) }}</td>
                  <td class="td-action-cell">
                    <button class="btn btn--sm btn--ghost" @click.stop="selectAccount(acc)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                      Lihat Transaksi
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ TRANSACTION PANEL (muncul saat akun dipilih) ══ -->
      <transition name="slide-up">
        <div v-if="selectedAccount" class="content-card" style="margin-top:20px">

          <!-- Panel Header -->
          <div class="panel-header">
            <div class="panel-header-left">
              <button class="btn-back" @click="clearSelection">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div>
                <div class="panel-breadcrumb">
                  <span class="bc-link" @click="clearSelection">Financial Account</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  <span class="bc-active">{{ selectedAccount.name }}</span>
                </div>
                <h3 class="panel-title">{{ selectedAccount.name }}</h3>
              </div>
            </div>

            <!-- Balance Summary Bar -->
            <div class="balance-bar">
              <div class="balance-bar-item">
                <span class="balance-bar-label">Current Balance</span>
                <span class="balance-bar-val balance-pos">{{ formatCurrency(selectedAccount.currentBalance, selectedAccount['currency$_identifier']) }}</span>
              </div>
              <div class="balance-bar-sep"></div>
              <div class="balance-bar-item">
                <span class="balance-bar-label">Currency</span>
                <span class="balance-bar-val">{{ selectedAccount['currency$_identifier'] || '—' }}</span>
              </div>
              <div class="balance-bar-sep"></div>
              <div class="balance-bar-item">
                <span class="balance-bar-label">Type</span>
                <span :class="['type-badge', accTypeClass(selectedAccount.type)]">{{ accTypeLabel(selectedAccount.type) }}</span>
              </div>
            </div>
          </div>

          <!-- Transaction Toolbar -->
          <div class="toolbar" style="border-top:0">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="search-wrap">
                <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input v-model="txnSearch" class="search-input" placeholder="Search payment, partner..." @input="onTxnSearch" />
              </div>
              <select v-model="txnStatusFilter" class="filter-select" @change="loadTransactions">
                <option value="">All Status</option>
                <option value="RDNC">Deposited Not Cleared</option>
                <option value="RPAP">Awaiting Payment</option>
                <option value="RPVD">Payment Voided</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="txn-count-badge">{{ txnTotalRows }} transaksi</span>
              <button class="btn btn--ghost btn--sm" @click="loadTransactions" :disabled="txnLoading">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.71"/></svg>
                Refresh
              </button>
            </div>
          </div>

          <!-- Transaction Table -->
          <div class="table-wrap">
            <table class="table">
              <thead><tr>
                <th>Transaction Type</th>
                <th>Payment</th>
                <th>Transaction Date</th>
                <th>Business Partner</th>
                <th>Payment No.</th>
                <th>Description</th>
                <th style="text-align:right">Deposit</th>
                <th style="text-align:right">Payment Amount</th>
                <th>Status</th>
                <th class="th-action">Action</th>
              </tr></thead>
              <tbody>
                <tr v-if="txnLoading"><td colspan="10" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="txnError"><td colspan="10" class="td-empty td-error">{{ txnError }}</td></tr>
                <tr v-else-if="transactions.length === 0"><td colspan="10" class="td-empty">No transactions found for this account.</td></tr>
                <template v-else>
                  <tr v-for="txn in transactions" :key="txn.id" class="tr-data">
                    <td>
                      <span :class="['txn-type-badge', txnTypeClass(txn.transactionType)]">
                        {{ txnTypeLabel(txn.transactionType) }}
                      </span>
                    </td>
                    <td class="td-secondary td-clip" style="max-width:180px">{{ txnPaymentLabel(txn) }}</td>
                    <td class="td-secondary">{{ formatDate(txn.transactionDate) }}</td>
                    <td class="td-secondary">{{ bpName(txn['businessPartner$_identifier']) }}</td>
                    <td><span v-if="paymentNo(txn)" class="code-badge">{{ paymentNo(txn) }}</span><span v-else class="td-secondary">—</span></td>
                    <td class="td-secondary td-clip" style="max-width:200px">{{ txn.description || '—' }}</td>
                    <td style="text-align:right">
                      <span v-if="Number(txn.depositAmount) > 0" class="amount-in">+{{ formatCurrency(txn.depositAmount) }}</span>
                      <span v-else class="td-secondary">—</span>
                    </td>
                    <td style="text-align:right">
                      <span v-if="Number(txn.paymentAmount) > 0" class="amount-out">-{{ formatCurrency(txn.paymentAmount) }}</span>
                      <span v-else class="td-secondary">—</span>
                    </td>
                    <td><span :class="['status-pill', txnStatusClass(txn.status)]">{{ txnStatusLabel(txn.status) }}</span></td>
                    <td class="td-action-cell">
                      <button class="action-btn action-btn--view" @click="openTxnDetail(txn)" title="View Detail">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Transaction Totals -->
          <div v-if="transactions.length > 0" class="txn-totals">
            <div class="txn-totals-inner">
              <div class="totals-row">
                <span>Total Deposit</span>
                <span class="amount-in">+{{ formatCurrency(totalDeposit) }}</span>
              </div>
              <div class="totals-row">
                <span>Total Payment</span>
                <span class="amount-out">-{{ formatCurrency(totalPaymentAmt) }}</span>
              </div>
              <div class="totals-row totals-row--grand">
                <span>Net</span>
                <span :class="(totalDeposit - totalPaymentAmt) >= 0 ? 'amount-in' : 'amount-out'">
                  {{ (totalDeposit - totalPaymentAmt) >= 0 ? '+' : '' }}{{ formatCurrency(totalDeposit - totalPaymentAmt) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="txnTotalPages > 1 || txnCurrentPage > 1" class="pagination">
            <button class="page-btn" :disabled="txnCurrentPage === 1 || txnLoading" @click="txnGoPage(txnCurrentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <template v-for="p in txnPageNumbers" :key="String(p)">
              <span v-if="p === '...'" class="page-ellipsis">…</span>
              <button v-else :class="['page-btn', Number(p) === txnCurrentPage ? 'page-btn--active' : '']" :disabled="txnLoading" @click="txnGoPage(Number(p))">{{ p }}</button>
            </template>
            <button class="page-btn" :disabled="txnCurrentPage >= txnTotalPages || txnLoading" @click="txnGoPage(txnCurrentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

        </div>
      </transition>
    </main>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- TRANSACTION DETAIL MODAL                               -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showDetailModal" class="modal-overlay" @mousedown.self="showDetailModal = false">
        <div class="modal modal--lg">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Financial Account</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>{{ selectedAccount?.name }}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Transaction Detail</span>
              </div>
              <div class="modal-title">Transaction — {{ paymentNo(detailTxn) || detailTxn?.id?.slice(0,8) }}</div>
            </div>
            <button class="modal-close" @click="showDetailModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Status bar -->
          <div class="pay-statusbar" v-if="detailTxn">
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Status:</span>
              <span :class="['pay-statusbar-val pay-statusbar-val--status', txnStatusClass(detailTxn.status)]">{{ txnStatusLabel(detailTxn.status) }}</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Posted:</span>
              <span class="pay-statusbar-val">{{ detailTxn.posted === 'Y' ? 'Yes' : 'No' }}</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Processed:</span>
              <span class="pay-statusbar-val">{{ detailTxn.processed ? 'Yes' : 'No' }}</span>
            </span>
          </div>

          <div class="modal-body" v-if="detailTxn">
            <!-- Detail grid -->
            <div class="detail-section-title">Transaction Info</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Transaction Type</span>
                <span class="detail-value"><span :class="['txn-type-badge', txnTypeClass(detailTxn.transactionType)]">{{ txnTypeLabel(detailTxn.transactionType) }}</span></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Transaction Date</span>
                <span class="detail-value">{{ formatDate(detailTxn.transactionDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Accounting Date</span>
                <span class="detail-value">{{ formatDate(detailTxn.dateAcct) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Line No.</span>
                <span class="detail-value mono">{{ detailTxn.lineNo || '—' }}</span>
              </div>

              <div class="detail-item detail-item--full">
                <span class="detail-label">Payment</span>
                <span class="detail-value mono">{{ detailTxn['finPayment$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Business Partner</span>
                <span class="detail-value">{{ detailTxn['businessPartner$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Organization</span>
                <span class="detail-value">{{ detailTxn['organization$_identifier'] || '—' }}</span>
              </div>
            </div>

            <div class="detail-section-title" style="margin-top:20px">Amount</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Deposit Amount</span>
                <span class="detail-value" style="font-size:16px;font-weight:700" :class="Number(detailTxn.depositAmount) > 0 ? 'amount-in' : ''">
                  {{ formatCurrency(detailTxn.depositAmount) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Payment Amount</span>
                <span class="detail-value" style="font-size:16px;font-weight:700" :class="Number(detailTxn.paymentAmount) > 0 ? 'amount-out' : ''">
                  {{ formatCurrency(detailTxn.paymentAmount) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Currency</span>
                <span class="detail-value">{{ detailTxn['currency$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Financial Account</span>
                <span class="detail-value">{{ detailTxn['account$_identifier'] || '—' }}</span>
              </div>
            </div>

            <div class="detail-section-title" style="margin-top:20px">Additional Info</div>
            <div class="detail-grid">
              <div class="detail-item detail-item--full">
                <span class="detail-label">Description</span>
                <span class="detail-value">{{ detailTxn.description || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created By</span>
                <span class="detail-value">{{ detailTxn['createdBy$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created Date</span>
                <span class="detail-value">{{ formatDateTime(detailTxn.creationDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Updated By</span>
                <span class="detail-value">{{ detailTxn['updatedBy$_identifier'] || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Last Updated</span>
                <span class="detail-value">{{ formatDateTime(detailTxn.updated) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Reconciliation</span>
                <span class="detail-value">{{ detailTxn.reconciliation || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">G/L Item</span>
                <span class="detail-value">{{ detailTxn.gLItem || '—' }}</span>
              </div>
            </div>

            <!-- ── Accounting History (hanya jika posted & processed) -->
            <template v-if="detailTxn.posted === 'Y' && detailTxn.processed">
              <div class="detail-section-title" style="margin-top:24px;display:flex;align-items:center;gap:8px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Accounting History
              </div>

              <!-- Loading -->
              <div v-if="acctLoading" class="acct-loading">
                <div class="loading-dots"><span></span><span></span><span></span></div>
              </div>

              <!-- Error -->
              <div v-else-if="acctError" class="acct-empty acct-error">{{ acctError }}</div>

              <!-- Empty -->
              <div v-else-if="acctHistory.length === 0" class="acct-empty">Tidak ada accounting entry ditemukan.</div>

              <!-- Table -->
              <div v-else class="acct-table-wrap">
                <table class="acct-table">
                  <thead>
                    <tr>
                      <th>General Ledger</th>
                      <th>Accounting Date</th>
                      <th>Account Element</th>
                      <th style="text-align:right">Debit</th>
                      <th style="text-align:right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(entry, idx) in acctHistory" :key="entry.id || idx">
                      <td class="td-secondary">{{ entry['accountingSchema$_identifier'] || entry['generalLedger$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ formatDate(entry.accountingDate) }}</td>
                      <td>
                        <span class="acct-element">
                          {{ entry['account$_identifier'] || entry['accountElement$_identifier'] || '—' }}
                        </span>
                      </td>
                      <td style="text-align:right">
                        <span v-if="Number(entry.debit) > 0" class="amount-in">{{ formatCurrency(entry.debit) }}</span>
                        <span v-else class="td-secondary">0</span>
                      </td>
                      <td style="text-align:right">
                        <span v-if="Number(entry.credit) > 0" class="amount-out">{{ formatCurrency(entry.credit) }}</span>
                        <span v-else class="td-secondary">0</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDetailModal = false">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="fade">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path v-if="toast.type === 'success'" d="M20 6 9 17l-5-5"/>
          <path v-else d="M18 6 6 18M6 6l12 12"/>
        </svg>
        {{ toast.message }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  fetchFinancialAccounts,
  fetchFinaccTransactions,
  fetchFinaccTransactionAcct,
} from '@/services/financialAccount.js'

const PAGE_SIZE = 20

// ── account list state
const accounts         = ref([])
const loading          = ref(false)
const error            = ref('')
const searchQuery      = ref('')
let   searchTimer      = null

// ── selected account & transactions
const selectedAccount  = ref(null)
const transactions     = ref([])
const txnLoading       = ref(false)
const txnError         = ref('')
const txnSearch        = ref('')
const txnStatusFilter  = ref('')
const txnCurrentPage   = ref(1)
const txnTotalRows     = ref(0)
let   txnSearchTimer   = null

// ── detail modal
const showDetailModal  = ref(false)
const detailTxn        = ref(null)

// ── accounting history (dalam modal)
const acctHistory      = ref([])
const acctLoading      = ref(false)
const acctError        = ref('')

// ── toast
const toast = ref({ show: false, type: 'success', message: '' })

// ── computed
const filteredAccounts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return accounts.value
  return accounts.value.filter(a =>
    a.name?.toLowerCase().includes(q) ||
    a['organization$_identifier']?.toLowerCase().includes(q)
  )
})

const txnTotalPages = computed(() => Math.max(1, Math.ceil(txnTotalRows.value / PAGE_SIZE)))
const txnPageNumbers = computed(() => {
  const tp = txnTotalPages.value, cp = txnCurrentPage.value, pages = []
  if (tp <= 1) return [1]
  if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); return pages }
  pages.push(1)
  if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...')
  pages.push(tp)
  return pages
})

const totalDeposit = computed(() =>
  transactions.value.reduce((s, t) => s + (Number(t.depositAmount) || 0), 0)
)
const totalPaymentAmt = computed(() =>
  transactions.value.reduce((s, t) => s + (Number(t.paymentAmount) || 0), 0)
)

// ── helpers
function formatCurrency(v, curr = 'IDR') {
  if (v == null || v === '') return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: curr || 'IDR', maximumFractionDigits: 0
  }).format(v)
}

function formatDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function bpName(identifier) {
  if (!identifier) return '—'
  const idx = identifier.indexOf(' - ')
  return idx >= 0 ? identifier.slice(idx + 3) : identifier
}

function paymentNo(txn) {
  if (!txn) return null
  const id = txn['finPayment$_identifier'] || ''
  // format: "1000018 - 31-03-2026 - Wetutuy - Wetutuy - 5000000"
  const parts = id.split(' - ')
  return parts[0]?.trim() || null
}

function txnPaymentLabel(txn) {
  const id = txn['finPayment$_identifier'] || ''
  if (!id) return '—'
  // Ambil bagian tanggal + nama customer: "31-03-2026 - Wetutuy"
  const parts = id.split(' - ')
  if (parts.length >= 3) return parts.slice(1, 3).join(' · ')
  return id
}

function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ── type / status label & class helpers
function accTypeLabel(t) {
  const map = { B: 'Bank', C: 'Cash', O: 'Other' }
  return map[t] || t || '—'
}
function accTypeClass(t) {
  const map = { B: 'type-bank', C: 'type-cash', O: 'type-other' }
  return map[t] || 'type-other'
}
function accIconClass(t) {
  const map = { B: 'acc-icon--bank', C: 'acc-icon--cash', O: 'acc-icon--other' }
  return map[t] || 'acc-icon--other'
}

function txnTypeLabel(t) {
  const map = { BPD: 'BP Deposit', BPW: 'BP Withdrawal', BF: 'Bank Fee', BR: 'Bank Receipt', BPR: 'BP Receipt', FTI: 'Funds Transfer In', FTO: 'Funds Transfer Out' }
  return map[t] || t || '—'
}
function txnTypeClass(t) {
  const map = { BPD: 'txn-deposit', BPW: 'txn-withdrawal', BF: 'txn-fee', BR: 'txn-receipt', FTI: 'txn-deposit', FTO: 'txn-withdrawal' }
  return map[t] || 'txn-other'
}

function txnStatusLabel(s) {
  const map = { RPAP: 'Awaiting Payment', RDNC: 'Deposited Not Cleared', RPVD: 'Payment Voided', RPAE: 'Awaiting Execution' }
  return map[s] || s || '—'
}
function txnStatusClass(s) {
  const map = { RPAP: 'status-awaiting', RDNC: 'status-complete', RPVD: 'status-void', RPAE: 'status-error' }
  return map[s] || 'status-draft'
}

// ── load financial accounts
async function loadAccounts() {
  loading.value = true; error.value = ''
  try {
    accounts.value = await fetchFinancialAccounts()
  } catch (e) {
    error.value = e.message || 'Gagal memuat financial account.'
  } finally { loading.value = false }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {}, 300) // filter is computed, no need to re-fetch
}

// ── select account & load transactions
function selectAccount(acc) {
  selectedAccount.value = acc
  txnCurrentPage.value  = 1
  txnTotalRows.value    = 0
  transactions.value    = []
  txnSearch.value       = ''
  txnStatusFilter.value = ''
  txnError.value        = ''
  loadTransactions()
  // Scroll ke panel transaksi
  setTimeout(() => {
    const el = document.querySelector('.panel-header')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

function clearSelection() {
  selectedAccount.value = null
  transactions.value    = []
}

// ── load transactions for selected account
async function loadTransactions() {
  if (!selectedAccount.value) return
  txnLoading.value = true; txnError.value = ''
  const startRow = (txnCurrentPage.value - 1) * PAGE_SIZE
  try {
    const res = await fetchFinaccTransactions({
      accountId:    selectedAccount.value.id,
      startRow,
      pageSize:     PAGE_SIZE,
      statusFilter: txnStatusFilter.value,
      searchKey:    txnSearch.value,
    })
    transactions.value = res.data

    const tr = res.totalRows
    if (tr !== null && !isNaN(Number(tr))) {
      txnTotalRows.value = Number(tr)
    } else {
      const fetched = transactions.value.length
      txnTotalRows.value = fetched === PAGE_SIZE ? startRow + fetched + 1 : startRow + fetched
    }

    if (transactions.value.length === 0 && txnCurrentPage.value > 1) {
      txnCurrentPage.value = 1
      await loadTransactions()
    }
  } catch (e) {
    txnError.value = e.message || 'Gagal memuat transaksi.'
  } finally { txnLoading.value = false }
}

function onTxnSearch() {
  clearTimeout(txnSearchTimer)
  txnSearchTimer = setTimeout(() => { txnCurrentPage.value = 1; loadTransactions() }, 400)
}

async function txnGoPage(p) {
  if (p < 1) return
  txnCurrentPage.value = p
  await loadTransactions()
}

// ── open transaction detail modal
async function openTxnDetail(txn) {
  detailTxn.value       = { ...txn }
  showDetailModal.value = true
  acctHistory.value     = []
  acctError.value       = ''

  // Load accounting history hanya jika posted='Y' dan processed=true
  if (txn.posted === 'Y' && txn.processed) {
    acctLoading.value = true
    try {
      acctHistory.value = await fetchFinaccTransactionAcct(txn.id)
    } catch (e) {
      acctError.value = e.message || 'Gagal memuat accounting history.'
    } finally {
      acctLoading.value = false
    }
  }
}

onMounted(() => loadAccounts())
</script>

<style scoped>
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc;
  --border: #e2e8f0; --accent: #3b82f6; --accent-light: #eff6ff;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --danger: #ef4444;
  --radius: 10px; --radius-sm: 6px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.06);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
.layout { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main { flex: 1; padding: 28px 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }

/* ── Page Header */
.page-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
.page-header-inner { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.page-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

/* ── Toolbar */
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: var(--text-muted); pointer-events: none; }
.search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); width: 260px; transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }
.filter-select { height: 36px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); color: var(--text-secondary); cursor: pointer; }
.filter-select:focus { border-color: var(--accent); }

/* ── Buttons */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; }
.btn--sm { height: 30px; padding: 0 12px; font-size: 12px; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #2563eb; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover:not(:disabled) { background: var(--border); }
.btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Table */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.th-action { text-align: right; width: 80px; }
.table tbody tr td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data { cursor: pointer; }
.tr-data:hover { background: var(--surface2); }
.tr-data:last-child td { border-bottom: none; }
.tr-selected td { background: #eff6ff !important; }
.tr-selected:hover td { background: #dbeafe !important; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }

/* ── Account row */
.acc-name-cell { display: flex; align-items: center; gap: 10px; }
.acc-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.acc-icon--bank { background: #dbeafe; color: #2563eb; }
.acc-icon--cash { background: #dcfce7; color: #16a34a; }
.acc-icon--other { background: #f1f5f9; color: #64748b; }
.acc-name { font-weight: 600; font-size: 13.5px; color: var(--text-primary); }
.acc-desc { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

/* ── Balance */
.balance-val { font-weight: 700; font-size: 13px; }
.balance-pos { color: #16a34a; }
.balance-neg { color: var(--danger); }
.amount-in  { color: #16a34a; font-weight: 600; }
.amount-out { color: var(--danger); font-weight: 600; }

/* ── Type badges */
.type-badge { display: inline-block; padding: 2px 9px; border-radius: 4px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.type-bank  { background: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
.type-cash  { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
.type-other { background: #f1f5f9; color: #64748b; border: 1px solid var(--border); }

/* ── Txn type badges */
.txn-type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.txn-deposit    { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.txn-withdrawal { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
.txn-fee        { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
.txn-receipt    { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.txn-other      { background: #f1f5f9; color: #64748b; border: 1px solid var(--border); }

/* ── Status pills */
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-awaiting { background: #fef9c3; color: #854d0e; }
.status-complete  { background: #dcfce7; color: #15803d; }
.status-void      { background: #f1f5f9; color: #64748b; }
.status-error     { background: #fee2e2; color: var(--danger); }
.status-draft     { background: #f1f5f9; color: #64748b; }

/* ── Panel (transaction section) */
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 24px 14px; border-bottom: 1px solid var(--border); gap: 16px; flex-wrap: wrap; }
.panel-header-left { display: flex; align-items: flex-start; gap: 12px; }
.btn-back { width: 32px; height: 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface2); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px; transition: background .12s; }
.btn-back:hover { background: var(--border); color: var(--text-primary); }
.panel-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 3px; }
.bc-link { cursor: pointer; transition: color .12s; }
.bc-link:hover { color: var(--accent); }
.bc-active { color: var(--accent); font-weight: 500; }
.panel-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }

/* ── Balance bar */
.balance-bar { display: flex; align-items: center; gap: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 18px; flex-shrink: 0; }
.balance-bar-item { display: flex; flex-direction: column; gap: 2px; }
.balance-bar-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.balance-bar-val { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.balance-bar-sep { width: 1px; height: 32px; background: var(--border); }

/* ── Txn count badge */
.txn-count-badge { font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); padding: 3px 10px; border-radius: 99px; }

/* ── Action btn */
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface2); cursor: pointer; color: var(--text-secondary); transition: all .12s; }
.action-btn--view:hover { background: var(--accent-light); color: var(--accent); border-color: #bfdbfe; }

/* ── Totals block */
.txn-totals { padding: 14px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
.txn-totals-inner { display: flex; flex-direction: column; gap: 6px; min-width: 280px; }
.totals-row { display: flex; justify-content: space-between; gap: 48px; font-size: 13px; color: var(--text-secondary); }
.totals-row--grand { font-weight: 700; font-size: 14px; color: var(--text-primary); border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px; }

/* ── Pagination */
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-ellipsis { color: var(--text-muted); padding: 0 4px; font-size: 13px; }

/* ── Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--lg { max-width: 720px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

/* ── Status bar (in modal) */
.pay-statusbar { display: flex; align-items: center; gap: 10px; padding: 8px 20px; background: #f8fafc; border-bottom: 1px solid var(--border); font-size: 12px; flex-wrap: wrap; flex-shrink: 0; }
.pay-statusbar-item { display: flex; align-items: center; gap: 4px; }
.pay-statusbar-label { color: var(--text-muted); font-weight: 500; }
.pay-statusbar-val { color: var(--text-primary); font-weight: 600; }
.pay-statusbar-val--status { padding: 1px 8px; border-radius: 12px; font-size: 11px; }
.pay-statusbar-sep { color: var(--border); font-size: 16px; }

/* ── Detail grid */
.detail-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.mono { font-family: var(--font-mono); font-size: 12.5px; }

/* ── Loading dots */
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

/* ── Toast */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }

/* ── Accounting History table */
.acct-table-wrap { overflow-x: auto; margin-top: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.acct-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.acct-table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 8px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.acct-table tbody tr td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.acct-table tbody tr:last-child td { border-bottom: none; }
.acct-table tbody tr:hover { background: var(--surface2); }
.acct-element { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-secondary); }
.acct-loading { display: flex; justify-content: center; padding: 24px 0; }
.acct-empty { text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; border: 1px dashed var(--border); border-radius: var(--radius-sm); margin-top: 12px; }
.acct-error { color: var(--danger); border-color: #fecaca; }

/* ── Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
.slide-up-enter-active { transition: all .25s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(16px); }
.slide-up-leave-active { transition: all .2s ease; }
.slide-up-leave-to { opacity: 0; transform: translateY(8px); }
</style>