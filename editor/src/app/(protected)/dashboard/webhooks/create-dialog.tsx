'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Copy, Check, AlertTriangle, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createWebhook } from './actions';

interface CreateWebhookDialogProps {
  children?: ReactNode;
}

export function CreateWebhookDialog({ children }: CreateWebhookDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    secret: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset all state when closing
      setTimeout(() => {
        setUrl('');
        setError(null);
        setResult(null);
        setCopied(false);
      }, 200); // Delay to allow closing animation
    }
    setOpen(newOpen);
  };

  const handleCreate = async () => {
    if (!url.trim()) {
      setError('Please enter a webhook URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createWebhook(url.trim());

      if ('error' in response) {
        setError(response.error);
      } else {
        setResult(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="size-4" />
            Create Webhook
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="size-5" />
            {result ? 'Webhook Created' : 'Create Webhook'}
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Copy your webhook secret now - you won't be able to see it again!"
              : 'Register a webhook URL to receive notifications when renders complete or fail'}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          // Create form
          <div className="space-y-4">
            <div>
              <label
                htmlFor="webhook-url"
                className="mb-2 block text-sm font-medium"
              >
                Webhook URL
              </label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://example.com/webhooks/autoclip"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreate();
                  }
                }}
                disabled={loading}
                autoFocus
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Must be a publicly accessible HTTPS endpoint (or
                http://localhost in development)
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          // Generated secret display
          <div className="space-y-4">
            <div className="bg-white/5 border-border rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  Webhook Secret
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  className="h-6 w-6"
                >
                  {copied ? (
                    <Check className="text-green-500 size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <code className="block break-all font-mono text-sm">
                {result.secret}
              </code>
            </div>

            <div className="bg-amber-500/10 text-amber-500 flex items-start gap-2 rounded-md p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Make sure to copy your webhook secret now. You won't be able to
                see it again!
              </span>
            </div>

            <div className="bg-white/5 border-border rounded-lg border p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium">
                Use this secret to verify webhook signatures:
              </p>
              <p>
                Include it in your webhook handler to validate that requests are
                from AutoClip.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading || !url.trim()}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </>
          ) : (
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
