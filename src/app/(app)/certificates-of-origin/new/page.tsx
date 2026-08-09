import { PageHeader } from '@/components/page-header';
import CertificateOfOriginForm from '@/components/certificates/certificate-form';

export default function NewCertificatePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Certificate of Origin" description="Issue a certificate of origin for an export order" />
      <CertificateOfOriginForm mode="create" />
    </div>
  );
}
