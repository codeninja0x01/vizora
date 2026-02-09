import type { Asset, AssetFolder } from '@prisma/client';

export type AssetCategory = 'video' | 'image' | 'audio';

export type AssetWithFolder = Asset & {
  folder: AssetFolder | null;
};

export type AssetFolderWithChildren = AssetFolder & {
  children: AssetFolder[];
  _count: {
    assets: number;
    children: number;
  };
};
