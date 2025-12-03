/**
 * Clara-Core Docker Management API Routes
 * REST API endpoints for managing Clara-Core containers
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { claraCoreDocker } from '../services/claraCoreDocker';
import { detectGPU, invalidateGPUCache } from '../services/gpuDetection';
import {
  isValidArchitecture,
  ClaraCoreArchitecture,
  CreateContainerOptions,
  ConfigureContainerOptions,
} from '../types/claraCore';

const router = Router();

// ===================================================================
// Detection & Status Endpoints
// ===================================================================

/**
 * GET /api/server/clara-core/detect-gpu
 * Detects available GPU hardware and recommends architecture
 */
router.get('/detect-gpu', asyncHandler(async (req: Request, res: Response) => {
  const skipCache = req.query.skipCache === 'true';

  if (skipCache) {
    invalidateGPUCache();
  }

  const gpuInfo = await detectGPU(skipCache);

  res.json({
    success: true,
    gpuType: gpuInfo.gpuType,
    recommended: gpuInfo.recommended,
    devices: gpuInfo.devices,
    details: gpuInfo.details,
  });
}));

/**
 * GET /api/server/clara-core/status
 * Gets Clara-Core container status and health
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const status = await claraCoreDocker.getStatus();

  res.json({
    success: true,
    ...status,
  });
}));

/**
 * GET /api/server/clara-core/logs
 * Retrieves Clara-Core container logs
 */
router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
  const lines = parseInt(req.query.lines as string) || 100;
  const timestamps = req.query.timestamps === 'true';
  const since = req.query.since ? parseInt(req.query.since as string) : undefined;

  const logs = await claraCoreDocker.getLogs({
    lines,
    timestamps,
    since,
  });

  res.json({
    success: true,
    logs,
  });
}));

/**
 * GET /api/server/clara-core/health
 * Check Clara-Core health status
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const healthy = await claraCoreDocker.checkHealth();
  const status = await claraCoreDocker.getStatus();

  res.json({
    success: true,
    healthy,
    running: status.running,
    exists: status.exists,
  });
}));

/**
 * GET /api/server/clara-core/docker-connection
 * Check Docker daemon connectivity
 */
router.get('/docker-connection', asyncHandler(async (req: Request, res: Response) => {
  const connected = await claraCoreDocker.checkDockerConnection();

  if (!connected) {
    res.status(503).json({
      success: false,
      connected: false,
      error: 'Docker daemon is not accessible. Please ensure Docker is running and the socket is mounted.',
    });
    return;
  }

  res.json({
    success: true,
    connected: true,
  });
}));

// ===================================================================
// Lifecycle Management Endpoints
// ===================================================================

/**
 * POST /api/server/clara-core/create
 * Creates Clara-Core container with specified architecture
 */
router.post('/create', asyncHandler(async (req: Request, res: Response) => {
  const { architecture, modelsPath, port, environment, gpuDevices } = req.body;

  // Validation
  if (!architecture) {
    res.status(400).json({
      success: false,
      error: 'Architecture is required',
    });
    return;
  }

  if (!isValidArchitecture(architecture)) {
    res.status(400).json({
      success: false,
      error: `Invalid architecture. Must be one of: ${Object.values(ClaraCoreArchitecture).join(', ')}`,
    });
    return;
  }

  if (port && (typeof port !== 'number' || port < 1 || port > 65535)) {
    res.status(400).json({
      success: false,
      error: 'Port must be a number between 1 and 65535',
    });
    return;
  }

  // Check Docker connectivity
  const dockerConnected = await claraCoreDocker.checkDockerConnection();
  if (!dockerConnected) {
    res.status(503).json({
      success: false,
      error: 'Docker daemon is not accessible. Please ensure Docker is running and the socket is mounted.',
    });
    return;
  }

  const options: CreateContainerOptions = {
    architecture: architecture as ClaraCoreArchitecture,
    modelsPath,
    port,
    environment,
    gpuDevices,
  };

  const result = await claraCoreDocker.createContainer(options);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
}));

/**
 * POST /api/server/clara-core/start
 * Starts existing Clara-Core container
 */
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
  const result = await claraCoreDocker.startContainer();

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
}));

/**
 * POST /api/server/clara-core/stop
 * Gracefully stops Clara-Core container
 */
