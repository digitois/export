# geniusCampaign → Export OS Feature Implementation Plan

## Overview
Port all geniusCampaign features into Export OS. geniusCampaign is a full-featured cold email/outreach platform built with NestJS (API) + React (web). Export OS is Next.js 15 + Supabase. We'll adapt the architecture to our stack.

---

## Feature Gap Analysis

| geniusCampaign Feature | Export OS Status | Action |
|---|---|---|
| **Sequences** (multi-step with delays) | Workflows exist but different paradigm | **Replace/extend** with sequence-specific engine |
| **Campaigns** (one-off blasts) | Basic campaigns exist | **Enhance** with template variants, better compose |
| **Template Editor** (Tiptap + personalization + spintax + CTA + images) | Basic textarea only | **Build new** Tiptap-based editor |
| **Template Library** (prebuilt founder/SaaS templates) | None | **Add** library with 10+ templates |
| **Template Variants** (A/B testing) | None | **Add** variant support |
| **Sender Accounts** (SES + Gmail OAuth) | None | **Add** sender account management |
| **Email Verification** (local + Reoon + NeverBounce) | None | **Add** verification service |
| **Triggers** (event + schedule + webhook) | Basic workflow triggers | **Enhance** with conditions, cron, webhooks |
| **Webhooks** (inbound/outbound) | Basic webhooks | **Enhance** with full webhook system |
| **Email Log** (delivery tracking) | Basic tracking | **Enhance** with full event log |
| **Spintax** (content variation) | None | **Add** spintax parser/renderer |
| **Contact Import** (CSV with preview) | Basic import | **Enhance** with preview/validation |
| **Analytics** (open/click tracking) | Basic stats | **Enhance** with full tracking |

---

## Phase 1: Foundation & Database (Week 1-2)

### 1.1 Database Migrations
```sql
-- Sequences
create table sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean default true,
  step_count int default 0,
  enrolled_count int default 0,
  open_count int default 0,
  has_active_enrollments boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sequence steps
create table sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id) on delete cascade,
  type text not null check (type in ('send_email', 'wait')),
  position int not null,
  delay_value int,
  delay_unit text check (delay_unit in ('minutes', 'hours', 'days')),
  template_id uuid references email_templates(id),
  created_at timestamptz default now()
);

-- Sequence enrollments
create table sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id) on delete cascade,
  contact_id uuid references email_contacts(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  current_step_id uuid references sequence_steps(id),
  status text default 'active' check (status in ('active', 'paused', 'stopped', 'completed')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  metadata jsonb default '{}'
);

-- Template variants
alter table email_templates add column parent_template_id uuid references email_templates(id);
alter table email_templates add column is_variant boolean default false;
alter table email_templates add column body_json jsonb; -- Tiptap JSON
alter table email_templates add column subject text;
alter table email_templates add column category text;

-- Sender accounts
create table sender_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  provider text not null check (provider in ('ses', 'gmail')),
  email text not null,
  display_name text,
  daily_send_limit int default 1000,
  sent_today int default 0,
  is_active boolean default true,
  aws_region text,
  ses_configuration_set text,
  aws_access_key_id text, -- encrypted
  aws_secret_access_key text, -- encrypted
  gmail_refresh_token text, -- encrypted
  created_at timestamptz default now()
);

-- Triggers
create table triggers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  event_type text not null,
  conditions jsonb default '{}',
  sequence_id uuid references sequences(id) on delete cascade,
  is_active boolean default true,
  schedule_cron text,
  schedule_timezone text,
  webhook_endpoint_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Trigger evaluations
create table trigger_evaluations (
  id uuid primary key default gen_random_uuid(),
  trigger_id uuid references triggers(id) on delete cascade,
  contact_id uuid references email_contacts(id),
  contact_email text,
  event_type text,
  enrolled boolean,
  error text,
  created_at timestamptz default now()
);

-- Webhook endpoints
create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  url text not null,
  secret text,
  events text[] not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Email activity log
create table email_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  contact_id uuid references email_contacts(id),
  email text not null,
  event text not null check (event in ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  message_id text,
  template_id uuid,
  campaign_id uuid,
  sequence_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Verification jobs
create table verification_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  state text default 'pending',
  progress int default 0,
  total_contacts int,
  checked int default 0,
  failed int default 0,
  rate_limited int default 0,
  last_error text,
  result jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Email template blocks (for drag-drop builder)
create table email_template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references email_templates(id) on delete cascade,
  block_type text not null check (block_type in ('text', 'image', 'button', 'divider', 'social', 'spacer', 'cta')),
  position int default 0,
  config jsonb default '{}',
  content jsonb,
  created_at timestamptz default now()
);
```

