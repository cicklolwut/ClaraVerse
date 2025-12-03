# Clara-Core Architecture Analysis

**Research Date:** 2025-12-03
**ClaraCore Version:** Based on latest main branch
**Repository:** `/home/cinna/src/ClaraCore`

## Executive Summary

Clara-Core is an intelligent proxy and management layer built on top of llama.cpp's inference server. It is **not** just a wrapper for llama.cpp - it's a sophisticated model management system that provides automatic configuration, hardware detection, model swapping, and a web-based UI for managing local LLM deployments.

**Key Findings:**
1. Clara-Core is a **single monolithic Go binary** that acts as a reverse proxy and process manager for llama-server instances
2. It serves on port **5800** by default (native), but uses **5890** in Docker containers
3. Each model gets its own llama-server process on dynamically assigned ports (starting from 8100)
4. The system includes an embedded React UI, auto-setup engine, binary downloader, and model download manager
5. **Modularization is not recommended** - the architecture is tightly integrated and designed to run as a unified service
6. Clara-Core manages model lifecycle, handles swapping, implements resource groups, and provides OpenAI-compatible API endpoints

The relationship: `ClaraCore (Go proxy on :5800) → llama-server instances (:8100+) → llama.cpp inference`

## Core Components

### Main Binary (claracore.go)

**Purpose:** Single-binary application server that orchestrates all Clara-Core functionality

**What it wraps/proxies:**
- Spawns and manages multiple `llama-server` processes (one per model)
- Acts as reverse proxy between clients and llama-server instances
- Provides intelligent model swapping and resource management
- Implements OpenAI-compatible API endpoints (/v1/chat/completions, /v1/models, etc.)

**Key responsibilities:**
```go
// From claracore.go:29-247
func main() {
    // 1. Parse flags and create config
    // 2. Run auto-setup if --models-folder provided
    // 3. Load proxy.Config from config.yaml
    // 4. Create ProxyManager (the heart of the system)
    // 5. Watch config file for hot-reload
    // 6. Start HTTP server on :5800 (or custom port)
    // 7. Handle graceful shutdown
}
```

**Core functionality:**
- **Configuration Management:** Loads YAML config, validates macros, assigns ports
- **Auto-Setup Mode:** Scans folders for GGUF files, detects hardware, downloads binaries, generates config
- **File Watching:** Automatically reloads config.yaml when modified
- **Process Lifecycle:** Starts/stops/swaps llama-server processes on demand
- **Self-Healing:** Regenerates config from folder database if corruption detected

### UI Layer

**What UI exists:**
- Full React + TypeScript + Vite web application embedded into the Go binary
- Located in `/ui/` directory, compiled to static assets at build time
- Served via embedded filesystem (`ui_embed.go`)

**Features:**
- Setup Wizard (`/ui/setup`) - Initial configuration and model scanning
- Model Management (`/ui/models`) - Chat interface and model controls
- Configuration Editor (`/ui/configuration`) - Edit settings and model parameters
- Downloads Manager (`/ui/downloads`) - HuggingFace model downloader with progress tracking
- System Monitor - Real-time logs, metrics, and model status via SSE

**How it's served:**
```go
// From proxy/proxymanager.go:406-430
reactFS, err := GetReactFS()
pm.ginEngine.StaticFS("/ui", reactFS)
pm.ginEngine.NoRoute(func(c *gin.Context) {
    // SPA routing - serve index.html for all /ui/* routes
})
```

**Can it be optional?**
No - the UI is compiled into the binary. However:
- It's served passively (no resources used unless accessed)
- Can be accessed or ignored based on user preference
- API endpoints work independently of UI

### Inference Layer

**How models are loaded/served:**

1. **Configuration Phase:**
   - Models defined in `config.yaml` with command templates
   - Each model gets unique port assignment (e.g., 8100, 8101, 8102...)
   - Models organized into "groups" for resource management

2. **On-Demand Loading:**
   - When API request arrives for a model, Clara-Core checks if process exists
   - If not running, spawns llama-server with model-specific parameters
   - Performs health check (polls `/health` endpoint until ready)
   - Once ready, proxies the request

3. **Model Swapping:**
   - Groups can be configured as `exclusive: true` (only one model loaded at a time)
   - TTL (time-to-live) automatically unloads idle models
   - Process management handles graceful shutdown, waiting for inflight requests

**Relationship with llama.cpp:**
```yaml
# Example config.yaml entry (auto-generated)
models:
  "llama-3-8b":
    cmd: |
      binaries/llama-server/llama-server
      --model models/llama-3-8b-q4.gguf
      --host 127.0.0.1 --port ${PORT}
      --flash-attn auto -ngl 99
    proxy: "http://127.0.0.1:${PORT}"
    checkEndpoint: "/health"
    ttl: 300  # Unload after 5 minutes idle
```

