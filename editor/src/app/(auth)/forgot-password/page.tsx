'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Failed to send reset email');
      } else {
        setSent(true);
        toast.success('Reset link sent — check your inbox');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <CheckCircle className="size-7 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Check your inbox
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a reset link to{' '}
            <span className="font-medium text-foreground">{email}</span>.
            <br />
            The link expires in 1 hour.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Mail className="size-5 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Reset your password
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}
