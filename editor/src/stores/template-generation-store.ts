import { create } from 'zustand';
import type { MergeFieldSuggestion } from '@/lib/ai/utils/merge-field-detector';

interface TemplateGenerationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface TemplateGenerationState {
  // Generation state
  selectedStyleId: string;
  isGenerating: boolean;
  generatedTemplate: any | null;
  mergeFields: MergeFieldSuggestion[];
  conversationId: string | null;

  // Chat state
  messages: TemplateGenerationMessage[];

  // Actions
  setStyle: (styleId: string) => void;
  setGenerating: (value: boolean) => void;
  setTemplate: (
    template: any,
    mergeFields: MergeFieldSuggestion[],
    conversationId: string
  ) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  reset: () => void;
  removeMergeField: (elementId: string, property: string) => void;
  addMergeField: (field: MergeFieldSuggestion) => void;
}

export const useTemplateGenerationStore = create<TemplateGenerationState>(
  (set) => ({
    // Initial state
    selectedStyleId: 'corporate',
    isGenerating: false,
    generatedTemplate: null,
    mergeFields: [],
    conversationId: null,
    messages: [],

    // Actions
    setStyle: (styleId) => set({ selectedStyleId: styleId }),

    setGenerating: (value) => set({ isGenerating: value }),

    setTemplate: (template, mergeFields, conversationId) =>
      set({
        generatedTemplate: template,
        mergeFields,
        conversationId,
        isGenerating: false,
      }),

    addMessage: (role, content) =>
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role,
            content,
            timestamp: Date.now(),
          },
        ],
      })),

    reset: () =>
      set({
        selectedStyleId: 'corporate',
        isGenerating: false,
        generatedTemplate: null,
        mergeFields: [],
        conversationId: null,
        messages: [],
      }),

    removeMergeField: (elementId, property) =>
      set((state) => ({
        mergeFields: state.mergeFields.filter(
          (field) =>
            !(field.elementId === elementId && field.property === property)
        ),
      })),

    addMergeField: (field) =>
      set((state) => ({
        mergeFields: [...state.mergeFields, field],
      })),
  })
);
