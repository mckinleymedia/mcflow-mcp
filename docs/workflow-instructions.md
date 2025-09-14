# Workflow Instructions

## Project-Specific Guidelines

Add your project-specific workflow creation and editing instructions here.

### Workflow Naming

- Use descriptive names that indicate the workflow's purpose
- Follow the pattern: `[action]-[target]-[frequency]` (e.g., `sync-customer-data-daily`)

### Required Components

Every workflow in this project should include:

1. **Error Handling**: Catch and handle errors appropriately
2. **Logging**: Log important events for debugging
3. **Notifications**: Alert on failures or important events
4. **Documentation**: Clear description in the workflow JSON

### Environment Variables

The following environment variables are used by workflows:

- `API_BASE_URL`: Base URL for API calls
- `NOTIFICATION_EMAIL`: Email for alerts
- Add more as needed...

### Testing Requirements

Before deploying a workflow:

1. Test with sample data
2. Verify error handling works
3. Check performance with expected data volume
4. Document any dependencies

### Security Considerations

- Never hardcode credentials
- Use n8n's built-in credential management
- Validate all external inputs
- Implement rate limiting where appropriate

---

*Update this file with your specific project requirements*
