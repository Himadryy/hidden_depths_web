package cache

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

var (
	client   *redis.Client
	once     sync.Once
	enabled  bool
	logger   *zap.Logger
	initErr  error

	// ErrCacheDisabled is returned when cache operations are attempted but cache is disabled
	ErrCacheDisabled = errors.New("cache is disabled")
	// ErrCacheMiss is returned when a key is not found
	ErrCacheMiss = errors.New("cache miss")
)

// Config holds Redis connection configuration
type Config struct {
	URL     string
	Enabled bool
}

// Init initializes the Redis connection pool
func Init(cfg Config, log *zap.Logger) error {
	once.Do(func() {
		logger = log
		enabled = cfg.Enabled

		if !enabled {
			logger.Info("Cache disabled by configuration")
			return
		}

		if cfg.URL == "" {
			logger.Info("REDIS_URL not set, cache disabled")
			enabled = false
			return
		}

		opts, err := redis.ParseURL(cfg.URL)
		if err != nil {
			logger.Error("Failed to parse REDIS_URL", zap.Error(err))
			initErr = err
			enabled = false
			return
		}

		opts.PoolSize = 10
		opts.MinIdleConns = 2
		opts.DialTimeout = 5 * time.Second
		opts.ReadTimeout = 3 * time.Second
		opts.WriteTimeout = 3 * time.Second

		client = redis.NewClient(opts)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := client.Ping(ctx).Err(); err != nil {
			logger.Error("Failed to connect to Redis", zap.Error(err))
			initErr = err
			enabled = false
			client = nil
			return
		}

		logger.Info("Redis cache connected successfully")
	})

	return initErr
}

// IsEnabled returns whether caching is enabled and operational
func IsEnabled() bool {
	return enabled && client != nil
}

// HealthCheck verifies Redis connectivity
func HealthCheck(ctx context.Context) error {
	if !IsEnabled() {
		return ErrCacheDisabled
	}
	return client.Ping(ctx).Err()
}

// Close gracefully closes the Redis connection
func Close() error {
	if client != nil {
		return client.Close()
	}
	return nil
}

// Get retrieves a value by key and unmarshals it into dest
func Get[T any](ctx context.Context, key string) (T, error) {
	var zero T

	if !IsEnabled() {
		return zero, ErrCacheDisabled
	}

	val, err := client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return zero, ErrCacheMiss
	}
	if err != nil {
		logger.Warn("Cache get failed", zap.String("key", key), zap.Error(err))
		return zero, err
	}

	var result T
	if err := json.Unmarshal([]byte(val), &result); err != nil {
		logger.Warn("Cache unmarshal failed", zap.String("key", key), zap.Error(err))
		return zero, err
	}

	logger.Debug("Cache hit", zap.String("key", key))
	return result, nil
}

// Set stores a value with the given TTL
func Set[T any](ctx context.Context, key string, value T, ttl time.Duration) error {
	if !IsEnabled() {
		return ErrCacheDisabled
	}

	data, err := json.Marshal(value)
	if err != nil {
		logger.Warn("Cache marshal failed", zap.String("key", key), zap.Error(err))
		return err
	}

	if err := client.Set(ctx, key, data, ttl).Err(); err != nil {
		logger.Warn("Cache set failed", zap.String("key", key), zap.Error(err))
		return err
	}

	logger.Debug("Cache set", zap.String("key", key), zap.Duration("ttl", ttl))
	return nil
}

// Delete removes a key from cache
func Delete(ctx context.Context, keys ...string) error {
	if !IsEnabled() {
		return ErrCacheDisabled
	}

	if err := client.Del(ctx, keys...).Err(); err != nil {
		logger.Warn("Cache delete failed", zap.Strings("keys", keys), zap.Error(err))
		return err
	}

	logger.Debug("Cache deleted", zap.Strings("keys", keys))
	return nil
}

// DeletePattern removes all keys matching a pattern (use sparingly)
func DeletePattern(ctx context.Context, pattern string) error {
	if !IsEnabled() {
		return ErrCacheDisabled
	}

	iter := client.Scan(ctx, 0, pattern, 100).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		logger.Warn("Cache scan failed", zap.String("pattern", pattern), zap.Error(err))
		return err
	}

	if len(keys) > 0 {
		if err := client.Del(ctx, keys...).Err(); err != nil {
			logger.Warn("Cache pattern delete failed", zap.String("pattern", pattern), zap.Error(err))
			return err
		}
		logger.Debug("Cache pattern deleted", zap.String("pattern", pattern), zap.Int("count", len(keys)))
	}

	return nil
}

// Incr increments a counter and returns the new value
func Incr(ctx context.Context, key string) (int64, error) {
	if !IsEnabled() {
		return 0, ErrCacheDisabled
	}
	return client.Incr(ctx, key).Result()
}

// Expire sets a TTL on an existing key
func Expire(ctx context.Context, key string, ttl time.Duration) error {
	if !IsEnabled() {
		return ErrCacheDisabled
	}
	return client.Expire(ctx, key, ttl).Err()
}

// TTL returns the remaining time-to-live of a key
func TTL(ctx context.Context, key string) (time.Duration, error) {
	if !IsEnabled() {
		return 0, ErrCacheDisabled
	}
	return client.TTL(ctx, key).Result()
}

// GetClient returns the underlying Redis client for advanced operations
func GetClient() *redis.Client {
	return client
}
