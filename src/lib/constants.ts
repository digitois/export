export const APP_NAME = 'Export OS';
export const APP_DESCRIPTION =
  'All-in-one SaaS platform for Indian exporters to build websites, manage leads, generate quotations and invoices.';

export const MEMBER_ROLES = ['owner', 'admin', 'manager', 'employee'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const LEAD_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'manual', label: 'Manual' },
  { value: 'trade_fair', label: 'Trade Fair' },
  { value: 'indiamart', label: 'IndiaMART' },
  { value: 'alibaba', label: 'Alibaba' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'referral', label: 'Referral' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' }
] as const;

export const LEAD_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
] as const;

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'quotation_sent', label: 'Quotation Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' }
] as const;

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] as const;

export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' }
] as const;

export const INVOICE_TYPES = [
  { value: 'commercial', label: 'Commercial Invoice' },
  { value: 'proforma', label: 'Proforma Invoice' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' }
] as const;

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'void', label: 'Void' }
] as const;

export const SHIPMENT_MODES = [
  { value: 'sea', label: 'Sea' },
  { value: 'air', label: 'Air' },
  { value: 'road', label: 'Road' },
  { value: 'rail', label: 'Rail' },
  { value: 'courier', label: 'Courier' }
] as const;

export const SHIPMENT_STATUSES = [
  { value: 'booked', label: 'Booked' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'at_customs', label: 'At Customs' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'held', label: 'Held' },
  { value: 'cancelled', label: 'Cancelled' }
] as const;

export const COO_TYPES = [
  { value: 'non_preferential', label: 'Non-Preferential CoO' },
  { value: 'preferential', label: 'Preferential CoO' },
  { value: 'gst', label: 'GST CoO' },
  { value: 'wpc', label: 'WPC (Woolmark)' },
  { value: 'other', label: 'Other' }
] as const;

export const EXPENSE_CATEGORIES = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'freight', label: 'Freight & Logistics' },
  { value: 'customs', label: 'Customs & Duties' },
  { value: 'warehousing', label: 'Warehousing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'travel', label: 'Travel' },
  { value: 'office', label: 'Office & Admin' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'commission', label: 'Commission' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'bank_charges', label: 'Bank Charges' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' }
] as const;

export const STOCK_MOVEMENT_TYPES = [
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'adjustment', label: 'Adjustment' }
] as const;

export const PURCHASE_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' }
] as const;

export const DOCUMENT_TYPES = [
  { value: 'iec', label: 'IEC' },
  { value: 'gst', label: 'GST' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'packing_list', label: 'Packing List' },
  { value: 'shipping', label: 'Shipping Documents' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' }
] as const;

export const WEBSITE_THEMES = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold' }
] as const;

export const EMAIL_CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' }
] as const;

export const AI_CAPABILITIES = [
  {
    id: 'hs_code',
    title: 'HS Code Suggestion',
    description: 'Find the correct HS code for your product',
    icon: 'barcode'
  },
  {
    id: 'documentation',
    title: 'Export Documentation',
    description: 'Guidance on export paperwork and compliance',
    icon: 'file-text'
  },
  {
    id: 'quotation',
    title: 'Quotation Assistant',
    description: 'Draft professional export quotations',
    icon: 'receipt'
  },
  {
    id: 'email_drafting',
    title: 'Email Drafting',
    description: 'Write buyer emails, follow-ups and proposals',
    icon: 'mail'
  },
  {
    id: 'product_description',
    title: 'Product Description',
    description: 'SEO-friendly descriptions for your products',
    icon: 'package'
  },
  {
    id: 'blog',
    title: 'Blog Creation',
    description: 'Generate SEO-optimized blog content',
    icon: 'file-pen'
  },
  {
    id: 'market_suggestions',
    title: 'Market Suggestions',
    description: 'Identify target markets for your products',
    icon: 'globe'
  }
] as const;

export const COUNTRIES = [
  'United States', 'United Arab Emirates', 'United Kingdom', 'Germany', 'France',
  'Italy', 'Spain', 'Netherlands', 'Australia', 'Canada', 'Saudi Arabia', 'Qatar',
  'Kuwait', 'Oman', 'Bahrain', 'Egypt', 'South Africa', 'Kenya', 'Nigeria',
  'Bangladesh', 'Sri Lanka', 'Nepal', 'Singapore', 'Malaysia', 'Vietnam',
  'Japan', 'South Korea', 'China', 'Brazil', 'Mexico', 'Russia', 'Turkey',
  'Poland', 'Sweden', 'Denmark', 'Norway', 'Finland', 'New Zealand', 'Israel', 'Thailand'
].sort();

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY'];

export const DEFAULT_ORG_LIMITS = {
  users: 1,
  products: 50,
  leads: 500,
  blog_posts: 10,
  email_credits: 500,
  ai_credits: 2000,
  storage_gb: 5
};

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/leads', label: 'Leads', icon: 'users' },
  { href: '/quotations', label: 'Quotations', icon: 'receipt-text' },
  { href: '/invoices', label: 'Invoices', icon: 'file-text' },
  { href: '/products', label: 'Products', icon: 'package' },
  { href: '/buyers', label: 'Buyers', icon: 'contact' },
  { href: '/documents', label: 'Documents', icon: 'folder' },
  { href: '/blog', label: 'Blog', icon: 'newspaper' },
  { href: '/assistant', label: 'AI Assistant', icon: 'sparkles' },
  { href: '/email', label: 'Email Marketing', icon: 'send' },
  { href: '/analytics', label: 'Analytics', icon: 'bar-chart' },
  { href: '/website', label: 'Website', icon: 'globe' },
  { href: '/company', label: 'Company Profile', icon: 'building' },
  { href: '/team', label: 'Team', icon: 'user-cog' },
  { href: '/settings', label: 'Settings', icon: 'settings' }
];
