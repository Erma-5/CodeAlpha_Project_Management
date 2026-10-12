# TaskFlow — Project Management Tool

> CodeAlpha Internship — Task 3

A full-stack collaborative project management platform inspired by Trello and Asana.

## Features

- 🔐 JWT Authentication (register / login)
- 📋 Kanban boards with drag-and-drop
- 🎯 Task management (create, edit, assign, prioritize, due dates, tags)
- 💬 Real-time comments and activity timeline
- 🔔 In-app notifications
- 👥 Team roles (Admin / Manager / Member)
- ⚡ Real-time collaboration via Socket.io
- 📊 Project statistics dashboard

## Tech Stack

| Layer     | Technology                      |
|-----------|---------------------------------|
| Frontend  | React + TypeScript + Vite       |
| Styling   | Tailwind CSS                    |
| State     | Zustand + React Query           |
| Drag-drop | dnd-kit                         |
| Backend   | Node.js + Express + TypeScript  |
| Database  | MySQL + Prisma ORM              |
| Real-time | Socket.io                       |

## Setup

### Prerequisites
- Node.js 18+
- MySQL / XAMPP

### Server
```bash
cd server
npm install
# Edit .env — set DATABASE_URL
npx prisma db push
npx ts-node src/seed.ts
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5174**

### Demo accounts
- `alice@pm.com` / `password123` (Admin)
- `bob@pm.com` / `password123` (Manager)
- `carol@pm.com` / `password123` (Member)
