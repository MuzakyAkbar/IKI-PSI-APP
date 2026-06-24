<template>
  <div class="layout">
    <main class="main">
      <div class="content-card">

        <div class="page-header">
          <h2 class="page-title">Penerimaan Barang (Good Receipt)</h2>
        </div>

        <!-- ══ TOOLBAR ══ -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" class="search-input" placeholder="Cari nomor dokumen atau vendor..." @input="onSearch" />
          </div>
          <button class="btn btn--primary" @click="openCreateModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Buat Good Receipt
          </button>
        </div>

        <!-- ══ TABLE ══ -->
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th class="sortable" :class="sortClass('documentNo')" @click="toggleSort('documentNo')">No. Dokumen</th>
              <th class="sortable" :class="sortClass('movementDate')" @click="toggleSort('movementDate')">Tgl. Penerimaan</th>
              <th class="sortable" :class="sortClass('businessPartner.name')" @click="toggleSort('businessPartner.name')">Vendor</th>
              <th>Gudang</th>
              <th class="sortable" :class="sortClass('documentStatus')" @click="toggleSort('documentStatus')">Status</th>
              <th class="th-action">Tindakan</th>
            </tr></thead>
            <tbody>
              <tr v-if="loading"><td colspan="6" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="error"><td colspan="6" class="td-empty td-error">{{ error }}</td></tr>
              <tr v-else-if="rows.length === 0"><td colspan="6" class="td-empty">Tidak ada penerimaan barang ditemukan.</td></tr>
              <template v-else>
                <tr v-for="r in rows" :key="r.id" class="tr-data">
                  <td><span class="code-badge">{{ r.documentNo || '—' }}</span></td>
                  <td class="td-secondary">{{ formatDate(r.movementDate) }}</td>
                  <td class="td-clip td-name">{{ bpName(r['businessPartner$_identifier']) }}</td>
                  <td class="td-secondary">{{ r['warehouse$_identifier'] || '—' }}</td>
                  <td><span :class="['status-pill', statusClass(r.documentStatus)]">{{ statusLabel(r.documentStatus) }}</span></td>
                  <td class="td-action-cell">
                    <div class="action-group">
                      <div class="dropdown-wrap" v-click-outside="closeDropdown">
                        <button class="action-btn action-btn--more" @click.stop="toggleDropdown(r.id, $event)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div v-if="openDropdown === r.id" class="dropdown-menu" :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }" @click.stop>
                          <button class="dropdown-item" @click="openViewModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Lihat
                          </button>
                          <button v-if="r.documentStatus === 'DR'" class="dropdown-item" @click="openEditModal(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
                          </button>
                          <button v-if="r.documentStatus === 'DR'" class="dropdown-item dropdown-item--danger" @click="confirmDelete(r)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Hapus
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
        <div class="modal modal--xxl">

          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Good Receipt</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ isEdit ? 'Sunting' : 'Buat' }} Good Receipt</span>
              </div>
              <div class="modal-title">{{ isEdit ? 'Sunting' : 'Buat' }} Good Receipt</div>
            </div>
            <button class="modal-close" @click="closeFormModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">

            <!-- ── Header Fields ── -->
            <div class="form-grid-4">

              <!-- Vendor (Business Partner) -->
              <div class="form-group">
                <label>Vendor <span class="req">*</span></label>
                <div class="acc-wrap">
                  <input class="acc-input" v-model="form.vendorSearch" placeholder="Cari vendor..."
                    @input="onVendorSearch" @focus="showVendorDrop = true" @blur="onVendorBlur" autocomplete="off" />
                  <svg class="acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <ul v-if="showVendorDrop && vendorOptions.length" class="acc-dropdown">
                    <li v-for="v in vendorOptions" :key="v.id" class="acc-opt" @mousedown.prevent="selectVendor(v)">
                      <span class="acc-opt-code">{{ v.searchKey }}</span> — {{ v.name }}
                    </li>
                  </ul>
                  <li v-if="showVendorDrop && vendorOptions.length === 0 && form.vendorSearch.length > 1" class="acc-dropdown"><span class="acc-empty">Tidak ditemukan</span></li>
                </div>
              </div>

              <!-- Partner Address -->
              <div class="form-group">
                <label>Alamat Mitra <span class="req">*</span></label>
                <select class="form-input" v-model="form.partnerAddress" :disabled="!form.businessPartner">
                  <option value="">— Pilih Alamat —</option>
                  <option v-for="loc in partnerLocations" :key="loc.id" :value="loc.id">{{ loc['locationAddress$_identifier'] || loc.name || loc.id }}</option>
                </select>
              </div>

              <!-- Warehouse -->
              <div class="form-group">
                <label>Gudang <span class="req">*</span></label>
                <select class="form-input" v-model="form.warehouse" @change="onWarehouseChange">
                  <option value="">— Pilih Gudang —</option>
                  <option v-for="wh in warehouses" :key="wh.id" :value="wh.id">{{ wh.name }}</option>
                </select>
              </div>

              <!-- Movement Date -->
              <div class="form-group">
                <label>Tanggal Penerimaan <span class="req">*</span></label>
                <input type="date" class="form-input" v-model="form.movementDate" />
              </div>

              <!-- Accounting Date -->
              <div class="form-group">
                <label>Tanggal Akuntansi</label>
                <input type="date" class="form-input" v-model="form.accountingDate" />
              </div>

              <!-- Order Reference -->
              <div class="form-group">
                <label>Referensi Pesanan</label>
                <input type="text" class="form-input" v-model="form.orderReference" placeholder="No. referensi..." />
              </div>

              <!-- Description -->
              <div class="form-group form-group--full" style="grid-column: 3 / -1;">
                <label>Deskripsi</label>
                <input type="text" class="form-input" v-model="form.description" placeholder="Deskripsi penerimaan barang..." />
              </div>

            </div>

            <!-- ── Lines Section ── -->
            <div class="section-divider" style="margin-top: 24px">
              <span>Item yang Diterima</span>
              <div style="display:flex;gap:8px">
                <!-- Tombol Import dari PO -->
                <button class="btn-import" @click="openImportModal('po')" :disabled="!form.businessPartner">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Dari Purchase Order
                </button>
                <!-- Tombol Import dari Invoice -->
                <button class="btn-import btn-import--inv" @click="openImportModal('invoice')" :disabled="!form.businessPartner">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Dari Vendor Invoice
                </button>
                <!-- Tombol tambah manual -->
                <button class="btn-add-line" @click="addLine">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Tambah Baris
                </button>
              </div>
            </div>

            <div class="table-wrap">
              <table class="table table--lines">
                <thead><tr>
                  <th style="width:46px">#</th>
                  <th>Produk</th>
                  <th style="width:90px">Qty</th>
                  <th style="width:90px">UOM</th>
                  <th>Storage Bin</th>
                  <th style="width:180px">Ref. Order Line</th>
                  <th style="width:36px"></th>
                </tr></thead>
                <tbody>
                  <tr v-if="lines.length === 0">
                    <td colspan="7" class="td-empty" style="padding:20px">
                      Belum ada item. Tambah manual atau import dari PO / Vendor Invoice.
                    </td>
                  </tr>
                  <tr v-for="(ln, idx) in lines" :key="idx">
                    <td class="td-secondary" style="text-align:center">{{ (idx + 1) * 10 }}</td>

                    <!-- Produk -->
                    <td>
                      <div class="acc-wrap">
                        <input class="acc-input acc-input--sm" v-model="ln.productSearch" placeholder="Cari produk..."
                          @input="onProductSearch(idx)" @focus="ln.showDrop = true" @blur="onProductBlur(idx)" autocomplete="off" />
                        <svg class="acc-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        <ul v-if="ln.showDrop && ln.productOptions.length" class="acc-dropdown">
                          <li v-for="p in ln.productOptions" :key="p.id" class="acc-opt" @mousedown.prevent="selectProduct(idx, p)">{{ p.name }}</li>
                        </ul>
                      </div>
                    </td>

                    <!-- Qty -->
                    <td>
                      <input type="number" class="form-input form-input--sm" v-model.number="ln.movementQuantity" min="0" step="1" />
                    </td>

                    <!-- UOM -->
                    <td>
                      <select class="form-input form-input--sm" v-model="ln.uOM">
                        <option value="">UOM</option>
                        <option v-for="u in uoms" :key="u.id" :value="u.id">{{ u.uOMSymbol || u.name }}</option>
                      </select>
                    </td>

                    <!-- Storage Bin -->
                    <td>
                      <select class="form-input form-input--sm" v-model="ln.storageBin">
                        <option value="">— Bin —</option>
                        <option v-for="b in storageBins" :key="b.id" :value="b.id">{{ b.searchKey || b['_identifier'] }}</option>
                      </select>
                    </td>

                    <!-- Ref (dari PO / Invoice) -->
                    <td>
                      <span v-if="ln.sourceRef" class="ref-badge" :title="ln.sourceRef">{{ ln.sourceRef.length > 24 ? ln.sourceRef.slice(0,24) + '…' : ln.sourceRef }}</span>
                      <span v-else class="td-muted" style="font-size:11px">—</span>
                    </td>

                    <!-- Hapus -->
                    <td>
                      <button class="btn-rm-line" @click="removeLine(idx)" title="Hapus baris">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="formError" class="form-api-error" style="margin-top:14px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ formError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeFormModal">Batal</button>
            <button class="btn btn--primary" :disabled="saving" @click="saveReceipt">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? 'Menyimpan...' : 'Simpan Draft' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- IMPORT MODAL (dari PO atau Invoice)                    -->
    <!-- ══════════════════════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="showImportModal" class="modal-overlay" @mousedown.self="showImportModal = false">
        <div class="modal modal--lg">
          <div class="modal-header">
            <div class="modal-title">
              {{ importSource === 'po' ? 'Import dari Purchase Order' : 'Import dari Vendor Invoice' }}
            </div>
            <button class="modal-close" @click="showImportModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">

            <!-- Step 1: Pilih PO / Invoice -->
            <div class="form-group" style="margin-bottom:16px">
              <label>{{ importSource === 'po' ? 'Pilih Purchase Order' : 'Pilih Vendor Invoice' }}</label>
              <select class="form-input" v-model="importDocId" @change="loadImportLines">
                <option value="">— Pilih —</option>
                <option v-for="d in importDocs" :key="d.id" :value="d.id">
                  {{ d.documentNo }} — {{ formatDate(d.orderDate || d.invoiceDate) }} — {{ formatCurrencyShort(d.grandTotalAmount) }}
                </option>
              </select>
            </div>

            <!-- Step 2: Tabel lines untuk di-centang -->
            <div v-if="importLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
            <div v-else-if="importLines.length > 0" class="table-wrap">
              <table class="table" style="font-size:12.5px">
                <thead><tr>
                  <th style="width:32px">
                    <input type="checkbox" v-model="selectAllImport" @change="toggleSelectAll" />
                  </th>
                  <th>#</th>
                  <th>Produk</th>
                  <th>Qty</th>
                  <th>UOM</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(il, idx) in importLines" :key="il.id" class="tr-data">
                    <td><input type="checkbox" v-model="importLineSelected[idx]" /></td>
                    <td class="td-secondary">{{ il.lineNo }}</td>
                    <td>{{ il['product$_identifier'] || '—' }}</td>
                    <td class="td-secondary">{{ il.orderedQuantity ?? il.invoicedQuantity ?? '—' }}</td>
                    <td class="td-secondary">{{ il['uOM$_identifier'] || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else-if="importDocId" class="td-empty" style="padding:20px">Tidak ada baris ditemukan.</div>

          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showImportModal = false">Batal</button>
            <button class="btn btn--primary" :disabled="!importDocId || importLines.length === 0" @click="confirmImport">
              Import Baris Dipilih
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
        <div class="modal modal--xxl">
          <div class="modal-header">
            <div>
              <div class="modal-breadcrumb">
                <span>Dashboard</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span>Good Receipt</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="bc-active">{{ (viewRow?.documentNo && viewRow.documentNo !== '<') ? viewRow.documentNo : 'Good Receipt' }}</span>
              </div>
              <div class="modal-title">Good Receipt — {{ (viewRow?.documentNo && viewRow.documentNo !== '<') ? viewRow.documentNo : '…' }}</div>
            </div>
            <button class="modal-close" @click="showViewModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Tab Bar -->
          <div class="modal-tabs" v-if="viewRow">
            <button :class="['modal-tab', viewTab === 'detail' ? 'modal-tab--active' : '']" @click="viewTab = 'detail'">Detail</button>
            <button :class="['modal-tab', viewTab === 'accounting' ? 'modal-tab--active' : '']" @click="switchToAccounting">Accounting</button>
          </div>

          <div class="modal-body" v-if="viewRow">

            <!-- ── Tab Detail ── -->
            <div v-if="viewTab === 'detail'">
              <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">No. Dokumen</span><span class="detail-value mono">{{ viewRow.documentNo }}</span></div>
                <div class="detail-item"><span class="detail-label">Tgl. Penerimaan</span><span class="detail-value">{{ formatDate(viewRow.movementDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Status</span><span :class="['status-pill', statusClass(viewRow.documentStatus)]">{{ statusLabel(viewRow.documentStatus) }}</span></div>
                <div class="detail-item"><span class="detail-label">Tgl. Akuntansi</span><span class="detail-value">{{ formatDate(viewRow.accountingDate) }}</span></div>
                <div class="detail-item"><span class="detail-label">Vendor</span><span class="detail-value">{{ bpName(viewRow['businessPartner$_identifier']) }}</span></div>
                <div class="detail-item"><span class="detail-label">Alamat Mitra</span><span class="detail-value">{{ viewRow['partnerAddress$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Gudang</span><span class="detail-value">{{ viewRow['warehouse$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Tipe Dokumen</span><span class="detail-value">{{ viewRow['documentType$_identifier'] || '—' }}</span></div>
                <div class="detail-item"><span class="detail-label">Ref. Pesanan</span><span class="detail-value">{{ viewRow.orderReference || '—' }}</span></div>
                <div class="detail-item detail-item--full"><span class="detail-label">Deskripsi</span><span class="detail-value">{{ viewRow.description || '—' }}</span></div>
              </div>

              <!-- Lines -->
              <div class="section-divider" style="margin-top:20px">Item yang Diterima</div>
              <div v-if="viewLinesLoading" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></div>
              <div v-else class="table-wrap" style="margin-bottom:0">
                <table class="table">
                  <thead><tr>
                    <th style="width:50px">#</th><th>Produk</th><th>Qty</th><th>UOM</th>
                    <th>Storage Bin</th><th>Ref. Dokumen</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="viewLines.length === 0"><td colspan="6" class="td-empty">Tidak ada item.</td></tr>
                    <tr v-for="(l, i) in viewLines" :key="l.id" class="tr-data">
                      <td class="td-secondary" style="text-align:center">{{ l.lineNo }}</td>
                      <td>{{ l['product$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ l.movementQuantity }}</td>
                      <td class="td-secondary">{{ l['uOM$_identifier'] || '—' }}</td>
                      <td class="td-secondary">{{ l['storageBin$_identifier'] || '—' }}</td>
                      <td class="td-secondary" style="font-size:11.5px">
                        <!-- Ref dari PO (salesOrderLine) -->
                        <button
                          v-if="l['salesOrderLine$_identifier']"
                          class="ref-link ref-link--po"
                          :class="{ 'ref-link--active': refPreview.show && refPreview.lineId === l.id }"
                          @click="toggleRefPreview('po', l)"
                          :title="l['salesOrderLine$_identifier']"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                          PO: {{ l['salesOrderLine$_identifier']?.split(' - ')[0] || '—' }}
                        </button>
                        <!-- Ref dari Invoice (invoiceLine) jika ada -->
                        <button
                          v-else-if="l._invoiceRef"
                          class="ref-link ref-link--inv"
                          :class="{ 'ref-link--active': refPreview.show && refPreview.lineId === l.id }"
                          @click="toggleRefPreview('invoice', l)"
                          :title="l._invoiceRef"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                          INV: {{ l._invoiceRef?.split(' - ')[0] || '—' }}
                        </button>
                        <span v-else class="td-muted">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- ── Tab Accounting ── -->
            <div v-if="viewTab === 'accounting'">
              <div v-if="accountingLoading" class="td-empty" style="padding:40px">
                <div class="loading-dots"><span></span><span></span><span></span></div>
              </div>
              <div v-else-if="accountingError" class="form-api-error" style="margin-top:0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ accountingError }}
              </div>
              <div v-else>
                <div v-if="accountingFacts.length === 0" class="td-empty" style="padding:40px">Belum ada jurnal akuntansi. Pastikan dokumen sudah di-Complete dan di-Post.</div>
                <div v-else>
                  <div class="acc-summary-grid">
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Tanggal</span>
                      <span class="acc-summary-value">{{ formatDate(viewRow.accountingDate || viewRow.movementDate) }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">No. Dokumen</span>
                      <span class="acc-summary-value">{{ viewRow.documentNo || '—' }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Total Debet</span>
                      <span class="acc-summary-value acc-summary-value--debit">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.debit || 0), 0)) }}</span>
                    </div>
                    <div class="acc-summary-item">
                      <span class="acc-summary-label">Total Credit</span>
                      <span class="acc-summary-value acc-summary-value--credit">{{ formatCurrency(accountingFacts.reduce((s, f) => s + (f.credit || 0), 0)) }}</span>
                    </div>
                  </div>
                  <div class="table-wrap" style="margin-bottom:0">
                    <table class="table">
                      <thead><tr>
                        <th>COA</th><th>Nama</th><th>Deskripsi</th><th>Periode</th>
                        <th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th>Type</th>
                      </tr></thead>
                      <tbody>
                        <tr v-for="fact in accountingFacts" :key="fact.id" class="tr-data">
                          <td><span class="acc-code">{{ fact.value || fact['account$_identifier']?.split(' - ')[0] || '—' }}</span></td>
                          <td class="td-secondary">{{ fact.accountingEntryDescription || fact['account$_identifier']?.split(' - ').slice(1).join(' - ') || '—' }}</td>
                          <td class="td-secondary" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ fact.description || '—' }}</td>
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

            <!-- ── Inline Ref Preview Panel ── -->
            <transition name="ref-slide">
              <div v-if="refPreview.show" class="ref-panel">
                <div class="ref-panel-header">
                  <div class="ref-panel-badge" :class="refPreview.type === 'po' ? 'ref-panel-badge--po' : 'ref-panel-badge--inv'">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                    Referensi {{ refPreview.type === 'po' ? 'Purchase Order' : 'Vendor Invoice' }}
                  </div>
                  <button class="ref-panel-close" @click="refPreview.show = false" title="Tutup">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <div v-if="refPreview.loading" class="ref-panel-loading">
                  <div class="loading-dots"><span></span><span></span><span></span></div>
                  <span>Memuat data referensi...</span>
                </div>

                <div v-else-if="refPreview.error" class="ref-panel-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ refPreview.error }}
                </div>

                <div v-else-if="refPreview.data" class="ref-panel-body">
                  <div class="ref-panel-docno">
                    <span class="ref-panel-docno-text">{{ refPreview.data.documentNo }}</span>
                    <span :class="['status-pill', statusClass(refPreview.data.documentStatus)]" style="font-size:11px;padding:2px 8px">
                      {{ statusLabel(refPreview.data.documentStatus) }}
                    </span>
                  </div>
                  <div class="ref-panel-grid">
                    <div class="ref-panel-item">
                      <span class="ref-panel-label">Vendor</span>
                      <span class="ref-panel-value">{{ bpName(refPreview.data['businessPartner$_identifier']) }}</span>
                    </div>
                    <div class="ref-panel-item">
                      <span class="ref-panel-label">Tanggal</span>
                      <span class="ref-panel-value">{{ formatDate(refPreview.type === 'po' ? refPreview.data.orderDate : refPreview.data.invoiceDate) }}</span>
                    </div>
                    <div class="ref-panel-item">
                      <span class="ref-panel-label">Grand Total</span>
                      <span class="ref-panel-value ref-panel-amount">{{ formatCurrency(refPreview.data.grandTotalAmount) }}</span>
                    </div>
                    <div class="ref-panel-item ref-panel-item--full">
                      <span class="ref-panel-label">Baris Dirujuk</span>
                      <span class="ref-panel-value" v-if="refPreview.lineData">
                        {{ refPreview.lineData['product$_identifier'] || '—' }}
                        <span class="td-muted"> &times; {{ refPreview.type === 'po' ? (refPreview.lineData.orderedQuantity ?? '—') : (refPreview.lineData.invoicedQuantity ?? '—') }} {{ refPreview.lineData['uOM$_identifier'] || '' }}</span>
                        <span v-if="refPreview.lineData.unitPrice" class="td-muted"> &bull; {{ formatCurrency(refPreview.lineData.unitPrice) }}/unit</span>
                      </span>
                      <span class="ref-panel-value" v-else style="font-family:var(--font-mono);font-size:12px">
                        {{ refPreview.lineIdentifier || '—' }}
                      </span>
                    </div>
                  </div>
                  <div class="ref-panel-footer">
                    <button class="btn btn--ghost ref-panel-btn-nav" @click="navigateToRef">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      Buka halaman {{ refPreview.type === 'po' ? 'Purchase Order' : 'Vendor Invoice' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>

          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="showViewModal = false">Tutup</button>

            <!-- DR: Edit + Complete -->
            <template v-if="viewRow?.documentStatus === 'DR'">
              <button class="btn btn--edit" @click="openEditFromView">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Sunting
              </button>
              <button class="btn btn--complete" :disabled="completing" @click="doComplete">
                <span v-if="completing" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                {{ completing ? 'Completing...' : 'Complete' }}
              </button>
            </template>

            <!-- CO: Enable Posting (jika posted='D') + Void -->
            <template v-else-if="viewRow?.documentStatus === 'CO'">
              <button
                v-if="viewRow?.posted === 'D'"
                class="btn btn--warning"
                :disabled="enablingPost"
                @click="doEnablePost"
                title="Dokumen disabled untuk accounting. Klik untuk mengaktifkan kembali."
              >
                <span v-if="enablingPost" class="spinner"></span>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {{ enablingPost ? 'Enabling...' : 'Enable Posting' }}
              </button>
              <button class="btn btn--danger" :disabled="voiding" @click="doVoid">
                <span v-if="voiding" class="spinner"></span>
                {{ voiding ? 'Voiding...' : 'Void' }}
              </button>
            </template>
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
            <div class="modal-title">Hapus Good Receipt</div>
            <button class="modal-close" @click="showDeleteModal = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-text">Hapus Good Receipt <strong>{{ deleteRow?.documentNo }}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchAllReceipts, fetchReceipt,
  createReceipt, updateReceipt, deleteReceipt,
  createReceiptLine, updateReceiptLine, deleteReceiptLine,
  fetchReceiptLines,
  completeReceipt, voidReceipt, enablePosting,
  fetchVendors, fetchVendorById, fetchPartnerLocations,
  fetchWarehouses, fetchStorageBins,
  fetchPurchaseOrdersByVendor, fetchPurchaseOrderLines,
  fetchVendorInvoicesByVendor, fetchVendorInvoiceLines,
  fetchProducts, fetchUOMs,
  fetchGRAccountingFacts,
  fetchPurchaseOrderById, fetchVendorInvoiceById,
  fetchPurchaseOrderLineById, fetchVendorInvoiceLineByReceiptLine,
  statusLabel, statusClass, formatDate,
  DEFAULT_ORGANIZATION,
} from '@/services/goodReceipt.js'

// ── Directive click-outside ────────────────────────
const vClickOutside = {
  mounted(el, binding) {
    el._handler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._handler, true)
  },
  unmounted(el) { document.removeEventListener('click', el._handler, true) },
}

const router = useRouter()

// ── Table state ─────────────────────────────────────
const rows        = ref([])
const loading     = ref(false)
const error       = ref('')
const currentPage = ref(1)
const pageSize    = 20
const totalCount  = ref(0)
const totalPages  = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))
const searchQuery = ref('')
let searchTimer   = null

const sortCol = ref('movementDate')
const sortDir = ref('desc')

function sortClass(col) {
  if (sortCol.value !== col) return ''
  return sortDir.value === 'asc' ? 'asc' : 'desc'
}
function toggleSort(col) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortCol.value = col; sortDir.value = 'desc' }
  loadReceipts()
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; loadReceipts() }, 400)
}

