'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useAssetStore } from '@/stores/asset-store';
import { useStudioStore } from '@/stores/studio-store';
import { usePlaybackStore } from '@/stores/playback-store';
import { Image, Video, Audio, Log } from 'openvideo';
import { toast } from 'sonner';
import type { Asset } from '@prisma/client';

interface TimelineDropZoneProps {
  children: React.ReactNode;
}

/**
 * Timeline drop zone component that handles file drag-and-drop operations.
 * Validates file types (video, audio, image) and size (max 500MB) before uploading.
 * Automatically adds uploaded assets to the timeline at the current playhead position.
 *
 * @param children - Child components to render within the drop zone
 */
export function TimelineDropZone({ children }: TimelineDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { uploadFile } = useAssetStore();
  const { studio } = useStudioStore();
  const { currentTime } = usePlaybackStore();

  // Add asset to timeline at current playhead position
  const addAssetToTimeline = async (asset: Asset) => {
    if (!studio) return;

    try {
      // Convert current time from seconds to microseconds
      const startTime = currentTime * 1e6;

      if (asset.category === 'image') {
        const imageClip = await Image.fromUrl(asset.cdnUrl);
        imageClip.name = asset.name;
        imageClip.display = { from: startTime, to: startTime + 5 * 1e6 };
        imageClip.duration = 5 * 1e6;
        await imageClip.scaleToFit(1080, 1920);
        imageClip.centerInScene(1080, 1920);
        await studio.addClip(imageClip);
      } else if (asset.category === 'audio') {
        const audioClip = await Audio.fromUrl(asset.cdnUrl);
        audioClip.name = asset.name;
        audioClip.display = {
          from: startTime,
          to: startTime + audioClip.duration,
        };
        await studio.addClip(audioClip);
      } else {
        const videoClip = await Video.fromUrl(asset.cdnUrl);
        videoClip.name = asset.name;
        videoClip.display = {
          from: startTime,
          to: startTime + videoClip.duration,
        };
        await videoClip.scaleToFit(1080, 1920);
        videoClip.centerInScene(1080, 1920);
        await studio.addClip(videoClip);
      }
      toast.success(`Added ${asset.name} to timeline`);
    } catch (error) {
      Log.error(`Failed to add ${asset.category}:`, error);
      toast.error(`Failed to add ${asset.category} to timeline`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Only respond to file drops (not internal DnD)
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're actually leaving the drop zone (not just entering a child)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // If cursor is outside the drop zone bounds, clear the state
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDragEnd = () => {
    // Always clear on drag end (handles canceled drags)
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Only handle file drops
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);

    // Validate and upload files
    for (const file of files) {
      // Validate file type
      const validTypes = ['video/', 'audio/', 'image/'];
      if (!validTypes.some((type) => file.type.startsWith(type))) {
        toast.error(`Invalid file type: ${file.name}`);
        continue;
      }

      // Validate file size (500MB limit)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File too large (max 500MB): ${file.name}`);
        continue;
      }

      try {
        // Upload file and auto-add to timeline
        await uploadFile(file, {
          onComplete: addAssetToTimeline,
        });
      } catch (error) {
        Log.error('Failed to upload file:', error);
        toast.error(`Failed to upload: ${file.name}`);
      }
    }
  };

  return (
    <div
      className="relative w-full h-full"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary/40 rounded-lg pointer-events-none">
          <div className="text-center">
            <Upload size={48} className="mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-foreground">
              Drop to upload & add
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
