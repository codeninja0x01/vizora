'use client';

import { HeroVideoPlayer } from '@/remotion/HeroVideoPlayer';
import { VizoraLogo } from '@/components/shared/vizora-logo';
import {
  IconBolt,
  IconBrain,
  IconApi,
  IconTemplate,
  IconVideo,
  IconWand,
  IconDeviceTv,
  IconSubtask,
  IconArrowRight,
  IconPlayerPlay,
  IconPhoto,
  IconChartBar,
  IconBrandGithub,
  IconBrandX,
  IconBrandDiscord,
  IconBrandLinkedin,
  IconCheck,
  IconSparkles,
} from '@tabler/icons-react';
import { motion, useInView } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

/* ─── Animated Section Wrapper ────────────────────────────────────── */

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Gradient Orb Background ─────────────────────────────────────── */

function OrbBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Primary purple orb — top right */}
      <div
        className="absolute -top-[40%] right-[-20%] h-[80vh] w-[80vh] rounded-full opacity-20 blur-[120px]"
        style={{
          background:
            'radial-gradient(circle, oklch(0.55 0.27 285) 0%, transparent 70%)',
        }}
      />
      {/* Secondary cyan orb — bottom left */}
      <div
        className="absolute -bottom-[30%] -left-[20%] h-[70vh] w-[70vh] rounded-full opacity-12 blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, oklch(0.6 0.18 200) 0%, transparent 70%)',
        }}
      />
      {/* Subtle warm accent — center */}
      <div
        className="absolute top-[50%] left-[50%] h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-6 blur-[80px]"
        style={{
          background:
            'radial-gradient(circle, oklch(0.65 0.15 320) 0%, transparent 70%)',
        }}
      />
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle, oklch(1 0 0) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

/* ─── Screenshot Placeholder ──────────────────────────────────────── */

function _ScreenshotPlaceholder({
  label,
  aspect = '16/10',
  id,
}: {
  label: string;
  aspect?: string;
  id: string;
}) {
  return (
    <div
      id={id}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
      style={{ aspectRatio: aspect }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

      {/* Inner glow border */}
      <div className="absolute inset-[1px] rounded-2xl border border-white/[0.04]" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05]">
          <IconPhoto size={24} className="text-white/20" />
        </div>
        <span className="text-sm font-medium text-white/20">{label}</span>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 h-8 w-8">
        <div className="absolute top-0 left-0 h-full w-[1px] bg-gradient-to-b from-purple-500/30 to-transparent" />
        <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-purple-500/30 to-transparent" />
      </div>
      <div className="absolute top-0 right-0 h-8 w-8">
        <div className="absolute top-0 right-0 h-full w-[1px] bg-gradient-to-b from-purple-500/30 to-transparent" />
        <div className="absolute top-0 right-0 h-[1px] w-full bg-gradient-to-l from-purple-500/30 to-transparent" />
      </div>
    </div>
  );
}

/* ─── Feature Card ────────────────────────────────────────────────── */

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: typeof IconBolt;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-500 hover:border-purple-500/20 hover:bg-white/[0.04]">
        {/* Hover glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                'radial-gradient(400px circle at 50% 0%, oklch(0.55 0.27 285 / 0.06), transparent 70%)',
            }}
          />
        </div>

        <div className="relative">
          <div className="mb-4 inline-flex rounded-xl border border-white/[0.06] bg-white/[0.04] p-2.5">
            <Icon size={22} className="text-purple-400" stroke={1.5} />
          </div>
          <h3 className="mb-2 font-heading text-[1.05rem] font-semibold tracking-tight text-white">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-white/50">{description}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Stat Pill ───────────────────────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">
        {value}
      </div>
      <div className="mt-1 text-sm text-white/40">{label}</div>
    </div>
  );
}

/* ─── Pricing Card ────────────────────────────────────────────────── */

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
  delay = 0,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div
        className={`relative h-full rounded-2xl border p-8 transition-all duration-500 ${
          highlighted
            ? 'border-purple-500/30 bg-purple-500/[0.04]'
            : 'border-white/[0.06] bg-white/[0.02]'
        }`}
      >
        {highlighted && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-1 text-xs font-semibold text-white">
            Most Popular
          </div>
        )}
        <div className="mb-6">
          <h3 className="mb-1 font-heading text-lg font-semibold text-white">
            {name}
          </h3>
          <p className="mb-4 text-sm text-white/40">{description}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-4xl font-bold tracking-tight text-white">
              {price}
            </span>
            {price !== 'Custom' && (
              <span className="text-sm text-white/40">/month</span>
            )}
          </div>
        </div>
        <ul className="mb-8 space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <IconCheck
                size={16}
                className={`mt-0.5 shrink-0 ${highlighted ? 'text-purple-400' : 'text-white/30'}`}
              />
              <span className="text-white/60">{f}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/signup"
          className={`inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
            highlighted
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-lg hover:shadow-purple-500/20'
              : 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
          }`}
        >
          Get Started
        </Link>
      </div>
    </Reveal>
  );
}

