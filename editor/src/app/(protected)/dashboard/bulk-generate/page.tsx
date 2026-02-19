'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CSVUploader } from './csv-uploader';
import { FieldMapper } from './field-mapper';
import { PreviewTable } from './preview-table';
import { getTemplatesForBulk, submitBatch } from './actions';
import type { MergeField } from '@/types/template';

type Step =
  | 'select-template'
  | 'upload-csv'
  | 'map-fields'
  | 'preview'
  | 'submitted';

interface TemplateOption {
  id: string;
  name: string;
  mergeFields: MergeField[];
  mergeSchema: Record<string, unknown>;
}

export default function BulkGeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>('select-template');

  // Template selection
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateOption | null>(null);

  // CSV upload
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, unknown>[]>([]);

  // Field mapping
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Preview
  const [_validRows, _setValidRows] = useState<Record<string, unknown>[]>([]);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      const result = await getTemplatesForBulk();
      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      setTemplates(result.templates);

      // Check URL param for pre-selected template
      const templateIdParam = searchParams.get('templateId');
      if (templateIdParam) {
        const template = result.templates.find((t) => t.id === templateIdParam);
        if (template) {
          setSelectedTemplateId(template.id);
          setSelectedTemplate(template);
          // Auto-advance to step 2
          setStep('upload-csv');
        }
      }
    };

    loadTemplates();
  }, [searchParams]);

  // Step navigation helpers
  const goBack = () => {
    if (step === 'upload-csv') setStep('select-template');
    else if (step === 'map-fields') setStep('upload-csv');
    else if (step === 'preview') setStep('map-fields');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setSelectedTemplate(template);
    }
  };

  const handleTemplateConfirm = () => {
    if (selectedTemplate) {
      setStep('upload-csv');
    }
  };

  const handleCSVParsed = (
    headers: string[],
    rows: Record<string, unknown>[]
  ) => {
    setCsvHeaders(headers);
    setCsvRows(rows);
    setStep('map-fields');
  };

  const handleMappingConfirm = (newMapping: Record<string, string>) => {
    setMapping(newMapping);
    setStep('preview');
  };

  const handlePreviewSubmit = async (rows: Record<string, unknown>[]) => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      const result = await submitBatch(selectedTemplate.id, rows);

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      setBatchId(result.batchId);
      setStep('submitted');
      toast.success(`Batch created with ${result.totalCount} renders`);
    } catch (error) {
      toast.error('Failed to submit batch');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator
  const steps = [
    { key: 'select-template', label: 'Template' },
    { key: 'upload-csv', label: 'Upload' },
    { key: 'map-fields', label: 'Map' },
    { key: 'preview', label: 'Preview' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-heading">
          Bulk Generate
        </h1>
        <p className="mt-1 text-muted-foreground">
          Generate videos in bulk from CSV data.
        </p>
      </div>

      {/* Step indicator */}
      {step !== 'submitted' && (
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, index) => {
            const isActive = s.key === step;
            const isComplete = index < currentStepIndex;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                    isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-primary/20 text-primary ring-2 ring-primary'
                        : 'bg-white/5 text-muted-foreground'
                  }`}
                >
                  {isComplete ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={`text-sm ${
                    isActive
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <div className="mx-2 h-px w-8 bg-border/40" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Content card */}
      <div className="rounded-lg border border-border/40 bg-card/30 p-6">
        {/* Back button */}
        {step !== 'select-template' && step !== 'submitted' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="mb-6"
          >
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>
        )}

        {/* Step 1: Select Template */}
        {step === 'select-template' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Select a Template
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a template to use for bulk generation
              </p>
            </div>

            <div className="space-y-4">
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({template.mergeFields.length} fields)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex justify-end">
                <Button
                  onClick={handleTemplateConfirm}
                  disabled={!selectedTemplate}
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload CSV */}
        {step === 'upload-csv' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Upload CSV File
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a CSV file with your data. The first row should contain
                column headers.
              </p>
            </div>

            <CSVUploader onParsed={handleCSVParsed} />
          </div>
        )}

        {/* Step 3: Map Fields */}
        {step === 'map-fields' && selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Map CSV Columns to Template Fields
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review auto-matched fields and adjust as needed
              </p>
            </div>

            <FieldMapper
              csvHeaders={csvHeaders}
              templateFields={selectedTemplate.mergeFields}
              onConfirm={handleMappingConfirm}
            />
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Preview and Validate
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review all rows and validation status before submitting
              </p>
            </div>

            <PreviewTable
              rows={csvRows}
              mapping={mapping}
              mergeFields={selectedTemplate.mergeFields}
              onSubmit={handlePreviewSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {/* Step 5: Submitted */}
        {step === 'submitted' && batchId && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <Check className="size-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Batch Submitted Successfully
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Batch ID: <span className="font-mono">{batchId}</span>
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => router.push('/dashboard/renders')}
                size="lg"
              >
                View Renders
              </Button>
              <Button
                onClick={() => {
                  // Reset state and start over
                  setStep('select-template');
                  setSelectedTemplateId('');
                  setSelectedTemplate(null);
                  setCsvHeaders([]);
                  setCsvRows([]);
                  setMapping({});
                  setBatchId(null);
                }}
                variant="outline"
                size="lg"
              >
                Create Another Batch
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
