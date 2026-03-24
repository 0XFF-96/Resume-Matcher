import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

// Ensure API always returns JSON for unknown routes.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Central error handler so the frontend never receives empty/non-JSON bodies.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const log = (req as unknown as { log?: { error: Function } }).log;
  log?.error({ err }, "Unhandled error");

  if (res.headersSent) return;

  const requestId = (req as unknown as { id?: unknown }).id;
  res.status(500).json({
    error: "Internal Server Error",
    requestId: typeof requestId === "string" ? requestId : undefined,
  });
});

export default app;
