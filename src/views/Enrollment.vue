<template>
  <div class="app">

    <!-- ══════════════════════════════════════════════════════════
         LIST VIEW
    ══════════════════════════════════════════════════════════ -->
    <div v-if="showListMode" class="page-wrap">
      <div class="content-card">
        <div class="card-header">
          <h2 class="page-title">Pendaftaran Pelanggan Baru</h2>
          <button class="btn btn--primary" @click="startNew">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Daftar Baru
          </button>
        </div>

        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="listSearch" class="search-input" placeholder="Cari nama atau nomor HP..." @input="onSearch" />
          </div>
          <span class="list-count" v-if="listTotal > 0">{{ listTotal }} data</span>
        </div>

        <div class="table-wrap">
          <table class="table">
            <colgroup>
              <col style="width:120px">
              <col>
              <col style="width:130px">
              <col style="width:150px">
              <col style="width:150px">
              <col style="width:170px">
              <col style="width:110px">
              <col style="width:90px">
            </colgroup>
            <thead>
              <tr>
                <th class="sortable" :class="{ asc: listSortCol==='tglInput' && listSortDir==='asc', desc: listSortCol==='tglInput' && listSortDir==='desc' }" @click="toggleSort('tglInput')">Tanggal</th>
                <th class="sortable" :class="{ asc: listSortCol==='namaPelanggan' && listSortDir==='asc', desc: listSortCol==='namaPelanggan' && listSortDir==='desc' }" @click="toggleSort('namaPelanggan')">Nama Pelanggan</th>
                <th>No. HP</th>
                <th class="sortable" :class="{ asc: listSortCol==='kecamatan' && listSortDir==='asc', desc: listSortCol==='kecamatan' && listSortDir==='desc' }" @click="toggleSort('kecamatan')">Kecamatan</th>
                <th class="sortable" :class="{ asc: listSortCol==='kelurahan' && listSortDir==='asc', desc: listSortCol==='kelurahan' && listSortDir==='desc' }" @click="toggleSort('kelurahan')">Kelurahan</th>
                <th>Kategori</th>
                <th>Titik Lokasi</th>
                <th class="th-action">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listLoading"><td colspan="8" class="td-empty"><div class="loading-dots"><span></span><span></span><span></span></div></td></tr>
              <tr v-else-if="listData.length === 0"><td colspan="8" class="td-empty">Belum ada data enrollment.</td></tr>
              <template v-else>
                <tr v-for="row in listData" :key="row.id" class="tr-data">
                  <td>{{ formatDate(row.tglInput || row.tGLInput) }}</td>
                  <td class="td-name">{{ row.namaPelanggan }}</td>
                  <td class="td-secondary td-mono">{{ row.hp || '—' }}</td>
                  <td class="td-secondary">{{ row.kecamatan || '—' }}</td>
                  <td class="td-secondary">{{ row.kelurahan || '—' }}</td>
                  <td class="td-secondary">{{ rowKatBangLabel(row) }}</td>
                  <td>
                    <button v-if="row.titikLokasi" class="loc-link" @click.stop="openViewModal(row)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      Lihat
                    </button>
                    <span v-else class="td-secondary">—</span>
                  </td>
                  <td class="td-action-cell">
                    <button class="action-btn" title="Lihat Detail" @click="openViewModal(row)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="action-btn" title="Edit" @click="editRow(row)" style="margin-left:4px">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button class="page-btn" :disabled="listPage === 0" @click="listPage--; loadList()">← Prev</button>
          <span class="page-btn page-btn--active">{{ listPage + 1 }}</span>
          <button class="page-btn" :disabled="listData.length < listPageSize" @click="listPage++; loadList()">Next →</button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         VIEW MODAL
    ══════════════════════════════════════════════════════════ -->
    <teleport to="body">
      <div v-if="viewModal.show" class="modal-overlay" @click.self="closeViewModal">
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Detail Enrollment</span>
            </div>
            <button class="modal-close" @click="closeViewModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body" v-if="viewModal.row">
            <div class="modal-grid">
              <!-- Kol kiri -->
              <div class="modal-section">
                <div class="modal-section-title">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Data Pelanggan
                </div>
                <div class="modal-row"><span>Tanggal</span><strong>{{ formatDate(viewModal.row.tglInput || viewModal.row.tGLInput) }}</strong></div>
                <div class="modal-row"><span>Nama</span><strong>{{ viewModal.row.namaPelanggan || '—' }}</strong></div>
                <div class="modal-row"><span>No. HP</span><strong>{{ viewModal.row.hp || '—' }}</strong></div>
                <div class="modal-row"><span>Email</span><strong>{{ viewModal.row.email || '—' }}</strong></div>
                <div class="modal-row"><span>Alamat</span><strong>{{ viewModalFullAddress }}</strong></div>
              </div>

              <!-- Kol kanan atas -->
              <div>
                <div class="modal-section" style="margin-bottom:10px">
                  <div class="modal-section-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    Penanggung Jawab
                  </div>
                  <div class="modal-row"><span>Nama PJ</span><strong>{{ viewModal.row.namaPj || '—' }}</strong></div>
                  <div class="modal-row"><span>No. HP PJ</span><strong>{{ viewModal.row.hpPj || '—' }}</strong></div>
                  <div class="modal-row"><span>Alamat PJ</span><strong>{{ viewModalFullAddressPj }}</strong></div>
                </div>

                <div class="modal-section">
                  <div class="modal-section-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Kategori &amp; Fasilitas
                  </div>
                  <div class="modal-row"><span>Kat. Bangunan</span><strong>{{ rowKatBangLabel(viewModal.row) }}</strong></div>
                  <div class="modal-row"><span>Level</span><strong>{{ rowKatBanglLabel(viewModal.row) }}</strong></div>
                  <div class="modal-row"><span>Tangki</span><strong>{{ (viewModal.row.tangki === true || viewModal.row.tangki === 'Y') ? 'Ya' : 'Tidak' }}</strong></div>
                  <div class="modal-row"><span>Check TG</span><strong>{{ (viewModal.row.checkTg === true || viewModal.row.checkTg === 'Y') ? 'Ya' : 'Tidak' }}</strong></div>
                </div>
              </div>
            </div>

            <!-- Map -->
            <div class="modal-map-section">
              <div class="modal-section-title" style="margin-bottom:10px">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Titik Lokasi
                <span v-if="viewModal.row.titikLokasi" class="modal-coord-badge">{{ viewModal.row.titikLokasi }}</span>
                <a v-if="viewModal.row.titikLokasi" :href="mapsLink(viewModal.row.titikLokasi)" target="_blank" class="modal-gmaps-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Buka di Google Maps
                </a>
              </div>
              <div v-if="viewModal.row.titikLokasi" id="view-modal-map" class="modal-map"></div>
              <div v-else class="modal-no-loc">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                <span>Titik lokasi belum ditentukan</span>
              </div>
            </div>
          </div>

            <!-- Attachment section in view modal -->
            <div class="modal-map-section" style="margin-top:14px">
              <div class="modal-section-title" style="margin-bottom:10px">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Dokumen Lampiran
              </div>
              <div v-if="viewModalAttachLoading" class="attach-loading">
                <div class="loading-dots"><span></span><span></span><span></span></div>
                <span>Memuat dokumen...</span>
              </div>
              <template v-else-if="viewModalAttachments.length">
                <div v-for="(f, i) in viewModalAttachments" :key="'vm-'+i" class="attach-item attach-item--done">
                  <div class="attach-icon" v-html="fileIconSvg(f.name)"></div>
                  <div class="attach-info">
                    <span class="attach-name">{{ f.name }}</span>
                    <span class="attach-meta" v-if="f.description">{{ f.description }}</span>
                    <span class="attach-meta" v-if="f.updatedby">oleh {{ f.updatedby }}</span>
                  </div>
                  <a href="#" @click.prevent="triggerDownload(f)" class="btn btn--ghost btn-sm" style="font-size:12px;padding:4px 10px;text-decoration:none">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </a>
                </div>
              </template>
              <p v-else class="attach-empty">Tidak ada dokumen lampiran.</p>
            </div>

          <div class="modal-footer">
            <button class="btn btn--ghost" @click="closeViewModal">Tutup</button>
            <button class="btn btn--primary" @click="editRow(viewModal.row); closeViewModal()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ══════════════════════════════════════════════════════════
         FORM VIEW
    ══════════════════════════════════════════════════════════ -->
    <div v-if="!showListMode" class="page-wrap">
      <div class="content-card">

        <!-- Breadcrumb -->
        <div class="card-header">
          <div class="breadcrumb-row">
            <button class="breadcrumb-back" @click="showListMode = true; loadList()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Daftar Enrollment
            </button>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-cur">{{ editingId ? 'Edit Enrollment' : 'Pendaftaran Baru' }}</span>
          </div>
        </div>

        <!-- Step Indicator -->
        <div class="steps-bar">
          <div v-for="(step, i) in steps" :key="i" class="step-item"
            :class="{ active: currentStep === i, done: currentStep > i }"
            @click="currentStep > i ? (currentStep = i) : null">
            <div class="step-circle">
              <svg v-if="currentStep > i" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="step-label">{{ step }}</span>
          </div>
        </div>

        <!-- Validation error banner -->
        <div v-if="stepError" class="step-error-banner">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ stepError }}
        </div>

        <!-- ── STEP 0: Data Pelanggan ── -->
        <div v-if="currentStep === 0" class="form-body">
          <div class="form-card">
            <div class="form-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Data Pelanggan
            </div>
            <div class="form-grid-2">
              <div class="form-group" style="grid-column: 1/-1">
                <label>Tanggal Input <span class="req">*</span></label>
                <input type="date" v-model="form.tglInput" class="form-input" :class="{ 'input-error': errors.tglInput }" />
                <span v-if="errors.tglInput" class="field-error">{{ errors.tglInput }}</span>
              </div>
              <div class="form-group" style="grid-column: 1/-1">
                <label>Nama Lengkap Pelanggan <span class="req">*</span></label>
                <input type="text" v-model="form.namaPelanggan" class="form-input" :class="{ 'input-error': errors.namaPelanggan }" placeholder="Nama sesuai KTP" />
                <span v-if="errors.namaPelanggan" class="field-error">{{ errors.namaPelanggan }}</span>
              </div>
              <div class="form-group">
                <label>No. HP / WhatsApp</label>
                <input type="tel" v-model="form.noHp" class="form-input" placeholder="08xxxxxxxxxx" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" v-model="form.email" class="form-input" placeholder="contoh@email.com" />
              </div>
            </div>
          </div>

          <div class="form-card">
            <div class="form-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Alamat Pemasangan
            </div>
            <div class="form-grid-2">
              <div class="form-group" style="flex:2; grid-column: span 1">
                <label>Jalan / Nama Jalan</label>
                <input type="text" v-model="form.jalan" class="form-input" placeholder="Nama jalan" />
              </div>
              <div class="form-group">
                <label>No. Rumah</label>
                <input type="text" v-model="form.noRumah" class="form-input" placeholder="No." />
              </div>
              <div class="form-group">
                <label>RT</label>
                <input type="text" v-model="form.rt" class="form-input" placeholder="001" />
              </div>
              <div class="form-group">
                <label>RW</label>
                <input type="text" v-model="form.rw" class="form-input" placeholder="001" />
              </div>

              <!-- Provinsi -->
              <div class="form-group">
                <label>Provinsi</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen.province = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearch.province" placeholder="Ketik atau pilih provinsi..."
                      @focus="comboOpen.province = true" @input="onProvinceInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen.province }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="comboOpen.province = !comboOpen.province"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen.province && filteredProvinces.length" class="combobox-list">
                    <li v-for="p in filteredProvinces" :key="p.id" class="combobox-item" :class="{ active: form.provinceId === p.id }" @mousedown.prevent="selectProvince(p)">{{ p.name }}</li>
                  </ul>
                  <ul v-else-if="comboOpen.province && comboSearch.province && !filteredProvinces.length" class="combobox-list">
                    <li class="combobox-empty">Tidak ada hasil</li>
                  </ul>
                </div>
              </div>

              <!-- Kota -->
              <div class="form-group">
                <label>Kota / Kabupaten</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen.city = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearch.city" :placeholder="!form.provinceId ? 'Pilih provinsi dulu...' : 'Ketik kota...'"
                      :disabled="!form.provinceId" @focus="comboOpen.city = true" @input="onCityInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen.city }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="form.provinceId && (comboOpen.city = !comboOpen.city)"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen.city && filteredCities.length" class="combobox-list">
                    <li v-for="c in filteredCities" :key="c.id" class="combobox-item" :class="{ active: form.cityId === c.id }" @mousedown.prevent="selectCity(c)">{{ c.name }}</li>
                  </ul>
                </div>
              </div>

              <!-- Kecamatan -->
              <div class="form-group">
                <label>Kecamatan</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen.district = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearch.district" :placeholder="!form.cityId ? 'Pilih kota dulu...' : 'Ketik kecamatan...'"
                      :disabled="!form.cityId" @focus="comboOpen.district = true" @input="onDistrictInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen.district }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="form.cityId && (comboOpen.district = !comboOpen.district)"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen.district && filteredDistricts.length" class="combobox-list">
                    <li v-for="d in filteredDistricts" :key="d.id" class="combobox-item" :class="{ active: form.districtId === d.id }" @mousedown.prevent="selectDistrict(d)">{{ d.name }}</li>
                  </ul>
                </div>
              </div>

              <!-- Kelurahan -->
              <div class="form-group">
                <label>Kelurahan / Desa</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen.subdistrict = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearch.subdistrict" :placeholder="!form.districtId ? 'Pilih kecamatan dulu...' : 'Ketik kelurahan...'"
                      :disabled="!form.districtId" @focus="comboOpen.subdistrict = true" @input="onSubdistrictInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen.subdistrict }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="form.districtId && (comboOpen.subdistrict = !comboOpen.subdistrict)"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen.subdistrict && filteredSubdistricts.length" class="combobox-list">
                    <li v-for="s in filteredSubdistricts" :key="s.id" class="combobox-item" :class="{ active: form.subdistrictId === s.id }" @mousedown.prevent="selectSubdistrict(s)">{{ s.name }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="showListMode = true; loadList()">Batal</button>
            <button class="btn btn--primary" @click="goNext(0)">Lanjut →</button>
          </div>
        </div>

        <!-- ── STEP 1: Penanggung Jawab ── -->
        <div v-if="currentStep === 1" class="form-body">
          <div class="form-card">
            <div class="form-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Data Penanggung Jawab
            </div>
            <div class="form-checks" style="margin-bottom:16px">
              <label class="check-label">
                <input type="checkbox" v-model="sameAsPelanggan" @change="copySameAddress" />
                Sama dengan data pelanggan
              </label>
            </div>
            <div class="form-grid-2">
              <div class="form-group" style="grid-column: 1/-1">
                <label>Nama Penanggung Jawab</label>
                <input type="text" v-model="form.namaPj" class="form-input" placeholder="Nama PJ" :disabled="sameAsPelanggan" />
              </div>
              <div class="form-group">
                <label>No. HP PJ</label>
                <input type="tel" v-model="form.noHpPj" class="form-input" placeholder="08xxxxxxxxxx" :disabled="sameAsPelanggan" />
              </div>
              <div class="form-group">
                <label>Email PJ</label>
                <input type="email" v-model="form.emailPj" class="form-input" placeholder="email@pj.com" :disabled="sameAsPelanggan" />
              </div>
              <div class="form-group">
                <label>Jalan PJ</label>
                <input type="text" v-model="form.jalanPj" class="form-input" :disabled="sameAsPelanggan" />
              </div>
              <div class="form-group">
                <label>No. Rumah PJ</label>
                <input type="text" v-model="form.noRumahPj" class="form-input" :disabled="sameAsPelanggan" />
              </div>

              <!-- Provinsi PJ -->
              <div class="form-group">
                <label>Provinsi PJ</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen2.provincePj = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearchPj.provincePj" placeholder="Ketik provinsi..."
                      :disabled="sameAsPelanggan" @focus="comboOpen2.provincePj = true" @input="onProvincePjInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen2.provincePj }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="!sameAsPelanggan && (comboOpen2.provincePj = !comboOpen2.provincePj)"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen2.provincePj && filteredProvincesPj.length" class="combobox-list">
                    <li v-for="p in filteredProvincesPj" :key="p.id" class="combobox-item" :class="{ active: form.provinceIdPj === p.id }" @mousedown.prevent="selectProvincePj(p)">{{ p.name }}</li>
                  </ul>
                </div>
              </div>

              <!-- Kota PJ -->
              <div class="form-group">
                <label>Kota PJ</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen2.cityPj = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearchPj.cityPj"
                      :placeholder="!form.provinceIdPj ? 'Pilih provinsi PJ dulu...' : 'Ketik kota...'"
                      :disabled="sameAsPelanggan || !form.provinceIdPj"
                      @focus="comboOpen2.cityPj = true" @input="onCityPjInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen2.cityPj }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="!sameAsPelanggan && form.provinceIdPj && (comboOpen2.cityPj = !comboOpen2.cityPj)"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen2.cityPj && filteredCitiesPj.length" class="combobox-list">
                    <li v-for="c in filteredCitiesPj" :key="c.id" class="combobox-item" :class="{ active: form.cityIdPj === c.id }" @mousedown.prevent="selectCityPj(c)">{{ c.name }}</li>
                  </ul>
                </div>
              </div>

              <!-- Kecamatan PJ -->
              <div class="form-group">
                <label>Kecamatan PJ</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen2.districtPj = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearchPj.districtPj"
                      :placeholder="!form.cityIdPj ? 'Pilih kota PJ dulu...' : 'Ketik kecamatan...'"
                      :disabled="sameAsPelanggan || !form.cityIdPj"
                      @focus="comboOpen2.districtPj = true" @input="onDistrictPjInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen2.districtPj }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="!sameAsPelanggan && form.cityIdPj && (comboOpen2.districtPj = !comboOpen2.districtPj)"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen2.districtPj && filteredDistrictsPj.length" class="combobox-list">
                    <li v-for="d in filteredDistrictsPj" :key="d.id" class="combobox-item" :class="{ active: form.districtIdPj === d.id }" @mousedown.prevent="selectDistrictPj(d)">{{ d.name }}</li>
                  </ul>
                </div>
              </div>

              <!-- Kelurahan PJ -->
              <div class="form-group">
                <label>Kelurahan PJ</label>
                <div class="combobox-wrap" v-click-outside="() => comboOpen2.subdistrictPj = false">
                  <div class="combobox-input-wrap">
                    <input class="combobox-input" v-model="comboSearchPj.subdistrictPj"
                      :placeholder="!form.districtIdPj ? 'Pilih kecamatan PJ dulu...' : 'Ketik kelurahan...'"
                      :disabled="sameAsPelanggan || !form.districtIdPj"
                      @focus="comboOpen2.subdistrictPj = true" @input="onSubdistrictPjInput" />
                    <svg class="combobox-chevron" :class="{ open: comboOpen2.subdistrictPj }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" @click="!sameAsPelanggan && form.districtIdPj && (comboOpen2.subdistrictPj = !comboOpen2.subdistrictPj)"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <ul v-if="comboOpen2.subdistrictPj && filteredSubdistrictsPj.length" class="combobox-list">
                    <li v-for="s in filteredSubdistrictsPj" :key="s.id" class="combobox-item" :class="{ active: form.subdistrictIdPj === s.id }" @mousedown.prevent="selectSubdistrictPj(s)">{{ s.name }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="currentStep--">← Kembali</button>
            <button class="btn btn--primary" @click="goNext(1)">Lanjut →</button>
          </div>
        </div>

        <!-- ── STEP 2: Kategori & Fasilitas ── -->
        <div v-if="currentStep === 2" class="form-body">
          <div class="form-card">
            <div class="form-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Kategori &amp; Fasilitas
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label>Kategori Bangunan</label>
                <select v-model="form.bhjKatBangId" class="form-input">
                  <option value="">-- Pilih Kategori --</option>
                  <option v-for="k in katBangList" :key="k.id" :value="k.id">{{ katBangItemLabel(k) }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Level Bangunan</label>
                <select v-model="form.bhjKatBanglId" class="form-input">
                  <option value="">-- Pilih Level --</option>
                  <option v-for="k in katBanglList" :key="k.id" :value="k.id">{{ katBanglItemLabel(k) }}</option>
                </select>
              </div>
              <div class="form-group" style="grid-column: 1/-1">
                <label>Opsi Tambahan</label>
                <div class="form-checks">
                  <label class="check-label"><input type="checkbox" v-model="form.tangki" /><span>Pakai Tangki</span></label>
                  <label class="check-label"><input type="checkbox" v-model="form.checkTg" /><span>Cek TG</span></label>
                </div>
              </div>
            </div>
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="currentStep--">← Kembali</button>
            <button class="btn btn--primary" @click="goNext(2)">Lanjut →</button>
          </div>
        </div>

        <!-- ── STEP 3: Titik Lokasi ── -->
        <div v-if="currentStep === 3" class="form-body">
          <div class="form-card">
            <div class="form-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Titik Lokasi Pemasangan
            </div>

            <div class="loc-current">
              <div class="loc-display" :class="{ 'has-loc': form.titikLokasi }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{{ form.titikLokasi ? formatCoord(form.titikLokasi) : 'Belum ada titik dipilih' }}</span>
                <a v-if="form.titikLokasi" :href="mapsLink(form.titikLokasi)" target="_blank" class="loc-gmaps-link">
                  Buka di Google Maps ↗
                </a>
              </div>
              <div class="loc-buttons">
                <button class="btn btn--ghost btn-sm" @click="getCurrentLocation" :disabled="gettingLocation">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                  {{ gettingLocation ? 'Mengambil...' : 'Lokasi Saya' }}
                </button>
                <button class="btn btn--ghost btn-sm" @click="clearLocation" v-if="form.titikLokasi">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Reset
                </button>
              </div>
            </div>

            <p class="map-hint">Klik pada peta untuk memilih titik lokasi pemasangan.</p>
            <div id="enrollment-map" class="leaflet-map"></div>
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="currentStep--">← Kembali</button>
            <button class="btn btn--primary" @click="goNext(3)">Lanjut →</button>
          </div>
        </div>

        <!-- ── STEP 4: Dokumen ── -->
        <div v-if="currentStep === 4" class="form-body">
          <div class="form-card">
            <div class="form-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Dokumen Pendukung
            </div>
            <p class="attach-hint">Unggah foto KTP, KK, dan dokumen pendaftaran lainnya. Semua dokumen bersifat opsional.</p>

            <!-- Upload area -->
            <div class="attach-dropzone" @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="onDropFiles">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Klik atau seret file ke sini</span>
              <span class="attach-hint-sub">JPG, PNG, PDF, DOCX, XLSX — maks. 10 MB per file</span>
              <input ref="fileInput" type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" style="display:none" @change="onPickFiles" />
            </div>

            <!-- Dokumen sudah ada (mode edit) -->
            <div v-if="attachExisting.length" class="attach-section-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Dokumen Tersimpan
            </div>
            <div v-if="attachLoading" class="attach-loading">
              <div class="loading-dots"><span></span><span></span><span></span></div>
              <span>Memuat dokumen...</span>
            </div>
            <div v-for="(f, i) in attachExisting" :key="'ex-'+i" class="attach-item attach-item--done">
              <div class="attach-icon" v-html="fileIconSvg(f.name)"></div>
              <div class="attach-info">
                <span class="attach-name">{{ f.name }}</span>
                <span class="attach-meta" v-if="f.description">{{ f.description }}</span>
                <span class="attach-meta" v-if="f.updatedby">oleh {{ f.updatedby }}</span>
              </div>
              <div class="attach-actions">
                <button class="attach-action-btn attach-action-btn--download" title="Unduh" @click="triggerDownload(f)" :disabled="f.downloading">
                  <div v-if="f.downloading" class="btn-spinner btn-spinner--sm"></div>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="attach-action-btn attach-action-btn--delete" title="Hapus" @click="removeExistingAttachment(f, i)" :disabled="f.deleting">
                  <div v-if="f.deleting" class="btn-spinner btn-spinner--sm"></div>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>

            <!-- File baru akan diupload -->
            <div v-if="attachFiles.length" class="attach-section-title" style="margin-top:16px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Akan Diunggah
            </div>
            <div v-for="(item, i) in attachFiles" :key="'new-'+i" class="attach-item" :class="attachItemClass(item)">
              <div class="attach-icon" v-html="fileIconSvg(item.file.name)"></div>
              <div class="attach-info">
                <span class="attach-name">{{ item.file.name }}</span>
                <div class="attach-desc-row">
                  <input v-model="item.description" class="attach-desc-input" placeholder="Keterangan (mis. KTP Pelanggan)" :disabled="item.status === 'uploading' || item.status === 'done'" />
                </div>
                <span class="attach-meta">{{ formatFileSize(item.file.size) }}</span>
                <span v-if="item.error" class="attach-error">{{ item.error }}</span>
              </div>
              <div class="attach-actions">
                <span v-if="item.status === 'uploading'" class="attach-badge attach-badge--uploading">
                  <div class="btn-spinner btn-spinner--sm"></div> Mengunggah...
                </span>
                <span v-else-if="item.status === 'done'" class="attach-badge attach-badge--done">✓ Terunggah</span>
                <span v-else-if="item.status === 'error'" class="attach-badge attach-badge--error">Gagal</span>
                <button v-if="item.status !== 'uploading' && item.status !== 'done'" class="attach-remove" @click="removeAttachFile(i)" title="Hapus">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <p v-if="!attachFiles.length && !attachExisting.length && !attachLoading" class="attach-empty">
              Belum ada dokumen ditambahkan. Anda bisa melewati langkah ini.
            </p>
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="currentStep--">← Kembali</button>
            <button class="btn btn--primary" @click="goNext(4)">Lanjut →</button>
          </div>
        </div>

        <!-- ── STEP 5: Konfirmasi ── -->
        <div v-if="currentStep === 5" class="form-body">
          <div class="form-card">
            <div class="form-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Ringkasan &amp; Konfirmasi
            </div>
            <div class="review-grid">
              <div class="review-section">
                <h3>Data Pelanggan</h3>
                <div class="review-row"><span>Tanggal</span><strong>{{ formatDate(form.tglInput) }}</strong></div>
                <div class="review-row"><span>Nama</span><strong>{{ form.namaPelanggan || '—' }}</strong></div>
                <div class="review-row"><span>No. HP</span><strong>{{ form.noHp || '—' }}</strong></div>
                <div class="review-row"><span>Email</span><strong>{{ form.email || '—' }}</strong></div>
                <div class="review-row"><span>Alamat</span><strong>{{ fullAddress }}</strong></div>
              </div>
              <div class="review-section">
                <h3>Penanggung Jawab</h3>
                <div class="review-row"><span>Nama PJ</span><strong>{{ form.namaPj || '—' }}</strong></div>
                <div class="review-row"><span>No. HP PJ</span><strong>{{ form.noHpPj || '—' }}</strong></div>
                <div class="review-row"><span>Alamat PJ</span><strong>{{ fullAddressPj }}</strong></div>
              </div>
              <div class="review-section">
                <h3>Fasilitas</h3>
                <div class="review-row"><span>Kat. Bangunan</span><strong>{{ katBangLabel }}</strong></div>
                <div class="review-row"><span>Level</span><strong>{{ katBanglLabel }}</strong></div>
                <div class="review-row"><span>Tangki</span><strong>{{ form.tangki ? 'Ya' : 'Tidak' }}</strong></div>
                <div class="review-row"><span>Check TG</span><strong>{{ form.checkTg ? 'Ya' : 'Tidak' }}</strong></div>
              </div>
              <div class="review-section">
                <h3>Titik Lokasi</h3>
                <div class="review-row">
                  <span>Koordinat</span>
                  <strong v-if="form.titikLokasi">
                    {{ formatCoord(form.titikLokasi) }}
                    <a :href="mapsLink(form.titikLokasi)" target="_blank" class="loc-link-inline">↗ Maps</a>
                  </strong>
                  <strong v-else>Belum ditentukan</strong>
                </div>
              </div>
              <div class="review-section">
                <h3>Dokumen</h3>
                <div class="review-row">
                  <span>Tersimpan</span><strong>{{ attachExisting.length }} file</strong>
                </div>
                <div class="review-row">
                  <span>Akan Diunggah</span>
                  <strong>{{ attachFiles.filter(f => f.status !== 'done').length }} file</strong>
                </div>
                <div v-for="(item, i) in attachFiles" :key="i" class="review-row" style="padding-left:8px">
                  <span style="font-size:11.5px">{{ item.file.name }}</span>
                  <strong style="font-size:11.5px">{{ item.description || '—' }}</strong>
                </div>
              </div>
            </div>

            <div v-if="submitError" class="form-api-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ submitError }}
            </div>
            <div v-if="submitSuccess" class="alert-success">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Enrollment berhasil disimpan! ID: {{ savedId }}
            </div>
          </div>

          <div class="page-footer">
            <button class="btn btn--ghost" @click="currentStep--" :disabled="submitting">← Kembali</button>
            <button class="btn btn--primary" @click="submitForm" :disabled="submitting || submitSuccess">
              <div v-if="submitting" class="btn-spinner"></div>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              {{ submitting ? 'Menyimpan...' : 'Simpan Enrollment' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import {
  fetchEnrollments,
  createEnrollment,
  updateEnrollment,
  fetchKatBang,
  fetchKatBangl,
  uploadAttachment,
  fetchAttachments,
  downloadAttachment,
  deleteAttachment,
} from '@/services/enrollment.js'

const WILAYAH_API = 'https://www.emsifa.com/api-wilayah-indonesia/api'

export default {
  name: 'EnrollmentView',

  directives: {
    clickOutside: {
      mounted(el, binding) { el._co = e => { if (!el.contains(e.target)) binding.value(e) }; document.addEventListener('click', el._co) },
      unmounted(el) { document.removeEventListener('click', el._co) },
    }
  },

  data() {
    return {
      showListMode: true,
      currentStep: 0,
      steps: ['Data Pelanggan', 'Penanggung Jawab', 'Kategori', 'Titik Lokasi', 'Dokumen', 'Konfirmasi'],
      sameAsPelanggan: false,

      form: {
        tglInput: new Date().toISOString().split('T')[0],
        namaPelanggan: '', noHp: '', email: '',
        jalan: '', noRumah: '', rt: '', rw: '',
        kelurahan: '', kecamatan: '', kota: '', provinsi: '',
        provinceId: '', cityId: '', districtId: '', subdistrictId: '',
        namaPj: '', noHpPj: '', emailPj: '',
        jalanPj: '', noRumahPj: '',
        kelurahanPj: '', kecamatanPj: '', kotaPj: '', provinsiPj: '',
        provinceIdPj: '', cityIdPj: '', districtIdPj: '', subdistrictIdPj: '',
        tangki: false, checkTg: false,
        bhjKatBangId: '', bhjKatBanglId: '',
        titikLokasi: '',
      },
      editingId: null,

      // Validation
      errors: {},
      stepError: null,

      // Lookups
      katBangList: [],
      katBanglList: [],

      // Area data (Pelanggan)
      areaData: { provinces: [], cities: [], districts: [], subdistricts: [] },
      comboSearch: { province: '', city: '', district: '', subdistrict: '' },
      comboOpen: { province: false, city: false, district: false, subdistrict: false },

      // Area data (PJ)
      areaDataPj: { provinces: [], cities: [], districts: [], subdistricts: [] },
      comboSearchPj: { provincePj: '', cityPj: '', districtPj: '', subdistrictPj: '' },
      comboOpen2: { provincePj: false, cityPj: false, districtPj: false, subdistrictPj: false },

      // Map
      map: null, marker: null, gettingLocation: false,

      // List
      listData: [], listLoading: false, listSearch: '', listPage: 0, listPageSize: 20, listTotal: 0, searchTimeout: null,
      listSortCol: 'tglInput', listSortDir: 'desc',

      // Submit
      submitting: false, submitError: null, submitSuccess: false, savedId: null,

      // Attachments (Step 4 — Dokumen)
      attachFiles: [],       // { file, label, description, status: 'pending'|'uploading'|'done'|'error', error }
      attachExisting: [],    // file sudah terupload (saat edit)
      attachLoading: false,

      // View Modal
      viewModal: { show: false, row: null, map: null, marker: null },
      viewModalAttachments: [],   // attachment untuk view modal
      viewModalAttachLoading: false,
    }
  },

  computed: {
    fullAddress() {
      const f = this.form
      const parts = [f.jalan, f.noRumah && `No. ${f.noRumah}`, f.rt && `RT ${f.rt}`, f.rw && `RW ${f.rw}`, f.kelurahan, f.kecamatan, f.kota, f.provinsi]
      return parts.filter(Boolean).join(', ') || '—'
    },
    fullAddressPj() {
      const f = this.form
      const parts = [f.jalanPj, f.noRumahPj && `No. ${f.noRumahPj}`, f.kelurahanPj, f.kecamatanPj, f.kotaPj, f.provinsiPj]
      return parts.filter(Boolean).join(', ') || '—'
    },
    katBangLabel() {
      const found = this.katBangList.find(k => k.id === this.form.bhjKatBangId)
      return found ? this.katBangItemLabel(found) : '—'
    },
    katBanglLabel() {
      const found = this.katBanglList.find(k => k.id === this.form.bhjKatBanglId)
      return found ? this.katBanglItemLabel(found) : '—'
    },
    viewModalFullAddress() {
      const r = this.viewModal.row
      if (!r) return '—'
      const parts = [r.jalan, r.rumah && `No. ${r.rumah}`, r.rt && `RT ${r.rt}`, r.rw && `RW ${r.rw}`, r.kelurahan, r.kecamatan, r.kota, r.provinsi]
      return parts.filter(Boolean).join(', ') || '—'
    },
    viewModalFullAddressPj() {
      const r = this.viewModal.row
      if (!r) return '—'
      const parts = [r.jalanPj, r.rumahPj && `No. ${r.rumahPj}`, r.kelurahanPj, r.kecamatanPj, r.kotaPj, r.provinsiPj]
      return parts.filter(Boolean).join(', ') || '—'
    },
    // Filtered lists — Pelanggan
    filteredProvinces()    { return !this.comboSearch.province    ? this.areaData.provinces    : this.areaData.provinces.filter(x    => x.name.toLowerCase().includes(this.comboSearch.province.toLowerCase())) },
    filteredCities()       { return !this.comboSearch.city        ? this.areaData.cities        : this.areaData.cities.filter(x       => x.name.toLowerCase().includes(this.comboSearch.city.toLowerCase())) },
    filteredDistricts()    { return !this.comboSearch.district    ? this.areaData.districts    : this.areaData.districts.filter(x    => x.name.toLowerCase().includes(this.comboSearch.district.toLowerCase())) },
    filteredSubdistricts() { return !this.comboSearch.subdistrict ? this.areaData.subdistricts : this.areaData.subdistricts.filter(x => x.name.toLowerCase().includes(this.comboSearch.subdistrict.toLowerCase())) },
    // Filtered lists — PJ
    filteredProvincesPj()    { return !this.comboSearchPj.provincePj    ? this.areaDataPj.provinces    : this.areaDataPj.provinces.filter(x    => x.name.toLowerCase().includes(this.comboSearchPj.provincePj.toLowerCase())) },
    filteredCitiesPj()       { return !this.comboSearchPj.cityPj        ? this.areaDataPj.cities        : this.areaDataPj.cities.filter(x       => x.name.toLowerCase().includes(this.comboSearchPj.cityPj.toLowerCase())) },
    filteredDistrictsPj()    { return !this.comboSearchPj.districtPj    ? this.areaDataPj.districts    : this.areaDataPj.districts.filter(x    => x.name.toLowerCase().includes(this.comboSearchPj.districtPj.toLowerCase())) },
    filteredSubdistrictsPj() { return !this.comboSearchPj.subdistrictPj ? this.areaDataPj.subdistricts : this.areaDataPj.subdistricts.filter(x => x.name.toLowerCase().includes(this.comboSearchPj.subdistrictPj.toLowerCase())) },
  },

  watch: {
    currentStep(v) {
      if (v === 3) this.$nextTick(() => this.initMap())
      if (v === 4 && this.editingId) this.loadExistingAttachments()
    },
    showListMode(v) { if (v) this.loadList() },
  },

  async mounted() {
    await this.loadLookups()
    this.loadList()
    try {
      const res = await axios.get(`${WILAYAH_API}/provinces.json`)
      this.areaData.provinces = res.data
      this.areaDataPj.provinces = res.data
    } catch (e) { console.error('Gagal memuat provinsi', e) }
  },

  methods: {
    // ─── Helpers ───
    katBangItemLabel(k) {
      // Dari response API bhj_kat_bang — coba semua kemungkinan field label
      // Jika ada namaKategori atau nama, gunakan itu
      // Fallback: strip format "bhj_kat_bang (ID)" dari _identifier
      const raw = k.namaKategori || k.kodeKategori || k.namaPeruntukan || k.nama || k.name || k.identifier
      if (raw) return raw
      const ident = k['_identifier'] || k._identifier || ''
      // Strip "bhj_kat_bang (UUID)" → ambil bagian sebelum " (" jika ada konten lain
      const stripped = ident.replace(/^bhj_kat_bang \([A-F0-9]+\)$/i, '').trim()
      return stripped || ident || k.id
    },
    katBanglItemLabel(k) {
      // bhj_kat_bangl: label = namaPeruntukan, fallback kodePeruntukan + namaPeruntukan
      if (k.namaPeruntukan && k.kodePeruntukan) return `${k.kodePeruntukan} - ${k.namaPeruntukan}`
      return k.namaPeruntukan || k.kodePeruntukan || k.name || k.identifier || k._identifier || k.id
    },
    rowKatBangLabel(row) {
      // Openbravo mengembalikan bHJKatBang (string ID) atau bhjKatBang (object)
      const rawId = row.bHJKatBang || row.bhjKatBang?.id || row.bhjKatBang
      if (!rawId) return '—'
      const id = typeof rawId === 'object' ? rawId.id : rawId
      const found = this.katBangList.find(k => k.id === id)
      if (found) return this.katBangItemLabel(found)
      // fallback ke $_identifier dari response jika belum ada di list
      const ident = row['bHJKatBang$_identifier'] || row['bhjKatBang$_identifier'] || ''
      if (ident) return ident.replace(/^bhj_kat_bang \(.*\)$/, '').trim() || ident
      return id.substring(0, 8) + '...'
    },
    rowKatBanglLabel(row) {
      const rawId = row.bHJKatBangl || row.bhjKatBangl?.id || row.bhjKatBangl
      if (!rawId) return '—'
      const id = typeof rawId === 'object' ? rawId.id : rawId
      const found = this.katBanglList.find(k => k.id === id)
      if (found) return this.katBanglItemLabel(found)
      const ident = row['bHJKatBangl$_identifier'] || row['bhjKatBangl$_identifier'] || ''
      if (ident) return ident.replace(/^bhj_kat_bangl \(.*\)$/, '').trim() || ident
      return id.substring(0, 8) + '...'
    },
    openViewModal(row) {
      this.viewModal.row = row
      this.viewModal.show = true
      this.viewModalAttachments = []
      if (row.titikLokasi) {
        this.$nextTick(() => this.initViewModalMap(row.titikLokasi))
      }
      // Muat daftar attachment untuk record ini
      this.loadViewModalAttachments(row.id)
    },
    closeViewModal() {
      if (this.viewModal.map) { this.viewModal.map.remove(); this.viewModal.map = null; this.viewModal.marker = null }
      this.viewModal.show = false
      this.viewModal.row = null
      this.viewModalAttachments = []
    },
    async loadViewModalAttachments(recordId) {
      if (!recordId) return
      this.viewModalAttachLoading = true
      try {
        const data = await fetchAttachments(recordId)
        this.viewModalAttachments = data.map(d => ({
          id:          d.id,
          name:        d.name || d.fileName || d.id,
          description: d.description || '',
          updatedby:   d.updatedby || '',
          attmethod:   d.attmethod || '',
        }))
      } catch (e) {
        console.error('Gagal memuat attachment view modal:', e)
        this.viewModalAttachments = []
      } finally { this.viewModalAttachLoading = false }
    },
    async triggerDownload(f) {
      f.downloading = true
      try {
        await downloadAttachment(f.id, f.name)
      } catch (e) {
        alert('Gagal mengunduh: ' + (e.message || 'Unknown error'))
      } finally {
        f.downloading = false
      }
    },
    async removeExistingAttachment(f, i) {
      if (!confirm(`Hapus file "${f.name}"?`)) return
      f.deleting = true
      try {
        await deleteAttachment(this.editingId, f.id)
        this.attachExisting.splice(i, 1)
      } catch (e) {
        alert('Gagal menghapus: ' + (e.message || 'Unknown error'))
      } finally {
        f.deleting = false
      }
    },
    async initViewModalMap(coord) {
      if (!coord) return
      const [lat, lng] = coord.split(',').map(Number)
      if (isNaN(lat) || isNaN(lng)) return
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link'); link.id='leaflet-css'; link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
      }
      if (!window.L) {
        await new Promise((res, rej) => { const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s) })
      }
      await this.$nextTick()
      const el = document.getElementById('view-modal-map')
      if (!el) return
      if (this.viewModal.map) { this.viewModal.map.remove(); this.viewModal.map = null }
      const L = window.L
      this.viewModal.map = L.map('view-modal-map').setView([lat, lng], 16)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(this.viewModal.map)
      const icon = L.divIcon({ html: `<div class="custom-pin"><svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C7.03 0 3 4.03 3 9c0 7.5 9 19 9 19s9-11.5 9-19c0-4.97-4.03-9-9-9z" fill="#3b82f6"/><circle cx="12" cy="9" r="4" fill="white"/></svg></div>`, className: '', iconSize: [28,36], iconAnchor: [14,36] })
      this.viewModal.marker = L.marker([lat, lng], { icon }).addTo(this.viewModal.map)
    },
    mapsLink(coord) {
      if (!coord) return '#'
      const [lat, lng] = coord.split(',').map(s => s.trim())
      return `https://www.google.com/maps?q=${lat},${lng}`
    },
    formatCoord(coord) {
      if (!coord) return ''
      return coord // show raw "lat,lng" string
    },
    formatDate(d) {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    },

    // ─── Validation ───
    validateStep(step) {
      const errs = {}
      if (step === 0) {
        if (!this.form.tglInput) errs.tglInput = 'Tanggal input wajib diisi'
        if (!this.form.namaPelanggan?.trim()) errs.namaPelanggan = 'Nama pelanggan wajib diisi'
      }
      this.errors = errs
      return Object.keys(errs).length === 0
    },

    goNext(step) {
      this.stepError = null
      if (!this.validateStep(step)) {
        this.stepError = 'Harap lengkapi field yang wajib diisi (ditandai *).'
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (this.currentStep < this.steps.length - 1) this.currentStep++
    },

    startNew() {
      this.resetForm()
      this.showListMode = false
    },

    // ─── Lookups ───
    async loadLookups() {
      try {
        const [kb, kbl] = await Promise.all([fetchKatBang(), fetchKatBangl()])
        this.katBangList = kb; this.katBanglList = kbl
      } catch (e) { console.error('Gagal memuat lookup:', e) }
    },

    // ─── Combobox: Pelanggan ───
    resetComboBelow(level) {
      if (level <= 1) { this.comboSearch.city=''; this.form.cityId=''; this.form.kota=''; this.areaData.cities=[]; }
      if (level <= 2) { this.comboSearch.district=''; this.form.districtId=''; this.form.kecamatan=''; this.areaData.districts=[]; }
      if (level <= 3) { this.comboSearch.subdistrict=''; this.form.subdistrictId=''; this.form.kelurahan=''; this.areaData.subdistricts=[]; }
    },
    onProvinceInput()    { this.form.provinceId=''; this.form.provinsi=''; this.resetComboBelow(1); this.comboOpen.province=true },
    onCityInput()        { this.form.cityId=''; this.resetComboBelow(2); this.comboOpen.city=true },
    onDistrictInput()    { this.form.districtId=''; this.resetComboBelow(3); this.comboOpen.district=true },
    onSubdistrictInput() { this.form.subdistrictId=''; this.comboOpen.subdistrict=true },
    async selectProvince(p) {
      this.form.provinceId=p.id; this.form.provinsi=p.name; this.comboSearch.province=p.name; this.comboOpen.province=false; this.resetComboBelow(1)
      try { const r = await axios.get(`${WILAYAH_API}/regencies/${p.id}.json`); this.areaData.cities=r.data } catch(e) {}
    },
    async selectCity(c) {
      this.form.cityId=c.id; this.form.kota=c.name; this.comboSearch.city=c.name; this.comboOpen.city=false; this.resetComboBelow(2)
      try { const r = await axios.get(`${WILAYAH_API}/districts/${c.id}.json`); this.areaData.districts=r.data } catch(e) {}
    },
    async selectDistrict(d) {
      this.form.districtId=d.id; this.form.kecamatan=d.name; this.comboSearch.district=d.name; this.comboOpen.district=false; this.resetComboBelow(3)
      try { const r = await axios.get(`${WILAYAH_API}/villages/${d.id}.json`); this.areaData.subdistricts=r.data } catch(e) {}
    },
    selectSubdistrict(s) {
      this.form.subdistrictId=s.id; this.form.kelurahan=s.name; this.comboSearch.subdistrict=s.name; this.comboOpen.subdistrict=false
    },

    // ─── Combobox: PJ ───
    resetComboBelowPj(level) {
      if (level <= 1) { this.comboSearchPj.cityPj=''; this.form.cityIdPj=''; this.form.kotaPj=''; this.areaDataPj.cities=[]; }
      if (level <= 2) { this.comboSearchPj.districtPj=''; this.form.districtIdPj=''; this.form.kecamatanPj=''; this.areaDataPj.districts=[]; }
      if (level <= 3) { this.comboSearchPj.subdistrictPj=''; this.form.subdistrictIdPj=''; this.form.kelurahanPj=''; this.areaDataPj.subdistricts=[]; }
    },
    onProvincePjInput()    { this.form.provinceIdPj=''; this.form.provinsiPj=''; this.resetComboBelowPj(1); this.comboOpen2.provincePj=true },
    onCityPjInput()        { this.form.cityIdPj=''; this.resetComboBelowPj(2); this.comboOpen2.cityPj=true },
    onDistrictPjInput()    { this.form.districtIdPj=''; this.resetComboBelowPj(3); this.comboOpen2.districtPj=true },
    onSubdistrictPjInput() { this.form.subdistrictIdPj=''; this.comboOpen2.subdistrictPj=true },
    async selectProvincePj(p) {
      this.form.provinceIdPj=p.id; this.form.provinsiPj=p.name; this.comboSearchPj.provincePj=p.name; this.comboOpen2.provincePj=false; this.resetComboBelowPj(1)
      try { const r = await axios.get(`${WILAYAH_API}/regencies/${p.id}.json`); this.areaDataPj.cities=r.data } catch(e) {}
    },
    async selectCityPj(c) {
      this.form.cityIdPj=c.id; this.form.kotaPj=c.name; this.comboSearchPj.cityPj=c.name; this.comboOpen2.cityPj=false; this.resetComboBelowPj(2)
      try { const r = await axios.get(`${WILAYAH_API}/districts/${c.id}.json`); this.areaDataPj.districts=r.data } catch(e) {}
    },
    async selectDistrictPj(d) {
      this.form.districtIdPj=d.id; this.form.kecamatanPj=d.name; this.comboSearchPj.districtPj=d.name; this.comboOpen2.districtPj=false; this.resetComboBelowPj(3)
      try { const r = await axios.get(`${WILAYAH_API}/villages/${d.id}.json`); this.areaDataPj.subdistricts=r.data } catch(e) {}
    },
    selectSubdistrictPj(s) {
      this.form.subdistrictIdPj=s.id; this.form.kelurahanPj=s.name; this.comboSearchPj.subdistrictPj=s.name; this.comboOpen2.subdistrictPj=false
    },

    copySameAddress() {
      if (this.sameAsPelanggan) {
        this.form.namaPj = this.form.namaPelanggan; this.form.noHpPj = this.form.noHp; this.form.emailPj = this.form.email
        this.form.jalanPj = this.form.jalan; this.form.noRumahPj = this.form.noRumah
        this.form.kelurahanPj = this.form.kelurahan; this.form.kecamatanPj = this.form.kecamatan
        this.form.kotaPj = this.form.kota; this.form.provinsiPj = this.form.provinsi
        this.form.provinceIdPj = this.form.provinceId; this.form.cityIdPj = this.form.cityId
        this.form.districtIdPj = this.form.districtId; this.form.subdistrictIdPj = this.form.subdistrictId
        this.comboSearchPj.provincePj = this.comboSearch.province; this.comboSearchPj.cityPj = this.comboSearch.city
        this.comboSearchPj.districtPj = this.comboSearch.district; this.comboSearchPj.subdistrictPj = this.comboSearch.subdistrict
        this.areaDataPj.cities = this.areaData.cities; this.areaDataPj.districts = this.areaData.districts; this.areaDataPj.subdistricts = this.areaData.subdistricts
      }
    },

    // ─── Map ───
    async initMap() {
      // Jika map sudah ada tapi container-nya sudah di-recreate (misal saat edit),
      // destroy dulu agar bisa init ulang ke DOM yang baru
      if (this.map) {
        const el = document.getElementById('enrollment-map')
        if (el && el._leaflet_id) {
          // Container masih valid — cukup invalidateSize
          this.map.invalidateSize()
          return
        }
        // Container sudah di-recreate (v-if toggle) — destroy dan init ulang
        this.map.remove(); this.map = null; this.marker = null
      }
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link'); link.id='leaflet-css'; link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
      }
      if (!window.L) {
        await new Promise((res, rej) => { const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s) })
      }
      const L = window.L
      this.map = L.map('enrollment-map').setView([-6.2088, 106.8456], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(this.map)
      if (this.form.titikLokasi) {
        const [lat, lng] = this.form.titikLokasi.split(',').map(Number)
        if (!isNaN(lat) && !isNaN(lng)) { this.placeMarker(L, lat, lng); this.map.setView([lat, lng], 17) }
      }
      this.map.on('click', (e) => { const { lat, lng } = e.latlng; this.placeMarker(L, lat, lng); this.form.titikLokasi = `${lat.toFixed(7)},${lng.toFixed(7)}` })
    },
    placeMarker(L, lat, lng) {
      if (this.marker) this.map.removeLayer(this.marker)
      const icon = L.divIcon({ html: `<div class="custom-pin"><svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C7.03 0 3 4.03 3 9c0 7.5 9 19 9 19s9-11.5 9-19c0-4.97-4.03-9-9-9z" fill="#3b82f6"/><circle cx="12" cy="9" r="4" fill="white"/></svg></div>`, className: '', iconSize: [28,36], iconAnchor: [14,36] })
      this.marker = L.marker([lat, lng], { icon, draggable: true }).addTo(this.map)
      this.marker.on('dragend', (e) => { const p = e.target.getLatLng(); this.form.titikLokasi = `${p.lat.toFixed(7)},${p.lng.toFixed(7)}` })
    },
    getCurrentLocation() {
      if (!navigator.geolocation) { alert('Browser tidak mendukung geolokasi.'); return }
      this.gettingLocation = true
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat=pos.coords.latitude, lng=pos.coords.longitude
          this.form.titikLokasi = `${lat.toFixed(7)},${lng.toFixed(7)}`
          if (this.map && window.L) { this.map.setView([lat,lng], 17); this.placeMarker(window.L, lat, lng) }
          this.gettingLocation = false
        },
        (err) => { alert('Gagal mendapatkan lokasi: ' + err.message); this.gettingLocation = false },
        { enableHighAccuracy: true }
      )
    },
    clearLocation() {
      this.form.titikLokasi = ''
      if (this.marker && this.map) { this.map.removeLayer(this.marker); this.marker = null }
    },

    // ─── Attachments ───
    onPickFiles(e) {
      this.addFiles(Array.from(e.target.files))
      e.target.value = ''
    },
    onDropFiles(e) {
      this.addFiles(Array.from(e.dataTransfer.files))
    },
    addFiles(files) {
      const MAX = 10 * 1024 * 1024
      for (const f of files) {
        if (f.size > MAX) { alert(`File "${f.name}" melebihi batas 10 MB.`); continue }
        this.attachFiles.push({ file: f, description: '', status: 'pending', error: null })
      }
    },
    removeAttachFile(i) {
      this.attachFiles.splice(i, 1)
    },
    fileIconSvg(name = '') {
      const ext = (name || '').split('.').pop().toLowerCase()
      if (['jpg','jpeg','png','gif','webp'].includes(ext)) return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
      if (ext === 'pdf') return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`
      if (['doc','docx'].includes(ext)) return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
      if (['xls','xlsx'].includes(ext)) return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`
    },
    fileIconEmoji(name = '') { return this.fileIconSvg(name) },
    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    },
    attachItemClass(item) {
      if (item.status === 'done')      return 'attach-item--done'
      if (item.status === 'uploading') return 'attach-item--uploading'
      if (item.status === 'error')     return 'attach-item--error'
      return ''
    },
    async uploadAllAttachments(enrollmentId) {
      const pending = this.attachFiles.filter(f => f.status === 'pending' || f.status === 'error')
      for (const item of pending) {
        item.status = 'uploading'; item.error = null
        try {
          await uploadAttachment(enrollmentId, item.file, item.description)
          item.status = 'done'
        } catch (e) {
          item.status = 'error'
          item.error = e.response?.data?.error?.message || e.message || 'Gagal upload'
        }
      }
    },
    async loadExistingAttachments() {
      if (!this.editingId) return
      this.attachLoading = true
      try {
        const data = await fetchAttachments(this.editingId)
        // AttachmentAH response: { id, name, description, age, updatedby, attmethod }
        this.attachExisting = data.map(d => ({
          id:          d.id,
          name:        d.name || d.fileName || d.id,
          description: d.description || '',
          updatedby:   d.updatedby || '',
        }))
      } catch (e) {
        console.error('Gagal memuat attachment:', e)
        this.attachExisting = []
      } finally { this.attachLoading = false }
    },

    // ─── List ───
    async loadList() {
      this.listLoading = true
      try {
        const res = await fetchEnrollments({ startRow: this.listPage * this.listPageSize, pageSize: this.listPageSize, searchKey: this.listSearch, sortCol: this.listSortCol, sortDir: this.listSortDir })
        this.listData = res.data ?? []; this.listTotal = res.totalRows ?? this.listData.length
      } catch (e) { console.error(e) } finally { this.listLoading = false }
    },
    onSearch() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => { this.listPage = 0; this.loadList() }, 400)
    },
    toggleSort(col) {
      if (this.listSortCol === col) {
        this.listSortDir = this.listSortDir === 'asc' ? 'desc' : 'asc'
      } else {
        this.listSortCol = col
        this.listSortDir = 'asc'
      }
      this.listPage = 0
      this.loadList()
    },

    editRow(row) {
      this.showListMode = false; this.editingId = row.id
      this.form = {
        tglInput: (row.tglInput || row.tGLInput || '').split('T')[0] || '',
        namaPelanggan: row.namaPelanggan || '', noHp: row.hp || '', email: row.email || '',
        jalan: row.jalan || '', noRumah: row.rumah || '', rt: row.rt || '', rw: row.rw || '',
        kelurahan: row.kelurahan || '', kecamatan: row.kecamatan || '', kota: row.kota || '', provinsi: row.provinsi || '',
        provinceId: '', cityId: '', districtId: '', subdistrictId: '',
        namaPj: row.namaPj || '', noHpPj: row.hpPj || '', emailPj: row.emailPj || '',
        jalanPj: row.jalanPj || '', noRumahPj: row.rumahPj || '',
        kelurahanPj: row.kelurahanPj || '', kecamatanPj: row.kecamatanPj || '', kotaPj: row.kotaPj || '', provinsiPj: row.provinsiPj || '',
        provinceIdPj: '', cityIdPj: '', districtIdPj: '', subdistrictIdPj: '',
        tangki: row.tangki === true || row.tangki === 'Y',
        checkTg: row.checkTg === true || row.checkTg === 'Y',
        bhjKatBangId: (typeof (row.bHJKatBang || row.bhjKatBang) === 'object' ? (row.bHJKatBang || row.bhjKatBang)?.id : (row.bHJKatBang || row.bhjKatBang)) || '',
        bhjKatBanglId: (typeof (row.bHJKatBangl || row.bhjKatBangl) === 'object' ? (row.bHJKatBangl || row.bhjKatBangl)?.id : (row.bHJKatBangl || row.bhjKatBangl)) || '',
        titikLokasi: row.titikLokasi || '',
      }
      this.comboSearch.district = row.kecamatan || ''; this.comboSearch.subdistrict = row.kelurahan || ''
      this.comboSearch.city = row.kota || ''; this.comboSearch.province = row.provinsi || ''
      this.comboSearchPj.districtPj = row.kecamatanPj || ''; this.comboSearchPj.subdistrictPj = row.kelurahanPj || ''
      this.comboSearchPj.cityPj = row.kotaPj || ''; this.comboSearchPj.provincePj = row.provinsiPj || ''
      this.errors = {}; this.stepError = null
      // Destroy map lama agar initMap bisa re-init ke DOM yang baru
      if (this.map) { this.map.remove(); this.map = null; this.marker = null }
      this.currentStep = 0
    },

    // ─── Submit ───
    async submitForm() {
      this.submitting = true; this.submitError = null; this.submitSuccess = false
      try {
        // 1. Simpan data enrollment (create atau update)
        const result = this.editingId
          ? await updateEnrollment(this.editingId, this.form)
          : await createEnrollment(this.form)
        this.savedId = result?.id || '—'

        // 2. Upload attachment jika ada file pending
        const targetId = result?.id || this.editingId
        if (targetId && this.attachFiles.some(f => f.status === 'pending' || f.status === 'error')) {
          await this.uploadAllAttachments(targetId)
        }

        // 3. Cek apakah ada file yang gagal upload
        const failedFiles = this.attachFiles.filter(f => f.status === 'error')
        if (failedFiles.length > 0) {
          // Data sudah tersimpan, tapi ada file yang gagal — tunjukkan warning
          this.submitError = `Data berhasil disimpan, namun ${failedFiles.length} file gagal diunggah. ` +
            `Pastikan sudah login ke Openbravo, lalu buka Edit untuk upload ulang.`
          this.submitSuccess = true
          // Jangan redirect — biarkan user lihat file mana yang gagal
          return
        }

        this.submitSuccess = true
        setTimeout(() => { this.resetForm(); this.showListMode = true }, 2000)
      } catch (e) {
        this.submitError = e.message || 'Terjadi kesalahan saat menyimpan.'
      } finally {
        this.submitting = false
      }
    },

    resetForm() {
      this.editingId = null; this.currentStep = 0; this.sameAsPelanggan = false
      this.submitSuccess = false; this.submitError = null; this.savedId = null
      this.errors = {}; this.stepError = null
      Object.assign(this.comboSearch, { province:'', city:'', district:'', subdistrict:'' })
      Object.assign(this.comboSearchPj, { provincePj:'', cityPj:'', districtPj:'', subdistrictPj:'' })
      Object.assign(this.comboOpen, { province:false, city:false, district:false, subdistrict:false })
      Object.assign(this.comboOpen2, { provincePj:false, cityPj:false, districtPj:false, subdistrictPj:false })
      this.areaData.cities=[]; this.areaData.districts=[]; this.areaData.subdistricts=[]
      this.areaDataPj.cities=[]; this.areaDataPj.districts=[]; this.areaDataPj.subdistricts=[]
      this.form = {
        tglInput: new Date().toISOString().split('T')[0],
        namaPelanggan:'', noHp:'', email:'', jalan:'', noRumah:'', rt:'', rw:'',
        kelurahan:'', kecamatan:'', kota:'', provinsi:'',
        provinceId:'', cityId:'', districtId:'', subdistrictId:'',
        namaPj:'', noHpPj:'', emailPj:'', jalanPj:'', noRumahPj:'',
        kelurahanPj:'', kecamatanPj:'', kotaPj:'', provinsiPj:'',
        provinceIdPj:'', cityIdPj:'', districtIdPj:'', subdistrictIdPj:'',
        tangki:false, checkTg:false, bhjKatBangId:'', bhjKatBanglId:'', titikLokasi:'',
      }
      if (this.map) { this.map.remove(); this.map=null; this.marker=null }
      this.attachFiles = []; this.attachExisting = []
    },
  },

  beforeUnmount() { if (this.map) { this.map.remove(); this.map = null } },
}
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
.page-wrap { padding: 28px 32px; max-width: 1400px; margin: 0 auto; }
.content-card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); overflow: visible; }

