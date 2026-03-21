package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfig_Validate_RequiredFields(t *testing.T) {
	cfg := &Config{
		Port:        "8080",
		Environment: "development",
		// Missing: DatabaseURL, JWTSecret, SupabaseAnonKey
	}

	err := cfg.Validate()

	require.Error(t, err)
	valErr, ok := err.(*ValidationError)
	require.True(t, ok, "Error should be ValidationError")

	assert.Contains(t, valErr.Missing, "DATABASE_URL")
	assert.Contains(t, valErr.Missing, "JWT_SECRET")
	assert.Contains(t, valErr.Missing, "SUPABASE_ANON_KEY")
}

func TestConfig_Validate_ValidConfig(t *testing.T) {
	cfg := &Config{
		Port:        "8080",
		Environment:     "development",
		DatabaseURL:     "postgres://localhost:5432/test",
		JWTSecret:       "this-is-a-very-long-secret-key-for-testing-purposes",
		SupabaseAnonKey: "test-anon-key",
	}

	err := cfg.Validate()
	assert.NoError(t, err)
}

func TestConfig_Validate_JWTSecretLength(t *testing.T) {
	cfg := &Config{
		Port:        "8080",
		Environment:     "development",
		DatabaseURL:     "postgres://localhost:5432/test",
		JWTSecret:       "short", // Too short
		SupabaseAnonKey: "test-anon-key",
	}

	err := cfg.Validate()

	require.Error(t, err)
	valErr, ok := err.(*ValidationError)
	require.True(t, ok)
	assert.Contains(t, valErr.Invalid["JWT_SECRET"], "at least 32 characters")
}

func TestConfig_Validate_InvalidEnvironment(t *testing.T) {
	cfg := &Config{
		Port:        "8080",
		Environment:     "invalid-env",
		DatabaseURL:     "postgres://localhost:5432/test",
		JWTSecret:       "this-is-a-very-long-secret-key-for-testing-purposes",
		SupabaseAnonKey: "test-anon-key",
	}

	err := cfg.Validate()

	require.Error(t, err)
	valErr, ok := err.(*ValidationError)
	require.True(t, ok)
	assert.Contains(t, valErr.Invalid["ENVIRONMENT"], "development, staging, production")
}

func TestConfig_Validate_InvalidPort(t *testing.T) {
	tests := []struct {
		name string
		port string
	}{
		{"not a number", "abc"},
		{"zero", "0"},
		{"negative", "-1"},
		{"too high", "99999"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{
				Port:            tt.port,
				Environment:     "development",
				DatabaseURL:     "postgres://localhost:5432/test",
				JWTSecret:       "this-is-a-very-long-secret-key-for-testing-purposes",
				SupabaseAnonKey: "test-anon-key",
			}

			err := cfg.Validate()

			require.Error(t, err)
			valErr, ok := err.(*ValidationError)
			require.True(t, ok)
			assert.Contains(t, valErr.Invalid["PORT"], "valid port number")
		})
	}
}

func TestConfig_Validate_ProductionRequirements(t *testing.T) {
	cfg := &Config{
		Port:        "8080",
		Environment:     "production",
		DatabaseURL:     "postgres://localhost:5432/test",
		JWTSecret:       "this-is-a-very-long-secret-key-for-testing-purposes",
		SupabaseAnonKey: "test-anon-key",
		// Missing: AdminEmails, SMTP config
	}

	err := cfg.Validate()

	require.Error(t, err)
	valErr, ok := err.(*ValidationError)
	require.True(t, ok)

	// Check that production-specific requirements are flagged
	hasSMTPError := false
	hasAdminError := false
	for _, missing := range valErr.Missing {
		if contains(missing, "SMTP") {
			hasSMTPError = true
		}
		if contains(missing, "ADMIN_EMAILS") {
			hasAdminError = true
		}
	}

	assert.True(t, hasSMTPError, "Should require SMTP in production")
	assert.True(t, hasAdminError, "Should require ADMIN_EMAILS in production")
}

func TestConfig_Validate_ProductionWithAllRequired(t *testing.T) {
	cfg := &Config{
		Port:        "8080",
		Environment:     "production",
		DatabaseURL:     "postgres://localhost:5432/test",
		JWTSecret:       "this-is-a-very-long-secret-key-for-testing-purposes",
		SupabaseAnonKey: "test-anon-key",
		AdminEmails:     []string{"admin@example.com"},
		SMTPHost:        "smtp.example.com",
		SMTPUser:        "user",
		SMTPPass:        "pass",
	}

	err := cfg.Validate()
	assert.NoError(t, err)
}

func TestValidationError_Error(t *testing.T) {
	valErr := &ValidationError{
		Missing: []string{"DATABASE_URL", "JWT_SECRET"},
		Invalid: map[string]string{
			"PORT": "must be a valid port number",
		},
	}

	errStr := valErr.Error()

	assert.Contains(t, errStr, "DATABASE_URL")
	assert.Contains(t, errStr, "JWT_SECRET")
	assert.Contains(t, errStr, "PORT")
	assert.Contains(t, errStr, "valid port number")
}

func TestValidationError_HasErrors(t *testing.T) {
	t.Run("with missing", func(t *testing.T) {
		valErr := &ValidationError{Missing: []string{"FOO"}}
		assert.True(t, valErr.HasErrors())
	})

	t.Run("with invalid", func(t *testing.T) {
		valErr := &ValidationError{Invalid: map[string]string{"FOO": "bar"}}
		assert.True(t, valErr.HasErrors())
	})

	t.Run("empty", func(t *testing.T) {
		valErr := &ValidationError{Invalid: make(map[string]string)}
		assert.False(t, valErr.HasErrors())
	})
}

func TestLoad_WithEnvVars(t *testing.T) {
	// Set required env vars
	os.Setenv("DATABASE_URL", "postgres://test:5432/db")
	os.Setenv("JWT_SECRET", "this-is-a-very-long-secret-key-for-testing-purposes")
	os.Setenv("SUPABASE_ANON_KEY", "test-key")
	os.Setenv("ENVIRONMENT", "development")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("SUPABASE_ANON_KEY")
		os.Unsetenv("ENVIRONMENT")
	}()

	cfg, err := Load()

	require.NoError(t, err)
	assert.Equal(t, "postgres://test:5432/db", cfg.DatabaseURL)
	assert.Equal(t, "test-key", cfg.SupabaseAnonKey)
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsStr(s, substr))
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
