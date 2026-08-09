import type { LucideIcon } from 'lucide-react';
import {
  LayoutTemplate,
  Image as ImageIcon,
  ShoppingBag,
  Sparkles,
  Building2,
  BarChart3,
  Quote,
  HelpCircle,
  Megaphone,
  Newspaper,
  Images,
  Mail,
  AlignLeft,
  MoveVertical,
  Code2
} from 'lucide-react';

export type SiteBlockType =
  | 'hero'
  | 'products'
  | 'features'
  | 'about'
  | 'stats'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'blog'
  | 'gallery'
  | 'contact'
  | 'text'
  | 'spacer'
  | 'html';

export interface SiteBlock {
  id: string;
  type: SiteBlockType;
  props: Record<string, unknown>;
}

export interface BlockMeta {
  type: SiteBlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  defaults: Record<string, unknown>;
}

export const BLOCK_META: Record<SiteBlockType, BlockMeta> = {
  hero: {
    type: 'hero',
    label: 'Hero',
    description: 'Full-width intro with headline, subtext and CTA',
    icon: LayoutTemplate,
    defaults: {
      eyebrow: 'Exporting Since 1998',
      heading: 'Premium Indian Products, Worldwide',
      subheading: 'Trusted manufacturer & exporter of quality goods across 40+ countries.',
      align: 'center',
      imageUrl: '',
      ctaLabel: 'Request a Quote',
      ctaHref: '/contact',
      overlay: true
    }
  },
  products: {
    type: 'products',
    label: 'Product Catalog',
    description: 'Featured products pulled from your catalog',
    icon: ShoppingBag,
    defaults: { title: 'Featured Products', subtitle: 'A selection from our export catalog.', limit: 6, columns: 3 }
  },
  features: {
    type: 'features',
    label: 'Features',
    description: 'Highlight USPs, certifications and capabilities',
    icon: Sparkles,
    defaults: {
      title: 'Why Choose Us',
      subtitle: '',
      items: [
        { icon: 'BadgeCheck', title: 'Certified Quality', description: 'ISO, FSSAI and global certifications.' },
        { icon: 'Truck', title: 'Reliable Logistics', description: 'On-time FOB/CIF delivery worldwide.' },
        { icon: 'Globe', title: 'Global Reach', description: 'Trusted by buyers in 40+ countries.' }
      ]
    }
  },
  about: {
    type: 'about',
    label: 'About',
    description: 'Company story, markets and certifications',
    icon: Building2,
    defaults: { title: 'About Us', body: '', imageUrl: '' }
  },
  stats: {
    type: 'stats',
    label: 'Stats',
    description: 'Key numbers in a band',
    icon: BarChart3,
    defaults: {
      title: '',
      items: [
        { label: 'Years', value: '25+' },
        { label: 'Countries Served', value: '40' },
        { label: 'Happy Clients', value: '1200' }
      ]
    }
  },
  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Buyer quotes and reviews',
    icon: Quote,
    defaults: {
      title: 'What Our Buyers Say',
      subtitle: '',
      items: [
        { quote: 'Reliable supplier with great quality and on-time delivery.', author: 'John Carter', role: 'Purchasing Manager', company: 'Carter Imports' },
        { quote: 'Excellent communication and consistent product quality.', author: 'Maria Gonzalez', role: 'Director', company: 'Gonzalez Foods' }
      ]
    }
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    description: 'Frequently asked buyer questions',
    icon: HelpCircle,
    defaults: {
      title: 'Frequently Asked Questions',
      subtitle: '',
      items: [
        { q: 'What is your minimum order quantity?', a: 'MOQs vary by product. Contact us for exact figures.' },
        { q: 'Which Incoterms do you support?', a: 'FOB, CIF, EXW and more.' }
      ]
    }
  },
  cta: {
    type: 'cta',
    label: 'Call to Action',
    description: 'Banner encouraging buyer outreach',
    icon: Megaphone,
    defaults: { heading: 'Ready to start importing?', subheading: 'Get a quote within 24 hours.', label: 'Contact Us', href: '/contact' }
  },
  blog: {
    type: 'blog',
    label: 'Blog & Insights',
    description: 'Latest published posts',
    icon: Newspaper,
    defaults: { title: 'Insights & Guides', subtitle: '', limit: 3 }
  },
  gallery: {
    type: 'gallery',
    label: 'Gallery',
    description: 'Image grid of products or facilities',
    icon: Images,
    defaults: { title: 'Our Gallery', images: [] }
  },
  contact: {
    type: 'contact',
    label: 'Contact / Inquiry',
    description: 'Inquiry form + contact details',
    icon: Mail,
    defaults: { title: 'Get in Touch', subtitle: 'We respond within 24 hours.', showForm: true }
  },
  text: {
    type: 'text',
    label: 'Text',
    description: 'Free-form text block',
    icon: AlignLeft,
    defaults: { content: 'Write something about your company here.' }
  },
  spacer: {
    type: 'spacer',
    label: 'Spacer',
    description: 'Vertical spacing',
    icon: MoveVertical,
    defaults: { height: 64 }
  },
  html: {
    type: 'html',
    label: 'Custom HTML',
    description: 'Embed custom HTML / widget code',
    icon: Code2,
    defaults: { code: '<!-- Paste HTML here -->' }
  }
};

export const BLOCK_TYPES = Object.keys(BLOCK_META) as SiteBlockType[];
export const BLOCK_LIST: BlockMeta[] = BLOCK_TYPES.map((t) => BLOCK_META[t]);

export function createBlock(type: SiteBlockType): SiteBlock {
  return { id: crypto.randomUUID(), type, props: { ...BLOCK_META[type].defaults } };
}

export function defaultBlocks(): SiteBlock[] {
  const order: SiteBlockType[] = ['hero', 'products', 'features', 'about', 'stats', 'cta', 'blog', 'contact'];
  return order.map((t) => createBlock(t));
}

export function isSiteBlockType(value: unknown): value is SiteBlockType {
  return typeof value === 'string' && value in BLOCK_META;
}
