import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import passport from "passport";
import { registerRoutes } from "./routes";
import { registerStripeRoutes } from "./stripeRoutes";
import { setupVite, serveStatic, log } from "./vite";

process.on('unhandledRejection', (reason, promise) => {
  console.error('[PROCESS] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[PROCESS] Uncaught Exception:', error);
});

const app = express();
app.use((req, res, next) => {
  if (req.path === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration} ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)} `;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

let isInitialized = false;
let server: any = null;

export const initApp = async () => {
  if (isInitialized) return server;

  const { setupAuth } = await import("./auth");
  await setupAuth(app);

  registerStripeRoutes(app);

  server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[GLOBAL_ERROR]', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const code = err.code || 'INTERNAL_ERROR';

    if (!res.headersSent) {
      res.status(status).json({ message, code, details: err.details || null });
    }
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  isInitialized = true;
  return server;
};

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  (async () => {
    const activeServer = await initApp();
    const port = parseInt(process.env.PORT || "5000", 10);
    activeServer.listen(
      { port, host: "0.0.0.0" },
      () => log(`serving on port ${port} `)
    );
  })();
}

export default app;
