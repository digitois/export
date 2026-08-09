import type { SiteBlock, SiteBlockType } from './blocks';
import type { ThemeId } from './themes';

/**
 * Template-first website builder catalog.
 *
 * Each template pairs a theme with a fully-populated, industry-appropriate
 * ordered set of section blocks and realistic starter copy. Templates store
 * blocks WITHOUT ids; `instantiateTemplate()` assigns fresh UUIDs on selection
 * so the same template can seed many tenants without id collisions.
 */

export type Industry =
  | 'food_agro'
  | 'spices'
  | 'scrap_metal'
  | 'machinery'
  | 'textiles_leather'
  | 'handicrafts'
  | 'chemicals'
  | 'general';

export interface IndustryMeta {
  id: Industry;
  label: string;
  blurb: string;
  /** lucide icon name, resolved by the gallery component */
  icon: string;
}

export interface TemplateBlock {
  type: SiteBlockType;
  props: Record<string, unknown>;
}

export interface SiteTemplate {
  id: string;
  name: string;
  industry: Industry;
  description: string;
  themeId: ThemeId;
  primaryColor: string;
  accentColor: string;
  blocks: TemplateBlock[];
}

export const INDUSTRY_META: IndustryMeta[] = [
  { id: 'food_agro', label: 'Food & Agro', blurb: 'Grains, pulses, produce, processed foods and agricultural commodities.', icon: 'Wheat' },
  { id: 'spices', label: 'Spices & Condiments', blurb: 'Whole and ground spices, blends, oleoresins and seasonings.', icon: 'Flame' },
  { id: 'scrap_metal', label: 'Scrap & Metals', blurb: 'Ferrous and non-ferrous scrap, ingots, billets and recycled metal.', icon: 'Recycle' },
  { id: 'machinery', label: 'Machinery & Engineering', blurb: 'Industrial machines, components, tooling and engineered goods.', icon: 'Cog' },
  { id: 'textiles_leather', label: 'Textiles & Leather', blurb: 'Fabrics, apparel, home textiles, finished leather and goods.', icon: 'Shirt' },
  { id: 'handicrafts', label: 'Handicrafts & Decor', blurb: 'Artisan handicrafts, home decor, furnishings and giftware.', icon: 'Palette' },
  { id: 'chemicals', label: 'Chemicals & Pharma', blurb: 'Industrial chemicals, dyes, intermediates and pharma inputs.', icon: 'FlaskConical' },
  { id: 'general', label: 'General Trade', blurb: 'A clean, flexible starting point for any export business.', icon: 'Package' }
];

export function industryLabel(id: string | null | undefined): string {
  return INDUSTRY_META.find((i) => i.id === id)?.label ?? 'General Trade';
}

function feat(icon: string, title: string, description: string) {
  return { icon, title, description };
}
function stat(value: string, label: string) {
  return { value, label };
}
function quote(q: string, author: string, role: string, company: string) {
  return { quote: q, author, role, company };
}

const CONTACT: TemplateBlock = {
  type: 'contact',
  props: { title: 'Request an Export Quote', subtitle: 'Share your requirement and destination port — we respond within 24 hours.', showForm: true }
};

