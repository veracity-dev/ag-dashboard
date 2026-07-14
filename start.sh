#!/bin/sh

PORT=${PORT:-3000}

echo "Starting static server on port $PORT..."

npx serve -s . -l $PORT