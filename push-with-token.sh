#!/bin/bash

echo "🚀 GitHub Push Helper"
echo ""
echo "You need a Personal Access Token (NOT your GitHub password)"
echo ""
echo "📝 Step 1: Get your token"
echo "   1. Go to: https://github.com/settings/tokens"
echo "   2. Click 'Generate new token (classic)'"
echo "   3. Name: watch2gether-push"
echo "   4. Check: repo (full control)"
echo "   5. Generate and COPY the token"
echo ""
read -p "Press Enter when you have your token ready..."

echo ""
echo "📋 Step 2: Enter your credentials"
echo ""
read -p "GitHub Username [jallowyusuf1]: " username
username=${username:-jallowyusuf1}

read -sp "Personal Access Token (paste it here): " token
echo ""

if [ -z "$token" ]; then
    echo "❌ Token is required!"
    exit 1
fi

echo ""
echo "🔄 Setting up remote with token..."
git remote set-url origin https://${username}:${token}@github.com/${username}/watch2gether.git

echo ""
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Your code is now on GitHub!"
    echo "   View it at: https://github.com/jallowyusuf1/watch2gether"
else
    echo ""
    echo "❌ Push failed. Check your token and try again."
fi

