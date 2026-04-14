package handlers

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

var defaultAllowedWeekdays = []time.Weekday{time.Sunday, time.Monday}
var defaultTimeSlots = []string{"11:00 AM", "11:45 AM", "12:30 PM", "08:00 PM", "08:45 PM"}

// BookingPolicy controls booking capacity and discoverability window.
type BookingPolicy struct {
	SafeMode         bool
	AllowedWeekdays  []time.Weekday
	SearchWindowDays int
	MaxBookableDates int
	TimeSlots        []string
}

var (
	bookingPolicyMu sync.RWMutex
	bookingPolicy   = BookingPolicy{
		SafeMode:         true,
		AllowedWeekdays:  append([]time.Weekday{}, defaultAllowedWeekdays...),
		SearchWindowDays: 21,
		MaxBookableDates: 2,
		TimeSlots:        append([]string{}, defaultTimeSlots...),
	}
)

func normalizeSlots(slots []string) []string {
	normalized := make([]string, 0, len(slots))
	seen := make(map[string]struct{}, len(slots))
	for _, slot := range slots {
		trimmed := strings.TrimSpace(slot)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	return normalized
}

// SetBookingPolicy sets process-wide booking policy. Call once at startup.
func SetBookingPolicy(policy BookingPolicy) {
	if policy.SearchWindowDays <= 0 {
		policy.SearchWindowDays = 21
	}
	if policy.MaxBookableDates <= 0 {
		if policy.SafeMode {
			policy.MaxBookableDates = 2
		} else {
			policy.MaxBookableDates = 6
		}
	}
	if len(policy.AllowedWeekdays) == 0 {
		policy.AllowedWeekdays = append([]time.Weekday{}, defaultAllowedWeekdays...)
	}
	policy.TimeSlots = normalizeSlots(policy.TimeSlots)
	if len(policy.TimeSlots) == 0 {
		policy.TimeSlots = append([]string{}, defaultTimeSlots...)
	}

	bookingPolicyMu.Lock()
	defer bookingPolicyMu.Unlock()
	bookingPolicy = BookingPolicy{
		SafeMode:         policy.SafeMode,
		AllowedWeekdays:  append([]time.Weekday{}, policy.AllowedWeekdays...),
		SearchWindowDays: policy.SearchWindowDays,
		MaxBookableDates: policy.MaxBookableDates,
		TimeSlots:        append([]string{}, policy.TimeSlots...),
	}
}

func getBookingPolicyConfig() BookingPolicy {
	bookingPolicyMu.RLock()
	defer bookingPolicyMu.RUnlock()
	return BookingPolicy{
		SafeMode:         bookingPolicy.SafeMode,
		AllowedWeekdays:  append([]time.Weekday{}, bookingPolicy.AllowedWeekdays...),
		SearchWindowDays: bookingPolicy.SearchWindowDays,
		MaxBookableDates: bookingPolicy.MaxBookableDates,
		TimeSlots:        append([]string{}, bookingPolicy.TimeSlots...),
	}
}

func isWeekdayAllowed(day time.Weekday, allowed []time.Weekday) bool {
	for _, candidate := range allowed {
		if day == candidate {
			return true
		}
	}
	return false
}

func isTimeSlotAllowed(slot string, policy BookingPolicy) bool {
	for _, allowedSlot := range policy.TimeSlots {
		if slot == allowedSlot {
			return true
		}
	}
	return false
}

func computeEligibleBookingDates(now time.Time, policy BookingPolicy) []string {
	base := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dates := make([]string, 0, policy.MaxBookableDates)

	for i := 0; i < policy.SearchWindowDays && len(dates) < policy.MaxBookableDates; i++ {
		candidate := base.AddDate(0, 0, i)
		if isWeekdayAllowed(candidate.Weekday(), policy.AllowedWeekdays) {
			dates = append(dates, candidate.Format("2006-01-02"))
		}
	}
	return dates
}

func isBookingDateAllowed(date string, now time.Time, policy BookingPolicy) (bool, string, error) {
	parsed, err := time.Parse("2006-01-02", date)
	if err != nil {
		return false, "", err
	}

	allowedDates := computeEligibleBookingDates(now, policy)
	target := parsed.Format("2006-01-02")
	for _, allowedDate := range allowedDates {
		if allowedDate == target {
			return true, "", nil
		}
	}

	if len(allowedDates) == 0 {
		return false, "No booking dates are currently available", nil
	}
	return false, fmt.Sprintf("Bookings are currently limited to: %s", strings.Join(allowedDates, ", ")), nil
}
