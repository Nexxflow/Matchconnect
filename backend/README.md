# MatchConnect Cricket — Backend

Node.js + Express + PostgreSQL (Neon) backend for MatchConnect Cricket.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Neon PostgreSQL database** (same as your Wynreach setup) and copy the connection string.

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in `.env`:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — any long random string
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from your Razorpay dashboard (test mode keys are fine to start)

4. **Run migration** (creates all tables)
   ```bash
   npm run migrate
   ```

5. **Seed dummy data** (grounds, umpires, tournaments — same data as the frontend mocks)
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   npm run dev    # with nodemon, auto-restarts on change
   # or
   npm start
   ```

Server runs at `http://localhost:8000`. Health check: `GET /health`.

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Current user profile |

### Teams
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/teams` | ✅ | Create team |
| GET | `/api/teams/mine` | ✅ | My teams |
| GET | `/api/teams/:id` | — | Team detail + squad |
| POST | `/api/teams/:id/players` | ✅ | Add player to squad |

### Grounds
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/grounds?rating=4.5&area=Bandra` | — | List/filter grounds |
| GET | `/api/grounds/:id` | — | Ground detail |
| POST | `/api/grounds` | ✅ | Add a ground |

### Umpires
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/umpires?available=true` | — | List umpires |
| GET | `/api/umpires/:id` | — | Umpire detail |
| POST | `/api/umpires` | ✅ | Add umpire/scorer |

### Bookings + Payments (Razorpay)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings/create-order` | ✅ | Creates booking (pending) + Razorpay order |
| POST | `/api/bookings/verify-payment` | ✅ | Verifies signature, marks booking paid |
| GET | `/api/bookings/mine` | ✅ | My bookings |

**Payment flow:** frontend calls `create-order` → gets `razorpay_order` → opens Razorpay Checkout widget with `razorpay_key_id` → on success, frontend calls `verify-payment` with the returned `razorpay_payment_id` + `razorpay_signature`.

### Tournaments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tournaments` | — | List tournaments |
| GET | `/api/tournaments/:id` | — | Tournament detail |
| POST | `/api/tournaments/:id/register` | ✅ | Register a team |
| GET | `/api/tournaments/mine/:team_id` | — | Tournaments a team joined |

### Challenges (Find Match)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/challenges?format=T20&status=open` | — | List open challenges |
| POST | `/api/challenges` | ✅ | Create a challenge |
| POST | `/api/challenges/:id/accept` | ✅ | Accept a challenge |
| POST | `/api/challenges/:id/cancel` | ✅ | Cancel/reopen a challenge |

## Notes
- Auth uses JWT in `Authorization: Bearer <token>` header.
- `bcryptjs` for password hashing (matches your FastAPI bcrypt pattern from Wynreach).
- SSL is enabled for the PG pool (`rejectUnauthorized: false`) — required for Neon.
- Razorpay test mode keys work fine for local development; switch to live keys for production.
