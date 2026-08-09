import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional()
});

export const signupSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(120),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email')
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name is required').max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only')
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['owner', 'admin', 'manager', 'employee'])
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'employee'])
});

export const companyProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  logoUrl: z.string().url().optional().or(z.literal('')).nullable(),
  gstNumber: z.string().optional().nullable(),
  iecNumber: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  yearEstablished: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  businessType: z.string().optional().nullable(),
  employeeCount: z.string().optional().nullable(),
  factoryAddress: z.string().optional().nullable(),
  certifications: z.array(z.string()).default([]),
  exportMarkets: z.array(z.string()).default([]),
  productCategories: z.array(z.string()).default([]),
  socialLinks: z.record(z.string()).default({}),
  brochureUrl: z.string().url().optional().or(z.literal('')).optional(),
  tagline: z.string().optional().nullable(),
  about: z.string().optional().nullable()
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().optional().nullable(),
  hsnCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  technicalSpecifications: z.record(z.string()).default({}),
  packagingDetails: z.string().optional().nullable(),
  moq: z.string().optional().nullable(),
  leadTime: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  unit: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        sku: z.string().optional().nullable(),
        price: z.coerce.number().min(0).optional().nullable(),
        attributes: z.record(z.string()).default({}),
        isDefault: z.boolean().default(false)
      })
    )
    .default([]),
  media: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        type: z.enum(['image', 'video']).default('image'),
        url: z.string().url(),
        altText: z.string().optional().nullable()
      })
    )
    .default([])
});

export const categorySchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable()
});

export const leadSchema = z.object({
  companyName: z.string().optional().nullable(),
  buyerName: z.string().min(1, 'Buyer name is required').max(200),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  productInterested: z.string().optional().nullable(),
  leadValue: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  source: z
    .enum(['website', 'manual', 'trade_fair', 'indiamart', 'alibaba', 'linkedin', 'referral', 'email', 'other'])
    .default('manual'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['new', 'contacted', 'qualified', 'quotation_sent', 'negotiation', 'won', 'lost']).default('new'),
  assignedTo: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const leadActivitySchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(['note', 'call', 'email', 'meeting', 'follow_up', 'status_change', 'assignment']).default('note'),
  description: z.string().min(1).max(5000),
  dueAt: z.string().datetime().optional().nullable()
});

export const quotationItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(1000),
  hsnCode: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.0001),
  unit: z.string().optional().nullable(),
  unitPrice: z.coerce.number().min(0),
  amount: z.coerce.number().min(0)
});

export const quotationSchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  buyerId: z.string().uuid().optional().nullable(),
  buyerName: z.string().min(1, 'Buyer name is required').max(200),
  buyerCompany: z.string().optional().nullable(),
  buyerEmail: z.string().email().optional().or(z.literal('')).nullable(),
  buyerPhone: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  buyerCountry: z.string().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  incoterm: z.enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']).default('FOB'),
  paymentTerms: z.string().optional().nullable(),
  validityDays: z.coerce.number().int().min(1).max(365).default(30),
  discount: z.coerce.number().min(0).default(0),
  freight: z.coerce.number().min(0).default(0),
  insurance: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, 'Add at least one item')
});

export const invoiceSchema = z.object({
  invoiceType: z.enum(['commercial', 'proforma', 'credit_note', 'debit_note']).default('commercial'),
  quotationId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  buyerId: z.string().uuid().optional().nullable(),
  buyerName: z.string().min(1, 'Buyer name is required').max(200),
  buyerCompany: z.string().optional().nullable(),
  buyerEmail: z.string().email().optional().or(z.literal('')).nullable(),
  buyerAddress: z.string().optional().nullable(),
  buyerCountry: z.string().optional().nullable(),
  invoiceDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  dueDate: z.string().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  paymentTerms: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  shippingCharges: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        description: z.string().min(1).max(1000),
        hsnCode: z.string().optional().nullable(),
        quantity: z.coerce.number().min(0.0001),
        unit: z.string().optional().nullable(),
        unitPrice: z.coerce.number().min(0),
        amount: z.coerce.number().min(0)
      })
    )
    .min(1, 'Add at least one item')
});

