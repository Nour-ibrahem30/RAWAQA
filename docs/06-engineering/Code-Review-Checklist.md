# Code Review Checklist — RAWAQA

## Author Checklist

- [ ] Scope matches ticket/requirement ID  
- [ ] Tested locally (frontend + API if changed)  
- [ ] No hardcoded secrets or API keys  
- [ ] Error handling for API calls  
- [ ] Mobile layout checked  

## Reviewer Checklist

### Functionality
- [ ] Meets acceptance criteria  
- [ ] Edge cases (empty cart, out of stock, invalid phone)  

### Security
- [ ] Input validated server-side  
- [ ] Auth on protected routes  
- [ ] No PII in logs  

### API / Data
- [ ] Matches [API-Design.md](../04-api/API-Design.md)  
- [ ] Migration included for schema changes  

### Frontend
- [ ] Matches existing design tokens (`css/styles.css`)  
- [ ] Dead UI controls hidden or wired  

### Integrations
- [ ] Odoo/SMS failures don't block checkout  
- [ ] Idempotent sync  

## Severity

- **Block:** Security issue, data loss, broken checkout  
- **Major:** Wrong business logic  
- **Minor:** Style, copy  

**Approval:** 1 reviewer for MVP; 0 open Block/Major issues.
