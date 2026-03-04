'use client';

import { useId, useState, type ReactNode } from 'react';
import { Plus, Copy, Check, AlertTriangle } from 'lucide-react';
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
import { createApiKey } from './actions';

interface CreateApiKeyDialogProps {
  children?: ReactNode;
}

export function CreateApiKeyDialog({ children }: CreateApiKeyDialogProps) {
  const nameId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset all state when closing
      setTimeout(() => {
        setName('');
        setError(null);
        setGeneratedKey(null);
        setCopied(false);
      }, 200); // Delay to allow closing animation
    }
    setOpen(newOpen);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createApiKey(name.trim());

      if ('error' in result) {
        setError(result.error);
      } else {
        setGeneratedKey(result.key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey);
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
            Create API Key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {generatedKey ? 'API Key Created' : 'Create API Key'}
          </DialogTitle>
          <DialogDescription>
            {generatedKey
              ? "Copy your API key now - you won't be able to see it again!"
              : 'Create a new API key for programmatic access to Vizora'}
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          // Create form
          <div className="space-y-4">
            <div>
              <label
                htmlFor={nameId}
                className="mb-2 block text-sm font-medium"
              >
                Name
              </label>
              <Input
                id={nameId}
                placeholder="e.g., Production Server, Development"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreate();
                  }
                }}
                disabled={loading}
                autoFocus
              />
              <p className="text-muted-foreground mt-1 text-xs">
                A descriptive name to help you identify this API key
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
          // Generated key display
          <div className="space-y-4">
            <div className="bg-white/5 border-border rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  API Key
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
                {generatedKey}
              </code>
            </div>

            <div className="bg-amber-500/10 text-amber-500 flex items-start gap-2 rounded-md p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Make sure to copy your API key now. You won't be able to see it
                again!
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedKey ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading || !name.trim()}>
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
