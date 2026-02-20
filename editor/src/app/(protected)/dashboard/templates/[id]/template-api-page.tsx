'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MergeFieldForm } from '@/components/merge-field-form';
import { VideoPreview } from '@/components/render/video-preview';
import { useRenderEvents } from '@/hooks/use-render-events';
import { submitTestRender } from '../test-render-actions';
import type { MergeField } from '@/types/template';
import type { getTemplateById } from '../actions';

type Template = NonNullable<Awaited<ReturnType<typeof getTemplateById>>>;

// --- Copy Button ---

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-4 text-green-500" />
      ) : (
        <Copy className="size-4" />
      )}
    </button>
  );
}

// --- Code Block ---

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}
      <div className="relative rounded-lg border bg-muted/40 p-4">
        <pre className="overflow-x-auto pr-8 text-xs leading-relaxed">
          <code>{code}</code>
        </pre>
        <div className="absolute right-2 top-2">
          <CopyButton text={code} />
        </div>
      </div>
    </div>
  );
}

// --- API Reference Tab ---

function ApiReferenceTab({ template }: { template: Template }) {
  const mergeFields = (template.mergeFields ?? []) as MergeField[];

  const exampleMergeData: Record<string, unknown> = {};
  for (const field of mergeFields) {
    exampleMergeData[field.key] = field.defaultValue;
  }

  const requestBody = JSON.stringify(
    { templateId: template.id, mergeData: exampleMergeData },
    null,
    2
  );

  const curlCommand = `curl -X POST https://your-domain/api/v1/renders \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '${JSON.stringify({ templateId: template.id, mergeData: exampleMergeData })}'`;

  const successResponse = JSON.stringify(
    {
      id: '<render-id>',
      status: 'queued',
      templateId: template.id,
      createdAt: '2025-01-01T00:00:00.000Z',
      creditsDeducted: 1,
      creditsRemaining: 99,
    },
    null,
    2
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left column */}
      <div className="space-y-6">
        {/* Endpoint */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Endpoint</p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
              POST
            </span>
            <code className="flex-1 text-xs">/api/v1/renders</code>
            <CopyButton text="POST /api/v1/renders" />
          </div>
        </div>

        {/* Auth */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Authentication
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
            <code className="flex-1 text-xs">
              Authorization: Bearer YOUR_API_KEY
            </code>
            <CopyButton text="Authorization: Bearer YOUR_API_KEY" />
          </div>
        </div>

        {/* Curl */}
        <CodeBlock code={curlCommand} label="cURL Example" />

        {/* Request body */}
        <CodeBlock code={requestBody} label="Request Body" />
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Success response */}
        <CodeBlock code={successResponse} label="Success Response (202)" />

        {/* Field type table */}
        {mergeFields.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Merge Fields
            </p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium">Key</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {mergeFields.map((field, i) => (
                    <tr
                      key={field.key}
                      className={i % 2 === 0 ? '' : 'bg-muted/20'}
                    >
                      <td className="px-3 py-2 font-mono">{field.key}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {field.fieldType}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {String(field.defaultValue ?? '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This template has no merge fields. Use{' '}
            <code className="rounded bg-muted px-1">{'"mergeData": {}'}</code>{' '}
            in your request.
          </p>
        )}
      </div>
    </div>
  );
}

// --- Test Render Tab ---

type RenderState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'rendering'; renderId: string; progress: number }
  | { status: 'completed'; renderId: string; outputUrl: string }
  | { status: 'failed'; errorCategory?: string; errorMessage?: string }
  | { status: 'error'; message: string };

function TestRenderTab({ template }: { template: Template }) {
  const mergeFields = (template.mergeFields ?? []) as MergeField[];

  const [mergeData, setMergeData] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of mergeFields) {
      defaults[field.key] = field.defaultValue;
    }
    return defaults;
  });

  const [renderState, setRenderState] = useState<RenderState>({
    status: 'idle',
  });

  const handleEvent = useCallback(
    (event: {
      type: string;
      renderId?: string;
      data?: {
        progress?: number;
        outputUrl?: string;
        errorCategory?: string;
        errorMessage?: string;
      };
    }) => {
      setRenderState((prev) => {
        if (prev.status !== 'rendering' || event.renderId !== prev.renderId) {
          return prev;
        }

        if (event.type === 'progress' && event.data?.progress !== undefined) {
          return {
            status: 'rendering',
            renderId: prev.renderId,
            progress: event.data.progress,
          };
        }

        if (event.type === 'completed' && event.data?.outputUrl) {
          return {
            status: 'completed',
            renderId: prev.renderId,
            outputUrl: event.data.outputUrl,
          };
        }

        if (event.type === 'failed') {
          return {
            status: 'failed',
            errorCategory: event.data?.errorCategory,
            errorMessage: event.data?.errorMessage,
          };
        }

        return prev;
      });
    },
    []
  );

  useRenderEvents({ onEvent: handleEvent });

  const handleSubmit = async () => {
    setRenderState({ status: 'submitting' });
    try {
      const result = await submitTestRender(template.id, mergeData);
      if ('error' in result) {
        setRenderState({ status: 'error', message: result.error });
        return;
      }
      setRenderState({
        status: 'rendering',
        renderId: result.renderId,
        progress: 0,
      });
    } catch {
      setRenderState({
        status: 'error',
        message: 'Network error. Please try again.',
      });
    }
  };

  const isActive =
    renderState.status === 'submitting' || renderState.status === 'rendering';

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: form */}
      <div className="space-y-6">
        <MergeFieldForm mergeFields={mergeFields} onChange={setMergeData} />

        {(renderState.status === 'idle' ||
          renderState.status === 'error' ||
          renderState.status === 'failed') && (
          <Button onClick={handleSubmit} disabled={isActive} className="w-full">
            Submit Test Render
          </Button>
        )}

        {renderState.status === 'submitting' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Queuing render…
          </div>
        )}

        {renderState.status === 'rendering' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Rendering… {renderState.progress}%
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${renderState.progress}%` }}
              />
            </div>
          </div>
        )}

        {(renderState.status === 'failed' ||
          renderState.status === 'error') && (
          <div className="flex gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">
                {renderState.status === 'failed'
                  ? (renderState.errorCategory ?? 'Render Failed')
                  : 'Error'}
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                {renderState.status === 'failed'
                  ? (renderState.errorMessage ??
                    'An error occurred during rendering.')
                  : renderState.message}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right: preview */}
      <div>
        {renderState.status === 'completed' && (
          <div className="space-y-4">
            <VideoPreview
              videoUrl={renderState.outputUrl}
              fileName={`${template.name}-test-render.mp4`}
            />
            <Button
              variant="outline"
              onClick={() => setRenderState({ status: 'idle' })}
              className="w-full"
            >
              Render Again
            </Button>
          </div>
        )}

        {renderState.status !== 'completed' && (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Video preview will appear here
          </div>
        )}
      </div>
    </div>
  );
}

// --- Page root ---

interface TemplateApiPageProps {
  template: Template;
}

export function TemplateApiPage({ template }: TemplateApiPageProps) {
  return (
    <Tabs defaultValue="api">
      <TabsList>
        <TabsTrigger value="api">API Reference</TabsTrigger>
        <TabsTrigger value="test">Test Render</TabsTrigger>
      </TabsList>

      <TabsContent value="api" className="mt-6">
        <ApiReferenceTab template={template} />
      </TabsContent>

      <TabsContent value="test" className="mt-6">
        <TestRenderTab template={template} />
      </TabsContent>
    </Tabs>
  );
}
