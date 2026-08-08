import { PageHeader } from '@/components/page-header';
import { ProductForm } from '@/components/products/product-form';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader title="Edit Product" description="Update product details" />
      <ProductForm productId={id} />
    </div>
  );
}