/* ── Card Header ── */
.card-header { padding: 20px 24px 0; display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; gap: 12px; padding: 14px 20px; }
.search-wrap { position: relative; flex: 1; max-width: 300px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.search-input { width: 100%; height: 36px; padding: 0 12px 0 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; background: var(--surface2); outline: none; font-family: var(--font); color: var(--text-primary); transition: border-color .15s; }
.search-input:focus { border-color: var(--accent); background: #fff; }
.list-count { font-size: 12.5px; color: var(--text-muted); }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; font-family: var(--font); }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #fff; } .btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); } .btn--ghost:hover:not(:disabled) { background: var(--surface2); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Table ── */
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table thead th { padding: 10px 16px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.table tbody td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.tr-data:hover { background: #fafbfc; }
.th-action { text-align: right; }
.sortable { cursor: pointer; user-select: none; position: relative; padding-right: 20px !important; transition: color 0.15s; }
.sortable:hover { color: var(--text-primary); }
.sortable::after, .sortable::before { content: ''; position: absolute; right: 6px; top: 50%; border: 4px solid transparent; opacity: 0.3; }
.sortable::before { border-bottom-color: currentColor; margin-top: -9px; }
.sortable::after  { border-top-color: currentColor; margin-top: 1px; }
.sortable.asc::before  { opacity: 1; color: var(--accent, #2563eb); }
.sortable.desc::after  { opacity: 1; color: var(--accent, #2563eb); }
.td-name { font-weight: 500; color: var(--text-primary); }
.td-secondary { color: var(--text-secondary); }
.td-mono { font-family: var(--font-mono); font-size: 12.5px; }
.td-empty { text-align: center; color: var(--text-muted); padding: 48px; font-size: 13px; }
.td-action-cell { text-align: right; }

.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; color: var(--text-secondary); transition: background .12s; }
.action-btn:hover { background: var(--accent-light); color: var(--accent); }

.loc-link { color: var(--accent); font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
.loc-link:hover { text-decoration: underline; }

/* ── Pagination ── */
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 2px; padding: 14px 20px; border-top: 1px solid var(--border); }
.page-btn { min-width: 36px; height: 36px; padding: 0 10px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; font-family: var(--font); }
.page-btn:hover:not(:disabled):not(.page-btn--active) { color: var(--text-primary); background: rgba(0,0,0,.05); }
.page-btn--active { background: #fff !important; color: #1e293b !important; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
.page-btn:disabled { opacity: .3; cursor: not-allowed; }

/* ── Loading ── */
.loading-dots { display: flex; gap: 6px; justify-content: center; align-items: center; }
.loading-dots span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1} }

/* ── Breadcrumb ── */
.breadcrumb-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
.breadcrumb-back { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--accent); font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 0; font-family: var(--font); }
.breadcrumb-back:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-muted); }
.breadcrumb-cur { color: var(--text-primary); font-weight: 500; }

/* ── Steps ── */
.steps-bar { max-width: 800px; margin: 24px auto 8px; padding: 0 24px; display: flex; align-items: flex-start; }
.step-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.step-item:not(:last-child)::after { content: ''; position: absolute; top: 14px; left: 50%; width: 100%; height: 2px; background: var(--border); z-index: 0; }
.step-item.done:not(:last-child)::after { background: var(--accent); }
.step-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; border: 2px solid var(--border); background: var(--surface); color: var(--text-muted); position: relative; z-index: 1; transition: all .2s; cursor: default; }
.step-item.active .step-circle { background: var(--accent); border-color: var(--accent); color: #fff; }
.step-item.done .step-circle { background: var(--success); border-color: var(--success); color: #fff; cursor: pointer; }
.step-label { margin-top: 6px; font-size: 11px; color: var(--text-muted); text-align: center; white-space: nowrap; font-weight: 500; }
.step-item.active .step-label { color: var(--accent); font-weight: 600; }
.step-item.done .step-label { color: var(--success); }

/* ── Validation ── */
.step-error-banner { display: flex; align-items: center; gap: 8px; margin: 8px 24px 0; padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); font-size: 13px; color: var(--danger); }
.input-error { border-color: var(--danger) !important; }
.field-error { font-size: 11.5px; color: var(--danger); margin-top: 2px; }
.req { color: var(--danger); }

/* ── Form ── */
.form-body { padding: 16px 24px 24px; }
.form-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 16px; }
.form-card-title { display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); margin-bottom: 18px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-input { height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; width: 100%; }
.form-input:focus { border-color: var(--accent); background: #fff; }
.form-input:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }

.form-checks { display: flex; gap: 20px; }
.check-label { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
.check-label input[type=checkbox] { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }

.form-api-error { padding: 10px 14px; background: #fff1f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); color: var(--danger); font-size: 12.5px; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.alert-success { padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); color: #166534; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.page-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }

/* ── Combobox ── */
.combobox-wrap { position: relative; width: 100%; }
.combobox-input-wrap { position: relative; display: flex; align-items: center; }
.combobox-input { width: 100%; height: 38px; padding: 0 32px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--surface2); transition: border-color .15s; font-family: var(--font); color: var(--text-primary); box-sizing: border-box; }
.combobox-input:focus { border-color: var(--accent); background: #fff; }
.combobox-input:disabled { background: #f1f5f9; color: var(--text-muted); cursor: not-allowed; }
.combobox-chevron { position: absolute; right: 10px; color: var(--text-muted); cursor: pointer; transition: transform .2s; flex-shrink: 0; }
.combobox-chevron.open { transform: rotate(180deg); color: var(--accent); }
.combobox-list { position: absolute; top: calc(100% + 3px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 9999; max-height: 220px; overflow-y: auto; list-style: none; margin: 0; padding: 4px 0; }
.combobox-item { padding: 8px 12px; font-size: 13px; color: var(--text-primary); cursor: pointer; transition: background .1s; }
.combobox-item:hover { background: var(--accent-light); color: var(--accent); }
.combobox-item.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.combobox-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted); font-style: italic; }

/* ── Map ── */
.loc-current { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.loc-display { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-muted); flex: 1; min-width: 0; }
.loc-display.has-loc { border-color: var(--success); color: #166534; background: #f0fdf4; }
.loc-gmaps-link { margin-left: auto; color: var(--accent); font-size: 12px; text-decoration: none; white-space: nowrap; flex-shrink: 0; }
.loc-gmaps-link:hover { text-decoration: underline; }
.loc-buttons { display: flex; gap: 8px; flex-shrink: 0; }
.map-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 10px; }
.leaflet-map { height: 400px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
:global(.custom-pin) { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }

/* ── Review ── */
.review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
.review-section { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; }
.review-section h3 { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); margin: 0 0 12px; }
.review-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.review-row:last-child { border-bottom: none; }
.review-row span { color: var(--text-muted); flex-shrink: 0; font-size: 12px; }
.review-row strong { color: var(--text-primary); text-align: right; word-break: break-all; }
.loc-link-inline { color: var(--accent); font-size: 12px; text-decoration: none; margin-left: 4px; }
.loc-link-inline:hover { text-decoration: underline; }

/* ── View Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); animation: fadeIn .15s ease; }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
.modal-box { background: var(--surface); border-radius: var(--radius); box-shadow: 0 20px 60px rgba(0,0,0,.25); width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; animation: slideUp .18s ease; }
@keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 1; border-radius: var(--radius) var(--radius) 0 0; }
.modal-title-wrap { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--text-primary); }
.modal-close { width: 30px; height: 30px; border-radius: 6px; border: none; background: var(--surface2); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all .12s; }
.modal-close:hover { background: #fee2e2; color: var(--danger); }
.modal-body { padding: 20px 22px; flex: 1; }
.modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
.modal-section { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 16px; }
.modal-section-title { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--accent); margin-bottom: 10px; }
.modal-coord-badge { display: inline-flex; align-items: center; margin-left: 8px; padding: 2px 8px; background: var(--accent-light); color: var(--accent); border-radius: 20px; font-size: 11px; font-family: var(--font-mono); font-weight: 600; text-transform: none; letter-spacing: 0; }
.modal-gmaps-btn { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; padding: 3px 10px; background: var(--accent); color: #fff; border-radius: 20px; font-size: 11px; font-weight: 600; text-decoration: none; text-transform: none; letter-spacing: 0; transition: background .12s; }
.modal-gmaps-btn:hover { background: var(--accent-hover); }
.modal-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.modal-row:last-child { border-bottom: none; }
.modal-row span { color: var(--text-muted); flex-shrink: 0; font-size: 12px; }
.modal-row strong { color: var(--text-primary); text-align: right; word-break: break-word; }
.modal-map-section { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 16px; }
.modal-map { height: 320px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
.modal-no-loc { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100px; gap: 8px; color: var(--text-muted); font-size: 13px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 22px; border-top: 1px solid var(--border); }

/* ── Attachment Step ── */
.attach-hint { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; }
.attach-hint-sub { font-size: 11.5px; color: var(--text-muted); }
.attach-dropzone {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 28px 20px; border: 2px dashed var(--border); border-radius: var(--radius);
  cursor: pointer; transition: border-color .2s, background .2s; text-align: center;
  font-size: 13px; color: var(--text-secondary); background: var(--surface2);
}
.attach-dropzone:hover { border-color: var(--accent); background: var(--accent-light); color: var(--accent); }
.attach-section-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 16px 0 8px; }
.attach-loading { display: flex; align-items: center; gap: 10px; padding: 10px 0; font-size: 13px; color: var(--text-muted); }
.attach-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  margin-bottom: 6px; background: var(--surface); transition: border-color .2s;
}
.attach-item--done    { border-color: #bbf7d0; background: #f0fdf4; }
.attach-item--uploading { border-color: #bfdbfe; background: #eff6ff; }
.attach-item--error   { border-color: #fecaca; background: #fff1f2; }
.attach-icon { width: 32px; height: 32px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent); }
.attach-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.attach-name { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.attach-meta { font-size: 11px; color: var(--text-muted); }
.attach-error { font-size: 11.5px; color: var(--danger); }
.attach-desc-row { display: flex; align-items: center; gap: 6px; }
.attach-desc-input {
  flex: 1; font-size: 12px; padding: 3px 8px; border: 1px solid var(--border);
  border-radius: 6px; background: var(--surface2); color: var(--text-primary);
  outline: none; transition: border-color .15s;
}
.attach-desc-input:focus { border-color: var(--accent); }
.attach-desc-input:disabled { background: transparent; border-color: transparent; color: var(--text-muted); }
.attach-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.attach-badge {
  font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px;
  display: flex; align-items: center; gap: 4px; white-space: nowrap;
}
.attach-badge--done      { background: #dcfce7; color: #15803d; }
.attach-badge--uploading { background: #dbeafe; color: #1d4ed8; }
.attach-badge--error     { background: #fee2e2; color: #dc2626; }
.attach-remove {
  width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--text-muted); display: flex; align-items: center;
  justify-content: center; cursor: pointer; transition: border-color .15s, color .15s;
}
.attach-remove:hover { border-color: var(--danger); color: var(--danger); }
.attach-empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 20px 0; }
.btn-spinner--sm { width: 12px; height: 12px; border-width: 2px; }
</style>

<style>
select option {
  background: #ffffff !important;
  color: #0f172a !important;
}
</style>