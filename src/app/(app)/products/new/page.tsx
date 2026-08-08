import { PageHeader } from '@/components/page-header';
import { ProductForm } from '@/components/products/product-form';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Product" description="Add a product to your export catalog" />
      <ProductForm />
    </div>
  );
}