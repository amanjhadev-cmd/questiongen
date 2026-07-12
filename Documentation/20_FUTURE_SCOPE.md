# 20 — Future Scope (V2+)

This document captures everything that is explicitly OUT OF SCOPE for V1. Developers must not build these features unless a formal decision is made to include them. This prevents scope creep and keeps V1 stable.

---

## Not Building in V1

### Analytics & Reporting
- Question difficulty distribution charts
- SME review turnaround time metrics
- Batch completion velocity reports
- Most-used concepts per subject
- Bloom's taxonomy coverage heatmap per chapter

### Notifications
- Email notifications (batch assigned, review complete, export ready)
- In-app notifications (bell icon)
- Slack/WhatsApp integration for batch status updates

### LLM Provider Flexibility
- Switching LLM provider per question (currently fixed in Subject Profile)
- A/B testing different prompts against each other
- LLM cost tracking per batch
- Auto-retry with different provider on failure

### Auto-Concept Suggestions
- AI-powered concept extraction from NCERT chapters
- Concept gap detection (concepts with no questions)
- Auto-fill concept_uuid from question text

### Workflow & Status
- Automated email when batch moves to next stage
- Batch due dates and calendar view
- Priority/urgency flags on batches
- SLA tracking for review turnaround

### Question Statistics
- "This question was asked X times in board exams"
- Question similarity detection (near-duplicates across batches)
- Per-question difficulty calibration (based on student performance)
- Question retirement workflow (mark as outdated)

### CSV Export
- CSV format export (Admin requested but deferred to V2)

### Mobile App
- React Native mobile app for SME review on mobile
- Offline review capability with sync

### Advanced SME Features
- Multi-SME review (consensus voting)
- SME assignment rules (auto-assign based on subject expertise)
- SME performance scoring

### Import Enhancements
- Word document import (`.docx`)
- Copy-paste from Google Docs with auto-parsing
- Import from external question banks
- OCR import from scanned question papers

### Versioning Improvements
- Full diff view between question versions
- Restore to any previous version
- Version compare side-by-side

### Collaboration
- Comments thread per question (not just SME review notes)
- @mentions in batch notes
- Batch-level activity feed

### Integration
- Google Sheets sync (live bidirectional)
- LMS integration (Moodle, Canvas)
- Webhook API for third-party systems

### Advanced Rendering
- Audio questions (read-aloud capability)
- Video embed in question
- Interactive diagram (drag-and-drop match)

### Admin Enhancements
- Role-based prompt access (SME can see only their subject's prompts)
- Audit log with full field-level change history
- Bulk batch operations (delete, archive, reassign)
- Data retention policies (auto-archive old batches)

---

## Decisions Locked for V1 (Do Not Change)

| Decision | Status |
|---|---|
| REST API (not GraphQL) | Locked |
| PostgreSQL (not MongoDB) | Locked |
| Cloudflare R2 (not AWS S3) | Locked |
| n8n for generation (not direct LLM call from backend) | Locked |
| Next.js App Router | Locked |
| JWT auth (not OAuth/SSO) | Locked |
| 4 roles only | Locked |
| No real-time features (WebSocket) | Locked |
| No mobile app | Locked |
| No CSV export | Locked |

---

## How to Request a V2 Feature

1. Open a GitHub issue with label `v2-feature`
2. Include: use case, affected users, estimated complexity
3. Get approval from project owner before any development starts
4. Update this document to move the item from "Not Building" to "Planned for V2"

This ensures no developer builds something that was intentionally excluded.
