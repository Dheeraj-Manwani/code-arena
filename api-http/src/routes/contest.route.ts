import { Router } from "express";
import * as contestController from "../controller/contest.controller";
import { validate } from "../middleware/validate";
import {
  CreateContestSchema,
  PaginationQuerySchema,
  UpdateContestSchema,
} from "../schema/contest.schema";

const router = Router();

router.get(
  "/",
  validate(PaginationQuerySchema, "query"),
  contestController.getContests
);
router.post(
  "/",
  validate(CreateContestSchema),
  contestController.createContest
);
router.get("/:id", contestController.getContestById);
router.patch(
  "/:id",
  validate(UpdateContestSchema),
  contestController.updateContest
);

export default router;
