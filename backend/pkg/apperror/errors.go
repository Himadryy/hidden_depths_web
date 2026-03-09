package apperror

import (
	"fmt"
	"net/http"
)

// AppError is the base domain error type. All operational errors
// should use this instead of raw strings or fmt.Errorf.
type AppError struct {
	Code       string            `json:"code"`
	Message    string            `json:"message"`
	HTTPStatus int               `json:"-"`
	Retryable  bool              `json:"retryable"`
	Context    map[string]string `json:"context,omitempty"`
	Cause      error             `json:"-"`
}

func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.Cause }

func (e *AppError) WithCause(err error) *AppError {
	e.Cause = err
	return e
}

func (e *AppError) WithContext(key, value string) *AppError {
	if e.Context == nil {
		e.Context = make(map[string]string)
	}
	e.Context[key] = value
	return e
}

// IsRetryable checks if any error in the chain is retryable.
func IsRetryable(err error) bool {
	if appErr, ok := AsAppError(err); ok {
		return appErr.Retryable
	}
	return false
}

// AsAppError extracts an *AppError from the error chain.
func AsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if err == nil {
		return nil, false
	}
	// Manual type assertion (errors.As won't work with pointer receivers in all cases)
	if ae, ok := err.(*AppError); ok {
		return ae, true
	}
	// Check wrapped
	type unwrapper interface{ Unwrap() error }
	if u, ok := err.(unwrapper); ok {
		return AsAppError(u.Unwrap())
	}
	return appErr, false
}

// --- Booking Domain Errors ---

func SlotUnavailable(date, time string) *AppError {
	return &AppError{
		Code:       "SLOT_UNAVAILABLE",
		Message:    "This slot is no longer available",
		HTTPStatus: http.StatusConflict,
		Retryable:  false,
		Context:    map[string]string{"date": date, "time": time},
	}
}

func SlotHeldByOther(date, time string) *AppError {
	return &AppError{
		Code:       "SLOT_HELD",
		Message:    "Another user is completing payment for this slot. Try again shortly.",
		HTTPStatus: http.StatusConflict,
		Retryable:  true,
		Context:    map[string]string{"date": date, "time": time},
	}
}

func BookingNotFound(bookingID string) *AppError {
	return &AppError{
		Code:       "BOOKING_NOT_FOUND",
		Message:    "Booking does not exist",
		HTTPStatus: http.StatusNotFound,
		Retryable:  false,
		Context:    map[string]string{"booking_id": bookingID},
	}
}

func BookingUnauthorized() *AppError {
	return &AppError{
		Code:       "BOOKING_UNAUTHORIZED",
		Message:    "You are not authorized to modify this booking",
		HTTPStatus: http.StatusForbidden,
		Retryable:  false,
	}
}

// --- Payment Domain Errors ---

func PaymentDeclined(reason string) *AppError {
	return &AppError{
		Code:       "PAYMENT_DECLINED",
		Message:    fmt.Sprintf("Payment declined: %s", reason),
		HTTPStatus: http.StatusPaymentRequired,
		Retryable:  false,
		Context:    map[string]string{"reason": reason},
	}
}

func PaymentSignatureInvalid() *AppError {
	return &AppError{
		Code:       "PAYMENT_SIGNATURE_INVALID",
		Message:    "Invalid payment signature",
		HTTPStatus: http.StatusUnauthorized,
		Retryable:  false,
	}
}

func PaymentTimeout() *AppError {
	return &AppError{
		Code:       "PAYMENT_TIMEOUT",
		Message:    "Payment gateway timed out. Please try again.",
		HTTPStatus: http.StatusGatewayTimeout,
		Retryable:  true,
	}
}

func PaymentGatewayError(cause error) *AppError {
	return &AppError{
		Code:       "PAYMENT_GATEWAY_ERROR",
		Message:    "Payment service temporarily unavailable",
		HTTPStatus: http.StatusBadGateway,
		Retryable:  true,
		Cause:      cause,
	}
}

// --- Validation Errors ---

func ValidationError(field, reason string) *AppError {
	return &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    reason,
		HTTPStatus: http.StatusBadRequest,
		Retryable:  false,
		Context:    map[string]string{"field": field},
	}
}

func InvalidPayload(cause error) *AppError {
	return &AppError{
		Code:       "INVALID_PAYLOAD",
		Message:    "Invalid request payload",
		HTTPStatus: http.StatusBadRequest,
		Retryable:  false,
		Cause:      cause,
	}
}

// --- Auth Errors ---

func AuthRequired() *AppError {
	return &AppError{
		Code:       "AUTH_REQUIRED",
		Message:    "Authorization header required",
		HTTPStatus: http.StatusUnauthorized,
		Retryable:  false,
	}
}

func AuthInvalidFormat() *AppError {
	return &AppError{
		Code:       "AUTH_INVALID_FORMAT",
		Message:    "Invalid authorization header format",
		HTTPStatus: http.StatusUnauthorized,
		Retryable:  false,
	}
}

func AuthTokenInvalid(cause error) *AppError {
	return &AppError{
		Code:       "AUTH_TOKEN_INVALID",
		Message:    "Invalid or expired token",
		HTTPStatus: http.StatusUnauthorized,
		Retryable:  false,
		Cause:      cause,
	}
}

func AdminAccessDenied() *AppError {
	return &AppError{
		Code:       "ADMIN_ACCESS_DENIED",
		Message:    "Admin access only",
		HTTPStatus: http.StatusForbidden,
		Retryable:  false,
	}
}

// --- Infrastructure Errors ---

func DatabaseError(operation string, cause error) *AppError {
	return &AppError{
		Code:       "DB_ERROR",
		Message:    fmt.Sprintf("Database operation failed: %s", operation),
		HTTPStatus: http.StatusInternalServerError,
		Retryable:  true,
		Context:    map[string]string{"operation": operation},
		Cause:      cause,
	}
}

func ExternalServiceError(service string, cause error) *AppError {
	return &AppError{
		Code:       "EXTERNAL_SERVICE_ERROR",
		Message:    fmt.Sprintf("%s is temporarily unavailable", service),
		HTTPStatus: http.StatusBadGateway,
		Retryable:  true,
		Context:    map[string]string{"service": service},
		Cause:      cause,
	}
}

func RateLimitExceeded() *AppError {
	return &AppError{
		Code:       "RATE_LIMIT_EXCEEDED",
		Message:    "Too many requests. Please slow down.",
		HTTPStatus: http.StatusTooManyRequests,
		Retryable:  true,
	}
}

func InternalError(cause error) *AppError {
	return &AppError{
		Code:       "INTERNAL_ERROR",
		Message:    "An unexpected error occurred",
		HTTPStatus: http.StatusInternalServerError,
		Retryable:  false,
		Cause:      cause,
	}
}
