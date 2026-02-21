import { AutoClipLogo } from '@/components/shared/autoclip-logo';

const features = [
  'Auto-generate clips from long-form video',
  'AI captions synced to every word',
  'Batch export to any platform in minutes',
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left atmospheric panel ────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[440px] xl:w-[520px] shrink-0 flex-col justify-between overflow-hidden border-r border-white/[0.06] p-12">
        {/* Ambient glow — cyan from bottom-left */}
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-[480px] w-[480px] rounded-full opacity-30"
          style={{
            background:
              'radial-gradient(circle, oklch(0.68 0.20 210) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Ambient glow — indigo from top-right */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[400px] w-[400px] rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(circle, oklch(0.60 0.24 285) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(oklch(0.75 0 0) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo */}
        <AutoClipLogo size="lg" />

        {/* Brand statement */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Professional Video Tools
            </p>
            <h1 className="font-heading text-[2.6rem] font-bold leading-[1.08] tracking-tight text-foreground">
              Create at the
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(105deg, #22D3EE 0%, #3B82F6 45%, oklch(0.60 0.24 285) 100%)',
                }}
              >
                speed of thought
              </span>
            </h1>
            <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              AI-powered editing that turns raw footage into polished content —
              automatically.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      'linear-gradient(135deg, #22D3EE, oklch(0.60 0.24 285))',
                  }}
                />
                <span className="text-sm text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} AutoClip
        </p>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <AutoClipLogo size="lg" />
        </div>

        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
