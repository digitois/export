import { PageHeader } from '@/components/page-header';
import SupplierForm from '@/components/suppliers/supplier-form';

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Supplier" description="Add a vendor for purchase orders" />
      <SupplierForm mode="create" />
    </div>
  );
}