const pageNumbers = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (cur >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', cur - 1, cur, cur + 1, '...', total]
})

function goPage(p) { currentPage.value = p; loadReceipts() }

async function loadReceipts() {
  loading.value = true; error.value = ''
  try {
    const res = await fetchAllReceipts({
      startRow:  (currentPage.value - 1) * pageSize,
      pageSize,
      searchKey: searchQuery.value,
      sortCol:   sortCol.value,
      sortDir:   sortDir.value,
    })
    rows.value       = res.data        ?? []
    totalCount.value = res.totalRows   ?? 0
  } catch (e) {
    error.value = e?.response?.data?.response?.error?.message || e.message || 'Gagal memuat data.'
  } finally { loading.value = false }
}

// ── Dropdown ─────────────────────────────────────────
const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

function toggleDropdown(id, e) {
  if (openDropdown.value === id) { openDropdown.value = null; return }
  openDropdown.value = id
  const rect = e.currentTarget.getBoundingClientRect()
  dropdownPos.value  = { top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right }
}
function closeDropdown() { openDropdown.value = null }

// ── Lookup data ───────────────────────────────────────
const warehouses      = ref([])
const storageBins     = ref([])
const uoms            = ref([])
const partnerLocations = ref([])
const vendorOptions   = ref([])
const showVendorDrop  = ref(false)
let vendorSearchTimer = null

