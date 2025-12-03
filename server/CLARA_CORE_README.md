# Clara-Core Docker Management

Server-side API for managing Clara-Core Docker containers with automatic GPU detection and architecture selection.

## Quick Start

### 1. Install Dependencies

```bash
cd /home/cinna/src/ClaraVerse/server
./install-clara-core-deps.sh
```

This will:
- Install npm dependencies (dockerode)
- Compile TypeScript
- Verify all files exist

### 2. Update Docker Compose

The `docker-compose.yml` has been updated to mount the Docker socket to the server container:

```yaml
server:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  environment:
    - DOCKER_HOST=unix:///var/run/docker.sock
```

### 3. Rebuild and Restart

```bash
cd /home/cinna/src/ClaraVerse/deployment/docker
docker-compose build server
docker-compose up -d server
```

### 4. Verify Installation

```bash
# Check Docker connectivity
curl http://localhost:3000/api/server/clara-core/docker-connection

# Detect GPU hardware
curl http://localhost:3000/api/server/clara-core/detect-gpu

# Get system info
curl http://localhost:3000/api/server/clara-core/system-info
```

### 5. Run Tests

```bash
cd /home/cinna/src/ClaraVerse/server
./test-clara-core-api.sh
```

## Features

### Automatic GPU Detection

The API automatically detects your GPU hardware and recommends the best Clara-Core architecture:

- **NVIDIA GPUs**: Detects via `nvidia-smi`, recommends CUDA
- **AMD GPUs**: Detects via `rocm-smi` or fallback methods, recommends ROCm
- **No GPU**: Recommends CPU architecture

Results are cached for 5 minutes to improve performance.

### Container Lifecycle Management

Complete control over Clara-Core containers:

- **Create**: Set up container with chosen architecture
- **Start**: Launch container and wait for healthy status
- **Stop**: Gracefully shutdown container
- **Restart**: Restart with health verification
- **Remove**: Delete container for architecture changes

### Health Checking

Automatic health verification:
- Polls `/health` endpoint on port 8091
- Retries up to 30 times over 60 seconds
- Ensures container is fully ready before operations complete

### Architecture Support

| Architecture | Use Case | Requirements |
|--------------|----------|--------------|
| **CPU** | Any system | None |
| **CUDA** | NVIDIA GPUs | CUDA runtime, nvidia-docker |
| **ROCm** | AMD GPUs | ROCm drivers |
| **Strix** | AMD Ryzen AI | Strix drivers |

## API Documentation

See [CLARA_CORE_API.md](./CLARA_CORE_API.md) for complete API documentation.

### Common Workflows

#### Initial Setup

```bash
# 1. Detect GPU
curl http://localhost:3000/api/server/clara-core/detect-gpu

# 2. Check if CUDA image exists
curl http://localhost:3000/api/server/clara-core/image-exists/cuda

# 3. Create container
curl -X POST http://localhost:3000/api/server/clara-core/create \
  -H "Content-Type: application/json" \
  -d '{"architecture": "cuda"}'

# 4. Start container
curl -X POST http://localhost:3000/api/server/clara-core/start

# 5. Check status
curl http://localhost:3000/api/server/clara-core/status
```

#### Change Architecture

```bash
# 1. Stop current container
curl -X POST http://localhost:3000/api/server/clara-core/stop

# 2. Remove container
curl -X DELETE http://localhost:3000/api/server/clara-core/remove

# 3. Create with new architecture
curl -X POST http://localhost:3000/api/server/clara-core/create \
  -H "Content-Type: application/json" \
  -d '{"architecture": "cpu"}'

# 4. Start new container
curl -X POST http://localhost:3000/api/server/clara-core/start
```

#### Monitor Status

```bash
# Get detailed status
curl http://localhost:3000/api/server/clara-core/status

# View recent logs
curl http://localhost:3000/api/server/clara-core/logs?lines=100

# Quick health check
curl http://localhost:3000/api/server/clara-core/health
```

## File Structure

