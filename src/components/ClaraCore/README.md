# Clara-Core Setup Wizard

A comprehensive, user-friendly setup wizard for configuring Clara-Core local LLM inference containers.

## Features

- **GPU Detection**: Automatically detects NVIDIA/AMD GPUs and recommends optimal architecture
- **Architecture Selection**: Choose between CPU, CUDA, ROCm, or Strix with dropdown override
- **Optional Configuration**: Set custom models path and auto-start preferences
- **Progress Tracking**: Real-time container creation with status polling and logs
- **Error Handling**: Graceful error recovery with retry options
- **Responsive Design**: Works on desktop and mobile with dark mode support

## Usage

### Basic Integration

```tsx
import { ClaraCoreSetupWizard } from '@/components/ClaraCore';

function MyComponent() {
  const [showWizard, setShowWizard] = useState(false);

  const handleComplete = (config) => {
    console.log('Clara-Core configured:', config);
    // { architecture: 'cuda', modelsPath: '/path/to/models', autoStart: true }
    setShowWizard(false);
  };

  const handleCancel = () => {
    setShowWizard(false);
  };

  return (
    <>
      <button onClick={() => setShowWizard(true)}>
        Setup Clara-Core
      </button>

      {showWizard && (
        <ClaraCoreSetupWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          onSkip={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
```

### Integration with UnifiedServiceManager

```tsx
import { ClaraCoreSetupWizard } from '@/components/ClaraCore';

function UnifiedServiceManager() {
  const [showClaraCoreWizard, setShowClaraCoreWizard] = useState(false);

  const handleSetupClaraCore = () => {
    setShowClaraCoreWizard(true);
  };

  const handleClaraCoreComplete = async (config) => {
    // Update service configuration
    await updateServiceConfig('clara-core', config);

    // Refresh service status
    await refreshServices();

    setShowClaraCoreWizard(false);
  };

  return (
    <div>
      {/* Service Manager UI */}
      <button onClick={handleSetupClaraCore}>
        Configure Clara-Core
      </button>

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
```

## Components

### Main Wizard
- `ClaraCoreSetupWizard`: Main orchestrator component

### Steps
1. `WelcomeStep`: Introduction and requirements
2. `ArchitectureSelectionStep`: GPU detection and architecture choice
3. `ConfigurationStep`: Optional settings (models path, auto-start)
4. `CreationStep`: Container creation with progress tracking
5. `SuccessStep`: Success confirmation and next steps

### Custom Hook
- `useClaraCoreSetup`: API integration hook for GPU detection, container creation, and status polling

## API Endpoints Required

The wizard expects the following server endpoints (from prompt 010):

- `GET /api/server/clara-core/detect-gpu` - GPU detection
- `POST /api/server/clara-core/create` - Container creation
- `GET /api/server/clara-core/status` - Status polling
- `GET /api/server/clara-core/logs` - Container logs

## Props

### ClaraCoreSetupWizardProps

```typescript
interface ClaraCoreSetupWizardProps {
  onComplete: (config: ClaraCoreConfig) => void;
  onCancel: () => void;
  onSkip?: () => void;
}

interface ClaraCoreConfig {
  architecture: 'cpu' | 'cuda' | 'rocm' | 'strix';
  modelsPath?: string;
  autoStart: boolean;
}
```

## Styling

The wizard uses Tailwind CSS classes matching ClaraVerse's design system:

- **Colors**: Purple/pink gradient theme
- **Cards**: Backdrop blur with transparency
- **Dark Mode**: Full dark mode support
- **Animations**: Smooth transitions and progress indicators
- **Icons**: lucide-react icons throughout

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Focus management between steps
- Clear error messages
- Status announcements

## Testing

### Manual Testing Checklist

1. **GPU Detection**
   - [ ] Detects NVIDIA GPU correctly
   - [ ] Detects AMD GPU correctly
   - [ ] Handles no GPU gracefully
   - [ ] Shows appropriate recommendations

2. **Architecture Selection**
   - [ ] Displays detected GPU info
   - [ ] Allows dropdown override
   - [ ] Shows warning for GPU arch without GPU
   - [ ] All architecture options selectable

3. **Configuration**
   - [ ] Models path input works
   - [ ] Auto-start toggle works
   - [ ] Skip button advances with defaults
   - [ ] Back button preserves state

4. **Creation**
   - [ ] Progress steps update correctly
   - [ ] Status polling works
   - [ ] Logs display when expanded
   - [ ] Retry works after error
   - [ ] Success advances to final step

5. **Success**
   - [ ] Summary displays correct info
   - [ ] Quick actions work
   - [ ] Done button closes wizard

6. **Responsive**
   - [ ] Works on mobile screens
   - [ ] Dark mode looks correct
   - [ ] All buttons accessible

## File Structure

```
src/components/ClaraCore/
├── ClaraCoreSetupWizard.tsx       # Main wizard component
├── index.ts                        # Public exports
├── types.ts                        # TypeScript definitions
├── steps/
│   ├── WelcomeStep.tsx
│   ├── ArchitectureSelectionStep.tsx
│   ├── ConfigurationStep.tsx
│   ├── CreationStep.tsx
│   └── SuccessStep.tsx
└── README.md                       # This file

src/hooks/
└── useClaraCoreSetup.ts           # API integration hook
```

## Future Enhancements

- [ ] Add advanced configuration options (port, environment variables)
- [ ] Support for multiple containers
- [ ] Model pre-download during setup
- [ ] Integration with model library
- [ ] One-click update/rebuild
- [ ] Health check dashboard

## License

Part of ClaraVerse project.
