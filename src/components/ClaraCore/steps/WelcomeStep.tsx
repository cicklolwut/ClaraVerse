/**
 * WelcomeStep - Clara-Core Setup Wizard
 *
 * Introduction step explaining what Clara-Core is and setup requirements.
 */

import React from 'react';
import { Server, CheckCircle, ChevronRight } from 'lucide-react';
import type { StepProps } from '../types';

export const WelcomeStep: React.FC<StepProps> = ({ onNext, onCancel }) => {
  return (
    <div className="p-6 text-center">
      {/* Hero Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Server className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Set Up Clara-Core
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Local LLM Inference at Your Fingertips
        </p>
      </div>

      {/* What is Clara-Core */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 mb-6 text-left">
        <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 text-lg">
          What is Clara-Core?
        </h3>
        <div className="space-y-2 text-sm text-purple-700 dark:text-purple-300">
          <p>
            Clara-Core is your local Large Language Model (LLM) server that runs entirely on
            your machine. Get fast, private AI inference without relying on cloud services.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="font-semibold mb-1">100% Private</div>
              <div className="text-xs">Your data never leaves your machine</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="font-semibold mb-1">GPU Accelerated</div>
              <div className="text-xs">Blazing fast with NVIDIA or AMD</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="font-semibold mb-1">No API Costs</div>
              <div className="text-xs">Unlimited usage at no extra cost</div>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 mb-6 text-left">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Setup Requirements
        </h3>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Docker is running on your system</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Port 8091 is available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>At least 4GB RAM (8GB recommended)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>GPU optional but recommended for best performance</span>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
          What happens during setup:
        </h3>
        <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
            <span>We'll detect your GPU hardware automatically</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
            <span>You'll choose the best architecture for your system</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
            <span>We'll create and start your Clara-Core container</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-600 dark:text-blue-400">4.</span>
            <span>You'll be ready to use local LLMs in under 2 minutes!</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          Get Started
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Skip Option */}
      <div className="mt-4">
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          I'll set this up later
        </button>
      </div>
    </div>
  );
};
