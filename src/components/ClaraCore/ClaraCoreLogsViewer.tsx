/**
 * ClaraCoreLogsViewer Component
 *
 * Modal component for viewing Clara-Core container logs with auto-refresh,
 * copy, and download functionality.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { env } from '../../lib/environment';

interface ClaraCoreLogsViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClaraCoreLogsViewer: React.FC<ClaraCoreLogsViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch logs from server API
  const fetchLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${env.serverUrl}/api/server/clara-core/logs?lines=500&timestamps=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.logs) {
        setLogs(data.logs);
        // Auto-scroll to bottom
        setTimeout(() => {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error(data.error || 'No logs available');
      }
    } catch (err) {
      console.error('Failed to fetch Clara-Core logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Copy logs to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
      alert('Failed to copy logs to clipboard');
    }
  };

  // Download logs as text file
  const handleDownload = () => {
    try {
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clara-core-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download logs:', err);
      alert('Failed to download logs');
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    fetchLogs(true);
  };

  // Setup auto-refresh
  useEffect(() => {
    if (isOpen) {
      // Initial fetch
      fetchLogs(true);

      // Setup auto-refresh if enabled
      if (autoRefresh) {
        refreshIntervalRef.current = setInterval(() => {
          fetchLogs(false); // Don't show loading spinner for auto-refresh
        }, 5000); // Refresh every 5 seconds
      }
    }

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isOpen, autoRefresh]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Clara-Core Container Logs
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Real-time logs from Clara-Core Docker container
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close logs viewer"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleCopy}
              disabled={!logs || loading}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={!logs || loading}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>

            <div className="flex-1" />

            <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Auto-refresh (5s)
              </span>
            </label>
          </div>
        </div>

        {/* Logs Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {loading && !logs ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loading logs...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Failed to Load Logs
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {error}
                </p>
                <button
                  onClick={() => fetchLogs(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : !logs ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No logs available
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs leading-relaxed overflow-x-auto">
              <pre className="whitespace-pre-wrap break-words">{logs}</pre>
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>
                Lines: {logs ? logs.split('\n').length : 0}
              </span>
              <span>
                Size: {(new Blob([logs]).size / 1024).toFixed(2)} KB
              </span>
            </div>
            <div>
              {autoRefresh && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Auto-refreshing every 5 seconds
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaraCoreLogsViewer;
