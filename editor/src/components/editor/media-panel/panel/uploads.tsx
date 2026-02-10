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
    <div className="flex flex-col gap-2 group relative">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center shadow-sm">
        {/* Preview if available */}
        {/* biome-ignore lint/performance/noImgElement: blob URL preview during upload */}
        {asset.previewUrl && !isError && (
          <img
            src={asset.previewUrl}
            alt={asset.name}
            className="max-w-full max-h-full object-contain opacity-50"
          />
        )}

        {/* Error indicator */}
        {isError && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <AlertTriangle
              className="text-destructive"
              size={28}
              strokeWidth={2}
            />
            <p className="text-[10px] text-destructive text-center font-medium">
              Upload failed
            </p>
          </div>
        )}

        {/* Loading indicator */}
        {!isError && asset.status !== 'complete' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-sm">
            <Loader2 className="text-primary animate-spin" size={24} />
            <p className="text-[10px] text-muted-foreground font-medium">
              {Math.round(asset.progress)}%
            </p>
          </div>
        )}

        {/* Progress bar at bottom */}
        {!isError && asset.status === 'uploading' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/80">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${asset.progress}%` }}
            />
          </div>
        )}

        {/* Remove button */}
        {isError && (
          <button
            type="button"
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/90 hover:bg-destructive transition-colors shadow-lg"
            onClick={() => onRemove(asset.id)}
          >
            <Trash2 size={12} className="text-white" />
          </button>
        )}
      </div>

      {/* Label */}
      <p className="text-[11px] text-foreground/70 font-medium truncate px-1 text-center">
        {asset.name}
      </p>

      {/* Error message */}
      {isError && asset.error && (
        <p className="text-[9px] text-destructive/80 truncate px-1 text-center">
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
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'image':
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/30 group-hover:border-blue-500/50';
      case 'audio':
        return 'from-emerald-500/10 to-green-500/10 border-emerald-500/30 group-hover:border-emerald-500/50';
      case 'video':
        return 'from-purple-500/10 to-pink-500/10 border-purple-500/30 group-hover:border-purple-500/50';
      default:
        return 'from-muted/50 to-muted/30 border-border/50 group-hover:border-primary/50';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent handlers
    onAdd(asset);
  };

  return (
    <div
      className="flex flex-col gap-2 group cursor-pointer"
      onClick={handleClick}
    >
      <div
        className={`relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br border-2 transition-all flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-[1.02] ${getCategoryColor(asset.category)}`}
      >
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
              className="text-emerald-500"
              size={36}
              strokeWidth={1.5}
              fill="currentColor"
              fillOpacity={0.2}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/20 relative">
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

        {/* Category badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-sm text-[9px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          {asset.category}
        </div>

        {/* Remove Button */}
        <button
          type="button"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/90 hover:bg-destructive opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(asset.id);
          }}
        >
          <Trash2 size={12} className="text-white" />
        </button>

        {/* Click hint overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute bottom-2 left-0 right-0 text-center text-white text-[10px] font-semibold">
            Click to add
          </div>
        </div>
      </div>

      {/* Label */}
      <p className="text-[11px] text-foreground/80 group-hover:text-foreground font-medium truncate transition-colors px-1 text-center">
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
    noClick: true, // Disable click on the entire area
    noKeyboard: true,
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
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-background/50">
      {/* Search Header - Only show when has assets */}
      {hasAssets && (
        <div className="p-3 shrink-0">
          <InputGroup className="shadow-sm">
            <InputGroupAddon className="bg-muted/50 pointer-events-none text-muted-foreground w-9 justify-center">
              <Search size={14} />
            </InputGroupAddon>

            <InputGroupInput
              placeholder="Search assets..."
              className="bg-muted/50 border-border/50 h-9 text-xs box-border pl-0 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      )}

      {/* Folder navigation bar */}
      <FolderBar
        folders={folders}
        currentFolderId={currentFolderId}
        onNavigate={setCurrentFolderId}
        onFolderCreated={handleFolderCreated}
      />

      {/* Drop zone wrapper - Only drag and drop, no click */}
      <ScrollArea className="flex-1 px-3">
        <div
          {...getRootProps()}
          className="relative min-h-full pb-3 outline-none"
        >
          {/* Hidden file input */}
          <input {...getInputProps()} id="dropzone-input" />

          {/* Drag overlay with improved visual design */}
          {isDragActive && (
            <div className="absolute inset-x-0 top-4 bottom-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-dashed border-primary rounded-2xl backdrop-blur-md animate-in fade-in duration-200 m-2 pointer-events-none">
              <div className="text-center space-y-6 p-10 rounded-2xl bg-background/90 backdrop-blur-sm border-2 border-primary/30 shadow-2xl shadow-primary/20">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center animate-pulse">
                  <Upload
                    size={40}
                    className="text-primary"
                    strokeWidth={2.5}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-foreground">
                    Drop your files here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Videos, images, and audio supported
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state with improved design */}
          {!hasAssets && !isDragActive && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4 animate-in fade-in duration-300 pointer-events-none">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center shadow-lg border-2 border-border/50">
                  <Upload size={36} className="text-primary" strokeWidth={2} />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg animate-bounce">
                  <span className="text-white text-xs font-bold">+</span>
                </div>
              </div>
              <div className="space-y-2 max-w-[220px]">
                <div className="text-sm font-semibold text-foreground">
                  No assets yet
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  Drag & drop your media files anywhere, or click the button
                  below
                </div>
              </div>
              {/* Clickable upload zone */}
              <button
                type="button"
                onClick={() =>
                  document.getElementById('dropzone-input')?.click()
                }
                className="mt-2 px-6 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all cursor-pointer pointer-events-auto group"
              >
                <div className="flex items-center gap-2.5">
                  <Upload
                    size={18}
                    className="text-primary group-hover:scale-110 transition-transform"
                  />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">
                      Click to upload
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      or drag and drop
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Assets grid */}
          {hasAssets && (
            <div className="space-y-4">
              {/* Clickable drop zone hint when has assets */}
              {!isDragActive && (
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('dropzone-input')?.click()
                  }
                  className="w-full rounded-xl border-2 border-dashed border-border/30 bg-muted/20 p-4 text-center hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Upload
                      size={16}
                      className="text-muted-foreground group-hover:text-primary transition-colors"
                    />
                    <p className="text-xs text-muted-foreground group-hover:text-foreground font-medium transition-colors">
                      Drag & drop files here or{' '}
                      <span className="text-primary font-semibold">
                        click to upload
                      </span>
                    </p>
                  </div>
                </button>
              )}

              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2.5">
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
