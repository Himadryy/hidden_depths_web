package handlers

import (
	"strings"
	"testing"
	"time"
)

func TestComputeEligibleBookingDatesSafeMode(t *testing.T) {
	policy := BookingPolicy{
		SafeMode:         true,
		AllowedWeekdays:  []time.Weekday{time.Sunday, time.Monday},
		SearchWindowDays: 21,
		MaxBookableDates: 2,
		TimeSlots:        []string{"11:00 AM"},
	}

	now := time.Date(2026, 4, 14, 10, 0, 0, 0, time.UTC) // Tuesday
	got := computeEligibleBookingDates(now, policy)

	want := []string{"2026-04-19", "2026-04-20"}
	if len(got) != len(want) {
		t.Fatalf("expected %d dates, got %d (%v)", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("index %d: expected %s, got %s", i, want[i], got[i])
		}
	}
}

func TestIsBookingDateAllowed(t *testing.T) {
	policy := BookingPolicy{
		SafeMode:         true,
		AllowedWeekdays:  []time.Weekday{time.Sunday, time.Monday},
		SearchWindowDays: 21,
		MaxBookableDates: 2,
		TimeSlots:        []string{"11:00 AM"},
	}
	now := time.Date(2026, 4, 14, 10, 0, 0, 0, time.UTC)

	allowed, message, err := isBookingDateAllowed("2026-04-19", now, policy)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatalf("expected allowed date to be accepted, got message: %s", message)
	}

	allowed, message, err = isBookingDateAllowed("2026-04-26", now, policy)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Fatalf("expected outside-window date to be rejected")
	}
	if !strings.Contains(message, "2026-04-19") || !strings.Contains(message, "2026-04-20") {
		t.Fatalf("expected rejection message to include allowed dates, got: %s", message)
	}
}