```
server/
├── src/
│   ├── types/
│   │   └── claraCore.ts              # TypeScript type definitions
│   ├── services/
│   │   ├── gpuDetection.ts           # GPU detection service
│   │   └── claraCoreDocker.ts        # Docker management service
│   └── api/
│       └── claraCoreRoutes.ts        # API routes
├── CLARA_CORE_API.md                 # API documentation
├── CLARA_CORE_DOCKER_IMPLEMENTATION.md # Implementation details
├── CLARA_CORE_README.md              # This file
├── install-clara-core-deps.sh        # Installation script
└── test-clara-core-api.sh            # Testing script
```

## Implementation Details

See [CLARA_CORE_DOCKER_IMPLEMENTATION.md](./CLARA_CORE_DOCKER_IMPLEMENTATION.md) for:
- Complete implementation summary
- Architecture decisions
- Security considerations
- Performance optimizations
- Testing recommendations

## Troubleshooting

### Docker Connection Failed

**Error:** "Docker daemon is not accessible"

**Solution:**
1. Ensure Docker is running: `systemctl status docker`
2. Check socket permissions: `ls -la /var/run/docker.sock`
3. Verify docker-compose.yml has socket mount
4. Restart server container: `docker-compose restart server`

### Image Not Found

**Error:** "Clara-Core image not found: claracore:cuda"

**Solution:**
1. Build the image in ClaraCore repository:
   ```bash
   cd /home/cinna/src/ClaraCore
   docker build -t claracore:cuda -f docker-cuda/Dockerfile.cuda .
   ```

### Health Check Failed

**Error:** "Clara-Core started but failed health check"

**Solution:**
1. Check container logs: `curl http://localhost:3000/api/server/clara-core/logs?lines=200`
2. Verify port 8091 is accessible
3. Check container is running: `docker ps | grep claracore`
4. Increase health check timeout if needed

### Port In Use

**Error:** "Port 8091 is already in use"

**Solution:**
1. Find what's using the port: `netstat -tuln | grep 8091`
2. Stop the conflicting service
3. Or use a different port: `{"architecture": "cuda", "port": 8092}`

## Rate Limiting

Container operations are rate-limited to one operation per 5 seconds. If you see:

```
Rate limit: Please wait X seconds before next operation
```

Wait the specified time before retrying.

## Security Notes

The server container has privileged Docker access to manage containers. In production:

1. **Add Authentication**: Protect endpoints with auth middleware
2. **Resource Limits**: Set container CPU/memory limits
3. **Audit Logging**: Log all container operations
4. **Network Isolation**: Use dedicated Docker networks
5. **Input Validation**: All inputs are validated, but review for your use case

## Next Steps

After the API is working:

1. **Frontend Integration**: Implement UI in ClaraVerse (prompt 011)
   - Setup wizard for first-time users
   - Container management dashboard
   - Status monitoring

2. **Build Images**: Build Clara-Core images for your GPU
   ```bash
   cd /home/cinna/src/ClaraCore
   docker build -t claracore:cuda -f docker-cuda/Dockerfile.cuda .
   ```

3. **Test Complete Workflow**: Create, start, and verify container
   ```bash
   ./test-clara-core-api.sh
   ```

## Support

For issues or questions:

1. Check the [API documentation](./CLARA_CORE_API.md)
2. Review [implementation details](./CLARA_CORE_DOCKER_IMPLEMENTATION.md)
3. Run tests: `./test-clara-core-api.sh`
4. Check server logs: `docker-compose logs server`

## Contributing

When modifying the Clara-Core Docker management:

1. Update type definitions in `src/types/claraCore.ts`
2. Add/modify service methods in `src/services/`
3. Update API routes in `src/api/claraCoreRoutes.ts`
4. Update documentation in `CLARA_CORE_API.md`
5. Add tests to `test-clara-core-api.sh`
6. Rebuild and test: `npm run build && ./test-clara-core-api.sh`

## License

Part of ClaraVerse - see main project license.
