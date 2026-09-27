import { createInsertSchema } from "drizzle-zod";
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const submissionLanguages = ["vi", "en", "es", "pa"] as const;
export const submissionDataSources = ["public dataset", "real document", "synthetic data"] as const;

export const submissionDataSourceEnum = pgEnum("submission_data_source", submissionDataSources);

export const submissionsTable = pgTable("rider_submissions", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  description: text("description").notNull(),
  language: text("language").notNull(),
  imageName: text("image_name"),
  assistantResponse: text("assistant_response").notNull(),
  dataSource: submissionDataSourceEnum("data_source").notNull().default("real document"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  reference: true,
  assistantResponse: true,
  submittedAt: true,
});

export type Submission = typeof submissionsTable.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;