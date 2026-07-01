<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">{{ pageTitle }}</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Cari no dokumen atau partner..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Buat {{ pageTitle }}
          </button>
        </div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th>No. Dokumen</th>
              <th>Tanggal</th>
              <th>Partner Bisnis</th>
              <th>Jumlah</th>
              <th>{{ accountColumnLabel }}</th>
              <th>Status</th>
              <th class="th-action">Tindakan</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="7" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="7" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="7" class="td-empty">Tidak ada catatan {{ pageTitle.toLowerCase() }} yang ditemukan.</td></tr>
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
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }" @click.stop>
                          <button class="dropdown-item" @click="openViewModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Melihat
                          </button>
                          <button v-if="r.status === 'RPAP'" class="dropdown-item" @click="openEditModal(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Sunting
                          </button>
                          <button v-if="r.status === 'RPAP'" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r); closeDropdown()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Menghapus
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

        <!-- ══ TABLE FOOTER: PAGE SIZE + PAGINATION ══ -->
        <div class="table-footer">
          <div class="footer-left">
            <label class="page-size">
              Tampilkan
              <select :value="pageSize" @change="changePageSize($event.target.value)">
                <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              per halaman
            </label>
            <span class="total-info">Menampilkan {{ rangeStart }} sampai {{ rangeEnd }} dari {{ totalRows.toLocaleString('id-ID') }} data</span>
          </div>

          <div class="pagination">
            <button class="page-btn page-btn--text" :disabled="currentPage === 1 || loading" @click="goPage(1)">Awal</button>
            <button class="page-btn" :disabled="currentPage === 1 || loading" @click="goPage(currentPage - 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <template v-for="p in pageNumbers" :key="String(p) + '-' + currentPage">
              <span v-if="p === '...'" class="page-ellipsis">…</span>
              <button v-else :class="['page-btn', Number(p) === currentPage ? 'page-btn--active' : '']" :disabled="loading" @click="goPage(Number(p))">{{ p }}</button>
            </template>
            <button class="page-btn" :disabled="currentPage >= totalPages || loading" @click="goPage(currentPage + 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="page-btn page-btn--text" :disabled="currentPage >= totalPages || loading" @click="goPage(totalPages)">Akhir</button>
          </div>
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
                <span>{{ pageTitle }}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Sunting' : 'Buat' }} {{ pageTitle }}</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Sunting' : 'Buat' }} {{ pageTitle }}</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Status bar -->
          <div class="pay-statusbar">
            <span class="pay-statusbar-item">
              <span class="pay-statusbar-label">Status:</span>
              <span class="pay-statusbar-val pay-statusbar-val--status">{{ isEdit ? payStatusLabel(form.status) : 'Menunggu Diproses' }}</span>
            </span>
            <span class="pay-statusbar-sep">|</span>
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Jumlah:</span><span class="pay-statusbar-val">{{ formatCurrency(form.amount || 0) }}</span></span>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', activeFormTab === 'header' ? 'modal-tab--active' : '']" @click="activeFormTab = 'header'">Header</button>
            <button :class="['modal-tab', activeFormTab === 'detail' ? 'modal-tab--active' : '']" @click="switchToDetailTab" :disabled="!savedPaymentId && !isEdit">Detail / G/L Item</button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- ── Header Tab ── -->
            <div v-if="activeFormTab === 'header'">
              <div class="form-grid-3">

                <div class="form-group">
                  <label>Organisasi</label>
                  <input value="XYZ" class="form-input" disabled />
                </div>
                <div class="form-group">
                  <label>Tipe Dokumen</label>
                  <input :value="docTypeLabel" class="form-input" disabled />
                </div>
                <div class="form-group">
                  <label>No. Dokumen</label>
                  <input v-model="form.documentNo" class="form-input" placeholder="Dibuat otomatis" disabled />
                </div>

                <div class="form-group">
                  <label>Tanggal <span class="req">*</span></label>
                  <input v-model="form.paymentDate" type="date" class="form-input" />
                </div>
                <div class="form-group form-group--full">
                  <label>{{ partnerLabel }}</label>
                  <div class="acc-wrap">
                    <input
                      v-model="partnerSearch"
                      class="acc-input"
                      placeholder="Cari partner bisnis (opsional)..."
                      :disabled="isEdit"
                      @input="onPartnerSearch"
                      @focus="showPartnerDrop = true"
                      @blur="onPartnerBlur"
                    />
                    <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    <ul v-if="showPartnerDrop && filteredPartners.length" class="acc-dropdown">
                      <li v-for="p in filteredPartners" :key="p.id" class="acc-opt" @mousedown.prevent="selectPartner(p)">{{ p.name }}</li>
                    </ul>
                    <ul v-else-if="showPartnerDrop && partnerSearch.length > 1 && !partnerLoading" class="acc-dropdown">
                      <li class="acc-empty">Partner bisnis tidak ditemukan</li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label>Metode Pembayaran <span class="req">*</span></label>
                  <select v-model="form.paymentMethod" class="form-input">
                    <option value="">Pilih</option>
                    <option v-for="m in paymentMethods" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ accountLabel }} <span class="req">*</span></label>
                  <select v-model="form.financialAccount" class="form-input">
                    <option value="">Pilih</option>
                    <option v-for="a in financialAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Mata Uang</label>
                  <input value="IDR" class="form-input" disabled />
                </div>

                <div class="form-group">
                  <label>No. Referensi</label>
                  <input v-model="form.referenceNo" class="form-input" placeholder="No. Referensi" />
                </div>

              </div>

              <div v-if="!isEdit && !savedPaymentId" class="info-box info-box--blue" style="margin-top:16px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Simpan header terlebih dahulu, lalu buka tab <strong>Detail / G/L Item</strong> untuk menambahkan baris G/L Item.
              </div>
              <div v-if="savedPaymentId && !isEdit" class="info-box info-box--green" style="margin-top:16px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Header tersimpan. Buka tab <strong>Detail / G/L Item</strong> untuk melanjutkan.
              </div>
            </div>

            <!-- ── Detail Tab ── -->
            <div v-if="activeFormTab === 'detail'">

              <div class="pay-detail-summary">
                <div class="pay-ds-item">
                  <span class="pay-ds-label">No. Dokumen</span>
                  <span class="pay-ds-val mono">{{ form.documentNo || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">No. Referensi</span>
                  <span class="pay-ds-val">{{ form.referenceNo || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Mata Uang</span>
                  <span class="pay-ds-val">IDR</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">{{ partnerLabel }}</span>
                  <span class="pay-ds-val">{{ partnerSearch || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Metode Pembayaran</span>
                  <span class="pay-ds-val">{{ selectedPaymentMethodName }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">Tanggal</span>
                  <span class="pay-ds-val">{{ form.paymentDate || '—' }}</span>
                </div>
                <div class="pay-ds-item">
                  <span class="pay-ds-label">{{ accountLabel }}</span>
                  <span class="pay-ds-val">{{ selectedFinAccName }}</span>
                </div>
                <div class="pay-ds-item pay-ds-item--amount">
                  <span class="pay-ds-label">Total Jumlah</span>
                  <span class="pay-ds-val pay-ds-val--amount">{{ formatCurrency(totalGLAmount) }}</span>
                </div>
              </div>

              <div class="section-divider" style="margin-top:16px">
                <span>G/L Item Lines</span>
                <button class="btn-add-line" @click="addGLLine" :disabled="glItemsLoading">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Tambah Detail
                </button>
              </div>

              <div v-if="glItemsLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>

              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>G/L Item <span class="req">*</span></th>
                    <th style="min-width:280px">Keterangan</th>
                    <th style="text-align:right;min-width:150px">Jumlah <span class="req">*</span></th>
                    <th style="width:44px"></th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="glItemLines.length === 0">
                      <td colspan="4" class="td-empty" style="font-style:italic;color:var(--text-muted)">Belum ada Detail. Klik "Tambah Detail".</td>
                    </tr>
                    <tr v-else v-for="(line, idx) in glItemLines" :key="line._key" class="tr-data">
                      <td style="padding:6px 12px;min-width:200px">
                        <select
                          v-model="line.glItemId"
                          class="form-input"
                          style="height:34px;font-size:12.5px"
                          @change="line.glItemName = glItems.find(g => g.id === line.glItemId)?.name || ''"
                        >
                          <option value="">— Pilih G/L Item —</option>
                          <option v-for="g in glItems" :key="g.id" :value="g.id">{{ g.name }}</option>
                        </select>
                      </td>
                      <td style="padding:6px 12px">
                        <input v-model="line.description" class="form-input" style="height:34px;font-size:12.5px" placeholder="Keterangan..." />
                      </td>
                      <td style="padding:6px 12px;text-align:right">
                        <input
                          type="number" min="0" step="1"
                          v-model.number="line.amount"
                          class="form-input actual-pay-input"
                          style="width:140px"
                          @focus="$event.target.select()"
                        />
                      </td>
                      <td style="padding:6px 8px;text-align:center">
                        <button @click="removeGLLine(idx)" style="background:none;border:none;cursor:pointer;color:var(--danger);display:flex;align-items:center;padding:4px">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="pay-detail-footer">
                <div class="totals-block" style="margin-top:0">
                  <div class="totals-row"><span>Jumlah Detail</span><span>{{ glItemLines.filter(l => l.glItemId && l.amount > 0).length }} Detail valid</span></div>
                  <div class="totals-row totals-row--grand"><span>Total {{ pageTitle }}</span><span>{{ formatCurrency(totalGLAmount) }}</span></div>
                </div>
                <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
                  <button class="btn btn--ghost" @click="closeFormModal">Batal</button>
                  <button class="btn btn--primary" :disabled="paying || totalGLAmount <= 0" @click="processPayment">
                    <span v-if="paying" class="spinner"></span>
                    {{ paying ? 'Memproses...' : 'Selesai' }}
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
            <button class="btn btn--ghost" @click="closeFormModal">{{ activeFormTab === 'detail' ? 'Tutup' : 'Batal' }}</button>
            <button v-if="activeFormTab === 'header'" class="btn btn--primary" :disabled="saving" @click="saveHeader">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Menyimpan...' : (isEdit ? 'Update' : 'Simpan Header') }}
            </button>
            <button v-if="activeFormTab === 'header' && (savedPaymentId || isEdit)" class="btn btn--secondary" @click="switchToDetailTab">
              Lanjut: Tambah Detail →
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
                <span>{{ pageTitle }}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">Lihat {{ pageTitle }}</span>
              </div>
              <div class="modal-title">{{ pageTitle }} — {{ viewRow?.documentNo }}</div>
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
            <span class="pay-statusbar-item"><span class="pay-statusbar-label">Jumlah:</span><span class="pay-statusbar-val">{{ formatCurrency(viewRow?.amount ?? 0) }}</span></span>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button :class="['modal-tab', viewTab === 'lines' ? 'modal-tab--active' : '']" @click="viewTab = 'lines'">Detail</button>
            <button :class="['modal-tab', viewTab === 'header' ? 'modal-tab--active' : '']" @click="viewTab = 'header'">Header</button>
            <button :class="['modal-tab', viewTab === 'accounting' ? 'modal-tab--active' : '']" @click="switchToAccounting">Accounting</button>
          </div>

          <div class="modal-body" v-if="viewRow">

            <!-- ── Lines Tab ── -->
            <div v-if="viewTab === 'lines'">
              <div class="section-divider" style="margin-top:0">
                <span>Detail G/L Item</span>
              </div>

              <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th>G/L Item</th>
                    <th>Keterangan</th>
                    <th>Partner Bisnis</th>
                    <th style="text-align:right">Jumlah</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length === 0"><td colspan="4" class="td-empty">Tidak ada data.</td></tr>
                    <tr v-else v-for="line in viewLines" :key="line.id" class="tr-data">
                      <td>{{ parseIdentifier(line.glItemName) }}</td>
                      <td class="td-secondary">{{ line.description || '—' }}</td>
                      <td class="td-secondary">{{ parseIdentifier(line.businessPartnerName) || bpName(viewRow) }}</td>
                      <td style="text-align:right;font-weight:600;color:var(--text-primary)">{{ formatCurrency(line.amount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="viewLines.length > 0" class="totals-block">
                <div class="totals-row totals-row--grand">
                  <span>Total</span>
                  <span>{{ formatCurrency(viewLines.reduce((s,l) => s+(Number(l.amount)||0), 0)) }}</span>
                </div>
              </div>
            </div>

            <!-- ── Header Tab ── -->
            <div v-if="viewTab === 'header'">
              <div class="detail-grid" style="margin-top:8px">
                <div class="detail-item"><span class="detail-label">No. Dokumen</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Tanggal</span><span class="detail-value">{{ formatDate(viewRow.paymentDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', payStatusClass(viewRow.status)]">{{ payStatusLabel(viewRow.status) }}</span></div>
                <div class="detail-item"><span class="detail-label">{{ partnerLabel }}</span><span class="detail-value">{{ bpName(viewRow) }}</span></div>
                <div class="detail-item"><span class="detail-label">Metode Pembayaran</span><span class="detail-value">{{ parseIdentifier(viewRow['paymentMethod$_identifier']) }}</span></div>
                <div class="detail-item"><span class="detail-label">{{ accountLabel }}</span><span class="detail-value">{{ parseIdentifier(viewRow['account$_identifier']) }}</span></div>
                <div class="detail-item"><span class="detail-label">Mata Uang</span><span class="detail-value">IDR</span></div>
                <div class="detail-item"><span class="detail-label">Jumlah</span><span class="detail-value" style="font-weight:700">{{ formatCurrency(viewRow.amount) }}</span></div>
                <div class="detail-item"><span class="detail-label">No. Referensi</span><span class="detail-value">{{ viewRow.referenceNo || '—' }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Deskripsi</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
              </div>
            </div>

            <!-- ── Accounting Tab ── -->
            <div v-if="viewTab === 'accounting'">
              <div v-if="accountingLoading" class="td-empty" style="padding:40px">
                <div class="loading-dots"><span></span><span></span><span></span></div>
              </div>
              <div v-else-if="accountingError" class="form-api-error" style="margin-top:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ accountingError }}
              </div>
              <div v-else>
                <div v-if="accountingFacts.length === 0" class="td-empty" style="padding:40px">Tidak ada entri akuntansi yang ditemukan.</div>
                <div v-else>
                  <div class="acc-summary-grid">
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Tanggal</span>
                      <span class="acc-summary-value">{{ formatDate(viewRow.paymentDate) }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">No. Dokumen</span>
                      <span class="acc-summary-value">{{ accountingFacts[0]?.['journalEntry$_identifier'] || viewRow.documentNo || '—' }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Total Debet</span>
                      <span class="acc-summary-value acc-summary-value--debit">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.debit || 0), 0)) }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Total Kredit</span>
                      <span class="acc-summary-value acc-summary-value--credit">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.credit || 0), 0)) }}</span>
                    </div>
                  </div>
                  <div class="table-wrap" style="margin-bottom:0">
                    <table class="table">
                      <thead><tr>
                        <th>COA</th>
                        <th>Nama</th>
                        <th>Deskripsi</th>
                        <th>Periode</th>
                        <th style="text-align:right">Debit</th>
                        <th style="text-align:right">Kredit</th>
                        <th>Tipe</th>
                      </tr></thead>
                      <tbody>
                        <tr v-for="fact in accountingFacts" :key="fact.id" class="tr-data">
                          <td><span class="acc-code">{{ fact.value || fact['account$_identifier']?.split(' - ')[0] || '—' }}</span></td>
                          <td class="td-secondary">{{ fact.accountingEntryDescription || fact['account$_identifier']?.split(' - ').slice(1).join(' - ') || '—' }}</td>
                          <td class="td-secondary" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ fact.description || '—' }}</td>
                          <td class="td-secondary">{{ fact['period$_identifier'] || '—' }}</td>
                          <td class="td-secondary" style="text-align:right;font-variant-numeric:tabular-nums">
                            <span v-if="fact.debit > 0" class="acc-debit">{{ formatCurrency(fact.debit) }}</span>
                            <span v-else class="td-muted">—</span>
                          </td>
                          <td class="td-secondary" style="text-align:right;font-variant-numeric:tabular-nums">
                            <span v-if="fact.credit > 0" class="acc-credit">{{ formatCurrency(fact.credit) }}</span>
                            <span v-else class="td-muted">—</span>
                          </td>
                          <td>
                            <span :class="['acc-type-badge', fact.postingType === 'A' ? 'acc-type--actual' : 'acc-type--other']">
                              {{ fact.postingType === 'A' ? 'Actual' : (fact.postingType || '—') }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="acc-totals-row">
                          <td colspan="4" style="text-align:right;font-size:12px;font-weight:600;color:var(--text-muted);padding:10px 16px">TOTAL</td>
                          <td style="text-align:right;padding:10px 16px;font-weight:700;color:var(--text-primary)">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.debit || 0), 0)) }}</td>
                          <td style="text-align:right;padding:10px 16px;font-weight:700;color:var(--text-primary)">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.credit || 0), 0)) }}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal = false">Tutup</button>
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
            <div class="modal-title">Hapus {{ pageTitle }}</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Apakah Anda yakin ingin menghapus <strong>{{ deleteTarget?.documentNo }}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            <div v-if="deleteError" class="form-api-error" style="margin-top:10px">{{ deleteError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showDeleteModal = false">Batal</button>
            <button class="btn btn--danger" :disabled="deleting" @click="doDelete">
              <span v-if="deleting" class="spinner"></span>
              {{ deleting ? 'Menghapus...' : 'Hapus' }}
            </button>
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
import { ref, computed, onMounted, watch } from 'vue'
import {
  fetchAllPayments,
  createPaymentHeader,
  updatePaymentHeader,
  deletePaymentHeader,
  searchBusinessPartners,
  fetchFinancialAccounts,
  fetchPaymentMethods,
  fetchGLItemsForPayment,
  fetchPaymentDetail,
  addGLItemPaymentDetail,
  finalizePaymentAmount,
  createFinaccTransaction,
  fetchPaymentLines,
  fetchAccountingFacts,
  DEFAULT_ORGANIZATION,
  DEFAULT_CURRENCY,
  DEFAULT_FIN_ACCOUNT_ID,
  DEFAULT_PAYMETHOD_ID,
} from '@/services/cashbank.js'

// ── props: 'in' (Cashbank Masuk / receipt) atau 'out' (Cashbank Keluar / payment)
const props = defineProps({
  type: { type: String, default: 'in' }, // 'in' | 'out'
})
const isReceipt = computed(() => props.type !== 'out')

const pageTitle          = computed(() => isReceipt.value ? 'Kas/Bank Masuk' : 'Kas/Bank Keluar')
const docTypeLabel       = computed(() => isReceipt.value ? 'AR Receipt' : 'AP Payment')
const partnerLabel       = computed(() => isReceipt.value ? 'Diterima Dari (Opsional)' : 'Bayar Ke (Opsional)')
const accountLabel       = computed(() => isReceipt.value ? 'Disimpan Ke' : 'Dibayarkan Dari')
const accountColumnLabel = computed(() => isReceipt.value ? 'Disimpan Ke' : 'Dibayarkan Dari')

// ── directive
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._handler, true)
  },
  unmounted(el) { document.removeEventListener('click', el._handler, true) },
}

