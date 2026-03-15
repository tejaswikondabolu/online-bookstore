#!/bin/bash
set -e

echo "Running BeforeInstall script..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    yum update -y
    yum install -y docker
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -sL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
fi

# Create application directory
mkdir -p /var/www/bookstore

echo "BeforeInstall completed successfully"
