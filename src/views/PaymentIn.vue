<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Payment In</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Search document no or customer..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Payment In
          </button>
        </div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>Document No.</th>
              <th>Payment Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Deposit To</th>
              <th>Status</th>
              <th class="th-action">Action</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="7" class="td-empty">No payment records found.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ formatDate(r.paymentDate) }}</td>
                  <td class="td-clip td-name">{{ bpName(r) }}</td>
                  <td class="td-secondary">{{ formatCurrency(r.amount) }}</td>
                  <td class="td-secondary">{{ r['account$_identifier'] || '—' }}</td>
                  <td><span :class="['status-pill', payStatusClass(r.status)]">{{ payStatusLabel(r.status) }}</span></td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu">
                          <button class="dropdown-item" @click.stop="openViewModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View
                          </button>
                          <button v-if="r.status === 'RPAP'" class="dropdown-item" @click.stop="openEditModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                          </button>
                          <button v-if="r.status === 'RPAP'" class="dropdown-item dropdown-item--danger" @click.stop="confirmDelete(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- ══ PAGINATION ══ -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button v-else :class="['page-btn', p === currentPage ? 'page-btn--active' : '']" @click="goPage(p)">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>
    </main>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- CREATE / EDIT MODAL                                    -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showFormModal" class="modal-overlay" @mousedown.self="closeFormModal">
        <div class="modal modal--xl">

          <!-- Header -->
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <router-link to="/payment-in" class="bc-link">Payment In</router-link>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Edit' : 'Create' }} Payment In</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Edit' : 'Create' }} Payment In</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Status bar (like Openbravo screenshot) -->
          <div class="pay-statusbar">
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Status:</span>
              <span class="pay-statusbar-val pay-statusbar-val--status">{{ isEdit ? payStatusLabel(form.status) : 'Awaiting Payment' }}</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Generated Credit:</span>
              <span class="pay-statusbar-val">0.00</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Used Credit:</span>
              <span class="pay-statusbar-val">0.00</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Write-off Amount:</span>
              <span class="pay-statusbar-val">0.00</span>
            </span>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', activeFormTab === 'header' ? 'modal-tab--active' : '']" @click="activeFormTab = 'header'">Header</button>
            <button :class="['modal-tab', activeFormTab === 'detail' ? 'modal-tab--active' : '']" @click="switchToDetailTab" :disabled="!savedPaymentId && !isEdit">Detail / Add Invoice</button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- ── Header Tab ── -->
            <div v-if="activeFormTab === 'header'">
              <div class="form-grid-3">

                <div class="form-group">
                  <label>Organization</label>
                  <input value="XYZ" class="form-input" disabled />
                </div>
                <div class="form-group">
                  <label>Document Type</label>
                  <input value="AR Receipt" class="form-input" disabled />
                </div>
                <div class="form-group">
                  <label>Document No.</label>
                  <input v-model="form.documentNo" class="form-input" placeholder="Auto-generated" disabled />
                </div>

                <div class="form-group">
                  <label>Payment Date <span class="req">*</span></label>
                  <input v-model="form.paymentDate" type="date" class="form-input" />
                </div>
                <div class="form-group form-group--full">
                  <label>Received From <span class="req">*</span></label>
                  <div class="acc-wrap">
                    <input
                      v-model="customerSearch"
                      class="acc-input"
                      placeholder="Search customer..."
                      :disabled="isEdit"
                      @input="onCustomerSearch"
                      @focus="showCustomerDrop = true"
                      @blur="onCustomerBlur"
                    />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showCustomerDrop && filteredCustomers.length" class="acc-dropdown">
                      <li v-for="c in filteredCustomers" :key="c.id" class="acc-opt" @mousedown.prevent="selectCustomer(c)">{{ c.name }}</li>
                    </ul>
                    <ul v-else-if="showCustomerDrop && customerSearch.length > 1 && !customerLoading" class="acc-dropdown">
                      <li class="acc-empty">No customers found</li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label>Payment Method <span class="req">*</span></label>
                  <select v-model="form.paymentMethod" class="form-input">
                    <option value="">Select</option>
                    <option v-for="m in paymentMethods" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Deposit To <span class="req">*</span></label>
                  <select v-model="form.financialAccount" class="form-input">
                    <option value="">Select</option>
                    <option v-for="a in financialAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Currency</label>
                  <input value="IDR" class="form-input" disabled />
                </div>

                <div class="form-group">
                  <label>Reference No.</label>
                  <input v-model="form.referenceNo" class="form-input" placeholder="Reference No." />
                </div>
                <div class="form-group form-group--full">
                  <label>Description</label>
                  <input v-model="form.description" class="form-input" placeholder="Description" />
                </div>

              </div>

              <!-- Info box: belum disimpan -->
              <div v-if="!isEdit && !savedPaymentId" class="info-box info-box--blue" style="margin-top:16px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Simpan header terlebih dahulu, lalu buka tab <strong>Detail / Add Invoice</strong> untuk menambahkan invoice yang akan dibayar.
              </div>
              <div v-if="savedPaymentId" class="info-box info-box--green" style="margin-top:16px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Header tersimpan. Buka tab <strong>Detail / Add Invoice</strong> untuk melanjutkan pembayaran invoice.
              </div>
            </div>

            <!-- ── Detail Tab ── -->
            <div v-if="activeFormTab === 'detail'">

              <!-- Summary card (mirip Openbravo Add Details header) -->
              <div class="pay-detail-summary">
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Payment Document No.</span>
                  <span class="pay-ds-val mono">{{ form.documentNo || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Reference No.</span>
                  <span class="pay-ds-val">{{ form.referenceNo || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Currency</span>
                  <span class="pay-ds-val">IDR</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Received From</span>
                  <span class="pay-ds-val">{{ customerSearch || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Payment Method</span>
                  <span class="pay-ds-val">{{ selectedPaymentMethodName }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Payment Date</span>
                  <span class="pay-ds-val">{{ form.paymentDate || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Deposit To</span>
                  <span class="pay-ds-val">{{ selectedFinAccName }}</span>
                </div>
                <div class="pay-ds-item pay-ds-item--amount">
                  <span class="pay-ds-label">Actual Payment</span>
                  <span class="pay-ds-val pay-ds-val--amount">{{ formatCurrency(totalSelectedAmount) }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Expected Payment</span>
                  <span class="pay-ds-val">{{ formatCurrency(totalOutstandingAmount) }}</span>
                </div>
              </div>

              <!-- Order / Invoice section -->
              <div class="section-divider" style="margin-top:16px">
                <div style="display:flex;align-items:center;gap:8px">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  <span>Order / Invoice</span>
                </div>
              </div>

              <!-- Transaction Type + Load button -->
              <div class="pay-detail-filter">
                <label class="pay-ds-label" style="white-space:nowrap">Transaction Type</label>
                <select class="form-input" style="max-width:180px;height:32px;font-size:12.5px" v-model="transactionType">
                  <option value="invoices">Invoices</option>
                </select>
                <button class="btn-add-line" @click="loadOutstandingInvoices" :disabled="invoiceLoading || !form.businessPartner" style="margin-left:8px">
                  <span v-if="invoiceLoading" class="spinner spinner--dark"></span>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
                  {{ invoiceLoading ? 'Loading...' : (invoicesLoaded ? 'Refresh' : 'Load Invoices') }}
                </button>
              </div>

              <!-- Info message -->
              <div v-if="invoiceCheckMsg" :class="['info-box', invoiceCheckMsg.type === 'error' ? 'info-box--red' : invoiceCheckMsg.type === 'warn' ? 'info-box--yellow' : 'info-box--green']" style="margin-bottom:12px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ invoiceCheckMsg.text }}
              </div>

              <!-- Invoice table -->
              <div class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th style="width:40px;text-align:center">
                      <input type="checkbox" v-model="selectAllInvoices" @change="toggleAllInvoices" :disabled="outstandingInvoices.length === 0" />
                    </th>
                    <th>Order No.</th>
                    <th>Invoice No.</th>
                    <th>Payment Method</th>
                    <th>Business Partner</th>
                    <th>Expected Date</th>
                    <th style="text-align:right">Invoiced Amount</th>
                    <th style="text-align:right">Outstanding</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="invoiceLoading">
                      <td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td>
                    </tr>
                    <tr v-else-if="!invoicesLoaded">
                      <td colspan="8" class="td-empty" style="color:var(--text-muted);font-style:italic">Klik "Load Invoices" untuk melihat tagihan outstanding.</td>
                    </tr>
                    <tr v-else-if="outstandingInvoices.length === 0">
                      <td colspan="8" class="td-empty">No items to show.</td>
                    </tr>
                    <tr v-else v-for="inv in outstandingInvoices" :key="inv.id" class="tr-data" :class="{ 'tr-selected': inv.selected }">
                      <td style="text-align:center"><input type="checkbox" v-model="inv.selected" @change="onInvoiceSelect" /></td>
                      <td class="td-secondary">{{ inv.orderReference || '—' }}</td>
                      <td><span class="code-badge">{{ inv.documentNo || '—' }}</span></td>
                      <td class="td-secondary">{{ inv['paymentMethod$_identifier'] || selectedPaymentMethodName }}</td>
                      <td class="td-secondary">{{ customerSearch }}</td>
                      <td class="td-secondary">{{ formatDate(inv.dueDate) }}</td>
                      <td class="td-secondary" style="text-align:right">{{ formatCurrency(inv.grandTotalAmount) }}</td>
                      <td class="td-secondary" style="text-align:right;font-weight:600;color:var(--danger)">{{ formatCurrency(inv.outstandingAmount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Totals + Done button -->
              <div class="pay-detail-footer">
                <div class="totals-block" style="margin-top:0">
                  <div class="totals-row"><span>Selected</span><span>{{ selectedInvoices.length }} invoice(s)</span></div>
                  <div class="totals-row totals-row--grand"><span>Total Payment</span><span>{{ formatCurrency(totalSelectedAmount) }}</span></div>
                </div>
                <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
                  <button class="btn btn--ghost" @click="closeFormModal">Cancel</button>
                  <button class="btn btn--primary" :disabled="paying || selectedInvoices.length === 0" @click="processPayment">
                    <span v-if="paying" class="spinner"></span>
                    {{ paying ? 'Processing...' : 'Done' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- API Error -->
            <div v-if="formError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">{{ activeFormTab === 'detail' ? 'Close' : 'Cancel' }}</button>
            <button v-if="activeFormTab === 'header'" class="btn btn--primary" :disabled="saving" @click="saveHeader">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Save Header') }}
            </button>
            <button v-if="activeFormTab === 'header' && savedPaymentId" class="btn btn--secondary" @click="activeFormTab = 'detail'">
              Next: Add Invoice →
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- VIEW MODAL                                             -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showViewModal" class="modal-overlay" @mousedown.self="showViewModal = false">
        <div class="modal modal--xl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <router-link to="/payment-in" class="bc-link">Payment In</router-link>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">View Payment</span>
              </div>
              <div class="modal-title">Payment — {{ viewRow?.documentNo }}</div>
            </div>
            <button class="modal-close" @click="showViewModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Status bar -->
          <div class="pay-statusbar">
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Status:</span>
              <span :class="['pay-statusbar-val pay-statusbar-val--status', payStatusClass(viewRow?.status)]">{{ payStatusLabel(viewRow?.status) }}</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Generated Credit:</span><span class="pay-statusbar-val">{{ formatCurrency(viewRow?.generatedCredit ?? 0) }}</span></span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Used Credit:</span><span class="pay-statusbar-val">{{ formatCurrency(viewRow?.usedCredit ?? 0) }}</span></span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Write-off:</span><span class="pay-statusbar-val">{{ formatCurrency(viewRow?.writeoffAmount ?? 0) }}</span></span>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', viewTab === 'lines' ? 'modal-tab--active' : '']" @click="viewTab = 'lines'">Lines</button>
            <button :class="['modal-tab', viewTab === 'header' ? 'modal-tab--active' : '']" @click="viewTab = 'header'">Header</button>
          </div>

          <div class="modal-body" v-if="viewRow">

            <!-- ── Lines Tab ── -->
            <div v-if="viewTab === 'lines'">

              <!-- Add Detail panel -->
              <div v-if="showAddDetail && viewRow.status === 'RPAP'" class="add-detail-panel">
                <div class="add-detail-header">
                  <span class="add-detail-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add Detail — Link Invoice
                  </span>
                  <button class="modal-close" @click="showAddDetail = false">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <!-- Add detail summary -->
                <div class="add-detail-summary">
                  <div class="pay-ds-item"><span class="pay-ds-label">Payment Doc No.</span><span class="pay-ds-val mono">{{ viewRow.documentNo }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Received From</span><span class="pay-ds-val">{{ bpName(viewRow) }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Payment Method</span><span class="pay-ds-val">{{ viewRow['paymentMethod$_identifier'] || '—' }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Payment Date</span><span class="pay-ds-val">{{ formatDate(viewRow.paymentDate) }}</span></div>
                  <div class="pay-ds-item"><span class="pay-ds-label">Deposit To</span><span class="pay-ds-val">{{ viewRow['account$_identifier'] || '—' }}</span></div>
                  <div class="pay-ds-item pay-ds-item--amount">
                    <span class="pay-ds-label">Actual Payment</span>
                    <span class="pay-ds-val pay-ds-val--amount">{{ formatCurrency(addDetailSelected.reduce((s,i) => s+(Number(i.outstandingAmount)||0),0)) }}</span>
                  </div>
                </div>

                <!-- Transaction Type -->
                <div class="pay-detail-filter" style="margin-top:12px">
                  <label class="pay-ds-label" style="white-space:nowrap">Transaction Type</label>
                  <select class="form-input" style="max-width:180px;height:32px;font-size:12.5px">
                    <option>Invoices</option>
                  </select>
                  <button class="btn-add-line" @click="loadAddDetailInvoices" :disabled="addDetailLoading" style="margin-left:8px">
                    <span v-if="addDetailLoading" class="spinner spinner--dark"></span>
                    <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
                    {{ addDetailLoading ? 'Loading...' : (addDetailInvoices.length ? 'Refresh' : 'Load') }}
                  </button>
                </div>

                <!-- Invoice picker table -->
                <div class="table-wrap" style="margin:8px 0 0">
                  <table class="table">
                    <thead><tr>
                      <th style="width:36px;text-align:center"><input type="checkbox" v-model="addDetailSelectAll" @change="toggleAddDetailAll" :disabled="addDetailInvoices.length===0" /></th>
                      <th>Order No.</th>
                      <th>Invoice No.</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th style="text-align:right">Invoice Amount</th>
                      <th style="text-align:right">Expected Amount</th>
                      <th style="text-align:right">Outstanding</th>
                      <th>Business Partner</th>
                    </tr></thead>
                    <tbody>
                      <tr v-if="addDetailLoading"><td colspan="9" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                      <tr v-else-if="addDetailInvoices.length === 0"><td colspan="9" class="td-empty" style="font-style:italic;color:var(--text-muted)">Klik Load untuk menampilkan invoice outstanding.</td></tr>
                      <tr v-else v-for="inv in addDetailInvoices" :key="inv.id" class="tr-data" :class="{ 'tr-selected': inv.selected }">
                        <td style="text-align:center"><input type="checkbox" v-model="inv.selected" @change="onAddDetailSelect" /></td>
                        <td class="td-secondary">{{ inv.orderReference || '—' }}</td>
                        <td><span class="code-badge">{{ inv.documentNo || '—' }}</span></td>
                        <td class="td-secondary">{{ formatDate(inv.invoiceDate) }}</td>
                        <td class="td-secondary">{{ formatDate(inv.dueDate) }}</td>
                        <td class="td-secondary" style="text-align:right">{{ formatCurrency(inv.grandTotalAmount) }}</td>
                        <td class="td-secondary" style="text-align:right">{{ formatCurrency(inv.grandTotalAmount) }}</td>
                        <td style="text-align:right;font-weight:600;color:var(--danger)">{{ formatCurrency(inv.outstandingAmount) }}</td>
                        <td class="td-secondary">{{ bpName(viewRow) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Add Detail actions -->
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
                  <button class="btn btn--ghost" @click="showAddDetail = false">Cancel</button>
                  <button class="btn btn--primary" :disabled="addDetailSaving || addDetailSelected.length === 0" @click="saveAddDetail">
                    <span v-if="addDetailSaving" class="spinner"></span>
                    {{ addDetailSaving ? 'Saving...' : `Done (${addDetailSelected.length} selected)` }}
                  </button>
                </div>
              </div>

              <!-- Lines table header + Add Detail button -->
              <div class="section-divider" style="margin-top:0">
                <span>Payment Lines</span>
                <button v-if="viewRow.status === 'RPAP'" class="btn-add-line" @click="openAddDetail">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Add Detail
                </button>
              </div>

              <!-- Existing lines -->
              <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>Order No.</th>
                    <th>Invoice No.</th>
                    <th>Invoice Date</th>
                    <th>Due Date</th>
                    <th style="text-align:right">Invoice Amount</th>
                    <th style="text-align:right">Expected Amount</th>
                    <th style="text-align:right">Received Amount</th>
                    <th>G/L Item</th>
                    <th>Business Partner</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length === 0"><td colspan="9" class="td-empty">No data in grid.</td></tr>
                    <tr v-else v-for="line in viewLines" :key="line.id" class="tr-data">
                      <td class="td-secondary">{{ line.orderReference || '—' }}</td>
                      <td><span class="code-badge">{{ line.documentNo || '—' }}</span></td>
                      <td class="td-secondary">{{ formatDate(line.invoiceDate) }}</td>
                      <td class="td-secondary">{{ formatDate(line.dueDate) }}</td>
                      <td class="td-secondary" style="text-align:right">{{ formatCurrency(line.grandTotalAmount) }}</td>
                      <td class="td-secondary" style="text-align:right">{{ formatCurrency(line.grandTotalAmount) }}</td>
                      <td style="text-align:right;font-weight:600;color:#16a34a">{{ formatCurrency(line.grandTotalAmount) }}</td>
                      <td class="td-secondary">—</td>
                      <td class="td-secondary">{{ bpName(viewRow) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Lines totals -->
              <div v-if="viewLines.length > 0" class="totals-block">
                <div class="totals-row totals-row--grand">
                  <span>Total Received</span>
                  <span>{{ formatCurrency(viewLines.reduce((s,l) => s+(Number(l.grandTotalAmount)||0), 0)) }}</span>
                </div>
              </div>
            </div>

            <!-- ── Header Tab ── -->
            <div v-if="viewTab === 'header'">
              <div class="detail-grid" style="margin-top:8px">
                <div class="detail-item"><span class="detail-label">Document No.</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Date</span><span class="detail-value">{{ formatDate(viewRow.paymentDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', payStatusClass(viewRow.status)]">{{ payStatusLabel(viewRow.status) }}</span></div>
                <div class="detail-item"><span class="detail-label">Received From</span><span class="detail-value">{{ bpName(viewRow) }}</span></div>
                <div class="detail-item"><span class="detail-label">Payment Method</span><span class="detail-value">{{ viewRow['paymentMethod$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Deposit To</span><span class="detail-value">{{ viewRow['account$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Currency</span><span class="detail-value">IDR</span></div>
                <div class="detail-item"><span class="detail-label">Amount</span><span class="detail-value" style="font-weight:700">{{ formatCurrency(viewRow.amount) }}</span></div>
                <div class="detail-item"><span class="detail-label">Reference No.</span><span class="detail-value">{{ viewRow.referenceNo || '—' }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Description</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal = false">Close</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DELETE CONFIRM MODAL                                   -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal = false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <div class="modal-title" style="color:var(--danger)">Delete Payment</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Are you sure you want to delete payment <strong>{{ deleteTarget?.documentNo }}</strong>? This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDeleteModal = false">Cancel</button>
            <button class="btn btn--danger" :disabled="deleting" @click="doDelete">
              <span v-if="deleting" class="spinner"></span>
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ TOAST ══ -->
    <transition name="fade">
      <div v-if="toast.show" :class="['toast', toast.type === 'success' ? 'toast--success' : 'toast--error']">
        <svg v-if="toast.type === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast.msg }}
      </div>
    </transition>

  </div>
</template>

<script>
import {
  fetchAllPayments,
  createPaymentHeader,
  updatePaymentHeader,
  deletePaymentHeader,
  searchBusinessPartners,
  fetchOutstandingInvoices,
  fetchPaymentLines,
  addPaymentDetail,
  finalizePaymentAmount,
  postPayment,
  fetchFinancialAccounts,
  fetchPaymentMethods,
  DEFAULT_FIN_ACCOUNT_ID,
  DEFAULT_PAYMETHOD_ID,
} from '@/services/paymentIn.js'

const PAGE_SIZE = 20

export default {
  name: 'PaymentIn',



  data() {
    const today = new Date().toISOString().slice(0, 10)
    return {
      // Table
      rows: [], loading: false, error: null,
      searchQuery: '', searchTimer: null,
      currentPage: 1, totalRows: 0,

      // Dropdown
      openDropdown: null,

      // Modals
      showFormModal: false, showViewModal: false, showDeleteModal: false,

      // Form
      isEdit: false, activeFormTab: 'header',
      editId: null, savedPaymentId: null,
      saving: false, formError: null,
      form: {
        documentNo: '',
        paymentDate: today,
        businessPartner: '',
        paymentMethod: DEFAULT_PAYMETHOD_ID,
        financialAccount: DEFAULT_FIN_ACCOUNT_ID,
        referenceNo: '',
        description: '',
        status: 'RPAP',
        amount: 0,
      },

      // Customer search
      customerSearch: '', filteredCustomers: [],
      showCustomerDrop: false, customerLoading: false, customerTimer: null,

      // Lookups
      paymentMethods: [], financialAccounts: [],

      // Detail tab
      transactionType: 'invoices',
      outstandingInvoices: [],
      invoiceLoading: false,
      invoicesLoaded: false,
      invoiceCheckMsg: null,
      selectAllInvoices: false,
      paying: false,

      // View
      viewRow: null,
      viewTab: 'lines',
      viewLines: [], viewLinesLoading: false,
      showAddDetail: false,
      addDetailInvoices: [], addDetailLoading: false, addDetailSaving: false,
      addDetailSelectAll: false,

      // Delete
      deleteTarget: null, deleting: false,

      // Toast
      toast: { show: false, msg: '', type: 'success' },
    }
  },

  computed: {
    totalPages() { return Math.ceil(this.totalRows / PAGE_SIZE) || 1 },
    pageNumbers() {
      const { currentPage: c, totalPages: t } = this
      if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
      const pages = [1]
      if (c > 3) pages.push('...')
      for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) pages.push(i)
      if (c < t - 2) pages.push('...')
      pages.push(t)
      return pages
    },
    selectedInvoices() { return this.outstandingInvoices.filter(i => i.selected) },
    totalSelectedAmount() { return this.selectedInvoices.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0) },
    totalOutstandingAmount() { return this.outstandingInvoices.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0) },
    addDetailSelected() { return this.addDetailInvoices.filter(i => i.selected) },
    selectedPaymentMethodName() {
      const m = this.paymentMethods.find(m => m.id === this.form.paymentMethod)
      return m ? m.name : 'Transfer'
    },
    selectedFinAccName() {
      const a = this.financialAccounts.find(a => a.id === this.form.financialAccount)
      return a ? a.name : 'Receive Bank - IDR'
    },
  },

  async mounted() {
    await this.loadRows()
    this.loadLookups()
    this._docClickHandler = (e) => {
      if (!e.target.closest('.dropdown-wrap')) {
        this.openDropdown = null
      }
    }
    document.addEventListener('click', this._docClickHandler)
  },
  unmounted() {
    document.removeEventListener('click', this._docClickHandler)
  },

  methods: {
    // ── Load ──────────────────────────────────────────────
    async loadRows() {
      this.loading = true; this.error = null
      try {
        const startRow = (this.currentPage - 1) * PAGE_SIZE
        const res = await fetchAllPayments({ startRow, pageSize: PAGE_SIZE, searchKey: this.searchQuery })
        this.rows = res.data ?? []
        this.totalRows = res.totalRows ?? this.rows.length
      } catch (e) { this.error = e.message }
      finally { this.loading = false }
    },

    async loadLookups() {
      try {
        const [methods, accounts] = await Promise.all([fetchPaymentMethods(), fetchFinancialAccounts()])
        this.paymentMethods = methods
        this.financialAccounts = accounts
      } catch (e) { console.warn('Lookup load failed', e.message) }
    },

    // ── Search / Pagination ───────────────────────────────
    onSearch() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => { this.currentPage = 1; this.loadRows() }, 400)
    },
    goPage(p) { this.currentPage = p; this.loadRows() },

    // ── Dropdown ──────────────────────────────────────────
    toggleDropdown(id) {
      this.openDropdown = this.openDropdown === id ? null : id
    },
    closeDropdown() { this.openDropdown = null },

    // ── Customer search ───────────────────────────────────
    onCustomerSearch() {
      clearTimeout(this.customerTimer)
      if (this.customerSearch.length < 2) { this.filteredCustomers = []; return }
      this.customerLoading = true
      this.customerTimer = setTimeout(async () => {
        try { this.filteredCustomers = await searchBusinessPartners(this.customerSearch) }
        catch { this.filteredCustomers = [] }
        finally { this.customerLoading = false }
      }, 300)
    },
    onCustomerBlur() { setTimeout(() => { this.showCustomerDrop = false }, 200) },
    selectCustomer(c) {
      this.form.businessPartner = c.id
      this.customerSearch = c.name
      this.showCustomerDrop = false
      this.filteredCustomers = []
      // Reset invoice list when customer changes
      this.outstandingInvoices = []
      this.invoiceCheckMsg = null
    },

    // ── Open modals ───────────────────────────────────────
    openCreateModal() {
      this.isEdit = false
      this.editId = null
      this.savedPaymentId = null
      this.activeFormTab = 'header'
      const today = new Date().toISOString().slice(0, 10)
      this.form = {
        documentNo: '', paymentDate: today,
        businessPartner: '',
        paymentMethod: DEFAULT_PAYMETHOD_ID,
        financialAccount: DEFAULT_FIN_ACCOUNT_ID,
        referenceNo: '', description: '', status: 'RPAP', amount: 0,
      }
      this.customerSearch = ''
      this.filteredCustomers = []
      this.outstandingInvoices = []
      this.invoicesLoaded = false
      this.invoiceCheckMsg = null
      this.formError = null
      this.showFormModal = true
    },

    openEditModal(r) {
      this.openDropdown = null
      this.showFormModal = false
      this.isEdit = true
      this.editId = r.id
      this.savedPaymentId = r.id
      this.activeFormTab = 'header'
      this.form = {
        documentNo: r.documentNo || '',
        paymentDate: r.paymentDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        businessPartner: typeof r.businessPartner === 'object' ? r.businessPartner?.id : r.businessPartner,
        paymentMethod: typeof r.paymentMethod === 'object' ? r.paymentMethod?.id : (r.paymentMethod || DEFAULT_PAYMETHOD_ID),
        financialAccount: typeof r.financialAccount === 'object' ? r.financialAccount?.id : (r.financialAccount || DEFAULT_FIN_ACCOUNT_ID),
        referenceNo: r.referenceNo || '',
        description: r.description || '',
        status: r.status || 'RPAP',
        amount: r.amount || 0,
      }
      this.customerSearch = r['businessPartner$_identifier'] || ''
      this.outstandingInvoices = []
      this.invoiceCheckMsg = null
      this.formError = null
      this.showFormModal = true
    },

    openViewModal(r) {
      this.openDropdown = null
      this.$nextTick(() => {
        this.viewRow = { ...r }
        this.viewTab = 'lines'
        this.viewLines = []
        this.showAddDetail = false
        this.addDetailInvoices = []
        this.addDetailSelectAll = false
        this.showViewModal = true
        const bpId = typeof r.businessPartner === 'object' ? r.businessPartner : r.businessPartner
        this.loadViewLines(r.id, bpId)
      })
    },

    async loadViewLines(paymentId, bpId) {
      this.viewLinesLoading = true
      try {
        this.viewLines = await fetchPaymentLines(paymentId, bpId)
      } catch (e) {
        console.error('Load lines failed', e.message)
        this.viewLines = []
      } finally {
        this.viewLinesLoading = false
      }
    },

    // ── Add Detail (from View modal) ───────────────────────
    openAddDetail() {
      this.showAddDetail = true
      this.addDetailInvoices = []
      this.addDetailSelectAll = false
      this.loadAddDetailInvoices()
    },

    async loadAddDetailInvoices() {
      if (!this.viewRow?.businessPartner) return
      this.addDetailLoading = true
      const bpId = typeof this.viewRow.businessPartner === 'object'
        ? this.viewRow.businessPartner
        : this.viewRow.businessPartner
      try {
        const rows = await fetchOutstandingInvoices(bpId)
        this.addDetailInvoices = rows.map(r => ({ ...r, selected: false }))
      } catch (e) {
        console.error('Load add detail invoices failed', e.message)
      } finally {
        this.addDetailLoading = false
      }
    },

    toggleAddDetailAll() {
      this.addDetailInvoices.forEach(i => { i.selected = this.addDetailSelectAll })
    },

    onAddDetailSelect() {
      this.addDetailSelectAll = this.addDetailInvoices.length > 0
        && this.addDetailInvoices.every(i => i.selected)
    },

    async saveAddDetail() {
      if (this.addDetailSelected.length === 0) return
      this.addDetailSaving = true
      this.formError = null
      const paymentId = this.viewRow.id
      const totalSelected = this.addDetailSelected.reduce((s, i) => s + (Number(i.outstandingAmount) || 0), 0)
      const bpId = typeof this.viewRow.businessPartner === 'object'
        ? this.viewRow.businessPartner
        : this.viewRow.businessPartner
      try {
        // Update amount header Openbravo
        await finalizePaymentAmount(paymentId, totalSelected)
        // Proses ke Spring Boot — handles schedule, detail, invoice update
        const res = await postPayment(bpId, totalSelected)
        if (res.responseCode === 0) {
          this.showToast('Payment berhasil diproses!', 'success')
          this.showAddDetail = false
          const bpId = typeof this.viewRow.businessPartner === 'object' ? this.viewRow.businessPartner : this.viewRow.businessPartner
          await this.loadViewLines(paymentId, bpId)
          await this.loadRows()
        } else {
          this.formError = res.responseDetail?.[0] || 'Gagal proses payment.'
        }
      } catch (e) {
        this.formError = e.message
      } finally {
        this.addDetailSaving = false
      }
    },

    closeFormModal() {
      if (this.saving || this.paying) return
      this.showFormModal = false
      this.savedPaymentId = null
      this.loadRows()
    },

    confirmDelete(r) {
      this.openDropdown = null
      this.$nextTick(() => {
        this.deleteTarget = { ...r }
        this.showDeleteModal = true
      })
    },

    // ── Save Header ───────────────────────────────────────
    async saveHeader() {
      this.formError = null
      if (!this.form.businessPartner) { this.formError = 'Received From wajib diisi.'; return }
      if (!this.form.paymentDate) { this.formError = 'Payment Date wajib diisi.'; return }
      if (!this.form.paymentMethod) { this.formError = 'Payment Method wajib diisi.'; return }
      if (!this.form.financialAccount) { this.formError = 'Deposit To wajib diisi.'; return }

      this.saving = true
      try {
        let result
        if (this.isEdit) {
          result = await updatePaymentHeader(this.editId, this.form)
          this.showToast('Payment header berhasil diupdate.', 'success')
        } else {
          result = await createPaymentHeader(this.form)
          this.savedPaymentId = result.id
          this.form.documentNo = result.documentNo || ''
          this.showToast('Header tersimpan. Lanjutkan ke tab Detail.', 'success')
        }
      } catch (e) {
        this.formError = e.message || 'Gagal menyimpan header.'
      } finally {
        this.saving = false
      }
    },

    // ── Switch to detail tab ──────────────────────────────
    switchToDetailTab() {
      if (!this.savedPaymentId && !this.isEdit) {
        this.formError = 'Simpan header terlebih dahulu.'
        return
      }
      this.formError = null
      this.activeFormTab = 'detail'
      // Auto load jika belum pernah load
      if (this.form.businessPartner && !this.invoicesLoaded) {
        this.loadOutstandingInvoices()
      }
    },

    // ── Load Outstanding Invoices dari Openbravo FIN_PaymentSchedule ──
    async loadOutstandingInvoices() {
      if (!this.form.businessPartner) {
        this.invoiceCheckMsg = { type: 'error', text: 'Pilih customer terlebih dahulu.' }
        return
      }
      this.invoiceLoading = true
      this.invoiceCheckMsg = null
      this.outstandingInvoices = []
      this.invoicesLoaded = false
      this.selectAllInvoices = false
      try {
        const rows = await fetchOutstandingInvoices(this.form.businessPartner)
        // Tambahkan field selected ke tiap baris
        this.outstandingInvoices = rows.map(r => ({ ...r, selected: false }))
        this.invoicesLoaded = true
        if (rows.length === 0) {
          this.invoiceCheckMsg = { type: 'warn', text: 'Customer ini tidak memiliki tagihan outstanding.' }
        }
      } catch (e) {
        this.invoiceCheckMsg = { type: 'error', text: e.message || 'Gagal memuat invoice.' }
      } finally {
        this.invoiceLoading = false
      }
    },

    toggleAllInvoices() {
      this.outstandingInvoices.forEach(i => { i.selected = this.selectAllInvoices })
    },

    onInvoiceSelect() {
      this.selectAllInvoices = this.outstandingInvoices.length > 0
        && this.outstandingInvoices.every(i => i.selected)
    },

    // ── Process Payment ───────────────────────────────────
    async processPayment() {
      if (this.selectedInvoices.length === 0) return
      this.formError = null
      this.paying = true

      const paymentId = this.savedPaymentId || this.editId
      const totalAmount = this.totalSelectedAmount

      try {
        // Step 1: Update amount di header Openbravo
        await finalizePaymentAmount(paymentId, totalAmount)

        // Step 2: Proses payment ke Spring Boot (update invoice, schedule, financial account, dll)
        const res = await postPayment(this.form.businessPartner, totalAmount)
        if (res.responseCode === 0) {
          this.showToast('Payment berhasil diproses!', 'success')
          this.closeFormModal()
        } else {
          // Spring Boot gagal, tapi Openbravo detail sudah masuk
          // Tetap tampilkan pesan warning
          this.formError = res.responseDetail?.[0] || 'Payment gagal di proses akhir.'
        }
      } catch (e) {
        this.formError = e.message
      } finally {
        this.paying = false
      }
    },

    // ── Delete ────────────────────────────────────────────
    async doDelete() {
      this.deleting = true
      try {
        await deletePaymentHeader(this.deleteTarget.id)
        this.showDeleteModal = false
        this.showToast('Payment berhasil dihapus.', 'success')
        await this.loadRows()
      } catch (e) {
        this.showToast(e.message || 'Gagal menghapus.', 'error')
      } finally { this.deleting = false }
    },

    // ── Helpers ───────────────────────────────────────────
    bpName(r) {
      const id = r['businessPartner$_identifier'] || ''
      return id.includes(' - ') ? id.split(' - ').slice(1).join(' - ') : (id || '—')
    },

    formatDate(v) {
      if (!v) return '—'
      return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    },

    formatCurrency(v) {
      if (v == null || v === '') return '—'
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
    },

    payStatusClass(s) {
      const map = { RPAP: 'status-awaiting', RDNC: 'status-complete', RPVD: 'status-void', RPAE: 'status-error' }
      return map[s] || 'status-draft'
    },

    payStatusLabel(s) {
      const map = { RPAP: 'Awaiting Payment', RDNC: 'Deposited Not Cleared', RPVD: 'Payment Voided', RPAE: 'Awaiting Execution' }
      return map[s] || s || '—'
    },

    showToast(msg, type = 'success') {
      this.toast = { show: true, msg, type }
      setTimeout(() => { this.toast.show = false }, 3000)
    },
  },
}
</script>

<style scoped>
/* ── Base variables (mirror CustomerInvoice) ── */
:root {
  --font: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --danger: #dc2626;
  --bg: #f1f5f9;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow-md: 0 4px 20px rgba(0,0,0,.10);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.layout { display: flex; min-height: 100vh; background: var(--bg); font-family: var(--font); }
.main   { flex: 1; padding: 24px; overflow-x: hidden; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); overflow: hidden; }

/* ── Page header ── */
.page-header { padding: 20px 24px 0; }
.page-title  { font-size: 18px; font-weight: 700; color: var(--text-primary); }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; gap: 12px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.search-wrap  { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
.search-icon  { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); font-family: var(--font); color: var(--text-primary); transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; font-family: var(--font); transition: all .15s; }
.btn--primary   { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #1d4ed8; }
.btn--secondary { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.btn--secondary:hover:not(:disabled) { background: #bae6fd; }
.btn--ghost  { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled)  { background: var(--surface2); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #b91c1c; }
.btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Table ── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { padding: 10px 16px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text-primary); }
.tr-data:hover td { background: #fafbff; }
.td-empty  { text-align: center; padding: 40px !important; color: var(--text-muted); font-size: 13px; }
.td-error  { color: var(--danger); }
.td-secondary { color: var(--text-secondary); }
.td-clip   { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name   { font-weight: 500; }
.th-action { text-align: right; }
.td-action-cell { text-align: right; }

/* ── Code badge ── */
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 5px; }

/* ── Status pills ── */
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-awaiting { background: #fef9c3; color: #854d0e; }
.status-complete { background: #dcfce7; color: #15803d; }
.status-void     { background: #f1f5f9; color: #64748b; }
.status-error    { background: #fee2e2; color: var(--danger); }
.status-draft    { background: #f1f5f9; color: #64748b; }

/* ── Action buttons ── */
.action-group  { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.action-btn    { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; transition: all .12s; }
.action-btn:hover { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }
.action-btn--more:hover { background: var(--surface2); color: var(--text-primary); border-color: var(--border); }

/* ── Dropdown ── */
.dropdown-wrap { position: relative; }
.dropdown-menu { position: absolute; z-index: 500; right: 0; top: calc(100% + 4px); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); min-width: 150px; padding: 4px 0; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 14px; font-size: 12.5px; color: var(--text-primary); background: none; border: none; cursor: pointer; font-family: var(--font); transition: background .1s; }
.dropdown-item:hover { background: var(--surface2); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: #fff1f2; }

/* ── Loading dots ── */
.loading-dots { display: inline-flex; gap: 5px; }
.loading-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: bounce .8s infinite; }
.loading-dots span:nth-child(2) { animation-delay: .15s; }
.loading-dots span:nth-child(3) { animation-delay: .30s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

/* ── Pagination ── */
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-ellipsis { color: var(--text-muted); padding: 0 4px; font-size: 13px; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xl { max-width: 900px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.bc-link { color: var(--text-muted); font-size: 11.5px; text-decoration: none; transition: color .12s; }
.bc-link:hover { color: var(--accent); }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); padding: 0 20px; flex-shrink: 0; }
.modal-tab { padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all .15s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.modal-tab:disabled { opacity: .4; cursor: not-allowed; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; align-items: center; }

/* ── Payment Status Bar (Openbravo-style) ── */
.pay-statusbar { display: flex; align-items: center; gap: 10px; padding: 8px 20px; background: #f8fafc; border-bottom: 1px solid var(--border); font-size: 12px; flex-wrap: wrap; flex-shrink: 0; }
.pay-statusbar--view { border-bottom: none; border-top: 1px solid var(--border); margin-top: 0; border-radius: 0; }
.pay-statusbar-item { display: flex; align-items: center; gap: 4px; }
.pay-statusbar-label { color: var(--text-muted); font-weight: 500; }
.pay-statusbar-val { color: var(--text-primary); font-weight: 600; }
.pay-statusbar-val--status { color: #854d0e; background: #fef9c3; padding: 1px 8px; border-radius: 12px; font-size: 11px; }
.pay-statusbar-sep { color: var(--border); font-size: 16px; }

/* ── Payment Detail Summary ── */
.pay-detail-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
.pay-ds-item { display: flex; flex-direction: column; gap: 3px; }
.pay-ds-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.pay-ds-val { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.pay-ds-val.mono { font-family: var(--font-mono); font-size: 12px; }
.pay-ds-val--amount { 
  font-weight: 700; font-size: 15px; color: var(--accent); 
  background: transparent; border: none; cursor: default; user-select: none;
  display: block; padding: 2px 0;
}

/* ── Detail filter row ── */
.pay-detail-filter { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; }

/* ── Form ── */
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

/* ── Combobox ── */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input:disabled { opacity: .6; background: #f1f5f9; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

/* ── Section divider ── */
.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover:not(:disabled) { background: #dbeafe; }
.btn-add-line:disabled { opacity: .4; cursor: not-allowed; }

/* ── Info boxes ── */
.info-box { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; }
.info-box--blue   { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
.info-box--green  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
.info-box--yellow { background: #fefce8; border: 1px solid #fef08a; color: #854d0e; }
.info-box--red    { background: #fff1f2; border: 1px solid #fecaca; color: var(--danger); }

/* ── Totals ── */
.totals-block { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.totals-row { display: flex; justify-content: space-between; gap: 48px; font-size: 13px; color: var(--text-secondary); min-width: 260px; }
.totals-row--grand { font-weight: 700; font-size: 14px; color: var(--text-primary); border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px; }

/* ── Detail view ── */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

/* ── Delete modal ── */
.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

/* ── Toast ── */
.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }

/* ── Spinner ── */
.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.spinner--dark { border-color: rgba(37,99,235,.3); border-top-color: var(--accent); }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Fade transition ── */
.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }

/* ── Selected row highlight ── */
.tr-selected td { background: #eff6ff !important; }
.tr-selected:hover td { background: #dbeafe !important; }

/* ── Detail footer ── */
.pay-detail-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); }

/* ── Add Detail Panel ── */
.add-detail-panel { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.add-detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.add-detail-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.add-detail-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; background: #fff; border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; }

</style>