const PAGE_SIZE_DEFAULT = 20
const pageSizeOptions = [10, 20, 50, 100]

// ── table state
const rows        = ref([])
const loading     = ref(false)
const error       = ref('')
const currentPage = ref(1)
const pageSize    = ref(PAGE_SIZE_DEFAULT)
const totalRows   = ref(0)
const searchQuery = ref('')
let   searchTimer = null

// ── dropdown
const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

// ── lookups
const paymentMethods    = ref([])
const financialAccounts = ref([])

// ── form state
const showFormModal  = ref(false)
const isEdit         = ref(false)
const editId         = ref(null)
const savedPaymentId = ref(null)
const activeFormTab  = ref('header')
const saving         = ref(false)
const formError      = ref('')

const emptyForm = () => ({
  documentNo:       '',
  paymentDate:      today(),
  businessPartner:  '',
  paymentMethod:    DEFAULT_PAYMETHOD_ID,
  financialAccount: DEFAULT_FIN_ACCOUNT_ID,
  referenceNo:      '',
  description:      'GL Item',
  status:           'RPAP',
  amount:           0,
})
const form = ref(emptyForm())

// ── partner search (opsional)
const partnerSearch    = ref('')
const filteredPartners = ref([])
const showPartnerDrop  = ref(false)
const partnerLoading   = ref(false)
let   partnerTimer     = null

