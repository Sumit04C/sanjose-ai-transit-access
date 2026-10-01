import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import {
  CreateSubmissionBody,
  CreateSubmissionResponse,
  ListSubmissionsResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { submissionsTable, type Submission, type submissionLanguages } from "@workspace/db/schema";
import { lookupTransit } from "../lib/transit-provider";
import { generateGroundedResponse } from "../lib/grounded-response";

const router: IRouter = Router();

const toSubmission = (submission: Submission) => ({
  ...submission,
  language: submission.language as (typeof submissionLanguages)[number],
  submittedAt: submission.submittedAt.toISOString(),
  sourceRetrievedAt: submission.sourceRetrievedAt?.toISOString() ?? null,
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
    const inputIsSynthetic = parsed.data.inputIsSynthetic === true || description.includes("[242]");
    const route = parsed.data.route?.trim() ?? "";
    const stop = parsed.data.stop?.trim() ?? "";
    const issueCategory = parsed.data.issueCategory ?? "other";
    const context = await lookupTransit({
      route, stop,
      routeId: parsed.data.routeId?.trim(),
      stopId: parsed.data.stopId?.trim(),
    });
    const response = await generateGroundedResponse({
      description, language, imageName, issueCategory, inputIsSynthetic, context,
    });
    const id = crypto.randomUUID();
    const [saved] = await db
      .insert(submissionsTable)
      .values({
        id,
        reference: `VTA-${id.slice(0, 8).toUpperCase()}`,
        description,
        language,
        imageName,
        ...response,
        // Legacy label is retained for old clients, not used as transit provenance.
        dataSource: inputIsSynthetic ? "synthetic data" : "real document",
        issueCategory, route, stop, inputIsSynthetic,
        inputSource: inputIsSynthetic ? "synthetic classroom test" : "rider-submitted input",
        operatorId: context.operatorId,
        routeId: context.routeId,
        stopId: context.stopId,
        routeName: context.routeName,
        stopName: context.stopName,
        dataSourcesUsed: context.dataSourcesUsed,
        sfBay511DataUsed: context.sfBay511DataUsed,
        vtaOpenDataUsed: context.vtaOpenDataUsed,
        liveArrivalSnapshot: context.liveArrivalSnapshot,
        serviceAlertSnapshot: context.serviceAlertSnapshot,
        vtaOpenDataSnapshot: context.vtaOpenDataSnapshot,
        vtaOpenDataDatasetTitle: context.vtaOpenDataDatasetTitle,
        vtaOpenDataPublisher: context.vtaOpenDataUsed ? "Santa Clara Valley Transportation Authority" : null,
        vtaOpenDataSourceUrl: context.vtaOpenDataSourceUrl,
        vtaOpenDataResourceUrl: context.vtaOpenDataResourceUrl,
        sourceRetrievedAt: context.sourceRetrievedAt ? new Date(context.sourceRetrievedAt) : null,
        transitNotes: context.notes,
      })
      .returning();

    res.status(201).json(CreateSubmissionResponse.parse(toSubmission(saved)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to save rider submission");
    res.status(500).json({ error: "Unable to save submission" });
  }
});

export default router;