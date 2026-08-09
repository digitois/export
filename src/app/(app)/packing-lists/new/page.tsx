import { PageHeader } from '@/components/page-header';
import PackingListForm from '@/components/packing-lists/packing-list-form';

export default function NewPackingListPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Packing List" description="Document the packages in a consignment" />
      <PackingListForm mode="create" />
    </div>
  );
}
