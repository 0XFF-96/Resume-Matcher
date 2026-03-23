import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import analysesRouter from "./analyses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(analysesRouter);

export default router;
