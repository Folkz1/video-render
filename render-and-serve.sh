#!/bin/bash
set -e

VIDEO_ID="${VIDEO_ID:-Video1-NVIDIA}"
CONCURRENCY="${CONCURRENCY:-4}"
OUTPUT_NAME="${OUTPUT_NAME:-rendered-video.mp4}"

echo "=== RENDER FARM NODE ==="
echo "Video: $VIDEO_ID"
echo "Concurrency: $CONCURRENCY"
echo "Output: $OUTPUT_NAME"
echo ""

mkdir -p /app/output

# Check if already rendered
if [ -f "/app/output/$OUTPUT_NAME" ]; then
  echo "Video already rendered, serving..."
  nginx -g 'daemon off;'
  exit 0
fi

# Create a status file
echo "RENDERING" > /app/output/status.txt
echo "$VIDEO_ID" >> /app/output/status.txt
date >> /app/output/status.txt

# Run Remotion render
echo "Starting render..."
npx remotion render src/index.ts "$VIDEO_ID" "output/$OUTPUT_NAME" \
  --concurrency="$CONCURRENCY" \
  --log=verbose \
  2>&1 | tee /app/output/render.log

# Update status
echo "COMPLETE" > /app/output/status.txt
date >> /app/output/status.txt
ls -la "/app/output/$OUTPUT_NAME" >> /app/output/status.txt

echo ""
echo "=== RENDER COMPLETE ==="
echo "Serving at http://0.0.0.0:80/$OUTPUT_NAME"

# Start nginx to serve the output
nginx -g 'daemon off;'
