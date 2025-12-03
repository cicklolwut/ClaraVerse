/**
 * ClaraVerse Web Server
 * Entry point for headless web server mode.
 * Provides REST API and WebSocket endpoints for remote access to ClaraVerse services.
 */

import express from 'express';
import http from 'http';
import { loadServerConfig, validateConfig } from './config/server';
import { createCorsMiddleware } from './middleware/cors';
import { createErrorHandler, asyncHandler } from './middleware/error';
import { createOptionalAuthMiddleware } from './middleware/auth';

// Import API routes
import ipcRouter from './api/ipc';
import mcpRouter from './api/mcp';
import servicesRouter from './api/services';
import claraCoreRouter from './api/claraCoreRoutes';

// Import WebSocket handler
import { initializeWebSocket, getClientStats } from './websocket';

let server: http.Server | null = null;
let isShuttingDown = false;

export async function startWebServer() {
  try {
    // Load and validate configuration
    const config = loadServerConfig();
    validateConfig(config);

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║         ClaraVerse Headless Server                        ║
║         Version: 1.0.0                                    ║
║         Environment: ${config.environment.padEnd(37)}║
╚═══════════════════════════════════════════════════════════╝
    `);

    // Initialize Express app
    const app = express();

    // Parse JSON bodies
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Apply CORS middleware
    app.use(createCorsMiddleware(config));

    // Health check endpoint (no auth required)
    app.get('/health', (_req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.environment,
      });
    });

    // API routes with optional auth
    app.use('/api', createOptionalAuthMiddleware(config));

    // Register API routers
    app.use('/api/ipc', ipcRouter);
    app.use('/api/mcp', mcpRouter);
    app.use('/api/services', servicesRouter);
    app.use('/api/server/clara-core', claraCoreRouter);

    // System info endpoint
    app.get('/api/system/info', asyncHandler(async (_req, res) => {
      res.json({
        success: true,
        system: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          claraDataDir: config.claraDataDir,
        },
      });
    }));

    // WebSocket stats endpoint
    app.get('/api/websocket/stats', asyncHandler(async (_req, res) => {
      const stats = getClientStats();

      res.json({
        success: true,
        stats: {
          totalClients: stats.totalClients,
          activeClients: stats.activeClients,
          subscriptions: Object.fromEntries(stats.subscriptions),
        },
      });
    }));

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Endpoint not found',
          code: 'NOT_FOUND',
          path: req.path,
        },
      });
    });

    // Error handler (must be last)
    app.use(createErrorHandler(config));

    // Create HTTP server
    server = http.createServer(app);

    // Initialize WebSocket server if enabled
    if (config.websocket.enabled) {
      initializeWebSocket(server, config);
      console.log('✓ WebSocket server initialized');
    }

    // Start listening
    server.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Server is running                                        ║
║                                                           ║
║  HTTP API:    http://localhost:${config.port.toString().padEnd(32)}║
║  WebSocket:   ws://localhost:${config.port.toString().padEnd(34)}║
║                                                           ║
║  Endpoints:                                               ║
║    GET  /health              - Health check              ║
║    POST /api/ipc/:channel    - IPC bridge                ║
║    *    /api/mcp/*           - MCP management            ║
║    GET  /api/services        - Service status            ║
║    *    /api/server/clara-core/* - Clara-Core Docker    ║
║                                                           ║
║  Environment: ${config.environment.padEnd(40)}║
║  Debug mode:  ${(config.enableDebug ? 'enabled' : 'disabled').padEnd(40)}║
╚═══════════════════════════════════════════════════════════╝
      `);

      console.log('Ready to accept connections');
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n${signal} received, shutting down gracefully...`);

      if (server) {
        server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.error('Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      if (config.environment === 'production') {
        shutdown('UNCAUGHT_EXCEPTION');
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (require.main === module) {
  startWebServer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
