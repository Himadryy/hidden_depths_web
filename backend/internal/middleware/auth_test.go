package middleware

import "testing"

func TestResolveSupabaseAuthURL(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "uses configured URL as base",
			in:   "https://example.supabase.co",
			want: "https://example.supabase.co/auth/v1/user",
		},
		{
			name: "trims whitespace and trailing slash",
			in:   "  https://example.supabase.co/  ",
			want: "https://example.supabase.co/auth/v1/user",
		},
		{
			name: "falls back when empty",
			in:   "",
			want: "https://msriduejyxcdpvcawacj.supabase.co/auth/v1/user",
		},
		{
			name: "falls back when whitespace only",
			in:   "   ",
			want: "https://msriduejyxcdpvcawacj.supabase.co/auth/v1/user",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := resolveSupabaseAuthURL(tc.in)
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}
