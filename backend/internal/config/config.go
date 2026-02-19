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
	AdminEmails    []string
	AllowedOrigins []string
	
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
		Port:           getEnv("PORT", "8080"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		AdminEmails:    getSliceEnv("ADMIN_EMAILS", ","),
		AllowedOrigins: getSliceEnv("ALLOWED_ORIGINS", ","),
		
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
