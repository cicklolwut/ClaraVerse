/**
 * CreationStep - Clara-Core Setup Wizard
 *
 * Container creation with progress tracking, status polling, and logs.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import type { StepProps, ProgressStep } from '../types';
import { useClaraCoreSetup } from '../../../hooks/useClaraCoreSetup';

const INITIAL_PROGRESS_STEPS: ProgressStep[] = [
  { id: 'validate', label: 'Validating configuration', status: 'pending' },
  { id: 'pull', label: 'Pulling Docker image', status: 'pending' },
  { id: 'create', label: 'Creating container', status: 'pending' },
  { id: 'start', label: 'Starting service', status: 'pending' },
  { id: 'health', label: 'Checking health', status: 'pending' },
];

export const CreationStep: React.FC<StepProps> = ({ onNext, state, updateState }) => {
  const { createContainer, getStatus, getLogs, isCreating } = useClaraCoreSetup();
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_PROGRESS_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(60);
  const [hasStarted, setHasStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Update progress step status
  const updateProgressStep = useCallback(
    (id: string, status: ProgressStep['status']) => {
      setProgressSteps((prev) =>
        prev.map((step) => (step.id === id ? { ...step, status } : step))
      );
    },
    []
  );

  // Mark current step as in-progress, previous as complete
  const advanceProgress = useCallback(
    (stepIndex: number) => {
      setCurrentStepIndex(stepIndex);
      setProgressSteps((prev) =>
        prev.map((step, idx) => ({
          ...step,
          status:
            idx < stepIndex
              ? 'complete'
              : idx === stepIndex
              ? 'in-progress'
              : 'pending',
        }))
      );
    },
    []
  );

  // Poll status and update progress
  const pollStatus = useCallback(async () => {
    const status = await getStatus();
    if (!status) return false;

    // Update progress based on status
    switch (status.status) {
      case 'creating':
        advanceProgress(2); // Creating container
        break;
      case 'starting':
        advanceProgress(3); // Starting service
        break;
      case 'running':
        advanceProgress(4); // Health check
        updateProgressStep('health', 'complete');
        updateState({
          containerId: status.containerId,
        });
        return true; // Success
      case 'error':
        updateProgressStep(progressSteps[currentStepIndex]?.id || 'create', 'error');
        updateState({
          error: status.message || 'Container creation failed',
        });
        return true; // Stop polling
      default:
        break;
    }

    return false; // Continue polling
  }, [getStatus, advanceProgress, updateProgressStep, currentStepIndex, progressSteps, updateState]);

  // Start container creation
  const startCreation = useCallback(async () => {
    if (hasStarted) return;

    setHasStarted(true);
    updateState({ isCreating: true, error: null });

    try {
      // Step 1: Validate
      advanceProgress(0);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Pull image (API call will handle this)
      advanceProgress(1);
      const success = await createContainer({
        architecture: state.selectedArchitecture,
        modelsPath: state.modelsPath || undefined,
        autoStart: state.autoStart,
      });

      if (!success) {
        updateProgressStep('pull', 'error');
        updateState({
          error: 'Failed to create container. Check Docker and try again.',
          isCreating: false,
        });
        return;
      }

      // Start polling for status
      let pollAttempts = 0;
      const maxPollAttempts = 60; // 2 minutes at 2s intervals
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        const completed = await pollStatus();

        // Update estimated time
        setEstimatedTimeRemaining(Math.max(0, 60 - pollAttempts * 2));

        if (completed || pollAttempts >= maxPollAttempts) {
          clearInterval(pollInterval);
          updateState({ isCreating: false });

          if (pollAttempts >= maxPollAttempts && !completed) {
            updateProgressStep('health', 'error');
            updateState({
              error: 'Container creation timed out. Please check logs.',
            });
          } else if (completed && !state.error) {
            // Success - advance to next step
            onNext();
          }
        }
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateState({
        error: errorMessage,
        isCreating: false,
      });
      updateProgressStep(progressSteps[currentStepIndex]?.id || 'create', 'error');
    }
  }, [
    hasStarted,
    createContainer,
    pollStatus,
    advanceProgress,
    updateProgressStep,
    state,
    updateState,
    onNext,
    progressSteps,
    currentStepIndex,
  ]);

  // Auto-start creation on mount
  useEffect(() => {
    startCreation();
  }, [startCreation]);

  // Load logs when expanded
  const handleToggleLogs = async () => {
    if (!showLogs) {
      const logs = await getLogs();
      updateState({ logs });
    }
    setShowLogs(!showLogs);
  };

  // Retry creation
  const handleRetry = () => {
    setRetryCount(retryCount + 1);
    setHasStarted(false);
    setCurrentStepIndex(0);
    setProgressSteps(INITIAL_PROGRESS_STEPS);
    setEstimatedTimeRemaining(60);
    updateState({ error: null, isCreating: false });
    // Trigger re-run by calling startCreation on next render
    setTimeout(() => startCreation(), 100);
  };

  // Calculate overall progress percentage
  const progressPercentage = Math.round(
    (progressSteps.filter((s) => s.status === 'complete').length / progressSteps.length) * 100
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Creating Clara-Core Container
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This may take a few moments. Please don't close this window.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="space-y-3">
          {progressSteps.map((step, index) => {
            const isActive = step.status === 'in-progress';
            const isComplete = step.status === 'complete';
            const isError = step.status === 'error';

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : isComplete
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : isError
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex-shrink-0">
                  {isActive && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                  {isComplete && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {isError && <AlertCircle className="w-5 h-5 text-red-600" />}
                  {step.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-900 dark:text-blue-100'
                        : isComplete
                        ? 'text-green-900 dark:text-green-100'
                        : isError
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Overall Progress</span>
          <span className="font-semibold">{progressPercentage}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {state.isCreating && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Estimated time remaining: ~{estimatedTimeRemaining} seconds
          </p>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Creation Failed
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Logs */}
      <div className="mb-6">
        <button
          onClick={handleToggleLogs}
          className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Container Logs {state.logs.length > 0 && `(${state.logs.length})`}
          </span>
          {showLogs ? (
            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
        {showLogs && (
          <div className="mt-2 bg-gray-900 dark:bg-black rounded-lg p-4 max-h-64 overflow-y-auto">
            {state.logs.length > 0 ? (
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {state.logs.join('\n')}
              </pre>
            ) : (
              <p className="text-xs text-gray-500">No logs available yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
        {state.error ? (
          <button
            onClick={handleRetry}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again {retryCount > 0 && `(Attempt ${retryCount + 1})`}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating your container...</span>
          </div>
        )}
      </div>
    </div>
  );
};