async function loadLookups() {
  const [whs, uomList] = await Promise.all([fetchWarehouses(), fetchUOMs()])
  warehouses.value = whs
  uoms.value       = uomList
}

async function onVendorSearch() {
  clearTimeout(vendorSearchTimer)
  vendorSearchTimer = setTimeout(async () => {
    if (form.value.vendorSearch.length < 2) { vendorOptions.value = []; return }
    vendorOptions.value = await fetchVendors(form.value.vendorSearch)
  }, 300)
}

async function selectVendor(v) {
  form.value.businessPartner = v.id
  form.value.vendorSearch    = `${v.searchKey} — ${v.name}`
  showVendorDrop.value        = false
  vendorOptions.value         = []
  // Load alamat mitra
  partnerLocations.value = await fetchPartnerLocations(v.id)
  if (partnerLocations.value.length === 1) form.value.partnerAddress = partnerLocations.value[0].id
}

function onVendorBlur() { setTimeout(() => { showVendorDrop.value = false }, 200) }

async function onWarehouseChange() {
  form.value.storageBinDefault = ''
  storageBins.value = form.value.warehouse ? await fetchStorageBins(form.value.warehouse) : []
}

// ── Line product search ───────────────────────────────
function addLine() {
  lines.value.push({
    id: null, product: '', productSearch: '', productOptions: [], showDrop: false,
    movementQuantity: 1, uOM: '', storageBin: '', salesOrderLine: '', sourceRef: '',
  })
}

