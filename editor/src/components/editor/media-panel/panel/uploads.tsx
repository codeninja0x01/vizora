'use client';

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore } from '@/stores/studio-store';
import { useAssetStore } from '@/stores/asset-store';
import { Image, Video, Audio, Log } from 'openvideo';
import {
  Upload,
  Search,
  Trash2,
  Music,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getAssets, deleteAsset } from '@/actions/asset-actions';
import type { Asset } from '@prisma/client';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/storage/validation';
import { getFolders } from '@/actions/folder-actions';
import { FolderBar, FolderCard } from './asset-folders';
import type { AssetFolder } from '@prisma/client';

// Helper to format duration like 00:00 (unused but kept for potential future use)
function _formatDuration(seconds?: number) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Uploading asset card (shows progress inline on thumbnail)
function UploadingAssetCard({
  asset,
  onRemove,
}: {
  asset: {
    id: string;
    name: string;
    progress: number;
    status: string;
    error?: string;
    previewUrl?: string;
  };
  onRemove: (id: string) => void;
}) {
  const isError = asset.status === 'error';

  return (
    <div className="flex flex-col gap-1.5 group relative">
      <div className="relative aspect-square rounded-sm overflow-hidden bg-foreground/20 border border-transparent flex items-center justify-center">
        {/* Preview if available */}
        {/* biome-ignore lint/performance/noImgElement: blob URL preview during upload */}
        {asset.previewUrl && !isError && (
          <img
            src={asset.previewUrl}
            alt={asset.name}
            className="max-w-full max-h-full object-contain opacity-60"
          />
        )}

        {/* Error indicator */}
        {isError && (
          <div className="w-full h-full flex items-center justify-center">
            <AlertTriangle className="text-destructive" size={32} />
          </div>
        )}

        {/* Loading indicator */}
        {!isError && asset.status !== 'complete' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        )}

        {/* Progress bar at bottom */}
        {!isError && asset.status === 'uploading' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${asset.progress}%` }}
            />
          </div>
        )}

        {/* Remove button */}
        {isError && (
          <button
            type="button"
            className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-destructive transition-colors"
            onClick={() => onRemove(asset.id)}
          >
            <Trash2 size={12} className="text-white" />
          </button>
        )}
      </div>

      {/* Label */}
      <p className="text-[10px] text-muted-foreground truncate px-0.5">
        {asset.name}
      </p>

      {/* Error message */}
      {isError && asset.error && (
        <p className="text-[9px] text-destructive truncate px-0.5">
          {asset.error}
        </p>
      )}
    </div>
  );
}

// Asset card component (DB-backed)
function AssetCard({
  asset,
  onAdd,
  onDelete,
}: {
  asset: Asset;
  onAdd: (asset: Asset) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 group cursor-pointer"
      onClick={() => onAdd(asset)}
    >
      <div className="relative aspect-square rounded-sm overflow-hidden bg-foreground/20 border border-transparent group-hover:border-primary/50 transition-all flex items-center justify-center">
        {/* biome-ignore lint/performance/noImgElement: CDN URL from R2, not Next.js optimized */}
        {asset.category === 'image' ? (
          <img
            src={asset.cdnUrl}
            alt={asset.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : asset.category === 'audio' ? (
          <div className="w-full h-full flex items-center justify-center relative">
            <Music
              className="text-[#2dc28c]"
              size={32}
              fill="#2dc28c"
              fillOpacity={0.2}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/40 relative">
            {/* biome-ignore lint/a11y/useKeyWithMouseEvents: video preview on hover for visual feedback */}
            <video
              src={asset.cdnUrl}
              className="max-w-full max-h-full object-contain pointer-events-none"
              muted
              onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLVideoElement).pause();
                (e.currentTarget as HTMLVideoElement).currentTime = 0;
              }}
            />
          </div>
        )}

        {/* Remove Button (Minimalist on Hover) */}
        <button
          type="button"
          className="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(asset.id);
          }}
        >
          <Trash2 size={12} className="text-white" />
        </button>
      </div>

      {/* Label (External) */}
      <p className="text-[10px] text-muted-foreground group-hover:text-foreground truncate transition-colors px-0.5">
        {asset.name}
      </p>
    </div>
  );
}

export default function PanelUploads() {
  const { studio } = useStudioStore();
  const {
    assets,
    uploading,
    searchQuery,
    isLoading,
    setAssets,
    setSearchQuery,
    uploadFile,
    removeUploading,
    deleteAssetLocal,
    currentFolderId,
    setCurrentFolderId,
    folders,
    setFolders,
  } = useAssetStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Load assets and folders on mount and when currentFolderId changes
  useEffect(() => {
    const loadData = async () => {
      try {
        useAssetStore.setState({ isLoading: true });

        // Load folders and assets in parallel
        const [fetchedFolders, fetchedAssets] = await Promise.all([
          getFolders(currentFolderId),
          getAssets({
            folderId: currentFolderId,
            search: searchQuery || undefined,
          }),
        ]);

        setFolders(fetchedFolders);
        setAssets(fetchedAssets);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load assets');
      } finally {
        useAssetStore.setState({ isLoading: false });
      }
    };

    loadData();
  }, [currentFolderId, searchQuery, setAssets, setFolders]);

  // react-dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        await uploadFile(file);
      }
    },
    maxSize: MAX_FILE_SIZE,
    accept: {
      'video/*': ALLOWED_FILE_TYPES.video.extensions.map((ext) => `.${ext}`),
      'image/*': ALLOWED_FILE_TYPES.image.extensions.map((ext) => `.${ext}`),
      'audio/*': ALLOWED_FILE_TYPES.audio.extensions.map((ext) => `.${ext}`),
    },
    noClick: false,
  });

  // Handle delete with confirmation
  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    try {
      const result = await deleteAsset(deleteTargetId);

      if (result.success) {
        deleteAssetLocal(deleteTargetId);
        toast.success('Asset deleted');
      } else {
        toast.error(result.error || 'Failed to delete asset');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete asset');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  // Add item to canvas
  const addItemToCanvas = async (asset: Asset) => {
    if (!studio) return;

    try {
      if (asset.category === 'image') {
        const imageClip = await Image.fromUrl(asset.cdnUrl);
        imageClip.name = asset.name;
        imageClip.display = { from: 0, to: 5 * 1e6 };
        imageClip.duration = 5 * 1e6;
        await imageClip.scaleToFit(1080, 1920);
        imageClip.centerInScene(1080, 1920);
        await studio.addClip(imageClip);
      } else if (asset.category === 'audio') {
        const audioClip = await Audio.fromUrl(asset.cdnUrl);
        audioClip.name = asset.name;
        await studio.addClip(audioClip);
      } else {
        const videoClip = await Video.fromUrl(asset.cdnUrl);
        videoClip.name = asset.name;
        await videoClip.scaleToFit(1080, 1920);
        videoClip.centerInScene(1080, 1920);
        await studio.addClip(videoClip);
      }
    } catch (error) {
      Log.error(`Failed to add ${asset.category}:`, error);
      toast.error(`Failed to add ${asset.category} to canvas`);
    }
  };

  // Filter assets by search query
  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reload folders after creation
  const handleFolderCreated = async () => {
    try {
      const fetchedFolders = await getFolders(currentFolderId);
      setFolders(fetchedFolders);
    } catch (error) {
      console.error('Failed to reload folders:', error);
    }
  };

  // Convert uploading Map to array for rendering
  const uploadingArray = Array.from(uploading.values());

  if (
    isLoading &&
    assets.length === 0 &&
    uploadingArray.length === 0 &&
    folders.length === 0
  ) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const hasAssets =
    assets.length > 0 || uploadingArray.length > 0 || folders.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Search and Upload Header */}
      {hasAssets ? (
        <div className="p-4 flex gap-2">
          <InputGroup>
            <InputGroupAddon className="bg-secondary/30 pointer-events-none text-muted-foreground w-8 justify-center">
              <Search size={14} />
            </InputGroupAddon>

            <InputGroupInput
              placeholder="Search assets..."
              className="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <Button
            onClick={() => document.getElementById('dropzone-input')?.click()}
            variant={'outline'}
          >
            <Upload size={14} />
          </Button>
        </div>
      ) : (
        <div className="p-4 flex gap-2">
          <Button
            onClick={() => document.getElementById('dropzone-input')?.click()}
            variant={'outline'}
            className="w-full"
          >
            <Upload size={14} /> Upload
          </Button>
        </div>
      )}

      {/* Folder navigation bar */}
      <FolderBar
        folders={folders}
        currentFolderId={currentFolderId}
        onNavigate={setCurrentFolderId}
        onFolderCreated={handleFolderCreated}
      />

      {/* Drop zone wrapper */}
      <ScrollArea className="flex-1 px-4">
        <div {...getRootProps()} className="relative min-h-full">
          {/* biome-ignore lint/correctness/useUniqueElementIds: single instance in uploads panel */}
          <input {...getInputProps()} id="dropzone-input" />

          {/* Drag overlay */}
          {isDragActive && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg">
              <div className="text-center">
                <Upload size={32} className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Drop files here</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasAssets && !isDragActive && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Upload size={32} className="opacity-50" />
              <span className="text-sm">No assets yet</span>
              <span className="text-xs opacity-70">
                Drag & drop files or click upload
              </span>
            </div>
          )}

          {/* Assets grid */}
          {hasAssets && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-x-3 gap-y-4 pb-4">
              {/* Uploading assets at top */}
              {uploadingArray.map((upload) => (
                <UploadingAssetCard
                  key={upload.id}
                  asset={upload}
                  onRemove={removeUploading}
                />
              ))}

              {/* Folders (above assets) */}
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => setCurrentFolderId(folder.id)}
                />
              ))}

              {/* DB assets */}
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onAdd={addItemToCanvas}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The asset will be permanently
              removed from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
