package response

import (
	"encoding/json"
	"log"
	"net/http"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// JSON sends a standard JSON response
func JSON(w http.ResponseWriter, status int, data interface{}, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(APIResponse{
		Success: status >= 200 && status < 300,
		Data:    data,
		Message: message,
	}); err != nil {
		log.Printf("Failed to encode JSON response: %v", err)
	}
}

// Error sends a standard error response
func Error(w http.ResponseWriter, status int, errMessage string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(APIResponse{
		Success: false,
		Error:   errMessage,
	}); err != nil {
		log.Printf("Failed to encode error response: %v", err)
	}
}
