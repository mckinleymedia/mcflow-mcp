# Git Workflow Guidelines

## Repository Structure

### Main Branches
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Individual feature development
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

## Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

### Examples
```bash
feat(workflows): add template for data sync workflows
fix(deploy): handle special characters in node content
docs(readme): update installation instructions
refactor(node-manager): simplify connection logic
```

### Commit Best Practices
- Keep commits atomic and focused
- Write clear, descriptive messages
- Reference issues when applicable
- Sign commits when required

## Workflow Files in Git

### What to Commit

#### Always Commit
- Workflow JSON files (`workflows/flows/*.json`)
- Extracted code files (`workflows/nodes/**/*`)
- Shared modules (`workflows/modules/*`)
- Configuration files
- Documentation

#### Never Commit
- `.env` files with credentials
- `database.sqlite` files
- Node modules (`node_modules/`)
- Build artifacts (`dist/` during development)
- Temporary files

### .gitignore Template
```gitignore
# Environment
.env
.env.local
*.env

# n8n
database.sqlite
*.sqlite
.n8n/

# Dependencies
node_modules/
npm-debug.log*
yarn-error.log*

# Build outputs
dist/
*.tsbuildinfo

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary
*.tmp
*.bak
.mcflow/change-tracker.json
```

## Branching Strategy

### Feature Development
```bash
# Create feature branch
git checkout -b feature/webhook-integration

# Make changes
mcflow create --name "webhook-handler"
mcflow extract_code

# Commit workflow and extracted code
git add workflows/
git commit -m "feat(workflows): add webhook handler workflow"

# Push and create PR
git push -u origin feature/webhook-integration
```

### Bug Fixes
```bash
# Create fix branch from main
git checkout main
git checkout -b fix/deployment-error

# Fix the issue
# ... make changes ...

# Commit fix
git add -A
git commit -m "fix(deploy): resolve code injection for special characters"

# Push for review
git push -u origin fix/deployment-error
```

## Pull Request Guidelines

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Workflows validated with `mcflow validate`
- [ ] Deployment tested with `mcflow deploy`
- [ ] Execution tested with `mcflow execute`

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No credentials in code
```

### Review Process
1. Create PR with clear description
2. Ensure CI checks pass
3. Request review from team
4. Address feedback
5. Squash and merge when approved

## Working with Extracted Code

### Workflow Development Flow
```bash
# 1. Create or modify workflow
mcflow create --name "my-workflow"

# 2. Extract code for editing
mcflow extract_code

# 3. Edit extracted files with IDE
code workflows/nodes/code/my-workflow-*.js

# 4. Test locally
mcflow validate
mcflow deploy
mcflow execute

# 5. Commit both workflow and code
git add workflows/flows/my-workflow.json
git add workflows/nodes/code/my-workflow-*.js
git commit -m "feat(workflows): implement data processing logic"
```

### Managing Changes
```bash
# Check what needs deployment
mcflow status

# See modified workflows
git status workflows/

# Diff extracted code
git diff workflows/nodes/

# Stage all workflow changes
git add workflows/
```

## Collaboration

### Merge Conflicts

#### Workflow JSON Conflicts
1. Check both versions of the workflow
2. Understand the intent of each change
3. Manually merge or recreate if needed
4. Validate after resolution

```bash
# After resolving conflicts
mcflow validate
git add workflows/flows/conflicted-workflow.json
git commit
```

#### Extracted Code Conflicts
1. Resolve code conflicts in editor
2. Ensure consistency with workflow
3. Test thoroughly after merge

### Sharing Workflows

#### Export for Sharing
```bash
# Export specific workflow
mcflow export --id workflow-id --pretty

# Create shareable package
tar -czf workflows-package.tar.gz workflows/flows/ workflows/nodes/
```

#### Import from Others
```bash
# Extract shared package
tar -xzf workflows-package.tar.gz

# Validate before deployment
mcflow validate

# Deploy if valid
mcflow deploy
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Workflow Validation

on:
  pull_request:
    paths:
      - 'workflows/**'
      - 'src/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build McFlow
        run: npm run build
        
      - name: Validate workflows
        run: npm run validate-all
```

### Pre-commit Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Validate workflows before commit
npm run validate-all
if [ $? -ne 0 ]; then
    echo "Workflow validation failed. Please fix errors before committing."
    exit 1
fi
```

## Version Control Tips

### Tracking Workflow Versions
- Tag releases with workflow versions
- Document breaking changes
- Maintain changelog for workflows

### Rollback Procedures
```bash
# Revert to previous workflow version
git checkout <commit-hash> -- workflows/flows/workflow-name.json

# Revert extracted code too
git checkout <commit-hash> -- workflows/nodes/

# Validate and redeploy
mcflow validate
mcflow deploy
```

### Backup Strategy
- Regular commits of working workflows
- Tag stable versions
- Keep backups of production workflows
- Document recovery procedures

## Best Practices

### Do's
- ✅ Commit workflow and extracted code together
- ✅ Write descriptive commit messages
- ✅ Validate before committing
- ✅ Use branches for features
- ✅ Review changes before pushing
- ✅ Keep credentials out of repos

### Don'ts
- ❌ Commit broken workflows
- ❌ Mix unrelated changes
- ❌ Commit generated files
- ❌ Force push to main
- ❌ Commit sensitive data
- ❌ Ignore validation errors