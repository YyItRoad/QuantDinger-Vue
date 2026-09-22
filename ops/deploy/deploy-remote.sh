#!/usr/bin/env bash
#
# QuantDinger frontend remote-deploy script.
#
# Invoked by `.github/workflows/deploy.yml` after it pushes a freshly built
# `quantdinger-frontend:$IMAGE_TAG` to the fork owner's GHCR namespace. Pulls
# the new image and restarts the frontend container on this host.
#
# This script runs against the SAME `docker-compose.ghcr.yml` and
# `/opt/quantdinger` directory used by the backend deploy. Backend
# containers are NOT touched — only `frontend` is up-d'd.
#
# You can also run this script by hand from the server:
#   IMAGE_TAG=manual-abc1234 ./ops/deploy/deploy-frontend.sh
#
# Required environment (set by the workflow, defaults are friendly to manual use):
#   IMAGE_TAG    - GHCR tag to deploy (e.g. v5.0.1 or manual-<short-sha>).
#   GHCR_IMAGE   - Full image ref, including registry and tag.
#   DEPLOY_DIR   - Working directory on this host. Default /opt/quantdinger.
#   COMPOSE_FILE - Compose filename (sibling of this script's source). Default
#                  docker-compose.ghcr.yml.
#   PRUNE        - "true" to run `docker image prune -f` after success.
#                  Anything else is treated as false.
#   REPO_OWNER   - GitHub owner whose raw GitHub the compose file is fetched
#                  from on first run. Default OpenByteInc (upstream). For your
#                  fork, set this to your fork's owner.

set -euo pipefail

: "${IMAGE_TAG:=manual-latest}"
: "${GHCR_IMAGE:=ghcr.io/openbyteinc/quantdinger-frontend:${IMAGE_TAG}}"
: "${DEPLOY_DIR:=/opt/quantdinger}"
: "${COMPOSE_FILE:=docker-compose.ghcr.yml}"
: "${PRUNE:=false}"
: "${REPO_OWNER:=OpenByteInc}"
# GHCR requires lowercase repo names. We lowercase in bash instead of using
# the GitHub Actions `| lower` filter — that filter triggered a schema
# fallback that hid the workflow name and the Run workflow button.
REPO_OWNER="${REPO_OWNER,,}"
: "${REF:=main}"
: "${FRONTEND_IMAGE:=ghcr.io/${REPO_OWNER}/quantdinger-frontend}"

log() { printf '[deploy-frontend] %s\n' "$*"; }
die() { printf '[deploy-frontend] ERROR: %s\n' "$*" >&2; exit 1; }

###############################################################################
# 1. Preflight                                                               ##
###############################################################################
command -v docker > /dev/null 2>&1 || die "docker is not installed (run ops/deploy/server-prep.md first)."
docker info > /dev/null 2>&1     || die "docker daemon is not reachable (is the service running?).

Try: sudo systemctl status docker
     sudo systemctl start docker"

mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

log "Deploy target: $DEPLOY_DIR"
log "Image       : $GHCR_IMAGE"
log "Compose file: $COMPOSE_FILE"

###############################################################################
# 2. Ensure docker-compose.ghcr.yml is present                              ##
###############################################################################
if [ ! -f "$DEPLOY_DIR/$COMPOSE_FILE" ]; then
  log "Fetching $COMPOSE_FILE from $REPO_OWNER/QuantDinger@$REF..."
  curl -fsSL \
    "https://raw.githubusercontent.com/${REPO_OWNER}/QuantDinger/${REF}/${COMPOSE_FILE}" \
    -o "$DEPLOY_DIR/$COMPOSE_FILE" \
    || die "Failed to fetch $COMPOSE_FILE. Check REPO_OWNER ('$REPO_OWNER') and network access."
  log "Saved to $DEPLOY_DIR/$COMPOSE_FILE"
fi

###############################################################################
# 3. Update project-root .env orchestration knobs (IMAGE_TAG, FRONTEND_TAG) ##
#    Pattern borrowed from install.sh:env_set (in-place replace or append). ##
#    Never touches any secrets or the backend .env.                          ##
###############################################################################
env_set() {
  local file="$1" key="$2" value="$3"
  touch "$file"
  local tmp="${file}.tmp.$$"
  : > "$tmp"
  local replaced="false"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "${key}="*)
        if [ "$replaced" != "true" ]; then
          printf '%s=%s\n' "$key" "$value" >> "$tmp"
          replaced="true"
        fi
        ;;
      *)
        printf '%s\n' "$line" >> "$tmp"
        ;;
    esac
  done < "$file"
  if [ "$replaced" != "true" ]; then
    printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

ENV_FILE="$DEPLOY_DIR/.env"
env_set "$ENV_FILE" "IMAGE_TAG"    "$IMAGE_TAG"
env_set "$ENV_FILE" "FRONTEND_TAG" "$IMAGE_TAG"
# FRONTEND_IMAGE points the compose service at our fork's GHCR namespace.
# Only pin it if not already set in .env — leaving it allows the user to
# override without this deploy overwriting their choice.
if ! grep -qE '^FRONTEND_IMAGE=' "$ENV_FILE"; then
  env_set "$ENV_FILE" "FRONTEND_IMAGE" "$FRONTEND_IMAGE"
fi
log "Pinned IMAGE_TAG=$IMAGE_TAG and FRONTEND_TAG=$IMAGE_TAG in $ENV_FILE."

###############################################################################
# 4. Static compose validation                                              ##
###############################################################################
log "Validating compose file (catches .env typos before pulling images)..."
docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" config -q

###############################################################################
# 5. Pull new frontend image (single)                                      ##
###############################################################################
# 'docker compose pull' would invoke a pull per service. Even though we only
# target `frontend` here, that still triggers a metadata round-trip per
# restart. 'docker pull' on the image directly is faster.
log "Pulling frontend image (one service share of $FRONTEND_IMAGE)..."
docker pull "${FRONTEND_IMAGE}:${IMAGE_TAG}"

###############################################################################
# 6. Restart the frontend service only                                      ##
#    `depends_on` for frontend is `backend` (no healthcheck condition), so   ##
#    compose only waits for backend to exist (not healthy). We don't bring  ##
#    backend up here — that's the backend deploy workflow's job.            ##
###############################################################################
log "Restarting frontend service..."
docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" up -d frontend

###############################################################################
# 7. Wait for frontend to come up (port 8888)                               ##
###############################################################################
log "Waiting up to 60s for frontend on 127.0.0.1:8888..."
healthy="false"
for i in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:8888/ > /dev/null 2>&1; then
    log "Healthy after ${i} attempt(s)."
    healthy="true"
    break
  fi
  sleep 2
done
if [ "$healthy" != "true" ]; then
  log "WARN: frontend did not become healthy within 60s. Inspect: docker compose -f $DEPLOY_DIR/$COMPOSE_FILE logs frontend"
fi

###############################################################################
# 8. Pretty-print container status for the run log                          ##
###############################################################################
log "Service status:"
docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" ps frontend || true

###############################################################################
# 9. Optional cleanup                                                        ##
###############################################################################
if [ "$PRUNE" = "true" ]; then
  log "Pruning dangling images..."
  docker image prune -f
else
  log "Skipping image prune (set PRUNE=true to enable)."
fi

log "Done. IMAGE_TAG=$IMAGE_TAG is live for frontend."