import { db } from "../db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  editorServiceCategories,
  editorServiceOptions,
  serviceTemplates,
  editorServiceChangeLogs,
  type EditorServiceCategory,
  type EditorServiceOption,
  type ServiceTemplate,
  type EditorServiceChangeLog,
  type InsertEditorServiceCategory,
  type InsertEditorServiceOption,
  type InsertServiceTemplate,
  type InsertEditorServiceChangeLog,
} from "@shared/schema";

export class EditorServiceService {
  // Get all categories for an editor
  async getEditorCategories(editorId: string): Promise<EditorServiceCategory[]> {
    return await db
      .select()
      .from(editorServiceCategories)
      .where(eq(editorServiceCategories.editorId, editorId))
      .orderBy(asc(editorServiceCategories.displayOrder));
  }

  // Get options for a category
  async getCategoryOptions(categoryId: number): Promise<EditorServiceOption[]> {
    return await db
      .select()
      .from(editorServiceOptions)
      .where(eq(editorServiceOptions.categoryId, categoryId))
      .orderBy(asc(editorServiceOptions.displayOrder));
  }

  // Get editor's complete service structure
  async getEditorServiceStructure(editorId: string): Promise<(EditorServiceCategory & { options: EditorServiceOption[] })[]> {
    const categories = await this.getEditorCategories(editorId);
    const result = [];

    for (const category of categories) {
      const options = await this.getCategoryOptions(category.id);
      result.push({
        ...category,
        options,
      });
    }

    return result;
  }

  // Create a new service category
  async createCategory(categoryData: InsertEditorServiceCategory): Promise<EditorServiceCategory> {
    const [category] = await db
      .insert(editorServiceCategories)
      .values(categoryData)
      .returning();

    // Log the change
    await this.logChange({
      editorId: categoryData.editorId,
      changeType: "category_added",
      categoryId: category.id,
      newValue: { categoryName: category.categoryName },
      changedBy: categoryData.editorId,
      changeReason: "New category created",
    });

    return category;
  }

  // Create a new service option
  async createOption(optionData: InsertEditorServiceOption): Promise<EditorServiceOption> {
    const [option] = await db
      .insert(editorServiceOptions)
      .values(optionData)
      .returning();

    // Get the category to find the editor
    const [category] = await db
      .select()
      .from(editorServiceCategories)
      .where(eq(editorServiceCategories.id, optionData.categoryId));

    // Log the change
    await this.logChange({
      editorId: category.editorId,
      changeType: "option_added",
      categoryId: optionData.categoryId,
      optionId: option.id,
      newValue: { optionName: option.optionName, price: option.price },
      changedBy: category.editorId,
      changeReason: "New option created",
    });

    return option;
  }

  // Update a category
  async updateCategory(categoryId: number, updates: Partial<EditorServiceCategory>): Promise<EditorServiceCategory> {
    const [oldCategory] = await db
      .select()
      .from(editorServiceCategories)
      .where(eq(editorServiceCategories.id, categoryId));

    const [category] = await db
      .update(editorServiceCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(editorServiceCategories.id, categoryId))
      .returning();

    // Log the change
    await this.logChange({
      editorId: category.editorId,
      changeType: "category_updated",
      categoryId: categoryId,
      oldValue: { categoryName: oldCategory.categoryName },
      newValue: { categoryName: category.categoryName },
      changedBy: category.editorId,
      changeReason: "Category updated",
    });

    return category;
  }

  // Update an option
  async updateOption(optionId: number, updates: Partial<EditorServiceOption>): Promise<EditorServiceOption> {
    const [oldOption] = await db
      .select()
      .from(editorServiceOptions)
      .where(eq(editorServiceOptions.id, optionId));

    const [option] = await db
      .update(editorServiceOptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(editorServiceOptions.id, optionId))
      .returning();

    // Get the category to find the editor
    const [category] = await db
      .select()
      .from(editorServiceCategories)
      .where(eq(editorServiceCategories.id, option.categoryId));

    // Log the change
    await this.logChange({
      editorId: category.editorId,
      changeType: "option_updated",
      categoryId: option.categoryId,
      optionId: optionId,
      oldValue: { optionName: oldOption.optionName, price: oldOption.price },
      newValue: { optionName: option.optionName, price: option.price },
      changedBy: category.editorId,
      changeReason: "Option updated",
    });

    return option;
  }