function removeLine(idx) { lines.value.splice(idx, 1) }

let productTimers = {}
async function onProductSearch(idx) {
  clearTimeout(productTimers[idx])
  productTimers[idx] = setTimeout(async () => {
    const q = lines.value[idx].productSearch
    if (q.length < 2) { lines.value[idx].productOptions = []; return }
    lines.value[idx].productOptions = await fetchProducts(q)
  }, 300)
}
function selectProduct(idx, p) {
  lines.value[idx].product       = p.id
  lines.value[idx].productSearch = p.name
  lines.value[idx].uOM           = p.uOM || ''
  lines.value[idx].showDrop      = false
}
function onProductBlur(idx) { setTimeout(() => { lines.value[idx].showDrop = false }, 200) }

// ── Form state ────────────────────────────────────────
const showFormModal = ref(false)
const isEdit        = ref(false)
const editId        = ref(null)
const saving        = ref(false)
const formError     = ref('')
const lines         = ref([])

const form = ref(emptyForm())
function emptyForm() {
  return {
    businessPartner: '', vendorSearch: '',
    partnerAddress:  '',
    warehouse:       '',
    movementDate:    new Date().toISOString().slice(0, 10),
    accountingDate:  new Date().toISOString().slice(0, 10),
    orderReference:  '',
    description:     '',
  }
}

