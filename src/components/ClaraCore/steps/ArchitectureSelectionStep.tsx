/**
 * ArchitectureSelectionStep - Clara-Core Setup Wizard
 *
 * GPU detection and architecture selection with dropdown override.
 */

import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Zap,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Monitor,
} from 'lucide-react';
import type { StepProps, Architecture, ArchitectureOption } from '../types';
import { useClaraCoreSetup } from '../../../hooks/useClaraCoreSetup';

const ARCHITECTURE_OPTIONS: ArchitectureOption[] = [
  {
    value: 'cpu',
    label: 'CPU Only',
    description: 'No GPU required, works on any system',
    icon: 'Cpu',
    requirements: 'Any modern CPU',
    performance: '5-10 tokens/s',
  },
  {
    value: 'cuda',
    label: 'CUDA (NVIDIA)',
    description: 'NVIDIA GPU acceleration',
    icon: 'Zap',
    requirements: 'NVIDIA GPU with CUDA support',
    performance: '20-80+ tokens/s',
  },
  {
    value: 'rocm',
    label: 'ROCm (AMD)',
    description: 'AMD GPU acceleration',
    icon: 'Monitor',
    requirements: 'AMD GPU with ROCm support',
    performance: '15-60+ tokens/s',
  },
  {
    value: 'strix',
    label: 'Strix',
    description: 'Specialized architecture for advanced users',
    icon: 'Sparkles',
    requirements: 'Specific hardware configuration',
    performance: 'Variable',
  },
];

const getArchitectureIcon = (icon: string, className: string = 'w-6 h-6') => {
  switch (icon) {
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Monitor':
      return <Monitor className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    default:
      return <Cpu className={className} />;
  }
};

export const ArchitectureSelectionStep: React.FC<StepProps> = ({
  onNext,
  onBack,
  state,
  updateState,
}) => {
  const { detectGPU, isDetecting, detectionError } = useClaraCoreSetup();
  const [hasDetected, setHasDetected] = useState(false);

  // Run GPU detection on mount
  useEffect(() => {
    const runDetection = async () => {
      const gpuInfo = await detectGPU();
      if (gpuInfo) {
        updateState({
          gpuInfo,
          selectedArchitecture: gpuInfo.recommended,
        });
      }
      setHasDetected(true);
    };

    if (!hasDetected) {
      runDetection();
    }
  }, [detectGPU, updateState, hasDetected]);

  const handleArchitectureChange = (arch: Architecture) => {
    updateState({ selectedArchitecture: arch });
  };

  const showWarning =
    state.gpuInfo &&
    !state.gpuInfo.detected &&
    (state.selectedArchitecture === 'cuda' || state.selectedArchitecture === 'rocm');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Select Architecture
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We'll detect your GPU and recommend the best option
        </p>
      </div>

      {/* GPU Detection Status */}
      {isDetecting && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                Detecting GPU Hardware...
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This will only take a moment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detection Error */}
      {detectionError && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 text-sm mb-1">
                GPU Detection Failed
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                {detectionError}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                You can still continue with CPU mode or manually select your architecture.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GPU Info Display */}
      {hasDetected && state.gpuInfo && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 mb-6 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                {state.gpuInfo.detected ? 'GPU Detected' : 'No GPU Detected'}
              </h3>
              {state.gpuInfo.detected ? (
                <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{state.gpuInfo.type}</span>
                  </div>
                  {state.gpuInfo.devices.length > 0 && (
                    <div>
                      <span className="font-medium">Devices:</span>
                      <ul className="ml-4 mt-1 space-y-1">
                        {state.gpuInfo.devices.map((device, idx) => (
                          <li key={idx} className="text-xs">
                            {device}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {state.gpuInfo.vramGB && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">VRAM:</span>
                      <span>{state.gpuInfo.vramGB}GB</span>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-full text-xs font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      Recommended: {ARCHITECTURE_OPTIONS.find(opt => opt.value === state.gpuInfo?.recommended)?.label}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p>No GPU detected on your system. CPU mode will be used.</p>
                  <p className="text-xs mt-2">
                    You can still manually select a GPU architecture if you know your system supports it.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Architecture Selection Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Choose Architecture:
        </label>
        <div className="space-y-3">
          {ARCHITECTURE_OPTIONS.map((option) => {
            const isRecommended = state.gpuInfo?.recommended === option.value;
            const isSelected = state.selectedArchitecture === option.value;

            return (
              <button
                key={option.value}
                onClick={() => handleArchitectureChange(option.value)}
                className={`w-full p-4 rounded-lg text-left transition-all duration-200 border-2 ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 shadow-md'
                    : 'bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 ${
                      isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {getArchitectureIcon(option.icon, 'w-8 h-8')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {option.label}
                      </h4>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Detected
                        </span>
                      )}
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-purple-500 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {option.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Requirements:</span>
                        <p className="text-gray-600 dark:text-gray-400">{option.requirements}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Performance:</span>
                        <p className="text-gray-600 dark:text-gray-400">{option.performance}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Warning for GPU arch without GPU */}
      {showWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-6 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm mb-1">
                Warning: No Compatible GPU Detected
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                You've selected {state.selectedArchitecture.toUpperCase()} but we didn't detect a compatible GPU.
                The container may fail to start or fall back to CPU mode.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!state.selectedArchitecture || isDetecting}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
