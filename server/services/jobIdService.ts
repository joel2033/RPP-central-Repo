import { db } from "../db";
import { jobIdCounter, jobCards } from "@shared/schema";
import { eq } from "drizzle-orm";

export class JobIdService {
  /**
   * Generate a new unique Job ID atomically
   * Format: 00001, 00002, 00003, etc.
   */
  static async generateJobId(): Promise<string> {
    // Use a transaction to ensure atomic increment
    const result = await db.transaction(async (tx) => {
      // Get current value first
      const [currentCounter] = await tx
        .select({ currentValue: jobIdCounter.currentValue })
        .from(jobIdCounter)
        .limit(1);

      const currentValue = currentCounter?.currentValue || 0;
      const newValue = currentValue + 1;

      // Update the counter atomically
      await tx
        .update(jobIdCounter)
        .set({ 
          currentValue: newValue,
          lastUpdated: new Date()
        });

      // Format as 5-digit padded number
      return newValue.toString().padStart(5, '0');
    });

    return result;
  }

  /**
   * Assign a Job ID to a job card (only if it doesn't already have one)
   */
  static async assignJobId(jobCardId: number): Promise<string> {
    // Check if job card already has a Job ID
    const [existingJobCard] = await db
      .select({ jobId: jobCards.jobId })
      .from(jobCards)
      .where(eq(jobCards.id, jobCardId))
      .limit(1);

    if (!existingJobCard) {
      throw new Error(`Job card with ID ${jobCardId} not found`);
    }

    // If already has a Job ID, return it
    if (existingJobCard.jobId) {
      return existingJobCard.jobId;
    }

    // Generate new Job ID
    const newJobId = await this.generateJobId();

    // Update the job card with the new Job ID
    await db
      .update(jobCards)
      .set({ 
        jobId: newJobId,
        updatedAt: new Date()
      })
      .where(eq(jobCards.id, jobCardId));

    return newJobId;
  }

  /**
   * Check if a job card has a Job ID assigned
   */
  static async hasJobId(jobCardId: number): Promise<boolean> {
    const [jobCard] = await db
      .select({ jobId: jobCards.jobId })
      .from(jobCards)
      .where(eq(jobCards.id, jobCardId))
      .limit(1);

    return !!(jobCard?.jobId);
  }

  /**
   * Get the current counter value (for admin purposes)
   */
  static async getCurrentCounter(): Promise<number> {
    const [counter] = await db
      .select({ currentValue: jobIdCounter.currentValue })
      .from(jobIdCounter)
      .limit(1);

    return counter?.currentValue || 0;
  }
}