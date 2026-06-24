<template>
  <div class="app">

    <!-- ══════════════════════════════════════════════════════════
         LIST VIEW
    ══════════════════════════════════════════════════════════ -->
    <div v-if="!page.show" class="page-wrap">
      <div class="content-card">

        <!-- Header -->
        <div class="card-header">
          <h2 class="page-title">Pelanggan</h2>
        </div>

        <!-- ══ LIST TAB ══ -->
        <div v-if="activeTab==='list'">
          <div class="toolbar">
            <!-- <div class="search-wrap">
              <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input v-model="searchQuery" class="search-input" placeholder="Mencari..." @input="onSearch" />
            </div> -->
            <button class="btn btn--primary" style="margin-left: auto;" @click="openCreatePage">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Buat Pelanggan
            </button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <colgroup>
                <col style="width:150px">
                <col>
                <col style="width:200px">
                <col style="width:150px">
                <col style="width:100px">
                <col style="width:140px">
              </colgroup>
              <thead>
                <tr>
                  <th class="sortable" :class="{ asc: sortCol==='searchKey' && sortDir==='asc', desc: sortCol==='searchKey' && sortDir==='desc' }" @click="toggleSort('searchKey')">Kode</th>
                  <th class="sortable" :class="{ asc: sortCol==='name' && sortDir==='asc', desc: sortCol==='name' && sortDir==='desc' }" @click="toggleSort('name')">Nama Pelanggan</th>
                  <th>Alamat</th>
                  <th>Telepon</th>
                  <th>Status</th>
                  <th class="th-action">Tindakan</th>
                </tr>
                <tr class="filter-row">
                  <th><input v-model="colFilters.searchKey" @input="onFilterInput" class="col-search" type="text" placeholder="Cari kode…" /></th>
                  <th><input v-model="colFilters.name" @input="onFilterInput" class="col-search" type="text" placeholder="Cari nama…" /></th>
                  <th><input v-model="colFilters.address" @input="onFilterInput" class="col-search" type="text" placeholder="Cari alamat…" /></th>
                  <th><input v-model="colFilters.phone" @input="onFilterInput" class="col-search" type="text" placeholder="Cari telepon…" /></th>
                  <th>
                    <div class="status-filter" v-click-outside="() => statusOpen=false">
                      <button type="button" class="status-filter-btn" :class="{ 'is-narrowed': selectedStatuses.length !== STATUS_DEFS.length }" @click.stop="statusOpen=!statusOpen">
                        <span class="status-filter-label">{{ statusSummary }}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <div v-if="statusOpen" class="status-filter-menu">
                        <label v-for="s in STATUS_DEFS" :key="s.code" class="status-check">
                          <input type="checkbox" :checked="statusSel[s.code]" @change="toggleStatus(s.code)" />
                          <span>{{ s.label }}</span>
                        </label>
                      </div>
                    </div>
                  </th>
                  <th class="th-action">
                    <button v-if="hasActiveFilter" type="button" class="filter-reset" @click="resetFilters" title="Hapus semua filter">Reset</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading"><td colspan="6" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
                <tr v-else-if="error"><td colspan="6" class="td-empty td-error">{{ error }}</td></tr>
                <tr v-else-if="customers.length===0"><td colspan="6" class="td-empty">Tidak ada pelanggan yang ditemukan.</td></tr>
                <template v-else>
                  <tr v-for="c in customers" :key="c.id" class="tr-data">
                    <td><span class="code-badge">{{ c.searchKey || '—' }}</span></td>
                    <td class="td-name">{{ c.name }}</td>
                    <td class="td-secondary">
                      <span v-if="c._enriching" class="cell-loading">memuat…</span>
                      <span v-else>{{ c.fullAddress || '—' }}</span>
                    </td>
                    <td class="td-secondary td-mono">
                      <span v-if="c._enriching" class="cell-loading">…</span>
                      <span v-else>{{ c.phone || '—' }}</span>
                    </td>
                    <td>
                      <span class="status-pill" :class="statusClass(c)">{{ rowStatusLabel(c) }}</span>
                    </td>
                    <td class="td-action-cell">
                      <div class="action-group">
                        <div class="dropdown-wrap" v-click-outside="closeDropdown">
                          <button class="action-btn" @click.stop="toggleDropdown(c.id, $event)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                          <div v-if="openDropdown===c.id" class="dropdown-menu" :style="{top:dropdownPos.top+'px',right:dropdownPos.right+'px'}">
                            <button class="dropdown-item" @click="openViewModal(c)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Melihat
                            </button>
                            <button class="dropdown-item" @click="openEditPage(c); closeDropdown()">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Sunting
                            </button>
                            <button v-if="c.active" class="dropdown-item dropdown-item--danger" @click="confirmToggle(c)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Menghapus
                            </button>
                            <button v-else class="dropdown-item dropdown-item--success" @click="confirmToggle(c)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>Tetapkan Sebagai Aktif
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
              <button class="page-btn page-btn--text" :disabled="currentPage===1" @click="goPage(1)">Awal</button>
              <button class="page-btn" :disabled="currentPage===1" @click="goPage(currentPage-1)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button v-for="p in paginationPages" :key="p" :class="['page-btn', p===currentPage?'page-btn--active':'']" @click="typeof p==='number'&&goPage(p)">{{ p }}</button>
              <button class="page-btn" :disabled="currentPage===totalPages" @click="goPage(currentPage+1)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button class="page-btn page-btn--text" :disabled="currentPage===totalPages" @click="goPage(totalPages)">Akhir</button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         CREATE / EDIT CUSTOMER — FULL PAGE
    ══════════════════════════════════════════════════════════ -->
    <Transition name="slide">
      <div v-if="page.show && page.type==='customer'" class="page-wrap">

        <div class="breadcrumb-row">
          <button class="breadcrumb-back" @click="closePage">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            List Customer
          </button>
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-cur">{{ page.mode==='create' ? 'Buat Pelanggan' : 'Ubah Pelanggan' }}</span>
        </div>

        <div class="form-page-title">{{ page.mode==='create' ? 'Buat Pelanggan' : 'Ubah Pelanggan' }}</div>

        <!-- Customer Info Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Informasi Pelanggan
          </div>
          <!-- Row 1: Identity fields -->
          <div class="form-grid-3">
            <div class="form-group">
              <label>Kode Pelanggan <span class="req">*</span></label>
              <div style="position:relative">
                <input 
                  v-model="form.searchKey" 
                  :placeholder="page.mode==='create' && (!form.district || !form.subdistrict) ? 'Pilih Kecamatan & Desa/Kelurahan...' : 'Generating...'" 
                  :class="{'input-error':formErrors.searchKey}" 
                  :disabled="page.mode==='edit'" 
                  :readonly="page.mode==='create'" 
                  style="padding-right:32px" 
                />
                <span v-if="codeGenerating" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:11px">⟳</span>
              </div>
              <span class="field-error" v-if="formErrors.searchKey">{{ formErrors.searchKey }}</span>
            </div>
            <div class="form-group">
              <label>Nama Pelanggan <span class="req">*</span></label>
              <input v-model="form.name" placeholder="Nama Pelanggan" :class="{'input-error':formErrors.name}" />
              <span class="field-error" v-if="formErrors.name">{{ formErrors.name }}</span>
            </div>
            <div class="form-group">
              <label>Golongan</label>
              <select v-model="form.linkGL">
                <option value="">Pilih Golongan</option>
                <option v-for="cat in bpCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <!-- Row 2: Location fields -->
          <div class="form-section-divider">
            <span class="form-section-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Alamat / Lokasi
            </span>
          </div>
          <div class="form-grid-3" style="margin-top:12px">

            <!-- Province Combobox -->
            <div class="form-group">
              <label>Provinsi</label>
              <div class="combobox-wrap" v-click-outside="() => comboOpen.province = false">
                <div class="combobox-input-wrap">
                  <input
                    class="combobox-input"
                    v-model="comboSearch.province"
                    placeholder="Ketik atau pilih provinsi..."
                    @focus="comboOpen.province = true"
                    @input="onProvinceInput"
                  />
                  <svg class="combobox-chevron" :class="{ open: comboOpen.province }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="comboOpen.province = !comboOpen.province"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <ul v-if="comboOpen.province && filteredProvinces.length" class="combobox-list">
                  <li v-for="p in filteredProvinces" :key="p.id" class="combobox-item" :class="{ active: form.provinceId === p.id }" @mousedown.prevent="selectProvince(p)">{{ p.name }}</li>
                </ul>
                <ul v-else-if="comboOpen.province && comboSearch.province && !filteredProvinces.length" class="combobox-list">
                  <li class="combobox-empty">Tidak ada hasil yang ditemukan</li>
                </ul>
              </div>
            </div>

            <!-- City/Regency Combobox -->
            <div class="form-group">
              <label>Kota/Kabupaten</label>
              <div class="combobox-wrap" v-click-outside="() => comboOpen.city = false">
                <div class="combobox-input-wrap">
                  <input
                    class="combobox-input"
                    v-model="comboSearch.city"
                    placeholder="Ketik atau pilih kota..."
                    @focus="comboOpen.city = true"
                    @input="onCityInput"
                  />
                  <svg class="combobox-chevron" :class="{ open: comboOpen.city }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="comboOpen.city = !comboOpen.city"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <ul v-if="comboOpen.city && filteredCities.length" class="combobox-list">
                  <li v-for="c in filteredCities" :key="c.id" class="combobox-item" :class="{ active: form.cityId === c.id }" @mousedown.prevent="selectCity(c)">{{ c.name }}</li>
                </ul>
                <ul v-else-if="comboOpen.city && comboSearch.city && !filteredCities.length" class="combobox-list">
                  <li class="combobox-empty">Tidak ada hasil yang ditemukan</li>
                </ul>
              </div>
            </div>

            <!-- District Combobox -->
            <div class="form-group">
              <label>Kecamatan</label>
              <div class="combobox-wrap" v-click-outside="() => comboOpen.district = false">
                <div class="combobox-input-wrap">
                  <input
                    class="combobox-input"
                    v-model="comboSearch.district"
                    placeholder="Ketik atau pilih kecamatan..."
                    @focus="comboOpen.district = true"
                    @input="onDistrictInput"
                  />
                  <svg class="combobox-chevron" :class="{ open: comboOpen.district }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="comboOpen.district = !comboOpen.district"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <ul v-if="comboOpen.district && filteredDistricts.length" class="combobox-list">
                  <li v-for="d in filteredDistricts" :key="d.id" class="combobox-item" :class="{ active: form.districtId === d.id }" @mousedown.prevent="selectDistrict(d)">{{ d.name }}</li>
                </ul>
                <ul v-else-if="comboOpen.district && comboSearch.district && !filteredDistricts.length" class="combobox-list">
                  <li class="combobox-empty">Tidak ada hasil yang ditemukan</li>
                </ul>
              </div>
            </div>

            <!-- Sub-district Combobox -->
            <div class="form-group">
              <label>Desa/Kelurahan</label>
              <div class="combobox-wrap" v-click-outside="() => comboOpen.subdistrict = false">
                <div class="combobox-input-wrap">
                  <input
                    class="combobox-input"
                    v-model="comboSearch.subdistrict"
                    placeholder="Ketik atau pilih desa/kelurahan..."
                    @focus="comboOpen.subdistrict = true"
                    @input="onSubdistrictInput"
                  />
                  <svg class="combobox-chevron" :class="{ open: comboOpen.subdistrict }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="comboOpen.subdistrict = !comboOpen.subdistrict"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <ul v-if="comboOpen.subdistrict && filteredSubdistricts.length" class="combobox-list">
                  <li v-for="s in filteredSubdistricts" :key="s.id" class="combobox-item" :class="{ active: form.subdistrictId === s.id }" @mousedown.prevent="selectSubdistrict(s)">{{ s.name }}</li>
                </ul>
                <ul v-else-if="comboOpen.subdistrict && comboSearch.subdistrict && !filteredSubdistricts.length" class="combobox-list">
                  <li class="combobox-empty">Tidak ada hasil yang ditemukan</li>
                </ul>
              </div>
            </div>

            <div class="form-group">
              <label>Kode Pos</label>
              <input v-model="form.postalCode" placeholder="Isi otomatis atau Input manual" />
            </div>
            <div class="form-group">
              <label>Detail Alamat</label>
              <input v-model="form.streetAddress" placeholder="Isi detail alamat" />
            </div>
            <div class="form-group">
              <label>Detail Alamat Lainnya</label>
              <input v-model="form.otherDetails" placeholder="Isi detail alamat lainnya" />
            </div>
          </div>
          <div class="form-checks" style="margin-top:14px">
            <label class="check-label"><input type="checkbox" :checked="form.active" disabled /> Aktif (otomatis dari Status)</label>
            <label class="check-label"><input type="checkbox" v-model="form.taxExempt" /> Tax Exempt</label>
          </div>
        </div>

        <!-- Meter & Status Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Informasi Meter & Status
          </div>
          <div class="form-grid-4">
            <div class="form-group">
              <label>Diameter</label>
              <input v-model="form.diameter" type="number" step="any" placeholder="Diameter" />
            </div>
            <div class="form-group">
              <label>Meter</label>
              <input v-model="form.meter" placeholder="Nomor Meter" />
            </div>
            <div class="form-group">
              <label>Cycle</label>
              <select v-model="form.cycle">
                <option value="">Pilih Cycle</option>
                <option v-for="cy in lookups.cycles" :key="cy.id" :value="cy.value ?? cy.searchKey">{{ cy.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="form.status">
                <option value="">Pilih Status</option>
                <option value="A">Aktif</option>
                <option value="P">Putus</option>
                <option value="S">Segel</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Payment Info Card -->
        <!-- <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Informasi Pembayaran
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label>Daftar Harga <span class="req">*</span></label>
              <select v-model="form.priceList" :class="{'input-error': formErrors.priceList}">
                <option value="">Pilih Daftar Harga</option>
                <option v-for="pl in lookups.priceLists" :key="pl.id" :value="pl.id">{{ pl.name }}</option>
              </select>
              <span class="field-error" v-if="formErrors.priceList">{{ formErrors.priceList }}</span>
            </div>
            <div class="form-group">
              <label>Metode Pembayaran <span class="req">*</span></label>
              <select v-model="form.paymentMethod" :class="{'input-error': formErrors.paymentMethod}">
                <option value="">Pilih Metode Pembayaran</option>
                <option v-for="pm in lookups.paymentMethods" :key="pm.id" :value="pm.id">{{ pm['_identifier'] || pm.name }}</option>
              </select>
              <span class="field-error" v-if="formErrors.paymentMethod">{{ formErrors.paymentMethod }}</span>
            </div>
            <div class="form-group">
              <label>Term Pembayaran <span class="req">*</span></label>
              <select v-model="form.paymentTerms" :class="{'input-error': formErrors.paymentTerms}">
                <option value="">Pilih Term Pembayaran</option>
                <option v-for="pt in lookups.paymentTerms" :key="pt.id" :value="pt.id">{{ pt.name }}</option>
              </select>
              <span class="field-error" v-if="formErrors.paymentTerms">{{ formErrors.paymentTerms }}</span>
            </div>
            <div class="form-group">
              <label>Akun Keuangan</label>
              <select v-model="form.account">
                <option value="">Pilih Akun Keuangan</option>
                <option v-for="fa in lookups.financialAccounts" :key="fa.id" :value="fa.id">{{ fa['_identifier'] || fa.name }}</option>
              </select>
            </div>
          </div>
        </div> -->

        <!-- Contact Card -->
        <div class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Kontak
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Nama Depan <span v-if="page.mode==='create'" class="req">*</span></label>
              <input v-model="form.contactFirstName" placeholder="First name" :class="{'input-error': formErrors.contactFirstName}" />
              <span class="field-error" v-if="formErrors.contactFirstName">{{ formErrors.contactFirstName }}</span>
            </div>
            <div class="form-group"><label>Nama Belakang</label><input v-model="form.contactLastName" placeholder="Last name" /></div>
            <div class="form-group"><label>Email</label><input v-model="form.contactEmail" placeholder="Email" type="email" /></div>
            <div class="form-group"><label>Telepon</label><input v-model="form.contactPhone" placeholder="Phone" /></div>
            <div class="form-group"><label>NIK (Nomor Induk Kependudukan)</label><input v-model="form.contactNik" placeholder="NIK" /></div>
            <div class="form-group"><label>NKK (Nomor Kartu Keluarga)</label><input v-model="form.contactNkk" placeholder="NKK" /></div>
            <div class="form-group"><label>Sim (Surat Izin Mengemudi)</label><input v-model="form.contactSim" placeholder="SIM" /></div>
            <div class="form-group"><label>Passport</label><input v-model="form.contactPassport" placeholder="Passport" /></div>
            <div class="form-group"><label>SIUP (Surat Izin Usaha Perdagangan)</label><input v-model="form.contactSiup" placeholder="SIUP" /></div>
          </div>
        </div>

        <!-- Audit Info — hanya tampil saat edit -->
        <div v-if="page.mode === 'edit' && page.data" class="form-card">
          <div class="form-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Informasi Audit
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Dibuat Pada</label>
              <input :value="page.data.creationDate ? formatDateTime(page.data.creationDate) : '—'" disabled />
            </div>
            <div class="form-group">
              <label>Dibuat Oleh</label>
              <input :value="page.data['createdBy$_identifier'] || '—'" disabled />
            </div>
            <div class="form-group">
              <label>Diupdate Pada</label>
              <input :value="page.data.updated ? formatDateTime(page.data.updated) : '—'" disabled />
            </div>
            <div class="form-group">
              <label>Diupdate Oleh</label>
              <input :value="page.data['updatedBy$_identifier'] || '—'" disabled />
            </div>
          </div>
        </div>

        <div v-if="formError" class="form-api-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ formError }}
        </div>

        <div class="page-footer">
          <button class="btn btn--ghost" @click="closePage" :disabled="formLoading">Batal</button>
          <button class="btn btn--primary" @click="submitForm" :disabled="formLoading">
            <span v-if="formLoading" class="btn-spinner"></span>
            {{ formLoading ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════
         VIEW CUSTOMER DETAIL MODAL
    ══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="viewModal.show && viewModal.type==='customer'" class="modal-overlay" @click.self="viewModal.show=false">
        <div class="modal modal--detail">
          <div class="modal-header">
            <h3 class="modal-title">Detail Pelanggan</h3>
            <button class="modal-close" @click="viewModal.show=false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="detail-panel">
              <div class="detail-section-label">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Informasi Pelanggan
              </div>
              <div class="detail-cols">
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Kode Pelanggan/SKU</span>
                    <span class="detail-value mono">{{ viewModal.data?.searchKey || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Nama Pelanggan</span>
                    <span class="detail-value">{{ viewModal.data?.name || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Golongan</span>
                    <span class="detail-value">{{ viewModal.data?.['businessPartnerCategory$_identifier'] || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span :class="['status-pill', viewModal.data?.active?'status-pill--active':'status-pill--inactive']">
                      {{ viewModal.data?.active ? 'Aktif' : 'Tidak Aktif' }}
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Tax Exempt</span>
                    <span class="detail-value">{{ viewModal.data?.taxExempt ? 'Yes' : 'No' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Diameter</span>
                    <span class="detail-value">{{ viewModal.data?.diameter ?? '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Meter</span>
                    <span class="detail-value">{{ viewModal.data?.meter || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Cycle</span>
                    <span class="detail-value">{{ cycleLabel(viewModal.data?.cycle) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">{{ statusLabel(viewModal.data?.status) }}</span>
                  </div>
                </div>
                
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Provinsi</span>
                    <span class="detail-value">{{ viewLocationDetail?.regionName || viewLocationDetail?.em_idn_province || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Kota/Kabupaten</span>
                    <span class="detail-value">{{ viewLocationDetail?.cityName && viewLocationDetail?.cityName !== '-' ? viewLocationDetail.cityName : '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Kecamatan</span>
                    <span class="detail-value">{{ viewLocationDetail?.district || viewLocationDetail?.em_idn_district || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Desa/Kelurahan</span>
                    <span class="detail-value">{{ viewLocationDetail?.subdistrict || viewLocationDetail?.em_idn_subdistrict || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Detail Alamat</span>
                    <span class="detail-value">{{ viewLocationDetail?.addressLine1 && viewLocationDetail?.addressLine1 !== '-' ? viewLocationDetail.addressLine1 : '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Detail Alamat Lainnya</span>
                    <span class="detail-value">{{ viewLocationDetail?.addressLine2 || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Kode Pos</span>
                    <span class="detail-value">{{ viewLocationDetail?.postalCode || '—' }}</span>
                  </div>
                </div>
              </div>

              <!-- Audit Info -->
              <div class="detail-section-label" style="margin-top:18px">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Informasi Audit
              </div>
              <div class="detail-cols">
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Dibuat Pada</span>
                    <span class="detail-value">{{ viewModal.data?.creationDate ? formatDateTime(viewModal.data.creationDate) : '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Dibuat Oleh</span>
                    <span class="detail-value">{{ viewModal.data?.['createdBy$_identifier'] || '—' }}</span>
                  </div>
                </div>
                <div class="detail-col">
                  <div class="detail-item">
                    <span class="detail-label">Diupdate Pada</span>
                    <span class="detail-value">{{ viewModal.data?.updated ? formatDateTime(viewModal.data.updated) : '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Diupdate Oleh</span>
                    <span class="detail-value">{{ viewModal.data?.['updatedBy$_identifier'] || '—' }}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="editFromView">Edit</button>
            <button class="btn btn--primary" @click="viewModal.show=false">Tutup</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ DELETE / TOGGLE CUSTOMER ACTIVE MODAL ══ -->
    <Transition name="fade">
      <div v-if="toggleModal.show" class="modal-overlay" @click.self="toggleModal.show=false">
        <div class="modal modal--sm">
          <div class="modal-header">
            <h3 class="modal-title">{{ toggleModal.customer?.active ? 'Nonaktifkan Pelanggan' : 'Aktifkan Pelanggan' }}</h3>
            <button class="modal-close" @click="toggleModal.show=false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <p class="delete-text" v-if="toggleModal.customer?.active">Anda yakin ingin menonaktifkan <strong>{{ toggleModal.customer?.name }}</strong>?</p>
            <p class="delete-text" v-else>Anda yakin ingin mengaktifkan <strong>{{ toggleModal.customer?.name }}</strong>?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn--ghost" @click="toggleModal.show=false" :disabled="toggleLoading">Batal</button>
            <button :class="['btn', toggleModal.customer?.active ? 'btn--danger' : 'btn--primary']" @click="doToggle" :disabled="toggleLoading">
              <span v-if="toggleLoading" class="btn-spinner"></span>
              {{ toggleModal.customer?.active ? 'Nonaktifkan' : 'Aktifkan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══ TOAST ══ -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['toast', `toast--${toast.type}`]">
        <svg v-if="toast.type==='success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        {{ toast.message }}
      </div>
    </Transition>

    <!-- ══ LOGIN MODAL (sementara) ══ -->
    <!-- Menutupi seluruh halaman sampai user mengisi username & password
         Openbravo yang valid. Tidak ada kredensial yang ditulis di kode. -->
    <div v-if="!authReady" class="modal-overlay login-overlay">
      <div class="modal modal--sm">
        <div class="modal-header">
          <h3 class="modal-title">Masuk ke Halaman Customer</h3>
        </div>
        <p v-if="sessionExpiredMsg" class="field-error" style="margin:0 20px 0; padding:10px 14px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px;">
          {{ sessionExpiredMsg }}
        </p>
        <form class="modal-body" @submit.prevent="doLogin">
          <div class="form-group" style="margin-bottom:14px;">
            <label>Username</label>
            <input v-model="loginForm.username" type="text" autocomplete="username" :disabled="loginLoading" autofocus />
          </div>
          <div class="form-group" style="margin-bottom:4px;">
            <label>Password</label>
            <input v-model="loginForm.password" type="password" autocomplete="current-password" :disabled="loginLoading" />
          </div>
          <p v-if="loginError" class="field-error" style="margin-top:10px;">{{ loginError }}</p>
        </form>
        <div class="modal-footer">
          <button class="btn btn--primary" style="width:100%;" @click="doLogin" :disabled="loginLoading || !loginForm.username || !loginForm.password">
            <span v-if="loginLoading" class="btn-spinner"></span>
            {{ loginLoading ? 'Memeriksa…' : 'Masuk' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'
import {
  fetchCustomerPage, fetchCustomerCount, createCustomer, updateCustomer,
  generateCustomerCode, fetchPaymentTerms, fetchPriceLists, fetchPaymentMethods, fetchFinancialAccounts,
  fetchContacts, fetchContactsForIds, createContact, updateContact,
  fetchBPLocations, fetchBPLocationsForIds, fetchLocation, fetchLocationsByIds, createLocation, updateLocation,
  createBPLocation, updateBPLocation, deleteBPLocation, fetchBPCategories, fetchCycleList,
  setAuthCredentials, hasAuthCredentials, testAuthCredentials,
} from '@/services/customer'

// ════════════════════════════════════════════════════════════
// LOGIN POPUP SEMENTARA — username & password TIDAK di-hardcode.
// Disimpan hanya di sessionStorage lewat customer.js (hilang saat
// tab/browser ditutup). Halaman utama baru memuat data setelah
// kredensial diverifikasi ke server.
// ════════════════════════════════════════════════════════════
const authReady = ref(hasAuthCredentials())
const loginLoading = ref(false)
const loginError = ref(null)
const loginForm = reactive({ username: '', password: '' })
// Pesan khusus saat login modal muncul akibat auto-logout (bukan login awal)
const sessionExpiredMsg = ref(null)

async function doLogin() {
  if (!loginForm.username || !loginForm.password) return
  loginLoading.value = true
  loginError.value = null
  try {
    const ok = await testAuthCredentials(loginForm.username, loginForm.password)
    if (!ok) {
      loginError.value = 'Username atau password salah.'
      return
    }
    setAuthCredentials(loginForm.username, loginForm.password)
    loginForm.password = ''
    sessionExpiredMsg.value = null
    authReady.value = true
    resetIdleTimer()
    load(); loadLookups(); loadProvinces()
  } catch (e) {
    loginError.value = 'Gagal menghubungi server. Coba lagi.'
  } finally {
    loginLoading.value = false
  }
}

// ════════════════════════════════════════════════════════════
// AUTO-LOGOUT KARENA IDLE — kalau tidak ada aktivitas (mouse,
// keyboard, scroll, sentuh) selama IDLE_LIMIT_MS, kredensial
// dihapus dan modal login ditampilkan kembali dengan pesan bahwa
// sesi berakhir. Timer hanya berjalan ketika authReady true.
// ════════════════════════════════════════════════════════════
const IDLE_LIMIT_MS = 10 * 60 * 1000 // 10 menit
let idleTimer = null

function resetIdleTimer() {
  if (!authReady.value) return
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(handleSessionExpired, IDLE_LIMIT_MS)
}

function clearIdleTimer() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
}

function handleSessionExpired() {
  clearIdleTimer()
  clearAuthCredentials()
  sessionExpiredMsg.value = 'Sesi Anda berakhir karena tidak ada aktivitas selama 10 menit. Silakan masuk kembali.'
  authReady.value = false
}

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']

function onUserActivity() {
  resetIdleTimer()
}

// Idle timer mengikuti status authReady — begitu user login, timer mulai;
// begitu logout (manual maupun auto-expired), timer dihentikan.
watch(authReady, (ready) => {
  if (ready) resetIdleTimer()
  else clearIdleTimer()
})

const vClickOutside = {
  mounted(el, binding) { el._co = e => { if (!el.contains(e.target)) binding.value(e) }; document.addEventListener('click', el._co) },
  unmounted(el) { document.removeEventListener('click', el._co) },
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return d.toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return isoStr }
}

const STATUS_LABELS = { A: 'Aktif', P: 'Putus', S: 'Segel' }
function statusLabel(code) { return STATUS_LABELS[code] || '—' }
function cycleLabel(code) {
  if (!code) return '—'
  const found = lookups.cycles.find(cy => (cy.value ?? cy.searchKey) === code)
  return found ? found.name : code
}

const activeTab = ref('list')
const customers = ref([])
const loading   = ref(false)
const error     = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize  = ref(10)
const pageSizeOptions = [10, 100, 1000]
const totalRows = ref(0)
let searchTimeout = null

// ── Filter per kolom ──────────────────────────────────────────
const colFilters = reactive({ searchKey: '', name: '', address: '', phone: '' })
// Status (checkbox). Default semua tercentang = tampilan normal.
const STATUS_DEFS = [
  { code: 'A', label: 'Aktif' },
  { code: 'P', label: 'Putus' },
  { code: 'S', label: 'Segel' },
]
const statusSel = reactive({ A: true, P: true, S: true })
const statusOpen = ref(false)
const selectedStatuses = computed(() => STATUS_DEFS.map(s => s.code).filter(c => statusSel[c]))
const statusSummary = computed(() => {
  const sel = selectedStatuses.value
  if (sel.length === 0) return 'Tidak ada'
  if (sel.length === STATUS_DEFS.length) return 'Semua status'
  return STATUS_DEFS.filter(s => statusSel[s.code]).map(s => s.label).join(', ')
})

// Gabungan semua filter -> dikirim ke service. Juga jadi kunci cache count.
const currentFilters = computed(() => ({
  global:    searchQuery.value,
  searchKey: colFilters.searchKey,
  name:      colFilters.name,
  address:   colFilters.address,
  phone:     colFilters.phone,
  statuses:  selectedStatuses.value,
}))

// Label & warna status di kolom STATUS (pakai field `status`, fallback ke active).
function rowStatusLabel(c) {
  if (c.status && STATUS_LABELS[c.status]) return STATUS_LABELS[c.status]
  return c.active ? 'Aktif' : 'Tidak aktif'
}
function statusClass(c) {
  const code = c.status || (c.active ? 'A' : 'X')
  return {
    'status-pill--aktif': code === 'A',
    'status-pill--putus': code === 'P',
    'status-pill--segel': code === 'S',
    'status-pill--inactive': code === 'X',
  }
}

const sortCol = ref('searchKey')
const sortDir = ref('asc')

function toggleSort(col) {
  if (sortCol.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortCol.value = col; sortDir.value = 'asc' }
  currentPage.value = 1; load()
}

const openDropdown = ref(null)
const dropdownPos  = ref({ top: 0, right: 0 })

const lookups = reactive({ paymentTerms: [], priceLists: [], paymentMethods: [], financialAccounts: [], cycles: [] })
const bpCategories = ref([])

// Cache lookup di luar komponen: master data ini jarang berubah, jadi cukup
// diambil sekali per sesi. Mount berikutnya (mis. keluar-masuk halaman) instan.
let _lookupCache = null
async function loadLookups() {
  if (_lookupCache) {
    lookups.paymentTerms = _lookupCache.pt; lookups.priceLists = _lookupCache.pl
    lookups.paymentMethods = _lookupCache.pm; lookups.financialAccounts = _lookupCache.fa
    bpCategories.value = _lookupCache.cats; lookups.cycles = _lookupCache.cy
    return
  }
  try {
    const [pt, pl, pm, fa, cats, cy] = await Promise.all([
      fetchPaymentTerms(), fetchPriceLists(), fetchPaymentMethods(), fetchFinancialAccounts(), fetchBPCategories(), fetchCycleList(),
    ])
    lookups.paymentTerms = pt; lookups.priceLists = pl; lookups.paymentMethods = pm; lookups.financialAccounts = fa; bpCategories.value = cats; lookups.cycles = cy
    _lookupCache = { pt, pl, pm, fa, cats, cy }
  } catch (e) { console.warn('Lookup failed', e) }
}

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))
const paginationPages = computed(() => {
  const p = []; const t = totalPages.value; const c = currentPage.value
  if (t <= 7) { for (let i = 1; i <= t; i++) p.push(i); return p }
  p.push(1); if (c > 3) p.push('…')
  for (let i = Math.max(2, c-1); i <= Math.min(t-1, c+1); i++) p.push(i)
  if (c < t-2) p.push('…'); p.push(t); return p
})

// Rentang baris yang sedang ditampilkan, untuk teks "Menampilkan X sampai Y dari Z data"
const rangeStart = computed(() => customers.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const rangeEnd = computed(() => (currentPage.value - 1) * pageSize.value + customers.value.length)

// Token untuk membuang hasil request lama (race condition saat pindah halaman cepat),
// dan controller untuk membatalkan request yang masih jalan.
let loadToken = 0
let loadController = null
// filterKey yang nilai totalRows-nya sudah dihitung akurat (cache, supaya tidak
// menghitung ulang tiap pindah halaman / ukuran halaman), dan yang sedang dihitung.
let countedKey = null
let countingKey = null

async function load(forceCount = false) {
  // Batalkan request halaman sebelumnya yang mungkin masih menggantung,
  // supaya klik beruntun tidak menumpuk dan terasa "hang".
  if (loadController) loadController.abort()
  loadController = new AbortController()
  const signal = loadController.signal
  const myToken = ++loadToken
  const filters = currentFilters.value
  const keyForThisLoad = JSON.stringify(filters) // cache key = seluruh filter

  loading.value = true; error.value = null
  try {
    const startRow = (currentPage.value - 1) * pageSize.value

    // ── FASE 1: query ringan satu halaman → render SECEPATNYA.
    const { data, previewTotal } = await fetchCustomerPage({
      startRow, pageSize: pageSize.value,
      filters, sortCol: sortCol.value, sortDir: sortDir.value,
      signal,
    })
    if (myToken !== loadToken) return // sudah ada load lebih baru

    // Kalau server mengembalikan kosong dan kita bukan di halaman 1,
    // berarti startRow sudah melewati data (halaman terakhir palsu dari preview).
    if (data.length === 0 && currentPage.value > 1) {
      currentPage.value = Math.max(1, currentPage.value - 1)
      loading.value = false
      load(true)
      return
    }

    customers.value = data.map(c => ({ ...c, fullAddress: '', phone: '', _enriching: true }))
    loading.value = false // tabel sudah kelihatan

    // ── TOTAL BARIS ──────────────────────────────────────────────
    // Tampilkan preview cepat dulu (kalau masuk akal), supaya pagination
    // langsung muncul; lalu KOREKSI dengan hitungan akurat di latar belakang.
    if (forceCount) { countedKey = null; countingKey = null }
    if (countedKey !== keyForThisLoad) {
      // preview (boleh salah; sekadar biar pagination tidak kosong saat menunggu)
      if (typeof previewTotal === 'number' && previewTotal >= 0) {
        totalRows.value = Math.max(previewTotal, startRow + data.length)
      } else {
        totalRows.value = startRow + data.length
      }
      // hitung akurat — JANGAN pakai signal halaman, supaya tidak ikut dibatalkan
      // saat user pindah halaman; cukup dijaga per filter + hindari duplikat.
      if (countingKey !== keyForThisLoad) {
        countingKey = keyForThisLoad
        fetchCustomerCount({ filters })
          .then(n => {
            if (JSON.stringify(currentFilters.value) !== keyForThisLoad) return // filter sudah berubah
            if (typeof n === 'number' && n >= 0) { totalRows.value = n; countedKey = keyForThisLoad }
          })
          .catch(() => {})
          .finally(() => { if (countingKey === keyForThisLoad) countingKey = null })
      }
    }

    // ── FASE 2: enrich alamat & telepon di latar belakang, lalu tambal ke baris.
    enrichWithLocation(data, signal)
      .then(enriched => { if (myToken === loadToken) customers.value = enriched })
      .catch(err => {
        if (signal.aborted) return
        if (myToken === loadToken) customers.value = customers.value.map(c => ({ ...c, _enriching: false }))
      })
  } catch (e) {
    if (signal.aborted || e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return
    error.value = 'Gagal memuat data customer. Silakan refresh halaman.'
    loading.value = false
  }
}

function changePageSize(size) {
  pageSize.value = Number(size)
  currentPage.value = 1
  load() // totalRows tidak berubah karena ukuran halaman; tidak perlu hitung ulang
}

async function enrichWithLocation(list, signal) {
  if (!list.length) return list
  try {
    // Pecah id menjadi potongan kecil. Untuk halaman besar (mis. 1000 baris),
    // klausa `id in (...)` dengan ribuan id akan membuat URL GET terlalu panjang
    // (error 414) dan bisa melewati batas baris server. Potongan 100 aman.
    const CHUNK = 100
    const idChunks = []
    for (let i = 0; i < list.length; i += CHUNK) {
      idChunks.push(list.slice(i, i + CHUNK).map(c => `'${c.id}'`).join(','))
    }

    // BPLocation + Contact per potongan, semuanya paralel.
    const [locArrays, contactArrays] = await Promise.all([
      Promise.all(idChunks.map(ids => fetchBPLocationsForIds(ids, signal, CHUNK * 3 + 50))),
      Promise.all(idChunks.map(ids => fetchContactsForIds(ids, signal, CHUNK * 3 + 50))),
    ])
    const locs = locArrays.flat()
    const allContacts = contactArrays.flat()

    const locMap = {}; const contactPhoneMap = {}
    for (const loc of locs) {
      const bpId = typeof loc.businessPartner === 'object' ? loc.businessPartner.id : loc.businessPartner
      if (bpId && !locMap[bpId]) locMap[bpId] = loc
    }
    for (const ct of allContacts) {
      const bpId = typeof ct.businessPartner === 'object' ? ct.businessPartner.id : ct.businessPartner
      if (bpId && !contactPhoneMap[bpId] && ct.phone) contactPhoneMap[bpId] = ct.phone
    }

    // Ambil detail Location, juga dipotong & paralel.
    const locIds = [...new Set(
      Object.values(locMap).map(loc =>
        typeof loc.locationAddress === 'object' ? loc.locationAddress?.id : loc.locationAddress
      ).filter(Boolean)
    )]
    const locIdChunks = []
    for (let i = 0; i < locIds.length; i += CHUNK) locIdChunks.push(locIds.slice(i, i + CHUNK))
    const detailArrays = await Promise.all(locIdChunks.map(ch => fetchLocationsByIds(ch, signal)))
    const locDetails = detailArrays.flat()
    const locDetailMap = {}
    for (const d of locDetails) { if (d?.id) locDetailMap[d.id] = d }

    return list.map(c => {
      const loc = locMap[c.id]
      const locId = typeof loc?.locationAddress === 'object' ? loc?.locationAddress?.id : loc?.locationAddress
      const detail = locId ? locDetailMap[locId] : null

      // Full address: Street, Sub-district, District, City, Province, Postal Code
      const addrParts = [
        detail?.addressLine1 && detail.addressLine1 !== '-' ? detail.addressLine1 : null,
        detail?.subdistrict  || null,
        detail?.district     || null,
        detail?.cityName     && detail.cityName !== '-' ? detail.cityName : null,
        detail?.regionName   || null,
        detail?.postalCode   || null,
      ].filter(Boolean)
      const fullAddress = addrParts.length ? addrParts.join(', ') : '—'

      return {
        ...c,
        _enriching: false,
        _locationDetail: detail || null,
        streetAddress: detail?.addressLine1 && detail.addressLine1 !== '-' ? detail.addressLine1 : '',
        otherDetails:  detail?.addressLine2  || '',
        postalCode:    detail?.postalCode    || '',
        cityName:      detail?.cityName && detail.cityName !== '-' ? detail.cityName : '',
        province:      detail?.regionName    || '',
        district:      detail?.district      || '',
        subdistrict:   detail?.subdistrict   || '',
        fullAddress,
        phone: loc?.phone || contactPhoneMap[c.id] || '—',
        bpLocationId: loc?.id  || null,
        locationId:   locId    || null,
      }
    })
  } catch (e) {
    if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') throw e
    console.error('enrichWithLocation error', e)
    // Lempar lagi agar pemanggil (load) bisa melepas penanda _enriching.
    throw e
  }
}

// Dipakai oleh kotak pencarian global maupun input filter per kolom.
function onSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { currentPage.value=1; totalRows.value=0; load(true) }, 400) }
function onFilterInput() { onSearch() }
function toggleStatus(code) {
  statusSel[code] = !statusSel[code]
  currentPage.value = 1; totalRows.value = 0; load(true) // perubahan checkbox langsung diterapkan
}
function resetFilters() {
  searchQuery.value = ''
  colFilters.searchKey = ''; colFilters.name = ''; colFilters.address = ''; colFilters.phone = ''
  statusSel.A = true; statusSel.P = true; statusSel.S = true
  currentPage.value = 1; totalRows.value = 0; load(true)
}
const hasActiveFilter = computed(() =>
  !!(searchQuery.value || colFilters.searchKey || colFilters.name || colFilters.address || colFilters.phone)
  || selectedStatuses.value.length !== STATUS_DEFS.length
)
function goPage(p) { if (p<1 || p>totalPages.value) return; currentPage.value=p; load() }
function toggleDropdown(id, event) { if (openDropdown.value===id) { openDropdown.value=null; return } const rect = event.currentTarget.getBoundingClientRect(); dropdownPos.value = { top: rect.bottom+4, right: window.innerWidth-rect.right }; openDropdown.value = id }
function closeDropdown() { openDropdown.value = null }

const toast = reactive({ show: false, message: '', type: 'success' })
let toastTimer = null
function showToast(message, type='success') { clearTimeout(toastTimer); Object.assign(toast, { show:true, message, type }); toastTimer = setTimeout(() => { toast.show=false }, 3000) }

// ════════════════════════════════════════════════════════════
// FORM & API WILAYAH (PROXY) STATE
// ════════════════════════════════════════════════════════════
const page = reactive({ show: false, mode: 'create', data: null, type: 'customer' })
const formLoading = ref(false)
const formError   = ref(null)
const formErrors  = reactive({})
const codeGenerating = ref(false)

const areaData = reactive({ provinces: [], cities: [], districts: [], subdistricts: [] })

// Combobox state
const comboSearch = reactive({ province: '', city: '', district: '', subdistrict: '' })
const comboOpen   = reactive({ province: false, city: false, district: false, subdistrict: false })

const filteredProvinces   = computed(() => !comboSearch.province   ? areaData.provinces   : areaData.provinces.filter(x   => x.name.toLowerCase().includes(comboSearch.province.toLowerCase())))
const filteredCities      = computed(() => !comboSearch.city       ? areaData.cities      : areaData.cities.filter(x      => x.name.toLowerCase().includes(comboSearch.city.toLowerCase())))
const filteredDistricts   = computed(() => !comboSearch.district   ? areaData.districts   : areaData.districts.filter(x   => x.name.toLowerCase().includes(comboSearch.district.toLowerCase())))
const filteredSubdistricts= computed(() => !comboSearch.subdistrict? areaData.subdistricts: areaData.subdistricts.filter(x=> x.name.toLowerCase().includes(comboSearch.subdistrict.toLowerCase())))

function resetComboBelow(level) {
  if (level <= 1) { comboSearch.city=''; form.cityId=''; form.city=''; areaData.cities=[]; }
  if (level <= 2) { comboSearch.district=''; form.districtId=''; form.district=''; areaData.districts=[]; }
  if (level <= 3) { comboSearch.subdistrict=''; form.subdistrictId=''; form.subdistrict=''; areaData.subdistricts=[]; form.postalCode=''; }
}

function onProvinceInput() {
  // User is typing manually — clear selection but keep text
  form.provinceId = ''
  form.province = comboSearch.province
  resetComboBelow(1)
  comboOpen.province = true
}

function onCityInput() {
  form.cityId = ''
  form.city = comboSearch.city
  resetComboBelow(2)
  comboOpen.city = true
}

function onDistrictInput() {
  form.districtId = ''
  form.district = comboSearch.district
  resetComboBelow(3)
  comboOpen.district = true
}

function onSubdistrictInput() {
  form.subdistrictId = ''
  form.subdistrict = comboSearch.subdistrict
  comboOpen.subdistrict = true
}

async function selectProvince(p) {
  form.provinceId = p.id; form.province = p.name; comboSearch.province = p.name
  comboOpen.province = false
  resetComboBelow(1)
  try {
    const res = await axios.get(`${WILAYAH_API}/regencies/${p.id}.json`)
    areaData.cities = res.data
  } catch (err) { console.error(err) }
}

async function selectCity(c) {
  form.cityId = c.id; form.city = c.name; comboSearch.city = c.name
  comboOpen.city = false
  resetComboBelow(2)
  try {
    const res = await axios.get(`${WILAYAH_API}/districts/${c.id}.json`)
    areaData.districts = res.data
  } catch (err) { console.error(err) }
}

async function selectDistrict(d) {
  form.districtId = d.id; form.district = d.name; comboSearch.district = d.name
  comboOpen.district = false
  resetComboBelow(3)
  try {
    const res = await axios.get(`${WILAYAH_API}/villages/${d.id}.json`)
    areaData.subdistricts = res.data
  } catch (err) { console.error(err) }
}

async function selectSubdistrict(s) {
  form.subdistrictId = s.id; form.subdistrict = s.name; comboSearch.subdistrict = s.name
  comboOpen.subdistrict = false
  form.postalCode = 'Mencari...'
  try {
    const query = `${s.name} ${form.district}`
    const res = await axios.get(`https://kodepos.vercel.app/search?q=${encodeURIComponent(query)}`)
    if (res.data?.data?.length > 0) {
      const exactMatch = res.data.data.find(item => item.village.toLowerCase() === s.name.toLowerCase())
      form.postalCode = exactMatch ? String(exactMatch.code) : String(res.data.data[0].code)
    } else { form.postalCode = '' }
  } catch (err) { console.error("Gagal menarik data kodepos", err); form.postalCode = '' }
}

const defaultForm = () => ({
  searchKey: '', name: '', description: '', 
  provinceId: '', cityId: '', districtId: '', subdistrictId: '',
  province: '', city: '', district: '', subdistrict: '',
  streetAddress: '', otherDetails: '', postalCode: '', linkGL: '',
  contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', contactPosition: '',
  contactNik: '', contactNkk: '', contactSim: '', contactPassport: '', contactSiup: '',
  contactId: null, taxExempt: false,
  paymentTerms: '', priceList: '', paymentMethod: '', account: '',
  creditLimit: 0, active: true, bpLocationId: null, locationId: null,
  diameter: '', meter: '', cycle: '', status: 'A'
})
const form = reactive(defaultForm())

// ════════════════════════════════════════════════════════════
// FORM & API WILAYAH (EMSIFA - JSON KELUARAN KEPMENDAGRI)
// ════════════════════════════════════════════════════════════
const WILAYAH_API = 'https://www.emsifa.com/api-wilayah-indonesia/api'

async function loadProvinces() {
  try {
    const res = await axios.get(`${WILAYAH_API}/provinces.json`)
    areaData.provinces = res.data
  } catch (error) { console.error("Gagal menarik data provinsi", error) }
}

function resetComboState() {
  Object.assign(comboSearch, { province: '', city: '', district: '', subdistrict: '' })
  Object.assign(comboOpen,   { province: false, city: false, district: false, subdistrict: false })
  areaData.cities = []; areaData.districts = []; areaData.subdistricts = []
}

// ════════════════════════════════════════════════════════════
// SUBMIT LOGIC
// ════════════════════════════════════════════════════════════
async function openCreatePage() {
  Object.assign(form, defaultForm()); Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; page.type='customer'; page.mode='create'; page.data=null; page.show=true
  resetComboState()
  
  // Kosongkan searchKey di awal
  form.searchKey = ''
  codeGenerating.value = false

  // OTOMATIS PILIH GOLONGAN DEFAULT
  const defaultCategory = bpCategories.value.find(cat => cat.default === true)
  if (defaultCategory) {
    form.linkGL = defaultCategory.id
  }
}

async function openEditPage(c) {
  closeDropdown()

  // Dengan render dua fase, alamat baris bisa belum termuat saat user klik Sunting.
  // Pastikan data lokasi lengkap dulu supaya tidak salah meng-CREATE alamat baru
  // (yang seharusnya UPDATE) ketika form disimpan.
  if (c._enriching || c.bpLocationId === undefined) {
    try {
      const [enriched] = await enrichWithLocation([c])
      if (enriched) c = enriched
    } catch (_) { /* lanjut dengan data seadanya */ }
  }

  const extractId = (v) => (v && typeof v === 'object' ? v.id : v) || ''
  const loc = c._locationDetail || null

  // CARI KATEGORI DEFAULT
  const defaultCategory = bpCategories.value.find(cat => cat.default === true)

  Object.assign(form, {
    searchKey: c.searchKey ?? '', name: c.name ?? '', description: c.description ?? '',
    provinceId: '', cityId: '', districtId: '', subdistrictId: '',
    province:    loc?.regionName  || '',
    city:        loc?.cityName    && loc.cityName !== '-' ? loc.cityName : '',
    district:    loc?.district    || '',
    subdistrict: loc?.subdistrict || '',
    streetAddress: loc?.addressLine1 && loc.addressLine1 !== '-' ? loc.addressLine1 : (c.streetAddress ?? ''),
    otherDetails:  loc?.addressLine2 ?? (c.otherDetails ?? ''),
    postalCode:    loc?.postalCode   ?? (c.postalCode   ?? ''),
    
    // PRIORITASKAN DATA TERSIMPAN. JIKA KOSONG, GUNAKAN KATEGORI DEFAULT
    linkGL: extractId(c.businessPartnerCategory) || (defaultCategory ? defaultCategory.id : ''),
    
    contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', contactPosition: '',
    contactNik: '', contactNkk: '', contactSim: '', contactPassport: '', contactSiup: '',
    contactId: null, taxExempt: c.taxExempt ?? false,
    paymentTerms:  extractId(c.paymentTerms), priceList: extractId(c.priceList),
    paymentMethod: extractId(c.paymentMethod), account: extractId(c.account),
    creditLimit: c.creditLimit ?? 0, active: c.active ?? true,
    bpLocationId: c.bpLocationId ?? null, locationId: c.locationId ?? null,
    diameter: c.diameter ?? '', meter: c.meter ?? '', cycle: c.cycle ?? '', status: c.status ?? '',
  })

  // Pre-fill comboSearch text labels immediately
  Object.assign(comboSearch, {
    province:    form.province,
    city:        form.city,
    district:    form.district,
    subdistrict: form.subdistrict,
  })
  Object.assign(comboOpen, { province: false, city: false, district: false, subdistrict: false })
  // Reset child area lists so they load fresh
  areaData.cities = []; areaData.districts = []; areaData.subdistricts = []

  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formError.value = null; page.type='customer'; page.mode='edit'; page.data=c; page.show=true

  // Await contact load so form.contactId is set before user submits
  await loadFirstContact(c.id)

  // Background: fetch all area levels so user can edit any level without starting over
  if (form.province || form.city || form.district) {
    prefillAreaData(form.province, form.city, form.district)
  }
}

// Fetch province→city→district→subdistrict chains in background using name matching
async function prefillAreaData(provinceName, cityName, districtName) {
  try {
    // Ensure provinces are loaded
    if (!areaData.provinces.length) {
      const res = await axios.get(`${WILAYAH_API}/provinces.json`)
      areaData.provinces = res.data
    }

    // Match province by name
    if (provinceName) {
      const matchedProvince = areaData.provinces.find(p =>
        p.name.toLowerCase() === provinceName.toLowerCase()
      )
      if (matchedProvince) {
        form.provinceId = matchedProvince.id
        // Fetch cities for this province
        const cityRes = await axios.get(`${WILAYAH_API}/regencies/${matchedProvince.id}.json`)
        areaData.cities = cityRes.data

        // Match city by name
        if (cityName) {
          const matchedCity = areaData.cities.find(c =>
            c.name.toLowerCase() === cityName.toLowerCase()
          )
          if (matchedCity) {
            form.cityId = matchedCity.id
            // Fetch districts for this city
            const distRes = await axios.get(`${WILAYAH_API}/districts/${matchedCity.id}.json`)
            areaData.districts = distRes.data

            // Match district by name
            if (districtName) {
              const matchedDistrict = areaData.districts.find(d =>
                d.name.toLowerCase() === districtName.toLowerCase()
              )
              if (matchedDistrict) {
                form.districtId = matchedDistrict.id
                // Fetch subdistricts for this district
                const subRes = await axios.get(`${WILAYAH_API}/villages/${matchedDistrict.id}.json`)
                areaData.subdistricts = subRes.data

                // Match subdistrict by name
                if (form.subdistrict) {
                  const matchedSub = areaData.subdistricts.find(s =>
                    s.name.toLowerCase() === form.subdistrict.toLowerCase()
                  )
                  if (matchedSub) form.subdistrictId = matchedSub.id
                }
              }
            }
          }
        }
      }
    }
  } catch (err) { console.error('prefillAreaData error', err) }
}
// Status (A/P/S) menentukan flag active secara otomatis
watch(() => form.status, (val) => {
  if (val === 'P') form.active = false
  else if (val === 'A' || val === 'S') form.active = true
})

function closePage() { if (formLoading.value) return; page.show=false }

// Auto-fill contact name dari Customer Name saat create
watch(() => form.name, (val) => {
  if (page.mode !== 'create') return
  const parts = (val || '').trim().split(/\s+/)
  form.contactFirstName = parts[0] || ''
  form.contactLastName  = parts.slice(1).join(' ') || ''
})

let codeGenTimeout = null
watch([() => form.district, () => form.subdistrict], ([newDist, newSub]) => {
  if (page.mode === 'create') {
    clearTimeout(codeGenTimeout);
    if (newDist && newSub) {
      codeGenerating.value = true;
      codeGenTimeout = setTimeout(async () => {
        try {
          // Destructure hasil dari service
          const { code, officialKec, officialKel } = await generateCustomerCode(newDist, newSub);
          
          if (code) {
            form.searchKey = code;
            
            // OTOMATIS MENGUBAH TEKS DI FORM
            form.district = officialKec;
            form.subdistrict = officialKel;
            
            // Update juga teks di search box combobox agar sinkron
            comboSearch.district = officialKec;
            comboSearch.subdistrict = officialKel;
          }
        } catch (e) {
          console.warn('Gagal generate:', e);
        } finally {
          codeGenerating.value = false;
        }
      }, 800);
    } else {
      form.searchKey = '';
    }
  }
})

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.searchKey.trim())  formErrors.searchKey    = 'Code is required'
  if (!form.name.trim())       formErrors.name         = 'Customer name is required'
  if (!form.priceList)         formErrors.priceList    = 'Price List is required'
  if (!form.paymentMethod)     formErrors.paymentMethod= 'Payment Method is required'
  if (!form.paymentTerms)      formErrors.paymentTerms = 'Payment Terms is required'
  if (page.mode === 'create' && !form.contactFirstName.trim())
    formErrors.contactFirstName = 'First name is required'
  return Object.keys(formErrors).length === 0
}

async function submitForm() {
  if (!validateForm()) return
  formLoading.value = true; formError.value = null
  try {
    const bpPayload = {
      searchKey: form.searchKey.trim(), name: form.name.trim(), description: form.description.trim() || null,
      creditLimit: Number(form.creditLimit) || 0, active: form.active, taxExempt: form.taxExempt ?? false,
      diameter: form.diameter !== '' && form.diameter !== null ? Number(form.diameter) : null,
      meter: form.meter.trim() || null,
      ...(form.linkGL        && { businessPartnerCategory: form.linkGL }),
      ...(form.paymentTerms  && { paymentTerms:  form.paymentTerms }),
      ...(form.priceList     && { priceList:     form.priceList }),
      ...(form.paymentMethod && { paymentMethod: form.paymentMethod }),
      ...(form.account       && { account:       form.account }),
      ...(form.cycle         && { cycle:         form.cycle }),
      ...(form.status        && { status:        form.status }),
    }

    if (page.mode === 'create') {
      let newBp
      try {
        newBp = await createCustomer(bpPayload)
      } catch (e) {
        throw new Error('Gagal menyimpan data customer: ' + (e.message || 'Terjadi kesalahan pada server.'))
      }

      if (form.streetAddress || form.city || form.province || form.postalCode) {
        const locPayload = {
          addressLine1: form.streetAddress || '-',
          addressLine2: form.otherDetails || null,
          cityName: form.city || '-',
          postalCode: form.postalCode || null,
          country: '209',
          province: form.province || null,
          district: form.district || null,
          subdistrict: form.subdistrict || null
        }
        let newLoc
        try {
          newLoc = await createLocation(locPayload)
        } catch (e) {
          throw new Error('Customer berhasil disimpan, namun gagal menyimpan alamat: ' + (e.message || 'Terjadi kesalahan pada server.'))
        }
        try {
          const bpLocPayload = {
            name: form.city || 'Main', phone: null, businessPartner: newBp.id, locationAddress: newLoc.id,
            invoiceToAddress: true, shipToAddress: true, payFromAddress: true, remitToAddress: true
          }
          await createBPLocation(bpLocPayload)
        } catch (e) {
          throw new Error('Customer dan alamat berhasil disimpan, namun gagal menautkan lokasi: ' + (e.message || 'Terjadi kesalahan pada server.'))
        }
      }

      if (form.contactFirstName && form.contactFirstName.trim()) {
        try {
          await createContact({
            firstName: form.contactFirstName.trim(), lastName: form.contactLastName.trim() || null,
            name: `${form.contactFirstName.trim()} ${form.contactLastName.trim()}`.trim(),
            email: form.contactEmail.trim() || null, phone: form.contactPhone.trim() || null,
            position: form.contactPosition.trim() || null, nik: form.contactNik.trim() || null,
            nkk: form.contactNkk.trim() || null, sim: form.contactSim.trim() || null,
            passport: form.contactPassport.trim() || null, siup: form.contactSiup.trim() || null,
            businessPartner: newBp.id,
          })
        } catch (e) {
          throw new Error('Customer berhasil disimpan, namun gagal menyimpan data kontak: ' + (e.message || 'Terjadi kesalahan pada server.'))
        }
      }
      showToast('Customer berhasil disimpan'); currentPage.value = 1; load(true)
    } else {
      try {
        await updateCustomer(page.data.id, bpPayload)
      } catch (e) {
        throw new Error('Gagal memperbarui data customer: ' + (e.message || 'Terjadi kesalahan pada server.'))
      }

      if (form.streetAddress || form.city || form.province || form.postalCode) {
        const locPayload = {
          addressLine1: form.streetAddress || '-',
          addressLine2: form.otherDetails || null,
          cityName: form.city || '-',
          postalCode: form.postalCode || null,
          country: '209',
          province: form.province || null,
          district: form.district || null,
          subdistrict: form.subdistrict || null
        }

        if (form.locationId && form.bpLocationId) {
          try {
            await updateLocation(form.locationId, locPayload)
          } catch (e) {
            throw new Error('Data customer berhasil diperbarui, namun gagal memperbarui alamat: ' + (e.message || 'Terjadi kesalahan pada server.'))
          }
          try {
            await updateBPLocation(form.bpLocationId, {
              name: form.city || 'Main', phone: null, businessPartner: page.data.id, locationAddress: form.locationId,
              invoiceToAddress: true, shipToAddress: true, payFromAddress: true, remitToAddress: true
            })
          } catch (e) {
            throw new Error('Data customer berhasil diperbarui, namun gagal memperbarui tautan lokasi: ' + (e.message || 'Terjadi kesalahan pada server.'))
          }
        } else {
          let newLoc
          try {
            newLoc = await createLocation(locPayload)
          } catch (e) {
            throw new Error('Data customer berhasil diperbarui, namun gagal membuat alamat baru: ' + (e.message || 'Terjadi kesalahan pada server.'))
          }
          try {
            await createBPLocation({
              name: form.city || 'Main', phone: null, businessPartner: page.data.id, locationAddress: newLoc.id,
              invoiceToAddress: true, shipToAddress: true, payFromAddress: true, remitToAddress: true
            })
          } catch (e) {
            throw new Error('Data customer berhasil diperbarui, namun gagal menautkan lokasi baru: ' + (e.message || 'Terjadi kesalahan pada server.'))
          }
        }
      }

      // Update contact jika sudah ada, atau buat baru jika firstName diisi
      if (form.contactId) {
        const contactPayload = {
          firstName: form.contactFirstName.trim() || null,
          lastName: form.contactLastName.trim() || null,
          name: `${form.contactFirstName.trim()} ${form.contactLastName.trim()}`.trim() || null,
          email: form.contactEmail.trim() || null, phone: form.contactPhone.trim() || null,
          position: form.contactPosition.trim() || null, nik: form.contactNik.trim() || null,
          nkk: form.contactNkk.trim() || null, sim: form.contactSim.trim() || null,
          passport: form.contactPassport.trim() || null, siup: form.contactSiup.trim() || null,
        }
        try {
          await updateContact(form.contactId, contactPayload)
        } catch (e) {
          throw new Error('Data customer berhasil diperbarui, namun gagal memperbarui kontak: ' + (e.message || 'Terjadi kesalahan pada server.'))
        }
      } else if (form.contactFirstName && form.contactFirstName.trim()) {
        const contactPayload = {
          firstName: form.contactFirstName.trim(), lastName: form.contactLastName.trim() || null,
          name: `${form.contactFirstName.trim()} ${form.contactLastName.trim()}`.trim(),
          email: form.contactEmail.trim() || null, phone: form.contactPhone.trim() || null,
          position: form.contactPosition.trim() || null, nik: form.contactNik.trim() || null,
          nkk: form.contactNkk.trim() || null, sim: form.contactSim.trim() || null,
          passport: form.contactPassport.trim() || null, siup: form.contactSiup.trim() || null,
          businessPartner: page.data.id,
        }
        try {
          await createContact(contactPayload)
        } catch (e) {
          throw new Error('Data customer berhasil diperbarui, namun gagal menyimpan kontak baru: ' + (e.message || 'Terjadi kesalahan pada server.'))
        }
      }
      showToast('Customer berhasil diperbarui'); load()
    }
    page.show = false
  } catch (e) {
    formError.value = e.message || 'Terjadi kesalahan. Silakan coba lagi.'
  } finally { formLoading.value = false }
}

const toggleModal   = reactive({ show: false, customer: null })
const toggleLoading = ref(false)
function confirmToggle(c) { closeDropdown(); toggleModal.customer=c; toggleModal.show=true }
async function doToggle() {
  toggleLoading.value=true
  try {
    const newActive = !toggleModal.customer.active
    await updateCustomer(toggleModal.customer.id, { searchKey: toggleModal.customer.searchKey, name: toggleModal.customer.name, active: newActive })
    showToast(newActive ? 'Customer berhasil diaktifkan' : 'Customer berhasil dinonaktifkan')
    toggleModal.show=false; load(true)
  } catch (e) {
    const msg = e.message || 'Gagal mengubah status customer. Silakan coba lagi.'
    showToast(msg, 'error')
    toggleModal.show=false
  }
  finally { toggleLoading.value=false }
}

const viewModal = reactive({ show: false, data: null, type: 'customer' })
const viewLocationDetail = ref(null)

async function openViewModal(c) {
  closeDropdown()
  viewModal.type='customer'; viewModal.data = c; viewModal.show = true

  // If already enriched from list, use it directly
  if (c._locationDetail) {
    viewLocationDetail.value = c._locationDetail
    return
  }

  // Fallback: fetch if not enriched (e.g. opened from a non-list context)
  viewLocationDetail.value = null
  try {
    const locs = await fetchBPLocations(c.id)
    if (locs.length) {
      const locId = typeof locs[0].locationAddress === 'object' ? locs[0].locationAddress.id : locs[0].locationAddress
      if (locId) {
        viewLocationDetail.value = await fetchLocation(locId)
      }
    }
  } catch (e) { console.error("Failed loading location details", e) }
}
async function editFromView() {
  const customerWithLoc = {
    ...viewModal.data,
    _locationDetail: viewLocationDetail.value || viewModal.data?._locationDetail || null,
  }
  viewModal.show = false
  await openEditPage(customerWithLoc)
}

async function loadFirstContact(bpId) {
  try {
    const list = await fetchContacts(bpId)
    if (list.length) {
      const ct = list[0]
      form.contactFirstName = ct.firstName ?? ''; form.contactLastName  = ct.lastName  ?? ''
      form.contactEmail     = ct.email     ?? ''; form.contactPhone     = ct.phone     ?? ''
      form.contactPosition  = ct.position  ?? ''; form.contactNik       = ct.nik       ?? ''
      form.contactNkk       = ct.nkk       ?? ''; form.contactSim       = ct.sim       ?? ''
      form.contactPassport  = ct.passport  ?? ''; form.contactSiup      = ct.siup      ?? ''
      form.contactId        = ct.id
    } else {
      form.contactId = null
    }
  } catch (e) { console.warn('loadFirstContact error:', e) }
}

onMounted(() => {
  if (authReady.value) { load(); loadLookups(); loadProvinces() }

  // Pasang listener aktivitas user untuk auto-logout idle.
  IDLE_EVENTS.forEach(evt => window.addEventListener(evt, onUserActivity, { passive: true }))
  resetIdleTimer()
})

onUnmounted(() => {
  clearIdleTimer()
  IDLE_EVENTS.forEach(evt => window.removeEventListener(evt, onUserActivity))
})
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --bg: #f1f5f9;
  --surface: #ffffff;
  --surface2: #f8fafc;
  --border: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --accent-light: #eff6ff;
  --success: #22c55e;
  --danger: #ef4444;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,.1);
}

.app { min-height: 100vh; background: var(--bg); font-family: var(--font); }
.page-wrap { padding: 28px 32px; max-width: 1280px; margin: 0 auto; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }

.card-header { padding: 22px 24px 0; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

.toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 16px 20px; gap: 12px; }
.search-wrap { position: relative; flex: 1; max-width: 280px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; background: var(--surface2); outline: none; font-family: var(--font); color: var(--text-primary); transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; font-family: var(--font); }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #fff; } .btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); } .btn--ghost:hover:not(:disabled) { background: var(--surface2); }
.btn--danger { background: var(--danger); color: #fff; } .btn--danger:hover:not(:disabled) { background: #dc2626; }
.btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { padding: 10px 16px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table tbody td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.tr-data:hover { background: #fafbfc; }
.th-action { text-align: right; }
.td-name { font-weight: 500; color: var(--text-primary); }
.td-secondary { color: var(--text-secondary); font-size: 13px; }
.td-mono { font-family: var(--font-mono); font-size: 12.5px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px; font-size: 13px; }
.td-error { color: var(--danger); }
.td-action-cell { text-align: right; overflow: visible !important; }
.code-badge { font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; background: var(--surface2); border: 1px solid var(--border); padding: 3px 8px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; }
.inactive-pill { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; background: #fff1f2; color: var(--danger); margin-left: 6px; vertical-align: middle; }

.action-group { display: flex; justify-content: flex-end; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; color: var(--text-secondary); transition: background .12s; }
.action-btn:hover { background: var(--border); }
.dropdown-wrap { position: relative; }
.dropdown-menu { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; min-width: 160px; overflow: hidden; }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; font-size: 12.5px; font-weight: 500; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font); transition: background .1s; white-space: nowrap; }
.dropdown-item:hover { background: var(--surface2); color: var(--text-primary); }
.dropdown-item--danger { color: var(--danger); } .dropdown-item--danger:hover { background: #fff1f2; }
.dropdown-item--success { color: var(--success); } .dropdown-item--success:hover { background: #f0fdf4; }

.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.cell-loading { color: var(--text-muted, #94a3b8); font-style: italic; font-size: 0.85em; opacity: 0.8; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

.table-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 20px; background: var(--bg); flex-wrap: wrap; }
.footer-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.page-size { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary, #64748b); }
.page-size select { font-family: var(--font); font-size: 13px; font-weight: 500; color: var(--text-primary, #1e293b); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,.1); background: var(--surface, #fff); cursor: pointer; outline: none; }
.page-size select:focus { border-color: var(--accent, #2563eb); }
.total-info { font-size: 13px; color: var(--text-secondary, #64748b); }
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 10px; border: none; background: transparent; color: #94a3b8; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); outline: none; }
.page-btn--text { width: auto; padding: 0 12px; }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.07); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }

.toast { position: fixed; bottom: 24px; right: 24px; z-index: 3000; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-md); }
.toast--success { background: #16a34a; color: #fff; }
.toast--error { background: var(--danger); color: #fff; }
.toast-enter-active,.toast-leave-active { transition: all .25s ease; }
.toast-enter-from,.toast-leave-to { opacity: 0; transform: translateY(8px); }

.breadcrumb-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; margin-bottom: 16px; }
.breadcrumb-back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--accent); font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 0; font-family: var(--font); }
.breadcrumb-back:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-muted); }
.breadcrumb-cur { color: var(--text-primary); font-weight: 500; }
.form-page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }

.form-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 16px; box-shadow: var(--shadow); }
.form-card-title { display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); margin-bottom: 18px; }
.form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group input, .form-group select { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; width: 100%; }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); background: #fff; }
.form-group input:disabled, .form-group select:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); }
.req { color: var(--danger); }
.form-section-divider { display: flex; align-items: center; gap: 8px; margin-top: 18px; margin-bottom: 2px; }
.form-section-label { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); white-space: nowrap; }
.form-section-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.form-checks { display: flex; gap: 20px; }
.check-label { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
.check-label input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
.form-api-error { padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.page-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; margin-top: 8px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
.modal { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-md); width: 100%; max-width: 480px; overflow: hidden; }
.modal--detail { max-width: 700px; }
.modal--sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { background: none; border: none; color: var(--text-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.modal-close:hover { background: var(--surface2); color: var(--text-primary); }
.modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
.modal-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

.detail-section-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.detail-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.detail-col { display: flex; flex-direction: column; gap: 14px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.detail-value { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
.detail-value.mono { font-family: var(--font-mono); font-size: 12.5px; }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.status-pill--active { background: #f0fdf4; color: #16a34a; }
.status-pill--inactive { background: #fff1f2; color: var(--danger); }
.status-pill--aktif { background: #f0fdf4; color: #16a34a; }
.status-pill--putus { background: #fff1f2; color: #dc2626; }
.status-pill--segel { background: #fff7ed; color: #d97706; }

/* ── Baris filter per kolom ── */
.filter-row th { padding: 8px 12px; background: var(--surface2, #f8fafc); border-bottom: 1px solid var(--border, #e2e8f0); vertical-align: middle; }
.col-search { width: 100%; height: 30px; padding: 0 10px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; font-size: 12.5px; background: #fff; outline: none; font-family: var(--font); color: var(--text-primary, #1e293b); transition: border-color .15s; }
.col-search::placeholder { color: #b6c0cc; font-weight: 400; }
.col-search:focus { border-color: var(--accent, #2563eb); }

/* ── Dropdown filter status ── */
.status-filter { position: relative; }
.status-filter-btn { display: flex; align-items: center; gap: 6px; width: 100%; height: 30px; padding: 0 10px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; background: #fff; font-family: var(--font); font-size: 12.5px; font-weight: 500; color: var(--text-primary, #1e293b); cursor: pointer; outline: none; }
.status-filter-btn:hover { border-color: #cbd5e1; }
.status-filter-btn.is-narrowed { border-color: var(--accent, #2563eb); color: var(--accent, #2563eb); }
.status-filter-label { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-filter-menu { position: absolute; top: calc(100% + 4px); left: 0; z-index: 50; min-width: 150px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 6px; }
.status-check { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 7px; font-size: 13px; font-weight: 500; color: var(--text-primary, #1e293b); cursor: pointer; }
.status-check:hover { background: rgba(0,0,0,.04); }
.status-check input { width: 15px; height: 15px; accent-color: var(--accent, #2563eb); cursor: pointer; }

.filter-reset { height: 30px; padding: 0 12px; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; background: #fff; font-family: var(--font); font-size: 12px; font-weight: 600; color: var(--text-secondary, #64748b); cursor: pointer; }
.filter-reset:hover { border-color: var(--danger, #dc2626); color: var(--danger, #dc2626); }

.delete-text { font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin: 0; }
.delete-text strong { color: var(--text-primary); }

.sortable { cursor: pointer; user-select: none; position: relative; padding-right: 20px !important; transition: color 0.15s; }
.sortable:hover { color: var(--text-primary); }
.sortable::after, .sortable::before { content: ''; position: absolute; right: 6px; top: 50%; border: 4px solid transparent; opacity: 0.3; }
.sortable::before { border-bottom-color: currentColor; margin-top: -9px; }
.sortable::after { border-top-color: currentColor; margin-top: 1px; }
.sortable.asc::before { opacity: 1; color: var(--accent); }
.sortable.desc::after { opacity: 1; color: var(--accent); }

/* ── Combobox ── */
.combobox-wrap { position: relative; width: 100%; }
.combobox-input-wrap { position: relative; display: flex; align-items: center; }
.combobox-input {
  width: 100%; height: 38px; padding: 0 32px 0 12px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 13px; outline: none; background: var(--surface2);
  transition: border-color .15s; font-family: var(--font);
  color: var(--text-primary); box-sizing: border-box;
}
.combobox-input:focus { border-color: var(--accent); background: #fff; }
.combobox-chevron {
  position: absolute; right: 10px; color: var(--text-muted);
  cursor: pointer; transition: transform .2s; flex-shrink: 0; pointer-events: all;
}
.combobox-chevron.open { transform: rotate(180deg); color: var(--accent); }
.combobox-list {
  position: absolute; top: calc(100% + 3px); left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-md);
  z-index: 9999; max-height: 220px; overflow-y: auto;
  list-style: none; margin: 0; padding: 4px 0;
}
.combobox-item {
  padding: 8px 12px; font-size: 13px; color: var(--text-primary);
  cursor: pointer; transition: background .1s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.combobox-item:hover { background: var(--accent-light); color: var(--accent); }
.combobox-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.combobox-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

.fade-enter-active,.fade-leave-active { transition: opacity .15s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
.slide-enter-active,.slide-leave-active { transition: transform .2s ease, opacity .2s ease; }
.slide-enter-from,.slide-leave-to { transform: translateX(24px); opacity: 0; }
</style>