function openCreateModal() {
  isEdit.value = false; editId.value = null
  form.value   = emptyForm(); lines.value = []
  partnerLocations.value = []; vendorOptions.value = []; storageBins.value = []
  formError.value = ''
  showFormModal.value = true
  closeDropdown()
}

async function openEditModal(r) {
  closeDropdown()
  isEdit.value = true; editId.value = r.id
  formError.value = ''
  // Isi form dari data row
  form.value = {
    businessPartner: r.businessPartner || '',
    vendorSearch:    r['businessPartner$_identifier'] || '',
    partnerAddress:  r.partnerAddress  || '',
    warehouse:       r.warehouse       || '',
    movementDate:    r.movementDate?.slice(0, 10)    || '',
    accountingDate:  r.accountingDate?.slice(0, 10)  || '',
    orderReference:  r.orderReference  || '',
    description:     r.description     || '',
  }
  // Load lokasi dan storage bin
  if (r.businessPartner) partnerLocations.value = await fetchPartnerLocations(r.businessPartner)
  if (r.warehouse)       storageBins.value       = await fetchStorageBins(r.warehouse)

  // Load existing lines
  const existingLines = await fetchReceiptLines(r.id)
  lines.value = existingLines.map(l => ({
    id:               l.id,
    product:          l.product || '',
    productSearch:    l['product$_identifier'] || '',
    productOptions:   [],
    showDrop:         false,
    movementQuantity: l.movementQuantity ?? 1,
    uOM:              l.uOM || '',
    storageBin:       l.storageBin || '',
    salesOrderLine:   l.salesOrderLine || '',
    sourceRef:        l['salesOrderLine$_identifier']?.split(' - ')[0] || '',
  }))

  showFormModal.value = true
}

function openEditFromView() {
  const r = viewRow.value
  if (!r) return
  showViewModal.value = false
  openEditModal(r)
}

function closeFormModal() { showFormModal.value = false }

async function saveReceipt() {
  if (!form.value.businessPartner) { formError.value = 'Vendor wajib dipilih.'; return }
  if (!form.value.warehouse)       { formError.value = 'Gudang wajib dipilih.'; return }
  if (!form.value.movementDate)    { formError.value = 'Tanggal penerimaan wajib diisi.'; return }
  if (lines.value.length === 0)    { formError.value = 'Minimal harus ada 1 item.'; return }
  for (const l of lines.value) {
    if (!l.product) { formError.value = 'Semua baris harus memiliki produk.'; return }
  }

  saving.value = true; formError.value = ''
  let receiptId = null
  try {
    if (isEdit.value) {
      await updateReceipt(editId.value, form.value)
      receiptId = editId.value
    } else {
      const created = await createReceipt(form.value)
      receiptId = created?.id
      if (!receiptId) throw new Error('Gagal membuat GR — ID tidak diterima.')
    }

    // Simpan lines
    for (let idx = 0; idx < lines.value.length; idx++) {
      const ln = lines.value[idx]
      if (!ln.product) continue
      const payload = {
        lineNo:           (idx + 1) * 10,
        product:          ln.product,
        uOM:              ln.uOM,
        movementQuantity: ln.movementQuantity,
        storageBin:       ln.storageBin || null,
        salesOrderLine:   ln.salesOrderLine || null,
        organization:     DEFAULT_ORGANIZATION,
      }
      if (ln.id) await updateReceiptLine(ln.id, payload)
      else       await createReceiptLine(receiptId, payload)
    }

    showFormModal.value = false
    showToast(isEdit.value ? 'Good Receipt diperbarui.' : 'Good Receipt berhasil dibuat sebagai Draft.')
    await loadReceipts()
  } catch (e) {
    formError.value = e?.response?.data?.response?.error?.message || e.message || 'Gagal menyimpan.'
  } finally { saving.value = false }
}

