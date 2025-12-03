<research_objective>
Thoroughly analyze Clara-Core's architecture to understand its components, services, and containerization approach. This research will inform implementation decisions for dynamic Clara-Core container management in ClaraVerse's web deployment.

**End goal**: Determine if Clara-Core can be modularized, what services it provides by default, and whether components should be split or kept together for Docker deployment.
</research_objective>

<context>
Clara-Core is a local LLM inference server based on llama.cpp that ClaraVerse integrates for local AI model serving. The Clara-Core repository is located at `/home/cinna/src/ClaraCore` and currently has Docker configurations for multiple architectures (CPU, CUDA, ROCm, Strix).

ClaraVerse needs to dynamically manage Clara-Core containers based on user GPU selection during setup. We need to understand:
- What Clara-Core actually consists of (just llama.cpp wrapper, or more?)
- What services/processes start when Clara-Core runs
- Whether components can/should be separated
- Port usage and external dependencies
</context>

<research_scope>
**Primary sources**:
@/home/cinna/src/ClaraCore/README.md
@/home/cinna/src/ClaraCore/claracore.go
@/home/cinna/src/ClaraCore/docker-cpu/Dockerfile.cpu
@/home/cinna/src/ClaraCore/docker-cuda/Dockerfile.cuda
@/home/cinna/src/ClaraCore/docker-cpu/docker-compose.yml
@/home/cinna/src/ClaraCore/proxy/*
@/home/cinna/src/ClaraCore/ui/*

**Investigation areas**:
1. **Architecture Analysis**
   - What is Clara-Core's core function?
   - Is it a monolithic binary or multiple services?
   - What does the Go binary (`claracore.go`) do?
   - Does it proxy to llama-server or is it standalone?

2. **Services & Components**
   - What processes start when Clara-Core runs?
   - What ports does it use (5890 confirmed, any others)?
   - Does it have a UI component? API endpoints?
   - Are there background services or schedulers?

3. **Dependencies**
   - What external dependencies does Clara-Core have?
   - Does it require llama.cpp binaries? (Dockerfile suggests yes)
   - Can it work without the proxy layer?
   - What's required vs optional?

4. **Modularization Potential**
   - Can the UI be separated from the inference engine?
   - Can multiple models be served independently?
   - Would splitting components provide any benefit?
   - What's the communication protocol between parts?

5. **Docker Architecture**
   - How do the Dockerfiles differ (CPU vs CUDA vs ROCm)?
   - What's copied into containers vs mounted?
   - How is configuration handled?
   - Volume requirements?

**Exploration depth**: Thoroughly examine the codebase structure, read key source files, and understand the deployment model. Consider multiple architectural perspectives.
</research_scope>

<deliverables>
Create a comprehensive research document at: `./research/clara-core-architecture-analysis.md`

Structure:
```markdown
# Clara-Core Architecture Analysis

## Executive Summary
[2-3 paragraphs: What is Clara-Core, what does it do, key findings]

## Core Components
[Detailed breakdown of what Clara-Core consists of]

### Main Binary (claracore.go)
- Purpose and functionality
- What it wraps/proxies
- Key responsibilities

### UI Layer
- What UI exists (if any)
- How it's served
- Can it be optional?

### Inference Layer
- How models are loaded/served
- Relationship with llama.cpp
- Port/API structure

### Proxy/Routing Layer
- What proxying occurs
- Why it's needed
- Can it be bypassed?

## Services Started on Launch
[List and describe each service/process that runs]

## Port Usage
- 5890: [description]
- [any other ports]: [description]

## External Dependencies
**Required**:
- [list with explanations]

**Optional**:
- [list with explanations]

## Docker Architecture Comparison

### CPU Dockerfile
- Base image
- What's included
- Key differences from GPU versions

### CUDA Dockerfile
- NVIDIA-specific components
- GPU access requirements

### ROCm Dockerfile
- AMD-specific components
- Differences from CUDA

## Modularization Assessment

### Can We Split Components?
[Yes/No with detailed reasoning]

### Should We Split Components?
**Pros**:
- [list benefits]

**Cons**:
- [list drawbacks]

### Recommendation
[Clear recommendation with rationale]

## Configuration & Deployment

### Environment Variables
[List and explain]

### Volume Mounts
- Required: [list]
- Optional: [list]
- Purpose of each

### Build Process
[How Clara-Core binary is built, if relevant to container management]

## Integration Considerations for ClaraVerse

### Port Mapping
- Internal: 5890
- External: 8091 (ClaraVerse expectation)
- [Any conflicts or considerations]

### Container Lifecycle
[What happens on start, stop, restart]

### Health Checks
[How to verify Clara-Core is running properly]

### Resource Requirements
- CPU variant: [requirements]
- CUDA variant: [requirements + GPU needs]
- ROCm variant: [requirements + GPU needs]

## Key Findings & Recommendations

1. [Most important finding]
2. [Second most important finding]
3. [etc.]

## Open Questions
[Any unresolved questions that need follow-up]
```
</deliverables>

<verification>
Before completing, verify:
- All source files listed in research_scope have been examined
- Each investigation area has findings documented
- Clear recommendation provided on modularization
- Integration considerations specifically address ClaraVerse's needs
- Document is comprehensive enough to inform implementation decisions
</verification>

<success_criteria>
- Research document created at `./research/clara-core-architecture-analysis.md`
- All key components identified and explained
- Clear understanding of services that run with Clara-Core
- Definitive answer on whether to split components or keep together
- Docker architecture differences documented
- Actionable recommendations for ClaraVerse integration
- Sufficient detail for implementing container management
</success_criteria>
