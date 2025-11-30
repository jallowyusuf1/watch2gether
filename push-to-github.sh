#!/bin/bash

echo "🚀 Pushing to GitHub..."
echo ""
echo "You'll be prompted for credentials:"
echo "  Username: jallowyusuf1"
echo "  Password: [Use a Personal Access Token, not your GitHub password]"
echo ""
echo "To create a token: https://github.com/settings/tokens"
echo "  - Click 'Generate new token (classic)'"
echo "  - Select 'repo' scope"
echo "  - Copy the token and use it as your password"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "View your repository: https://github.com/jallowyusuf1/watch2gether"
else
    echo ""
    echo "❌ Push failed. Make sure you:"
    echo "  1. Have a valid Personal Access Token"
    echo "  2. Use the token as your password (not your GitHub password)"
    echo "  3. Have access to the repository"
fi

