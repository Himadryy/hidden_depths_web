package database

import (
	"context"
	"fmt"
	"time"

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

	// CONSERVATIVE POOL SETTINGS FOR SUPABASE FREE TIER
	// Prevents "Circuit Breaker Open" and "Too many connections" errors
	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 15 * time.Minute
	config.HealthCheckPeriod = 30 * time.Second // Detect stale connections early

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	Pool, err = pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %v", err)
	}

	// Test the connection with a timeout
	pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer pingCancel()
	if err := Pool.Ping(pingCtx); err != nil {
		Pool.Close()
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
