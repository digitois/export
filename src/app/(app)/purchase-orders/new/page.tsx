import { PageHeader } from '@/components/page-header';
import PurchaseOrderForm from '@/components/purchase-orders/purchase-order-form';

export default function NewPurchaseOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Purchase Order" description="Create a purchase order for a supplier" />
      <PurchaseOrderForm mode="create" />
    </div>
  );
}