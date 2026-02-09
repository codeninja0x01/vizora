'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
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
import { revokeApiKey } from './actions';

interface RevokeButtonProps {
  keyId: string;
  keyName: string;
}

export function RevokeButton({ keyId, keyName }: RevokeButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await revokeApiKey(keyId);

      if ('error' in result) {
        setError(result.error);
      } else {
        // Success - close dialog and let revalidation update the list
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
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
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this API key? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-white/5 border-border rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            API Key Name
          </div>
          <div className="font-medium">{keyName}</div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-amber-500/10 text-amber-500 flex items-start gap-2 rounded-md p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Any applications using this API key will no longer be able to access
            your account.
          </span>
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
            onClick={handleRevoke}
            disabled={loading}
          >
            {loading ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
