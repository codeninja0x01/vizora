import { getRenders } from './actions';
import { RenderList } from './render-list';

export default async function RendersPage() {
  const initialRenders = await getRenders();

  return (
    <div className="space-y-8">
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Renders
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground/70">
          Track your render jobs and view completed videos
        </p>
      </div>

      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <RenderList initialRenders={initialRenders} />
      </div>
    </div>
  );
}
