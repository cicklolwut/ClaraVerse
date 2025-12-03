/**
 * Clara-Core Setup Wizard - Integration Example
 *
 * This file demonstrates how to integrate the Clara-Core Setup Wizard
 * into various parts of the ClaraVerse application.
 *
 * DO NOT import this file directly - it's for reference only.
 */

import React, { useState } from 'react';
import { ClaraCoreSetupWizard, ClaraCoreConfig } from './src/components/ClaraCore';

// =============================================================================
// Example 1: Simple Button Integration
// =============================================================================

export function SimpleIntegrationExample() {
  const [showWizard, setShowWizard] = useState(false);

  const handleComplete = (config: ClaraCoreConfig) => {
    console.log('Clara-Core configured with:', config);
    // config = {
    //   architecture: 'cuda',
    //   modelsPath: '/path/to/models',
    //   autoStart: true
    // }

    alert(`Clara-Core setup complete! Using ${config.architecture.toUpperCase()}`);
    setShowWizard(false);
  };

  const handleCancel = () => {
    console.log('User cancelled setup');
    setShowWizard(false);
  };

  const handleSkip = () => {
    console.log('User skipped setup');
    setShowWizard(false);
  };

  return (
    <div>
      <button
        onClick={() => setShowWizard(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Setup Clara-Core
      </button>

      {showWizard && (
        <ClaraCoreSetupWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}

// =============================================================================
// Example 2: UnifiedServiceManager Integration
// =============================================================================

export function UnifiedServiceManagerExample() {
  const [showClaraCoreWizard, setShowClaraCoreWizard] = useState(false);
  const [claraCoreStatus, setClaraCoreStatus] = useState<'stopped' | 'running'>('stopped');

  const handleSetupClaraCore = () => {
    setShowClaraCoreWizard(true);
  };

  const handleClaraCoreComplete = async (config: ClaraCoreConfig) => {
    console.log('Clara-Core setup completed with config:', config);

    // Update service configuration in your state/context
    // Example: await updateServiceConfig('clara-core', config);

    // Refresh service status
    await refreshClaraCoreStatus();

    // Close wizard
    setShowClaraCoreWizard(false);

    // Show success notification
    showNotification('Clara-Core setup complete!', 'success');
  };

  const refreshClaraCoreStatus = async () => {
    try {
      const response = await fetch('/api/server/clara-core/status');
      const data = await response.json();
      setClaraCoreStatus(data.status === 'running' ? 'running' : 'stopped');
    } catch (error) {
      console.error('Failed to refresh Clara-Core status:', error);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    // Your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Service Manager</h2>

      {/* Clara-Core Service Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Clara-Core</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Local LLM Inference Server
            </p>
            <span
              className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                claraCoreStatus === 'running'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {claraCoreStatus.toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleSetupClaraCore}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {claraCoreStatus === 'stopped' ? 'Setup' : 'Reconfigure'}
          </button>
        </div>
      </div>

      {/* Wizard Modal */}
      {showClaraCoreWizard && (
        <ClaraCoreSetupWizard
          onComplete={handleClaraCoreComplete}
          onCancel={() => setShowClaraCoreWizard(false)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Example 3: First-Time Setup Integration
// =============================================================================

export function FirstTimeSetupExample() {
  const [setupStep, setSetupStep] = useState<
    'welcome' | 'clara-core' | 'complete'
  >('welcome');
  const [claraCoreConfig, setClaraCoreConfig] = useState<ClaraCoreConfig | null>(
    null
  );

  const handleClaraCoreComplete = (config: ClaraCoreConfig) => {
    setClaraCoreConfig(config);
    setSetupStep('complete');
  };

  const handleSkipClaraCore = () => {
    setSetupStep('complete');
  };

  return (
    <div>
      {setupStep === 'welcome' && (
        <div className="text-center p-6">
          <h1 className="text-3xl font-bold mb-4">Welcome to ClaraVerse!</h1>
          <p className="mb-6">Let's set up your local AI assistant.</p>
          <button
            onClick={() => setSetupStep('clara-core')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg"
          >
            Get Started
          </button>
        </div>
      )}

      {setupStep === 'clara-core' && (
        <ClaraCoreSetupWizard
          onComplete={handleClaraCoreComplete}
          onCancel={() => setSetupStep('welcome')}
          onSkip={handleSkipClaraCore}
        />
      )}

      {setupStep === 'complete' && (
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold mb-4">Setup Complete!</h2>
          {claraCoreConfig ? (
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                Clara-Core configured with {claraCoreConfig.architecture.toUpperCase()}
              </p>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You can set up Clara-Core later from Settings.
            </p>
          )}
          <button
            onClick={() => {
              // Navigate to dashboard
              console.log('Go to dashboard');
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg"
          >
            Start Using ClaraVerse
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Example 4: Programmatic Usage (Advanced)
// =============================================================================

export function ProgrammaticExample() {
  const [wizardOpen, setWizardOpen] = useState(false);

  // Function to check if Clara-Core is configured
  const checkClaraCoreStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/server/clara-core/status');
      const data = await response.json();
      return data.status === 'running';
    } catch {
      return false;
    }
  };

  // Auto-open wizard if Clara-Core not configured
  const ensureClaraCoreSetup = async () => {
    const isRunning = await checkClaraCoreStatus();
    if (!isRunning) {
      setWizardOpen(true);
    }
  };

  // Call this when user tries to use Clara-Core features
  const handleUseClaraCoreFeature = async () => {
    const isRunning = await checkClaraCoreStatus();
    if (!isRunning) {
      const userWantsToSetup = confirm(
        'Clara-Core is not configured. Would you like to set it up now?'
      );
      if (userWantsToSetup) {
        setWizardOpen(true);
      }
    } else {
      // Proceed with Clara-Core feature
      console.log('Using Clara-Core feature...');
    }
  };

  return (
    <div>
      <button
        onClick={handleUseClaraCoreFeature}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Use Local LLM
      </button>

      {wizardOpen && (
        <ClaraCoreSetupWizard
          onComplete={(config) => {
            console.log('Setup complete:', config);
            setWizardOpen(false);
            // Retry the feature that triggered setup
            handleUseClaraCoreFeature();
          }}
          onCancel={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Example 5: With Custom Success Handling
// =============================================================================

export function CustomSuccessHandlingExample() {
  const [showWizard, setShowWizard] = useState(false);
  const [setupStatus, setSetupStatus] = useState<
    'idle' | 'in-progress' | 'success' | 'error'
  >('idle');

  const handleComplete = async (config: ClaraCoreConfig) => {
    setSetupStatus('in-progress');

    try {
      // 1. Update provider configuration
      await updateProvider({
        id: 'clara-core',
        name: 'Clara-Core (Local)',
        baseUrl: 'http://localhost:8091',
        type: 'openai-compatible',
        enabled: true,
      });

      // 2. Test connection
      const testResponse = await fetch('http://localhost:8091/v1/models');
      if (!testResponse.ok) {
        throw new Error('Connection test failed');
      }

      // 3. Load initial models list
      const models = await testResponse.json();
      console.log('Available models:', models);

      setSetupStatus('success');
      setShowWizard(false);

      // 4. Show success notification with next steps
      showCustomSuccessNotification(config);
    } catch (error) {
      console.error('Post-setup configuration failed:', error);
      setSetupStatus('error');
      alert('Clara-Core was created but provider setup failed. Please configure manually.');
      setShowWizard(false);
    }
  };

  const updateProvider = async (provider: any) => {
    // Your provider update logic
    console.log('Updating provider:', provider);
  };

  const showCustomSuccessNotification = (config: ClaraCoreConfig) => {
    // Your custom notification
    const notification = document.createElement('div');
    notification.className =
      'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg';
    notification.innerHTML = `
      <h3 class="font-bold mb-2">Clara-Core is Ready!</h3>
      <p>Architecture: ${config.architecture.toUpperCase()}</p>
      <p class="text-sm mt-2">You can now use local LLMs in your chats.</p>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  };

  return (
    <div>
      <button
        onClick={() => setShowWizard(true)}
        disabled={setupStatus === 'in-progress'}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
      >
        {setupStatus === 'in-progress' ? 'Setting up...' : 'Setup Clara-Core'}
      </button>

      {showWizard && (
        <ClaraCoreSetupWizard
          onComplete={handleComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Helper Functions (for your implementation)
// =============================================================================

/**
 * Check if Clara-Core wizard should be shown automatically
 */
export async function shouldShowClaraCoreWizard(): Promise<boolean> {
  try {
    // Check if user has dismissed the wizard before
    const dismissed = localStorage.getItem('clara-core-wizard-dismissed');
    if (dismissed === 'true') return false;

    // Check if Clara-Core is already configured
    const response = await fetch('/api/server/clara-core/status');
    const data = await response.json();
    return data.status !== 'running';
  } catch {
    return true; // Show wizard if status check fails
  }
}

/**
 * Mark wizard as dismissed
 */
export function dismissClaraCoreWizard() {
  localStorage.setItem('clara-core-wizard-dismissed', 'true');
}

/**
 * Reset wizard dismissed state (for testing or manual trigger)
 */
export function resetClaraCoreWizardDismissal() {
  localStorage.removeItem('clara-core-wizard-dismissed');
}
