DOCKER_COMPOSE ?= docker compose

.PHONY: help build start stop recreate logs ps release

help:
	@echo "Investment Tracker (Docker)"
	@echo ""
	@echo "Targets:"
	@echo "  make build     Build images"
	@echo "  make start     Start containers in background"
	@echo "  make stop      Stop and remove containers"
	@echo "  make recreate  Rebuild images and recreate containers"
	@echo "  make logs      Follow container logs"
	@echo "  make ps        Show container status"
	@echo "  make release TAG=v1.0.0      Git tag, GitHub release, Docker Hub push"

build:
	$(DOCKER_COMPOSE) build

start:
	$(DOCKER_COMPOSE) up -d

stop:
	$(DOCKER_COMPOSE) down

recreate:
	$(DOCKER_COMPOSE) up -d --build --force-recreate

logs:
	$(DOCKER_COMPOSE) logs -f

ps:
	$(DOCKER_COMPOSE) ps

release:
	@test -n "$(TAG)" || (echo "Usage: make release TAG=v1.0.0" && exit 1)
	./scripts/investment-tracker-release.sh "$(TAG)"
