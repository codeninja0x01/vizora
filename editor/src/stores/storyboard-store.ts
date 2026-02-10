import { create } from 'zustand';

export interface Scene {
  id: string;
  description: string;
  duration: number;
  textOverlay: string;
}

interface StoryboardState {
  scenes: Scene[];
  selectedStyleId: string;
  isGenerating: boolean;
  composition: any | null;
  scenesWithClips: any[];

  addScene: () => void;
  removeScene: (id: string) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  setStyle: (styleId: string) => void;
  setGenerating: (value: boolean) => void;
  setComposition: (composition: any, scenesWithClips: any[]) => void;
  reset: () => void;
}

const createDefaultScenes = (): Scene[] => [
  { id: crypto.randomUUID(), description: '', duration: 3, textOverlay: '' },
  { id: crypto.randomUUID(), description: '', duration: 5, textOverlay: '' },
  { id: crypto.randomUUID(), description: '', duration: 3, textOverlay: '' },
];

export const useStoryboardStore = create<StoryboardState>((set) => ({
  scenes: createDefaultScenes(),
  selectedStyleId: 'corporate',
  isGenerating: false,
  composition: null,
  scenesWithClips: [],

  addScene: () =>
    set((state) => ({
      scenes: [
        ...state.scenes,
        {
          id: crypto.randomUUID(),
          description: '',
          duration: 5,
          textOverlay: '',
        },
      ],
    })),

  removeScene: (id) =>
    set((state) => ({
      scenes: state.scenes.filter((scene) => scene.id !== id),
    })),

  updateScene: (id, updates) =>
    set((state) => ({
      scenes: state.scenes.map((scene) =>
        scene.id === id ? { ...scene, ...updates } : scene
      ),
    })),

  reorderScenes: (fromIndex, toIndex) =>
    set((state) => {
      const newScenes = [...state.scenes];
      const [movedScene] = newScenes.splice(fromIndex, 1);
      newScenes.splice(toIndex, 0, movedScene);
      return { scenes: newScenes };
    }),

  setStyle: (styleId) => set({ selectedStyleId: styleId }),

  setGenerating: (value) => set({ isGenerating: value }),

  setComposition: (composition, scenesWithClips) =>
    set({ composition, scenesWithClips, isGenerating: false }),

  reset: () =>
    set({
      scenes: createDefaultScenes(),
      selectedStyleId: 'corporate',
      isGenerating: false,
      composition: null,
      scenesWithClips: [],
    }),
}));
