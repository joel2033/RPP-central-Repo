import { apiRequest } from "@/lib/queryClient";
import type { 
  EditorServiceCategory, 
  EditorServiceOption, 
  ServiceTemplate,
  EditorServiceChangeLog,
  InsertEditorServiceCategory,
  InsertEditorServiceOption,
  InsertServiceTemplate
} from "@shared/schema";

export const editorServiceApi = {
  // Get editor's service structure
  getEditorServices: async (editorId: string): Promise<(EditorServiceCategory & { options: EditorServiceOption[] })[]> => {
    return await apiRequest("GET", `/api/editor-services/${editorId}`);
  },

  // Categories
  createCategory: async (editorId: string, categoryData: Omit<InsertEditorServiceCategory, "editorId">): Promise<EditorServiceCategory> => {
    return await apiRequest("POST", `/api/editor-services/${editorId}/categories`, categoryData);
  },

  updateCategory: async (categoryId: number, updates: Partial<EditorServiceCategory>): Promise<EditorServiceCategory> => {
    return await apiRequest("PUT", `/api/editor-services/categories/${categoryId}`, updates);
  },

  deleteCategory: async (categoryId: number): Promise<void> => {
    return await apiRequest("DELETE", `/api/editor-services/categories/${categoryId}`);
  },

  // Options
  createOption: async (categoryId: number, optionData: Omit<InsertEditorServiceOption, "categoryId">): Promise<EditorServiceOption> => {
    return await apiRequest("POST", `/api/editor-services/categories/${categoryId}/options`, optionData);
  },

  updateOption: async (optionId: number, updates: Partial<EditorServiceOption>): Promise<EditorServiceOption> => {
    return await apiRequest("PUT", `/api/editor-services/options/${optionId}`, updates);
  },

  deleteOption: async (optionId: number): Promise<void> => {
    return await apiRequest("DELETE", `/api/editor-services/options/${optionId}`);
  },

  // Templates
  getServiceTemplates: async (): Promise<ServiceTemplate[]> => {
    return await apiRequest("GET", "/api/service-templates");
  },

  createServiceTemplate: async (templateData: Omit<InsertServiceTemplate, "licenseeId" | "createdBy">): Promise<ServiceTemplate> => {
    return await apiRequest("POST", "/api/service-templates", templateData);
  },

  applyTemplateToEditor: async (templateId: number, editorId: string): Promise<void> => {
    return await apiRequest("POST", `/api/service-templates/${templateId}/apply/${editorId}`);
  },

  // Change history
  getChangeHistory: async (editorId: string): Promise<EditorServiceChangeLog[]> => {
    return await apiRequest("GET", `/api/editor-services/${editorId}/change-history`);
  },

  // Ordering
  updateCategoryOrder: async (categoryIds: number[]): Promise<void> => {
    return await apiRequest("PUT", "/api/editor-services/categories/order", { categoryIds });
  },

  updateOptionOrder: async (optionIds: number[]): Promise<void> => {
    return await apiRequest("PUT", "/api/editor-services/options/order", { optionIds });
  },
};