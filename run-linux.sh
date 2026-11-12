#!/usr/bin/env bash
# ==============================================================================
# Avata-Craft: Avata 360 Video Editor & Motion Tracking Studio
# Turnkey Launch Script for Fedora Linux 45 Workstation (GNOME / Wayland / X11)
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting Avata-Craft on Fedora Linux 45 Workstation..."
echo "=========================================================="

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js not detected. Installing Node.js via dnf..."
    if command -v sudo >/dev/null 2>&1; then
        sudo dnf install -y nodejs npm
    else
        echo "Error: Please install Node.js 20+ on Fedora (sudo dnf install nodejs)."
        exit 1
    fi
fi

NODE_VERSION=$(node -v)
echo "Node.js Version: ${NODE_VERSION}"

# Check for package dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing project dependencies..."
    npm install
fi

# Build verification
echo "Compiling Avata-Craft WebGL & TypeScript modules..."
npm run build

echo "=========================================================="
echo " Launching Avata-Craft Studio on port 3000..."
echo " Open http://localhost:3000 in Firefox or Chrome"
echo "=========================================================="

npm run dev -- --host 0.0.0.0 --port 3000
