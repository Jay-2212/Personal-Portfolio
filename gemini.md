# Gemini Agent Guidelines

## Pushing to GitHub

When attempting to push changes to GitHub on behalf of the user, be aware of a known authentication quirk in the Antigravity AI environment.

**The Issue:**
The AI terminal environment automatically injects a dummy environment variable `GITHUB_TOKEN=github_pat_antigravitydummytoken`. This dummy token overrides the user's valid GitHub CLI (`gh`) keychain authentication, causing any `git push` commands to fail with an "Authentication failed" error.

**The Solution:**
To successfully push changes, commit directly, or run the `make push` command, you MUST unset the dummy token in the same command execution. 

Whenever the user asks you to push, or you want to proactively push a commit, use the following syntax:

```bash
# Using the Makefile
unset GITHUB_TOKEN && make push msg="Your commit message"

# Or using raw git commands
unset GITHUB_TOKEN && git push -u origin <branch-name>
```

Always aim to commit and push changes directly for the user using this workaround so they don't have to deal with manual terminal commands.
