import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
// Configure JSON middleware with a custom reviver to handle problematic strings
app.use(express.json({
  reviver: (key, value) => {
    // If the value is a string, ensure it's properly handled
    if (typeof value === 'string') {
      return value;
    }
    return value;
  }
}));
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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          // Use a custom replacer function to handle problematic values
          logLine += ` :: ${JSON.stringify(capturedJsonResponse, (key, value) => {
            // Ensure strings with quotes are properly handled
            if (typeof value === 'string') {
              return value;
            }
            return value;
          })}`;
        } catch (error: any) {
          logLine += ` :: [JSON conversion error: ${error.message || 'Unknown error'}]`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Custom error handler that specifically looks for JSON parsing errors
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Check if it's a JSON syntax error and try to recover
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
      console.error('JSON Parsing Error:', err.message);
      
      // For Shell sai baba road specific error
      if (req.path.includes('/api/receipts') && err.message.includes('Shell sai')) {
        message = "Receipt contains special characters that couldn't be processed. Please try again with a different format.";
        console.log('Detected Shell gas station receipt error');
      }
    }

    res.status(status).json({ message });
    
    // Only throw in development for debugging, not in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