### 1.2 Supabase RLS Policies
- All tables: org isolation via `is_org_member(organization_id)`
- Admin access via `is_platform_admin()`
- Manager role for delete operations

---

## Phase 2: Core Services (Week 2-3)

### 2.1 Sequence Service (`src/lib/services/sequences.ts`)
```typescript
// CRUD
createSequence(orgId, userId, { name, description })
getSequence(orgId, id)
listSequences(orgId)
updateSequence(id, updates)
deleteSequence(id)

// Steps
addStep(sequenceId, { type, delayValue, delayUnit, templateId })
updateStep(stepId, updates)
removeStep(stepId)
reorderSteps(sequenceId, stepIds)

// Enrollment
enrollContact(sequenceId, contactId)
pauseEnrollment(enrollmentId)
resumeEnrollment(enrollmentId)
stopEnrollment(enrollmentId)
listEnrollments(sequenceId)

// Execution (called by worker)
getNextStep(enrollmentId)
executeStep(enrollmentId, step)
```

### 2.2 Sender Account Service (`src/lib/services/sender-accounts.ts`)
```typescript
listSenderAccounts(orgId)
createSESAccount(orgId, { email, displayName, dailySendLimit, awsRegion, credentials })
createGmailAccount(orgId, { email, displayName, dailySendLimit, refreshToken })
updateSenderAccount(id, updates)
deleteSenderAccount(id)
getGmailAuthUrl()
handleGmailCallback(code)
testSenderAccount(id)
```

### 2.3 Verification Service (`src/lib/services/verification.ts`)
```typescript
localCheckEmail(email) // syntax + MX + disposable
verifyEmail(email) // Reoon/NeverBounce
startBulkVerify(orgId)
getBulkVerifyStatus(jobId)
getVerificationStats(orgId)
```

### 2.4 Trigger Service (`src/lib/services/triggers.ts`)
```typescript
createTrigger(orgId, userId, { name, eventType, conditions, sequenceId, scheduleCron, scheduleTimezone, webhookEndpointId })
listTriggers(orgId)
getTrigger(orgId, id)
updateTrigger(id, { isActive })
deleteTrigger(id)
evaluateTrigger(eventType, contact, orgId) // Called by event bus
listEvaluations(triggerId)
getTriggerStats(triggerId)
```

### 2.5 Webhook Service (`src/lib/services/webhooks.ts`)
```typescript
createWebhookEndpoint(orgId, { name, url, secret, events })
listWebhookEndpoints(orgId)
updateWebhookEndpoint(id, updates)
deleteWebhookEndpoint(id)
deliverWebhook(endpointId, event, payload) // with retry + signature
```

### 2.6 Email Activity Service (`src/lib/services/email-activity.ts`)
```typescript
logActivity(orgId, { contactId, email, event, messageId, templateId, campaignId, sequenceId, metadata })
getActivityLog(orgId, filters)
getContactTimeline(contactId)
```

### 2.7 Spintax Service (`src/lib/services/spintax.ts`)
```typescript
parseSpintax(text) // returns array of variations
renderSpintax(text, seed?) // picks one variation
shufflePreview(text, count) // for UI preview
```

### 2.8 Template Service Enhancement (`src/lib/services/templates.ts`)
```typescript
// Add to existing
createTemplateVariant(parentId, { name, subject, bodyJson })
listTemplateVariants(parentId)
getTemplateLibrary() // prebuilt templates
createTemplateFromLibrary(slug, orgId, userId)
```

---

## Phase 3: API Routes (Week 3)