// ── detail tab
const paying = ref(false)

// ── GL Item lines
const glItems        = ref([])
const glItemsLoaded  = ref(false)
const glItemsLoading = ref(false)
const glItemLines    = ref([])

function emptyGLItemLine() {
  return { _key: Date.now() + Math.random(), glItemId: '', glItemName: '', amount: 0, description: '' }
}
async function loadGLItems() {
  glItemsLoading.value = true
  try {
    glItems.value       = await fetchGLItemsForPayment()
    glItemsLoaded.value = true
  } catch (e) {
    console.warn('[Cashbank] loadGLItems failed:', e.message)
  } finally { glItemsLoading.value = false }
}
function addGLLine() { glItemLines.value.push(emptyGLItemLine()) }
function removeGLLine(idx) { glItemLines.value.splice(idx, 1) }
const totalGLAmount = computed(() => glItemLines.value.reduce((s, l) => s + (Number(l.amount) || 0), 0))

// ── view modal
const showViewModal    = ref(false)
const viewRow          = ref(null)
const viewTab          = ref('lines')
const viewLines        = ref([])
const viewLinesLoading = ref(false)

// ── accounting tab (view modal)
const accountingFacts   = ref([])
const accountingLoading = ref(false)
const accountingError   = ref('')

// ── delete modal
const showDeleteModal = ref(false)
const deleteTarget    = ref(null)
const deleting        = ref(false)
const deleteError     = ref('')

