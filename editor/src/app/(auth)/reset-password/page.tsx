'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { KeyRound, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
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
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <XCircle className="size-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Invalid link
          </h2>
          <p className="text-sm text-muted-foreground">
            This reset link is missing or invalid. Please request a new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="block text-sm text-primary hover:underline"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle className="size-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Password updated
          </h2>
          <p className="text-sm text-muted-foreground">
            Your password has been reset. You can now sign in with your new
            password.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-sm text-primary hover:underline"
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
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-4">
            <KeyRound className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Set new password
        </h2>
        <p className="text-sm text-muted-foreground">
          Must be at least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
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
            className="bg-white/5 border-white/10"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm"
            className="text-sm font-medium text-foreground"
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
            className="bg-white/5 border-white/10"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
        </Button>
      </form>

      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
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
