/**
 * TypeScript type definitions for Clara-Core Docker management
 */

/**
 * Supported Clara-Core architectures
 */
export enum ClaraCoreArchitecture {
  CPU = 'cpu',
  CUDA = 'cuda',
  ROCM = 'rocm',
  STRIX = 'strix',
}

/**
 * GPU types detected in the system
 */
export enum GPUType {
  NVIDIA = 'nvidia',
  AMD = 'amd',
  NONE = 'none',
}

/**
 * Container status states
 */
export enum ContainerStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  PAUSED = 'paused',
  RESTARTING = 'restarting',
  CREATED = 'created',
  EXITED = 'exited',
  DEAD = 'dead',
  NOT_FOUND = 'not_found',
}

/**
 * GPU detection result
 */
export interface GPUDetectionResult {
  gpuType: GPUType;
  recommended: ClaraCoreArchitecture;
  devices: string[];
  details?: {
    driverVersion?: string;
    cudaVersion?: string;
    rocmVersion?: string;
    gpuModels?: string[];
  };
}

/**
 * Clara-Core container status
 */
export interface ClaraCoreStatus {
  exists: boolean;
  running: boolean;
  architecture: ClaraCoreArchitecture | null;
  healthy: boolean;
  port: number;
  uptime?: number;
  containerId?: string;
  imageId?: string;
  created?: string;
  startedAt?: string;
}

/**
 * Clara-Core container creation options
 */
export interface CreateContainerOptions {
  architecture: ClaraCoreArchitecture;
  modelsPath?: string;
  port?: number;
  environment?: Record<string, string>;
  gpuDevices?: string[];
}

/**
 * Clara-Core configuration options
 */
export interface ConfigureContainerOptions {
  architecture?: ClaraCoreArchitecture;
  modelsPath?: string;
  port?: number;
  environment?: Record<string, string>;
}

/**
 * Container operation result
 */
export interface ContainerOperationResult {
  success: boolean;
  message: string;
  containerId?: string;
  error?: string;
  details?: any;
}

/**
 * Container logs options
 */
export interface ContainerLogsOptions {
  lines?: number;
  since?: number;
  timestamps?: boolean;
  follow?: boolean;
}

/**
 * Type guards for validation
 */
export function isValidArchitecture(value: string): value is ClaraCoreArchitecture {
  return Object.values(ClaraCoreArchitecture).includes(value as ClaraCoreArchitecture);
}

export function isValidGPUType(value: string): value is GPUType {
  return Object.values(GPUType).includes(value as GPUType);
}

/**
 * Container configuration for different architectures
 */
export interface ArchitectureConfig {
  architecture: ClaraCoreArchitecture;
  image: string;
  deviceRequests?: any[];
  devices?: string[];
  environment?: Record<string, string>;
  runtime?: string;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  maxRetries: number;
  retryInterval: number;
  timeout: number;
  healthPath: string;
}
