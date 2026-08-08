import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import 'server-only';

export type AIProviderName = 'openai' | 'anthropic';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletion {
  content: string;
  provider: AIProviderName;
  tokensIn: number;
  tokensOut: number;
}

function getProvider(): AIProviderName {
  const p = process.env.AI_PROVIDER ?? 'openai';
  return p === 'anthropic' ? 'anthropic' : 'openai';
}

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = [
  'You are Export OS, an expert AI assistant for Indian exporters.',
  'You help exporters with HS code classification, export documentation, quotations, email drafting,',
  'product descriptions, SEO blog content and international market suggestions.',
  'Follow Indian export regulations (DGFT, ICEGATE, Customs) and Incoterms 2020.',
  'Answer concisely and professionally. Use markdown formatting when helpful.',
  'Never invent regulatory facts - clearly caveat uncertain compliance advice and suggest professional verification.'
].join(' ');

export async function completeChat(messages: ChatMessage[]): Promise<AICompletion> {
  const provider = getProvider();
  const fullMessages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  if (provider === 'anthropic') {
    const res = await anthropicClient.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: fullMessages.filter((m) => m.role !== 'system') as Anthropic.MessageParam[]
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return {
      content: text,
      provider,
      tokensIn: res.usage?.input_tokens ?? 0,
      tokensOut: res.usage?.output_tokens ?? 0
    };
  }

  const res = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: fullMessages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  });

  return {
    content: res.choices[0]?.message?.content ?? '',
    provider,
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0
  };
}

export async function generateBlogContent(params: {
  keyword: string;
  targetCountry?: string | null;
  targetProduct?: string | null;
  title?: string | null;
  tone?: string;
  companyName?: string | null;
}) {
  const { keyword, targetCountry, targetProduct, title, tone, companyName } = params;

  const prompt = `Write a complete, publication-ready SEO blog post for ${companyName ?? 'an Indian exporter'}.\n
Topic keyword: ${keyword}\n
Target market: ${targetCountry ?? 'global'}\n
Product category: ${targetProduct ?? 'not specified'}\n
Tone: ${tone ?? 'professional'}\n
${title ? `Required title (use verbatim): ${title}` : 'Suggest an engaging title.'}

Return the response as a JSON object with EXACTLY these keys:
- "title": string
- "seoTitle": string (max 60 chars)
- "metaDescription": string (max 155 chars)
- "excerpt": string (2 sentences)
- "outline": string[] (4-6 section headings)
- "content": string (full markdown article, 1200+ words, with ## headings)
- "faqs": [{ "q": string, "a": string }] (3-5 FAQs)
- "schema": { "@type": "Article", ... }

Write genuinely useful, specific content. Include practical export advice about quality parameters, HS codes, packaging, certifications and shipping where relevant. No placeholders, no "[insert]" tokens.`;

  const completion = await completeChat([
    { role: 'user', content: prompt }
  ]);

  return parseJsonBlock(completion.content);
}

export async function generateProductDescription(product: {
  name: string;
  description?: string | null;
  technicalSpecifications?: Record<string, string>;
  targetCountry?: string | null;
}) {
  const prompt = `Write a professional, SEO-optimized product description for an Indian exporter's product page.\n
Product: ${product.name}\n
${product.description ? `Current description: ${product.description}\n` : ''}
${product.technicalSpecifications && Object.keys(product.technicalSpecifications).length
    ? `Specifications: ${JSON.stringify(product.technicalSpecifications)}\n` : ''}
Target market: ${product.targetCountry ?? 'global'}

Return JSON with keys: "description" (300-500 words, persuasive, includes HS code guidance), "metaTitle" (max 60 chars), "metaDescription" (max 155 chars).`;

  const completion = await completeChat([{ role: 'user', content: prompt }]);
  return parseJsonBlock(completion.content);
}

export async function generateHSRecommendation(productName: string, description?: string) {
  const prompt = `Suggest the most appropriate 8-digit HS codes for the following Indian export product.\n
Product: ${productName}\n
${description ? `Description: ${description}\n` : ''}
Return JSON: { "recommendations": [{ "code": string, "description": string, "confidence": "high"|"medium"|"low" }], "notes": string }.`;

  const completion = await completeChat([{ role: 'user', content: prompt }]);
  return parseJsonBlock(completion.content);
}

export async function draftEmail(params: {
  purpose: string;
  context: string;
  tone?: string;
}) {
  const completion = await completeChat([
    {
      role: 'user',
      content: `Draft a professional business email for ${params.purpose}.\nContext: ${params.context}\nTone: ${params.tone ?? 'professional'}\nReturn only the email body.`
    }
  ]);
  return completion.content;
}

function parseJsonBlock(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    return { content: cleaned, title: '', seoTitle: '', metaDescription: '', excerpt: '', outline: [], faqs: [], schema: {} };
  }
}
