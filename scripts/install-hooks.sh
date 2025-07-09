#!/bin/bash

# =============================================================================
# Git Hooks Installation Script
# =============================================================================
# This script installs security-focused git hooks to prevent accidental
# commits of sensitive data like Terraform state files.

set -e

echo "🔧 Installing Git Hooks..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository root"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
if [ -f ".githooks/pre-commit" ]; then
    cp .githooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ Installed pre-commit hook (Terraform security check)"
else
    echo "⚠️  Warning: .githooks/pre-commit not found"
fi

echo ""
echo "🎉 Git hooks installation completed!"
echo ""
echo "The pre-commit hook will now:"
echo "  • Block commits of Terraform state files"
echo "  • Block commits of .tfvars files" 
echo "  • Block commits of SSH keys and credentials"
echo "  • Warn about potential secrets in file content"
echo ""
echo "To test the hook, try committing a .tfvars file - it should be blocked!"
echo "" 
