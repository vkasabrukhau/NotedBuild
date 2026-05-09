# Artillery Test Summary

Date: 2026-05-01
Target: `http://127.0.0.1:3000`
Runtime: local Next.js app already running on port `3000`

## 1. Public Pages Test

Scenario file: `experiments/artillery-public-pages.yml`

Routes exercised:
- `/`
- `/simple`

Phases:
- `15s @ 2 req/s`
- `30s @ 5 req/s`
- `15s @ 8 req/s`

Aggregate results:
- Total requests: `300`
- Successful responses: `300` (`100%`)
- Failed virtual users: `0`
- Mean response time: `28.4 ms`
- Median response time: `23.8 ms`
- P95 response time: `45.2 ms`
- P99 response time: `122.7 ms`

Per-endpoint response time:
- `/`: mean `26.7 ms`, P95 `39.3 ms`
- `/simple`: mean `33.2 ms`, P95 `46.1 ms`

Artifact:
- `experiments/artillery-public-pages-report.json`

## 2. Public API Test

Scenario file: `experiments/artillery-public-api.yml`

Route exercised:
- `/api/schools`

Phases:
- `15s @ 2 req/s`
- `20s @ 3 req/s`
- `10s @ 5 req/s`

Aggregate results:
- Total requests: `140`
- Successful responses: `140` (`100%`)
- Failed virtual users: `0`
- Mean response time: `154.1 ms`
- Median response time: `117.9 ms`
- P95 response time: `391.6 ms`
- P99 response time: `497.8 ms`
- Total bytes downloaded: `154,268,660`

Artifact:
- `experiments/artillery-public-api-report.json`

## Scope Notes

These tests cover unauthenticated, publicly reachable routes only. Authenticated user flows such as note creation, folders, profile editing, explore interactions, and tamagotchi actions were not included in this run because they require a stable signed-in session and seeded user data.