### 3.1 New API Routes
```
POST   /api/sequences                    - Create sequence
GET    /api/sequences                    - List sequences
GET    /api/sequences/:id                - Get sequence
PATCH  /api/sequences/:id                - Update sequence
DELETE /api/sequences/:id                - Delete sequence
POST   /api/sequences/:id/steps          - Add step
PATCH  /api/sequences/:id/steps/:stepId  - Update step
DELETE /api/sequences/:id/steps/:stepId  - Delete step
POST   /api/sequences/:id/reorder        - Reorder steps
POST   /api/sequences/:id/enroll         - Enroll contact
PATCH  /api/sequences/:id/enrollments/:enrollmentId - Pause/resume/stop

GET    /api/sender-accounts              - List sender accounts
POST   /api/sender-accounts/ses          - Create SES account
POST   /api/sender-accounts/gmail        - Create Gmail account
PATCH  /api/sender-accounts/:id          - Update sender account
DELETE /api/sender-accounts/:id          - Delete sender account
GET    /api/sender-accounts/gmail/connect - Get Gmail OAuth URL
GET    /api/sender-accounts/gmail/callback - Handle Gmail callback

POST   /api/verification/local-check     - Syntax/MX check
POST   /api/verification/check           - Full verification
POST   /api/verification/bulk-verify     - Start bulk verify
GET    /api/verification/bulk-verify/:jobId - Job status
GET    /api/verification/stats           - Verification stats

POST   /api/triggers                     - Create trigger
GET    /api/triggers                     - List triggers
GET    /api/triggers/:id                 - Get trigger
PATCH  /api/triggers/:id                 - Update trigger
DELETE /api/triggers/:id                 - Delete trigger
GET    /api/triggers/:id/stats           - Trigger stats
GET    /api/triggers/:id/evaluations     - Trigger evaluations

POST   /api/webhooks                     - Create webhook endpoint
GET    /api/webhooks                     - List webhook endpoints
PATCH  /api/webhooks/:id                 - Update webhook
DELETE /api/webhooks/:id                 - Delete webhook
POST   /api/webhooks/deliver             - Deliver webhook (internal)

GET    /api/email-activity               - Activity log with filters
GET    /api/email-activity/contact/:id   - Contact timeline

POST   /api/templates/:id/variants       - Create variant
GET    /api/templates/:id/variants       - List variants
GET    /api/templates/library            - Prebuilt templates
POST   /api/templates/from-library/:slug - Create from library
```

---

## Phase 4: Frontend Components (Week 4-5)

### 4.1 Sequence Pages
```
src/app/(app)/email/sequences/
  page.tsx              - SequencesList (table + create)
  [id]/
    page.tsx            - SequenceBuilder (visual builder)
    components/
      SequenceStepBlock.tsx
      DelayEditor.tsx
      TemplateSelector.tsx
      EnrollmentTable.tsx
      EnrollPicker.tsx
```

### 4.2 Template Editor (Tiptap)
```
src/components/email/
  TemplateEditor.tsx          - Main editor (Tiptap)
  TemplateEditorToolbar.tsx   - Toolbar with formatting
  PersonalizationToken.tsx    - Token node
  SpintaxBlock.tsx            - Spintax node
  CtaButton.tsx               - CTA button node
  R2Image.tsx                 - Image upload (R2/S3)
  TemplateLibraryModal.tsx    - Prebuilt templates
  TemplatePreviewModal.tsx    - Preview with sample data
  SendTestEmailModal.tsx      - Send test email
  LinkClickPopover.tsx        - Link edit popover

src/app/(app)/email/templates/
  [id]/page.tsx               - TemplateEditor page
  new/page.tsx                - New template (shows library first)
  page.tsx                    - TemplatesList (grid with preview)
```

### 4.3 Sender Accounts
```
src/app/(app)/email/settings/
  sender-accounts/page.tsx    - SenderAccountsSettings
  components/
    SesAccountForm.tsx
    GmailConnectButton.tsx
    SenderAccountCard.tsx
```

### 4.5 Verification
```
src/app/(app)/email/verification/
  page.tsx                    - Verification page
  components/
    SingleVerify.tsx
    BulkVerify.tsx
    VerificationStats.tsx
```

### 4.6 Triggers
```
src/app/(app)/email/triggers/
  page.tsx                    - TriggersList
  [id]/page.tsx               - TriggerDetail (stats + evaluations)
  components/
    TriggerForm.tsx
    ConditionBuilder.tsx
    TriggerEvaluationTable.tsx
```

### 4.7 Webhooks
```
src/app/(app)/email/webhooks/
  page.tsx                    - WebhooksList
  components/
    WebhookForm.tsx
    WebhookTestModal.tsx
```

