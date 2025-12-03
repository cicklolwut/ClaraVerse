/**
 * useClaraCoreSetup Hook
 *
 * Custom React hook for Clara-Core setup wizard API interactions.
 * Handles GPU detection, container creation, status polling, and logs.
 */

import { useState, useCallback } from 'react';
import { env } from '../lib/environment';
import type {
  GPUInfo,
  Architecture,
  ContainerStatus,
  CreateContainerRequest
} from '../components/ClaraCore/types';

interface UseClaraCoreSetupResult {
  // GPU Detection
  detectGPU: () => Promise<GPUInfo | null>;
  isDetecting: boolean;
  detectionError: string | null;

  // Container Creation
  createContainer: (config: CreateContainerRequest) => Promise<boolean>;
  isCreating: boolean;
  creationError: string | null;

  // Status Polling
  getStatus: () => Promise<ContainerStatus | null>;
  statusError: string | null;

  // Logs
  getLogs: () => Promise<string[]>;
  logsError: string | null;
}

export function useClaraCoreSetup(): UseClaraCoreSetupResult {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const [statusError, setStatusError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);

  /**
   * Detect GPU hardware and get recommended architecture
   */
  const detectGPU = useCallback(async (): Promise<GPUInfo | null> => {
    setIsDetecting(true);
    setDetectionError(null);

    try {
      const response = await fetch(`${env.serverUrl}/api/clara-core/detect-gpu`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`GPU detection failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform API response to GPUInfo
      const gpuInfo: GPUInfo = {
        detected: data.detected || false,
        type: data.type || 'none',
        devices: data.devices || [],
        recommended: data.recommended || 'cpu',
        vramGB: data.vramGB,
      };

      return gpuInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDetectionError(errorMessage);
      console.error('GPU detection error:', error);
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * Create Clara-Core container
   */
  const createContainer = useCallback(
    async (config: CreateContainerRequest): Promise<boolean> => {
      setIsCreating(true);
      setCreationError(null);

      try {
        const response = await fetch(`${env.serverUrl}/api/clara-core/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Container creation failed: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Container creation failed');
        }

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setCreationError(errorMessage);
        console.error('Container creation error:', error);
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  /**
   * Get current container status
   */
  const getStatus = useCallback(async (): Promise<ContainerStatus | null> => {
    setStatusError(null);

    try {
      const response = await fetch(`${env.serverUrl}/api/clara-core/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data = await response.json();

      const status: ContainerStatus = {
        status: data.status || 'stopped',
        containerId: data.containerId,
        message: data.message,
        progress: data.progress,
        url: data.url,
        port: data.port,
      };

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatusError(errorMessage);
      console.error('Status check error:', error);
      return null;
    }
  }, []);

  /**
   * Get container logs
   */
  const getLogs = useCallback(async (): Promise<string[]> => {
    setLogsError(null);

    try {
      const response = await fetch(`${env.serverUrl}/api/clara-core/logs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Log retrieval failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLogsError(errorMessage);
      console.error('Log retrieval error:', error);
      return [];
    }
  }, []);

  return {
    detectGPU,
    isDetecting,
    detectionError,
    createContainer,
    isCreating,
    creationError,
    getStatus,
    statusError,
    getLogs,
    logsError,
  };
}
