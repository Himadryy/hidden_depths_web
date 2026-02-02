# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api/main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Add CA certificates for secure connections
RUN apk --no-cache add ca-certificates

# Copy the binary from the builder
COPY --from=builder /app/main .

# Copy migrations (if needed by the app or for manual running inside container)
COPY --from=builder /app/migrations ./migrations

# Expose port
EXPOSE 8080

# Command to run the application
CMD ["./main"]
