import { getRenders } from './actions';
import { RenderList } from './render-list';

/**
 * Render history dashboard page
 *
 * Shows all user renders with real-time SSE updates, filters, search, and pagination.
 * Server component provides initial data for fast paint, then client component takes over.
 */
export default async function RendersPage() {
  const initialRenders = await getRenders();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Renders</h1>
        <p className="text-muted-foreground">
          Track your render jobs and view completed videos.
        </p>
      </div>

      <RenderList initialRenders={initialRenders} />
    </div>
  );
}
