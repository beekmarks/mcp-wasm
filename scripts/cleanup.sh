#!/bin/bash

# Kill any processes using ports in the range we use (3000-3050)
for port in {3000..3050}; do
    pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

# Wait a moment to ensure ports are released
sleep 1

echo "Ports cleaned up"
