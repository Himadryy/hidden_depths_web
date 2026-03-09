package ws

import (
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"go.uber.org/zap"
)

// Message defines the structure of WebSocket communications
type Message struct {
	Type string      `json:"type"` // "SLOT_BOOKED", "SLOT_CANCELLED"
	Payload interface{} `json:"payload"`
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients        map[*websocket.Conn]bool
	broadcast      chan Message
	register       chan *websocket.Conn
	unregister     chan *websocket.Conn
	mu             sync.Mutex
	allowedOrigins []string
}

var upgrader websocket.Upgrader

func NewHub(allowedOrigins []string) *Hub {
	hub := &Hub{
		clients:        make(map[*websocket.Conn]bool),
		broadcast:      make(chan Message),
		register:       make(chan *websocket.Conn),
		unregister:     make(chan *websocket.Conn),
		allowedOrigins: allowedOrigins,
	}

	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			for _, allowed := range hub.allowedOrigins {
				if origin == allowed {
					return true
				}
			}
			logger.Warn("WebSocket origin rejected", zap.String("origin", origin))
			return false
		},
	}

	return hub
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			logger.Debug("WS Client Registered")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
			logger.Debug("WS Client Unregistered")

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				client.SetWriteDeadline(time.Now().Add(5 * time.Second))
				err := client.WriteJSON(message)
				if err != nil {
					logger.Error("WS Broadcast error, removing client", zap.Error(err))
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// ServeWS handles websocket requests from the peer.
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("WS Upgrade error", zap.Error(err))
		return
	}
	h.register <- conn

	// Keep connection alive and handle client-side closures
	go func() {
		defer func() {
			h.unregister <- conn
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

// Broadcast sends a message to all connected clients
func (h *Hub) Broadcast(msgType string, payload interface{}) {
	h.broadcast <- Message{
		Type:    msgType,
		Payload: payload,
	}
}
