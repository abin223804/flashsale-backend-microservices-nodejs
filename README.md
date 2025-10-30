# ⚡ QuickSale – Flash Sale Backend (Microservices)

A high-performance, microservice-based backend system built for flash-sale scenarios.  
Supports secure authentication, order creation with idempotency, Kafka-based event flow, and real-time WebSocket notifications.

---

## 🏗️ Architecture Overview

**Services included:**
- 🧑‍💻 **Auth Service** – Handles registration, login, JWT auth
- 🛍️ **Catalog & Inventory Service** – Manages products and stock reservation (no overselling)
- 📦 **Order Service** – Creates orders with Idempotency-Key, Outbox pattern
- 🔔 **Notifier Service** – WebSocket server sending real-time order updates
- 🚪 **API Gateway** – Validates JWT, applies rate limits, routes requests
- 🧱 **Infrastructure:** Kafka, PostgreSQL, Redis, Docker Compose

---

## 🧰 Tech Stack
- **Node.js + Express**
- **PostgreSQL**
- **Redis**
- **Kafka**
- **Docker Compose**
- **JWT Authentication**
- **WebSockets (Socket.io)**

---

## ⚙️ Setup Instructions

### 1️⃣ Prerequisites
Make sure you have:
- [Node.js](https://nodejs.org/en/) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### 2️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/quicksale-backend.git
cd quicksale-backend
