#!/bin/bash

echo "🚀 Copying debug page to server..."

# Copy debug.html to server
echo "📤 Copying debug.html to server..."
scp -P 22 debug.html root@20.205.30.184:/var/www/dien-may-xanh/

# Set proper permissions
echo "🔒 Setting permissions..."
ssh -p 22 root@20.205.30.184 "chmod 644 /var/www/dien-may-xanh/debug.html"

echo "✅ Debug page copied successfully!"
echo "🌐 Access the debug page at: http://20.205.30.184/debug.html"
echo ""
echo "🔧 This page will help you test:"
echo "  • Server connection status"
echo "  • Authentication (login/register)"
echo "  • Product APIs"
echo "  • Cart functionality"
echo "  • Order management"
echo "  • Real-time console logs"
echo ""
echo "💡 Click the test buttons to check each feature and see detailed error messages."