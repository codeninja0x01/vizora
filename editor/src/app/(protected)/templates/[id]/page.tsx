import { notFound } from 'next/navigation';
import { getTemplateById } from '@/app/(protected)/dashboard/templates/actions';
import { TemplateDetailClient } from './template-detail-client';

interface TemplateDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { id } = await params;

  // Fetch template from database
  const template = await getTemplateById(id);

  if (!template) {
    notFound();
  }

  return <TemplateDetailClient template={template} />;
}