// ── toast
const toast = ref({ show: false, type: 'success', message: '' })

// ── computed
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))
const rangeStart  = computed(() => rows.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const rangeEnd    = computed(() => (currentPage.value - 1) * pageSize.value + rows.value.length)
const pageNumbers = computed(() => {
  const tp = totalPages.value, cp = currentPage.value, pages = []
  if (tp <= 1) return [1]
  if (tp <= 7) { for (let i = 1; i <= tp; i++) pages.push(i); return pages }
  pages.push(1)
  if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...')
  pages.push(tp)
  return pages
})
const selectedPaymentMethodName = computed(() => {
  const m = paymentMethods.value.find(m => m.id === form.value.paymentMethod)
  return m?.name || 'Transfer'
})
const selectedFinAccName = computed(() => {
  const a = financialAccounts.value.find(a => a.id === form.value.financialAccount)
  return a?.name || 'Bank - IDR'
})

// ── helpers
function today() { return new Date().toISOString().slice(0, 10) }
function formatDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatCurrency(v) {
  if (v == null || v === '') return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
}
function bpName(r) {
  const id = r?.['businessPartner$_identifier'] || ''
  if (!id) return '—'
  const sepIdx = id.indexOf(' - ')
  return sepIdx >= 0 ? id.slice(sepIdx + 3) : id
}
function parseIdentifier(id) {
  if (!id) return '—'
  const sepIdx = id.indexOf(' - ')
  return sepIdx >= 0 ? id.slice(sepIdx + 3) : id
}
function payStatusClass(s) {
  const map = { RPAP: 'status-awaiting', RPPC: 'status-complete', RDNC: 'status-complete', RPVD: 'status-void', RPAE: 'status-error' }
  return map[s] || 'status-draft'
}
function payStatusLabel(s) {
  const map = {
    RPAP: 'Menunggu Diproses',
    RPPC: 'Selesai Diproses',
    RDNC: 'Disetor Belum Kliring',
    RPVD: 'Dibatalkan',
    RPAE: 'Menunggu Eksekusi',
  }
  return map[s] || s || '—'
}
function showToast(msg, type = 'success') {
  toast.value = { show: true, type, message: msg }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ── load rows
async function loadRows() {
  loading.value = true; error.value = ''
  try {
    const startRow = (currentPage.value - 1) * pageSize.value
    const res = await fetchAllPayments({ startRow, pageSize: pageSize.value, searchKey: searchQuery.value, receipt: isReceipt.value })
    rows.value = res.data ?? []
    const tr = res.totalRows ?? res.total ?? res.count ?? null
    if (tr !== null && !isNaN(Number(tr))) {
      totalRows.value = Number(tr)
    } else {
      const fetched = rows.value.length
      totalRows.value = fetched === pageSize.value ? startRow + fetched + 1 : startRow + fetched
    }
    if (rows.value.length === 0 && currentPage.value > 1) {
      currentPage.value = 1
      const res2 = await fetchAllPayments({ startRow: 0, pageSize: pageSize.value, searchKey: searchQuery.value, receipt: isReceipt.value })
      rows.value = res2.data ?? []
      const tr2 = res2.totalRows ?? res2.total ?? res2.count ?? null
      totalRows.value = tr2 !== null && !isNaN(Number(tr2)) ? Number(tr2) : rows.value.length
    }
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}

async function loadLookups() {
  try {
    const [methods, accounts] = await Promise.all([fetchPaymentMethods(), fetchFinancialAccounts()])
    paymentMethods.value    = methods
    financialAccounts.value = accounts
  } catch (e) { console.warn('Lookup load failed', e.message) }
}

// ── pagination / search
async function goPage(p) {
  if (p < 1) return
  currentPage.value = p
  await loadRows()
  if (rows.value.length === 0 && p > 1) {
    currentPage.value = p - 1
    await loadRows()
  }
}
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage.value = 1; loadRows() }, 400) }
function changePageSize(size) {
  pageSize.value = Number(size)
  currentPage.value = 1
  loadRows()
}

