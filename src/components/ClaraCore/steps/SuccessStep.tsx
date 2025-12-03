/**
 * SuccessStep - Clara-Core Setup Wizard
 *
 * Success confirmation with summary and next steps.
 */

import React from 'react';
import { CheckCircle, ExternalLink, Settings, Sparkles, ArrowRight } from 'lucide-react';
import type { StepProps } from '../types';
import { env } from '../../../lib/environment';

export const SuccessStep: React.FC<StepProps> = ({ state, onCancel }) => {
  const claraCoreUrl = `${env.claraCoreUrl}`;
  const uiUrl = claraCoreUrl.replace('/api', ''); // Remove /api prefix for UI

  const handleOpenClaraCore = () => {
    if (typeof window !== 'undefined') {
      window.open(uiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleGoToSettings = () => {
    onCancel(); // Close wizard
    // Navigate to settings - this will be handled by parent component
  };

  const handleDone = () => {
    onCancel(); // Close wizard
  };

  return (
    <div className="p-6">
      {/* Success Icon & Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mb-4 animate-bounce">
          <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Clara-Core is Ready!
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Your local LLM server is up and running
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-5 mb-6 border border-green-200 dark:border-green-800">
        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Configuration Summary
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center pb-3 border-b border-green-200 dark:border-green-800">
            <span className="text-green-700 dark:text-green-300 font-medium">
              Architecture:
            </span>
            <span className="text-green-900 dark:text-green-100 font-semibold uppercase">
              {state.selectedArchitecture}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-green-200 dark:border-green-800">
            <span className="text-green-700 dark:text-green-300 font-medium">Status:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-full text-xs font-semibold">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              Running
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-green-200 dark:border-green-800">
            <span className="text-green-700 dark:text-green-300 font-medium">Service URL:</span>
            <code className="text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-2 py-1 rounded">
              {claraCoreUrl}
            </code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-green-700 dark:text-green-300 font-medium">
              Container ID:
            </span>
            <code className="text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-2 py-1 rounded">
              {state.containerId ? state.containerId.substring(0, 12) : 'N/A'}
            </code>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 mb-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <ArrowRight className="w-5 h-5" />
          Next Steps
        </h3>
        <ol className="space-y-2.5 text-sm text-blue-700 dark:text-blue-300">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <div>
              <span className="font-semibold">Download Models:</span> Visit the Clara-Core
              models manager to download your first LLM model (e.g., Llama 3, Mistral).
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div>
              <span className="font-semibold">Configure Providers:</span> Add Clara-Core as a
              provider in ClaraVerse settings to use it with your assistants.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            <div>
              <span className="font-semibold">Start Chatting:</span> Select a Clara-Core model
              in your assistant and enjoy private, local AI inference!
            </div>
          </li>
        </ol>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
          Quick Actions:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleOpenClaraCore}
            className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
          >
            <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Open Clara-Core UI
            </span>
          </button>
          <button
            onClick={handleGoToSettings}
            className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-500 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group"
          >
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform group-hover:rotate-90" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Go to Settings
            </span>
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6 border border-purple-200 dark:border-purple-800">
        <p className="text-xs text-purple-700 dark:text-purple-300">
          <strong>Pro Tip:</strong> You can manage your Clara-Core container (start, stop,
          restart) from the Unified Service Manager in Settings at any time.
        </p>
      </div>

      {/* Done Button */}
      <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleDone}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          <CheckCircle className="w-5 h-5" />
          Done
        </button>
      </div>
    </div>
  );
};
