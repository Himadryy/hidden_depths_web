include backend/.env

# Migration Variables
MIGRATE=migrate -path backend/migrations -database "$(DATABASE_URL)"

.PHONY: migrate-up migrate-down migrate-force docker-build docker-up docker-down

migrate-up:
	$(MIGRATE) up

migrate-down:
	$(MIGRATE) down 1

migrate-force:
	$(MIGRATE) force $(version)

run:
	cd backend && go run cmd/api/main.go

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down
