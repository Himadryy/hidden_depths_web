package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/models"
	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/cache"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// GetAllInsights godoc
// @Summary Get all insight cards
// @Description Returns all insights ordered by sort_order for homepage carousel. Uses cache-aside pattern.
// @Tags Insights
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /insights [get]
func GetAllInsights(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cacheKey := cache.InsightsKey()

	// Try cache first
	if insights, err := cache.Get[[]models.Insight](ctx, cacheKey); err == nil {
		logger.Log.Debug("Cache hit for insights")
		response.JSON(w, http.StatusOK, insights, "Insights fetched successfully")
		return
	}

	// Cache miss — query DB
	rows, err := database.Pool.Query(ctx,
		"SELECT id, title, description, media_url, media_type, sort_order FROM insights ORDER BY sort_order ASC",
	)
	if err != nil {
		logger.Log.Error("Failed to fetch insights", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("fetch insights", err))
		return
	}
	defer rows.Close()

	var insights []models.Insight
	for rows.Next() {
		var i models.Insight
		if err := rows.Scan(&i.ID, &i.Title, &i.Description, &i.MediaURL, &i.MediaType, &i.SortOrder); err != nil {
			logger.Log.Error("Failed to scan insight", zap.Error(err))
			continue
		}
		insights = append(insights, i)
	}

	// Ensure we cache empty array, not nil
	if insights == nil {
		insights = []models.Insight{}
	}
	_ = cache.Set(ctx, cacheKey, insights, cache.InsightsTTL)

	response.JSON(w, http.StatusOK, insights, "Insights fetched successfully")
}

// InvalidateInsightsCache removes cached insights data.
// Call this after any insight modification (create, update, delete).
func InvalidateInsightsCache(ctx context.Context) {
	if err := cache.Delete(ctx, cache.InsightsKey()); err != nil && !errors.Is(err, cache.ErrCacheDisabled) {
		logger.Log.Warn("Failed to invalidate insights cache", zap.Error(err))
	}
}

// CreateInsight godoc
// @Summary Create insight card (Admin)
// @Description Adds a new insight to the carousel. Admin only.
// @Tags Admin
// @Accept json
// @Produce json
// @Param insight body models.Insight true "Insight details"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /admin/insights [post]
// @Security BearerAuth
func CreateInsight(w http.ResponseWriter, r *http.Request) {
	var i models.Insight
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	if i.Title == "" {
		response.AppErr(w, apperror.ValidationError("title", "Title is required"))
		return
	}

	err := database.Pool.QueryRow(r.Context(),
		"INSERT INTO insights (title, description, media_url, media_type, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		i.Title, i.Description, i.MediaURL, i.MediaType, i.SortOrder,
	).Scan(&i.ID)

	if err != nil {
		logger.Log.Error("Failed to create insight", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("create insight", err))
		return
	}

	// Invalidate cache (write-through pattern)
	InvalidateInsightsCache(r.Context())

	response.JSON(w, http.StatusCreated, i, "Insight created")
}

// UpdateInsight godoc
// @Summary Update insight card (Admin)
// @Description Updates an existing insight. Admin only.
// @Tags Admin
// @Accept json
// @Produce json
// @Param id path string true "Insight ID"
// @Param insight body models.Insight true "Updated insight"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /admin/insights/{id} [put]
// @Security BearerAuth
func UpdateInsight(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.AppErr(w, apperror.ValidationError("id", "Insight ID is required"))
		return
	}

	var i models.Insight
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	_, err := database.Pool.Exec(r.Context(),
		"UPDATE insights SET title=$1, description=$2, media_url=$3, media_type=$4, sort_order=$5 WHERE id=$6",
		i.Title, i.Description, i.MediaURL, i.MediaType, i.SortOrder, id,
	)

	if err != nil {
		logger.Log.Error("Failed to update insight", zap.String("id", id), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("update insight", err))
		return
	}

	// Invalidate cache
	InvalidateInsightsCache(r.Context())

	response.JSON(w, http.StatusOK, nil, "Insight updated")
}

// DeleteInsight godoc
// @Summary Delete insight card (Admin)
// @Description Removes an insight from the carousel. Admin only.
// @Tags Admin
// @Produce json
// @Param id path string true "Insight ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /admin/insights/{id} [delete]
// @Security BearerAuth
func DeleteInsight(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.AppErr(w, apperror.ValidationError("id", "Insight ID is required"))
		return
	}

	_, err := database.Pool.Exec(r.Context(), "DELETE FROM insights WHERE id=$1", id)
	if err != nil {
		logger.Log.Error("Failed to delete insight", zap.String("id", id), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("delete insight", err))
		return
	}

	// Invalidate cache
	InvalidateInsightsCache(r.Context())

	response.JSON(w, http.StatusOK, nil, "Insight deleted")
}
