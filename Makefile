DOCKER_COMPOSE ?= docker compose
PROD_COMPOSE_FILE ?= docker-compose.prod.yml

.PHONY: help build start stop recreate logs ps start-prod stop-prod logs-prod ps-prod release

help:
	@echo "Investment Tracker (Docker)"
	@echo ""
	@echo "Targets:"
	@echo "  make build     Build local images"
	@echo "  make start     Start local stack (./data volume)"
	@echo "  make stop      Stop local stack"
	@echo "  make recreate  Rebuild local images and recreate containers"
	@echo "  make logs      Follow local container logs"
	@echo "  make ps        Show local container status"
	@echo "  make start-prod  Start production stack (Hub images, INVESTMENT_TRACKER_DATA_DIR required)"
	@echo "  make stop-prod   Stop production stack"
	@echo "  make logs-prod   Follow production container logs"
	@echo "  make ps-prod     Show production container status"
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

start-prod:
	@test -n "$$INVESTMENT_TRACKER_DATA_DIR" || (echo "Set INVESTMENT_TRACKER_DATA_DIR to a persistent path outside the repo." && exit 1)
	$(DOCKER_COMPOSE) -f $(PROD_COMPOSE_FILE) up -d

stop-prod:
	$(DOCKER_COMPOSE) -f $(PROD_COMPOSE_FILE) down

logs-prod:
	$(DOCKER_COMPOSE) -f $(PROD_COMPOSE_FILE) logs -f

ps-prod:
	$(DOCKER_COMPOSE) -f $(PROD_COMPOSE_FILE) ps

release:
	@test -n "$(TAG)" || (echo "Usage: make release TAG=v1.0.0" && exit 1)
	./scripts/investment-tracker-release.sh "$(TAG)"
