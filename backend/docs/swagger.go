// Package docs contains the generated Swagger documentation.
// @title Hidden Depths API
// @version 1.0
// @description Mental health mentorship platform API for booking sessions and managing subscriptions.
// @termsOfService https://hidden-depths-web.pages.dev/terms

// @contact.name Hidden Depths Support
// @contact.email support@hiddendepths.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host hidden-depths-web.onrender.com
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT token from Supabase authentication. Format: "Bearer {token}"

// @tag.name Bookings
// @tag.description Booking management endpoints
// @tag.name Insights
// @tag.description Insight cards for the homepage carousel
// @tag.name Subscriptions
// @tag.description Subscription management endpoints
// @tag.name Admin
// @tag.description Admin-only endpoints for managing content
package docs

// This file is required for swag init to generate documentation
// Run: swag init -g docs/swagger.go -o docs --parseDependency --parseInternal
