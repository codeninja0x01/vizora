'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
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
    <div className="space-y-8">
      {/* Header */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Bulk Generate
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground/70">
          Generate videos in bulk from CSV data.
        </p>
      </div>

      {/* Step indicator */}
      {step !== 'submitted' && (
        <div
          className="flex items-center justify-center gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '60ms', animationFillMode: 'both' }}
        >
          {steps.map((s, index) => {
            const isActive = s.key === step;
            const isComplete = index < currentStepIndex;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    isComplete
                      ? 'text-white'
                      : isActive
                        ? 'border border-primary/40 bg-primary/10 text-primary'
                        : 'border border-white/[0.07] bg-white/[0.02] text-muted-foreground/50'
                  }`}
                  style={
                    isComplete
                      ? {
                          background:
                            'linear-gradient(135deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
                        }
                      : undefined
                  }
                >
                  {isComplete ? <Check className="size-3.5" /> : index + 1}
                </div>
                <span
                  className={`text-[13px] ${
                    isActive
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground/50'
                  }`}
                >
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <div className="mx-2 h-px w-8 bg-white/[0.07]" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Content card */}
      <div
        className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        {/* Back button */}
        {step !== 'select-template' && step !== 'submitted' && (
          <button
            type="button"
            onClick={goBack}
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        )}

        {/* Step 1: Select Template */}
        {step === 'select-template' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Select a Template
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground/60">
                Choose a template to use for bulk generation
              </p>
            </div>

            <div className="space-y-4">
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger className="w-full border-white/[0.07] bg-white/[0.02]">
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
                <button
                  type="button"
                  onClick={handleTemplateConfirm}
                  disabled={!selectedTemplate}
                  className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
                  style={{
                    background:
                      'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload CSV */}
        {step === 'upload-csv' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Upload CSV File
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground/60">
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
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Map CSV Columns to Template Fields
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground/60">
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
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Preview and Validate
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground/60">
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
          <div className="py-14 text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-green-500/10">
              <Check className="size-7 text-green-500" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Batch Submitted Successfully
            </h2>
            <p className="mt-2 text-sm text-muted-foreground/60">
              Batch ID:{' '}
              <code className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[12px] text-muted-foreground">
                {batchId}
              </code>
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/renders')}
                className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium text-white"
                style={{
                  background:
                    'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
                }}
              >
                View Renders
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('select-template');
                  setSelectedTemplateId('');
                  setSelectedTemplate(null);
                  setCsvHeaders([]);
                  setCsvRows([]);
                  setMapping({});
                  setBatchId(null);
                }}
                className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.05]"
              >
                Create Another Batch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