export const buyerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  productsInterested: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([])
});

export const documentSchema = z.object({
  name: z.string().min(1).max(200),
  documentType: z
    .enum(['iec', 'gst', 'certificate', 'invoice', 'packing_list', 'shipping', 'contract', 'other'])
    .default('other'),
  description: z.string().optional().nullable(),
  folderId: z.string().uuid().optional().nullable()
});

export const blogPostSchema = z.object({
  title: z.string().min(1).max(300),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  keyword: z.string().optional().nullable(),
  targetCountry: z.string().optional().nullable(),
  targetProduct: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
  scheduledFor: z.string().datetime().optional().nullable()
});

export const blogGenerateSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200),
  targetCountry: z.string().optional().nullable(),
  targetProduct: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  tone: z.string().default('professional')
});

export const aiChatSchema = z.object({
  conversationId: z.string().uuid().optional().nullable(),
  message: z.string().min(1).max(20000),
  capability: z.string().optional().nullable()
});

export const emailCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  listId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable()
});

export const contactListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable()
});

export const emailContactSchema = z.object({
  listId: z.string().uuid().optional().nullable(),
  email: z.string().email(),
  name: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  country: z.string().optional().nullable()
});

export const websiteSettingsSchema = z.object({
  theme: z.enum(['modern', 'classic', 'minimal', 'bold', 'editorial', 'coastal', 'sunset', 'forest', 'steel']).default('modern'),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color').default('#0f172a'),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color').default('#0284c7'),
  heroHeading: z.string().optional().nullable(),
  heroSubheading: z.string().optional().nullable(),
  heroEyebrow: z.string().optional().nullable(),
  heroImageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  announcementBar: z.string().optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  enableProductSection: z.boolean().optional(),
  enableAboutSection: z.boolean().optional(),
  enableBlogSection: z.boolean().optional(),
  showInquiryForm: z.boolean().default(true),
  contactEmail: z.string().email().optional().or(z.literal('')).nullable(),
  contactPhone: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  analyticsId: z.string().optional().nullable(),
  customFooter: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  blocks: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        props: z.record(z.unknown()).default({})
      })
    )
    .default([])
});

export const shipmentSchema = z.object({
  buyerId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  quotationId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  buyerName: z.string().optional().nullable(),
  buyerCompany: z.string().optional().nullable(),
  buyerCountry: z.string().optional().nullable(),
  mode: z.enum(['air', 'sea', 'road', 'rail', 'courier']).default('sea'),
  incoterm: z.enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']).default('FOB'),
  originPort: z.string().optional().nullable(),
  destinationPort: z.string().optional().nullable(),
  containerNo: z.string().optional().nullable(),
  blAwbNo: z.string().optional().nullable(),
  carrier: z.string().optional().nullable(),
  vessel: z.string().optional().nullable(),
  etd: z.string().optional().nullable(),
  eta: z.string().optional().nullable(),
  actualDeparture: z.string().optional().nullable(),
  actualArrival: z.string().optional().nullable(),
  status: z
    .enum(['booked', 'in_transit', 'at_customs', 'cleared', 'delivered', 'held', 'cancelled'])
    .default('booked'),
  cargoDescription: z.string().optional().nullable(),
  weightKg: z.coerce.number().min(0).optional().nullable(),
  volumeCbm: z.coerce.number().min(0).optional().nullable(),
  noOfPackages: z.coerce.number().int().min(0).default(0),
  currency: z.string().length(3).default('USD'),
  freightCharges: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable()
});

export const shipmentEventSchema = z.object({
  shipmentId: z.string().uuid(),
  stage: z.enum(['booked', 'in_transit', 'at_customs', 'cleared', 'delivered', 'held', 'cancelled']),
  note: z.string().max(2000).optional().nullable(),
  occurredAt: z.string().datetime().optional().nullable()
});

export const landedCostSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  currency: z.string().length(3).default('USD'),
  productValue: z.coerce.number().min(0),
  freight: z.coerce.number().min(0).default(0),
  insurance: z.coerce.number().min(0).default(0),
  dutyRate: z.coerce.number().min(0).max(100).default(0),
  otherCharges: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().min(0).default(1),
  incoterm: z
    .enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'])
    .default('FOB'),
  notes: z.string().optional().nullable()
});

