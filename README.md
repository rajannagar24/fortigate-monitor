# FortiGate Monitor Dashboard

A free, open-source monitoring dashboard for FortiGate firewalls. Connect one or more FortiGate devices and get real-time visibility into system health, network traffic, security events, and VPN status.

## Features

- **Multi-Firewall Support** - Add and manage multiple FortiGate firewalls from a single dashboard
- **Real-time Monitoring** - Live system metrics (CPU, memory, disk, sessions)
- **Traffic Analysis** - Bandwidth charts and top talkers
- **Security Events** - Threat logs, IPS events, blocked traffic
- **VPN Monitoring** - Active VPN tunnel status
- **Firewall Rules** - View configured policies
- **Dark Mode** - Full dark/light theme support
- **100% Free** - No paid services, runs locally

## Architecture

```
Frontend (React + Vite)  ──HTTPS──►  Backend (Express)  ──HTTPS──►  FortiGate API
     :5173                              :4000
```

## Quick Start

### Prerequisites
- Node.js 18+
- A FortiGate firewall with REST API access
- API token from FortiGate admin panel

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/fortigate-monitor.git
cd fortigate-monitor

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure

```bash
# In backend/, create .env file
cp backend/.env.example backend/.env
# Edit .env with your settings
```

### 3. Run

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open http://localhost:5173 in your browser.

## Getting a FortiGate API Token

1. Log in to FortiGate admin panel
2. Go to **System → Administrators**
3. Create a new REST API Admin
4. Set profile to **Read-Only** (recommended)
5. Copy the generated API token
6. Add the token in the dashboard's "Add Firewall" dialog

## Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | React 19 + TypeScript + Vite | Free |
| UI | TailwindCSS + Recharts | Free |
| Backend | Node.js + Express + TypeScript | Free |
| Database | SQLite (via better-sqlite3) | Free |
| Deployment | GitHub Pages + Local backend | Free |

## Project Structure

```
fortigate-monitor/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express server entry
│   │   ├── database.ts        # SQLite setup
│   │   ├── routes/
│   │   │   ├── firewalls.ts   # CRUD for firewalls
│   │   │   ├── monitor.ts     # Monitoring data endpoints
│   │   │   └── auth.ts        # Authentication
│   │   └── services/
│   │       ├── fortigate.ts   # FortiGate API client
│   │       └── cache.ts       # In-memory cache
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   └── package.json
└── README.md
```

## License

MIT