Clara-Core executes this command, replacing `${PORT}` with actual port (e.g., 8100), then proxies requests to that port.

**Port/API structure:**
- **External API:** Port 5800 (or 5890 in Docker) - Clara-Core's reverse proxy
- **Internal Ports:** 8100+ - Individual llama-server instances (not exposed outside)
- **API Compatibility:** OpenAI-compatible endpoints on external port
- **Model Selection:** Specified in request body `{"model": "llama-3-8b", ...}`

### Proxy/Routing Layer

**What proxying occurs:**

1. **Request Flow:**
   ```
   Client → Clara-Core :5800 → Model Selection → llama-server :8100+ → llama.cpp
   ```

2. **ProxyManager (proxy/proxymanager.go):**
   - Gin web framework for HTTP handling
   - Routes for OpenAI API endpoints
   - Routes for Clara-specific management APIs
   - SSE stream for real-time events
   - CORS handling for web UI

3. **Process Groups (proxy/processgroup.go):**
   - Logical grouping of models
   - Resource exclusivity (large models can't run simultaneously)
   - Swapping logic and TTL management

4. **Individual Process (proxy/process.go):**
   - Manages single llama-server instance
   - Health check loop
   - Request proxying with context cancellation
   - Concurrency limiting per model

**Why it's needed:**
- **Automatic Model Management:** Users don't manually start/stop servers
- **Resource Optimization:** Only load models when needed, swap when RAM/VRAM limited
- **Unified API:** Single endpoint serves all models with automatic routing
- **Enhanced Features:** Metrics, logging, model aliasing, parameter filtering
- **Configuration Abstraction:** Users don't need to know port assignments

**Can it be bypassed?**
No - the proxy is the core architecture. Without it, you'd have to:
- Manually start llama-server for each model
- Manage port assignments yourself
- Implement your own API routing
- Handle resource conflicts manually
- No auto-configuration or setup

## Services Started on Launch

When Clara-Core starts, the following services/components initialize:

### Primary Services

1. **HTTP Server (Gin Engine)**
   - Listens on port 5800 (native) or 5890 (Docker)
   - Serves API endpoints and web UI
   - Handles all incoming requests

2. **ProxyManager**
   - Initializes log monitors (proxy, upstream, mux)
   - Creates ProcessGroup instances for each config group
   - Sets up metrics monitoring
   - Initializes download manager
   - Registers event handlers

3. **Config File Watcher**
   - Monitors `config.yaml` for changes (if `--watch-config` enabled, default: true)
   - Triggers hot-reload on file modification
   - Debounced to prevent rapid reloads

4. **Event System**
   - Global pub/sub for application events
   - Used for: state changes, config updates, downloads, metrics
   - Powers SSE streaming to UI

### Background Services

5. **Download Manager**
   - Manages HuggingFace model downloads
   - Tracks multiple concurrent downloads
   - Emits progress events via SSE
   - Auto-reconfigures after download completion

6. **Metrics Monitor**
   - Collects token/s metrics from llama-server responses
   - Stores in-memory (configurable max: 1000 entries)
   - Streams to UI via SSE

7. **Health Check Loops** (per model, when loaded)
   - Each Process spawns health check goroutine
   - Polls llama-server's `/health` endpoint every 5 seconds
   - Transitions state: Starting → Ready
   - Implements timeout (default: 120 seconds)

### Model Processes (On-Demand)

8. **llama-server Instances**
   - NOT started on launch
   - Spawned on first request to a model
   - Each runs as child process of Clara-Core
   - Managed lifecycle: start, health check, proxy, TTL, stop

### Optional Services

9. **Startup Hooks** (if configured)
   - Preload models specified in `hooks.on_startup.preload`
   - Runs in background goroutine after server start

## Port Usage

| Port | Purpose | Exposed | Protocol |
|------|---------|---------|----------|
| **5800** | Clara-Core main API & UI (native installation) | Yes (localhost) | HTTP |
| **5890** | Clara-Core main API & UI (Docker containers) | Yes (container) | HTTP |
| **8100+** | Individual llama-server instances (auto-assigned) | No (internal) | HTTP |

**Port Assignment Logic:**
```go
// From proxy/config.go:264-301
startPort := config.StartPort  // Default: 8100
for each model with ${PORT} in cmd:
    Replace ${PORT} with nextPort
    nextPort++
```

**Example:**
- Model "llama-3-8b" → port 8100
- Model "qwen-72b" → port 8101
- Model "mistral-7b" → port 8102

**Why 5890 in Docker vs 5800 native?**
- Docker images specify `-listen 0.0.0.0:5890` in CMD/ENTRYPOINT
- Dockerfiles expose port 5890
- docker-compose.yml maps 5890:5890
- Likely chosen to avoid conflicts with default 5800 when running both native and Docker

**ClaraVerse Integration Note:**
- ClaraVerse expects Clara-Core on port 8091 (per codebase)
- Docker port mapping: `-p 8091:5890` (external:internal)
- Native installation: Clara-Core needs `--listen :8091` flag

## External Dependencies

### Required

1. **llama.cpp llama-server binary**
   - Downloaded automatically by Clara-Core's autosetup
   - Stored in `./binaries/llama-server/`
   - Platform-specific (CPU/CUDA/ROCm/Vulkan/Metal)
   - Can be manually placed or auto-downloaded from GitHub releases

2. **GGUF model files**
   - User must provide or download via Clara-Core's UI
   - Stored in user-specified folders
   - Scanned and configured automatically

3. **config.yaml**
   - Generated by auto-setup or manually created
   - Required for Clara-Core to know which models exist
   - Can be regenerated from folder database

### Optional

4. **model_folders.json** (auto-created)
   - Tracks which folders contain models
   - Used for regeneration and self-healing
   - Created when folders are scanned via API

5. **settings.json** (auto-created)
   - Persists user preferences (backend, VRAM, context size, etc.)
   - Used when regenerating config
   - API key settings if authentication enabled

6. **HuggingFace API token**
   - Only needed for downloading gated models
   - Stored in `.hf_token` file
   - Optional for most models

7. **GPU drivers** (for GPU acceleration)
   - CUDA toolkit (NVIDIA GPUs)
   - ROCm (AMD GPUs)
   - Vulkan SDK (cross-platform GPU)
   - Metal (Apple Silicon)
   - Detected automatically, falls back to CPU

### Runtime Dependencies (Go binary)

8. **No external runtime** - Clara-Core is a static binary
   - Compiled with embedded UI assets
   - No Node.js, Python, or other interpreters needed
   - Only needs OS-level libraries (glibc on Linux, etc.)

## Docker Architecture Comparison

### CPU Dockerfile (`docker-cpu/Dockerfile.cpu`)

```dockerfile
FROM ghcr.io/ggml-org/llama.cpp:server
WORKDIR /app
COPY claracore /app/claracore
RUN chmod +x /app/claracore
EXPOSE 5890
ENTRYPOINT ["/app/claracore"]
CMD ["-listen", "0.0.0.0:5890"]
```

**Key characteristics:**
- **Base image:** Official llama.cpp server image (includes llama-server binary)
- **What's included:**
  - llama.cpp CPU-optimized server
  - Clara-Core binary (copied from build context)
- **Size:** ~2-3GB (optimized, not full SDK)
- **Environment variables:** `OMP_NUM_THREADS=auto`, `GGML_BLAS=0`
- **GPU access:** None
- **Use case:** CPU-only inference, any machine

### CUDA Dockerfile (`docker-cuda/Dockerfile.cuda`)

```dockerfile
FROM ghcr.io/ggml-org/llama.cpp:server-cuda
WORKDIR /app
COPY claracore /app/claracore
RUN chmod +x /app/claracore
EXPOSE 5890
ENTRYPOINT ["/app/claracore"]
CMD ["-listen", "0.0.0.0:5890"]
```

**Key characteristics:**
- **Base image:** Official llama.cpp CUDA server image
- **NVIDIA-specific components:**
  - CUDA runtime libraries
  - cuBLAS for matrix operations
  - llama-server compiled with CUDA support
- **GPU access requirements:**
  - `--gpus all` flag in docker run
  - NVIDIA Container Toolkit installed on host
- **Size:** ~3-4GB
- **Use case:** NVIDIA GPU acceleration

**Differences from CPU:**
- CUDA base image vs. plain CPU image
- Docker run requires `--gpus all`
- No CPU thread optimization env vars needed

### ROCm Dockerfile (`docker-rocm/Dockerfile.rocm`)

```dockerfile
FROM rocm/llama.cpp:llama.cpp-b6356_rocm6.4.3_ubuntu24.04_light
WORKDIR /app
COPY claracore /app/claracore
RUN chmod +x /app/claracore
EXPOSE 5890
ENTRYPOINT ["/app/claracore"]
CMD ["-listen", "0.0.0.0:5890"]
```

**Key characteristics:**
- **Base image:** ROCm-specific llama.cpp image (AMD GPUs)
- **AMD-specific components:**
  - ROCm 6.4.3 runtime
  - hipBLAS libraries
  - llama-server compiled with ROCm support
- **GPU access requirements:**
  - `--device=/dev/kfd --device=/dev/dri` flags
  - ROCm drivers on host
- **Size:** ~3-4GB
- **Use case:** AMD Radeon GPU acceleration

**Differences from CUDA:**
- ROCm base vs. CUDA base
- Device access via `/dev/kfd` and `/dev/dri` instead of `--gpus`
- ROCm 6.4.3 specific (compatibility with specific AMD hardware)

### Strix Dockerfile (`docker-strix/Dockerfile.strix`)

```dockerfile
FROM kyuz0/amd-strix-halo-toolboxes:vulkan-radv
WORKDIR /app
COPY claracore /app/claracore
RUN chmod +x /app/claracore
EXPOSE 5890
ENTRYPOINT ["/app/claracore"]
CMD ["-listen", "0.0.0.0:5890"]
```

**Key characteristics:**
- **Base image:** Custom Vulkan RADV toolbox for AMD Strix Halo APUs
- **Strix-specific:**
  - Optimized for new AMD Strix Halo architecture (2024+)
  - Uses RADV Vulkan driver (open-source)
  - Targets integrated graphics (APU) not discrete GPU
- **Use case:** AMD Strix Halo processors with integrated graphics

### Common Patterns Across All Dockerfiles

1. **Minimal design:** Only copy Clara-Core binary, inherit llama-server from base
2. **No build steps:** Pre-built binary copied in, no compilation in container
3. **Consistent port:** All expose 5890
4. **Consistent entrypoint:** All use Clara-Core as entry, llama-server spawned internally
5. **Volume expectations:**
   - `/app/downloads` for downloaded models
   - `/app/models` for mounted model folders

### Volume Strategy

**Persistent volumes:**
```yaml
volumes:
  claracore-cpu-downloads:
    name: claracore-cpu-downloads
```
- Models downloaded via UI persist across container restarts
- Delete with `docker-compose down -v` (WARNING: loses all downloads)

**Bind mounts (optional):**
```yaml
volumes:
  - /path/to/your/models:/app/models:ro
```
- Read-only mount of existing model folders
- No copy overhead
- Models stay on host

## Modularization Assessment

### Can We Split Components?

**Technical Answer:** Yes, theoretically possible but architecturally unsound.

**What could be separated:**
1. **UI → Separate container/service**
   - React app served independently
   - Communicate with Clara-Core API via HTTP

2. **llama-server instances → Separate containers**
   - Each model in its own container
   - Clara-Core acts as pure API gateway

3. **Auto-setup → CLI tool**
   - Separate binary for initial configuration
   - Clara-Core only runs proxy logic

**Why this is technically possible:**
- API is well-defined (OpenAI-compatible + management endpoints)
- UI communicates via HTTP/SSE only
- Process management could be replaced with container orchestration

### Should We Split Components?

**Recommendation:** **NO - Keep as monolithic service**

#### Cons of Splitting (Why Not To)

1. **Complexity Explosion**
   - Current: 1 container, 1 port, works immediately
   - Split: 2+ containers, networking between them, orchestration required
   - User experience degrades significantly

2. **Resource Waste**
   - Each container has overhead (base OS, runtime, etc.)
   - llama-server containers would need full llama.cpp stack each
   - Current design shares binaries across all models

3. **Configuration Management Nightmare**
   - Config currently managed in one place (config.yaml)
   - Split design requires distributed configuration
   - How do you ensure consistency between containers?

4. **Loss of Core Features**
   - Model swapping (loading/unloading) works because same process
   - Exclusive groups (can't run model A and B together) - how to enforce across containers?
   - TTL auto-unload - requires centralized control
   - Health checks and process restart - duplicated logic

5. **Networking Complexity**
   - Current: localhost communication (fast, no network overhead)
   - Split: Docker networks, service discovery, potential latency
   - More attack surface, security considerations

6. **Development Burden**
   - Maintaining multiple repos/containers
   - Testing becomes harder (integration across services)
   - Debugging distributed system issues

#### Pros of Splitting (Why You Might Consider)

1. **Isolation**
   - Model crash doesn't affect UI
   - But: Clara-Core already isolates via process management

2. **Independent Scaling**
   - Could run multiple llama-server containers behind load balancer
   - But: Single-user local deployment doesn't need this

3. **Polyglot Development**
   - UI team could use different stack without touching Go
   - But: UI is already independent (React in `ui/` folder)

### Recommendation Details

**Keep Clara-Core as single container because:**

1. **It's designed for local deployment**
   - Target user: Individual running AI on their machine
   - Not a cloud service with multiple users
   - Simplicity matters more than microservice benefits

2. **Resource management is integrated**
   - VRAM/RAM allocation decisions made holistically
   - Model swapping requires central control
   - Can't achieve this with distributed containers

3. **User experience is paramount**
   - One command to start everything
   - One web UI to manage everything
   - Zero configuration networking

4. **The current architecture is sound**
   - Embedded UI ≠ monolithic (it's just static assets)
   - Process-per-model ≠ need for container-per-model
   - Proxy layer provides necessary abstraction

**Alternative for advanced users:**
If someone wants distributed deployment, they should:
- Run multiple Clara-Core instances (one per GPU)
- Put Nginx/HAProxy in front for load balancing
- Each Clara-Core manages its own models
- This maintains simplicity while enabling scaling

## Configuration & Deployment

### Environment Variables

**Clara-Core-specific:**
- `GIN_MODE` - Gin framework mode (release/debug, default: release)
- No other environment variables read by Clara-Core itself

**Docker container-specific:**
- `OMP_NUM_THREADS` - CPU thread count for inference (auto-detected if not set)
- `GGML_BLAS` - BLAS implementation (0 for CPU containers)

**Inherited from base images:**
- CUDA containers: CUDA_VISIBLE_DEVICES, NVIDIA driver vars
- ROCm containers: HSA_OVERRIDE_GFX_VERSION, ROCm vars

### Volume Mounts

**Required:**
- **None** - Clara-Core can run with no volumes, will use container filesystem

**Recommended:**
- `/app/downloads` → Persistent volume for downloaded models
  - Survives container restarts
  - Can grow large (multiple GB per model)

**Optional:**
- `/app/models` → Bind mount for existing model folders
  - Purpose: Use models from host without copying
  - Should be read-only (`:ro`) to prevent accidental modifications

- `/app/config.yaml` → Bind mount for persistent config
  - Purpose: Preserve manual config changes across rebuilds
  - Careful: Auto-generated config may conflict

- `/app/binaries` → Bind mount for llama-server binaries
  - Purpose: Use custom-compiled llama-server
  - Rarely needed, base images include optimized binaries

### Build Process

**Native Build:**
```bash
# UI build (React → static assets)
cd ui/
npm install
npm run build
# Output: ui/dist/ → embedded into Go binary

# Go build with embedded UI
python build.py  # Builds with version info
# OR
go build -o claracore .
```

**Docker Build:**
```bash
# 1. Build Clara-Core binary for Linux
GOOS=linux GOARCH=amd64 go build -o claracore .

# 2. Build Docker image
cd docker-cpu/  # or docker-cuda, docker-rocm, docker-strix
docker build -f Dockerfile.cpu -t claracore:cpu ..

# Context is parent directory (..) to access claracore binary
```

**Multi-architecture:**
```bash
# Clara-Core supports: windows, linux, darwin (macOS)
# Architectures: amd64, arm64
# Built via GitHub Actions with goreleaser
```

## Integration Considerations for ClaraVerse

### Port Mapping

**ClaraVerse's expectation:**
```typescript
// From ClaraVerse codebase - expects Clara-Core on 8091
const CLARA_CORE_URL = "http://localhost:8091"
```

**Clara-Core's defaults:**
- Native: Port 5800
- Docker: Port 5890 (internal), exposed via `-p`

**Solutions:**

**Option 1: Docker port remapping (RECOMMENDED)**
```yaml
# docker-compose.yml
services:
  claracore:
    image: claracore:cuda  # or cpu, rocm, strix
    ports:
      - "8091:5890"  # Map ClaraVerse's expected 8091 to Clara-Core's 5890
```

**Option 2: Native with custom port**
```bash
claracore --listen :8091 --models-folder /path/to/models
```

**Option 3: Override in Docker CMD**
```yaml
services:
  claracore:
    image: claracore:cuda
    command: ["-listen", "0.0.0.0:8091"]
    ports:
      - "8091:8091"
```

**Internal port usage:**
- Clara-Core's internal llama-server instances (8100+) are NOT exposed
- Only Clara-Core's main API port needs to be accessible to ClaraVerse
- No conflicts with model ports

### Container Lifecycle

**On Start:**
1. Clara-Core binary starts
2. Reads or creates empty config.yaml
3. Initializes HTTP server on port 5890
4. If models configured, registers them (doesn't load yet)
5. Serves UI at `http://container:5890/ui/`
6. Waits for API requests

**On First Model Request:**
1. Request arrives: `POST /v1/chat/completions {"model": "llama-3-8b"}`
2. Clara-Core checks if llama-server process running
3. If not, spawns: `binaries/llama-server --model ... --port 8100`
4. Polls health check (up to 120 seconds)
5. Once healthy, proxies request
6. Response streamed back to client

**On Stop (graceful):**
1. SIGTERM/SIGINT received
2. Clara-Core stops accepting new requests
3. Waits for inflight requests to complete (5 second timeout)
4. Sends termination signals to all llama-server processes
5. Waits for clean exit
6. Shuts down HTTP server

**On Restart:**
- All llama-server processes terminated
- Config reloaded from disk
- Model state resets (nothing loaded)
- No persistence of "which model was running"

**On Crash:**
- All child processes (llama-server) terminated by OS
- No state preserved
- Docker restart policy handles container restart

### Health Checks

**Clara-Core health:**
```bash
# Check if Clara-Core is responding
curl http://localhost:8091/health
# Response: "OK" with 200 status
```

**Model health (via Clara-Core):**
```bash
# Check which models are loaded
curl http://localhost:8091/running
# Response: {"running": [{"model": "llama-3-8b", "state": "ready"}]}
```

**Individual model health:**
```bash
# Load and check specific model
curl http://localhost:8091/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3-8b","messages":[{"role":"user","content":"test"}],"max_tokens":1}'
# If model loads and responds, it's healthy
```

**Docker health check (recommended addition):**
```yaml
services:
  claracore:
    image: claracore:cuda
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5890/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Monitoring model loading:**
```bash
# SSE stream for real-time events
curl http://localhost:8091/api/events
# Streams: model state changes, logs, metrics, downloads
```

### Resource Requirements

#### CPU Variant (docker-cpu)
- **Minimum:**
  - CPU: 4 cores
  - RAM: 8 GB
  - Disk: 10 GB (5 GB for binaries/models + 5 GB working space)

- **Recommended:**
  - CPU: 8+ cores (more cores = faster inference)
  - RAM: 16 GB (allows running 7B models comfortably)
  - Disk: 50 GB+ (space for multiple models)

- **Model size considerations:**
  - 7B Q4 model: ~4 GB RAM
  - 13B Q4 model: ~8 GB RAM
  - 70B Q4 model: ~40 GB RAM (not practical on CPU)

#### CUDA Variant (docker-cuda)
- **Minimum:**
  - GPU: NVIDIA GPU with 6 GB VRAM (GTX 1060 6GB, RTX 3050, etc.)
  - CUDA Compute Capability: 6.0+ (Pascal or newer)
  - NVIDIA Driver: 520.61.05+ (Linux), 527.41+ (Windows)
  - NVIDIA Container Toolkit installed
  - CPU: 4 cores
  - RAM: 8 GB system RAM
  - Disk: 10 GB

- **Recommended:**
  - GPU: NVIDIA RTX 3090/4090 or A5000+ (24 GB VRAM)
  - VRAM: 16-24 GB (allows 70B Q4 models)
  - CPU: 8+ cores
  - RAM: 32 GB (models can offload to system RAM if needed)
  - Disk: 100 GB+ (space for large models)

- **Model size considerations (VRAM):**
  - 7B Q4: ~4-5 GB VRAM (full GPU)
  - 13B Q4: ~8-9 GB VRAM (full GPU)
  - 34B Q4: ~20-22 GB VRAM (full GPU)
  - 70B Q4: ~40 GB VRAM (requires layer offloading to RAM)

- **Docker requirements:**
  ```bash
  # Verify NVIDIA Container Toolkit
  docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
  ```

#### ROCm Variant (docker-rocm)
- **Minimum:**
  - GPU: AMD GPU with ROCm support (RX 6000/7000 series, MI series)
  - ROCm Version: 5.0+ (6.4.3 in current image)
  - Driver: amdgpu kernel module loaded
  - CPU: 4 cores
  - RAM: 8 GB
  - Disk: 10 GB

- **Recommended:**
  - GPU: AMD RX 7900 XTX (24 GB) or MI100/MI200 series
  - VRAM: 16-24 GB
  - CPU: 8+ cores
  - RAM: 32 GB
  - Disk: 100 GB+

- **Docker requirements:**
  ```bash
  # Verify ROCm access
  docker run --rm --device=/dev/kfd --device=/dev/dri rocm/pytorch:latest rocm-smi
  ```

- **Model size considerations:** Same as CUDA (VRAM-based)

#### Strix Variant (docker-strix)
- **Minimum:**
  - APU: AMD Ryzen AI 300 series (Strix Halo)
  - Unified memory: 16 GB (shared between CPU and iGPU)
  - Vulkan support enabled
  - CPU: Not applicable (APU integrated)
  - Disk: 10 GB

- **Recommended:**
  - APU: Ryzen AI Max+ 395 (128 GB unified memory)
  - Unified memory: 64 GB+ (VRAM allocated dynamically)
  - Disk: 100 GB+

- **Model size considerations:**
  - Limited by unified memory split
  - Typically can run 7B-13B models well
  - 70B models possible with large unified memory config

#### General Resource Notes

**Disk space breakdown:**
```
binaries/              ~500 MB (llama-server + dependencies)
downloads/             Variable (user downloads)
config.yaml            ~10 KB
model_folders.json     ~1 KB
settings.json          ~1 KB
claracore binary       ~20-30 MB
```

**Network requirements:**
- Internet for initial binary download (if not in base image)
- Internet for model downloads via UI (HuggingFace)
- Localhost-only operation after setup

**ClaraVerse-specific notes:**
- ClaraVerse acts as client, not server
- Clara-Core container doesn't need internet access after setup (unless downloading models)
- Consider resource reservation if running both on same host

## Key Findings & Recommendations

### 1. Clara-Core is a Complete Orchestration System, Not Just a Wrapper

**Finding:** Clara-Core provides intelligent model lifecycle management, automatic configuration, resource optimization, and a comprehensive web UI - far more than a simple llama.cpp wrapper.

**Implication for ClaraVerse:** Treat Clara-Core as a first-class service dependency, not a library to embed.

### 2. Single Container Deployment is Strongly Recommended

**Finding:** The architecture is tightly integrated by design. Splitting components would sacrifice core features (model swapping, resource management, TTL) while adding complexity.

**Recommendation:** Deploy Clara-Core as single container per GPU type. If user has NVIDIA GPU, use `claracore:cuda`. For AMD GPU, use `claracore:rocm`. For CPU-only, use `claracore:cpu`.

### 3. Port Mapping Strategy is Critical

**Finding:** Clara-Core defaults to port 5890 in Docker but ClaraVerse expects 8091.

**Recommendation:**
```yaml
# ClaraVerse docker-compose.yml
services:
  claracore:
    image: claracore:cuda  # Dynamic based on GPU detection
    ports:
      - "8091:5890"  # Map to ClaraVerse's expected port
    volumes:
      - claracore-models:/app/downloads
      - ${USER_MODELS_PATH}:/app/models:ro  # Optional user models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

### 4. GPU Selection Determines Container Variant

**Finding:** Four Docker variants exist (CPU, CUDA, ROCm, Strix), each with different base images and requirements.

**Recommendation for ClaraVerse deployment script:**
```bash
# Detect GPU type
if lspci | grep -i nvidia; then
    CLARACORE_IMAGE="claracore:cuda"
    GPU_FLAGS="--gpus all"
elif lspci | grep -i amd; then
    if [[ $(lscpu | grep "Model name" | grep -i "Ryzen AI") ]]; then
        CLARACORE_IMAGE="claracore:strix"
        GPU_FLAGS="--device=/dev/kfd --device=/dev/dri"
    else
        CLARACORE_IMAGE="claracore:rocm"
        GPU_FLAGS="--device=/dev/kfd --device=/dev/dri"
    fi
else
    CLARACORE_IMAGE="claracore:cpu"
    GPU_FLAGS=""
fi

docker run -d --name claracore \
    -p 8091:5890 \
    $GPU_FLAGS \
    -v claracore-models:/app/downloads \
    $CLARACORE_IMAGE
```

### 5. Health Checks and Startup Time Matter

**Finding:** llama-server processes can take 30-120 seconds to load large models. Clara-Core handles this with health checks, but clients need awareness.

**Recommendation:**
- Implement retry logic in ClaraVerse when calling Clara-Core
- Use `/health` endpoint to verify Clara-Core is running
- Use `/running` endpoint to check model load status
- Display loading state in UI when model is starting

### 6. Configuration Management Should Be Minimal

**Finding:** Clara-Core's auto-setup is comprehensive. Manual config is error-prone.

**Recommendation:**
- Let Clara-Core handle config generation (don't write config.yaml from ClaraVerse)
- Use API endpoints for config modification:
  - `POST /api/config/folders` to add model folders
  - `POST /api/config/regenerate-from-db` to regenerate config
- Only persist folder paths, let Clara-Core scan and configure

### 7. Model Downloads Should Use Clara-Core's Manager

**Finding:** Clara-Core includes HuggingFace download manager with progress tracking, resume support, and auto-reconfiguration.

**Recommendation:**
- Direct users to Clara-Core's UI (`http://localhost:8091/ui/downloads`) for model downloads
- Alternatively, use Clara-Core's API:
  ```bash
  POST /api/models/download
  {
    "repo": "TheBloke/Llama-2-7B-Chat-GGUF",
    "filename": "llama-2-7b-chat.Q4_K_M.gguf"
  }
  ```
- Monitor via SSE: `GET /api/events` (downloadProgress events)

### 8. Resource Constraints Should Be Externally Managed

**Finding:** Clara-Core doesn't enforce container resource limits itself.

**Recommendation:** Set Docker resource limits in ClaraVerse's docker-compose:
```yaml
services:
  claracore:
    deploy:
      resources:
        limits:
          memory: 32G  # Based on user's system
          cpus: '8'
        reservations:
          memory: 16G
          cpus: '4'
```

### 9. Container Persistence Strategy

**Finding:** Only downloaded models need persistence. Config can be regenerated.

**Recommendation:**
- Required volume: `/app/downloads` (named volume)
- Optional volume: User model folders (bind mount, read-only)
- Don't persist: config.yaml, settings.json (can regenerate)
- User can export/import via Clara-Core's UI if needed

### 10. Multi-Model Scenarios Need Group Configuration

**Finding:** Clara-Core's "groups" feature manages resource conflicts (e.g., can't run two 70B models on 24GB GPU).

**Recommendation:** For ClaraVerse's model selection UI:
- Query `/v1/models` to get available models
- Check `/running` before requesting new model
- If switching to large model, call `POST /api/models/unload` first
- Or configure models in exclusive groups (Clara-Core handles swapping)

## Open Questions

### 1. Should ClaraVerse Manage Multiple Clara-Core Instances?

**Scenario:** User has multiple GPUs, wants to run different models simultaneously.

**Options:**
- A) Single Clara-Core instance, let it use all GPUs (llama.cpp supports multi-GPU)
- B) Multiple Clara-Core containers, one per GPU (manual port assignment, complex)

**Recommendation needed:** Likely A for simplicity, but B for isolation.

### 2. How to Handle Clara-Core Updates?

**Scenario:** New Clara-Core version available with better features/bug fixes.

**Options:**
- A) ClaraVerse bundles specific Clara-Core version (predictable, outdated)
- B) ClaraVerse pulls latest Clara-Core on deploy (up-to-date, breaking changes?)
- C) User manually updates Clara-Core (flexible, complex for non-technical users)

