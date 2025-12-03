<objective>
Integrate Clara-Core management into the existing UnifiedServiceManager component, allowing users to monitor status, start/stop the container, change configuration, and re-run the setup wizard if needed.

**End goal**: Seamless Clara-Core management alongside other ClaraVerse services (Python backend, N8N, ComfyUI) with consistent UI/UX patterns.

**Why this matters**: After initial setup via the wizard (prompt 011), users need ongoing management capabilities. This integration provides a single pane of glass for all service management in ClaraVerse.
</objective>

<context>
This is the final prompt in a sequential series:
1. ✅ Prompt 009: Research Clara-Core architecture (completed)
2. ✅ Prompt 010: Server-side Docker API endpoints (completed)
3. ✅ Prompt 011: Setup wizard UI (completed)
4. → **Prompt 012: Service Manager integration** (current)

The UnifiedServiceManager already manages several services. We need to add Clara-Core as a new managed service with appropriate controls.

**Related files**:
@src/components/Settings/UnifiedServiceManager.tsx (main component to modify)
@src/components/ClaraCore/ClaraCoreSetupWizard.tsx (wizard to integrate)
@server/src/api/claraCoreRoutes.ts (API endpoints to consume)
</context>

<requirements>
**Functional Requirements**:

1. **Add Clara-Core Service Card**:
   - Similar to other service cards (Python Backend, N8N, ComfyUI)
   - Show service icon, name, description
   - Display current status (Not Configured, Running, Stopped, Error)
   - Show selected architecture (CPU/CUDA/ROCm/Strix)
   - Port information (8091)

2. **Status Monitoring**:
   - Poll `/api/server/clara-core/status` periodically
   - Show real-time status indicators (green/yellow/red dot)
   - Display uptime when running
   - Show last error if failed

3. **Action Buttons**:
   - **Setup**: Launch setup wizard (if not configured)
   - **Start**: Start container (if stopped)
   - **Stop**: Stop container (if running)
   - **Restart**: Restart container
   - **Reconfigure**: Re-run setup wizard (clears existing config)
   - **View Logs**: Open log viewer modal
   - **Open UI**: External link to Clara-Core UI (if running)

4. **Architecture Display & Change**:
   - Show current architecture with icon (Cpu/Gpu)
   - "Change Architecture" button → warns about recreation
   - Launches wizard with pre-selected current settings
   - Handles container removal and recreation

5. **Integration with First-Time Setup**:
   - If user hasn't configured Clara-Core, show prompt
   - Option in FirstTimeSetupModal to configure Clara-Core
   - Skip option available (not mandatory)

6. **Error Handling**:
   - Docker not available → clear message with troubleshooting
   - Container unhealthy → show health check errors
   - Port conflict → actionable resolution steps
   - Suggest automatic fixes where possible

**Design Requirements**:
- Match existing service card layout
- Consistent with UnifiedServiceManager patterns
- Use same status indicators as other services
- Smooth animations for state changes
- Mobile-responsive design
</requirements>

<implementation>
**1. Update UnifiedServiceManager.tsx**

Add Clara-Core to the services list:

```typescript
const services = [
  {
    id: 'claracore',
    name: 'Clara-Core',
    icon: <Bot className="w-5 h-5" />,
    description: 'Local LLM inference server (llama.cpp)',
    port: 8091,
    uiPath: '/ui/models',
    statusEndpoint: '/api/server/clara-core/status',
    required: false, // Optional service
  },
  // ... existing services
];
```

**2. Add Clara-Core State Management**

```typescript
const [claraCoreStatus, setClaraCoreStatus] = useState<ServiceStatus>({
  running: false,
  configured: false,
  architecture: null,
  error: null,
  uptime: null,
});

const [showClaraCoreWizard, setShowClaraCoreWizard] = useState(false);
const [showClaraCoreLogs, setShowClaraCoreLogs] = useState(false);
```

**3. Implement Status Fetching**

```typescript
const fetchClaraCoreStatus = async () => {
  try {
    const response = await fetch('/api/server/clara-core/status');
    const data = await response.json();

    setClaraCoreStatus({
      running: data.running,
      configured: data.exists,
      architecture: data.architecture,
      healthy: data.healthy,
      port: data.port,
      uptime: data.uptime,
      error: data.error || null,
    });
  } catch (error) {
    console.error('Failed to fetch Clara-Core status:', error);
    setClaraCoreStatus(prev => ({
      ...prev,
      running: false,
      error: 'Failed to connect to server',
    }));
  }
};

// Poll every 10 seconds
useEffect(() => {
  fetchClaraCoreStatus();
  const interval = setInterval(fetchClaraCoreStatus, 10000);
  return () => clearInterval(interval);
}, []);
```

