# Security Guidelines

## ⚠️ IMPORTANT: Never Commit Sensitive Data

### Files That Should NEVER Be Committed:

- ❌ `backend/.env` - Contains passwords and secrets
- ❌ Any file with MongoDB connection strings
- ❌ Any file with JWT secrets
- ❌ Any file with email passwords
- ❌ Azure publish profiles
- ❌ API keys or tokens

### ✅ What's Safe to Commit:

- ✅ `backend/.env.example` - Template without real values
- ✅ Code files (.js, .html, .css)
- ✅ Documentation without credentials
- ✅ Configuration templates

## How to Keep Secrets Safe

### 1. Use .gitignore

The `.gitignore` file already protects:
```
.env
.env.local
.env.*.local
*.PublishSettings
```

### 2. Use Environment Variables

**For Local Development:**
- Copy `backend/.env.example` to `backend/.env`
- Fill in your real values
- Never commit `backend/.env`

**For Azure Production:**
- Set environment variables in Azure Portal
- Go to: App Service → Configuration → Application settings
- Add each variable there (not in code!)

### 3. Use Azure Key Vault (Advanced)

For production, consider using Azure Key Vault to store:
- Database connection strings
- JWT secrets
- API keys
- Passwords

## What to Do If You Accidentally Committed Secrets

1. **Immediately rotate the credentials:**
   - Change MongoDB password
   - Generate new JWT secret
   - Change email app password

2. **Remove from git history:**
   ```bash
   # This is complex - consider making the repo private instead
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/.env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Make repository private** (if possible)

4. **Update all services** with new credentials

## Current Repository Status

✅ **Protected:**
- `.env` files are in `.gitignore`
- No credentials in committed code
- Template files use placeholders

⚠️ **Action Required:**
- Review git history for any accidentally committed secrets
- Rotate any credentials that were exposed
- Consider making repository private if it contains business logic

## Best Practices

1. **Never hardcode secrets** in source code
2. **Use environment variables** for all sensitive data
3. **Keep .gitignore updated** with sensitive file patterns
4. **Review commits** before pushing to ensure no secrets included
5. **Use separate credentials** for development and production
6. **Rotate secrets regularly** (every 90 days recommended)

---

**Remember:** Once something is committed to git, it's in the history forever (unless you rewrite history). Prevention is better than cure!