// ── View Modal ─────────────────────────────────────────
const showViewModal   = ref(false)
const viewRow         = ref(null)
const viewLines       = ref([])
const viewLinesLoading  = ref(false)
const completing        = ref(false)
const voiding           = ref(false)
const enablingPost      = ref(false)
const viewTab           = ref('detail')
const accountingFacts   = ref([])
const accountingLoading = ref(false)
const accountingError   = ref('')

async function doEnablePost() {
  if (!viewRow.value) return
  enablingPost.value = true
  try {
    const updated = await enablePosting(viewRow.value.id, viewRow.value.documentNo)
    showToast('Dokumen berhasil di-enable untuk accounting (Posted = N).')
    await loadReceipts()
    viewRow.value = updated || rows.value.find(r => r.id === viewRow.value.id)
  } catch (e) {
    showToast(e?.message || 'Gagal enable posting.', 'error')
  } finally { enablingPost.value = false }
}

async function openViewModal(r) {
  closeDropdown()
  viewRow.value = r; viewLines.value = []
  viewTab.value = 'detail'
  accountingFacts.value = []; accountingError.value = ''
  refPreview.value = { show: false, loading: false, error: '', type: 'po', data: null, lineData: null, lineIdentifier: '', docId: '', lineId: '' }
  showViewModal.value = true
  viewLinesLoading.value = true
  
  const lines = await fetchReceiptLines(r.id)
  
  // Fetch invoice refs untuk line yang tidak punya salesOrderLine
  await Promise.all(lines.map(async (ln) => {
    if (!ln.salesOrderLine) {
      try {
        const il = await fetchVendorInvoiceLineByReceiptLine(ln.id)
        if (il) {
          ln._invoiceRef    = il['invoice$_identifier'] || null  // untuk label tombol
          ln._invDocId      = typeof il.invoice === 'object' ? il.invoice?.id : il.invoice  // ID header
          ln._invLineId     = il.id    // ID line, untuk re-fetch detail saat preview
        }
      } catch (_) {}
    }
  }))
  
  viewLines.value = lines
  viewLinesLoading.value = false
}

// Toggle: klik tombol yang sama lagi → tutup panel
function toggleRefPreview(type, line) {
  if (refPreview.value.show && refPreview.value.lineId === line.id) {
    refPreview.value.show = false
    return
  }
  openRefPreview(type, line)
}

async function openRefPreview(type, line) {
  const lineIdentifier = type === 'po' ? (line['salesOrderLine$_identifier'] || '') : (line._invoiceRef || '')
  refPreview.value = { show: true, loading: true, error: '', type, data: null, lineData: null, lineIdentifier, docId: '', lineId: line.id }

  try {
    let docId = null
    let lineData = null

    if (type === 'po') {
      // Gunakan cache jika ada, kalau tidak fetch dari OrderLine
      docId = line._poDocId || null
      const olId = typeof line.salesOrderLine === 'object' ? line.salesOrderLine?.id : line.salesOrderLine
      if (olId) {
        lineData = await fetchPurchaseOrderLineById(olId)
        if (lineData) {
          docId = typeof lineData.salesOrder === 'object' ? lineData.salesOrder?.id : lineData.salesOrder
          if (docId) line._poDocId = docId  // cache
        }
      }
    } else {
      // Untuk invoice: gunakan _invDocId dan _invLineId yang sudah di-cache saat openViewModal
      docId = line._invDocId || null
      if (line._invLineId) {
        // Re-fetch line detail dengan _selectedProperties lengkap (sudah ada di fetchVendorInvoiceLineByReceiptLine)
        lineData = await fetchVendorInvoiceLineByReceiptLine(line.id)
        if (lineData && !docId) {
          docId = typeof lineData.invoice === 'object' ? lineData.invoice?.id : lineData.invoice
          if (docId) line._invDocId = docId
        }
      } else if (!docId) {
        // Tidak ada cache sama sekali — fetch ulang
        lineData = await fetchVendorInvoiceLineByReceiptLine(line.id)
        if (lineData) {
          docId = typeof lineData.invoice === 'object' ? lineData.invoice?.id : lineData.invoice
          if (docId) line._invDocId = docId
        }
      }
    }

    if (!docId) {
      refPreview.value.loading = false
      refPreview.value.error = 'Tidak dapat menemukan dokumen referensi.'
      return
    }

    // Load detail Header dokumen
    const headerData = type === 'po'
      ? await fetchPurchaseOrderById(docId)
      : await fetchVendorInvoiceById(docId)

    refPreview.value.data = headerData
    refPreview.value.lineData = lineData
    refPreview.value.docId = docId
    refPreview.value.loading = false
  } catch (e) {
    console.error(e)
    refPreview.value.loading = false
    refPreview.value.error = 'Gagal memuat data dokumen referensi.'
  }
}


async function switchToAccounting() {
  viewTab.value = 'accounting'
  if (accountingFacts.value.length > 0 || accountingLoading.value) return
  accountingLoading.value = true
  accountingError.value = ''
  try {
    accountingFacts.value = await fetchGRAccountingFacts(viewRow.value.id)
  } catch (e) {
    accountingError.value = e?.response?.data?.response?.error?.message || e.message || 'Gagal memuat data akuntansi'
  } finally { accountingLoading.value = false }
}

// ── Ref Preview (PO / Invoice mini-popup) ─────────────
const refPreview = ref({
  show: false, loading: false, error: '',
  type: 'po',   // 'po' | 'invoice'
  data: null,
  lineIdentifier: '',
  docId: '',
  lineId: '',   // ID line yang sedang aktif — untuk toggle
})



function navigateToRef() {
  refPreview.value.show = false
  showViewModal.value = false
  router.push(refPreview.value.type === 'po' ? '/purchase-order' : '/vendor-invoice')
}

