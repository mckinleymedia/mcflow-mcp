# Credential Security in McFlow

## Security First Approach

McFlow takes credential security seriously:

1. **Never Logs Credentials** - McFlow NEVER logs or displays actual credential values
2. **Check-Only** - Only checks if credentials exist, doesn't read their values
3. **Manual Setup** - Credentials must be added through n8n's secure UI
4. **No Dependencies** - No external packages that could compromise security

## How McFlow Handles Credentials

### What McFlow CAN Do:
✅ Analyze which credentials your workflows need
✅ Check if environment variables exist (not their values)
✅ Generate .env.example templates
✅ Provide setup instructions for each service
✅ Detect credential requirements from workflow nodes

### What McFlow CANNOT Do (By Design):
❌ Read actual credential values
❌ Automatically populate credentials in n8n
❌ Display or log API keys
❌ Transfer credentials between systems
❌ Store credentials anywhere

## Using the Credentials Tool

```bash
# Analyze what credentials your workflows need
McFlow credentials --action analyze

# Get setup instructions for credentials
McFlow credentials --action instructions  

# Generate .env.example template
McFlow credentials --action generate-env
```

## Security Best Practices

1. **Use .env Files Properly**
   ```bash
   # ALWAYS add .env to .gitignore
   echo ".env" >> .gitignore
   
   # Use .env.example for templates
   cp .env.example .env
   # Then add your actual keys to .env
   ```

2. **Add Credentials in n8n UI**
   - Open http://localhost:5678
   - Go to Credentials
   - Add each credential manually
   - n8n encrypts and stores them securely

3. **Rotate Keys Regularly**
   - Set calendar reminders
   - Use different keys for dev/prod
   - Monitor API usage

4. **Never Share Credentials**
   - Don't paste in chat/email
   - Don't commit to git
   - Don't log them in code

## Credential Flow

```
1. Developer creates .env.example (template)
   ↓
2. User copies to .env and adds real keys
   ↓
3. McFlow analyzes requirements (never reads values)
   ↓
4. User adds credentials in n8n UI
   ↓
5. n8n encrypts and stores securely
   ↓
6. Workflows use credentials via n8n's secure system
```

## FAQ

**Q: Why doesn't McFlow automatically add credentials to n8n?**
A: For security. Credentials should only be entered through n8n's secure UI where they're properly encrypted.

**Q: Can McFlow read my .env file?**
A: McFlow can check which variables exist, but it NEVER reads or logs the actual values.

**Q: Is it safe to use McFlow with sensitive credentials?**
A: Yes. McFlow never accesses credential values, only checks for their existence and provides setup guidance.

**Q: What if I accidentally commit my .env file?**
A: Immediately rotate all affected credentials and remove the file from git history.

## Emergency Procedures

If credentials are exposed:
1. Rotate ALL affected keys immediately
2. Check API logs for unauthorized usage
3. Remove from git history if committed
4. Notify your team
5. Update .gitignore to prevent future issues