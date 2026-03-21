package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	Environment     string
	DatabaseURL     string
	JWTSecret       string
	SupabaseAnonKey string
	AdminEmails     []string
	AllowedOrigins  []string

	// Redis Cache Config
	RedisURL     string
	CacheEnabled bool

	// SMTP Config
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
}

// ValidationError contains details about missing or invalid configuration
type ValidationError struct {
	Missing []string
	Invalid map[string]string
}

func (e *ValidationError) Error() string {
	var msgs []string
	if len(e.Missing) > 0 {
		msgs = append(msgs, fmt.Sprintf("missing required config: %s", strings.Join(e.Missing, ", ")))
	}
	for k, v := range e.Invalid {
		msgs = append(msgs, fmt.Sprintf("invalid %s: %s", k, v))
	}
	return strings.Join(msgs, "; ")
}

func (e *ValidationError) HasErrors() bool {
	return len(e.Missing) > 0 || len(e.Invalid) > 0
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := &Config{
		Port:            getEnv("PORT", "8080"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		JWTSecret:       getEnv("JWT_SECRET", ""),
		SupabaseAnonKey: getEnv("SUPABASE_ANON_KEY", ""),
		AdminEmails:     getSliceEnv("ADMIN_EMAILS", ","),
		AllowedOrigins:  getSliceEnv("ALLOWED_ORIGINS", ","),

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

	// Validate required configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks that all required configuration is present and valid.
// Fails fast at startup to avoid cryptic runtime errors.
func (c *Config) Validate() error {
	valErr := &ValidationError{
		Invalid: make(map[string]string),
	}

	// Required fields
	if c.DatabaseURL == "" {
		valErr.Missing = append(valErr.Missing, "DATABASE_URL")
	}
	if c.JWTSecret == "" {
		valErr.Missing = append(valErr.Missing, "JWT_SECRET")
	}
	if c.SupabaseAnonKey == "" {
		valErr.Missing = append(valErr.Missing, "SUPABASE_ANON_KEY")
	}

	// Validate JWT secret length (minimum 32 chars for security)
	if c.JWTSecret != "" && len(c.JWTSecret) < 32 {
		valErr.Invalid["JWT_SECRET"] = "must be at least 32 characters"
	}

	// Validate environment
	validEnvs := map[string]bool{"development": true, "staging": true, "production": true}
	if !validEnvs[c.Environment] {
		valErr.Invalid["ENVIRONMENT"] = fmt.Sprintf("must be one of: development, staging, production (got: %s)", c.Environment)
	}

	// Validate port
	if port, err := strconv.Atoi(c.Port); err != nil || port < 1 || port > 65535 {
		valErr.Invalid["PORT"] = "must be a valid port number (1-65535)"
	}

	// Production-specific validation
	if c.Environment == "production" {
		if len(c.AdminEmails) == 0 {
			valErr.Missing = append(valErr.Missing, "ADMIN_EMAILS (required in production)")
		}
		// SMTP is required for production email reminders
		if c.SMTPHost == "" || c.SMTPUser == "" || c.SMTPPass == "" {
			valErr.Missing = append(valErr.Missing, "SMTP_HOST, SMTP_USER, SMTP_PASS (required in production)")
		}
	}

	if valErr.HasErrors() {
		return valErr
	}
	return nil
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
