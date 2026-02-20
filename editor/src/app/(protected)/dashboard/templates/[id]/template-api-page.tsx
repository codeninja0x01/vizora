'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, Loader2, AlertCircle, Play, Film } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MergeFieldForm } from '@/components/merge-field-form';
import { VideoPreview } from '@/components/render/video-preview';
import { useRenderEvents } from '@/hooks/use-render-events';
import { submitTestRender } from '../test-render-actions';
import type { MergeField } from '@/types/template';
import type { getTemplateById } from '../actions';

type Template = NonNullable<Awaited<ReturnType<typeof getTemplateById>>>;

// ---------------------------------------------------------------------------
// Copy Button
// ---------------------------------------------------------------------------

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
      className="group/copy flex items-center justify-center rounded p-1.5 text-muted-foreground/50 transition-all hover:bg-primary/10 hover:text-primary"
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-3.5 text-green-400" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section Label — editorial uppercase micro-label
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Code Block
// ---------------------------------------------------------------------------

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="space-y-2">
      {label && <SectionLabel>{label}</SectionLabel>}
      <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-[oklch(0.11_0.008_285)] transition-all hover:border-primary/30">
        {/* Left accent strip */}
        <div className="absolute left-0 top-0 h-full w-[2px] bg-primary/30 transition-colors group-hover:bg-primary/60" />
        <pre className="overflow-x-auto p-4 pl-5 pr-10 font-mono text-xs leading-relaxed text-foreground/80">
          <code>{code}</code>
        </pre>
        <div className="absolute right-2 top-2">
          <CopyButton text={code} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field Type Badge — color-coded per type
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    text: 'bg-muted/60 text-muted-foreground',
    url: 'bg-[oklch(0.65_0.18_250)]/15 text-[oklch(0.65_0.18_250)]',
    number: 'bg-[oklch(0.75_0.16_85)]/15 text-[oklch(0.75_0.16_85)]',
    color: 'bg-[oklch(0.65_0.18_320)]/15 text-[oklch(0.65_0.18_320)]',
  };

  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${styles[type] ?? styles.text}`}
    >
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// API Reference Tab
// ---------------------------------------------------------------------------

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
    <div className="grid gap-8 lg:grid-cols-2">
      {/* ── Left column ── */}
      <div className="space-y-7">
        {/* Endpoint row */}
        <div className="space-y-2">
          <SectionLabel>Endpoint</SectionLabel>
          <div className="flex items-center gap-2.5 overflow-hidden rounded-lg border border-border/60 bg-[oklch(0.11_0.008_285)] px-3 py-2.5">
            <span className="shrink-0 rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-primary-foreground">
              POST
            </span>
            <code className="flex-1 truncate font-mono text-xs text-foreground/70">
              /api/v1/renders
            </code>
            <CopyButton text="POST /api/v1/renders" />
          </div>
        </div>

        {/* Auth row */}
        <div className="space-y-2">
          <SectionLabel>Authentication</SectionLabel>
          <div className="flex items-center gap-2.5 overflow-hidden rounded-lg border border-border/60 bg-[oklch(0.11_0.008_285)] px-3 py-2.5">
            <code className="flex-1 truncate font-mono text-xs text-foreground/70">
              Authorization: Bearer YOUR_API_KEY
            </code>
            <CopyButton text="Authorization: Bearer YOUR_API_KEY" />
          </div>
        </div>

        <CodeBlock code={curlCommand} label="cURL Example" />
        <CodeBlock code={requestBody} label="Request Body" />
      </div>

      {/* ── Right column ── */}
      <div className="space-y-7">
        <CodeBlock code={successResponse} label="Success Response (202)" />

        {mergeFields.length > 0 ? (
          <div className="space-y-2">
            <SectionLabel>Merge Fields</SectionLabel>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="px-3.5 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      Key
                    </th>
                    <th className="px-3.5 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      Type
                    </th>
                    <th className="px-3.5 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {mergeFields.map((field) => (
                    <tr
                      key={field.key}
                      className="transition-colors hover:bg-primary/5"
                    >
                      <td className="px-3.5 py-2.5 font-mono text-xs text-foreground/80">
                        {field.key}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <TypeBadge type={field.fieldType} />
                      </td>
                      <td className="max-w-[120px] truncate px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
                        {String(field.defaultValue ?? '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/40 p-5 text-sm text-muted-foreground">
            This template has no merge fields. Send{' '}
            <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs">
              "mergeData": {'{}'}
            </code>{' '}
            in your request.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test Render Tab
// ---------------------------------------------------------------------------

type RenderState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'rendering'; renderId: string; progress: number }
  | { status: 'completed'; renderId: string; outputUrl: string }
  | { status: 'failed'; errorCategory?: string; errorMessage?: string }
  | { status: 'error'; message: string };

function VideoPlaceholder() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/40 bg-[oklch(0.11_0.008_285)]">
      <div className="relative flex size-12 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10" />
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/5" />
        <Film className="relative size-5 text-muted-foreground/30" />
      </div>
      <p className="text-xs text-muted-foreground/40">
        Output will appear here after render
      </p>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          <span>Rendering…</span>
        </div>
        <span className="font-mono text-xs tabular-nums text-primary">
          {progress}%
        </span>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-muted/40">
        {/* Track fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Shimmer */}
        <div
          className="absolute inset-y-0 w-20 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ left: `calc(${progress}% - 40px)` }}
        />
      </div>
    </div>
  );
}

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
  const isError =
    renderState.status === 'failed' || renderState.status === 'error';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      {/* ── Left: controls ── */}
      <div className="space-y-6">
        <div>
          <SectionLabel>Merge Fields</SectionLabel>
          <div className="mt-3">
            <MergeFieldForm mergeFields={mergeFields} onChange={setMergeData} />
          </div>
        </div>

        {/* Status area */}
        {renderState.status === 'submitting' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            Queuing render…
          </div>
        )}

        {renderState.status === 'rendering' && (
          <ProgressBar progress={renderState.progress} />
        )}

        {isError && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/8 p-3.5 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-0.5">
              <p className="font-medium text-destructive">
                {renderState.status === 'failed'
                  ? (renderState.errorCategory ?? 'Render failed')
                  : 'Error'}
              </p>
              <p className="text-xs text-destructive/70">
                {renderState.status === 'failed'
                  ? (renderState.errorMessage ??
                    'An unexpected error occurred.')
                  : renderState.message}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {renderState.status === 'completed' ? (
          <Button
            variant="outline"
            onClick={() => setRenderState({ status: 'idle' })}
            className="w-full"
          >
            Render Again
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isActive}
            className="group w-full gap-2"
          >
            {isActive ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4 transition-transform group-hover:scale-110" />
            )}
            {isActive ? 'Rendering…' : 'Submit Test Render'}
          </Button>
        )}
      </div>

      {/* ── Right: preview ── */}
      <div>
        {renderState.status === 'completed' ? (
          <VideoPreview
            videoUrl={renderState.outputUrl}
            fileName={`${template.name}-test-render.mp4`}
          />
        ) : (
          <VideoPlaceholder />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

interface TemplateApiPageProps {
  template: Template;
}

export function TemplateApiPage({ template }: TemplateApiPageProps) {
  return (
    <Tabs defaultValue="api" className="space-y-0">
      {/* Tab bar styled like an IDE — bottom-border indicator, no pill background */}
      <div className="border-b border-border/60">
        <TabsList className="h-auto rounded-none bg-transparent p-0">
          <TabsTrigger
            value="api"
            className="relative rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            API Reference
          </TabsTrigger>
          <TabsTrigger
            value="test"
            className="relative rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Test Render
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="api" className="mt-8 focus-visible:outline-none">
        <ApiReferenceTab template={template} />
      </TabsContent>

      <TabsContent value="test" className="mt-8 focus-visible:outline-none">
        <TestRenderTab template={template} />
      </TabsContent>
    </Tabs>
  );
}
