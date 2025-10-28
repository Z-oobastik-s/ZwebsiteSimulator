#!/bin/bash

echo "========================================"
echo "  TypeMaster - Local Server"
echo "========================================"
echo ""
echo "Starting local server..."
echo "Open in browser: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo ""

# Try Python 3 first
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
# Try Python 2
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
# Try Node.js
elif command -v npx &> /dev/null; then
    npx serve
# Try PHP
elif command -v php &> /dev/null; then
    php -S localhost:8000
else
    echo "ERROR: No suitable server found!"
    echo ""
    echo "Please install one of the following:"
    echo "- Python (python3 -m http.server 8000)"
    echo "- Node.js (npx serve)"
    echo "- PHP (php -S localhost:8000)"
    echo ""
    echo "Or open index.html directly in your browser"
fi

