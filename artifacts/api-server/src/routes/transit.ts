import { Router, type IRouter } from "express";
import { GetTransitMatchesQueryParams, GetTransitMatchesResponse } from "@workspace/api-zod";
import { matchTransit } from "../lib/transit-provider";

const router: IRouter = Router();
router.get("/transit/matches", async (req, res): Promise<void> => {
  const query = GetTransitMatchesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Enter a valid route or stop search." });
    return;
  }
  try {
    const matches = await matchTransit(query.data.route?.trim() ?? "", query.data.stop?.trim() ?? "");
    res.json(GetTransitMatchesResponse.parse(matches));
  } catch {
    req.log.warn("Transit reference lookup unavailable");
    res.json(GetTransitMatchesResponse.parse({
      routes: [], stops: [],
      message: "Transit reference data is temporarily unavailable. You can still save your report without verified live context.",
    }));
  }
});
export default router;