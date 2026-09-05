# Definition of Done — RAWAQA

## Feature DoD

- [ ] Code implements FRS acceptance criteria  
- [ ] API matches OpenAPI spec (if applicable)  
- [ ] Server-side validation in place  
- [ ] Error states handled in UI  
- [ ] Works on mobile (375px)  
- [ ] No secrets in frontend  
- [ ] Docs updated if API/schema changed  

## PR DoD

- [ ] PR description explains why  
- [ ] Self-reviewed  
- [ ] Tests added/updated (when test suite exists)  
- [ ] No unrelated changes  
- [ ] Traceability matrix updated if requirement completed  

## Release DoD

- [ ] All P0/P1 bugs closed  
- [ ] Staging E2E passed  
- [ ] Client UAT sign-off  
- [ ] Production smoke tests passed  
- [ ] Deployment checklist complete  

## Integration DoD (Odoo/SMS)

- [ ] Staging test successful  
- [ ] Retry + idempotency verified  
- [ ] `integration_logs` populated  
- [ ] Failure does not roll back order  
