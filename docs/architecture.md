# McFlow Architecture

## System Architecture

```
┌─────────────────┐     MCP Protocol     ┌──────────────┐
│   AI Assistant  │◄────────────────────►│    McFlow    │
│ (Claude/GPT/etc)│                       │  MCP Server  │
└─────────────────┘                       └──────┬───────┘
                                                  │
                                          ┌───────▼────────┐
                                          │ File System    │
                                          │ • workflows/   │
                                          │ • nodes/       │
                                          │ • modules/     │
                                          └───────┬────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │   n8n CLI      │
                                          │   Interface    │
                                          └───────┬────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │ n8n Instance   │
                                          │ • Workflows    │
                                          │ • Executions   │
                                          │ • Credentials  │
                                          └────────────────┘
```

## Core Components

### MCP Server (`src/index.ts`)
The main entry point that implements the Model Context Protocol:
- Registers available tools and resources
- Handles incoming requests from AI assistants
- Routes commands to appropriate managers
- Returns formatted responses

### Workflow Manager (`src/workflow-manager.ts`)
Handles all workflow-related operations:
- CRUD operations for workflow files
- Template generation
- Workflow validation
- Project structure detection

### Node Manager (`src/node-manager.ts`)
Manages individual nodes within workflows:
- Node creation and configuration
- Connection management
- Position calculation
- Type validation

### Deploy Manager (`src/deploy.ts`)
Handles deployment to n8n:
- Code injection from external files
- Parallel deployment of multiple workflows
- Activation/deactivation of workflows
- Change tracking

### n8n Manager (`src/n8n-manager.ts`)
Interfaces with the n8n CLI:
- Command execution
- Error handling
- Output parsing
- Database management

### Change Tracker (`src/change-tracker.ts`)
Monitors workflow modifications:
- Tracks file changes
- Identifies workflows needing deployment
- Maintains deployment history
- Provides status reports

## Data Flow

### Workflow Creation
1. AI requests workflow creation with parameters
2. Workflow Manager generates workflow JSON
3. Node Validator checks node types
4. Workflow saved to file system
5. Change Tracker records new workflow

### Code Extraction
1. Read workflow from file system
2. Identify code/prompt/SQL nodes
3. Extract content to separate files
4. Update workflow with file references
5. Save both workflow and extracted files

### Deployment Process
1. Change Tracker identifies modified workflows
2. Deploy Manager reads workflow files
3. Code injection from `nodes/` directory
4. Validation of complete workflow
5. n8n CLI import execution
6. Update deployment status

### Workflow Execution
1. AI requests workflow execution
2. n8n Manager prepares command
3. Execute via n8n CLI
4. Parse execution results
5. Return formatted output

## File Structure

```
project-root/
├── src/                      # McFlow source code
│   ├── index.ts             # MCP server entry point
│   ├── workflow-manager.ts  # Workflow operations
│   ├── node-manager.ts      # Node operations
│   ├── deploy.ts            # Deployment logic
│   ├── n8n-manager.ts       # n8n CLI interface
│   ├── change-tracker.ts    # Change monitoring
│   ├── node-validator.ts    # Node validation
│   ├── credential-manager.ts # Credential analysis
│   └── ...                  # Other utilities
│
├── workflows/               # Workflow storage
│   ├── flows/              # Workflow JSON files
│   │   ├── workflow-1.json
│   │   └── workflow-2.json
│   │
│   ├── nodes/              # Extracted content
│   │   ├── code/          # JavaScript/Python
│   │   ├── prompts/       # AI prompts
│   │   ├── sql/           # SQL queries
│   │   └── .metadata.json # Extraction metadata
│   │
│   └── modules/            # Shared code modules
│       ├── utils.js
│       └── constants.py
│
└── .mcflow/                # McFlow metadata
    └── change-tracker.json # Deployment tracking
```

## Key Design Patterns

### Dependency Injection
Managers receive configuration and dependencies through constructors, enabling testing and flexibility.

### Command Pattern
Each MCP tool maps to a command handler, providing clear separation of concerns.

### Repository Pattern
File system operations abstracted through manager classes, allowing for future storage backends.

### Validation Pipeline
Multi-stage validation ensures workflow integrity before deployment.

### Event Sourcing
Change tracker maintains history of all workflow modifications and deployments.

## Security Considerations

### Credential Handling
- Never store credentials in workflow files
- Analyze credential requirements without exposing values
- Use n8n's credential management system

### Code Injection Safety
- Validate file paths before reading
- Sanitize content during injection
- Prevent directory traversal attacks

### Command Execution
- Sanitize all CLI arguments
- Use proper escaping for shell commands
- Limit command execution scope

## Performance Optimizations

### Parallel Operations
- Deploy multiple workflows simultaneously
- Batch file operations
- Concurrent validation checks

### Caching
- Cache workflow metadata
- Store validation results
- Reuse parsed workflow structures

### Lazy Loading
- Load workflows on demand
- Defer node extraction until needed
- Stream large file content

## Extension Points

### Custom Node Types
Add support for new n8n nodes by updating the validator.

### Template System
Create new workflow templates for common patterns.

### Storage Backends
Implement alternative storage beyond file system.

### Validation Rules
Add custom validation logic for specific requirements.

### MCP Tools
Extend with additional tools for new functionality.

## Error Handling

### Graceful Degradation
- Fallback options for failed operations
- Partial success handling
- Recovery mechanisms

### Error Classification
- User errors (invalid input)
- System errors (n8n unavailable)
- Validation errors (invalid workflows)

### Error Reporting
- Structured error messages
- Actionable error descriptions
- Debug information when needed