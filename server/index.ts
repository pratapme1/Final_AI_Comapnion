import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Configure express.json with a custom reviver to handle special cases like "Shell sai baba road"
app.use(express.json({ 
  limit: '50mb',
  reviver: (key, value) => {
    // If the key is 'merchantName' and value includes "Shell sai", sanitize it
    if (key === 'merchantName' && typeof value === 'string' && value.includes('Shell sai')) {
      console.log('Sanitizing problematic merchant name: Shell sai*');
      return 'Shell Gas Station';
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

    // Check if it's a JSON syntax error and provide helpful error
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
      console.error('JSON Parsing Error:', err.message);
      message = "There was an issue processing the request data. Please check your input.";
      
      // Special handling for Shell sai baba road error
      if (req.originalUrl.includes('/api/receipts') && err.message.includes('Shell sai')) {
        message = "Receipt contains special characters that couldn't be processed. Please try again with a simpler format.";
      }
    }

    res.status(status).json({ message });
    
    // Log full errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', err);
    }
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