// ── dropdown
function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id
  const btn = e.currentTarget.getBoundingClientRect()
  dropdownPos.value = { top: btn.bottom + 4, right: window.innerWidth - btn.right }
}
function closeDropdown() { openDropdown.value = null }

// ── partner search (opsional)
function onPartnerSearch() {
  showPartnerDrop.value = true
  clearTimeout(partnerTimer)
  if (partnerSearch.value.length < 2) { filteredPartners.value = []; return }
  partnerLoading.value = true
  partnerTimer = setTimeout(async () => {
    try { filteredPartners.value = await searchBusinessPartners(partnerSearch.value, isReceipt.value) }
    catch { filteredPartners.value = [] }
    finally { partnerLoading.value = false }
  }, 300)
}
function onPartnerBlur() { setTimeout(() => { showPartnerDrop.value = false }, 200) }
function selectPartner(p) {
  form.value.businessPartner = p.id
  partnerSearch.value = p.name
  showPartnerDrop.value = false
  filteredPartners.value = []
}

// ── open modals
function openCreateModal() {
  isEdit.value = false; editId.value = null; savedPaymentId.value = null
  activeFormTab.value = 'header'; formError.value = ''
  form.value = emptyForm()
  partnerSearch.value = ''; filteredPartners.value = []
  glItemLines.value = [emptyGLItemLine()]
  showFormModal.value = true
}

