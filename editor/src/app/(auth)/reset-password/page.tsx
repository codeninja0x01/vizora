'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { CheckCircle, KeyRound, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
            <XCircle className="size-7 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Invalid link
          </h2>
          <p className="text-sm text-muted-foreground">
            This reset link is missing or invalid. Please request a new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <CheckCircle className="size-7 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Password updated
          </h2>
          <p className="text-sm text-muted-foreground">
            Your password has been reset. You can now sign in with your new
            password.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to reset password');
      } else {
        setDone(true);
        toast.success('Password updated successfully');
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <KeyRound className="size-5 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Set new password
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a strong password of at least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            New password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="h-11 border-white/10 bg-white/5 transition-colors focus-visible:border-primary/50 focus-visible:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Confirm password
          </label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={loading}
            className="h-11 border-white/10 bg-white/5 transition-colors focus-visible:border-primary/50 focus-visible:ring-primary/20"
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background:
              'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
          }}
          disabled={loading}
        >
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back to sign in
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