### 4.8 Email Log
```
src/app/(app)/email/log/
  page.tsx                    - EmailLog (filterable table)
  components/
    ActivityFilters.tsx
    ActivityRow.tsx
```

### 4.9 Campaign Enhancement
- Update CampaignCompose to use TemplateEditor
- Add variant selection for A/B testing
- Improve contact/list selection

### 4.10 Contact Import
```
src/components/email/CsvImportModal.tsx
  - Preview rows
  - Column mapping
  - Validation errors
```

### 4.11 Shared Components
```
src/components/ui/
  DropdownMenu.tsx            - For New dropdown (already exists)
  DataTable.tsx               - For tables (uses @tanstack/react-table)
```

---

## Phase 5: Background Workers (Week 5)

### 5.1 Sequence Runner
- Process sequence steps (delays, sends)
- Handle enrollment state transitions
- Respect daily send limits per sender account

### 5.2 Trigger Evaluator
- Listen to events (lead_created, lead_status_changed, etc.)
- Evaluate conditions against contact data
- Enroll matching contacts into sequences

### 5.3 Webhook Deliverer
- Queue webhook deliveries
- Retry with exponential backoff
- Sign payloads with HMAC

### 5.4 Verification Processor
- Process bulk verification jobs
- Rate limit Reoon/NeverBounce calls
- Update contact verification status

### 5.5 Email Sender
- Process email queue
- Rotate sender accounts by daily limits
- Track delivery events (webhooks from SES/Gmail)

---

## Phase 6: Integration & Polish (Week 6)

### 6.1 Navigation Updates
- Add "Sequences" to Email Marketing sidebar
- Add "Verification" to sidebar
- Add "Triggers", "Webhooks", "Email Log" to sidebar
- Update "New" dropdown with all action types

### 6.2 Settings Integration
- Sender Accounts under Email Settings
- Verification API keys under Settings
- Webhook endpoints under Settings

### 6.3 Analytics
- Sequence performance dashboard
- Campaign/Template variant comparison
- Sender account health (bounce/complaint rates)

### 6.4 Testing
- Unit tests for services
- Integration tests for API routes
- E2E tests for critical flows (sequence creation → enrollment → send)

---

## Database Migration Order

1. `00040_sequences.sql` - sequences, sequence_steps, sequence_enrollments
2. `00041_template_variants.sql` - parent_template_id, is_variant, body_json
3. `00042_sender_accounts.sql` - sender_accounts table
4. `00043_triggers.sql` - triggers, trigger_evaluations
4. `00044_webhooks.sql` - webhook_endpoints
5. `00045_email_activity.sql` - email_activities
6. `00046_verification.sql` - verification_jobs
7. `00047_template_blocks.sql` - email_template_blocks

---

## Configuration (env vars)
```bash
# Sender accounts
AWS_REGION=
SES_CONFIGURATION_SET=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

# Verification
REOON_API_KEY=
NEVERBOUNCE_API_KEY=

# Webhooks
WEBHOOK_SECRET=

# Email tracking
TRACKING_DOMAIN=
```

---

## Priority Order

| Priority | Feature | Reason |
|---|---|---|
| 1 | Sequences + Builder | Core automation, replaces basic workflows |
| 2 | Template Editor + Library | Foundation for all email content |
| 3 | Sender Accounts | Required for sending |
| 4 | Email Verification | List hygiene |
| 5 | Triggers | Event-based automation |
| 6 | Webhooks | Integration |
| 7 | Email Log | Observability |
| 8 | Template Variants | A/B testing |
| 9 | Contact Import | Data onboarding |

---

## Notes for Export OS Integration

- **Multi-tenant**: All features must respect organization isolation (RLS)
- **RBAC**: Use existing `is_platform_admin`, `has_role(org, 'manager')`, `has_role(org, 'employee')`
- **Theme**: Use makoro palette (teal `#0B6B63`, ink `#363D42`, near-black `#041902`)
- **API Pattern**: Follow existing `requireAuth`, `requireAdmin`, `handleApiError`, `ok`
- **State**: Use existing `apiClient` + React Query or SWR
- **Real-time**: Supabase Realtime for enrollment/trigger updates
- **Background jobs**: Use existing Bull/Redis or Supabase pg_cron