router.post('/stop', asyncHandler(async (req: Request, res: Response) => {
  const timeout = parseInt(req.query.timeout as string) || 10;

  if (timeout < 0 || timeout > 300) {
    res.status(400).json({
      success: false,
      error: 'Timeout must be between 0 and 300 seconds',
    });
    return;
  }

  const result = await claraCoreDocker.stopContainer(timeout);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
}));

/**
 * POST /api/server/clara-core/restart
 * Restarts Clara-Core container
 */
router.post('/restart', asyncHandler(async (req: Request, res: Response) => {
  const result = await claraCoreDocker.restartContainer();

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
}));

/**
 * DELETE /api/server/clara-core/remove
 * Stops and removes Clara-Core container
 */
router.delete('/remove', asyncHandler(async (req: Request, res: Response) => {
  const force = req.query.force === 'true';

  const result = await claraCoreDocker.removeContainer(force);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
}));

// ===================================================================
// Configuration Endpoints
// ===================================================================

/**
 * POST /api/server/clara-core/configure
 * Updates Clara-Core configuration
 */
router.post('/configure', asyncHandler(async (req: Request, res: Response) => {
  const { architecture, modelsPath, port, environment } = req.body;

  // Validation
  if (architecture && !isValidArchitecture(architecture)) {
    res.status(400).json({
      success: false,
      error: `Invalid architecture. Must be one of: ${Object.values(ClaraCoreArchitecture).join(', ')}`,
    });
    return;
  }

  if (port && (typeof port !== 'number' || port < 1 || port > 65535)) {
    res.status(400).json({
      success: false,
      error: 'Port must be a number between 1 and 65535',
    });
    return;
  }

  const options: ConfigureContainerOptions = {
    architecture: architecture as ClaraCoreArchitecture | undefined,
    modelsPath,
    port,
    environment,
  };

  const result = await claraCoreDocker.configure(options);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
}));

/**
 * GET /api/server/clara-core/image-exists/:architecture
 * Check if Clara-Core image exists for specified architecture
 */
router.get('/image-exists/:architecture', asyncHandler(async (req: Request, res: Response) => {
  const { architecture } = req.params;

  if (!isValidArchitecture(architecture)) {
    res.status(400).json({
      success: false,
      error: `Invalid architecture. Must be one of: ${Object.values(ClaraCoreArchitecture).join(', ')}`,
    });
    return;
  }

  const exists = await claraCoreDocker.checkImageExists(architecture as ClaraCoreArchitecture);

  res.json({
    success: true,
    exists,
    architecture,
    image: `claracore:${architecture}`,
  });
}));

/**
 * GET /api/server/clara-core/port-available/:port
 * Check if a port is available
 */
router.get('/port-available/:port', asyncHandler(async (req: Request, res: Response) => {
  const port = parseInt(req.params.port);

  if (isNaN(port) || port < 1 || port > 65535) {
    res.status(400).json({
      success: false,
      error: 'Port must be a number between 1 and 65535',
    });
    return;
  }

  const available = await claraCoreDocker.checkPortAvailable(port);

  res.json({
    success: true,
    port,
    available,
  });
}));

// ===================================================================
// Utility Endpoints
// ===================================================================

/**
 * GET /api/server/clara-core/architectures
 * List supported architectures
 */
router.get('/architectures', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    architectures: Object.values(ClaraCoreArchitecture),
    descriptions: {
      [ClaraCoreArchitecture.CPU]: 'CPU-only inference (works on all systems)',
      [ClaraCoreArchitecture.CUDA]: 'NVIDIA GPU acceleration (requires CUDA)',
      [ClaraCoreArchitecture.ROCM]: 'AMD GPU acceleration (requires ROCm)',
      [ClaraCoreArchitecture.STRIX]: 'AMD Ryzen AI acceleration (APU)',
    },
  });
}));

/**
 * GET /api/server/clara-core/system-info
 * Get system information for Clara-Core setup
 */
router.get('/system-info', asyncHandler(async (req: Request, res: Response) => {
  const dockerConnected = await claraCoreDocker.checkDockerConnection();
  const gpuInfo = await detectGPU();
  const status = await claraCoreDocker.getStatus();

  res.json({
    success: true,
    docker: {
      connected: dockerConnected,
    },
    gpu: {
      type: gpuInfo.gpuType,
      recommended: gpuInfo.recommended,
      deviceCount: gpuInfo.devices.length,
      details: gpuInfo.details,
    },
    container: {
      exists: status.exists,
      running: status.running,
      architecture: status.architecture,
      healthy: status.healthy,
    },
  });
}));

export default router;
