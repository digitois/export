import { PageHeader } from '@/components/page-header';
import InvoiceForm from '@/components/invoices/invoice-form';

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" description="Create an export invoice" />
      <InvoiceForm mode="create" />
    </div>
  );
}