export const SITE_TEMPLATES: Record<string, SiteTemplate> = {
  spices_heritage: {
    id: 'spices_heritage',
    name: 'Spice Route Heritage',
    industry: 'spices',
    description: 'Warm, premium look for spice and condiment exporters with provenance cues.',
    themeId: 'sunset',
    primaryColor: '#7c2d12',
    accentColor: '#ea580c',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Exporting Since 1992', heading: 'Single-Origin Indian Spices, Graded for the World', subheading: 'FSSAI & ISO 22000 certified whole and ground spices — steam-sterilized, lab-tested, shipped FOB/CIF to 45+ countries.', align: 'left', overlay: true, ctaLabel: 'Request a Quote', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('30+', 'Years Exporting'), stat('45', 'Countries Served'), stat('12', 'Spice Varieties'), stat('99.2%', 'On-time Shipments')] } },
      { type: 'features', props: { title: 'Why Buyers Choose Us', subtitle: 'From farm-gate sourcing to port documentation.', items: [feat('Leaf', 'Single-Origin Sourcing', 'Direct from Kerala, Rajasthan and Andhra farming clusters with full traceability.'), feat('ShieldCheck', 'Certified & Tested', 'FSSAI, ISO 22000, steam sterilization and third-party ASTA lab reports per lot.'), feat('Truck', 'Export-Ready Logistics', 'FOB, CIF and DDP with moisture-controlled packing and phytosanitary docs.')] } },
      { type: 'products', props: { title: 'Featured Spices', subtitle: 'A selection from our export catalog.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'Rooted in India’s Spice Belt', body: 'We work with 400+ contract farmers to source, clean, grade and pack spices to exact buyer specifications. Our facility runs steam sterilization, metal detection and moisture control so every consignment clears customs and QC on arrival.' } },
      { type: 'testimonials', props: { title: 'Trusted by Global Buyers', items: [quote('Consistent grade and clean documentation shipment after shipment.', 'Maria Gonzalez', 'Procurement Director', 'Iberia Foods'), quote('Their ASTA reports and steam sterilization made our import clearance effortless.', 'David Chen', 'Import Manager', 'Pacific Spice Co.')] } },
      { type: 'cta', props: { heading: 'Ready to source premium spices?', subheading: 'Get a graded sample and quote within 24 hours.', label: 'Request a Quote', href: '/contact' } },
      CONTACT
    ]
  },
  agro_commodities: {
    id: 'agro_commodities',
    name: 'Agro Commodities Trading',
    industry: 'food_agro',
    description: 'Clean, trust-first layout for grains, pulses and agricultural commodity exporters.',
    themeId: 'forest',
    primaryColor: '#14532d',
    accentColor: '#65a30d',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Bulk Agri Exporter', heading: 'Reliable Supply of Grains, Pulses & Oilseeds', subheading: 'Container and bulk-vessel quantities with pre-shipment inspection, fumigation and full export documentation.', align: 'center', overlay: true, ctaLabel: 'Get Bulk Pricing', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('500K MT', 'Annual Volume'), stat('60+', 'Export Destinations'), stat('25', 'Commodities'), stat('24h', 'Quote Turnaround')] } },
      { type: 'features', props: { title: 'Built for Bulk Trade', subtitle: '', items: [feat('PackageCheck', 'Consistent Specs', 'Sortex-cleaned, moisture-controlled and graded to contract quality.'), feat('ShieldCheck', 'Inspection & Fumigation', 'SGS/pre-shipment inspection, fumigation and phytosanitary certificates.'), feat('Globe', 'Global Logistics', 'Bulk vessel and containerized shipments on FOB, CFR and CIF terms.')] } },
      { type: 'products', props: { title: 'Commodities We Export', subtitle: 'Grains, pulses, oilseeds and more.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'A Dependable Sourcing Partner', body: 'From procurement at APMC mandis to port-side warehousing, we manage the full chain so importers get consistent quality, honest weights and clean paperwork on every consignment.' } },
      { type: 'cta', props: { heading: 'Need a bulk agri quote?', subheading: 'Tell us the commodity, volume and destination port.', label: 'Get Bulk Pricing', href: '/contact' } },
      CONTACT
    ]
  },
  scrap_trader: {
    id: 'scrap_trader',
    name: 'Metal Scrap Trader',
    industry: 'scrap_metal',
    description: 'Industrial, no-nonsense layout for ferrous and non-ferrous scrap exporters.',
    themeId: 'steel',
    primaryColor: '#1f2937',
    accentColor: '#f59e0b',
    blocks: [
      { type: 'hero', props: { eyebrow: 'ISRI-Graded Scrap', heading: 'Ferrous & Non-Ferrous Scrap, Shipped by the Container', subheading: 'HMS 1&2, shredded, copper, aluminium and more — radiation-tested, ISRI-graded and documented for smooth customs clearance.', align: 'left', overlay: true, ctaLabel: 'Request Pricing', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('200+', 'Containers / Month'), stat('35', 'Import Markets'), stat('ISRI', 'Graded Material'), stat('100%', 'Radiation Tested')] } },
      { type: 'features', props: { title: 'Why Mills Trust Us', subtitle: '', items: [feat('Recycle', 'ISRI-Grade Sorting', 'Material sorted and baled to ISRI specifications — HMS, shred, copper, brass, aluminium.'), feat('ShieldCheck', 'Radiation & Inspection', 'Every load radiation-tested with pre-shipment inspection and weighbridge certificates.'), feat('Truck', 'Container Logistics', 'Reliable container supply on FOB/CFR with full LC and documentation support.')] } },
      { type: 'products', props: { title: 'Grades We Supply', subtitle: 'Ferrous and non-ferrous scrap categories.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'A Yard Built for Export Volume', body: 'Our processing yards handle sorting, shearing and baling at scale. We supply steel mills, foundries and smelters with consistently graded material and the inspection paperwork their ports require.' } },
      { type: 'testimonials', props: { title: 'What Buyers Say', items: [quote('Grades are honest and the radiation certs are always in order.', 'Ahmed Al-Rashid', 'Purchase Head', 'Gulf Steel Mills'), quote('Consistent container supply kept our furnace running through peak season.', 'Sofia Rossi', 'Sourcing Lead', 'Adriatic Metals')] } },
      { type: 'cta', props: { heading: 'Need graded scrap on time?', subheading: 'Send your grade, tonnage and destination for a live quote.', label: 'Request Pricing', href: '/contact' } },
      CONTACT
    ]
  },
  metals_alloys: {
    id: 'metals_alloys',
    name: 'Steel & Alloys Supplier',
    industry: 'scrap_metal',
    description: 'Spec-driven layout for ingots, billets, coils and finished metal products.',
    themeId: 'steel',
    primaryColor: '#111827',
    accentColor: '#2563eb',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Mill-Certified Metals', heading: 'Ingots, Billets, Coils & Alloys to Spec', subheading: 'Mill test certificates on every heat. Consistent chemistry, tight tolerances and export packing for global buyers.', align: 'left', overlay: true, ctaLabel: 'Get a Quote', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('50+', 'Alloy Grades'), stat('40', 'Countries'), stat('MTC', 'On Every Heat'), stat('15+', 'Years')] } },
      { type: 'features', props: { title: 'Engineered for Reliability', subtitle: '', items: [feat('ShieldCheck', 'Mill Test Certificates', 'Full chemistry and mechanical MTC per heat, EN 10204 3.1 available.'), feat('Factory', 'Tight Tolerances', 'Dimensional accuracy and surface finish held to international standards.'), feat('Globe', 'Export Packing', 'Sea-worthy packing, VCI protection and CIF/FOB shipping worldwide.')] } },
      { type: 'products', props: { title: 'Product Range', subtitle: 'From billets to finished coils.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'Metallurgy You Can Document', body: 'We supply mills, fabricators and stockists with certified metal products backed by full traceability from heat number to shipment.' } },
      { type: 'cta', props: { heading: 'Have a spec sheet?', subheading: 'Send drawings or grades and we’ll quote against them.', label: 'Get a Quote', href: '/contact' } },
      CONTACT
    ]
  },
  machinery_industrial: {
    id: 'machinery_industrial',
    name: 'Industrial Machinery',
    industry: 'machinery',
    description: 'Confident, engineering-led layout for machine and equipment exporters.',
    themeId: 'steel',
    primaryColor: '#1e293b',
    accentColor: '#0ea5e9',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Engineered in India', heading: 'Industrial Machinery Built to Run for Decades', subheading: 'CE-marked machines with global spare-part support, commissioning assistance and multilingual documentation.', align: 'left', overlay: true, ctaLabel: 'Request Specifications', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('1,000+', 'Machines Shipped'), stat('50', 'Countries'), stat('CE', 'Certified'), stat('10yr', 'Spares Support')] } },
      { type: 'features', props: { title: 'Why Engineers Specify Us', subtitle: '', items: [feat('Cog', 'Precision Engineering', 'Machined to tight tolerances with premium components and rigorous QA.'), feat('ShieldCheck', 'CE & Safety Compliant', 'CE marking, safety guarding and IEC-compliant electricals.'), feat('Handshake', 'Commissioning & Support', 'Installation guidance, operator training and lifetime spare-part supply.')] } },
      { type: 'products', props: { title: 'Machine Range', subtitle: 'Configurable for your production line.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'From Drawing Board to Shop Floor', body: 'Our engineering team designs, builds and tests each machine before dispatch. Buyers get FAT reports, wiring diagrams and a spare-parts catalogue with every unit.' } },
      { type: 'testimonials', props: { title: 'Trusted on the Floor', items: [quote('Commissioned quickly and the spare-part support is genuinely reliable.', 'Klaus Berger', 'Plant Manager', 'Rhein Manufacturing'), quote('Build quality matched European machines at a far better landed cost.', 'Fatima Noor', 'Operations Director', 'Crescent Industries')] } },
      { type: 'cta', props: { heading: 'Planning a new line?', subheading: 'Share your output targets and we’ll propose a configuration.', label: 'Request Specifications', href: '/contact' } },
      CONTACT
    ]
  },
  textiles_mill: {
    id: 'textiles_mill',
    name: 'Textile & Apparel Mill',
    industry: 'textiles_leather',
    description: 'Soft, editorial layout for fabric, garment and home-textile exporters.',
    themeId: 'editorial',
    primaryColor: '#3b0764',
    accentColor: '#c026d3',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Ethically Made in India', heading: 'Fabrics & Apparel, Finished to Your Tech Pack', subheading: 'OEKO-TEX and GOTS certified cotton, blends and knits — private-label manufacturing with reliable MOQs and lead times.', align: 'split', overlay: true, ctaLabel: 'Request Samples', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('2M+', 'Pieces / Year'), stat('40', 'Buyer Countries'), stat('GOTS', 'Certified'), stat('45d', 'Avg Lead Time')] } },
      { type: 'features', props: { title: 'A Manufacturing Partner, Not Just a Supplier', subtitle: '', items: [feat('BadgeCheck', 'Certified Sustainable', 'GOTS, OEKO-TEX and BSCI audited facilities with ethical labour compliance.'), feat('Package', 'Private Label', 'Tech-pack manufacturing, custom labelling, packing and barcoding.'), feat('Truck', 'On-Time Delivery', 'Dependable lead times with inline QC and AQL final inspection.')] } },
      { type: 'products', props: { title: 'Product Categories', subtitle: 'Woven, knits, home textiles and garments.', limit: 6, columns: 3 } },
      { type: 'gallery', props: { title: 'From Our Floor', images: [] } },
      { type: 'about', props: { title: 'Craft, Compliance & Consistency', body: 'From yarn to finished garment, we control quality at every stage. Buyers get sampling support, compliance documentation and consistent bulk production run after run.' } },
      { type: 'cta', props: { heading: 'Have a tech pack ready?', subheading: 'Send it over for sampling and a costed quote.', label: 'Request Samples', href: '/contact' } },
      CONTACT
    ]
  },
  leather_goods: {
    id: 'leather_goods',
    name: 'Leather & Goods',
    industry: 'textiles_leather',
    description: 'Rich, premium layout for finished leather and leather-goods exporters.',
    themeId: 'classic',
    primaryColor: '#3f2d1c',
    accentColor: '#b45309',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Full-Grain Craftsmanship', heading: 'Finished Leather & Handcrafted Goods', subheading: 'Chrome and vegetable-tanned hides, bags, footwear and accessories — made to spec for global brands.', align: 'left', overlay: true, ctaLabel: 'Request a Catalogue', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('20+', 'Years'), stat('30', 'Export Markets'), stat('LWG', 'Rated Tannery'), stat('5,000', 'Units / Month')] } },
      { type: 'features', props: { title: 'Why Brands Partner With Us', subtitle: '', items: [feat('BadgeCheck', 'LWG-Rated Tanning', 'Leather Working Group rated processing with traceable, responsible sourcing.'), feat('Handshake', 'Made to Brand Spec', 'Custom finishes, hardware and packaging for private-label collections.'), feat('Globe', 'Export Experience', 'Full documentation and reliable CIF/FOB shipping to global buyers.')] } },
      { type: 'products', props: { title: 'Our Range', subtitle: 'Leather, bags, footwear and accessories.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'Tannery to Finished Product', body: 'We combine an LWG-rated tannery with skilled artisan workshops, giving brands a single accountable partner from raw hide to finished, boxed goods.' } },
      { type: 'cta', props: { heading: 'Building a leather collection?', subheading: 'Share your designs and target price point.', label: 'Request a Catalogue', href: '/contact' } },
      CONTACT
    ]
  },
  handicrafts_artisan: {
    id: 'handicrafts_artisan',
    name: 'Artisan Handicrafts',
    industry: 'handicrafts',
    description: 'Warm, story-led layout for handicraft, decor and giftware exporters.',
    themeId: 'coastal',
    primaryColor: '#0e7490',
    accentColor: '#f59e0b',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Handmade by Indian Artisans', heading: 'Handicrafts & Home Decor with a Story', subheading: 'Hand-crafted brass, wood, ceramics and textiles — export-packed for retailers, importers and gifting brands.', align: 'center', overlay: true, ctaLabel: 'Browse Collections', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('300+', 'Artisan Partners'), stat('35', 'Countries'), stat('Handmade', 'Every Piece'), stat('Low MOQ', 'Friendly')] } },
      { type: 'features', props: { title: 'What Makes Us Different', subtitle: '', items: [feat('Palette', 'Genuinely Handmade', 'Sourced from artisan clusters preserving traditional Indian craft.'), feat('Package', 'Retail-Ready Packing', 'Gift-boxed, barcoded and export-packed to survive the journey.'), feat('Handshake', 'Fair & Traceable', 'Direct artisan partnerships with fair wages and transparent sourcing.')] } },
      { type: 'products', props: { title: 'Collections', subtitle: 'Decor, tableware, textiles and gifts.', limit: 6, columns: 3 } },
      { type: 'gallery', props: { title: 'The Craft', images: [] } },
      { type: 'about', props: { title: 'Craft That Carries a Culture', body: 'Every product is made by hand in artisan communities across India. We handle design collaboration, quality control and export logistics so buyers receive retail-ready goods on time.' } },
      { type: 'cta', props: { heading: 'Curating a collection?', subheading: 'Tell us your theme and we’ll send a lookbook.', label: 'Browse Collections', href: '/contact' } },
      CONTACT
    ]
  },
  chemicals_industrial: {
    id: 'chemicals_industrial',
    name: 'Industrial Chemicals',
    industry: 'chemicals',
    description: 'Precise, compliance-forward layout for chemical and intermediate exporters.',
    themeId: 'modern',
    primaryColor: '#0f172a',
    accentColor: '#0891b2',
    blocks: [
      { type: 'hero', props: { eyebrow: 'REACH & ISO Compliant', heading: 'Industrial Chemicals & Intermediates, Documented to Spec', subheading: 'Consistent purity with CoA, MSDS and REACH support — packed and shipped under IMDG-compliant hazmat protocols.', align: 'left', overlay: true, ctaLabel: 'Request CoA & Quote', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('99.9%', 'Typical Purity'), stat('40+', 'Countries'), stat('CoA', 'Every Batch'), stat('ISO', '9001 Certified')] } },
      { type: 'features', props: { title: 'Chemistry You Can Rely On', subtitle: '', items: [feat('FlaskConical', 'Consistent Purity', 'Batch-tested chemistry with Certificate of Analysis on every lot.'), feat('ShieldCheck', 'Compliant Documentation', 'MSDS, REACH support and IMDG-compliant hazmat packing and labelling.'), feat('Truck', 'Safe Global Shipping', 'DG-certified freight forwarding with correct UN packaging.')] } },
      { type: 'products', props: { title: 'Product Portfolio', subtitle: 'Chemicals, dyes and intermediates.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'Manufacturing With Documentation Discipline', body: 'Our ISO-certified facility pairs consistent chemistry with the paperwork importers need — CoA, MSDS and regulatory support that clears customs cleanly.' } },
      { type: 'faq', props: { title: 'Common Questions', items: [{ q: 'Do you provide CoA and MSDS?', a: 'Yes — Certificate of Analysis per batch and MSDS with every product.' }, { q: 'Can you handle hazmat shipping?', a: 'We ship under IMDG with UN-approved packaging and DG-certified forwarders.' }] } },
      { type: 'cta', props: { heading: 'Need a specific grade?', subheading: 'Send the product name, purity and volume for a quote.', label: 'Request CoA & Quote', href: '/contact' } },
      CONTACT
    ]
  },
  general_trade: {
    id: 'general_trade',
    name: 'Global Trade Co.',
    industry: 'general',
    description: 'A clean, flexible starting point that fits any export business.',
    themeId: 'modern',
    primaryColor: '#0f172a',
    accentColor: '#1E6F5C',
    blocks: [
      { type: 'hero', props: { eyebrow: 'Trusted Export Partner', heading: 'Quality Products, Delivered Worldwide', subheading: 'A dependable manufacturer and exporter with certified quality, transparent pricing and reliable global logistics.', align: 'center', overlay: true, ctaLabel: 'Request a Quote', ctaHref: '/contact' } },
      { type: 'stats', props: { items: [stat('20+', 'Years'), stat('40', 'Countries'), stat('1200+', 'Buyers'), stat('24h', 'Response')] } },
      { type: 'features', props: { title: 'Why Choose Us', subtitle: '', items: [feat('BadgeCheck', 'Certified Quality', 'International certifications and rigorous quality control on every order.'), feat('Truck', 'Reliable Logistics', 'On-time FOB/CIF delivery with complete export documentation.'), feat('Globe', 'Global Reach', 'Trusted by buyers across 40+ countries.')] } },
      { type: 'products', props: { title: 'Featured Products', subtitle: 'A selection from our catalog.', limit: 6, columns: 3 } },
      { type: 'about', props: { title: 'About Our Company', body: 'We are an export-focused company committed to consistent quality, fair pricing and dependable service. Our team manages sourcing, quality and logistics end to end.' } },
      { type: 'cta', props: { heading: 'Ready to start importing?', subheading: 'Get a quote within 24 hours.', label: 'Request a Quote', href: '/contact' } },
      CONTACT
    ]
  }
};

export const TEMPLATE_LIST: SiteTemplate[] = Object.values(SITE_TEMPLATES);

export function templatesByIndustry(industry: Industry): SiteTemplate[] {
  return TEMPLATE_LIST.filter((t) => t.industry === industry);
}

export function getTemplate(id: string | null | undefined): SiteTemplate | null {
  if (!id) return null;
  return SITE_TEMPLATES[id] ?? null;
}

/**
 * Turn a catalog template into concrete builder state: blocks with fresh ids
 * plus the theme and brand colors to seed onto website_settings.
 */
export function instantiateTemplate(template: SiteTemplate): {
  blocks: SiteBlock[];
  theme: ThemeId;
  primaryColor: string;
  accentColor: string;
  industry: Industry;
  templateId: string;
} {
  return {
    blocks: template.blocks.map((b) => ({
      id: crypto.randomUUID(),
      type: b.type,
      props: structuredClone(b.props)
    })),
    theme: template.themeId,
    primaryColor: template.primaryColor,
    accentColor: template.accentColor,
    industry: template.industry,
    templateId: template.id
  };
}