  // Delete a category (and all its options)
  async deleteCategory(categoryId: number): Promise<void> {
    const [category] = await db
      .select()
      .from(editorServiceCategories)
      .where(eq(editorServiceCategories.id, categoryId));

    await db
      .delete(editorServiceCategories)
      .where(eq(editorServiceCategories.id, categoryId));

    // Log the change
    await this.logChange({
      editorId: category.editorId,
      changeType: "category_deleted",
      categoryId: categoryId,
      oldValue: { categoryName: category.categoryName },
      changedBy: category.editorId,
      changeReason: "Category deleted",
    });
  }

  // Delete an option
  async deleteOption(optionId: number): Promise<void> {
    const [option] = await db
      .select()
      .from(editorServiceOptions)
      .where(eq(editorServiceOptions.id, optionId));

    // Get the category to find the editor
    const [category] = await db
      .select()
      .from(editorServiceCategories)
      .where(eq(editorServiceCategories.id, option.categoryId));

    await db
      .delete(editorServiceOptions)
      .where(eq(editorServiceOptions.id, optionId));

    // Log the change
    await this.logChange({
      editorId: category.editorId,
      changeType: "option_deleted",
      categoryId: option.categoryId,
      optionId: optionId,
      oldValue: { optionName: option.optionName, price: option.price },
      changedBy: category.editorId,
      changeReason: "Option deleted",
    });
  }

  // Service Templates
  async getServiceTemplates(licenseeId: string): Promise<ServiceTemplate[]> {
    return await db
      .select()
      .from(serviceTemplates)
      .where(eq(serviceTemplates.licenseeId, licenseeId))
      .orderBy(desc(serviceTemplates.isDefault), desc(serviceTemplates.createdAt));
  }

  async createServiceTemplate(templateData: InsertServiceTemplate): Promise<ServiceTemplate> {
    const [template] = await db
      .insert(serviceTemplates)
      .values(templateData)
      .returning();

    return template;
  }

  async applyTemplateToEditor(templateId: number, editorId: string): Promise<void> {
    const [template] = await db
      .select()
      .from(serviceTemplates)
      .where(eq(serviceTemplates.id, templateId));

    if (!template) {
      throw new Error("Template not found");
    }

    // Clear existing categories and options for the editor
    await db
      .delete(editorServiceCategories)
      .where(eq(editorServiceCategories.editorId, editorId));

    // Apply template data
    for (const categoryData of template.templateData.categories) {
      const [category] = await db
        .insert(editorServiceCategories)
        .values({
          editorId,
          categoryName: categoryData.categoryName,
          displayOrder: categoryData.displayOrder,
        })
        .returning();

      // Add options for this category
      for (const optionData of categoryData.options) {
        await db
          .insert(editorServiceOptions)
          .values({
            categoryId: category.id,
            optionName: optionData.optionName,
            price: optionData.price.toString(),
            currency: optionData.currency,
            displayOrder: optionData.displayOrder,
          });
      }
    }

    // Log the change
    await this.logChange({
      editorId,
      changeType: "template_applied",
      newValue: { templateName: template.templateName },
      changedBy: editorId,
      changeReason: `Applied template: ${template.templateName}`,
    });
  }

  // Change logging
  async logChange(changeData: InsertEditorServiceChangeLog): Promise<EditorServiceChangeLog> {
    const [log] = await db
      .insert(editorServiceChangeLogs)
      .values(changeData)
      .returning();

    return log;
  }

  // Get change history for an editor
  async getChangeHistory(editorId: string): Promise<EditorServiceChangeLog[]> {
    return await db
      .select()
      .from(editorServiceChangeLogs)
      .where(eq(editorServiceChangeLogs.editorId, editorId))
      .orderBy(desc(editorServiceChangeLogs.createdAt));
  }

  // Bulk update display order
  async updateCategoryOrder(categoryIds: number[]): Promise<void> {
    for (let i = 0; i < categoryIds.length; i++) {
      await db
        .update(editorServiceCategories)
        .set({ displayOrder: i })
        .where(eq(editorServiceCategories.id, categoryIds[i]));
    }
  }

  async updateOptionOrder(optionIds: number[]): Promise<void> {
    for (let i = 0; i < optionIds.length; i++) {
      await db
        .update(editorServiceOptions)
        .set({ displayOrder: i })
        .where(eq(editorServiceOptions.id, optionIds[i]));
    }
  }
}

export const editorServiceService = new EditorServiceService();