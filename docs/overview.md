# McFlow Overview

## What is McFlow?

McFlow is a Model Context Protocol (MCP) server that bridges AI assistants with n8n workflow automation. It provides a structured, reliable way for AI agents to create, manage, and deploy n8n workflows without directly accessing the n8n CLI.

## Core Concepts

### Model Context Protocol (MCP)
MCP is a protocol that enables AI assistants to interact with external tools and services through a standardized interface. McFlow implements this protocol to provide workflow automation capabilities.

### Node Extraction System
McFlow's unique approach separates code content from workflow structure:
- **Workflow JSON**: Contains node configuration and connections
- **External Files**: Code, SQL, and prompts stored separately for better editing
- **Automatic Injection**: Content merged back during deployment

### Project Structure Flexibility
McFlow adapts to different repository layouts:
- **Simple Projects**: Single `workflows/` directory
- **Multi-Project Repos**: Multiple projects with individual workflow folders
- **Automatic Detection**: McFlow identifies your structure automatically

## Key Benefits

### For Developers
- **IDE Support**: Edit code with full syntax highlighting and IntelliSense
- **Version Control**: Track changes to code separately from workflow structure
- **Modularity**: Reuse code modules across workflows
- **Testing**: Test code logic independently

### For AI Assistants
- **Structured Interface**: Clear commands replace complex CLI operations
- **Validation**: Automatic checking prevents invalid workflows
- **Context Awareness**: Access to project conventions and patterns
- **Error Prevention**: Guards against common mistakes

### For Teams
- **Consistency**: Enforced naming conventions and structure
- **Documentation**: Auto-generated workflow documentation
- **Collaboration**: Clear separation of concerns
- **Maintenance**: Easier to update and debug

## Use Cases

### Automation Development
Create complex automation workflows with proper code management and testing.

### API Integration
Build REST API endpoints with webhook triggers and HTTP responses.

### Data Processing
Design ETL pipelines with database connections and transformation logic.

### Scheduled Tasks
Set up recurring jobs for reports, backups, and maintenance tasks.

### Event-Driven Workflows
React to external events with conditional logic and multi-path processing.

## How It Works

1. **Command Reception**: AI assistant sends McFlow commands through MCP
2. **Validation**: McFlow validates the request and parameters
3. **File Management**: Handles extraction/injection of code content
4. **n8n Integration**: Deploys validated workflows to n8n instance
5. **Feedback Loop**: Returns status and results to the AI assistant

## Design Philosophy

### Separation of Concerns
Code logic separated from workflow structure for clarity and maintainability.

### Fail-Safe Operations
Validation and checks prevent broken deployments and runtime errors.

### Developer Experience
Optimized for both human developers and AI assistants.

### Extensibility
Modular design allows for custom nodes, templates, and integrations.

## Getting Started

1. **Install McFlow**: Follow the installation guide
2. **Configure MCP Client**: Set up Claude Desktop or Continue.dev
3. **Create First Workflow**: Use templates to get started quickly
4. **Extract and Edit**: Leverage the code extraction system
5. **Deploy and Test**: Push to n8n and validate execution

## Next Steps

- Review the [Architecture](architecture.md) for technical details
- Check [Integration Guide](integrations.md) for client setup
- See [Node Reference](nodes.md) for available n8n nodes
- Read [Troubleshooting](troubleshooting.md) for common issues