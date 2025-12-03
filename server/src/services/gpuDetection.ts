/**
 * GPU Detection Service
 * Detects available GPU hardware and recommends Clara-Core architecture
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { GPUDetectionResult, GPUType, ClaraCoreArchitecture } from '../types/claraCore';

const execAsync = promisify(exec);

/**
 * Cache for GPU detection results
 */
interface GPUDetectionCache {
  result: GPUDetectionResult | null;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache: GPUDetectionCache = {
  result: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes
};

/**
 * Check if cached result is still valid
 */
function isCacheValid(): boolean {
  if (!cache.result) return false;
  const now = Date.now();
  return (now - cache.timestamp) < cache.ttl;
}

/**
 * Detect NVIDIA GPUs using nvidia-smi
 */
async function detectNvidiaGPU(): Promise<Partial<GPUDetectionResult> | null> {
  try {
    const { stdout, stderr } = await execAsync('nvidia-smi --query-gpu=name,driver_version --format=csv,noheader');

    if (stderr && stderr.trim().length > 0) {
      console.warn('nvidia-smi stderr:', stderr);
    }

    const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      return null;
    }

    const gpuModels: string[] = [];
    let driverVersion = '';

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        gpuModels.push(parts[0]);
        driverVersion = parts[1];
      }
    }

    // Try to get CUDA version
    let cudaVersion: string | undefined;
    try {
      const { stdout: cudaOut } = await execAsync('nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -n1');
      // Parse CUDA version from nvidia-smi
      const versionMatch = cudaOut.match(/CUDA Version: ([\d.]+)/);
      if (versionMatch) {
        cudaVersion = versionMatch[1];
      }
    } catch (err) {
      // Ignore CUDA version errors
    }

    const devices = gpuModels.map((_, idx) => `/dev/nvidia${idx}`);

    return {
      gpuType: GPUType.NVIDIA,
      recommended: ClaraCoreArchitecture.CUDA,
      devices,
      details: {
        driverVersion,
        cudaVersion,
        gpuModels,
      },
    };
  } catch (error: any) {
    // nvidia-smi not found or failed
    console.debug('NVIDIA detection failed:', error.message);
    return null;
  }
}

/**
 * Detect AMD GPUs using rocm-smi
 */
async function detectAmdGPU(): Promise<Partial<GPUDetectionResult> | null> {
  try {
    const { stdout, stderr } = await execAsync('rocm-smi --showproductname');

    if (stderr && stderr.trim().length > 0) {
      console.warn('rocm-smi stderr:', stderr);
    }

    const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);

    // Parse GPU names from rocm-smi output
    const gpuModels: string[] = [];
    for (const line of lines) {
      if (line.includes('GPU') && !line.includes('GPU ID')) {
        const match = line.match(/Card series:\s*(.+)/);
        if (match) {
          gpuModels.push(match[1].trim());
        }
      }
    }

    if (gpuModels.length === 0) {
      return null;
    }

    // Try to get ROCm version
    let rocmVersion: string | undefined;
    try {
      const { stdout: versionOut } = await execAsync('rocm-smi --showversion');
      const versionMatch = versionOut.match(/ROCm version: ([\d.]+)/);
      if (versionMatch) {
        rocmVersion = versionMatch[1];
      }
    } catch (err) {
      // Ignore version errors
    }

    // AMD GPUs typically use /dev/kfd and /dev/dri/renderD*
    const devices = ['/dev/kfd', '/dev/dri'];

    return {
      gpuType: GPUType.AMD,
      recommended: ClaraCoreArchitecture.ROCM,
      devices,
      details: {
        rocmVersion,
        gpuModels,
      },
    };
  } catch (error: any) {
    // rocm-smi not found or failed
    console.debug('AMD ROCm detection failed:', error.message);
    return null;
  }
}

/**
 * Detect AMD GPUs using /sys/class/drm (fallback)
 */
