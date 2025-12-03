# Clara-Core Docker Management API

Complete REST API documentation for managing Clara-Core containers programmatically.

## Base URL

All endpoints are prefixed with: `/api/server/clara-core`

## Prerequisites

- Docker daemon must be running
- Docker socket must be mounted to server container (`/var/run/docker.sock`)
- Clara-Core images must be built for desired architectures

## Architecture Support

Clara-Core supports the following architectures:

- **cpu** - CPU-only inference (works on all systems)
- **cuda** - NVIDIA GPU acceleration (requires CUDA runtime)
- **rocm** - AMD GPU acceleration (requires ROCm)
- **strix** - AMD Ryzen AI acceleration (APU)

---

## Detection & Status Endpoints

### GET `/detect-gpu`

Detects available GPU hardware and recommends the best Clara-Core architecture.

**Query Parameters:**
- `skipCache` (boolean, optional) - Force fresh detection, bypass cache

**Response:**
```json
{
  "success": true,
  "gpuType": "nvidia" | "amd" | "none",
  "recommended": "cuda" | "rocm" | "cpu",
  "devices": ["/dev/nvidia0", "/dev/nvidia1"],
  "details": {
    "driverVersion": "535.129.03",
    "cudaVersion": "12.2",
    "gpuModels": ["NVIDIA RTX 4090", "NVIDIA RTX 4080"]
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/detect-gpu
```

---

### GET `/status`

Gets Clara-Core container status and health information.

**Response:**
```json
{
  "success": true,
  "exists": true,
  "running": true,
  "architecture": "cuda",
  "healthy": true,
  "port": 8091,
  "containerId": "a1b2c3d4e5f6",
  "imageId": "sha256:abc123...",
  "created": "2025-12-03T10:00:00.000Z",
  "startedAt": "2025-12-03T10:01:00.000Z",
  "uptime": 3600
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/status
```

---

### GET `/logs`

Retrieves Clara-Core container logs.

**Query Parameters:**
- `lines` (number, optional, default: 100) - Number of log lines to retrieve
- `timestamps` (boolean, optional, default: false) - Include timestamps
- `since` (number, optional) - Unix timestamp to retrieve logs since

**Response:**
```json
{
  "success": true,
  "logs": "2025-12-03 10:00:00 Starting Clara-Core...\n2025-12-03 10:00:01 Server listening on port 5890"
}
```

**Example:**
```bash
curl "http://localhost:3000/api/server/clara-core/logs?lines=50&timestamps=true"
```

---

### GET `/health`

Quick health check for Clara-Core service.

**Response:**
```json
{
  "success": true,
  "healthy": true,
  "running": true,
  "exists": true
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/health
```

---

### GET `/docker-connection`

Checks Docker daemon connectivity.

**Response (Success):**
```json
{
  "success": true,
  "connected": true
}
```

**Response (Failure):**
```json
{
  "success": false,
  "connected": false,
  "error": "Docker daemon is not accessible. Please ensure Docker is running and the socket is mounted."
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/docker-connection
```

---

## Lifecycle Management Endpoints

### POST `/create`

Creates a new Clara-Core container with the specified architecture.

**Request Body:**
```json
{
  "architecture": "cuda",
  "modelsPath": "/path/to/models",
  "port": 8091,
  "environment": {
    "CUSTOM_VAR": "value"
  },
  "gpuDevices": ["0", "1"]
}
```

**Required Fields:**
- `architecture` - One of: cpu, cuda, rocm, strix

**Optional Fields:**
- `modelsPath` - Host path to mount as `/app/models`
- `port` - External port (default: 8091)
- `environment` - Additional environment variables
- `gpuDevices` - Specific GPU devices to use

**Response (Success):**
```json
{
  "success": true,
  "message": "Clara-Core container created successfully",
  "containerId": "a1b2c3d4e5f6"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Clara-Core image not found: claracore:cuda. Please build the image first.",
  "error": "IMAGE_NOT_FOUND"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/server/clara-core/create \
  -H "Content-Type: application/json" \
  -d '{
    "architecture": "cuda",
    "port": 8091
  }'
```

---

### POST `/start`

Starts an existing Clara-Core container and waits for it to become healthy.

**Response (Success):**
```json
{
  "success": true,
  "message": "Clara-Core started successfully",
  "containerId": "a1b2c3d4e5f6"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Clara-Core container does not exist. Please create it first.",
  "error": "CONTAINER_NOT_FOUND"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/server/clara-core/start
```

---

### POST `/stop`

Gracefully stops the Clara-Core container.

**Query Parameters:**
- `timeout` (number, optional, default: 10) - Timeout in seconds (0-300)

**Response (Success):**
```json
{
  "success": true,
  "message": "Clara-Core stopped successfully",
  "containerId": "a1b2c3d4e5f6"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/server/clara-core/stop?timeout=15"
```

---

### POST `/restart`

Restarts the Clara-Core container and waits for healthy status.