export const packingListItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(1000),
  hsnCode: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.0001),
  unit: z.string().optional().nullable(),
  packageCount: z.coerce.number().int().min(1).default(1),
  weightKg: z.coerce.number().min(0).default(0),
  volumeCbm: z.coerce.number().min(0).default(0)
});

export const packingListSchema = z.object({
  shipmentId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  buyerName: z.string().min(1, 'Buyer name is required').max(200),
  buyerCompany: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  buyerCountry: z.string().optional().nullable(),
  containerNo: z.string().optional().nullable(),
  blAwbNo: z.string().optional().nullable(),
  portOfLoading: z.string().optional().nullable(),
  portOfDischarge: z.string().optional().nullable(),
  vessel: z.string().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().optional().nullable(),
  items: z.array(packingListItemSchema).min(1, 'Add at least one item')
});

export const certificateItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(1000),
  hsnCode: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.0001),
  unit: z.string().optional().nullable(),
  unitValue: z.coerce.number().min(0).default(0),
  grossWeightKg: z.coerce.number().min(0).default(0),
  netWeightKg: z.coerce.number().min(0).default(0)
});

export const certificateOfOriginSchema = z.object({
  certificateType: z
    .enum(['non_preferential', 'preferential', 'gst', 'wpc', 'other'])
    .default('non_preferential'),
  shipmentId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  buyerName: z.string().min(1, 'Buyer name is required').max(200),
  buyerCompany: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  buyerCountry: z.string().optional().nullable(),
  exporterIec: z.string().optional().nullable(),
  countryOfOrigin: z.string().default('India'),
  countryOfDestination: z.string().optional().nullable(),
  issuedDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  notes: z.string().optional().nullable(),
  items: z.array(certificateItemSchema).min(1, 'Add at least one item')
});

export const expenseSchema = z.object({
  category: z
    .enum([
      'raw_materials', 'packaging', 'freight', 'customs', 'warehousing',
      'marketing', 'travel', 'office', 'salaries', 'commission',
      'insurance', 'bank_charges', 'utilities', 'other'
    ])
    .default('other'),
  vendor: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.0001, 'Enter an amount'),
  currency: z.string().length(3).default('USD'),
  expenseDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().url().optional().or(z.literal('')).nullable()
});

export const warehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required').max(200),
  location: z.string().optional().nullable(),
  isDefault: z.boolean().default(false)
});

export const stockMovementSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.coerce.number().min(0.0001),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  occurredAt: z.string().default(() => new Date().toISOString())
});

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  notes: z.string().optional().nullable()
});

export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(1000),
  hsnCode: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.0001),
  unit: z.string().optional().nullable(),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(0)
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  supplierName: z.string().min(1, 'Supplier name is required').max(200),
  supplierCompany: z.string().optional().nullable(),
  supplierAddress: z.string().optional().nullable(),
  supplierCountry: z.string().optional().nullable(),
  warehouseId: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  orderDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  expectedDate: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  shippingCharges: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'Add at least one item')
});

export const supportTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  category: z.string().default('general'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
});

export const supportReplySchema = z.object({
  body: z.string().min(1).max(10000)
});

export const platformPlanSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  priceMonthly: z.coerce.number().min(0).default(0),
  priceAnnual: z.coerce.number().min(0).default(0),
  currency: z.string().length(3).default('INR'),
  features: z.array(z.string()).default([]),
  limits: z.record(z.unknown()).default({}),
  razorpayPlanIdMonthly: z.string().optional().nullable(),
  razorpayPlanIdAnnual: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0)
});

export const featureFlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean().default(true),
  description: z.string().optional().nullable()
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().optional().nullable(),
  level: z.string().default('info'),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable()
});

export const publicInquirySchema = z.object({
  organizationId: z.string().uuid(),
  companyName: z.string().max(200).optional().nullable(),
  buyerName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  productInterested: z.string().optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
  source: z.literal('website')
});