async function detectAmdGPUFallback(): Promise<Partial<GPUDetectionResult> | null> {
  try {
    const { stdout } = await execAsync('ls /dev/dri/renderD* 2>/dev/null || true');

    const devices = stdout.trim().split('\n').filter(d => d.trim().length > 0);

    if (devices.length === 0) {
      return null;
    }

    // Check if these are AMD devices
    try {
      const { stdout: lspciOut } = await execAsync('lspci | grep -i "VGA.*AMD\\|VGA.*ATI" || true');

      if (lspciOut.trim().length === 0) {
        return null;
      }

      const gpuModels = lspciOut.trim().split('\n').map(line => {
        const match = line.match(/VGA.*?: (.+)/);
        return match ? match[1] : 'AMD GPU';
      });

      return {
        gpuType: GPUType.AMD,
        recommended: ClaraCoreArchitecture.ROCM,
        devices: ['/dev/kfd', '/dev/dri'],
        details: {
          gpuModels,
        },
      };
    } catch (err) {
      // lspci not available
      return null;
    }
  } catch (error: any) {
    console.debug('AMD fallback detection failed:', error.message);
    return null;
  }
}

/**
 * Detect GPUs using Docker device inspection
 */
async function detectGPUViaDocker(): Promise<Partial<GPUDetectionResult> | null> {
  try {
    // Try to detect NVIDIA runtime
    const { stdout: dockerInfo } = await execAsync('docker info 2>/dev/null || true');

    if (dockerInfo.includes('nvidia')) {
      // NVIDIA runtime available
      return {
        gpuType: GPUType.NVIDIA,
        recommended: ClaraCoreArchitecture.CUDA,
        devices: ['all'], // Docker handles device allocation
        details: {
          gpuModels: ['NVIDIA GPU (detected via Docker runtime)'],
        },
      };
    }

    // Check for ROCm in Docker
    if (dockerInfo.includes('rocm')) {
      return {
        gpuType: GPUType.AMD,
        recommended: ClaraCoreArchitecture.ROCM,
        devices: ['/dev/kfd', '/dev/dri'],
        details: {
          gpuModels: ['AMD GPU (detected via Docker runtime)'],
        },
      };
    }

    return null;
  } catch (error: any) {
    console.debug('Docker GPU detection failed:', error.message);
    return null;
  }
}

/**
 * Main GPU detection function
 * Tries multiple detection methods and caches the result
 */
export async function detectGPU(skipCache = false): Promise<GPUDetectionResult> {
  // Return cached result if valid
  if (!skipCache && isCacheValid() && cache.result) {
    console.debug('Returning cached GPU detection result');
    return cache.result;
  }

  console.log('Detecting GPU hardware...');

  // Try NVIDIA detection first
  let result = await detectNvidiaGPU();

  // If no NVIDIA, try AMD
  if (!result) {
    result = await detectAmdGPU();
  }

  // If no ROCm, try AMD fallback
  if (!result) {
    result = await detectAmdGPUFallback();
  }

  // If still nothing, try Docker runtime detection
  if (!result) {
    result = await detectGPUViaDocker();
  }

  // Default to CPU if no GPU detected
  const finalResult: GPUDetectionResult = result ? {
    gpuType: result.gpuType!,
    recommended: result.recommended!,
    devices: result.devices!,
    details: result.details,
  } : {
    gpuType: GPUType.NONE,
    recommended: ClaraCoreArchitecture.CPU,
    devices: [],
    details: {},
  };

  // Cache the result
  cache.result = finalResult;
  cache.timestamp = Date.now();

  console.log('GPU detection result:', {
    type: finalResult.gpuType,
    recommended: finalResult.recommended,
    deviceCount: finalResult.devices.length,
  });

  return finalResult;
}

/**
 * Invalidate GPU detection cache
 */
export function invalidateGPUCache(): void {
  cache.result = null;
  cache.timestamp = 0;
  console.debug('GPU detection cache invalidated');
}

/**
 * Get cached GPU detection result (if available)
 */
export function getCachedGPUDetection(): GPUDetectionResult | null {
  if (isCacheValid()) {
    return cache.result;
  }
  return null;
}
