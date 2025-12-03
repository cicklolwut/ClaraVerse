/**
 * ClaraCore Components - Public API
 *
 * Export the setup wizard and related types for use throughout the application.
 */

export { ClaraCoreSetupWizard as default } from './ClaraCoreSetupWizard';
export { ClaraCoreSetupWizard } from './ClaraCoreSetupWizard';

// Export types
export type {
  ClaraCoreSetupWizardProps,
  ClaraCoreConfig,
  Architecture,
  GPUInfo,
  WizardState,
  ContainerStatus,
  ArchitectureOption,
  ProgressStep,
} from './types';

// Export individual steps (for testing or custom implementations)
export { WelcomeStep } from './steps/WelcomeStep';
export { ArchitectureSelectionStep } from './steps/ArchitectureSelectionStep';
export { ConfigurationStep } from './steps/ConfigurationStep';
export { CreationStep } from './steps/CreationStep';
export { SuccessStep } from './steps/SuccessStep';
