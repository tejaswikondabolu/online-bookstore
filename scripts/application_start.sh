#!/bin/bash
set -e

echo "Running ApplicationStart script..."

cd /var/www/bookstore/backend

# Stop existing process if running
if pgrep -f "node server.js" > /dev/null; then
    echo "Stopping existing Node.js process..."
    pkill -f "node server.js"
    sleep 2
fi

# Start the application in background
nohup node server.js > /var/log/bookstore/app.log 2>&1 &
echo $! > /var/run/bookstore.pid

echo "Application started with PID: $(cat /var/run/bookstore.pid)"
echo "ApplicationStart completed successfully"