**4. Implement Action Handlers**

```typescript
const handleClaraCoreStart = async () => {
  try {
    const response = await fetch('/api/server/clara-core/start', {
      method: 'POST',
    });
    const data = await response.json();

    if (data.success) {
      // Poll status until running
      const pollForRunning = setInterval(async () => {
        await fetchClaraCoreStatus();
        if (claraCoreStatus.running) {
          clearInterval(pollForRunning);
        }
      }, 2000);

      setTimeout(() => clearInterval(pollForRunning), 60000); // Timeout after 1 min
    } else {
      // Show error
      alert(data.message || 'Failed to start Clara-Core');
    }
  } catch (error) {
    console.error('Failed to start Clara-Core:', error);
    alert('Failed to start Clara-Core. Check logs for details.');
  }
};

const handleClaraCoreStop = async () => {
  try {
    const response = await fetch('/api/server/clara-core/stop', {
      method: 'POST',
    });
    const data = await response.json();

    if (data.success) {
      await fetchClaraCoreStatus();
    } else {
      alert(data.message || 'Failed to stop Clara-Core');
    }
  } catch (error) {
    console.error('Failed to stop Clara-Core:', error);
  }
};

const handleClaraCoreRestart = async () => {
  await handleClaraCoreStop();
  setTimeout(() => handleClaraCoreStart(), 2000);
};

const handleClaraCoreReconfigure = async () => {
  // Warn user
  const confirmed = confirm(
    'Reconfiguring will stop and remove the existing Clara-Core container. Continue?'
  );

  if (confirmed) {
    // Remove container
    await fetch('/api/server/clara-core/remove', { method: 'DELETE' });

    // Launch wizard
    setShowClaraCoreWizard(true);
  }
};
```

**5. Create Clara-Core Service Card Component**

```tsx
<ServiceCard>
  <ServiceHeader>
    <ServiceIcon><Bot /></ServiceIcon>
    <ServiceInfo>
      <ServiceName>Clara-Core</ServiceName>
      <ServiceDescription>
        Local LLM inference ({claraCoreStatus.architecture || 'Not configured'})
      </ServiceDescription>
    </ServiceInfo>
    <StatusIndicator
      status={claraCoreStatus.running ? 'running' : 'stopped'}
      healthy={claraCoreStatus.healthy}
    />
  </ServiceHeader>

  <ServiceBody>
    {claraCoreStatus.configured ? (
      <>
        <InfoRow>
          <Label>Architecture:</Label>
          <Value>
            {claraCoreStatus.architecture?.toUpperCase()}
            {claraCoreStatus.architecture === 'cuda' && <Gpu className="inline ml-1" />}
            {claraCoreStatus.architecture === 'cpu' && <Cpu className="inline ml-1" />}
          </Value>
        </InfoRow>

        <InfoRow>
          <Label>Port:</Label>
          <Value>8091</Value>
        </InfoRow>

        {claraCoreStatus.running && (
          <InfoRow>
            <Label>Uptime:</Label>
            <Value>{formatUptime(claraCoreStatus.uptime)}</Value>
          </InfoRow>
        )}

        {claraCoreStatus.error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{claraCoreStatus.error}</AlertDescription>
          </Alert>
        )}
      </>
    ) : (
      <EmptyState>
        <Icon><Server /></Icon>
        <Text>Clara-Core not configured</Text>
        <Description>
          Set up local LLM inference with CPU or GPU acceleration
        </Description>
      </EmptyState>
    )}
  </ServiceBody>

  <ServiceActions>
    {!claraCoreStatus.configured ? (
      <Button onClick={() => setShowClaraCoreWizard(true)}>
        <Plus /> Setup Clara-Core
      </Button>
    ) : (
      <>
        {!claraCoreStatus.running ? (
          <Button onClick={handleClaraCoreStart}>
            <Play /> Start
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleClaraCoreStop}>
              <Square /> Stop
            </Button>
            <Button variant="outline" onClick={handleClaraCoreRestart}>
              <RefreshCw /> Restart
            </Button>
          </>
        )}

        <Button variant="ghost" onClick={() => setShowClaraCoreLogs(true)}>
          <FileText /> Logs
        </Button>

        {claraCoreStatus.running && (
          <Button
            variant="ghost"
            onClick={() => window.open(`http://localhost:8091/ui/models`, '_blank')}
          >
            <ExternalLink /> Open UI
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger>
            <MoreVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleClaraCoreReconfigure}>
              <Settings /> Reconfigure
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                if (confirm('Remove Clara-Core container?')) {
                  await fetch('/api/server/clara-core/remove', { method: 'DELETE' });
                  await fetchClaraCoreStatus();
                }
              }}
            >
              <Trash /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )}
  </ServiceActions>
