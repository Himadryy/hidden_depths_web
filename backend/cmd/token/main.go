package main

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	secret, err := os.ReadFile("jwt.secret")
	if err != nil {
		fmt.Println("Error reading secret file:", err)
		os.Exit(1)
	}

	claims := jwt.MapClaims{
		"email": "hiddendepthsss@gmail.com",
		"sub":   "admin-user-id",
		"exp":   time.Now().Add(time.Hour * 24 * 365).Unix(),
		"iat":   time.Now().Unix(),
		"role":  "admin",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(secret)
	if err != nil {
		fmt.Println("Error signing token:", err)
		os.Exit(1)
	}

	fmt.Println(signedToken)
}
