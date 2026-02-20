import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTemplateById } from '../actions';
import { TemplateApiPage } from './template-api-page';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await getTemplateById(id).catch(() => null);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/templates">
          <Button variant="ghost" size="sm" className="gap-1.5 px-2">
            <ChevronLeft className="size-4" />
            Templates
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight font-heading">
            {template.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            API Reference &amp; Test Render
          </p>
        </div>
      </div>

      <TemplateApiPage template={template} />
    </div>
  );
}
