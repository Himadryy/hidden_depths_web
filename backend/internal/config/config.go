package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	Environment    string
	DatabaseURL    string
	JWTSecret      string
	SupabaseAnonKey string // New field
	AdminEmails    []string
	AllowedOrigins []string
	
	// Redis Cache Config
	RedisURL     string
	CacheEnabled bool
	
	// SMTP Config
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := &Config{
		Port:           getEnv("PORT", "8081"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		SupabaseAnonKey: getEnv("SUPABASE_ANON_KEY", ""),
		AdminEmails:    getSliceEnv("ADMIN_EMAILS", ","),
		AllowedOrigins: getSliceEnv("ALLOWED_ORIGINS", ","),
		
		RedisURL:     getEnv("REDIS_URL", ""),
		CacheEnabled: getBoolEnv("CACHE_ENABLED", true),
		
		SMTPHost: getEnv("SMTP_HOST", ""),
		SMTPPort: getIntEnv("SMTP_PORT", 587),
		SMTPUser: getEnv("SMTP_USER", ""),
		SMTPPass: getEnv("SMTP_PASS", ""),
	}

	if cfg.AllowedOrigins == nil {
		cfg.AllowedOrigins = []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"https://hidden-depths-web.pages.dev",
		}
	}

	return cfg, nil
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getSliceEnv(key, separator string) []string {
	value := getEnv(key, "")
	if value == "" {
		return nil
	}
	return strings.Split(value, separator)
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	valueStr := getEnv(key, "")
	if duration, err := time.ParseDuration(valueStr); err == nil {
		return duration
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.ParseBool(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}