async function doComplete() {
  if (!viewRow.value) return
  completing.value = true
  try {
    const updated = await completeReceipt(viewRow.value.id, viewRow.value)
    showToast('Good Receipt berhasil di-Complete. Stok sudah diperbarui.')
    await loadReceipts()
    viewRow.value = updated || rows.value.find(r => r.id === viewRow.value.id)
  } catch (e) {
    showToast(e?.message || 'Gagal complete GR.', 'error')
  } finally { completing.value = false }
}

async function doVoid() {
  if (!viewRow.value) return
  voiding.value = true
  try {
    const updated = await voidReceipt(viewRow.value.id, viewRow.value)
    showToast('Good Receipt di-Void.')
    await loadReceipts()
    viewRow.value = updated || rows.value.find(r => r.id === viewRow.value.id)
  } catch (e) {
    showToast(e?.message || 'Gagal void GR.', 'error')
  } finally { voiding.value = false }
}

// ── Delete ─────────────────────────────────────────────
const showDeleteModal = ref(false)
const deleteRow       = ref(null)
const deleteError     = ref('')
const deleting        = ref(false)

function confirmDelete(r) {
  closeDropdown(); deleteRow.value = r; deleteError.value = ''; showDeleteModal.value = true
}
async function doDelete() {
  deleting.value = true; deleteError.value = ''
  try {
    await deleteReceipt(deleteRow.value.id)
    showDeleteModal.value = false
    showToast('Good Receipt dihapus.')
    await loadReceipts()
  } catch (e) {
    deleteError.value = e?.response?.data?.response?.error?.message || e.message
  } finally { deleting.value = false }
}

// ── Import Modal (dari PO / Invoice) ──────────────────
const showImportModal   = ref(false)
const importSource      = ref('po') // 'po' | 'invoice'
const importDocs        = ref([])
const importDocId       = ref('')
const importLines       = ref([])
const importLineSelected = ref([])
const importLinesLoading = ref(false)
const selectAllImport   = ref(false)

async function openImportModal(source) {
  importSource.value      = source
  importDocId.value       = ''
  importLines.value       = []
  importLineSelected.value = []
  selectAllImport.value   = false

  if (source === 'po') {
    importDocs.value = await fetchPurchaseOrdersByVendor(form.value.businessPartner)
  } else {
    importDocs.value = await fetchVendorInvoicesByVendor(form.value.businessPartner)
  }

  showImportModal.value = true
}

async function loadImportLines() {
  if (!importDocId.value) { importLines.value = []; return }
  importLinesLoading.value = true
  try {
    if (importSource.value === 'po') {
      importLines.value = await fetchPurchaseOrderLines(importDocId.value)
    } else {
      importLines.value = await fetchVendorInvoiceLines(importDocId.value)
    }
    importLineSelected.value = importLines.value.map(() => false)
    selectAllImport.value    = false
  } finally { importLinesLoading.value = false }
}

function toggleSelectAll() {
  importLineSelected.value = importLines.value.map(() => selectAllImport.value)
}

function confirmImport() {
  const selectedLines = importLines.value.filter((_, i) => importLineSelected.value[i])
  for (const il of selectedLines) {
    const qty = il.orderedQuantity ?? il.invoicedQuantity ?? 1
    // Hindari duplikat berdasarkan product ID
    const alreadyAdded = lines.value.find(l => l.product === (il.product || il.product))
    if (!alreadyAdded) {
      lines.value.push({
        id: null,
        product:          il.product || '',
        productSearch:    il['product$_identifier'] || '',
        productOptions:   [],
        showDrop:         false,
        movementQuantity: qty,
        uOM:              il.uOM || '',
        storageBin:       '',
        // Untuk PO: simpan salesOrderLine = il.id (OrderLine ID)
        // Untuk Invoice: tidak ada direct link (null)
        salesOrderLine: importSource.value === 'po' ? il.id : '',
        // Simpan unitPrice dari OrderLine agar tersedia saat completeReceipt
        // untuk mengisi cost fields di MaterialMgmtMaterialTransaction
        unitPrice:      importSource.value === 'po' ? (Number(il.unitPrice) || Number(il.listPrice) || 0) : 0,
        sourceRef:      importSource.value === 'po'
          ? (il['salesOrder$_identifier']?.split(' - ')[0] || il['salesOrder'] || '')
          : (il['invoice$_identifier']?.split(' - ')[0] || il['invoice'] || ''),
      })
    }
  }
  showImportModal.value = false
}

// ── Helpers ───────────────────────────────────────────
function bpName(identifier) {
  if (!identifier) return '—'
  return identifier.includes(' - ') ? identifier.split(' - ').slice(1).join(' - ') : identifier
}

function formatCurrencyShort(v) {
  if (!v) return '0'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v)
}

function formatCurrency(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
}

