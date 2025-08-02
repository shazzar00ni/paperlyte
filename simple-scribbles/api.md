# Paperlyte API (Planned)

## Base URL

```
https://api.paperlyte.com/v1
```

## Endpoints

- `POST /waitlist`: Add to waitlist
- `GET /waitlist`: List waitlist entries (admin)
- `POST /notes`: Save a note (authenticated)
- `GET /notes`: Fetch notes (authenticated)
- `DELETE /notes/:id`: Delete note

## Authentication

- JWT (planned)
- OAuth2 (future)

## Example Request

```http
POST /waitlist
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "Jane Doe",
  "interest": "student"
}
```

---
