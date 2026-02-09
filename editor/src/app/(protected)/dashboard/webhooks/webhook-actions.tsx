'use client';

import { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
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
import { toast } from 'sonner';
import { deleteWebhook, rotateWebhookSecret, toggleWebhook } from './actions';

interface DeleteWebhookButtonProps {
  webhookId: string;
  webhookUrl: string;
}

export function DeleteWebhookButton({
  webhookId,
  webhookUrl,
}: DeleteWebhookButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const result = await deleteWebhook(webhookId);

      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Webhook deleted successfully');
        setOpen(false);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete webhook'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Webhook</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this webhook? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-white/5 border-border rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            Webhook URL
          </div>
          <div className="break-all font-medium">{webhookUrl}</div>
        </div>

        <div className="bg-amber-500/10 text-amber-500 flex items-start gap-2 rounded-md p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>This webhook will no longer receive notifications.</span>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RotateSecretButtonProps {
  webhookId: string;
}

export function RotateSecretButton({ webhookId }: RotateSecretButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRotate = async () => {
    setLoading(true);

    try {
      const result = await rotateWebhookSecret(webhookId);

      if ('error' in result) {
        toast.error(result.error);
      } else {
        setNewSecret(result.secret);
        toast.success('Webhook secret rotated successfully');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to rotate webhook secret'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newSecret) return;

    try {
      await navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Secret copied to clipboard');
    } catch (_err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setTimeout(() => {
        setNewSecret(null);
        setCopied(false);
      }, 200);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <RefreshCw className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rotate Webhook Secret</DialogTitle>
          <DialogDescription>
            {newSecret
              ? "Copy your new secret now - you won't be able to see it again!"
              : 'Generate a new secret for this webhook. The old secret will stop working immediately.'}
          </DialogDescription>
        </DialogHeader>

        {!newSecret ? (
          <>
            <div className="bg-amber-500/10 text-amber-500 flex items-start gap-2 rounded-md p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                The current secret will stop working immediately after rotation.
                Update your webhook handler before rotating.
              </span>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleRotate} disabled={loading}>
                {loading ? 'Rotating...' : 'Rotate Secret'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="bg-white/5 border-border rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  New Webhook Secret
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
                {newSecret}
              </code>
            </div>

            <div className="bg-amber-500/10 text-amber-500 flex items-start gap-2 rounded-md p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Make sure to copy your new secret now. You won't be able to see
                it again!
              </span>
            </div>

            <DialogFooter>
              <Button
                onClick={() => handleOpenChange(false)}
                className="w-full"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ToggleWebhookSwitchProps {
  webhookId: string;
  enabled: boolean;
}

export function ToggleWebhookSwitch({
  webhookId,
  enabled,
}: ToggleWebhookSwitchProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);

    try {
      const result = await toggleWebhook(webhookId, !enabled);

      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(
          enabled
            ? 'Webhook disabled successfully'
            : 'Webhook enabled successfully'
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to toggle webhook'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${
        enabled ? 'bg-primary' : 'bg-white/10'
      }`}
    >
      {loading ? (
        <Loader2 className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
      ) : (
        <span
          className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      )}
    </button>
  );
}
