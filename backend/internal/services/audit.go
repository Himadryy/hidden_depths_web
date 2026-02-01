package services

import (
	"context"
	"encoding/json"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"go.uber.org/zap"
)

type AuditService struct{}

func NewAuditService() *AuditService {
	return &AuditService{}
}

func (s *AuditService) Log(ctx context.Context, action string, userID, entityID, entityType, ip, userAgent string, details interface{}) {
	// 1. Prepare JSON details
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		logger.Error("Failed to marshal audit details", zap.Error(err))
		detailsJSON = []byte("{}")
	}

	// 2. Insert into DB (Async to not block main request)
	go func() {
		// Use a new context for the background goroutine
		bgCtx := context.Background()
		
		_, err := database.Pool.Exec(bgCtx,
			`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			parseUUID(userID), action, entityType, parseUUID(entityID), ip, userAgent, detailsJSON,
		)

		if err != nil {
			logger.Error("Failed to write audit log", zap.Error(err))
		}
	}()
}

// Helper to handle empty/invalid UUID strings gracefully
func parseUUID(id string) *string {
	if id == "" {
		return nil
	}
	return &id
}
