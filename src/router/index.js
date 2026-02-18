import { createRouter, createWebHistory } from 'vue-router'
import CustomerView from '@/views/Customer.vue'
import ProductView from '@/views/Product.vue'

const routes = [
  { path: '/', redirect: '/customer' },
  { path: '/customer', component: CustomerView },
  { path: '/product', component: ProductView },
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
})

export default router