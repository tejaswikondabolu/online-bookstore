#!/bin/bash
set -e

echo "Running AfterInstall script..."

cd /var/www/bookstore

# Install backend dependencies
cd backend
npm install --production

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
fi

echo "AfterInstall completed successfully"
