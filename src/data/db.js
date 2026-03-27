// Mock Olist dataset facts used by the AI chatbot and pages

export const TABLES = {
  customers: { rows: 99441, cols: 5, pk: 'customer_id', fks: [], color: '#c0392b' },
  orders: { rows: 99441, cols: 8, pk: 'order_id', fks: ['customer_id → customers'], color: '#2980b9' },
  order_items: { rows: 112650, cols: 7, pk: null, fks: ['order_id → orders', 'product_id → products', 'seller_id → sellers'], color: '#9b59b6' },
  payments: { rows: 103886, cols: 5, pk: null, fks: ['order_id → orders'], color: '#f39c12' },
  products: { rows: 32951, cols: 9, pk: 'product_id', fks: [], color: '#27ae60' },
  sellers: { rows: 3095, cols: 4, pk: 'seller_id', fks: [], color: '#e74c3c' },
  reviews: { rows: 99224, cols: 7, pk: 'review_id', fks: ['order_id → orders'], color: '#8e44ad' },
  geolocation: { rows: 1000163, cols: 5, pk: null, fks: [], color: '#666680' },
  order_payments: { rows: 103886, cols: 5, pk: null, fks: ['order_id → orders'], color: '#f39c12' },
}

export const RELATIONSHIPS = [
  { from: 'orders', to: 'customers', via: 'customer_id', card: '1:N' },
  { from: 'order_items', to: 'orders', via: 'order_id', card: 'N:1' },
  { from: 'order_items', to: 'products', via: 'product_id', card: 'N:1' },
  { from: 'order_items', to: 'sellers', via: 'seller_id', card: 'N:1' },
  { from: 'payments', to: 'orders', via: 'order_id', card: 'N:1' },
  { from: 'reviews', to: 'orders', via: 'order_id', card: 'N:1' },
]

export const QUALITY_SCORES = {
  overall: 94.2,
  completeness: 97.1,
  consistency: 94.3,
  validity: 91.8,
  fkIntegrity: 100,
  uniqueness: 88.4,
  perTable: {
    customers: 99.0, orders: 97.1, order_items: 100,
    payments: 100, products: 92.3, sellers: 98.4,
    reviews: 74.2, geolocation: 85.1, order_payments: 100,
  }
}

// Simulated product sales data (March 2026)
export const PRODUCT_SALES = {
  2405: {
    name: 'Wireless Headphones Pro X',
    category: 'electronics',
    price: 189.90,
    salesByDate: {
      '2026-03-01': 12, '2026-03-02': 8, '2026-03-03': 15,
      '2026-03-04': 11, '2026-03-05': 9, '2026-03-06': 14,
      '2026-03-07': 18, '2026-03-08': 22, '2026-03-09': 17,
      '2026-03-10': 13, '2026-03-11': 10, '2026-03-12': 16,
      '2026-03-13': 24, '2026-03-14': 19, '2026-03-15': 21,
      '2026-03-16': 28, '2026-03-17': 25, '2026-03-18': 20,
      '2026-03-19': 14, '2026-03-20': 11, '2026-03-21': 13,
      '2026-03-22': 9,
    }
  },
  1042: {
    name: 'Kitchen Stand Mixer',
    category: 'home_appliances',
    price: 349.50,
    salesByDate: {
      '2026-03-12': 3, '2026-03-13': 5, '2026-03-14': 4,
      '2026-03-15': 7, '2026-03-16': 6, '2026-03-17': 8,
      '2026-03-18': 5,
    }
  },
  8871: {
    name: 'Yoga Mat Premium',
    category: 'sports_leisure',
    price: 79.90,
    salesByDate: {
      '2026-03-12': 18, '2026-03-13': 22, '2026-03-14': 19,
      '2026-03-15': 25, '2026-03-16': 21, '2026-03-17': 17,
      '2026-03-18': 23,
    }
  }
}

// Top categories
export const TOP_CATEGORIES = [
  { name: 'bed_bath_table', sales: 11115, revenue: 1823450 },
  { name: 'health_beauty', sales: 9670, revenue: 1456780 },
  { name: 'sports_leisure', sales: 8641, revenue: 987340 },
  { name: 'furniture_decor', sales: 8334, revenue: 2134560 },
  { name: 'computers_accessories', sales: 7827, revenue: 3456780 },
  { name: 'housewares', sales: 6964, revenue: 876540 },
  { name: 'watches_gifts', sales: 5991, revenue: 1234560 },
  { name: 'telephony', sales: 4545, revenue: 2345670 },
  { name: 'auto', sales: 4345, revenue: 987650 },
  { name: 'toys', sales: 4117, revenue: 456780 },
]

export const MONTHLY_REVENUE = [
  { month: 'Sep 25', revenue: 890000, orders: 4200 },
  { month: 'Oct 25', revenue: 1120000, orders: 5100 },
  { month: 'Nov 25', revenue: 1890000, orders: 8900 },
  { month: 'Dec 25', revenue: 2340000, orders: 11200 },
  { month: 'Jan 26', revenue: 1230000, orders: 5800 },
  { month: 'Feb 26', revenue: 1450000, orders: 6700 },
  { month: 'Mar 26', revenue: 1670000, orders: 7800 },
]

// Chatbot knowledge base — patterns + answers
export const CHATBOT_KB = {
  greetings: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],

  // Query handlers (pattern → response generator)
  handlers: [
    {
      patterns: ['sales', 'sold', 'how many', 'count', 'orders', 'product_id'],
      type: 'product_sales',
    },
    {
      patterns: ['table', 'schema', 'column', 'field', 'structure'],
      type: 'schema_info',
    },
    {
      patterns: ['quality', 'null', 'missing', 'completeness', 'score'],
      type: 'quality_info',
    },
    {
      patterns: ['relationship', 'foreign key', 'fk', 'join', 'link'],
      type: 'relationship_info',
    },
    {
      patterns: ['revenue', 'gmv', 'total', 'amount', 'payment'],
      type: 'revenue_info',
    },
    {
      patterns: ['category', 'top', 'best', 'popular', 'trending'],
      type: 'category_info',
    },
    {
      patterns: ['customer', 'buyer', 'user'],
      type: 'customer_info',
    },
    {
      patterns: ['seller', 'vendor', 'supplier'],
      type: 'seller_info',
    },
    {
      patterns: ['help', 'what can you', 'example', 'query'],
      type: 'help',
    },
  ]
}

// ─── D3 ER Diagram data ──────────────────────────────────────────────────────
export const ER_NODES = []

export const ER_LINKS = []