<template>
  <div class="app">

    <header class="top-navbar">
      <div class="nav-container">
        <div class="brand">
          <div class="brand-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div class="brand-text">
            <div class="brand-title">Requisition to Order</div>
            <div class="brand-subtitle">Manajemen Pengadaan</div>
          </div>
        </div>

        <div class="nav-actions">
          <Transition name="fade">
            <button v-if="selectedLines.length > 0" @click="showModal = true" class="btn btn--primary btn--badge">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Buat PO
              <span class="btn-badge">{{ selectedLines.length }}</span>
            </button>
          </Transition>

          <!-- <div class="user-info">
            <div class="user-avatar">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <span class="user-name">{{ USERNAME }}</span>
          </div>

          <button @click="logout" class="btn btn--ghost btn--icon-only" title="Logout" style="border:none; color:var(--danger);">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            <span class="btn-text-hidden">Logout</span>
          </button> -->
        </div>
      </div>
    </header>

    <div class="page-wrap">

      <div class="content-card">
        <div class="card-header">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
          </svg>
          <span>Filter Permintaan</span>
        </div>
        <div class="card-body">
          <div class="form-grid-3 mb-16">
            <div class="form-group">
              <label>Proyek</label>
              <SearchSelect v-model="filter.project" :display-value="filter.projectName"
                placeholder="Semua proyek" :fetch-fn="fetchProjects" @select="onProjectSelect" />
            </div>
            <div class="form-group">
              <label>Peminta</label>
              <SearchSelect v-model="filter.requester" :display-value="filter.requesterName"
                placeholder="Semua peminta" :fetch-fn="fetchRequestersByProject"
                @select="opt => { filter.requesterName = opt?._identifier || opt?.name || '' }" />
            </div>
            <div class="form-group">
              <label>Produk</label>
              <input v-model="filter.product" type="text" placeholder="Filter baris berdasarkan produk..." class="form-control" />
              <p class="form-help">Otomatis membuka PR yang berisi produk ini</p>
            </div>
          </div>
          <div class="action-row">
            <button @click="search" :disabled="loading" class="btn btn--primary">
              <svg v-if="loading" class="btn-spinner" viewBox="0 0 24 24"></svg>
              <svg v-else width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              {{ loading ? 'Mencari...' : 'Cari' }}
            </button>
            <button @click="resetFilter" class="btn btn--ghost">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Atur Ulang
            </button>
          </div>
        </div>
      </div>

      <div v-if="successBanner.show" class="alert alert--success">
        <div class="alert-content">
          <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <div class="alert-title">Purchase Order Berhasil Dibuat</div>
            <div class="alert-desc">
              No. PO: <span class="mono-text bold">{{ successBanner.documentNo }}</span>
              <button @click="copyPONumber" class="link-btn ml-8">Salin</button>
            </div>
          </div>
        </div>
        <button @click="successBanner.show = false" class="alert-close">×</button>
      </div>

      <Transition name="toast">
        <div v-if="toast.show" class="toast toast--error">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ toast.message }}
          <button @click="toast.show = false" class="alert-close ml-auto">×</button>
        </div>
      </Transition>

      <div v-if="requisitions.length > 0" class="results-container">

        <div class="summary-bar">
          <div class="summary-stats">
            <span class="summary-text">
              <strong class="text-primary">{{ filteredRequisitions().length }}</strong>
              <span v-if="filteredRequisitions().length !== requisitions.length"> dari {{ requisitions.length }}</span>
              permintaan
            </span>
            <span v-if="selectedLines.length > 0" class="status-pill status-pill--accent">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              {{ selectedLines.length }} baris dipilih
            </span>
            <span v-if="selectedLines.length > 0" class="status-pill status-pill--blue">
              {{ selectedPRCount }} PR
            </span>
          </div>
          <button v-if="selectedLines.length > 0" @click="clearSelection" class="link-btn link-btn--danger">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            Hapus pilihan
          </button>
        </div>

        <div class="content-card mb-8">
          <div class="quick-filter-header">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            Filter Cepat
          </div>
          <div class="quick-filter-grid">
            <div class="qf-group">
              <label>No. Dokumen</label>
              <input v-model="headerSearch.documentNo" type="text" placeholder="Filter..." class="qf-input"/>
            </div>
            <div class="qf-group">
              <label>Proyek</label>
              <input v-model="headerSearch.project" type="text" placeholder="Filter..." class="qf-input"/>
            </div>
            <div class="qf-group">
              <label>Peminta</label>
              <input v-model="headerSearch.requester" type="text" placeholder="Filter..." class="qf-input"/>
            </div>
            <div class="qf-group">
              <label>Deskripsi</label>
              <input v-model="headerSearch.description" type="text" placeholder="Filter..." class="qf-input"/>
            </div>
            <div class="qf-group border-none">
              <label>Status</label>
              <select v-model="headerSearch.status" class="qf-input">
                <option value="">Semua</option>
                <option value="open">Selesai</option>
                <option value="closed">Ditutup</option>
              </select>
            </div>
          </div>
        </div>

        <div class="accordion-list">
          <div v-for="req in filteredRequisitions()" :key="req.id" class="content-card accordion-card">

            <div class="accordion-header" @click="toggleExpand(req.id)">
              <div :class="['expand-icon', expanded.has(req.id) ? 'expanded' : '']">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </div>

              <div class="req-data-grid">
                <div class="req-data-col">
                  <div class="req-label">No. Dokumen</div>
                  <div class="req-value bold">{{ req.documentNo }}</div>
                </div>
                <div class="req-data-col">
                  <div class="req-label">Proyek</div>
                  <div class="req-value">{{ req['project$_identifier'] || '—' }}</div>
                </div>
                <div class="req-data-col">
                  <div class="req-label">Peminta</div>
                  <div class="req-value">{{ req['userContact$_identifier'] || '—' }}</div>
                </div>
                <div class="req-data-col">
                  <div class="req-label">Deskripsi</div>
                  <div class="req-value">{{ req.description || '—' }}</div>
                </div>
                <div class="req-data-col align-center">
                  <span v-if="getReqStatus(req.id) === 'closed'" class="status-pill status-pill--inactive">
                    Ditutup
                  </span>
                  <span v-else-if="getReqStatus(req.id) === 'open'" class="status-pill status-pill--active">
                    Selesai
                  </span>
                  <span v-else class="text-muted">—</span>
                </div>
              </div>
            </div>

            <Transition name="expand">
              <div v-if="expanded.has(req.id)" class="accordion-body">

                <div v-if="loadingLines.has(req.id)" class="empty-state">
                  <div class="loading-dots"><span></span><span></span><span></span></div>
                  <p>Memuat baris...</p>
                </div>

                <div v-else-if="!(linesByReq[req.id] || []).length" class="empty-state">
                  Tidak ada baris ditemukan untuk permintaan ini.
                </div>

                <div v-else-if="!filteredLines(req.id).length" class="empty-state">
                  Tidak ada baris yang cocok dengan filter saat ini.
                  <button @click="resetColSearch(req.id)" class="link-btn">Hapus filter baris</button>
                </div>

                <div v-else class="lines-table-wrap">
                  <div class="grid-row grid-filter" :style="gridCols">
                    <div class="grid-cell center">
                      <input type="checkbox" :checked="allLinesSelected(req.id)" @change="toggleAllLines(req.id)" class="custom-checkbox" title="Pilih semua baris"/>
                    </div>
                    <div class="grid-cell"><input v-model="getColSearch(req.id).product" type="text" placeholder="Produk..." class="form-control form-control--sm"/></div>
                    <div class="grid-cell"><input v-model="getColSearch(req.id).needByDate" type="text" placeholder="Tanggal..." class="form-control form-control--sm"/></div>
                    <div></div><div></div><div></div><div></div><div></div>
                    <div class="grid-cell">
                      <select v-model="getColSearch(req.id).status" class="form-control form-control--sm">
                        <option value="">Semua</option>
                        <option value="open">Terbuka</option>
                        <option value="partial">Parsial</option>
                        <option value="closed">Ditutup</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid-row grid-header" :style="gridCols">
                    <div></div>
                    <div>Produk</div>
                    <div>Tgl Dibutuhkan</div>
                    <div>Jml PR</div>
                    <div>Dipesan</div>
                    <div>Satuan</div>
                    <div>Jml Dipesan</div>
                    <div>Harga Satuan</div>
                    <div>Status</div>
                  </div>

                  <div v-for="line in filteredLines(req.id)" :key="line.id" 
                    :class="['grid-row grid-data', line.requisitionLineStatus === 'C' ? 'row-disabled' : '', isLineSelected(line.id) ? 'row-selected' : '']"
                    :style="gridCols">

                    <div class="grid-cell center">
                      <input type="checkbox"
                        :checked="isLineSelected(line.id)"
                        :disabled="line.requisitionLineStatus === 'C' || (line.orderQuantity ?? 0) >= line.quantity"
                        @change="toggleLine(line)"
                        class="custom-checkbox"/>
                    </div>

                    <div class="grid-cell td-name truncate" :title="line['product$_identifier']">{{ line['product$_identifier'] || '—' }}</div>
                    <div class="grid-cell td-secondary">{{ line.needByDate || '—' }}</div>
                    <div class="grid-cell bold">{{ line.quantity }}</div>
                    <div class="grid-cell"><span :class="(line.orderQuantity ?? 0) > 0 ? 'text-blue' : 'text-muted'">{{ line.orderQuantity ?? 0 }}</span></div>
                    <div class="grid-cell td-secondary">{{ line['uOM$_identifier'] || '—' }}</div>

                    <div class="grid-cell">
                      <input v-model.number="line.qtyToOrder" type="number" min="0" :max="line.quantity - (line.orderQuantity ?? 0)"
                        :disabled="line.requisitionLineStatus === 'C' || (line.orderQuantity ?? 0) >= line.quantity"
                        @input="clampQtyToOrder(line)"
                        :class="['form-control form-control--sm w-80', qtyToOrderExceeds(line) ? 'input-error' : '']" />
                    </div>

                    <div class="grid-cell stack-sm">
                      <div class="mini-label">Harga PR</div>
                      <div class="form-control form-control--sm w-100 read-only mono-text">{{ (line.unitPrice ?? 0).toLocaleString() }}</div>
                      <div class="mini-label mt-4">Harga Order</div>
                      <input v-model.number="line.orderUnitPrice" type="number" min="0" step="0.01" placeholder="0.00"
                        :disabled="line.requisitionLineStatus === 'C' || (line.orderQuantity ?? 0) >= line.quantity"
                        @input="clampOrderPrice(line)"
                        :class="['form-control form-control--sm w-100', orderPriceExceeds(line) ? 'input-error' : '']" />
                    </div>

                    <div class="grid-cell">
                      <span v-if="line.requisitionLineStatus === 'C'" class="status-pill status-pill--inactive">Ditutup</span>
                      <span v-else-if="(line.orderQuantity ?? 0) > 0 && (line.orderQuantity ?? 0) < (line.quantity ?? 0)" class="status-pill status-pill--blue">Parsial</span>
                      <span v-else class="status-pill status-pill--neutral">Terbuka</span>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div v-else-if="searched && !loading" class="empty-state card-empty">
        <div class="empty-icon">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
        <p class="empty-title">Tidak ada permintaan selesai yang ditemukan</p>
        <p class="empty-desc">Coba sesuaikan filter proyek atau peminta Anda</p>
      </div>

      <div v-else-if="!searched" class="empty-state card-empty dashed">
        <div class="empty-icon icon-accent">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <p class="empty-title">Pilih filter dan klik Cari</p>
        <p class="empty-desc">Hasil akan menampilkan permintaan yang telah selesai dan disetujui</p>
      </div>

    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal">
            
            <div class="modal-header header-accent">
              <div>
                <h3 class="modal-title text-white">Buat Purchase Order</h3>
                <p class="modal-subtitle">{{ selectedLines.length }} baris dipilih dari permintaan</p>
              </div>
              <button class="modal-close close-white" @click="showModal = false">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="modal-info-bar">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Purchase Order akan dibuat untuk semua baris permintaan yang dipilih. Permintaan akan ditutup setelah proses berhasil.
            </div>

            <div class="modal-body">
              <div v-if="modalOrderReference" class="form-group mb-16">
                <label>Referensi Order</label>
                <div class="form-control read-only mono-text">{{ modalOrderReference }}</div>
              </div>

              <div class="form-group mb-16">
                <label>Dokumen Transaksi</label>
                <div class="form-control read-only fake-select">
                  <span>Purchase Order Central</span>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
              </div>

              <div class="form-group mb-16">
                <label>Tanggal Order</label>
                <input v-model="modalForm.orderDate" type="date" class="form-control"/>
              </div>

              <div class="form-group mb-16">
                <label>Tanggal Pengiriman</label>
                <input v-model="modalForm.scheduledDeliveryDate" type="date" class="form-control"/>
              </div>

              <div class="form-grid-2 mb-16">
                <div class="form-group">
                  <label>Tipe PO <span class="req">*</span></label>
                  <select v-model="modalForm.tipePO" class="form-control">
                    <option value="" disabled>Pilih tipe...</option>
                    <option value="Jasa">Jasa</option>
                    <option value="Material">Material</option>
                    <option value="Jasa dan Material">Jasa dan Material</option>
                    <option value="Perizinan">Perizinan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Kategori PO <span class="req">*</span></label>
                  <select v-model="modalForm.poCategory" class="form-control">
                    <option value="" disabled>Pilih kategori...</option>
                    <option v-for="k in modalKategoriPOOptions" :key="k.id" :value="k.searchKey">{{ k.name }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group mb-16">
                <label>Vendor</label>
                <SearchSelect v-model="modalForm.vendor" :display-value="modalForm.vendorName"
                  placeholder="Pilih vendor..." :fetch-fn="fetchVendors" @select="onModalVendorSelect"/>
              </div>

              <div class="form-group mb-16">
                <label>Alamat Partner <span v-if="modalLoadingLocations" class="label-hint">Memuat...</span></label>
                <select v-model="modalForm.partnerAddress" class="form-control" :disabled="!modalForm.vendor || modalLoadingLocations">
                  <option value="" disabled>{{ !modalForm.vendor ? 'Pilih vendor terlebih dahulu' : 'Pilih alamat...' }}</option>
                  <option v-for="loc in modalPartnerLocations" :key="loc.id" :value="loc.id">
                    {{ loc.locationAddress$_identifier || loc._identifier || loc.id }}
                  </option>
                </select>
                <span class="field-error mt-4" v-if="modalForm.vendor && !modalLoadingLocations && modalPartnerLocations.length === 0">Tidak ada alamat ditemukan untuk vendor ini.</span>
              </div>

              <div class="form-group mb-16">
                <label>Daftar Harga</label>
                <SearchSelect v-model="modalForm.priceList" :display-value="modalForm.priceListName"
                  placeholder="Pilih daftar harga..." :fetch-fn="fetchPriceLists" @select="opt => { modalForm.priceListName = opt?._identifier || opt?.name || '' }"/>
              </div>

              <div class="form-group mb-16">
                <label>Gudang <span v-if="modalForm.warehouseName" class="label-hint accent">(diingat)</span></label>
                <SearchSelect v-model="modalForm.warehouse" :display-value="modalForm.warehouseName"
                  placeholder="Pilih gudang..." :fetch-fn="fetchWarehouses" @select="onModalWarehouseSelect"/>
              </div>

              <div class="form-group mb-16">
                <label>Syarat Pembayaran <span v-if="modalForm.paymentTermsName" class="label-hint accent">(otomatis terisi)</span></label>
                <select v-model="modalForm.paymentTerms" class="form-control">
                  <option value="" disabled>Pilih syarat pembayaran...</option>
                  <option v-for="pt in modalPaymentTermOptions" :key="pt.id" :value="pt.id">{{ pt._identifier || pt.name }}</option>
                </select>
              </div>

              <div class="form-group mb-16">
                <label>Metode Pembayaran <span v-if="modalForm.paymentMethodName" class="label-hint accent">(otomatis terisi)</span></label>
                <select v-model="modalForm.paymentMethod" class="form-control">
                  <option value="" disabled>Pilih metode pembayaran...</option>
                  <option v-for="pm in modalPaymentMethodOptions" :key="pm.id" :value="pm.id">{{ pm._identifier || pm.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Pajak <span v-if="modalDefaultTaxId" class="label-hint accent">(diterapkan ke semua baris)</span></label>
                <select v-model="modalDefaultTaxId" class="form-control">
                  <option :value="null" disabled>Pilih pajak...</option>
                  <option v-for="t in modalTaxOptions" :key="t.id" :value="t.id">
                    {{ t._identifier || t.name }}{{ t.rate != null ? ' (' + t.rate + '%)' : '' }}
                  </option>
                </select>
              </div>
            </div>

            <div class="modal-footer justify-between bg-surface2">
              <span class="text-muted font-12 flex-center gap-4">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Order akan dibuat dengan status DRAFT
              </span>
              <div class="flex-center gap-8">
                <button class="btn btn--ghost" @click="showModal = false">Batal</button>
                <button class="btn btn--primary" @click="submitOrder" :disabled="!isModalValid || modalSubmitting">
                  <span v-if="modalSubmitting" class="btn-spinner"></span>
                  {{ modalSubmitting ? 'Membuat...' : 'Buat Order' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="success-pop">
        <div v-if="modalShowSuccess" class="modal-overlay z-max" @click.self="closeModalSuccess">
          <div class="modal modal--sm border-success">
            <div class="modal-header-success">
              <div class="success-icon-wrap">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 class="success-title">Purchase Order Berhasil Dibuat!</h2>
              <p class="success-subtitle">PO telah masuk ke sistem dengan status DRAFT</p>
            </div>
            
            <div class="modal-body align-center">
              <p class="form-label mt-0 mb-8">Nomor Purchase Order</p>
              <div class="po-number-box">
                <span class="po-number mono-text">{{ modalCreatedPONumber }}</span>
                <button @click="copyCreatedPONumber" :class="['btn btn--sm', modalCopyDone ? 'btn--ghost border-success text-success' : 'btn--primary']">
                  {{ modalCopyDone ? 'Tersalin!' : 'Salin' }}
                </button>
              </div>
              <div class="alert alert--blue mb-16 align-left">
                <div class="alert-content">
                  <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p class="alert-desc">Requisition terkait telah diperbarui secara otomatis. Gunakan nomor PO di atas untuk melacak order di Openbravo.</p>
                </div>
              </div>
              <button @click="closeModalSuccess" class="btn btn--primary w-100 btn--lg">Tutup</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import SearchSelect from '@/components/SearchSelect.vue' 
import { fetchProjects, fetchVendors, fetchPriceLists, fetchWarehouses, useRequisitionToOrder } from '@/services/requisitionToOrder.js'

const router = useRouter()

function logout() {
  localStorage.clear()
  sessionStorage.clear()
  router.push('/login')
}

const {
  USERNAME, 
  filter, onProjectSelect, fetchRequestersByProject,
  requisitions, linesByReq, loading, searched, expanded, loadingLines,
  headerSearch, filteredRequisitions,
  getColSearch, resetColSearch, filteredLines,
  gridCols,
  qtyToOrderExceeds, clampQtyToOrder, orderPriceExceeds, clampOrderPrice,
  selectedLines, isLineSelected, toggleLine,
  allLinesSelected, toggleAllLines, clearSelection,
  toggleExpand,
  search, resetFilter,
  getReqStatus,
  selectedPRCount,
  showModal, toast, successBanner, copyPONumber,
  modalForm, modalPartnerLocations, modalLoadingLocations,
  modalPaymentTermOptions, modalPaymentMethodOptions,
  modalTaxOptions, modalDefaultTaxId, modalKategoriPOOptions,
  modalSubmitting, modalShowSuccess, modalCreatedPONumber, modalCopyDone,
  modalOrderReference, isModalValid,
  onModalVendorSelect, onModalWarehouseSelect,
  submitOrder, copyCreatedPONumber, closeModalSuccess,
} = useRequisitionToOrder()
</script>

<style scoped>
/* ── Variables ────────────── */
*, *::before, *::after { box-sizing: border-box; }
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface2: #f1f5f9;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  
  --accent: #14532d;
  --accent-hover: #166534;
  --accent-light: #f0fdf4;
  
  --success: #16a34a;
  --danger: #ef4444;
  --blue: #2563eb;
  --blue-light: #eff6ff;
  
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,.1);
  --shadow-lg: 0 10px 25px -5px rgba(0,0,0,.1);
}

.app { min-height: 100vh; background: var(--bg); font-family: var(--font); padding-bottom: 48px; }
.bold { font-weight: 600; }
.text-primary { color: var(--text-primary); }
.text-muted { color: var(--text-muted); }
.text-blue { color: var(--blue); font-weight: 600; }
.text-success { color: var(--success) !important; }
.mono-text { font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.02em; user-select: all; }
.align-center { text-align: center; }
.align-left { text-align: left; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.font-12 { font-size: 12px; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mt-4 { margin-top: 4px; }
.w-80 { width: 80px !important; }
.w-100 { width: 100% !important; }
.z-max { z-index: 9999 !important; }

.flex-center { display: flex; align-items: center; }
.justify-between { justify-content: space-between; }
.gap-4 { gap: 4px; }
.gap-8 { gap: 8px; }

.top-navbar { background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 30; height: 56px; }
.nav-container { max-width: 1280px; margin: 0 auto; padding: 0 24px; height: 100%; display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 12px; }
.brand-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; }
.brand-title { font-weight: 700; color: var(--text-primary); font-size: 14px; line-height: 1; margin-bottom: 3px; }
.brand-subtitle { font-size: 11px; color: var(--text-muted); }
.nav-actions { display: flex; align-items: center; gap: 12px; }
.user-info { display: none; align-items: center; gap: 8px; padding: 6px 12px; border-radius: var(--radius-sm); background: var(--surface2); border: 1px solid var(--border); }
@media (min-width: 640px) { .user-info { display: flex; } }
.user-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--accent-light); color: var(--accent); display: flex; align-items: center; justify-content: center; }
.user-name { font-size: 12px; font-weight: 600; color: var(--text-secondary); }

.page-wrap { padding: 24px 24px; max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.content-card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
.card-header { padding: 14px 20px; border-bottom: 1px solid var(--surface2); display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-secondary); font-size: 14px; }
.card-header svg { color: var(--accent); }
.card-body { padding: 20px; }

.form-grid-3 { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 640px) { .form-grid-3 { grid-template-columns: repeat(3, 1fr); } }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label, .form-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.label-hint { font-weight: 400; text-transform: none; margin-left: 4px; }
.label-hint.accent { color: var(--accent); }
.form-control { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; background: var(--surface2); color: var(--text-primary); outline: none; transition: border-color 0.15s; font-family: var(--font); }
.form-control:focus { border-color: var(--accent); background: #fff; box-shadow: 0 0 0 2px rgba(20, 83, 45, 0.1); }
.form-control:disabled { opacity: 0.6; cursor: not-allowed; }
.form-control--sm { height: 32px; padding: 0 8px; font-size: 12.5px; }
.input-error { border-color: var(--danger) !important; background: #fef2f2 !important; }
.field-error { font-size: 11.5px; color: var(--danger); display: block; }
.form-help { font-size: 11.5px; color: var(--text-muted); margin-top: 4px; margin-bottom: 0; }
.req { color: var(--danger); }
.read-only { background: var(--surface2) !important; color: var(--text-secondary); border-color: var(--border); pointer-events: none; }
.fake-select { display: flex; align-items: center; justify-content: space-between; background: var(--accent-light) !important; border-color: rgba(20, 83, 45, 0.2); color: var(--text-primary); font-weight: 500; }
.custom-checkbox { width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer; }
.custom-checkbox:disabled { opacity: 0.5; cursor: not-allowed; }
.mini-label { font-size: 11px; color: var(--text-muted); }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; font-family: var(--font); outline: none; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--surface2); color: var(--text-primary); }
.btn--sm { padding: 4px 12px; font-size: 12px; height: 28px; }
.btn--lg { padding: 12px 20px; font-size: 14px; }
.btn--badge { position: relative; padding-right: 12px; }
.btn-badge { background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 6px; font-size: 11px; margin-left: 4px; }
.btn--icon-only { padding: 6px; height: 32px; width: 32px; border-radius: var(--radius-sm); }
.btn-text-hidden { display: none; }
@media (min-width: 640px) { .btn-text-hidden { display: inline; } .btn--icon-only { width: auto; padding: 6px 12px; } }
.link-btn { background: none; border: none; color: var(--accent); font-size: 12px; font-weight: 500; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: 4px; }
.link-btn:hover { text-decoration: underline; }
.link-btn--danger { color: var(--text-muted); }
.link-btn--danger:hover { color: var(--danger); }
.action-row { display: flex; align-items: center; gap: 10px; }

.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; margin-bottom: 8px; }
.loading-dots span { width: 7px; height: 7px; background: var(--text-muted); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

.alert { display: flex; align-items: flex-start; justify-content: space-between; padding: 14px 20px; border-radius: var(--radius); border: 1px solid; margin-bottom: 16px; }
.alert-content { display: flex; gap: 12px; align-items: flex-start; }
.alert-icon { width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
.alert-title { font-size: 13.5px; font-weight: 600; margin-bottom: 2px; }
.alert-desc { font-size: 13px; }
.alert-close { background: none; border: none; font-size: 20px; line-height: 1; cursor: pointer; opacity: 0.6; padding: 0; margin-left: 12px; }
.alert-close:hover { opacity: 1; }
.alert--success { background: var(--accent-light); border-color: rgba(22, 163, 74, 0.2); color: #14532d; }
.alert--success .alert-icon { color: var(--success); }
.alert--blue { background: var(--blue-light); border-color: rgba(37, 99, 235, 0.2); color: #1e3a8a; padding: 12px 16px; }
.alert--blue .alert-icon { color: var(--blue); }

.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 3000; display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: var(--radius); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); min-width: 300px; }
.toast--error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

.summary-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 8px; }
.summary-stats { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.summary-text { font-size: 13px; color: var(--text-secondary); }
.status-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.status-pill--accent { background: var(--accent-light); color: var(--accent); }
.status-pill--blue { background: var(--blue-light); color: var(--blue); }
.status-pill--active { background: #f0fdf4; color: var(--success); }
.status-pill--inactive { background: #fff1f2; color: var(--danger); }
.status-pill--neutral { background: var(--surface2); color: var(--text-secondary); }

.quick-filter-header { padding: 10px 16px; border-bottom: 1px solid var(--surface2); font-size: 12px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.quick-filter-grid { display: grid; grid-template-columns: repeat(2, 1fr); border-top: none; }
@media (min-width: 640px) { .quick-filter-grid { grid-template-columns: repeat(5, 1fr); } }
.qf-group { padding: 10px 12px; border-right: 1px solid var(--surface2); border-bottom: 1px solid var(--surface2); }
.qf-group.border-none { border-right: none; }
.qf-group label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.qf-input { width: 100%; border: none; background: transparent; font-size: 12px; color: var(--text-primary); outline: none; padding: 0; font-family: var(--font); }

.accordion-list { display: flex; flex-direction: column; gap: 12px; }
.accordion-card { overflow: visible; }
.accordion-header { display: flex; align-items: center; gap: 16px; padding: 14px 20px; cursor: pointer; transition: background 0.15s; }
.accordion-header:hover { background: #fafbfc; }
.expand-icon { width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.2s; flex-shrink: 0; background: #fff; }
.expand-icon.expanded { background: var(--accent); border-color: var(--accent); color: #fff; transform: rotate(90deg); }

.req-data-grid { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; align-items: center; }
@media (min-width: 640px) { .req-data-grid { grid-template-columns: repeat(5, 1fr); } }
.req-data-col { min-width: 0; }
.req-label { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
.req-value { font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.accordion-body { border-top: 1px solid var(--surface2); }
.lines-table-wrap { overflow-x: auto; }
.grid-row { display: grid; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--surface2); }
.grid-filter { background: #f8fafc; border-bottom: 1px solid var(--border); padding: 8px 16px; }
.grid-header { background: #f8fafc; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.grid-data { font-size: 13px; transition: background 0.1s; }
.grid-data:hover:not(.row-disabled) { background: rgba(20, 83, 45, 0.03); }
.grid-data:last-child { border-bottom: none; }
.grid-cell { min-width: 0; }
.grid-cell.center { text-align: center; display: flex; justify-content: center; }
.td-name { font-weight: 500; color: var(--text-primary); }
.td-secondary { color: var(--text-secondary); }
.row-disabled { background: #f8fafc; opacity: 0.7; }
.row-selected { background: rgba(20, 83, 45, 0.05); }

.empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); font-size: 13px; }
.card-empty { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); }
.card-empty.dashed { border: 1px dashed #cbd5e1; background: #fff; }
.empty-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--text-muted); }
.empty-icon.icon-accent { background: var(--accent-light); color: var(--accent); opacity: 0.8; }
.empty-title { font-weight: 600; color: var(--text-secondary); font-size: 14px; margin: 0 0 4px; }
.empty-desc { margin: 0; font-size: 12.5px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: 16px; box-shadow: var(--shadow-lg); width: 100%; max-width: 520px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
.modal--sm { max-width: 420px; }
.border-success { border: 1px solid var(--success); }

.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
.header-accent { background: var(--accent); color: #fff; border-bottom: none; }
.modal-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
.modal-subtitle { font-size: 12px; opacity: 0.8; margin: 0; }
.modal-close { background: none; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; color: var(--text-muted); }
.modal-close.close-white { color: rgba(255,255,255,0.7); }
.modal-close.close-white:hover { background: rgba(255,255,255,0.1); color: #fff; }

.modal-info-bar { background: var(--blue-light); border-bottom: 1px solid rgba(37, 99, 235, 0.1); padding: 12px 24px; font-size: 12px; color: #1e3a8a; display: flex; gap: 10px; align-items: flex-start; line-height: 1.4; }
.modal-info-bar svg { flex-shrink: 0; margin-top: 2px; color: var(--blue); }

.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; }
.bg-surface2 { background: var(--surface2); }

.modal-header-success { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); padding: 32px 24px 24px; text-align: center; }
.success-icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.2); border: 4px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #fff; }
.success-title { color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 4px; }
.success-subtitle { color: rgba(255,255,255,0.8); font-size: 13px; margin: 0; }
.po-number-box { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 2px solid rgba(20, 83, 45, 0.1); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 24px; }
.po-number { flex: 1; text-align: center; font-size: 18px; font-weight: 700; color: var(--accent); letter-spacing: 0.1em; }

.expand-enter-active, .expand-leave-active { transition: max-height 0.25s ease-in-out, opacity 0.2s ease; overflow: hidden; max-height: 1500px; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }
.success-pop-enter-active { transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.success-pop-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.success-pop-enter-from { opacity: 0; transform: scale(0.9); }
.success-pop-leave-to { opacity: 0; transform: scale(0.95); }
</style>