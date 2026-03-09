package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/models"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

// GetAllInsights returns all insights ordered by sort_order
func GetAllInsights(w http.ResponseWriter, r *http.Request) {
	rows, err := database.Pool.Query(r.Context(),
		"SELECT id, title, description, media_url, media_type, sort_order FROM insights ORDER BY sort_order ASC",
	)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch insights")
		return
	}
	defer rows.Close()

	var insights []models.Insight
	for rows.Next() {
		var i models.Insight
		if err := rows.Scan(&i.ID, &i.Title, &i.Description, &i.MediaURL, &i.MediaType, &i.SortOrder); err != nil {
			logger.Error("Failed to scan insight", zap.Error(err))
			continue
		}
		insights = append(insights, i)
	}

	response.JSON(w, http.StatusOK, insights, "Insights fetched successfully")
}

// CreateInsight adds a new insight (Admin Only)
func CreateInsight(w http.ResponseWriter, r *http.Request) {
	var i models.Insight
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	err := database.Pool.QueryRow(r.Context(),
		"INSERT INTO insights (title, description, media_url, media_type, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		i.Title, i.Description, i.MediaURL, i.MediaType, i.SortOrder,
	).Scan(&i.ID)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create insight")
		return
	}

	response.JSON(w, http.StatusCreated, i, "Insight created")
}

// UpdateInsight updates an existing insight (Admin Only)
func UpdateInsight(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var i models.Insight
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	_, err := database.Pool.Exec(r.Context(),
		"UPDATE insights SET title=$1, description=$2, media_url=$3, media_type=$4, sort_order=$5 WHERE id=$6",
		i.Title, i.Description, i.MediaURL, i.MediaType, i.SortOrder, id,
	)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update insight")
		return
	}

	response.JSON(w, http.StatusOK, nil, "Insight updated")
}

// DeleteInsight removes an insight (Admin Only)
func DeleteInsight(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := database.Pool.Exec(r.Context(), "DELETE FROM insights WHERE id=$1", id)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete insight")
		return
	}
	response.JSON(w, http.StatusOK, nil, "Insight deleted")
}
