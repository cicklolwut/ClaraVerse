<objective>
Implement server-side API endpoints for managing Clara-Core Docker containers using the dockerode library. This will enable ClaraVerse's frontend to dynamically create, start, stop, and monitor Clara-Core containers with appropriate GPU architecture selection.

**End goal**: Production-ready REST API endpoints that give ClaraVerse full control over Clara-Core container lifecycle, replacing manual docker-compose commands with programmatic management.

**Why this matters**: Users need a seamless setup experience where they can select their GPU type (CPU/CUDA/ROCm) and have the system automatically configure and start the appropriate Clara-Core container without touching the command line.
</objective>

<context>
ClaraVerse's Node.js backend server (`server/` directory) handles service coordination. We need to add Clara-Core container management capabilities that work in Docker deployment mode.

**Prerequisites**: Complete prompt 009 (Clara-Core architecture research) first to understand what's being containerized.

**Current state**:
- ClaraVerse runs in Docker with services: frontend, server, python-backend
- Clara-Core added to docker-compose.yml but requires manual `--profile claracore` flag
- Architecture selection via `CLARA_CORE_ARCH` environment variable
- Port mapping: 8091 (external) → 5890 (internal)

**Related files**:
@server/src/api/services.ts (existing service management)
@deployment/docker/docker-compose.yml (Clara-Core configuration)
@src/lib/environment.ts (environment detection)
</context>

<requirements>
**Functional Requirements**:

1. **Container Detection**
   - Check if Clara-Core container exists
   - Get container status (running, stopped, not created)
   - Detect current architecture (CPU, CUDA, ROCm, Strix)

2. **GPU Detection**
   - Detect NVIDIA GPUs (nvidia-smi or Docker device query)
   - Detect AMD GPUs (rocm-smi or similar)
   - Return recommended architecture based on hardware
   - Handle no-GPU scenario (recommend CPU)

3. **Container Lifecycle**
   - Create Clara-Core container with specified architecture
   - Start existing container
   - Stop running container
   - Restart container
   - Remove container (for architecture switches)

4. **Status & Monitoring**
   - Get container health status
   - Check port availability (8091)
   - Get container logs (last N lines)
   - Monitor startup progress

5. **Configuration Management**
   - Update docker-compose environment variables
   - Handle volume mounts for models directory
   - Apply architecture-specific settings (CUDA devices, ROCm devices)

**Technical Requirements**:
- Use `dockerode` library for Docker API access
- Implement proper error handling with descriptive messages
- Add request validation with TypeScript types
- Include health check endpoints
- Implement timeout handling for long operations
- Add proper logging for debugging
- Handle concurrent requests safely
</requirements>

<api_specification>
Implement these endpoints in the server API:

### Detection & Status

**GET** `/api/server/clara-core/detect-gpu`
- Detects available GPU hardware
- Returns: `{ gpuType: 'nvidia' | 'amd' | 'none', recommended: 'cuda' | 'rocm' | 'cpu', devices: string[] }`

**GET** `/api/server/clara-core/status`
- Gets container status and health
- Returns: `{ exists: boolean, running: boolean, architecture: string, healthy: boolean, port: number, uptime?: number }`

**GET** `/api/server/clara-core/logs?lines=100`
- Retrieves container logs
- Query param: `lines` (default: 100)
- Returns: `{ logs: string }`

### Lifecycle Management

**POST** `/api/server/clara-core/create`
- Creates Clara-Core container with specified architecture
- Body: `{ architecture: 'cpu' | 'cuda' | 'rocm' | 'strix', modelsPath?: string }`
- Returns: `{ success: boolean, containerId: string, message: string }`
- Should:
  - Generate docker-compose override with selected architecture
  - Create container using docker-compose or direct Docker API
  - Wait for container to be created
  - Return container ID and status

**POST** `/api/server/clara-core/start`
- Starts existing Clara-Core container
- Returns: `{ success: boolean, message: string }`
- Should wait for healthy status before returning

**POST** `/api/server/clara-core/stop`
- Gracefully stops Clara-Core container
- Query param: `timeout` (seconds, default: 10)
- Returns: `{ success: boolean, message: string }`

**POST** `/api/server/clara-core/restart`
- Restarts Clara-Core container
- Returns: `{ success: boolean, message: string }`

**DELETE** `/api/server/clara-core/remove`
- Stops and removes container (for architecture changes)
- Query param: `force=true|false` (force removal)
- Returns: `{ success: boolean, message: string }`

### Configuration

**POST** `/api/server/clara-core/configure`
- Updates Clara-Core configuration
- Body: `{ architecture?: string, modelsPath?: string, port?: number, environment?: Record<string,string> }`
- Returns: `{ success: boolean, requiresRecreate: boolean, message: string }`
- Should update docker-compose configuration without restarting (if possible)
</api_specification>

<implementation>
**Code Organization**:

