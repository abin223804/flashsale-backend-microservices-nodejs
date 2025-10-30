# QuickSale Backend (Starter)

This archive contains a starter full-stack backend for the QuickSale flash-sale project:
- Node.js + Express microservices
- PostgreSQL, Kafka, Redis (via Docker Compose)
- Services: auth, catalog, order, notifier, api-gateway

See `sql/schema.sql` for DB schema. Start with:
```bash
docker compose up --build
# then apply schema: psql postgresql://quicksale:quicksale@localhost:5432/quicksale -f sql/schema.sql
```
