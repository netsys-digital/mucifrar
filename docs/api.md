# Chord Seven — API

## Público
- `GET /api/publico/cifras?q=&page=&pageSize=` — busca cifras publicadas
- `GET /api/publico/cifras/:slug` — exibe cifra e incrementa views

## Auth
- `POST /api/auth/register` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `POST /api/auth/refresh` `{ refreshToken }`
- `POST /api/auth/logout` (JWT) `{ refreshToken }`
- `GET /api/auth/me` (JWT)

## Cifras (JWT)
- `GET /api/cifras/minhas`
- `GET /api/cifras/:id`
- `POST /api/cifras`
- `PUT /api/cifras/:id`
- `DELETE /api/cifras/:id`
