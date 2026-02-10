import { getRenders } from './actions';
import { RenderList } from './render-list';

export default async function RendersPage() {
  const initialRenders = await getRenders();

  return (
    <div className="space-y-6">
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="text-2xl font-bold tracking-tight font-heading">
          Renders
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track your render jobs and view completed videos.
        </p>
      </div>

      <div
        className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'both' }}
      >
        <RenderList initialRenders={initialRenders} />
      </div>
    </div>
  );
}
