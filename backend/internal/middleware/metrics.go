package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// httpRequestsTotal counts total HTTP requests by method, path, and status
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	// httpRequestDuration tracks request latency in seconds
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "path"},
	)

	// httpRequestsInFlight tracks concurrent requests
	httpRequestsInFlight = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Number of HTTP requests currently being processed",
		},
	)

	// bookingOperationsTotal counts booking operations by type and result
	bookingOperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "booking_operations_total",
			Help: "Total number of booking operations",
		},
		[]string{"operation", "result"},
	)

	// paymentOperationsTotal counts payment operations by status
	paymentOperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payment_operations_total",
			Help: "Total number of payment operations",
		},
		[]string{"status"},
	)
)

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{w, http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// normalizePath converts dynamic path segments to placeholders for metrics cardinality control
func normalizePath(path string) string {
	// Common patterns to normalize (prevents high cardinality metrics)
	// /api/v1/bookings/123 -> /api/v1/bookings/:id
	// /api/v1/bookings/slots/2026-03-20 -> /api/v1/bookings/slots/:date
	switch {
	case len(path) > 20 && path[:20] == "/api/v1/bookings/slo":
		return "/api/v1/bookings/slots/:date"
	case len(path) > 15 && path[:15] == "/api/v1/booking" && len(path) > 17:
		return "/api/v1/bookings/:id"
	case len(path) > 20 && path[:20] == "/api/v1/admin/insigh":
		return "/api/v1/admin/insights/:id"
	default:
		return path
	}
}

// PrometheusMetrics returns middleware that records HTTP metrics
func PrometheusMetrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		path := normalizePath(r.URL.Path)

		httpRequestsInFlight.Inc()
		defer httpRequestsInFlight.Dec()

		rw := newResponseWriter(w)
		next.ServeHTTP(rw, r)

		duration := time.Since(start).Seconds()
		status := strconv.Itoa(rw.statusCode)

		httpRequestsTotal.WithLabelValues(r.Method, path, status).Inc()
		httpRequestDuration.WithLabelValues(r.Method, path).Observe(duration)
	})
}

// RecordBookingOperation records a booking operation metric
func RecordBookingOperation(operation, result string) {
	bookingOperationsTotal.WithLabelValues(operation, result).Inc()
}

// RecordPaymentOperation records a payment operation metric
func RecordPaymentOperation(status string) {
	paymentOperationsTotal.WithLabelValues(status).Inc()
}
