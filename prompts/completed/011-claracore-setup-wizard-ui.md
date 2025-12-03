<objective>
Create a dedicated Clara-Core Setup Wizard component that guides users through first-time Clara-Core container configuration. The wizard should detect GPU hardware, allow architecture selection, and trigger container creation through the server API endpoints.

**End goal**: A polished, user-friendly setup wizard that non-technical users can complete in under 2 minutes to get local LLM inference running.

**Why this matters**: Clara-Core setup currently requires command-line knowledge and understanding of Docker. This wizard democratizes access to local LLM inference by making it as simple as clicking "Next" a few times.
</objective>

<context>
This is the third prompt in a sequential series:
1. ✅ Prompt 009: Research Clara-Core architecture (completed)
2. ✅ Prompt 010: Server-side Docker API endpoints (completed)
3. → **Prompt 011: Setup wizard UI** (current)
4. Prompt 012: UnifiedServiceManager integration (next)

The wizard will be shown to users who:
- Are running ClaraVerse in Docker/web mode
- Have not yet configured Clara-Core
- Navigate to Settings → Services or are prompted during first-time setup

**Prerequisites**: Server API endpoints from prompt 010 must be functional.

**Related components**:
@src/components/Settings/UnifiedServiceManager.tsx (will integrate with this later)
@src/components/FirstTimeSetupModal.tsx (similar modal pattern)
@src/lib/environment.ts (deployment mode detection)
</context>

<requirements>
**Functional Requirements**:

1. **Multi-Step Wizard Flow**:
   - Step 1: Welcome & explanation
   - Step 2: GPU detection & architecture selection
   - Step 3: Optional models path configuration
   - Step 4: Container creation & progress
   - Step 5: Success confirmation & next steps

2. **GPU Detection Display**:
   - Show detected GPU(s) with clear icons
   - Display recommended architecture prominently
   - Allow manual override with dropdown
   - Explain each architecture option with pros/cons
   - Handle "no GPU detected" gracefully (recommend CPU)

3. **User Control**:
   - Let users override detected architecture
   - Dropdown with options: CPU, CUDA (NVIDIA), ROCm (AMD), Strix
   - Show "Detected: CUDA" but still allow selection
   - Explain why recommendation was made
   - Warning if selecting GPU arch without GPU

4. **Progress Feedback**:
   - Show container creation progress
   - Display logs during build/start (optional, expandable)
   - Health check status updates
   - Estimated time remaining
   - Handle long operations (60+ seconds) gracefully

5. **Error Handling**:
   - Docker not available → actionable error with instructions
   - Port conflict → detect and suggest alternative
   - Build failure → show error log, offer retry
   - GPU mismatch → warning but allow to continue
   - Network issues → retry option

**Design Requirements**:
- Match ClaraVerse's existing design system
- Use lucide-react icons consistently
- Responsive design (works on mobile)
- Dark mode support
- Smooth transitions between steps
- Clear progress indication (step X of 5)
- Disabled "Next" button until requirements met
</requirements>

<component_specification>
**Main Component**: `ClaraCoreSetupWizard`

**Props**:
```typescript
interface ClaraCoreSetupWizardProps {
  onComplete: (config: ClaraCoreConfig) => void;
  onCancel: () => void;
  onSkip?: () => void; // Optional: allow skipping Clara-Core setup
}

interface ClaraCoreConfig {
  architecture: 'cpu' | 'cuda' | 'rocm' | 'strix';
  modelsPath?: string;
  autoStart: boolean;
}
```

**State Management**:
```typescript
interface WizardState {
  step: number;
  maxSteps: number;
  gpuInfo: GPUInfo | null;
  selectedArchitecture: Architecture;
  modelsPath: string;
  isCreating: boolean;
  error: string | null;
  logs: string[];
  containerId: string | null;
}

interface GPUInfo {
  detected: boolean;
  type: 'nvidia' | 'amd' | 'none';
  devices: string[];
  recommended: Architecture;
}
```

**API Integration** (use the endpoints from prompt 010):
- GET `/api/server/clara-core/detect-gpu` - Step 2
- POST `/api/server/clara-core/create` - Step 4
- GET `/api/server/clara-core/status` - Step 4 (polling)
- GET `/api/server/clara-core/logs` - Step 4 (optional)

**Step Components**:

Each step should be its own sub-component for maintainability:
- `WelcomeStep` - Introduction and explanation
- `ArchitectureSelectionStep` - GPU detection and selection
- `ConfigurationStep` - Optional settings (models path)
- `CreationStep` - Container creation with progress
- `SuccessStep` - Completion and next steps
</component_specification>

<implementation>
**File Structure**:
```
./src/components/ClaraCore/
├── ClaraCoreSetupWizard.tsx       (main component)
├── steps/
│   ├── WelcomeStep.tsx
│   ├── ArchitectureSelectionStep.tsx
│   ├── ConfigurationStep.tsx
│   ├── CreationStep.tsx
│   └── SuccessStep.tsx
└── types.ts                        (shared types)
```

**Step 1: Welcome**
```tsx
<WelcomeStep>
  - Hero icon: Server or Cpu icon
  - Heading: "Set Up Clara-Core Local LLM Inference"
  - Explanation:
    - What Clara-Core is (local LLM serving)
    - Benefits (privacy, speed, no API costs)
    - What will be configured (Docker container)
  - Requirements checklist:
    - ✓ Docker is running
    - ✓ Ports available (8091)
    - ✓ At least 4GB RAM (8GB recommended)
  - Buttons: [Cancel] [Next →]
</WelcomeStep>
```

**Step 2: Architecture Selection**
```tsx
<ArchitectureSelectionStep>
  - GPU Detection display:
    <DetectedHardware>
      {gpuInfo.detected ? (
        - Icon: Gpu icon (green)
        - "Detected: {gpuInfo.type} GPU"
        - Device list: {gpuInfo.devices.join(', ')}
      ) : (
        - Icon: Cpu icon
        - "No GPU detected - CPU mode recommended"
      )}
    </DetectedHardware>

  - Architecture selector:
    <Select>
      <Option value="cpu">
        CPU Only
        - No GPU required
        - Works on any system
        - Slower inference (5-10 tokens/s typical)
        {!gpuInfo.detected && <Badge>Recommended</Badge>}
      </Option>
      <Option value="cuda">
        CUDA (NVIDIA)
        - Requires NVIDIA GPU
        - Fast inference (20-80+ tokens/s)
        - Best compatibility
        {gpuInfo.type === 'nvidia' && <Badge>Recommended</Badge>}
        {gpuInfo.type !== 'nvidia' && <Warning>No NVIDIA GPU detected</Warning>}
      </Option>
      <Option value="rocm">
        ROCm (AMD)
        - Requires AMD GPU
        - Fast inference (15-60+ tokens/s)
        - Newer support
        {gpuInfo.type === 'amd' && <Badge>Recommended</Badge>}
        {gpuInfo.type !== 'amd' && <Warning>No AMD GPU detected</Warning>}
      </Option>
      <Option value="strix">
        Strix (Specialized)
        - Custom optimizations
        - Advanced users only
      </Option>
    </Select>

  - Allow override even if GPU not detected (show warning)
  - Buttons: [← Back] [Next →]
</ArchitectureSelectionStep>
```

**Step 3: Configuration**
```tsx
<ConfigurationStep>
  - Optional models path:
    <Input>
      label: "Models Directory (Optional)"
      placeholder: "/path/to/your/models"
      help: "If you have existing GGUF models, provide the path. Otherwise, models can be downloaded later."
    </Input>

  - Auto-start toggle:
    <Switch>
      label: "Start Clara-Core automatically"
      description: "Launch Clara-Core container when this step completes"
      default: true
    </Switch>

  - Buttons: [← Back] [Skip this step] [Next →]
</ConfigurationStep>
```

**Step 4: Creation**
```tsx
<CreationStep>
  - Status display:
    {isCreating && (
      <ProgressSteps>
        <Step status="complete">Validating configuration</Step>
        <Step status="in-progress">Creating container</Step>
        <Step status="pending">Starting services</Step>
        <Step status="pending">Health check</Step>
      </ProgressSteps>
    )}

  - Progress bar (animated)
  - Status message: "Creating {architecture} container..."
  - Estimated time: "~30-60 seconds"

  - Expandable logs (optional):
    <Accordion>
      <AccordionTrigger>Show detailed logs</AccordionTrigger>
      <AccordionContent>
        <LogViewer logs={logs} />
      </AccordionContent>
    </Accordion>

  - Error handling:
    {error && (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Setup Failed</AlertTitle>
        <AlertDescription>
          {error}
          <Button onClick={retry}>Try Again</Button>
        </AlertDescription>
      </Alert>
    )}

  - Buttons: [Cancel] (disabled during creation)
</CreationStep>
```

