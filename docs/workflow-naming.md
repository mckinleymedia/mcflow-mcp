# Workflow Naming Standards

## ⚠️ MANDATORY: All Workflows Must Include Project Prefix

### Format
```
[project-name]-[workflow-purpose]
```

### Why This is Critical
1. **Avoid Conflicts** - Multiple projects may have similar workflows
2. **Easy Identification** - Instantly know which project a workflow belongs to
3. **Better Organization** - Workflows sort naturally by project
4. **Clear Ownership** - No ambiguity about workflow purpose and project

### Examples

#### ✅ CORRECT - With Project Prefix
```
newspop-news-collection
newspop-image-generation
newspop-review-queue
myapp-user-registration
myapp-payment-processor
client-invoice-generator
client-report-builder
```

#### ❌ WRONG - Missing Project Prefix
```
news-collection          # Which project?
image-generation         # Could be any project
user-registration        # Ambiguous
payment-processor        # No context
workflow-1              # Generic and no prefix
test-workflow           # Missing project context
demo                    # Too generic
```

### Naming Rules

1. **Always start with project name**
   - Use the consistent project identifier
   - Keep it short but recognizable

2. **Use kebab-case**
   - `project-name-workflow-purpose`
   - Not: `projectName_workflowPurpose`

3. **Be descriptive**
   - `newspop-news-analysis` ✅
   - `newspop-workflow-2` ❌

4. **Keep it concise**
   - `myapp-send-welcome-email` ✅
   - `myapp-workflow-that-sends-welcome-emails-to-new-users` ❌

### Special Cases

#### Module Workflows
For workflows that are modules called by other workflows:
```
project-module-purpose
newspop-module-news-collection
newspop-module-image-generation
```

#### Test Workflows
For test/development workflows:
```
project-test-purpose
newspop-test-api-integration
newspop-test-ai-response
```

#### Utility Workflows
For utility/helper workflows:
```
project-util-purpose
newspop-util-cleanup
newspop-util-backup
```

### Enforcement

McFlow and AI agents MUST:
1. **Reject** workflow names without project prefix
2. **Suggest** correct naming when creating workflows
3. **Validate** naming during deployment
4. **Auto-prefix** if project context is known

### Migration

When working with existing workflows:
1. **Identify** workflows without proper prefix
2. **Rename** to include project prefix
3. **Update** all references in other workflows
4. **Document** the change

---

**Remember:** Every workflow name tells a story - make sure it starts with the project!