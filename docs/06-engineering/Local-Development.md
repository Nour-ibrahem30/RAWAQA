# Local Development — RAWAQA

## Frontend Only (Current)

```bash
cd RAWAQA
python -m http.server 8000
```

Open http://localhost:8000

## Target Full Stack (Planned)

```bash
docker-compose up -d
cd backend && npm run migrate && npm run dev
python -m http.server 8000
```

See [Onboarding-Guide.md](Onboarding-Guide.md) and [../10-deployment/Environment-Configuration.md](../10-deployment/Environment-Configuration.md).