/* ━━━ MAIN LANDING PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[oklch(0.1_0.01_285)] text-white">
      <OrbBackground />

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 right-0 left-0 z-50 border-b border-white/[0.04] bg-[oklch(0.1_0.01_285)]/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <VizoraLogo size="md" />

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#editor"
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Editor
            </a>
            <a
              href="#pricing"
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Pricing
            </a>
            <a
              href="#team"
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Team
            </a>
            <a
              href="https://docs.vizora.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 transition-colors hover:text-white"
            >
              Docs
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
            >
              Get Started
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-24 md:pt-52 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pr-5 pl-1.5 text-sm backdrop-blur-sm"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              Beta
            </span>
            <span className="text-white/50">
              AI-Powered Video Creation Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="mx-auto max-w-4xl font-heading text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] font-bold tracking-tight"
          >
            Create video at the{' '}
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              speed of thought
            </span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.35,
            }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/45 md:text-xl"
          >
            Professional timeline editor meets AI intelligence. Generate, edit,
            and export stunning videos — from a single prompt or frame by frame.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
            >
              Start Creating — Free
              <IconArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#editor"
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08]"
            >
              <IconPlayerPlay size={16} className="text-purple-400" />
              See it in action
            </a>
          </motion.div>

          {/* Hero Screenshot */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 1,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.65,
            }}
            className="relative mx-auto mt-20 max-w-6xl"
          >
            {/* Glow behind screenshot */}
            <div
              className="absolute -inset-4 -z-10 rounded-3xl opacity-40 blur-3xl"
              style={{
                background:
                  'linear-gradient(135deg, oklch(0.5 0.25 285 / 0.3) 0%, oklch(0.5 0.2 250 / 0.15) 50%, oklch(0.5 0.15 320 / 0.1) 100%)',
              }}
            />

            <HeroVideoPlayer />

            {/* Reflection */}
            <div className="mt-[1px] h-32 overflow-hidden rounded-b-2xl opacity-20 blur-[1px]">
              <div
                className="h-full w-full scale-y-[-1]"
                style={{
                  background:
                    'linear-gradient(to bottom, oklch(0.2 0.01 285), transparent)',
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Social Proof / Stats ─────────────────────────────────── */}
      <section className="border-y border-white/[0.04] py-16">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20">
              <Stat value="10x" label="Faster than traditional editing" />
              <div className="hidden h-8 w-[1px] bg-white/10 md:block" />
              <Stat value="4K" label="Export resolution" />
              <div className="hidden h-8 w-[1px] bg-white/10 md:block" />
              <Stat value="50+" label="Templates & effects" />
              <div className="hidden h-8 w-[1px] bg-white/10 md:block" />
              <Stat value="API" label="Developer friendly" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────── */}
      <section id="features" className="py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block text-sm font-semibold tracking-widest text-purple-400 uppercase">
                Features
              </span>
              <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need to create{' '}
                <span className="text-white/40">professional video</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={IconVideo}
              title="Timeline Editor"
              description="Multi-track timeline with trim, split, transitions, and effects. Full creative control over every frame."
              delay={0}
            />
            <FeatureCard
              icon={IconBrain}
              title="AI Copilot"
              description="Chat-based editing assistant that understands your vision. Describe changes in natural language."
              delay={0.08}
            />
            <FeatureCard
              icon={IconWand}
              title="Text to Video"
              description="Generate complete videos from a text prompt. AI handles scripting, visuals, and narration."
              delay={0.16}
            />
            <FeatureCard
              icon={IconSubtask}
              title="Auto Captions"
              description="AI-powered transcription with perfectly timed captions. Customize style and positioning."
              delay={0.24}
            />
            <FeatureCard
              icon={IconTemplate}
              title="Template System"
              description="Save and reuse templates with dynamic merge fields. Generate variations at scale from CSV."
              delay={0.08}
            />
            <FeatureCard
              icon={IconPhoto}
              title="Stock Library"
              description="Built-in access to millions of stock videos and images from Pexels, Pixabay, and Freepik."
              delay={0.16}
            />
            <FeatureCard
              icon={IconApi}
              title="REST API"
              description="Programmatic access to rendering, templates, and generation. Webhooks for async workflows."
              delay={0.24}
            />
            <FeatureCard
              icon={IconDeviceTv}
              title="Social Presets"
              description="One-click export for TikTok, Reels, Shorts, and more. Optimal formats and resolutions."
              delay={0.32}
            />
          </div>
        </div>
      </section>

      {/* ── Editor Showcase ──────────────────────────────────────── */}
      <section id="editor" className="py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <Reveal>
              <div>
                <span className="mb-4 inline-block text-sm font-semibold tracking-widest text-purple-400 uppercase">
                  Professional Editor
                </span>
                <h2 className="mb-6 font-heading text-3xl font-bold tracking-tight md:text-4xl">
                  A timeline built for{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    creative flow
                  </span>
                </h2>
                <p className="mb-8 max-w-lg text-base leading-relaxed text-white/45">
                  Multi-track video, audio, text, and effects on a precision
                  timeline. Client-side rendering with WebCodecs means instant
                  preview — no waiting for cloud processing.
                </p>

                <div className="space-y-4">
                  {[
                    'Drag-and-drop clips, trim, split, and resize',
                    'Built-in transitions, effects, and text overlays',
                    'Real-time preview powered by WebCodecs API',
                    'Undo/redo with full history tracking',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                        <IconCheck
                          size={12}
                          className="text-purple-400"
                          stroke={2.5}
                        />
                      </div>
                      <span className="text-sm text-white/60">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06]">
                <Image
                  src="/screenshots/editor.png"
                  alt="Vizora Editor — multi-track timeline with AI Copilot"
                  width={1200}
                  height={750}
                  className="w-full transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-[oklch(0.1_0.01_285)] via-transparent to-transparent opacity-40" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Dashboard Showcase ───────────────────────────────────── */}
      <section className="py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06]">
                <Image
                  src="/screenshots/dashboard.png"
                  alt="Vizora Dashboard — stats, renders, and quick actions"
                  width={1200}
                  height={750}
                  className="w-full transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-[oklch(0.1_0.01_285)] via-transparent to-transparent opacity-40" />
              </div>
            </Reveal>

            <Reveal delay={0.15} className="order-1 lg:order-2">
              <div>
                <span className="mb-4 inline-block text-sm font-semibold tracking-widest text-purple-400 uppercase">
                  Dashboard
                </span>
                <h2 className="mb-6 font-heading text-3xl font-bold tracking-tight md:text-4xl">
                  Manage everything{' '}
                  <span className="text-white/40">in one place</span>
                </h2>
                <p className="mb-8 max-w-lg text-base leading-relaxed text-white/45">
                  Track renders, manage templates, monitor API usage, and
                  control billing — all from a clean, powerful dashboard.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: IconChartBar, label: 'Analytics & Usage' },
                    { icon: IconTemplate, label: 'Template Library' },
                    { icon: IconApi, label: 'API Keys & Webhooks' },
                    { icon: IconBolt, label: 'Bulk Generation' },
                  ].map(({ icon: I, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
                    >
                      <I size={18} className="shrink-0 text-purple-400/70" />
                      <span className="text-sm text-white/55">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── AI Highlight ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-white/[0.04] py-28 md:py-36">
        {/* Accent glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 50%, oklch(0.5 0.25 285 / 0.06), transparent)',
          }}
        />

        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/[0.08] px-4 py-1.5 text-sm">
              <IconBrain size={14} className="text-purple-400" />
              <span className="text-purple-300">Powered by AI</span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="mb-6 font-heading text-3xl font-bold tracking-tight md:text-5xl">
              Describe it. Vizora builds it.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-white/40">
              From a single sentence to a fully produced video. AI generates
              scripts, selects visuals, adds voiceover and captions — then hands
              you full editing control to refine every detail.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            {/* Prompt mockup */}
            <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4">
                <IconSparkles size={18} className="shrink-0 text-purple-400" />
                <span className="text-left text-sm text-white/35 italic">
                  &ldquo;Create a 30-second product demo with upbeat music,
                  kinetic text, and a call to action…&rdquo;
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-white/25">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
                AI generates script → selects media → adds voiceover → exports
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block text-sm font-semibold tracking-widest text-purple-400 uppercase">
                Pricing
              </span>
              <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
                Start free, scale as you grow
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-white/40">
                Generous free tier for creators. Predictable pricing for teams
                and enterprises.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <PricingCard
              name="Starter"
              price="$0"
              description="Perfect for trying things out"
              features={[
                '10 renders per month',
                '720p export quality',
                'AI Copilot (limited)',
                'Community templates',
                'Watermarked exports',
              ]}
              delay={0}
            />
            <PricingCard
              name="Pro"
              price="$29"
              description="For creators and small teams"
              features={[
                '200 renders per month',
                '4K export quality',
                'Full AI Copilot access',
                'Custom templates',
                'API access & webhooks',
                'No watermark',
              ]}
              highlighted
              delay={0.1}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              description="For teams at scale"
              features={[
                'Unlimited renders',
                '4K export quality',
                'Full AI suite',
                'Priority support',
                'Custom integrations',
                'Dedicated account manager',
              ]}
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── Team ──────────────────────────────────────────────────── */}
      <section id="team" className="relative overflow-hidden py-28 md:py-36">
        {/* Section accent glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 50% 60% at 50% 40%, oklch(0.5 0.25 285 / 0.05), transparent)',
          }}
        />

        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mb-20 text-center">
              <span className="mb-4 inline-block text-sm font-semibold tracking-widest text-purple-400 uppercase">
                Our Team
              </span>
              <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
                The people behind{' '}
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Vizora
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="mx-auto max-w-lg">
            <Reveal delay={0.1}>
              <div className="group relative">
                {/* Outer glow on hover */}
                <div
                  className="pointer-events-none absolute -inset-[1px] rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{
                    background:
                      'linear-gradient(135deg, oklch(0.55 0.27 285 / 0.2), oklch(0.5 0.2 250 / 0.1), oklch(0.55 0.27 285 / 0.2))',
                  }}
                />

                <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-10 backdrop-blur-sm">
                  {/* Decorative corner lines */}
                  <div className="absolute top-0 left-0 h-16 w-16">
                    <div className="absolute top-0 left-0 h-full w-[1px] bg-gradient-to-b from-purple-500/40 to-transparent" />
                    <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-purple-500/40 to-transparent" />
                  </div>
                  <div className="absolute right-0 bottom-0 h-16 w-16">
                    <div className="absolute right-0 bottom-0 h-full w-[1px] bg-gradient-to-t from-purple-500/40 to-transparent" />
                    <div className="absolute right-0 bottom-0 h-[1px] w-full bg-gradient-to-l from-purple-500/40 to-transparent" />
                  </div>

                  <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:text-left">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl">
                        {/* Gradient background */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(135deg, oklch(0.45 0.25 285) 0%, oklch(0.4 0.2 260) 50%, oklch(0.35 0.15 285) 100%)',
                          }}
                        />
                        {/* Noise texture overlay */}
                        <div
                          className="absolute inset-0 opacity-20 mix-blend-overlay"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                          }}
                        />
                        <span className="relative text-3xl font-bold text-white">
                          R
                        </span>
                      </div>
                      {/* Status indicator */}
                      <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-lg border-2 border-[oklch(0.1_0.01_285)] bg-gradient-to-br from-purple-500 to-indigo-500">
                        <IconSparkles size={12} className="text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col items-center sm:items-start">
                      <div className="mb-1 flex items-center gap-3">
                        <h3 className="font-heading text-xl font-bold tracking-tight text-white">
                          Robel
                        </h3>
                        <span className="rounded-md bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                          Founder
                        </span>
                      </div>

                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">
                        Software engineer with over a decade of experience
                        building scalable products. Passionate about making
                        professional video creation accessible to everyone
                        through AI.
                      </p>

                      {/* Stats row */}
                      <div className="mt-5 flex items-center gap-5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                            <IconBolt
                              size={14}
                              className="text-purple-400"
                              stroke={1.5}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white/70">
                              10+
                            </div>
                            <div className="text-[10px] text-white/30">
                              Years Exp.
                            </div>
                          </div>
                        </div>

                        <div className="h-6 w-[1px] bg-white/[0.06]" />

                        <a
                          href="https://www.linkedin.com/in/robel-talele/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/link flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm transition-all duration-300 hover:border-[#0A66C2]/30 hover:bg-[#0A66C2]/10"
                        >
                          <IconBrandLinkedin
                            size={16}
                            className="text-white/40 transition-colors group-hover/link:text-[#0A66C2]"
                          />
                          <span className="text-xs font-medium text-white/50 transition-colors group-hover/link:text-white/70">
                            Connect
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="relative py-28 md:py-36">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 60%, oklch(0.5 0.25 285 / 0.08), transparent)',
          }}
        />

        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="mb-6 font-heading text-4xl font-bold tracking-tight md:text-5xl">
              Ready to create?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mb-10 text-lg text-white/40">
              Join thousands of creators using Vizora to produce professional
              video at scale.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
            >
              Get Started — It&apos;s Free
              <IconArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-1">
              <VizoraLogo size="sm" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/30">
                AI-powered video creation platform for creators, teams, and
                developers.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white/60">
                Product
              </h4>
              <ul className="space-y-2.5 text-sm text-white/30">
                <li>
                  <a href="#features" className="hover:text-white/60">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white/60">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#editor" className="hover:text-white/60">
                    Editor
                  </a>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white/60">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white/60">
                Developers
              </h4>
              <ul className="space-y-2.5 text-sm text-white/30">
                <li>
                  <span className="cursor-default hover:text-white/60">
                    API Reference
                  </span>
                </li>
                <li>
                  <span className="cursor-default hover:text-white/60">
                    Documentation
                  </span>
                </li>
                <li>
                  <span className="cursor-default hover:text-white/60">
                    Webhooks
                  </span>
                </li>
                <li>
                  <span className="cursor-default hover:text-white/60">
                    Status
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white/60">
                Company
              </h4>
              <ul className="space-y-2.5 text-sm text-white/30">
                <li>
                  <span className="cursor-default hover:text-white/60">
                    About
                  </span>
                </li>
                <li>
                  <span className="cursor-default hover:text-white/60">
                    Blog
                  </span>
                </li>
                <li>
                  <span className="cursor-default hover:text-white/60">
                    Privacy
                  </span>
                </li>
                <li>
                  <span className="cursor-default hover:text-white/60">
                    Terms
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 md:flex-row">
            <span className="text-sm text-white/20">
              &copy; {new Date().getFullYear()} Vizora. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <span className="cursor-default text-white/20 transition-colors hover:text-white/50">
                <IconBrandGithub size={18} />
              </span>
              <span className="cursor-default text-white/20 transition-colors hover:text-white/50">
                <IconBrandX size={18} />
              </span>
              <span className="cursor-default text-white/20 transition-colors hover:text-white/50">
                <IconBrandDiscord size={18} />
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
