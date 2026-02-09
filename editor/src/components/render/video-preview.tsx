'use client';

import { Download } from 'lucide-react';

interface VideoPreviewProps {
  videoUrl: string;
  thumbnailUrl?: string;
  fileName: string;
}

export function VideoPreview({
  videoUrl,
  thumbnailUrl,
  fileName,
}: VideoPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-black/5">
      {/* HTML5 video element */}
      <video
        src={videoUrl}
        poster={thumbnailUrl}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
      >
        Your browser does not support video playback.
      </video>

      {/* Download button */}
      <a
        href={videoUrl}
        download={fileName}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md border border-border/50 bg-background/90 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-background"
      >
        <Download className="size-4" />
        Download
      </a>
    </div>
  );
}
