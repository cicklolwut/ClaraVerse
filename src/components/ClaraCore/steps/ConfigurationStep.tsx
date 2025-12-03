/**
 * ConfigurationStep - Clara-Core Setup Wizard
 *
 * Optional configuration settings (models path, auto-start).
 */

import React from 'react';
import { ChevronRight, ArrowLeft, FolderOpen, Info, Power } from 'lucide-react';
import type { StepProps } from '../types';

export const ConfigurationStep: React.FC<StepProps> = ({
  onNext,
  onBack,
  state,
  updateState,
}) => {
  const handleModelsPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateState({ modelsPath: e.target.value });
  };

  const handleAutoStartToggle = () => {
    updateState({ autoStart: !state.autoStart });
  };

  const handleSkip = () => {
    // Set defaults and proceed
    updateState({
      modelsPath: '',
      autoStart: true,
    });
    onNext();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Optional Configuration
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Customize your Clara-Core setup or use the defaults
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">These settings are optional</p>
            <p className="text-xs">
              You can skip this step and use the recommended defaults. All settings can be
              changed later in the service manager.
            </p>
          </div>
        </div>
      </div>

      {/* Models Path Configuration */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Models Directory Path
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              (Optional)
            </span>
          </div>
        </label>
        <input
          type="text"
          value={state.modelsPath}
          onChange={handleModelsPathChange}
          placeholder="/path/to/your/models (leave blank for default)"
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Specify a custom directory for storing LLM models. If left blank, Clara-Core will
          use the default location inside the container (
          <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            /app/models
          </code>
          ).
        </p>
        <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="font-medium mb-1">Examples:</div>
          <ul className="space-y-1 ml-4">
            <li>
              <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                /home/user/.cache/clara-models
              </code>
            </li>
            <li>
              <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                C:\Users\YourName\Documents\AI\Models
              </code>
            </li>
            <li>
              <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                ~/clara/models
              </code>
            </li>
          </ul>
        </div>
      </div>

      {/* Auto-Start Configuration */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                <Power
                  className={`w-5 h-5 ${
                    state.autoStart
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="auto-start-toggle"
                  className="block font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer"
                >
                  Auto-Start Container
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically start the Clara-Core container after creation. If disabled,
                  you'll need to manually start it from the service manager.
                </p>
              </div>
            </div>
            <button
              id="auto-start-toggle"
              type="button"
              onClick={handleAutoStartToggle}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ml-4 ${
                state.autoStart
                  ? 'bg-green-600 dark:bg-green-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={state.autoStart}
            >
              <span className="sr-only">Auto-start container</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  state.autoStart ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Summary of Selections */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6 border border-purple-200 dark:border-purple-800">
        <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 text-sm">
          Configuration Summary
        </h3>
        <div className="space-y-2 text-sm text-purple-700 dark:text-purple-300">
          <div className="flex justify-between">
            <span className="font-medium">Architecture:</span>
            <span className="uppercase">{state.selectedArchitecture}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Models Path:</span>
            <span className="text-xs">
              {state.modelsPath || 'Default (container internal)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Auto-Start:</span>
            <span>{state.autoStart ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Skip This Step
          </button>
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            Create Container
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
