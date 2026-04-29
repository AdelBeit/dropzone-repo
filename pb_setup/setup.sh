#!/usr/bin/env bash
# Nothing to run manually — setup is fully automatic on `docker compose up`:
#
#   Admin account  → created by the PocketBase image using PB_ADMIN_EMAIL +
#                    PB_ADMIN_PASSWORD from .env (uses `superuser upsert` internally,
#                    safe to restart)
#
#   files collection → created by pb_migrations/1000000001_create_files.js
#                      which PocketBase runs automatically on first start
#
# Admin UI: http://localhost:8090/_/
echo "No manual setup required. Just run: docker compose up -d"
