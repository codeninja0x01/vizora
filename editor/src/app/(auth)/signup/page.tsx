'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { Github } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { toast } from 'sonner';

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const id = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Failed to sign up');
        toast.error(result.error.message || 'Failed to sign up');
      } else if (result.data?.user && !result.data.user.emailVerified) {
        toast.success(
          'Account created! Check your email to verify your account.'
        );
        router.push('/verify-email');
      } else {
        toast.success('Account created!');
        router.push('/dashboard');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignUp = async () => {
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/dashboard',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up';
      toast.error(message);
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up';
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1.5">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Create your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Start creating professional videos today
        </p>
      </div>

      {/* Social auth */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
          onClick={handleGitHubSignUp}
          disabled={loading}
        >
          <Github className="mr-2 size-4" />
          GitHub
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
          onClick={handleGoogleSignUp}
          disabled={loading}
        >
          <GoogleIcon />
          <span className="ml-2">Google</span>
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground/60">
            or continue with email
          </span>
        </div>
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailSignUp} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor={`${id}-name`}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Full name
          </label>
          <Input
            id={`${id}-name`}
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            className="h-11 border-white/10 bg-white/5 transition-colors focus-visible:border-primary/50 focus-visible:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${id}-email`}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Email
          </label>
          <Input
            id={`${id}-email`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-11 border-white/10 bg-white/5 transition-colors focus-visible:border-primary/50 focus-visible:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${id}-password`}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Password
          </label>
          <Input
            id={`${id}-password`}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="h-11 border-white/10 bg-white/5 transition-colors focus-visible:border-primary/50 focus-visible:ring-primary/20"
            minLength={8}
          />
          <p className="text-[11px] text-muted-foreground/60">
            Minimum 8 characters
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background:
              'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
          }}
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
