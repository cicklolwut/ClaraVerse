/**
 * ClaraCoreSetupWizard - Main Component
 *
 * Multi-step wizard for Clara-Core container setup with GPU detection,
 * architecture selection, and automated container creation.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type {
  ClaraCoreSetupWizardProps,
  WizardState,
  Architecture,
} from './types';
import { WelcomeStep } from './steps/WelcomeStep';
import { ArchitectureSelectionStep } from './steps/ArchitectureSelectionStep';
import { ConfigurationStep } from './steps/ConfigurationStep';
import { CreationStep } from './steps/CreationStep';
import { SuccessStep } from './steps/SuccessStep';

const STEPS = [
  { id: 'welcome', label: 'Welcome', component: WelcomeStep },
  { id: 'architecture', label: 'Architecture', component: ArchitectureSelectionStep },
  { id: 'configuration', label: 'Configuration', component: ConfigurationStep },
  { id: 'creation', label: 'Creation', component: CreationStep },
  { id: 'success', label: 'Success', component: SuccessStep },
];

export const ClaraCoreSetupWizard: React.FC<ClaraCoreSetupWizardProps> = ({
  onComplete,
  onCancel,
  onSkip,
}) => {
  const [state, setState] = useState<WizardState>({
    step: 0,
    maxSteps: STEPS.length,
    gpuInfo: null,
    selectedArchitecture: 'cpu' as Architecture,
    modelsPath: '',
    autoStart: true,
    isCreating: false,
    error: null,
    logs: [],
    containerId: null,
  });

  // Update state helper
  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Navigation handlers
  const handleNext = () => {
    if (state.step < STEPS.length - 1) {
      setState((prev) => ({ ...prev, step: prev.step + 1 }));
    } else {
      // Last step - complete
      onComplete({
        architecture: state.selectedArchitecture,
        modelsPath: state.modelsPath || undefined,
        autoStart: state.autoStart,
      });
    }
  };

  const handleBack = () => {
    if (state.step > 0) {
      setState((prev) => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const handleCancel = () => {
    if (onSkip && state.step === 0) {
      onSkip();
    } else {
      onCancel();
    }
  };

  // Get current step component
  const CurrentStepComponent = STEPS[state.step].component;

  // Progress indicator (steps 1-4 only, not welcome or success)
  const showProgress = state.step > 0 && state.step < STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header with Progress */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center justify-between p-4">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Clara-Core Setup
              </h1>
              {showProgress && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Step {state.step} of {state.maxSteps - 2}
                </p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close wizard"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2">
                {STEPS.slice(1, -1).map((step, index) => {
                  const stepNumber = index + 1;
                  const isActive = state.step === stepNumber;
                  const isComplete = state.step > stepNumber;

                  return (
                    <React.Fragment key={step.id}>
                      <div
                        className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                          isComplete
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600'
                            : isActive
                            ? 'bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                      {index < STEPS.length - 3 && (
                        <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                {STEPS.slice(1, -1).map((step, index) => {
                  const stepNumber = index + 1;
                  const isActive = state.step === stepNumber;
                  const isComplete = state.step > stepNumber;

                  return (
                    <div
                      key={step.id}
                      className={`text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-purple-600 dark:text-purple-400'
                          : isComplete
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <CurrentStepComponent
            onNext={handleNext}
            onBack={handleBack}
            onCancel={handleCancel}
            state={state}
            updateState={updateState}
          />
        </div>
      </div>
    </div>
  );
};

export default ClaraCoreSetupWizard;
