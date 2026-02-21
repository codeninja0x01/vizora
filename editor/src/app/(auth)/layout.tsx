import { AutoClipLogo } from '@/components/shared/autoclip-logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <AutoClipLogo size="lg" />
          <p className="text-sm text-muted-foreground">
            Create professional videos at scale
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
