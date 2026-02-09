import { create } from 'zustand';

interface TemplateState {
  // Template mode
  isTemplateMode: boolean;
  templateId: string | null; // ID of template being edited (null for new)
  templateName: string;

  // Merge fields being marked
  markedFields: Array<{ elementId: string; property: string }>;

  // Actions
  enterTemplateMode: (templateId: string | null, name: string) => void;
  exitTemplateMode: () => void;
  toggleMergeField: (elementId: string, property: string) => void;
  isFieldMarked: (elementId: string, property: string) => boolean;
  clearMarkedFields: () => void;
  setMarkedFields: (
    fields: Array<{ elementId: string; property: string }>
  ) => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  isTemplateMode: false,
  templateId: null,
  templateName: '',
  markedFields: [],

  enterTemplateMode: (templateId, name) =>
    set({
      isTemplateMode: true,
      templateId,
      templateName: name,
    }),

  exitTemplateMode: () =>
    set({
      isTemplateMode: false,
      templateId: null,
      templateName: '',
      markedFields: [],
    }),

  toggleMergeField: (elementId, property) =>
    set((state) => {
      const exists = state.markedFields.some(
        (field) => field.elementId === elementId && field.property === property
      );

      if (exists) {
        // Remove the field
        return {
          markedFields: state.markedFields.filter(
            (field) =>
              !(field.elementId === elementId && field.property === property)
          ),
        };
      } else {
        // Add the field
        return {
          markedFields: [...state.markedFields, { elementId, property }],
        };
      }
    }),

  isFieldMarked: (elementId, property) => {
    const state = get();
    return state.markedFields.some(
      (field) => field.elementId === elementId && field.property === property
    );
  },

  clearMarkedFields: () => set({ markedFields: [] }),

  setMarkedFields: (fields) => set({ markedFields: fields }),
}));