function openEditModal(r) {
  isEdit.value = true; editId.value = r.id; savedPaymentId.value = r.id
  activeFormTab.value = 'header'; formError.value = ''
  form.value = {
    documentNo:       r.documentNo || '',
    paymentDate:      r.paymentDate?.slice(0, 10) || today(),
    businessPartner:  typeof r.businessPartner === 'object' ? r.businessPartner?.id : r.businessPartner,
    paymentMethod:    typeof r.paymentMethod === 'object' ? r.paymentMethod?.id : (r.paymentMethod || DEFAULT_PAYMETHOD_ID),
    financialAccount: typeof r.financialAccount === 'object' ? r.financialAccount?.id : (r.financialAccount || DEFAULT_FIN_ACCOUNT_ID),
    referenceNo:      r.referenceNo || '',
    description:      r.description || 'GL Item',
    status:           r.status || 'RPAP',
    amount:           r.amount || 0,
  }
  const bpIdentifier = r['businessPartner$_identifier'] || ''
  const sepIdx = bpIdentifier.indexOf(' - ')
  partnerSearch.value = sepIdx >= 0 ? bpIdentifier.slice(sepIdx + 3) : bpIdentifier
  glItemLines.value = [emptyGLItemLine()]
  showFormModal.value = true
}

function openViewModal(r) {
  viewRow.value = { ...r }
  viewTab.value = 'lines'
  viewLines.value = []; viewLinesLoading.value = false
  accountingFacts.value = []; accountingError.value = ''
  showViewModal.value = true
  loadViewLines(r.id)
}

async function switchToAccounting() {
  viewTab.value = 'accounting'
  if (accountingFacts.value.length > 0 || accountingLoading.value) return
  accountingLoading.value = true; accountingError.value = ''
  try {
    accountingFacts.value = await fetchAccountingFacts(viewRow.value.id)
  } catch (e) {
    accountingError.value = e.message || 'Gagal memuat data akuntansi.'
  } finally { accountingLoading.value = false }
}

async function loadViewLines(paymentId) {
  viewLinesLoading.value = true
  try { viewLines.value = await fetchPaymentLines(paymentId) }
  catch (e) { console.error('Load lines failed', e.message); viewLines.value = [] }
  finally { viewLinesLoading.value = false }
}

