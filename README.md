# Stock Market API Performance Testing

A performance testing project that evaluates a Stock Market REST API under different workloads using Grafana k6, Prometheus, and Grafana.

**Course:** Software Testing & Quality Assurance  
**Project:** Stock Market API Performance Testing  
**University:** Presidency University  
**Department:** Information Science & Engineering

## Team Members

| Name | USN |
|---|---|
| Vishwas M R | 20241ISE0189 |
| Sravan | 20241ISE0230 |

## 1. Project Overview

This project evaluates the performance, reliability, and behaviour of a Stock Market API under different traffic conditions.

The backend is developed using FastAPI. Grafana k6 simulates multiple virtual users and sends requests to the API. Prometheus collects performance metrics, while Grafana visualizes the results through monitoring dashboards.

The project focuses on response time, throughput, virtual users, and HTTP request failure rate.

## 2. Technology Stack

| Technology | Purpose |
|---|---|
| Python | Backend development |
| FastAPI | REST API framework |
| Grafana k6 | Performance and load testing |
| Prometheus | Metrics collection and storage |
| Grafana | Dashboard and visualization |
| Git and GitHub | Version control and collaboration |

## 3. System Architecture

```text
       k6 Performance Tests
                |
                | HTTP Requests
                v
       FastAPI Stock Market API
                |
                | Performance Metrics
                v
           Prometheus
                |
                | Data Source
                v
             Grafana
                |
                v
       Performance Dashboard
```

## 4. Testing Scenarios

Five performance testing scenarios were executed.

| Test | Purpose | Peak Virtual Users |
|---|---|---:|
| Smoke | Verify basic API performance | 1 |
| Load | Evaluate expected workload | 100 |
| Stress | Evaluate behaviour under heavy load | 596 |
| Spike | Evaluate sudden traffic increase | 500 |
| Soak | Evaluate sustained workload | 50 |

## 5. Performance Test Results

The following results were collected from the completed test runs.

| Test | Requests | Average Response Time | p95 | p99 |
|---|---:|---:|---:|---:|
| Smoke | 210 | 2.02 ms | 2.88 ms | 4.25 ms |
| Load | 61,332 | 2.22 ms | 4.45 ms | 7.23 ms |
| Stress | 220,282 | 113.85 ms | 821.59 ms | 1,256.75 ms |
| Spike | 64,263 | 336.54 ms | 946.99 ms | 1,137.16 ms |
| Soak | 39,747 | 2.93 ms | 5.74 ms | 14.85 ms |

### Key Observations

- Total requests across all five test runs: **385,834**.
- Observed HTTP request failure rate: **0%**.
- Highest observed virtual users: **596**.
- Stress and spike tests showed increased response latency under heavier workloads.
- The tests demonstrate the importance of evaluating both reliability and response time.

Note: The stress test completed, but its JSON summary export was interrupted. Its reported latency values were obtained from the Prometheus metrics.

## 6. Monitoring and Visualization

Prometheus is used to collect and store k6 performance metrics.

Grafana is connected to Prometheus and provides visual monitoring of:

- Virtual users
- Request rates
- Response time
- Performance check pass rate
- Test execution behaviour

## 7. Project Structure

```text
stock-k6-project/
|
|-- app/
|   |-- main.py
|
|-- k6/
|   |-- smoke.js
|   |-- load.js
|   |-- stress.js
|   |-- spike.js
|   |-- soak.js
|
|-- prometheus/
|-- grafana/
|-- grafana-windows/
|-- results/
|   |-- screenshots/
|
|-- .github/
|-- README.md
```

## 8. Running the Project on Windows

### Prerequisites

- Python 3.12
- Grafana k6
- Prometheus
- Grafana

### Step 1: Open the project directory

```powershell
cd "C:\Users\Vishwas M R\OneDrive\Desktop\StockMarketPerformanceTesting\stock-k6-project"
```

### Step 2: Start Prometheus

```powershell
.\grafana-windows\Start-Prometheus.ps1
```

Prometheus: http://127.0.0.1:9090

### Step 3: Start the FastAPI backend

Open another PowerShell terminal.

```powershell
cd "C:\Users\Vishwas M R\OneDrive\Desktop\StockMarketPerformanceTesting\stock-k6-project"

$env:SEEDED_DEFECTS = "off"

.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning
```

API: http://127.0.0.1:8000  
API documentation: http://127.0.0.1:8000/docs

### Step 4: Open Grafana

Start the Grafana Windows service if it is not already running.

Grafana: http://localhost:3000

The configured Prometheus data source is:

```text
http://127.0.0.1:9090
```

### Step 5: Run performance tests

Use the k6 scripts in the `k6/` directory.

Example:

```powershell
k6 run k6/smoke.js
```

Use the corresponding script for each testing scenario.

## 9. Results and Evidence

The `results/` directory contains generated test reports and supporting evidence.

The `results/screenshots/` directory contains screenshots captured during testing.

HTML reports can be opened in a web browser for further analysis.

## 10. Limitations and Future Enhancements

Current limitations:

- The application uses simulated stock market data.
- The project is a performance testing prototype, not a production trading platform.
- The API uses in-memory demo data rather than a persistent production database.
- Authentication is intended for demonstration and is not production hardened.

Future enhancements:

- Integrate a real-time stock market data provider.
- Add persistent database storage.
- Improve authentication and authorization.
- Automate performance testing through CI/CD.
- Deploy the application to a cloud environment.
- Extend monitoring and performance analysis.

## 11. References

- [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

**Project:** Stock Market API Performance Testing  
**Developed by:** Vishwas M R and Sravan  
**Presidency University**
