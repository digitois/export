-- ------------------------------------------------------------------
-- Export OS - 00049: Template Library Seed (10+ prebuilt templates)
-- ------------------------------------------------------------------

insert into public.template_library (slug, name, description, category, subject, preview_text, body_json, tags) values
(
  'cold-outreach-saas',
  'Cold Outreach (SaaS)',
  'Short cold email for SaaS leads with personalization and a soft CTA.',
  'follow_up',
  'Quick question about {{company}}',
  'Personalized 1:1 outreach for SaaS prospects.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I noticed {{company}} is growing quickly. A lot of teams like yours use automation to save hours on manual email follow-ups."}]},{"type":"paragraph","content":[{"type":"text","text":"Would you be open to a quick 10-minute call this week?"}]},{"type":"paragraph","content":[{"type":"text","text":"Best,\n{{sender_name}}"}]}]}'::jsonb,
  array['cold','saas','outreach']
),
(
  'welcome-new-buyer',
  'Welcome New Buyer',
  'Warm welcome email for newly onboarded buyers.',
  'welcome',
  'Welcome to {{company_name}} 🎉',
  'Friendly onboarding welcome with next steps.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Welcome to {{company_name}}! We are excited to have you onboard."}]},{"type":"paragraph","content":[{"type":"text","text":"Here is what you can do next:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Complete your profile"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Explore integrations"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Invite your team"}]}]}]},{"type":"paragraph","content":[{"type":"text","text":"Best regards,\n{{sender_name}}"}]}]}'::jsonb,
  array['welcome','onboarding']
),
(
  'follow-up-inquiry',
  'Follow Up Inquiry',
  'Polite follow-up after an unanswered inquiry.',
  'follow_up',
  'Following up: {{product_name}} inquiry',
  'Gentle nudge for an unanswered inquiry.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I wanted to follow up on your inquiry about {{product_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Do you have any questions our team can help with? We would love to hear from you."}]},{"type":"paragraph","content":[{"type":"text","text":"Best,\n{{sender_name}}"}]}]}'::jsonb,
  array['follow-up','inquiry']
),
(
  'promotional-offer',
  'Promotional Offer',
  'Announce a limited-time offer to your audience.',
  'promotion',
  'Special offer inside – {{discount}} off',
  'Limited-time promotional offer with CTA.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"For a limited time, get {{discount}} off your next order at {{company_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Use code {{promo_code}} at checkout."}]},{"type":"button","attrs":{"text":"Claim Offer","url":"{{offer_url}}"}}]}'::jsonb,
  array['promo','offer','discount']
),
(
  'order-confirmation',
  'Order Confirmation',
  'Transactional confirmation for a new order.',
  'transactional',
  'Your order {{order_number}} is confirmed',
  'Order confirmation with summary.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Your order {{order_number}} has been confirmed and is being processed."}]},{"type":"paragraph","content":[{"type":"text","text":"Expected delivery: {{delivery_date}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Thank you for shopping with {{company_name}}!"}]}]}'::jsonb,
  array['transactional','order']
),
(
  'product-launch',
  'Product Launch Announcement',
  'Big launch announcement with feature highlights.',
  'announcement',
  'We just launched {{product_name}}',
  'Exciting new product launch.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"We just launched {{product_name}} – the latest from {{company_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Here are the highlights:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{feature_1}}"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{feature_2}}"}]}]}]},{"type":"button","attrs":{"text":"Learn More","url":"{{product_url}}"}}]}'::jsonb,
  array['launch','announcement']
),
(
  'abandoned-cart',
  'Abandoned Cart Recovery',
  'Recover abandoned carts with a gentle reminder.',
  'promotion',
  'Did you leave something behind?',
  'Recover abandoned carts.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"We noticed you left some items in your cart at {{company_name}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Your cart is saved — {here is a reminder|check out now} to complete your purchase."}]},{"type":"button","attrs":{"text":"Complete Purchase","url":"{{cart_url}}"}}]}'::jsonb,
  array['cart','recovery']
),
(
  'cold-outreach-exporter',
  'Cold Outreach (Exporter)',
  'Cold outreach tailored to export.Buyers/importers looking for sourcing.',
  'follow_up',
  'Sourcing partner for {{buyer_company}}',
  'Direct cold outreach for export sourcing.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello {{buyer_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I represent {{company_name}}, an exporter of {{product_category}}. We noticed {{buyer_company}} may import {{product_category}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Could we send you our latest catalog and pricing?"}]},{"type":"paragraph","content":[{"type":"text","text":"Thanks,\n{{sender_name}}"}]}]}'::jsonb,
  array['cold','export','exporter']
),
(
  'newsletter-product-roundup',
  'Newsletter: Product Roundup',
  'Monthly newsletter highlighting new products.',
  'newsletter',
  'Your monthly roundup from {{company_name}}',
  'Product roundup newsletter.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Here is your monthly roundup from {{company_name}}:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{product_1}}"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{product_2}}"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"{{product_3}}"}]}]}]},{"type":"button","attrs":{"text":"View Catalog","url":"{{catalog_url}}"}}]}'::jsonb,
  array['newsletter','roundup']
),
(
  're-engagement',
  'Re-engagement Campaign',
  'Win back inactive customers with a special offer.',
  'follow_up',
  'We miss you at {{company_name}}',
  'Re-engage lapsed customers.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"It has been a while since we last connected. As a thank you, here is {{discount}} off your next order at {{company_name}}."}]},{"type":"button","attrs":{"text":"Redeem Offer","url":"{{offer_url}}"}}]}'::jsonb,
  array['re-engagement','winback']
),
(
  'shipping-notification',
  'Shipping Notification',
  'Let buyers know their shipment is on its way.',
  'transactional',
  'Your shipment {{tracking_number}} is on the way',
  'Shipment tracking notification.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"Good news! Your shipment {{tracking_number}} is now on its way."}]},{"type":"paragraph","content":[{"type":"text","text":"Track it live: {{tracking_url}}"}]},{"type":"paragraph","content":[{"type":"text","text":"Thanks for shipping with {{company_name}}."}]}]}'::jsonb,
  array['shipping','transactional','tracking']
),
(
  'quotation-followup',
  'Quotation Follow-up',
  'Follow up on a quotation sent to a buyer.',
  'follow_up',
  'About your quotation {{quotation_number}}',
  'Follow up on an outstanding quotation.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hi {{first_name}},"}]},{"type":"paragraph","content":[{"type":"text","text":"I wanted to check in on quotation {{quotation_number}} we sent on {{quotation_date}}."}]},{"type":"paragraph","content":[{"type":"text","text":"Do you have any questions, or shall we proceed with the order?"}]},{"type":"paragraph","content":[{"type":"text","text":"Best regards,\n{{sender_name}}"}]}]}'::jsonb,
  array['quotation','follow-up']
)
on conflict (slug) do nothing;