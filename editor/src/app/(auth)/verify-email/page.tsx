'use client';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { toast } from 'sonner';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(
    token ? 'pending' : 'pending'
  );
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      // Better Auth handles email verification through its API
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        toast.success('Email verified! You can now sign in.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        const data = await response.json();
        setStatus('error');
        setMessage(
          data.message || 'Verification failed. The link may have expired.'
        );
        toast.error('Verification failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage('An error occurred during verification. Please try again.');
      toast.error('Verification error');
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // This would need to be implemented in your Better Auth configuration
      // For now, show a message
      toast.info('Please sign up again to receive a new verification email');
      router.push('/signup');
    } catch (err) {
      toast.error('Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Mail className="size-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Check your email
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent you a verification link. Please check your inbox and
            click the link to verify your email address.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive the email?
          </p>
          <Button
            variant="outline"
            className="w-full bg-white/5 border-white/10"
            onClick={handleResendEmail}
            disabled={resending}
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Resending...
              </>
            ) : (
              'Resend verification email'
            )}
          </Button>
        </div>

        <Link
          href="/login"
          className="block text-sm text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div
          className={`rounded-full p-4 ${
            status === 'pending'
              ? 'bg-primary/10'
              : status === 'success'
                ? 'bg-success/10'
                : 'bg-destructive/10'
          }`}
        >
          {status === 'pending' && (
            <Loader2 className="size-8 text-primary animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle className="size-8 text-success" />
          )}
          {status === 'error' && (
            <XCircle className="size-8 text-destructive" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          {status === 'pending' && 'Verifying your email...'}
          {status === 'success' && 'Email verified!'}
          {status === 'error' && 'Verification failed'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {status === 'pending' &&
            'Please wait while we verify your email address.'}
          {status === 'success' && (message || 'Redirecting you to sign in...')}
          {status === 'error' && message}
        </p>
      </div>

      {status === 'error' && (
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full bg-white/5 border-white/10"
            onClick={handleResendEmail}
            disabled={resending}
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Resending...
              </>
            ) : (
              'Request new verification link'
            )}
          </Button>

          <Link
            href="/login"
            className="block text-sm text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      )}

      {status === 'success' && (
        <Link
          href="/login"
          className="inline-block text-sm text-primary hover:underline"
        >
          Continue to sign in
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
