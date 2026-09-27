import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import {
  CreateSubmissionBody,
  CreateSubmissionResponse,
  ListSubmissionsResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { submissionsTable, type Submission, type submissionLanguages } from "@workspace/db/schema";
import { prototypeResponses } from "../lib/prototype-response";

const router: IRouter = Router();

const toSubmission = (submission: Submission) => ({
  ...submission,
  language: submission.language as (typeof submissionLanguages)[number],
  submittedAt: submission.submittedAt.toISOString(),
});

router.get("/submissions", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(submissionsTable)
      .orderBy(desc(submissionsTable.submittedAt), desc(submissionsTable.id));
    res.json(ListSubmissionsResponse.parse(rows.map(toSubmission)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list rider submissions");
    res.status(500).json({ error: "Unable to load submissions" });
  }
});

router.post("/submissions", async (req, res): Promise<void> => {
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid submission" });
    return;
  }

  const { language, imageName } = parsed.data;
  const description = parsed.data.description.trim();
  if (!description && !imageName) {
    res.status(400).json({ error: "A description or image is required" });
    return;
  }

  try {
    const id = crypto.randomUUID();
    const [saved] = await db
      .insert(submissionsTable)
      .values({
        id,
        reference: `VTA-${id.slice(0, 8).toUpperCase()}`,
        description,
        language,
        imageName,
        assistantResponse: prototypeResponses[language],
        dataSource: "real document",
      })
      .returning();

    res.status(201).json(CreateSubmissionResponse.parse(toSubmission(saved)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to save rider submission");
    res.status(500).json({ error: "Unable to save submission" });
  }
});

export default router;