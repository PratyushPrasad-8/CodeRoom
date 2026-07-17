# CoderRooms

CoderRooms is an online coding platform MVP with:

- Teacher-created live rooms.
- Student room join codes.
- Live student code snapshots for teachers.
- A live submission table with accepted/failed status.
- A normal practice mode from the problem library.
- AI analytics that highlights weak zones and recommended practice topics.
- Local judging for JavaScript, Python, and Java without paid API keys.

## Project Structure

```text
backend/   Express, Socket.IO, local judge, local ML analytics
frontend/  React, Vite, Monaco editor
```

## Start Locally

Open two terminals:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Important Security Note

The backend runs submitted code locally with a short timeout for development. Before hosting this publicly, run submissions inside locked-down containers, microVMs, or a hosted judge provider.
