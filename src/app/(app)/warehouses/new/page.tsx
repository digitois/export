import { PageHeader } from '@/components/page-header';
import WarehouseForm from '@/components/warehouses/warehouse-form';

export default function NewWarehousePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Warehouse" description="Create a storage location for inventory" />
      <WarehouseForm mode="create" />
    </div>
  );
}