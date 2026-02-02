package main

import (
	"flag"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

func main() {
	targetURL := flag.String("url", "http://localhost:8080/api/insights", "Target URL")
	concurrency := flag.Int("c", 20, "Number of concurrent workers")
	duration := flag.Duration("d", 10*time.Second, "Test duration")
	flag.Parse()

	fmt.Printf("🚀 Starting Load Test\n")
	fmt.Printf("Target: %s\n", *targetURL)
	fmt.Printf("Workers: %d\n", *concurrency)
	fmt.Printf("Duration: %s\n\n", *duration)

	var (
		totalReqs  uint64
		failedReqs uint64
		latencies  []time.Duration
		mu         sync.Mutex
		wg         sync.WaitGroup
	)

	start := time.Now()
	timeout := time.After(*duration)
	done := make(chan bool)

	// Create a shared client to simulate keep-alive connections
	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        *concurrency,
			MaxIdleConnsPerHost: *concurrency,
		},
	}

	// Start workers
	for i := 0; i < *concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-done:
					return
				default:
					reqStart := time.Now()
					resp, err := client.Get(*targetURL)
					latency := time.Since(reqStart)

					if err != nil || resp.StatusCode >= 400 {
						atomic.AddUint64(&failedReqs, 1)
					} else {
						resp.Body.Close()
						atomic.AddUint64(&totalReqs, 1)
						mu.Lock()
						latencies = append(latencies, latency)
						mu.Unlock()
					}
				}
			}
		}()
	}

	<-timeout
	close(done)
	wg.Wait()
	elapsed := time.Since(start)

	// Calculate Stats
	mu.Lock()
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	total := len(latencies)
	var p50, p95, p99 time.Duration
	if total > 0 {
		p50 = latencies[total/2]
		p95 = latencies[int(float64(total)*0.95)]
		p99 = latencies[int(float64(total)*0.99)]
	}
	mu.Unlock()

	rps := float64(atomic.LoadUint64(&totalReqs)) / elapsed.Seconds()

	fmt.Printf("🛑 Test Finished\n\n")
	fmt.Printf("--- Results ---\n")
	fmt.Printf("Total Requests: %d\n", atomic.LoadUint64(&totalReqs))
	fmt.Printf("Failed Requests: %d\n", atomic.LoadUint64(&failedReqs))
	fmt.Printf("Requests/Sec:   %.2f\n", rps)
	fmt.Printf("\n--- Latency ---\n")
	fmt.Printf("Average: %v\n", time.Duration(int64(totalLatency(latencies))/int64(total)))
	fmt.Printf("P50:     %v\n", p50)
	fmt.Printf("P95:     %v\n", p95)
	fmt.Printf("P99:     %v\n", p99)
}

func totalLatency(l []time.Duration) time.Duration {
	var total time.Duration
	for _, v := range l {
		total += v
	}
	if total == 0 {
		return 0
	}
	return total
}
