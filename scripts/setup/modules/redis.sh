#!/usr/bin/env bash

set -euo pipefail

module_redis_install() {
  # require docker only when running installer locally — remote installs use exec_cmd to run docker on the target
  if [[ "${DEPLOY_TARGET:-local}" == "local" ]]; then
    require_cmd docker
  fi

  if container_exists "redis"; then
    local recreate
    recreate="$(prompt_yes_no "Redis already exists. Recreate it?" "n")"
    if [[ "$recreate" == "y" ]]; then
      exec_cmd "docker rm -f redis"
    else
      print_info "Skipping Redis installation"
      return
    fi
  fi

  local volume_name password expose_host port redis_expose
  volume_name="$(prompt_default "Enter Docker volume name for Redis" "redis_data")"

  read -r -p "Enter Redis password (or press enter to generate): " password
  if [[ -z "$password" ]]; then
    password="$(openssl rand -base64 32 | tr -d '\n')"
    print_info "Generated password: $password"
  fi

  print_info "Creating docker network for services..."
  if ! exec_cmd "docker network ls --format '{{.Name}}' | grep -q '^${PROJECT_NAME}\$'"; then
    exec_cmd "docker network create ${PROJECT_NAME} >/dev/null"
  fi

  print_info "Creating Redis volume..."
  exec_cmd "docker volume create $volume_name >/dev/null 2>&1 || true"

  # Redis is reached by app containers over the docker network by hostname
  # (redis:6379), so it does not need to be published to the host at all.
  # Only bind it to loopback if the operator explicitly needs host-level
  # access (e.g. redis-cli from the server itself, or via an SSH tunnel) —
  # never publish it on 0.0.0.0, which puts an unauthenticated-by-default
  # service directly on the public internet.
  expose_host="$(prompt_yes_no "Expose Redis on the host (127.0.0.1 only, for local/tunnel access)?" "n")"
  redis_expose=""
  if [[ "$expose_host" == "y" ]]; then
    port="$(prompt_default "Enter Redis host port" "6379")"
    redis_expose="-p 127.0.0.1:'$port':6379"
  fi

  print_info "Starting Redis container..."
  exec_cmd "docker run -d \
    --name=redis \
    --restart=always \
    --network=${PROJECT_NAME} \
    $redis_expose \
    -v '$volume_name':/data \
    redis:7.4.1 \
    redis-server --appendonly yes --requirepass '$password' >/dev/null"

  # Wait for Redis to be ready
  print_info "Waiting for Redis to be ready..."
  local max_attempts=30
  local attempt=0
  while [[ $attempt -lt $max_attempts ]]; do
    if exec_cmd "docker exec redis redis-cli -a '$password' --no-auth-warning ping" >/dev/null 2>&1; then
      print_success "Redis installed and running"
      if [[ "$expose_host" == "y" ]]; then
        print_info "Host access: 127.0.0.1:$port (not reachable from outside this server)"
      fi
      print_info "Password: $password"
      print_warning "Save this password securely — set it as REDIS_PASSWORD in each app's .env"
      return
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  print_error "Redis failed to start after $max_attempts attempts"
  exit 1
}
