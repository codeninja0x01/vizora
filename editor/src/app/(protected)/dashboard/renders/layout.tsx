import { NuqsAdapter } from 'nuqs/adapters/next/app';

/**
 * Layout for renders page
 *
 * Wraps children with NuqsAdapter for URL state management.
 * NuqsAdapter is required for useQueryStates hook to work in Next.js App Router.
 */
export default function RendersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