// ── save header
async function saveHeader() {
  formError.value = ''
  if (!form.value.paymentDate)      { formError.value = 'Tanggal wajib diisi.'; return }
  if (!form.value.paymentMethod)    { formError.value = 'Metode Pembayaran wajib diisi.'; return }
  if (!form.value.financialAccount) { formError.value = accountLabel.value + ' wajib diisi.'; return }

  saving.value = true
  try {
    if (isEdit.value) {
      await updatePaymentHeader(editId.value, form.value)
      showToast('Header berhasil diupdate.')
    } else {
      const result = await createPaymentHeader(form.value, isReceipt.value)
      savedPaymentId.value = result.id
      form.value.documentNo = result.documentNo || ''
      showToast('Header tersimpan. Lanjutkan ke tab Detail.')
    }
  } catch (e) {
    formError.value = e.message || 'Gagal menyimpan header.'
  } finally { saving.value = false }
}

// ── switch to detail tab
function switchToDetailTab() {
  if (!savedPaymentId.value && !isEdit.value) { formError.value = 'Simpan header terlebih dahulu.'; return }
  formError.value = ''; activeFormTab.value = 'detail'
  if (!glItemsLoaded.value) loadGLItems()
}

// ── process payment
async function processPayment() {
  formError.value = ''; paying.value = true

  const paymentId = savedPaymentId.value || editId.value
  const bpId      = typeof form.value.businessPartner === 'object' ? form.value.businessPartner?.id : form.value.businessPartner
  const orgId     = DEFAULT_ORGANIZATION
  const finAccId  = form.value.financialAccount || DEFAULT_FIN_ACCOUNT_ID
  const payDate   = form.value.paymentDate

  try {
    const validLines = glItemLines.value.filter(l => l.glItemId && Number(l.amount) > 0)
    if (validLines.length === 0) { formError.value = 'Tambahkan minimal 1 Detail G/L Item dengan jumlah > 0.'; paying.value = false; return }

    const payDetail   = await fetchPaymentDetail(paymentId)
    const payDetailId = payDetail?.id || null

    for (const line of validLines) {
      await addGLItemPaymentDetail(
        payDetailId,
        line.glItemId,
        Number(line.amount),
        bpId || null,
        orgId,
        line.description || null,
        paymentId,
      )
    }

    const totalAmt        = validLines.reduce((s, l) => s + Number(l.amount), 0)
    const glItemNames     = validLines.filter(l => l.glItemName).map(l => l.glItemName)
    const autoDescription = glItemNames.length ? `GL Item: ${glItemNames.join(', ')}` : 'GL Item'

    await updatePaymentHeader(paymentId, {
      ...form.value,
      amount:           totalAmt,
      status:           isReceipt.value ? 'RDNC' : 'RPPC',
      processed:        true,
      processProcedure: 'P',
      description:      autoDescription,
    }).catch(e => console.warn('[processPayment] Update header gagal:', e.message))

    form.value.amount = totalAmt
    form.value.status = isReceipt.value ? 'RDNC' : 'RPPC'
    form.value.description = autoDescription

    await finalizePaymentAmount(paymentId, totalAmt, isReceipt.value)
      .catch(e => console.warn('[processPayment] finalizePaymentAmount gagal:', e.message))

    await createFinaccTransaction({
      paymentId,
      financialAccountId: finAccId,
      paymentDate:        payDate,
      amount:             totalAmt,
      businessPartnerId:  bpId || null,
      organizationId:     orgId,
      currencyId:         DEFAULT_CURRENCY,
      description:        autoDescription,
      receipt:            isReceipt.value,
    }).catch(e => console.warn('[processPayment] FIN_Finacc_Transaction gagal:', e.message))

    showFormModal.value = false
    savedPaymentId.value = null
    showToast(`${pageTitle.value} berhasil diproses!`)
    await loadRows()
  } catch (e) {
    formError.value = e.message
  } finally { paying.value = false }
}

// ── close form modal
function closeFormModal() {
  if (saving.value || paying.value) return
  const hadChanges = !!savedPaymentId.value
  showFormModal.value = false
  savedPaymentId.value = null
  if (hadChanges || isEdit.value) loadRows()
}

// ── delete
function confirmDelete(r) {
  deleteTarget.value = { ...r }; deleteError.value = ''
  showDeleteModal.value = true
}
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try {
    await deletePaymentHeader(deleteTarget.value.id)
    showDeleteModal.value = false
    showToast(`${pageTitle.value} berhasil dihapus.`)
    await loadRows()
  } catch (e) {
    deleteError.value = e.message || 'Gagal menghapus.'
  } finally { deleting.value = false }
}

// ── reset & reload when switching between Cashbank In/Out (kalau digabung 1 route nanti)
watch(() => props.type, () => {
  currentPage.value = 1; searchQuery.value = ''
  loadRows()
})

onMounted(() => { loadRows(); loadLookups() })
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
.main { flex: 1; padding: 28px 24px; max-width: 1280px; margin: 0 auto; width: 100%; }
.content-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }

