/**
 * Clara-Core Docker Management Service
 * Handles container lifecycle, health checking, and configuration
 */

import Docker from 'dockerode';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ClaraCoreArchitecture,
  ClaraCoreStatus,
  CreateContainerOptions,
  ConfigureContainerOptions,
  ContainerOperationResult,
  ContainerLogsOptions,
  ContainerStatus,
  ArchitectureConfig,
  HealthCheckConfig,
} from '../types/claraCore';
import { detectGPU } from './gpuDetection';

const execAsync = promisify(exec);

/**
 * Clara-Core Docker Service
 */
export class ClaraCoreDockerService {
  private docker: Docker;
  private containerName = 'claraverse-clara-core';
  private networkName = 'claraverse-network';
  private defaultPort = 8091;
  private internalPort = 5890;

  // Health check configuration
  private healthCheckConfig: HealthCheckConfig = {
    maxRetries: 30,
    retryInterval: 2000, // 2 seconds
    timeout: 60000, // 60 seconds total
    healthPath: '/health',
  };

  // Rate limiting for operations
  private lastOperationTime = 0;
  private operationCooldown = 5000; // 5 seconds

  constructor(dockerOptions?: Docker.DockerOptions) {
    // Default to Unix socket
    const options = dockerOptions || {
      socketPath: '/var/run/docker.sock',
    };

    this.docker = new Docker(options);
  }

  /**
   * Check Docker connectivity
   */
  async checkDockerConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error('Docker connection failed:', error);
      return false;
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const timeSinceLastOp = now - this.lastOperationTime;

    if (timeSinceLastOp < this.operationCooldown) {
      const waitTime = this.operationCooldown - timeSinceLastOp;
      throw new Error(`Rate limit: Please wait ${Math.ceil(waitTime / 1000)} seconds before next operation`);
    }

