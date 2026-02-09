import { create } from 'zustand';
import type { Asset, AssetFolder } from '@prisma/client';
import { requestPresignedUrl, registerAsset } from '@/actions/asset-actions';
import { validateFileType, validateFileSize } from '@/lib/storage/validation';

interface UploadingAsset {
  id: string; // Temporary ID during upload
  name: string;
  progress: number; // 0-100
  status: 'uploading' | 'registering' | 'complete' | 'error';
  error?: string;
  previewUrl?: string; // Object URL for immediate preview
  file: File; // Keep file reference for upload
}

interface AssetStoreState {
  assets: Asset[]; // From DB
  folders: AssetFolder[]; // From DB
  currentFolderId: string | null; // null = root
  uploading: Map<string, UploadingAsset>;
  isLoading: boolean;
  searchQuery: string;
  categoryFilter: string | null;

  // Actions
  setAssets: (assets: Asset[]) => void;
  setFolders: (folders: AssetFolder[]) => void;
  setCurrentFolderId: (id: string | null) => void;
  addUploading: (asset: UploadingAsset) => void;
  updateUploadProgress: (id: string, progress: number) => void;
  completeUpload: (id: string, dbAsset: Asset) => void;
  failUpload: (id: string, error: string) => void;
  removeUploading: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  deleteAssetLocal: (id: string) => void;

  // Shared upload helper
  uploadFile: (
    file: File,
    options?: { autoAddToCanvas?: boolean; onComplete?: (asset: Asset) => void }
  ) => Promise<Asset | null>;
}

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  assets: [],
  folders: [],
  currentFolderId: null,
  uploading: new Map(),
  isLoading: false,
  searchQuery: '',
  categoryFilter: null,

  setAssets: (assets) => set({ assets }),
  setFolders: (folders) => set({ folders }),
  setCurrentFolderId: (id) => set({ currentFolderId: id }),

  addUploading: (asset) =>
    set((state) => {
      const newUploading = new Map(state.uploading);
      newUploading.set(asset.id, asset);
      return { uploading: newUploading };
    }),

  updateUploadProgress: (id, progress) =>
    set((state) => {
      const newUploading = new Map(state.uploading);
      const existing = newUploading.get(id);
      if (existing) {
        newUploading.set(id, { ...existing, progress });
      }
      return { uploading: newUploading };
    }),

  completeUpload: (id, dbAsset) =>
    set((state) => {
      const newUploading = new Map(state.uploading);
      newUploading.delete(id);
      return {
        uploading: newUploading,
        assets: [dbAsset, ...state.assets],
      };
    }),

  failUpload: (id, error) =>
    set((state) => {
      const newUploading = new Map(state.uploading);
      const existing = newUploading.get(id);
      if (existing) {
        newUploading.set(id, { ...existing, status: 'error', error });
      }
      return { uploading: newUploading };
    }),

  removeUploading: (id) =>
    set((state) => {
      const newUploading = new Map(state.uploading);
      newUploading.delete(id);
      return { uploading: newUploading };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  deleteAssetLocal: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),

  // Shared upload helper used by panel, canvas, and timeline drop zones
  uploadFile: async (file, options = {}) => {
    const tempId = crypto.randomUUID();
    const {
      addUploading,
      updateUploadProgress,
      failUpload,
      completeUpload,
      currentFolderId,
    } = get();

    try {
      // Validate file size
      const sizeValidation = validateFileSize(file.size);
      if (!sizeValidation.valid) {
        failUpload(
          tempId,
          sizeValidation.error || 'File size validation failed'
        );
        return null;
      }

      // Create object URL for immediate preview
      const previewUrl = URL.createObjectURL(file);

      // Add to uploading map
      addUploading({
        id: tempId,
        name: file.name,
        progress: 0,
        status: 'uploading',
        previewUrl,
        file,
      });

      // Validate file type via magic bytes
      const buffer = await file.slice(0, 4100).arrayBuffer();
      const validation = await validateFileType(
        new Uint8Array(buffer),
        file.type
      );
      if (!validation.valid) {
        failUpload(tempId, validation.error || 'File type validation failed');
        setTimeout(() => {
          URL.revokeObjectURL(previewUrl);
        }, 3000);
        return null;
      }

      const category = validation.category || 'image';

      // Request presigned URL
      const presignedData = await requestPresignedUrl({
        filename: file.name,
        contentType: file.type,
        size: file.size,
        folderId: currentFolderId || undefined,
      });

      // Upload to R2 with XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateUploadProgress(tempId, progress);
          }
        });

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Upload failed'));
        };

        xhr.open('PUT', presignedData.presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Register asset in database
      const dbAsset = await registerAsset({
        r2Key: presignedData.r2Key,
        name: file.name,
        contentType: file.type,
        size: file.size,
        category,
        folderId: currentFolderId || undefined,
      });

      // Complete upload
      completeUpload(tempId, dbAsset);
      URL.revokeObjectURL(previewUrl);

      // Call onComplete callback if provided
      if (options.onComplete) {
        options.onComplete(dbAsset);
      }

      return dbAsset;
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      failUpload(tempId, errorMsg);
      return null;
    }
  },
}));
