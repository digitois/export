import { PageHeader } from '@/components/page-header';
import { ShipmentForm } from '@/components/shipments/shipment-form';

export default function NewShipmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Shipment" description="Create a consignment to track from booking to delivery" />
      <ShipmentForm />
    </div>
  );
}
