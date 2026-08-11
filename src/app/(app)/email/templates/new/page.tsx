'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmailBuilder } from '@/components/email/email-builder';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (template: any) => {
    setSaving(true);
    try {
      const response = await fetch('/api/email/templates/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          body: template.blocks,
          html_content: template.html_content // This would be generated from blocks
        })
      });

      if (response.ok) {
        router.push('/email/templates');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="h-screen">
      <EmailBuilder onSave={handleSave} onCancel={handleCancel} />
    </div>
  );
}