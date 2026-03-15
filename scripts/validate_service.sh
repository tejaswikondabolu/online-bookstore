#!/bin/bash
set -e

echo "Running ValidateService script..."

# Wait for application to start
sleep 5

# Check if application is running
if ! pgrep -f "node server.js" > /dev/null; then
    echo "ERROR: Application is not running"
    exit 1
fi

# Check application health endpoint
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$RESPONSE" = "200" ]; then
    echo "Health check passed - Application is healthy"
else
    echo "Health check failed - HTTP response: $RESPONSE"
    exit 1
fi

echo "ValidateService completed successfully"
