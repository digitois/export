import { PageHeader } from '@/components/page-header';
import QuotationForm from '@/components/quotations/quotation-form';

export default function NewQuotationPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Quotation" description="Create a quotation for a buyer" />
      <QuotationForm mode="create" />
    </div>
  );
}