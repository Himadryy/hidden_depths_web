package handlers

import "testing"

func TestBuildWebhookEventID(t *testing.T) {
	tests := []struct {
		name      string
		eventType string
		paymentID string
		orderID   string
		want      string
	}{
		{
			name:      "prefers payment id when available",
			eventType: "payment.captured",
			paymentID: "pay_123",
			orderID:   "order_123",
			want:      "payment.captured:pay_123",
		},
		{
			name:      "falls back to order id",
			eventType: "payment.failed",
			orderID:   "order_456",
			want:      "payment.failed:order:order_456",
		},
		{
			name:      "uses unknown suffix when both ids absent",
			eventType: "payment.unknown",
			want:      "payment.unknown:unknown",
		},
		{
			name:      "falls back event type when empty",
			paymentID: "pay_999",
			want:      "unknown_event:pay_999",
		},
		{
			name:      "trims event type whitespace",
			eventType: "  payment.failed  ",
			orderID:   "order_789",
			want:      "payment.failed:order:order_789",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := buildWebhookEventID(tc.eventType, tc.paymentID, tc.orderID)
			if got != tc.want {
				t.Fatalf("expected event id %q, got %q", tc.want, got)
			}
		})
	}
}

func TestReleasePendingActionForStatus(t *testing.T) {
	tests := []struct {
		name        string
		status      string
		wantOutcome releasePendingAction
	}{
		{name: "pending status updates booking", status: paymentStatusPending, wantOutcome: releasePendingActionUpdate},
		{name: "paid status is rejected", status: paymentStatusPaid, wantOutcome: releasePendingActionRejectPaid},
		{name: "failed status is noop", status: paymentStatusFailed, wantOutcome: releasePendingActionNoopAlreadyReleased},
		{name: "cancelled status is noop", status: paymentStatusCancelled, wantOutcome: releasePendingActionNoopAlreadyReleased},
		{name: "unknown status still attempts guarded update", status: "stale", wantOutcome: releasePendingActionUpdate},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := releasePendingActionForStatus(tc.status)
			if got != tc.wantOutcome {
				t.Fatalf("expected outcome %v, got %v", tc.wantOutcome, got)
			}
		})
	}
}

func TestIsPaidSessionBoundary(t *testing.T) {
	tests := []struct {
		name    string
		date    string
		want    bool
		wantErr bool
	}{
		{name: "before payment date is free", date: "2026-02-02", want: false},
		{name: "payment start date is paid", date: "2026-02-03", want: true},
		{name: "after payment start date is paid", date: "2026-02-04", want: true},
		{name: "invalid date returns error", date: "2026/02/03", wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := isPaidSession(tc.date)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error for date %q, got nil", tc.date)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, got)
			}
		})
	}
}
