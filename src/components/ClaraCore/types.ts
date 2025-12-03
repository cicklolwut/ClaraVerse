/**
 * ClaraCore Setup Wizard - Type Definitions
 *
 * Shared TypeScript interfaces for the Clara-Core setup wizard components.
 */

/**
 * Main wizard props
 */
export interface ClaraCoreSetupWizardProps {
  onComplete: (config: ClaraCoreConfig) => void;
  onCancel: () => void;
  onSkip?: () => void;
}

/**
 * Configuration returned on wizard completion
 */
export interface ClaraCoreConfig {
  architecture: Architecture;
  modelsPath?: string;
  autoStart: boolean;
}

/**
 * Supported architectures
 */
export type Architecture = 'cpu' | 'cuda' | 'rocm' | 'strix';

/**
 * GPU information from detection API
 */
export interface GPUInfo {
  detected: boolean;
  type: 'nvidia' | 'amd' | 'none';
  devices: string[];
  recommended: Architecture;
  vramGB?: number;
}

/**
 * Internal wizard state
 */
export interface WizardState {
  step: number;
  maxSteps: number;
  gpuInfo: GPUInfo | null;
  selectedArchitecture: Architecture;
  modelsPath: string;
  autoStart: boolean;
  isCreating: boolean;
  error: string | null;
  logs: string[];
  containerId: string | null;
}

/**
 * Container creation request
 */
export interface CreateContainerRequest {
  architecture: Architecture;
  modelsPath?: string;
  autoStart?: boolean;
}

/**
 * Container status from API
 */
export interface ContainerStatus {
  status: 'creating' | 'starting' | 'running' | 'stopped' | 'error';
  containerId?: string;
  message?: string;
  progress?: number;
  url?: string;
  port?: number;
}

/**
 * Architecture option for UI display
 */
export interface ArchitectureOption {
  value: Architecture;
  label: string;
  description: string;
  icon: string;
  requirements: string;
  performance: string;
  recommended?: boolean;
}

/**
 * Progress step for creation phase
 */
export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
}

/**
 * Step component props
 */
export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}
