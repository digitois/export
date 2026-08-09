import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import EmployeeForm from '@/components/hrm/employee-form';

export const metadata: Metadata = { title: 'New Employee' };

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Employee" description="Add a team member to your HRM records" />
      <EmployeeForm mode="create" />
    </div>
  );
}
