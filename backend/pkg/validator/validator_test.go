package validator

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateBooking_ValidInput(t *testing.T) {
	// Use a date in the future
	futureDate := time.Now().AddDate(0, 0, 7).Format("2006-01-02")

	input := BookingInput{
		Date:  futureDate,
		Time:  "11:00 AM",
		Name:  "John Doe",
		Email: "john@example.com",
	}

	errors := ValidateBooking(input)
	assert.Empty(t, errors, "Valid input should not produce errors")
}

func TestValidateBooking_RequiredFields(t *testing.T) {
	input := BookingInput{} // All empty

	errors := ValidateBooking(input)

	require.Len(t, errors, 4, "Should have 4 errors for empty fields")

	fields := make(map[string]bool)
	for _, err := range errors {
		fields[err.Field] = true
	}

	assert.True(t, fields["date"], "Should have date error")
	assert.True(t, fields["time"], "Should have time error")
	assert.True(t, fields["name"], "Should have name error")
	assert.True(t, fields["email"], "Should have email error")
}

func TestValidateBooking_DateValidation(t *testing.T) {
	tests := []struct {
		name        string
		date        string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "invalid format",
			date:        "01-01-2026",
			expectError: true,
			errorMsg:    "Invalid date format",
		},
		{
			name:        "past date",
			date:        "2020-01-01",
			expectError: true,
			errorMsg:    "Cannot book dates in the past",
		},
		{
			name:        "too far in future",
			date:        time.Now().AddDate(1, 0, 0).Format("2006-01-02"),
			expectError: true,
			errorMsg:    "Cannot book more than 3 months",
		},
		{
			name:        "valid future date",
			date:        time.Now().AddDate(0, 0, 7).Format("2006-01-02"),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := BookingInput{
				Date:  tt.date,
				Time:  "11:00 AM",
				Name:  "Test User",
				Email: "test@example.com",
			}

			errors := ValidateBooking(input)

			if tt.expectError {
				var dateError *ValidationError
				for i := range errors {
					if errors[i].Field == "date" {
						dateError = &errors[i]
						break
					}
				}
				require.NotNil(t, dateError, "Expected date validation error")
				assert.Contains(t, dateError.Message, tt.errorMsg)
			} else {
				for _, err := range errors {
					assert.NotEqual(t, "date", err.Field, "Should not have date error")
				}
			}
		})
	}
}

func TestValidateBooking_TimeValidation(t *testing.T) {
	futureDate := time.Now().AddDate(0, 0, 7).Format("2006-01-02")

	tests := []struct {
		name        string
		time        string
		expectError bool
	}{
		{"valid 12-hour AM", "11:00 AM", false},
		{"valid 12-hour PM", "8:45 PM", false},
		{"valid lowercase", "12:30 pm", false},
		{"valid no space", "11:00AM", false}, // Space is optional in regex
		{"invalid 24-hour", "23:00", true},
		{"invalid hour", "13:00 PM", true},
		{"invalid minute", "11:60 AM", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := BookingInput{
				Date:  futureDate,
				Time:  tt.time,
				Name:  "Test User",
				Email: "test@example.com",
			}

			errors := ValidateBooking(input)

			hasTimeError := false
			for _, err := range errors {
				if err.Field == "time" {
					hasTimeError = true
					break
				}
			}

			assert.Equal(t, tt.expectError, hasTimeError, "Time: %s", tt.time)
		})
	}
}

func TestValidateBooking_NameValidation(t *testing.T) {
	futureDate := time.Now().AddDate(0, 0, 7).Format("2006-01-02")

	tests := []struct {
		name        string
		inputName   string
		expectError bool
		errorMsg    string
	}{
		{"valid name", "John Doe", false, ""},
		{"too short", "A", true, "at least 2 characters"},
		{"too long", strings.Repeat("A", 101), true, "less than 100"},
		{"XSS attempt", "<script>alert('x')</script>", true, "invalid characters"},
		{"SQL injection", "'; DROP TABLE users; --", true, "invalid characters"},
		{"valid unicode", "José García", false, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := BookingInput{
				Date:  futureDate,
				Time:  "11:00 AM",
				Name:  tt.inputName,
				Email: "test@example.com",
			}

			errors := ValidateBooking(input)

			var nameError *ValidationError
			for i := range errors {
				if errors[i].Field == "name" {
					nameError = &errors[i]
					break
				}
			}

			if tt.expectError {
				require.NotNil(t, nameError, "Expected name validation error for: %s", tt.inputName)
				assert.Contains(t, nameError.Message, tt.errorMsg)
			} else {
				assert.Nil(t, nameError, "Should not have name error for: %s", tt.inputName)
			}
		})
	}
}

func TestValidateBooking_EmailValidation(t *testing.T) {
	futureDate := time.Now().AddDate(0, 0, 7).Format("2006-01-02")

	tests := []struct {
		name        string
		email       string
		expectError bool
	}{
		{"valid email", "test@example.com", false},
		{"valid with subdomain", "test@mail.example.com", false},
		{"valid with plus", "test+tag@example.com", false},
		{"missing @", "testexample.com", true},
		{"missing domain", "test@", true},
		{"missing TLD", "test@example", true},
		{"too long", "test@" + strings.Repeat("a", 250) + ".com", true},
		{"empty", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := BookingInput{
				Date:  futureDate,
				Time:  "11:00 AM",
				Name:  "Test User",
				Email: tt.email,
			}

			errors := ValidateBooking(input)

			hasEmailError := false
			for _, err := range errors {
				if err.Field == "email" {
					hasEmailError = true
					break
				}
			}

			assert.Equal(t, tt.expectError, hasEmailError, "Email: %s", tt.email)
		})
	}
}

func TestContainsSuspiciousChars(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"normal text", false},
		{"<script>alert(1)</script>", true},
		{"javascript:void(0)", true},
		{"onerror=alert(1)", true},
		{"'; DROP TABLE users;--", true},
		{"Hello World", false},
		{"John O'Brien", false}, // Single quote alone is OK
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := containsSuspiciousChars(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSanitizeString(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"  hello  ", "hello"},
		{"hello   world", "hello world"},
		{"  multiple   spaces  here  ", "multiple spaces here"},
		{"no-change", "no-change"},
		{"\t\ttabs\t\t", "tabs"},
		{"\nnewlines\n", "newlines"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := SanitizeString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
