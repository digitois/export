import { PageHeader } from '@/components/page-header';
import { LeadForm } from '@/components/leads/lead-form';

export default function NewLeadPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Lead" description="Capture a new buyer inquiry" />
      <LeadForm />
    </div>
  );
}