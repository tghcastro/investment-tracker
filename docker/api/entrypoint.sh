#!/bin/sh
set -e

cd /app/packages/api
node dist/migrate.js
exec node dist/index.js