Create new files:
- `./server/src/services/claraCoreDocker.ts` - Docker operations service
- `./server/src/services/gpuDetection.ts` - GPU detection logic
- `./server/src/api/claraCoreRoutes.ts` - Express routes
- `./server/src/types/claraCore.ts` - TypeScript types

**Key Implementation Details**:

1. **Docker Connection**:
   ```typescript
   // In web deployment, connect to Docker socket
   const docker = new Docker({ socketPath: '/var/run/docker.sock' });
   ```

2. **GPU Detection** (implement thoroughly, consider multiple approaches):
   - Try nvidia-smi command
   - Query Docker for NVIDIA devices
   - Try rocm-smi for AMD
   - Fall back to CPU if no GPU detected
   - Cache detection result (invalidate on request)

3. **Container Creation**:
   - Use docker-compose programmatically OR
   - Create container directly via Docker API with proper settings
   - For CUDA: include device requests for GPU access
   - For ROCm: include device mounts for /dev/kfd, /dev/dri
   - Set correct image tag: `claracore:${architecture}`
   - Mount volumes: downloads, config, optional models path

4. **Error Handling**:
   - Docker daemon not accessible → clear error message
   - Image doesn't exist → trigger build or provide pull instructions
   - Port 8091 in use → detect and suggest alternative
   - GPU requested but not available → warn and suggest CPU

5. **Health Checking**:
   - Container running doesn't mean healthy
   - Poll internal port 5890 for HTTP 200
   - Implement exponential backoff
   - Timeout after 60 seconds

**Validation**:
- Validate architecture is one of: cpu, cuda, rocm, strix
- Validate modelsPath exists if provided
- Validate port is available before creating
- Check Docker is accessible before any operation

**Security**:
- Docker socket access is privileged - validate all inputs
- Sanitize paths for volume mounts (no path traversal)
- Rate limit container operations (max 1 operation per 5 seconds)
- Add authentication middleware if server has auth

**Performance**:
- Container operations can be slow - use timeouts
- Cache GPU detection results (TTL: 5 minutes)
- Stream logs instead of loading all into memory
- Use async/await throughout, never block event loop
</implementation>

<integration>
**Update existing server code**:

1. Register routes in `./server/src/api/index.ts`:
   ```typescript
   import claraCoreRoutes from './claraCoreRoutes';
   app.use('/api/server/clara-core', claraCoreRoutes);
   ```

2. Add Docker socket mount to server container in `./deployment/docker/docker-compose.yml`:
   ```yaml
   server:
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock  # Add this
   ```

3. Install dockerode dependency:
   Update `./server/package.json` to include `dockerode` and `@types/dockerode`

4. Add environment variable for Docker host:
   ```yaml
   environment:
     - DOCKER_HOST=unix:///var/run/docker.sock
   ```
</integration>

<output>
Create the following new files with full implementations:

1. `./server/src/services/claraCoreDocker.ts`
   - ClaraCoreDockerService class with all lifecycle methods
   - Comprehensive error handling
   - Logging for debugging

2. `./server/src/services/gpuDetection.ts`
   - detectGPU() function with multiple detection methods
   - Caching logic
   - Type definitions for GPU info

3. `./server/src/api/claraCoreRoutes.ts`
   - All API endpoints specified above
   - Request validation
   - Proper HTTP status codes

4. `./server/src/types/claraCore.ts`
   - TypeScript interfaces for requests/responses
   - Enums for architecture types
   - Type guards for validation

Update these existing files:
- `./server/src/api/index.ts` - Register new routes
- `./server/package.json` - Add dockerode dependency
- `./deployment/docker/docker-compose.yml` - Add Docker socket mount to server
</output>

<verification>
Before declaring complete, verify:

1. **All endpoints implemented and tested**:
   - Try each endpoint with curl/Postman
   - Verify error handling (Docker unavailable, invalid arch, etc.)
   - Check response format matches specification

2. **GPU detection works**:
   - Test on system with NVIDIA GPU
   - Test on system with no GPU
   - Verify appropriate architecture recommended

3. **Container lifecycle**:
   - Create container with 'cpu' architecture
   - Verify it starts and becomes healthy
   - Stop and remove successfully
   - Create again with different architecture

4. **Integration**:
   - Routes registered in server
   - Docker socket accessible from container
   - Dependencies installed
   - Server restarts without errors

5. **Error scenarios handled**:
   - Docker daemon not running
   - Permission denied on socket
   - Invalid architecture specified
   - Port already in use
</verification>

<success_criteria>
- All API endpoints implemented and functional
- GPU detection accurately identifies hardware
- Containers can be created with CPU, CUDA, and ROCm architectures
- Health checking works reliably
- Error messages are clear and actionable
- Code is well-typed with TypeScript
- Logging provides debugging visibility
- Integration with existing server is clean
- Ready for frontend consumption (prompt 011)
</success_criteria>
