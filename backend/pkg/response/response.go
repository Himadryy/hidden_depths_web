package response

import (
	"encoding/json"
	"net/http"

	"go.uber.org/zap"

	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
)

type APIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message,omitempty"`
	Error     string      `json:"error,omitempty"`
	ErrorCode string      `json:"error_code,omitempty"`
	Retryable *bool       `json:"retryable,omitempty"`
	RequestID string      `json:"request_id,omitempty"`
}

// JSON sends a standard JSON response
func JSON(w http.ResponseWriter, status int, data interface{}, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(APIResponse{
		Success:   status >= 200 && status < 300,
		Data:      data,
		Message:   message,
		RequestID: w.Header().Get("X-Request-Id"),
	}); err != nil {
		logger.Log.Error("Failed to encode JSON response", zap.Error(err))
	}
}

// Error sends a standard error response (backward compatible)
func Error(w http.ResponseWriter, status int, errMessage string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(APIResponse{
		Success:   false,
		Error:     errMessage,
		RequestID: w.Header().Get("X-Request-Id"),
	}); err != nil {
		logger.Log.Error("Failed to encode error response", zap.Error(err))
	}
}

// AppError sends a structured error response from a domain error.
// Includes error code, retryable flag, and request ID.
func AppErr(w http.ResponseWriter, err *apperror.AppError) {
	retryable := err.Retryable
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(err.HTTPStatus)
	if encErr := json.NewEncoder(w).Encode(APIResponse{
		Success:   false,
		Error:     err.Message,
		ErrorCode: err.Code,
		Retryable: &retryable,
		RequestID: w.Header().Get("X-Request-Id"),
	}); encErr != nil {
		logger.Log.Error("Failed to encode AppError response", zap.Error(encErr))
	}
}