</ServiceCard>
```

**6. Add Wizard Modal**

```tsx
{showClaraCoreWizard && (
  <Modal onClose={() => setShowClaraCoreWizard(false)}>
    <ClaraCoreSetupWizard
      onComplete={async (config) => {
        setShowClaraCoreWizard(false);
        // Refresh status
        await fetchClaraCoreStatus();
      }}
      onCancel={() => setShowClaraCoreWizard(false)}
      onSkip={() => setShowClaraCoreWizard(false)}
    />
  </Modal>
)}
```

**7. Add Logs Modal**

```tsx
{showClaraCoreLogs && (
  <Modal onClose={() => setShowClaraCoreLogs(false)} size="large">
    <ClaraCoreLogsViewer
      onClose={() => setShowClaraCoreLogs(false)}
    />
  </Modal>
)}
```

Create new component: `./src/components/ClaraCore/ClaraCoreLogsViewer.tsx`

```tsx
const ClaraCoreLogsViewer = ({ onClose }) => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/server/clara-core/logs?lines=500');
        const data = await response.json();
        setLogs(data.logs);
      } catch (error) {
        setLogs('Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="clara-core-logs">
      <div className="logs-header">
        <h2>Clara-Core Logs</h2>
        <button onClick={onClose}><X /></button>
      </div>
      <div className="logs-body">
        {loading ? (
          <Loader />
        ) : (
          <pre className="logs-content">
            {logs}
          </pre>
        )}
      </div>
    </div>
  );
};
```
</implementation>

<integration_points>
**1. FirstTimeSetupModal Integration**

Add Clara-Core as optional setup step:

```tsx
// In FirstTimeSetupModal.tsx
const setupSteps = [
  // ... existing steps
  {
    id: 'claracore',
    title: 'Local LLM (Optional)',
    description: 'Set up Clara-Core for local model inference',
    optional: true,
    component: <ClaraCoreSetupPrompt />,
  },
];
```

**2. Settings Navigation**

Ensure Clara-Core section is visible in settings:

```tsx
// In Settings.tsx or similar
<SettingsNav>
  <NavItem href="#services">Services</NavItem>
  {/* Clara-Core card will appear in UnifiedServiceManager */}
</SettingsNav>
```

**3. Provider Configuration**

After Clara-Core is running, allow adding it as a provider:

- Show prompt: "Clara-Core is running! Add it as a provider?"
- Link to Add Provider flow with pre-filled Clara-Core settings
- Default provider config:
  - Type: OpenAI Compatible
  - Base URL: http://localhost:8091/v1
  - API Key: (not required for local)
</integration_points>

<output>
Update existing file:
- `./src/components/Settings/UnifiedServiceManager.tsx`
  - Add Clara-Core service definition
  - Add state management for Clara-Core
  - Add status fetching
  - Add action handlers
  - Add service card in UI
  - Add wizard modal integration
  - Add logs modal integration

Create new files:
- `./src/components/ClaraCore/ClaraCoreLogsViewer.tsx`
  - Logs display component
  - Auto-refresh functionality
  - Copy/download logs buttons

Update:
- `./src/components/FirstTimeSetupModal.tsx`
  - Add optional Clara-Core setup step
  - Skip functionality
</output>

<verification>
Before completing, verify:

1. **Clara-Core appears in service list**:
   - Card renders correctly
   - Icon and description match other services
   - Status indicators work

2. **Status monitoring works**:
   - Polling updates status every 10 seconds
   - Status changes reflect immediately
   - Uptime displays correctly

3. **Actions functional**:
   - Setup button launches wizard
   - Start/stop/restart work
   - Logs viewer shows logs
   - External UI link opens Clara-Core
   - Reconfigure warns and removes container

4. **Integration complete**:
   - Wizard closes and refreshes status on complete
   - First-time setup includes Clara-Core (optional)
   - Provider can be added after Clara-Core running

5. **Error scenarios**:
   - Docker unavailable → clear error displayed
   - Container unhealthy → shows health check error
   - Port conflict → actionable message

6. **Responsive design**:
   - Service card works on mobile
   - Wizard modal scales properly
   - Logs viewer readable on small screens
</verification>

<success_criteria>
- Clara-Core service card appears in UnifiedServiceManager
- Status monitoring works with real-time updates
- All action buttons functional (setup, start, stop, restart, logs, reconfigure)
- Setup wizard launches from service card
- Architecture displayed with appropriate icon
- Logs viewer shows container logs
- First-time setup includes optional Clara-Core configuration
- Error states handled gracefully with user-friendly messages
- Consistent with existing service management patterns
- Complete Clara-Core management workflow from setup to daily use
</success_criteria>
