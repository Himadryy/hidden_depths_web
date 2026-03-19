package validator

import (
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// EmailRegex is a simple email validation pattern (RFC 5322 basic)
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// TimeSlotRegex matches formats like "12:00 PM", "9:30 AM"
var timeSlotRegex = regexp.MustCompile(`^(1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM|am|pm)$`)

// DateRegex matches YYYY-MM-DD format
var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// ValidationError represents a field validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// BookingInput represents the input for booking validation
type BookingInput struct {
	Date  string
	Time  string
	Name  string
	Email string
}

// ValidateBooking validates all booking input fields
func ValidateBooking(input BookingInput) []ValidationError {
	var errors []ValidationError

	// Date validation
	if input.Date == "" {
		errors = append(errors, ValidationError{Field: "date", Message: "Date is required"})
	} else if !dateRegex.MatchString(input.Date) {
		errors = append(errors, ValidationError{Field: "date", Message: "Invalid date format. Use YYYY-MM-DD."})
	} else {
		// Check if date is valid and in the future
		t, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			errors = append(errors, ValidationError{Field: "date", Message: "Invalid date"})
		} else {
			today := time.Now().Truncate(24 * time.Hour)
			if t.Before(today) {
				errors = append(errors, ValidationError{Field: "date", Message: "Cannot book dates in the past"})
			}
			// Check if it's more than 90 days in the future
			maxDate := today.AddDate(0, 3, 0) // 3 months
			if t.After(maxDate) {
				errors = append(errors, ValidationError{Field: "date", Message: "Cannot book more than 3 months in advance"})
			}
		}
	}

	// Time validation
	if input.Time == "" {
		errors = append(errors, ValidationError{Field: "time", Message: "Time is required"})
	} else if !timeSlotRegex.MatchString(input.Time) {
		errors = append(errors, ValidationError{Field: "time", Message: "Invalid time format. Use format like '12:00 PM'"})
	}

	// Name validation
	if input.Name == "" {
		errors = append(errors, ValidationError{Field: "name", Message: "Name is required"})
	} else {
		name := strings.TrimSpace(input.Name)
		nameLen := utf8.RuneCountInString(name)
		if nameLen < 2 {
			errors = append(errors, ValidationError{Field: "name", Message: "Name must be at least 2 characters"})
		} else if nameLen > 100 {
			errors = append(errors, ValidationError{Field: "name", Message: "Name must be less than 100 characters"})
		}
		// Check for suspicious patterns (potential injection)
		if containsSuspiciousChars(name) {
			errors = append(errors, ValidationError{Field: "name", Message: "Name contains invalid characters"})
		}
	}

	// Email validation
	if input.Email == "" {
		errors = append(errors, ValidationError{Field: "email", Message: "Email is required"})
	} else {
		email := strings.TrimSpace(strings.ToLower(input.Email))
		if len(email) > 254 {
			errors = append(errors, ValidationError{Field: "email", Message: "Email is too long"})
		} else if !emailRegex.MatchString(email) {
			errors = append(errors, ValidationError{Field: "email", Message: "Invalid email format"})
		}
	}

	return errors
}

// containsSuspiciousChars checks for common injection patterns
func containsSuspiciousChars(s string) bool {
	suspicious := []string{"<script", "javascript:", "onerror=", "onclick=", "--", "/*", "*/", "';", "\";"}
	lower := strings.ToLower(s)
	for _, pattern := range suspicious {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	return false
}

// SanitizeString removes leading/trailing whitespace and normalizes internal spaces
func SanitizeString(s string) string {
	// Trim whitespace
	s = strings.TrimSpace(s)
	// Replace multiple spaces with single space
	space := regexp.MustCompile(`\s+`)
	return space.ReplaceAllString(s, " ")
}
