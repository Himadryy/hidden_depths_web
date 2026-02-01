package models

import "time"

type Insight struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	MediaURL    string    `json:"mediaUrl"`
	MediaType   string    `json:"mediaType"` // 'image' or 'video'
	SortOrder   int       `json:"order"`
	CreatedAt   time.Time `json:"created_at"`
}
