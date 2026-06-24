<template>
  <div class="combobox-wrap" ref="wrapper">
    <div class="combobox-input-wrap" @click="toggle">
      <div class="combobox-input" style="display:flex; align-items:center; padding-right:8px; cursor:pointer;">
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px;"
          :style="{ color: modelValue ? 'var(--text-primary)' : 'var(--text-muted)' }">
          {{ displayValue || placeholder }}
        </span>
        <button v-if="modelValue" @click.stop="clear"
          style="background:none; border:none; color:var(--danger); cursor:pointer; padding:0 6px; font-size:16px; line-height:1;">
          &times;
        </button>
        <svg class="combobox-chevron" :class="{ open: open }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="open" ref="dropdown" class="combobox-list" :style="dropdownStyle" style="position:fixed; z-index:9999; display:block; padding:0;">
          <div style="padding:8px; border-bottom:1px solid var(--border); background:var(--surface);">
            <input ref="searchInput" v-model="search" @input="onSearch" type="text" placeholder="Search..."
              style="width:100%; height:34px; padding:0 12px; border:1px solid var(--border); border-radius:var(--radius-sm); outline:none; font-family:var(--font); font-size:13px; background:var(--surface2);" @click.stop />
          </div>
          <div style="max-height:220px; overflow-y:auto; padding:4px 0; background:var(--surface);">
            <div v-if="loading" class="combobox-empty">Loading...</div>
            <div v-else-if="!options.length" class="combobox-empty">No results found</div>
            <div v-for="opt in options" :key="opt.id" @click="select(opt)" class="combobox-item" :class="{ active: modelValue === opt.id }">
              {{ opt._identifier || opt.name }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  displayValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Select...' },
  fetchFn: { type: Function, required: true },
})

const emit = defineEmits(['update:modelValue', 'select'])

const open = ref(false)
const search = ref('')
const options = ref([])
const loading = ref(false)
const wrapper = ref(null)
const dropdown = ref(null)
const searchInput = ref(null)
const dropdownStyle = ref({})
let debounceTimer = null

function calcPosition() {
  if (!wrapper.value) return
  const rect = wrapper.value.getBoundingClientRect()
  const viewportH = window.innerHeight
  const dropH = 320
  const spaceBelow = viewportH - rect.bottom
  const openUpward = spaceBelow < dropH && rect.top > dropH
  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 320)}px`,
    maxWidth: '500px',
    zIndex: 9999,
    ...(openUpward
      ? { bottom: `${viewportH - rect.top + 4}px`, top: 'auto' }
      : { top: `${rect.bottom + 4}px`, bottom: 'auto' }),
  }
}

async function load(q = '') {
  loading.value = true
  try { options.value = await props.fetchFn(q) }
  finally { loading.value = false }
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    calcPosition()
    load('')
    await nextTick()
    setTimeout(() => searchInput.value?.focus(), 50)
  }
}

function onSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(search.value), 300)
}

function select(opt) {
  emit('update:modelValue', opt.id)
  emit('select', opt)
  open.value = false
  search.value = ''
}

function clear() {
  emit('update:modelValue', null)
  emit('select', null)
}

function handleOutside(e) {
  if (!open.value) return
  const inWrapper = wrapper.value?.contains(e.target)
  const inDropdown = dropdown.value?.contains(e.target)
  if (!inWrapper && !inDropdown) open.value = false
}

function handleScroll() {
  if (open.value) calcPosition()
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutside)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutside)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleScroll)
})
</script>

<style scoped>
.combobox-wrap { position: relative; width: 100%; }
.combobox-input-wrap { position: relative; display: flex; align-items: center; }
.combobox-input {
  width: 100%; height: 36px; padding: 0 12px;
  border: 1px solid var(--border, #e2e8f0); border-radius: var(--radius-sm, 8px);
  font-size: 13px; outline: none; background: var(--surface2, #f1f5f9);
  transition: border-color .15s; font-family: var(--font, sans-serif); color: var(--text-primary, #0f172a); box-sizing: border-box;
}
.combobox-wrap:hover .combobox-input { border-color: var(--accent, #14532d); }
.combobox-chevron { position: absolute; right: 10px; color: var(--text-muted, #94a3b8); cursor: pointer; transition: transform .2s; flex-shrink: 0; }
.combobox-chevron.open { transform: rotate(180deg); color: var(--accent, #14532d); }
.combobox-list {
  position: absolute; top: calc(100% + 3px); left: 0; right: 0;
  background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-sm, 8px); box-shadow: 0 4px 16px rgba(0,0,0,.1); z-index: 9999;
}
.combobox-item { padding: 8px 12px; font-size: 13px; color: var(--text-primary, #0f172a); cursor: pointer; transition: background .1s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.combobox-item:hover { background: var(--surface2, #f1f5f9); }
.combobox-item.active { background: #f0fdf4; color: #14532d; font-weight: 600; }
.combobox-empty { padding: 8px 12px; font-size: 12.5px; color: var(--text-muted, #94a3b8); font-style: italic; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>