**Step 5: Success**
```tsx
<SuccessStep>
  - Success icon: CheckCircle (green, large)
  - Heading: "Clara-Core is ready!"
  - Summary:
    - Architecture: {selectedArchitecture}
    - Status: Running
    - Port: 8091
    - UI: http://localhost:8091/ui/models

  - Next steps:
    <List>
      - "Download or add models in the Clara-Core UI"
      - "Configure Clara-Core as a provider in ClaraVerse"
      - "Start chatting with your local LLMs"
    </List>

  - Quick actions:
    <Actions>
      <Button onClick={openClaraCoreUI}>
        Open Clara-Core UI
      </Button>
      <Button variant="outline" onClick={goToSettings}>
        Go to Service Settings
      </Button>
    </Actions>

  - Buttons: [Done]
</SuccessStep>
```

**Key Implementation Details**:

1. **Polling for Status**:
   - After triggering creation, poll `/status` every 2 seconds
   - Update progress steps based on status changes
   - Handle timeout (stop polling after 120 seconds, show error)

2. **Error Recovery**:
   - All errors should be user-friendly, not technical
   - Provide "Try Again" button that resets step 4
   - Offer "Skip" option if non-critical

3. **Responsive Design**:
   - Stack vertically on mobile
   - Reduce font sizes on small screens
   - Keep wizard width reasonable (max 600px)

4. **Accessibility**:
   - Keyboard navigation works
   - Screen reader friendly labels
   - Focus management between steps
   - ARIA labels on progress indicators

5. **Animation**:
   - Smooth transitions between steps (slide or fade)
   - Progress bar animation during creation
   - Success checkmark animation
</implementation>

<output>
Create these new files:

1. `./src/components/ClaraCore/ClaraCoreSetupWizard.tsx`
   - Main wizard component
   - Step orchestration
   - State management
   - API integration

2. `./src/components/ClaraCore/steps/WelcomeStep.tsx`
3. `./src/components/ClaraCore/steps/ArchitectureSelectionStep.tsx`
4. `./src/components/ClaraCore/steps/ConfigurationStep.tsx`
5. `./src/components/ClaraCore/steps/CreationStep.tsx`
6. `./src/components/ClaraCore/steps/SuccessStep.tsx`

7. `./src/components/ClaraCore/types.ts`
   - Shared TypeScript interfaces
   - Type guards
   - Constants (architectures list, etc.)

8. `./src/components/ClaraCore/index.ts`
   - Export wizard and types

Also create:
9. `./src/hooks/useClaraCoreSetup.ts`
   - Custom hook for API calls
   - Status polling logic
   - Error handling
   - Reusable across components
</output>

<styling>
Use Tailwind CSS classes matching ClaraVerse's design:
- Colors: Match existing purple/pink gradient theme
- Cards: `bg-white/80 dark:bg-gray-800/80 backdrop-blur`
- Buttons: Existing button variants
- Shadows: `shadow-xl` for modal
- Transitions: `transition-all duration-300`
- Icons: lucide-react, size 20-24px

Reference existing components for consistency:
@src/components/FirstTimeSetupModal.tsx
@src/components/Settings/UnifiedServiceManager.tsx
</styling>

<verification>
Before completing, verify:

1. **All steps render correctly**:
   - Test each step in isolation
   - Check responsive behavior (resize browser)
   - Verify dark mode works

2. **API integration works**:
   - GPU detection displays correctly
   - Architecture selection triggers create API
   - Status polling updates UI
   - Logs appear if creation fails

3. **User flows complete**:
   - Can go Back to previous steps
   - Can't proceed without required selections
   - Cancel works at any step
   - Success step links work

4. **Error scenarios**:
   - Docker not running → clear error
   - Network error → retry option
   - Invalid selection → validation message

5. **Accessibility**:
   - Tab navigation works
   - Screen reader announces status changes
   - Focus management between steps
</verification>

<success_criteria>
- Wizard renders as modal overlay
- All 5 steps implemented and functional
- GPU detection displays correctly with icons
- Architecture selection allows override with dropdown
- Shows "Detected: CUDA" prominently but dropdown is editable
- Container creation triggers and shows progress
- Success confirmation with next steps
- Error handling is user-friendly
- Responsive design works on mobile
- Ready to integrate into UnifiedServiceManager (prompt 012)
</success_criteria>
