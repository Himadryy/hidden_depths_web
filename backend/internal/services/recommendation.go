package services

import (
	"math"
	"time"
)

// Weights represent the "trained" neural parameters for slot recommendation
type Weights struct {
	MorningBias   float64 // Preference for 11:00 AM - 1:00 PM
	EveningBias   float64 // Preference for 8:00 PM - 9:00 PM
	WeekendBias   float64 // Bonus for Sundays
	DemandPenalty float64 // Penalty if other slots on the same day are already full
}

// DefaultWeights optimized for "Sanctuary" vibe (Evening focus)
var DefaultWeights = Weights{
	MorningBias:   0.4,
	EveningBias:   0.9,
	WeekendBias:   0.2,
	DemandPenalty: -0.3,
}

// RecommendSlots takes available times and scores them based on the weights
func RecommendSlots(availableTimes []string, date string) map[string]float64 {
	scores := make(map[string]float64)
	t, _ := time.Parse("2006-01-02", date)

	for _, slot := range availableTimes {
		score := 0.5 // Base neuron activation

		// 1. Time of Day Feature
		if slot == "08:00 PM" || slot == "08:45 PM" {
			score += DefaultWeights.EveningBias
		} else {
			score += DefaultWeights.MorningBias
		}

		// 2. Day of Week Feature
		if t.Weekday() == time.Sunday {
			score += DefaultWeights.WeekendBias
		}

		// 3. Sigmoid-like Normalization (Keep scores between 0 and 1)
		finalScore := 1 / (1 + math.Exp(-score))
		scores[slot] = finalScore
	}

	return scores
}
