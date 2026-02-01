package database

import (
	"context"
	"fmt"

	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func ConnectDB(dbURL string) error {
	if dbURL == "" {
		return fmt.Errorf("database URL is empty")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return fmt.Errorf("unable to parse database URL: %v", err)
	}

	Pool, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %v", err)
	}

	// Test the connection
	if err := Pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping database: %v", err)
	}

	logger.Info("Successfully connected to the database")
	return nil
}

func CloseDB() {
	if Pool != nil {
		Pool.Close()
	}
}