// ── Toast ─────────────────────────────────────────────
const toast = ref({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer  = setTimeout(() => { toast.value.show = false }, 3500)
}

onMounted(() => { loadReceipts(); loadLookups() })
</script>

<style scoped>
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9; --surface: #ffffff; --surface2: #f8fafc;
  --border: #e2e8f0; --accent: #3b82f6; --accent-light: #eff6ff;
  --text-primary: #0f172a; --text-secondary: #475569; --text-muted: #94a3b8;
  --success: #22c55e; --danger: #ef4444; --warning: #f59e0b;
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
.btn--primary:hover { background: #2563eb; }
.btn--primary:disabled { opacity: .6; cursor: not-allowed; }
.btn--ghost { background: var(--surface2); border: 1px solid var(--border); color: var(--text-secondary); }
.btn--ghost:hover { background: var(--border); }
.btn--danger { background: var(--danger); color: #fff; border: none; }
.btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn--warning { background: #d97706; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: background .15s; }
.btn--warning:hover:not(:disabled) { background: #b45309; }
.btn--danger:disabled { opacity: .6; cursor: not-allowed; }
.btn--edit { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; font-family: var(--font); }
.btn--edit:hover { background: #e2e8f0; }
.btn--complete { background: #16a34a; color: #fff; border: none; border-radius: var(--radius-sm); padding: 0 16px; height: 36px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font); transition: background .15s; }
.btn--complete:hover:not(:disabled) { background: #15803d; }
.btn--complete:disabled { opacity: .4; cursor: not-allowed; }

.btn-import { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-import:hover:not(:disabled) { background: #bae6fd; }
.btn-import:disabled { opacity: .4; cursor: not-allowed; }
.btn-import--inv { color: #7c3aed; background: #ede9fe; border-color: #c4b5fd; }
.btn-import--inv:hover:not(:disabled) { background: #c4b5fd; }

.btn-add-line { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-light); border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-family: var(--font); transition: background .12s; }
.btn-add-line:hover { background: #dbeafe; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { background: var(--surface2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; padding: 10px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; text-align: left; }
.table tbody td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: var(--text-primary); vertical-align: middle; }
.tr-data:hover td { background: var(--surface2); }
.td-empty { text-align: center; color: var(--text-muted); font-size: 13px; padding: 40px; }
.td-error { color: var(--danger); }
.td-secondary { color: var(--text-secondary); }
.td-muted { color: var(--text-muted); }
.td-clip { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-name { font-weight: 500; }
.th-action { width: 60px; }
.td-action-cell { width: 60px; }

/* ── Ref Preview Popup ── */
/* ── Inline Ref Panel ── */
.ref-panel { margin-top: 16px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--surface); }
.ref-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--surface2); border-bottom: 1px solid var(--border); }
.ref-panel-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
.ref-panel-badge--po  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.ref-panel-badge--inv { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.ref-panel-close { background: none; border: none; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; color: var(--text-muted); transition: background .12s; }
.ref-panel-close:hover { background: var(--border); color: var(--text-primary); }
.ref-panel-loading { padding: 20px 16px; display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--text-muted); font-size: 13px; }
.ref-panel-error { padding: 14px 16px; font-size: 13px; color: var(--danger); display: flex; align-items: center; gap: 6px; }
.ref-panel-body { padding: 14px 16px 0; }
.ref-panel-docno { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.ref-panel-docno-text { font-size: 17px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
.ref-panel-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 16px; margin-bottom: 14px; }
.ref-panel-item { display: flex; flex-direction: column; gap: 2px; }
.ref-panel-item--full { grid-column: 1 / -1; }
.ref-panel-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.ref-panel-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.ref-panel-amount { font-weight: 700; color: #1d4ed8; }
.ref-panel-footer { border-top: 1px solid var(--border); padding: 10px 16px; display: flex; justify-content: flex-end; }
.ref-panel-btn-nav { font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px; }
/* Tombol ref-link aktif (panel terbuka) */
.ref-link--active { background: #dbeafe !important; border-color: #93c5fd !important; }
.ref-link--inv.ref-link--active { background: #dcfce7 !important; border-color: #86efac !important; }
/* Transisi inline panel */
.ref-slide-enter-active, .ref-slide-leave-active { transition: opacity .18s ease, transform .18s ease; }
.ref-slide-enter-from, .ref-slide-leave-to { opacity: 0; transform: translateY(-6px); }

.sortable { cursor: pointer; user-select: none; position: relative; padding-right: 20px !important; }
.sortable::after, .sortable::before { content: ''; position: absolute; right: 6px; top: 50%; border: 4px solid transparent; opacity: .3; }
.sortable::before { border-bottom-color: currentColor; transform: translateY(-100%); margin-top: -2px; }
.sortable::after  { border-top-color:    currentColor; transform: translateY(20%); }
.sortable.asc::before  { opacity: 1; }
.sortable.desc::after  { opacity: 1; }

.code-badge { font-family: var(--font-mono); font-size: 12px; font-weight: 600; background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; padding: 2px 7px; color: var(--text-primary); }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.status-pill--draft     { background: #fef9c3; color: #854d0e; }
.status-pill--completed { background: #dcfce7; color: #15803d; }
.status-pill--closed    { background: #e2e8f0; color: #475569; }
.status-pill--voided    { background: #fee2e2; color: #b91c1c; }

.ref-badge { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; border-radius: 4px; padding: 2px 7px; font-size: 11px; font-weight: 600; }

.action-group { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.action-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius-sm); border: none; cursor: pointer; transition: background .12s; }
.action-btn--more { background: transparent; color: var(--text-muted); }
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

.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; background: var(--bg); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }
.page-ellipsis { color: var(--text-muted); padding: 0 4px; font-size: 13px; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--xxl { max-width: 1060px; }
.modal--lg  { max-width: 700px; }
.modal--sm  { max-width: 400px; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 24px 12px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0; }
.modal-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-bottom: 4px; }
.bc-active { color: var(--accent); font-weight: 500; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: background .12s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 14px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; align-items: center; }

/* ── Form ── */
.form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group--full { grid-column: 1 / -1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { opacity: .6; cursor: not-allowed; background: #f1f5f9; }
.form-input--sm { height: 32px; font-size: 12.5px; }
.req { color: var(--danger); }
.form-api-error { margin-top: 14px; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; }

.section-divider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.btn-rm-line { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #fee2e2; color: var(--danger); border: none; cursor: pointer; transition: background .12s; }
.btn-rm-line:hover { background: #fecaca; }
.table--lines { table-layout: auto; min-width: 780px; }
.table--lines th, .table--lines td { padding: 8px 10px; vertical-align: middle; }

/* Combobox */
.acc-wrap { position: relative; width: 100%; }
.acc-input { display: block; width: 100%; height: 36px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.acc-input:focus { border-color: var(--accent); background: #fff; }
.acc-input--sm { height: 32px; font-size: 12.5px; }
.acc-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.acc-dropdown { position: absolute; z-index: 300; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.acc-opt { padding: 8px 12px; font-size: 12.5px; color: var(--text-primary); cursor: pointer; transition: background .1s; }
.acc-opt:hover { background: var(--accent-light); }
.acc-opt-code { font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.acc-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; display: block; }

/* Detail view */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item--full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }

.delete-text { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; }

/* Toast */
.toast { position: fixed; bottom: 28px; right: 28px; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); z-index: 9999; font-family: var(--font); }
.toast--success { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; }
.toast--error   { background: #fff1f2; color: #b91c1c; border: 1px solid #fca5a5; }
.toast--warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

/* Spinner */
.spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Transition */
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
<style scoped>
/* ── Tab bar ── */
.modal-tabs { display: flex; border-bottom: 1px solid var(--border); padding: 0 24px; flex-shrink: 0; background: var(--surface); }
.modal-tab { padding: 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: var(--font); transition: all .15s; margin-bottom: -1px; }
.modal-tab--active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

/* ── Ref links (clickable) ── */
.ref-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: none; cursor: pointer; transition: all .12s; text-decoration: none; }
.ref-link--po  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.ref-link--po:hover  { background: #dbeafe; }
.ref-link--inv { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.ref-link--inv:hover { background: #dcfce7; }

/* ── Accounting tab ── */
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
</style>