    this.lastOperationTime = now;
  }

  /**
   * Get architecture-specific container configuration
   */
  private getArchitectureConfig(architecture: ClaraCoreArchitecture, gpuDevices?: string[]): ArchitectureConfig {
    const baseConfig: ArchitectureConfig = {
      architecture,
      image: `claracore:${architecture}`,
      environment: {
        OMP_NUM_THREADS: 'auto',
      },
    };

    switch (architecture) {
      case ClaraCoreArchitecture.CUDA:
        return {
          ...baseConfig,
          runtime: 'nvidia',
          environment: {
            ...baseConfig.environment,
            NVIDIA_VISIBLE_DEVICES: gpuDevices?.join(',') || 'all',
            NVIDIA_DRIVER_CAPABILITIES: 'compute,utility',
          },
          deviceRequests: [
            {
              Driver: 'nvidia',
              Count: -1, // All GPUs
              Capabilities: [['gpu']],
            },
          ],
        };

      case ClaraCoreArchitecture.ROCM:
        return {
          ...baseConfig,
          devices: [
            '/dev/kfd:/dev/kfd',
            '/dev/dri:/dev/dri',
          ],
          environment: {
            ...baseConfig.environment,
            HSA_OVERRIDE_GFX_VERSION: '10.3.0', // May need adjustment for specific AMD GPUs
          },
        };

      case ClaraCoreArchitecture.STRIX:
        return {
          ...baseConfig,
          devices: [
            '/dev/accel:/dev/accel',
          ],
        };

      case ClaraCoreArchitecture.CPU:
      default:
        return baseConfig;
    }
  }

  /**
   * Find existing Clara-Core container
   */
  async findContainer(): Promise<Docker.ContainerInfo | null> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const found = containers.find(c =>
        c.Names.some(name => name === `/${this.containerName}` || name === this.containerName)
      );

      return found || null;
    } catch (error) {
      console.error('Error finding container:', error);
      return null;
    }
  }

  /**
   * Get container status
   */
  async getStatus(): Promise<ClaraCoreStatus> {
    try {
      const containerInfo = await this.findContainer();

      if (!containerInfo) {
        return {
          exists: false,
          running: false,
          architecture: null,
          healthy: false,
          port: this.defaultPort,
        };
      }

      const isRunning = containerInfo.State === 'running';

      // Extract architecture from image tag
      const imageTag = containerInfo.Image.split(':')[1] || 'cpu';
      const architecture = imageTag as ClaraCoreArchitecture;

      // Check health if running
      let healthy = false;
      if (isRunning) {
        healthy = await this.checkHealth();
      }

      return {
        exists: true,
        running: isRunning,
        architecture,
        healthy,
        port: this.defaultPort,
        containerId: containerInfo.Id,
        imageId: containerInfo.ImageID,
        created: new Date(containerInfo.Created * 1000).toISOString(),
        startedAt: containerInfo.State === 'running'
          ? new Date(containerInfo.Status.match(/Up (.+)/)?.[1] || Date.now()).toISOString()
          : undefined,
        uptime: isRunning ? this.parseUptime(containerInfo.Status) : undefined,
      };
    } catch (error) {
      console.error('Error getting container status:', error);
      return {
        exists: false,
        running: false,
        architecture: null,
        healthy: false,
        port: this.defaultPort,
      };
    }
  }

  /**
   * Parse uptime from container status string
   */
  private parseUptime(status: string): number | undefined {
    // Status format: "Up X minutes/hours/days"
    const match = status.match(/Up (\d+) (second|minute|hour|day)s?/);
    if (!match) return undefined;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      second: 1,
      minute: 60,
      hour: 3600,
      day: 86400,
    };

    return value * (multipliers[unit] || 0);
  }

  /**
   * Check if Clara-Core is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://localhost:${this.defaultPort}${this.healthCheckConfig.healthPath}`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for container to be healthy
   */
  private async waitForHealthy(): Promise<boolean> {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.healthCheckConfig.maxRetries) {
      if (Date.now() - startTime > this.healthCheckConfig.timeout) {
        console.warn('Health check timeout');
        return false;
      }

      const healthy = await this.checkHealth();

      if (healthy) {
        console.log(`Clara-Core is healthy after ${attempts + 1} attempts`);
        return true;
      }

      attempts++;
      console.debug(`Health check attempt ${attempts}/${this.healthCheckConfig.maxRetries} failed, retrying...`);

      await new Promise(resolve => setTimeout(resolve, this.healthCheckConfig.retryInterval));
    }

    console.warn('Clara-Core failed to become healthy');
    return false;
  }

  /**
   * Check if image exists locally
   */
  async checkImageExists(architecture: ClaraCoreArchitecture): Promise<boolean> {
    try {
      const imageName = `claracore:${architecture}`;
      const images = await this.docker.listImages();

      return images.some(img =>
        img.RepoTags?.some(tag => tag === imageName)
      );
    } catch (error) {
      console.error('Error checking image:', error);
      return false;
    }
  }

  /**
   * Check if port is available
   */
  async checkPortAvailable(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`netstat -tuln | grep :${port} || true`);
      return stdout.trim().length === 0;
    } catch (error) {
      // netstat might not be available, assume port is available
      return true;
    }
  }

  /**
   * Create Clara-Core container
   */
  async createContainer(options: CreateContainerOptions): Promise<ContainerOperationResult> {
    try {
      // Rate limiting
      this.checkRateLimit();

      // Validate inputs
      const { architecture, modelsPath, port = this.defaultPort } = options;

      // Check if container already exists
      const existing = await this.findContainer();
      if (existing) {
        return {
          success: false,
          message: 'Clara-Core container already exists. Please remove it first.',
          containerId: existing.Id,
        };
      }

      // Check if image exists
      const imageExists = await this.checkImageExists(architecture);
      if (!imageExists) {
        return {
          success: false,
          message: `Clara-Core image not found: claracore:${architecture}. Please build the image first.`,
          error: 'IMAGE_NOT_FOUND',
        };
      }

      // Check port availability
      const portAvailable = await this.checkPortAvailable(port);
      if (!portAvailable) {
        return {
          success: false,
          message: `Port ${port} is already in use. Please choose a different port.`,
          error: 'PORT_IN_USE',
        };
      }

      // Get GPU devices if needed
      let gpuDevices: string[] | undefined;
      if (architecture === ClaraCoreArchitecture.CUDA || architecture === ClaraCoreArchitecture.ROCM) {
        const gpuInfo = await detectGPU();
        gpuDevices = gpuInfo.devices;

        if (gpuDevices.length === 0) {
          console.warn(`No GPUs detected for ${architecture} architecture`);
        }
      }

      // Get architecture-specific configuration
      const archConfig = this.getArchitectureConfig(architecture, gpuDevices);

      // Prepare container configuration
      const containerConfig: any = {
        name: this.containerName,
        Image: archConfig.image,
        Env: [
          ...Object.entries(archConfig.environment || {}).map(([k, v]) => `${k}=${v}`),
          ...Object.entries(options.environment || {}).map(([k, v]) => `${k}=${v}`),
        ],
        ExposedPorts: {
          [`${this.internalPort}/tcp`]: {},
        },
        HostConfig: {
          PortBindings: {
            [`${this.internalPort}/tcp`]: [{ HostPort: port.toString() }],
          },
          NetworkMode: this.networkName,
          Binds: [
            'claraverse-clara-core-downloads:/app/downloads',
            'claraverse-clara-core-config:/app/config',
          ],
          RestartPolicy: {
            Name: 'unless-stopped',
          },
        },
        Labels: {
          'com.claraverse.service': 'clara-core',
          'com.claraverse.architecture': architecture,
          'com.claraverse.description': 'Local LLM inference (llama.cpp)',
        },
      };

      // Add models path if provided
      if (modelsPath) {
        containerConfig.HostConfig.Binds.push(`${modelsPath}:/app/models`);
      }

      // Add device requests for CUDA
      if (archConfig.deviceRequests) {
        containerConfig.HostConfig.DeviceRequests = archConfig.deviceRequests;
      }

      // Add devices for ROCm/Strix
      if (archConfig.devices) {
        containerConfig.HostConfig.Devices = archConfig.devices.map(device => {
          const [pathOnHost, pathInContainer] = device.split(':');
          return {
            PathOnHost: pathOnHost,
            PathInContainer: pathInContainer || pathOnHost,
            CgroupPermissions: 'rwm',
          };
        });
      }

      // Set runtime if specified
      if (archConfig.runtime) {
        containerConfig.HostConfig.Runtime = archConfig.runtime;
      }

      console.log('Creating Clara-Core container with config:', {
        architecture,
        port,
        gpuDevices,
      });

      // Create container
      const container = await this.docker.createContainer(containerConfig);

      console.log('Clara-Core container created:', container.id);

      return {
        success: true,
        message: 'Clara-Core container created successfully',
        containerId: container.id,
      };
    } catch (error: any) {
      console.error('Error creating container:', error);
      return {
        success: false,
        message: 'Failed to create Clara-Core container',
        error: error.message,
        details: error,
      };
    }
  }

  /**
   * Start Clara-Core container
   */
  async startContainer(): Promise<ContainerOperationResult> {
    try {
      // Rate limiting
      this.checkRateLimit();

      const containerInfo = await this.findContainer();

      if (!containerInfo) {
        return {
          success: false,
          message: 'Clara-Core container does not exist. Please create it first.',
          error: 'CONTAINER_NOT_FOUND',
        };
      }

      if (containerInfo.State === 'running') {
        return {
          success: true,
          message: 'Clara-Core is already running',
          containerId: containerInfo.Id,
        };
      }

      console.log('Starting Clara-Core container:', containerInfo.Id);

      const container = this.docker.getContainer(containerInfo.Id);
      await container.start();

      // Wait for healthy status
      console.log('Waiting for Clara-Core to become healthy...');
      const healthy = await this.waitForHealthy();

      if (!healthy) {
        return {
          success: false,
          message: 'Clara-Core started but failed health check',
          containerId: containerInfo.Id,
          error: 'HEALTH_CHECK_FAILED',
        };
      }

      return {
        success: true,
        message: 'Clara-Core started successfully',
        containerId: containerInfo.Id,
      };
    } catch (error: any) {
      console.error('Error starting container:', error);
      return {
        success: false,
        message: 'Failed to start Clara-Core container',
        error: error.message,
      };
    }
  }

  /**
   * Stop Clara-Core container
   */
  async stopContainer(timeoutSeconds = 10): Promise<ContainerOperationResult> {
    try {
      // Rate limiting
      this.checkRateLimit();

      const containerInfo = await this.findContainer();

      if (!containerInfo) {
        return {
          success: false,
          message: 'Clara-Core container does not exist',
          error: 'CONTAINER_NOT_FOUND',
        };
      }

      if (containerInfo.State !== 'running') {
        return {
          success: true,
          message: 'Clara-Core is already stopped',
          containerId: containerInfo.Id,
        };
      }

      console.log('Stopping Clara-Core container:', containerInfo.Id);

      const container = this.docker.getContainer(containerInfo.Id);
      await container.stop({ t: timeoutSeconds });

      return {
        success: true,
        message: 'Clara-Core stopped successfully',
        containerId: containerInfo.Id,
      };
    } catch (error: any) {
      console.error('Error stopping container:', error);
      return {
        success: false,
        message: 'Failed to stop Clara-Core container',
        error: error.message,
      };
    }
  }

  /**
   * Restart Clara-Core container
   */
  async restartContainer(): Promise<ContainerOperationResult> {
    try {
      // Rate limiting
      this.checkRateLimit();

      const containerInfo = await this.findContainer();

      if (!containerInfo) {
        return {
          success: false,
          message: 'Clara-Core container does not exist',
          error: 'CONTAINER_NOT_FOUND',
        };
      }

      console.log('Restarting Clara-Core container:', containerInfo.Id);

      const container = this.docker.getContainer(containerInfo.Id);
      await container.restart();

      // Wait for healthy status
      console.log('Waiting for Clara-Core to become healthy...');
      const healthy = await this.waitForHealthy();

      if (!healthy) {
        return {
          success: false,
          message: 'Clara-Core restarted but failed health check',
          containerId: containerInfo.Id,
          error: 'HEALTH_CHECK_FAILED',
        };
      }

      return {
        success: true,
        message: 'Clara-Core restarted successfully',
        containerId: containerInfo.Id,
      };
    } catch (error: any) {
      console.error('Error restarting container:', error);
      return {
        success: false,
        message: 'Failed to restart Clara-Core container',
        error: error.message,
      };
    }
  }

  /**
   * Remove Clara-Core container
   */
  async removeContainer(force = false): Promise<ContainerOperationResult> {
    try {
      // Rate limiting
      this.checkRateLimit();

      const containerInfo = await this.findContainer();

      if (!containerInfo) {
        return {
          success: true,
          message: 'Clara-Core container does not exist',
        };
      }

      console.log('Removing Clara-Core container:', containerInfo.Id);

      const container = this.docker.getContainer(containerInfo.Id);

      // Stop if running
      if (containerInfo.State === 'running' && !force) {
        await container.stop({ t: 10 });
      }

      await container.remove({ force });

      return {
        success: true,
        message: 'Clara-Core container removed successfully',
        containerId: containerInfo.Id,
      };
    } catch (error: any) {
      console.error('Error removing container:', error);
      return {
        success: false,
        message: 'Failed to remove Clara-Core container',
        error: error.message,
      };
    }
  }

  /**
   * Get container logs
   */
  async getLogs(options: ContainerLogsOptions = {}): Promise<string> {
    try {
      const containerInfo = await this.findContainer();

      if (!containerInfo) {
        return 'Container does not exist';
      }

      const container = this.docker.getContainer(containerInfo.Id);

      const logOptions: any = {
        stdout: true,
        stderr: true,
        tail: options.lines || 100,
        timestamps: options.timestamps || false,
      };

      if (options.since) {
        logOptions.since = options.since;
      }

      const logStream = await container.logs(logOptions);

      // Convert buffer to string
      return logStream.toString('utf8');
    } catch (error: any) {
      console.error('Error getting container logs:', error);
      return `Error retrieving logs: ${error.message}`;
    }
  }

  /**
   * Configure Clara-Core (update settings)
   */
  async configure(options: ConfigureContainerOptions): Promise<ContainerOperationResult> {
    try {
      const status = await this.getStatus();

      if (!status.exists) {
        return {
          success: false,
          message: 'Container does not exist',
          error: 'CONTAINER_NOT_FOUND',
        };
      }

      // Check if architecture change is requested
      const requiresRecreate = options.architecture && options.architecture !== status.architecture;

      if (requiresRecreate) {
        return {
          success: false,
          message: 'Architecture change requires container recreation. Please remove and recreate the container.',
          error: 'REQUIRES_RECREATE',
          details: {
            currentArchitecture: status.architecture,
            requestedArchitecture: options.architecture,
          },
        };
      }

      // For now, configuration changes require recreation
      // In the future, we could support runtime configuration updates
      return {
        success: false,
        message: 'Configuration updates require container recreation. Please remove and recreate the container.',
        error: 'REQUIRES_RECREATE',
      };
    } catch (error: any) {
      console.error('Error configuring container:', error);
      return {
        success: false,
        message: 'Failed to configure Clara-Core',
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const claraCoreDocker = new ClaraCoreDockerService();
