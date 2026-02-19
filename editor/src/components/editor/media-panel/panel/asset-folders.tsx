'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Plus, ChevronLeft, X } from 'lucide-react';
import { createFolder } from '@/actions/folder-actions';
import { toast } from 'sonner';
import type { AssetFolder } from '@prisma/client';

interface FolderBarProps {
  folders: AssetFolder[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  onFolderCreated: () => void;
}

export function FolderBar({
  folders,
  currentFolderId,
  onNavigate,
  onFolderCreated,
}: FolderBarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Build breadcrumb path
  const getBreadcrumbPath = (): Array<{ id: string | null; name: string }> => {
    const path: Array<{ id: string | null; name: string }> = [
      { id: null, name: 'Root' },
    ];

    if (currentFolderId) {
      const currentFolder = folders.find((f) => f.id === currentFolderId);
      if (currentFolder) {
        // Parse materialized path: /folder1/folder2/current/
        const _segments = currentFolder.path
          .split('/')
          .filter((s) => s.length > 0);

        // For now, just show current folder (can enhance to full breadcrumb later)
        path.push({ id: currentFolder.id, name: currentFolder.name });
      }
    }

    return path;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    try {
      await createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setIsCreating(false);
      onFolderCreated();
      toast.success('Folder created');
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create folder'
      );
    }
  };

  const breadcrumbPath = getBreadcrumbPath();
  const canGoBack = currentFolderId !== null;

  return (
    <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
      {/* Back button */}
      {canGoBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const currentFolder = folders.find((f) => f.id === currentFolderId);
            onNavigate(currentFolder?.parentId || null);
          }}
        >
          <ChevronLeft size={14} />
        </Button>
      )}

      {/* Breadcrumb path */}
      <div className="flex-1 flex items-center gap-1 text-xs text-muted-foreground">
        {breadcrumbPath.map((segment, index) => (
          <div key={segment.id || 'root'} className="flex items-center gap-1">
            {index > 0 && <span>/</span>}
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() => onNavigate(segment.id)}
            >
              {segment.name}
            </button>
          </div>
        ))}
      </div>

      {/* New folder input or button */}
      {isCreating ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              } else if (e.key === 'Escape') {
                setIsCreating(false);
                setNewFolderName('');
              }
            }}
            className="h-7 text-xs w-32"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateFolder}
            className="h-7 px-2"
          >
            <Plus size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreating(false);
              setNewFolderName('');
            }}
            className="h-7 px-2"
          >
            <X size={14} />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="h-7 px-2"
        >
          <Plus size={14} />
          <span className="text-xs ml-1">New</span>
        </Button>
      )}
    </div>
  );
}

interface FolderCardProps {
  folder: AssetFolder & { _count: { assets: number; children: number } };
  onClick: () => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <div
      className="flex flex-col gap-1.5 group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-square rounded-sm overflow-hidden bg-white/5 hover:bg-white/10 border border-transparent group-hover:border-primary/50 transition-all flex items-center justify-center">
        <FolderOpen className="text-amber-500" size={32} />

        {/* Asset count badge */}
        {folder._count.assets > 0 && (
          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-black/60 text-[10px] text-white font-medium">
            {folder._count.assets}
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-[10px] text-muted-foreground group-hover:text-foreground truncate transition-colors px-0.5">
        {folder.name}
      </p>
    </div>
  );
}