.page-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
.search-wrap { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: var(--text-muted); pointer-events: none; }
.search-input { height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: var(--font); background: var(--surface2); width: 260px; transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font); transition: all .15s; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: #2563eb; }
.btn--secondary { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.btn--secondary:hover:not(:disabled) { background: #bae6fd; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover:not(:disabled) { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; }
.btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn:disabled { opacity: .5; cursor: not-allowed; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.th-action { text-align: right; width: 80px; }
.table tbody tr td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.tr-data:hover { background: var(--surface2); }
.tr-data:last-child td { border-bottom: none; }

.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name { font-weight: 500; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px 16px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }

.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-awaiting { background: #fef9c3; color: #854d0e; }
.status-complete  { background: #dcfce7; color: #15803d; }
.status-void      { background: #f1f5f9; color: #64748b; }
.status-error     { background: #fee2e2; color: var(--danger); }
.status-draft     { background: #f1f5f9; color: #64748b; }

.action-group { display: flex; gap: 4px; justify-content: flex-end; align-items: center; }
.action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; transition: background .12s; font-family: var(--font); }
.action-btn--more { background: var(--surface2); color: var(--text-secondary); padding: 5px 8px; }
.action-btn--more:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 160px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: #fff1f2; }

.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

.table-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 20px; background: var(--bg); flex-wrap: wrap; }
.table-footer .pagination { padding: 0; }
.footer-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-size { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.page-size select { font-family: var(--font); font-size: 13px; font-weight: 500; color: var(--text-primary); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,.1); background: var(--surface); cursor: pointer; outline: none; }
.page-size select:focus { border-color: var(--accent); }
.total-info { font-size: 13px; color: var(--text-secondary); }
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn--text { width: auto; padding: 0 12px; }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-ellipsis { color: var(--text-muted); padding: 0 4px; font-size: 13px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xl { max-width: 900px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); padding: 0 20px; flex-shrink: 0; }
.modal-tab { padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all .15s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.modal-tab:disabled { opacity: .4; cursor: not-allowed; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; align-items: center; }

.pay-statusbar { display: flex; align-items: center; gap: 10px; padding: 8px 20px; background: #f8fafc; border-bottom: 1px solid var(--border); font-size: 12px; flex-wrap: wrap; flex-shrink: 0; }
.pay-statusbar-item { display: flex; align-items: center; gap: 4px; }
.pay-statusbar-label { color: var(--text-muted); font-weight: 500; }
.pay-statusbar-val { color: var(--text-primary); font-weight: 600; }
.pay-statusbar-val--status { color: #854d0e; background: #fef9c3; padding: 1px 8px; border-radius: 12px; font-size: 11px; }
.pay-statusbar-sep { color: var(--border); font-size: 16px; }

.pay-detail-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; }
.pay-ds-item { display: flex; flex-direction: column; gap: 3px; }
.pay-ds-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.pay-ds-val { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.pay-ds-val.mono { font-family: var(--font-mono); font-size: 12px; }
.pay-ds-val--amount { font-weight: 700; font-size: 15px; color: #dc2626; }

.pay-detail-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); }

.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input:disabled { opacity: .6; background: #f1f5f9; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; }
.acc-opt:hover { background: var(--accent-light); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover:not(:disabled) { background: #dbeafe; }
.btn-add-line:disabled { opacity: .4; cursor: not-allowed; }

.info-box { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12.5px; }
.info-box--blue   { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
.info-box--green  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
.info-box--yellow { background: #fefce8; border: 1px solid #fef08a; color: #854d0e; }
.info-box--red    { background: #fff1f2; border: 1px solid #fecaca; color: var(--danger); }

.totals-block { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.totals-row { display: flex; justify-content: space-between; gap: 48px; font-size: 13px; color: var(--text-secondary); min-width: 260px; }
.totals-row--grand { font-weight: 700; font-size: 14px; color: var(--text-primary); border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); }
.delete-text strong { color: var(--text-primary); }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error   { background: var(--danger); color: #fff; }

.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.spinner--dark { border-color: rgba(37,99,235,.3); border-top-color: var(--accent); }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }

.actual-pay-input { width: 120px; text-align: right; padding: 0 8px; }

/* Accounting */
.acc-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
.acc-summary-item { display: flex; flex-direction: column; gap: 4px; }
.acc-summary-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.acc-summary-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.acc-summary-value--debit  { color: #2563eb; }
.acc-summary-value--credit { color: #16a34a; }
.acc-code { font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; color: var(--text-primary); }
.acc-debit  { color: #2563eb; font-weight: 600; }
.acc-credit { color: #16a34a; font-weight: 600; }
.acc-type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.acc-type--actual { background: #eff6ff; color: #1d4ed8; }
.acc-type--other  { background: var(--surface2); color: var(--text-muted); }
.acc-totals-row { background: var(--surface2); border-top: 2px solid var(--border); }
.acc-totals-row td { border-bottom: none !important; }
.td-muted { color: var(--text-muted); }
</style>