**Response (Success):**
```json
{
  "success": true,
  "message": "Clara-Core restarted successfully",
  "containerId": "a1b2c3d4e5f6"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/server/clara-core/restart
```

---

### DELETE `/remove`

Stops (if running) and removes the Clara-Core container.

**Query Parameters:**
- `force` (boolean, optional, default: false) - Force removal without graceful stop

**Response (Success):**
```json
{
  "success": true,
  "message": "Clara-Core container removed successfully",
  "containerId": "a1b2c3d4e5f6"
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/server/clara-core/remove?force=true"
```

---

## Configuration Endpoints

### POST `/configure`

Updates Clara-Core configuration. Currently requires container recreation for most changes.

**Request Body:**
```json
{
  "architecture": "rocm",
  "modelsPath": "/new/path/to/models",
  "port": 8092,
  "environment": {
    "VAR": "value"
  }
}
```

**Response:**
```json
{
  "success": false,
  "message": "Configuration updates require container recreation. Please remove and recreate the container.",
  "error": "REQUIRES_RECREATE"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/server/clara-core/configure \
  -H "Content-Type: application/json" \
  -d '{
    "architecture": "cpu"
  }'
```

---

### GET `/image-exists/:architecture`

Checks if a Clara-Core Docker image exists for the specified architecture.

**Path Parameters:**
- `architecture` - One of: cpu, cuda, rocm, strix

**Response:**
```json
{
  "success": true,
  "exists": true,
  "architecture": "cuda",
  "image": "claracore:cuda"
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/image-exists/cuda
```

---

### GET `/port-available/:port`

Checks if a port is available on the host system.

**Path Parameters:**
- `port` - Port number (1-65535)

**Response:**
```json
{
  "success": true,
  "port": 8091,
  "available": true
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/port-available/8091
```

---

## Utility Endpoints

### GET `/architectures`

Lists all supported Clara-Core architectures with descriptions.

**Response:**
```json
{
  "success": true,
  "architectures": ["cpu", "cuda", "rocm", "strix"],
  "descriptions": {
    "cpu": "CPU-only inference (works on all systems)",
    "cuda": "NVIDIA GPU acceleration (requires CUDA)",
    "rocm": "AMD GPU acceleration (requires ROCm)",
    "strix": "AMD Ryzen AI acceleration (APU)"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/architectures
```

---

### GET `/system-info`

Gets comprehensive system information for Clara-Core setup.

**Response:**
```json
{
  "success": true,
  "docker": {
    "connected": true
  },
  "gpu": {
    "type": "nvidia",
    "recommended": "cuda",
    "deviceCount": 2,
    "details": {
      "driverVersion": "535.129.03",
      "cudaVersion": "12.2",
      "gpuModels": ["NVIDIA RTX 4090"]
    }
  },
  "container": {
    "exists": true,
    "running": true,
    "architecture": "cuda",
    "healthy": true
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/server/clara-core/system-info
```

---

## Error Codes

Common error codes returned by the API:

- `CONTAINER_NOT_FOUND` - Clara-Core container doesn't exist
- `IMAGE_NOT_FOUND` - Clara-Core image for architecture not built
- `PORT_IN_USE` - Requested port is already in use
- `HEALTH_CHECK_FAILED` - Container started but failed health check
- `REQUIRES_RECREATE` - Operation requires container recreation
- `DOCKER_NOT_ACCESSIBLE` - Cannot connect to Docker daemon

---

## Rate Limiting

Container operations are rate-limited to one operation per 5 seconds to prevent concurrent operations that could cause issues.

---

## Typical Workflow

### Initial Setup

1. Check Docker connection:
   ```bash
   GET /docker-connection
   ```

2. Detect GPU hardware:
   ```bash
   GET /detect-gpu
   ```

3. Check if image exists:
   ```bash
   GET /image-exists/cuda
   ```

4. Create container:
   ```bash
   POST /create
   {
     "architecture": "cuda"
   }
   ```

5. Start container:
   ```bash
   POST /start
   ```

6. Verify health:
   ```bash
   GET /health
   ```

### Architecture Change

1. Stop container:
   ```bash
   POST /stop
   ```

2. Remove container:
   ```bash
   DELETE /remove
   ```

3. Create with new architecture:
   ```bash
   POST /create
   {
     "architecture": "rocm"
   }
   ```

4. Start container:
   ```bash
   POST /start
   ```

### Monitoring

1. Check status:
   ```bash
   GET /status
   ```

2. View logs:
   ```bash
   GET /logs?lines=100
   ```

3. Get system info:
   ```bash
   GET /system-info
   ```

---

## Integration Notes

- All endpoints return JSON responses
- Use appropriate HTTP methods (GET, POST, DELETE)
- Check `success` field in response to determine operation outcome
- Container creation/start operations include automatic health checking
- GPU detection results are cached for 5 minutes
- Docker socket must be accessible to the server container
- Operations are rate-limited to prevent concurrent execution issues
