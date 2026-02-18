import { createRouter, createWebHistory } from 'vue-router'
import CustomerView from '@/views/Customer.vue'
import ProductView from '@/views/Product.vue'
import VendorView from '@/views/Vendor.vue'
import COAView from '@/views/COA.vue'

const routes = [
  { path: '/', redirect: '/customer' },
  { path: '/customer', component: CustomerView },
  { path: '/product', component: ProductView },
  { path: '/vendor', component: VendorView },
  { path: '/coa', component: COAView }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
})

export default router