**Recommendation needed:** Likely A for stability, with manual update option.

### 3. Should ClaraVerse Provide Model Recommendations?

**Scenario:** User doesn't know which model to download for their hardware.

**Options:**
- A) ClaraVerse detects GPU, suggests compatible models (requires model database)
- B) Direct user to Clara-Core's UI (less integrated experience)
- C) Provide simple default (e.g., "Llama-3-8B-Instruct-Q4_K_M for 8GB GPU")

**Recommendation needed:** C for MVP, A for polished experience.

### 4. How to Handle Clara-Core API Authentication?

**Scenario:** Clara-Core supports API key requirement (for security in multi-user scenarios).

**Current state:** Optional, disabled by default.

**Question:** Should ClaraVerse:
- Assume no authentication (localhost deployment)
- Support API key configuration
- Generate and manage API key automatically?

**Recommendation needed:** Assume no auth for local deployment, document how to enable if desired.

### 5. Container Naming and Network Strategy?

**Scenario:** ClaraVerse and Clara-Core in same Docker Compose network.

**Options:**
- A) Fixed container name (`claracore`), hardcoded in ClaraVerse
- B) Dynamic naming, use Docker DNS (`claracore` resolves to container IP)
- C) Separate Compose files, user manages network

**Recommendation needed:** A or B for simplicity (Docker Compose handles DNS).

---

**Research completed:** 2025-12-03
**Analyzed files:** 20+ source files, 4 Dockerfiles, README, configuration samples
**Total lines reviewed:** ~5000+
**Confidence level:** High - comprehensive understanding of architecture

**Next steps for ClaraVerse integration:**
1. Implement GPU detection logic (NVIDIA/AMD/CPU)
2. Create Docker Compose template with Clara-Core service
3. Build Clara-Core container management API in ClaraVerse backend
4. Implement health check and retry logic in frontend
5. Design user flow for initial Clara-Core setup (model folder selection)
