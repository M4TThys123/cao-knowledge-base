# CAO Chatbot — Roadmap

> Status van het prototype en taken richting een productiewaardige flow.
> Laatst bijgewerkt: april 2026

**Legenda**

- ✅ Gedaan
- 🟡 In progress
- ⬜ Nog te doen
- 💡 Idee / overweging

---

## Fase 1 — Prototype (huidige status)

> Doel: werkend prototype dat de 5 use cases dekt. Klaar voor demo.

### Content & data

- ✅ CAO PDF geanalyseerd, structuur in kaart gebracht
- ✅ Subset van 14 artikelen geselecteerd voor demo
- ✅ PDF → Markdown conversie (handmatig met Claude Code)
- ✅ GitHub repo `cao-knowledge-base` opgezet als source-of-truth
- ✅ Frontmatter + meta-block conventies vastgelegd
- ✅ Schema's en tabellen omgezet naar tekst-equivalenten

### Database & retrieval

- ✅ Supabase project opgezet (EU-region niet expliciet gecontroleerd — TODO productie)
- ✅ pgvector extension geactiveerd
- ✅ Tabel `cao_chunks` aangemaakt met JSONB metadata + 3072-dim embedding
- ✅ Unique constraint op `chunk_id` (idempotency safety net)
- ✅ GIN-index op metadata voor snelle JSONB-filtering
- ✅ RPC functie `match_cao_chunks` met optionele filter-parameter
- ✅ Default filter `versie IN ('huidig', 'n.v.t.')` voor productie-veilige retrieval

### n8n — Ingest workflow

- ✅ Code node geschreven (`code-node-cao-ingest.js`) met:
    - YAML frontmatter parser
    - H1/H2 splitter (code-fence aware)
    - Per-sectie meta-block parser
    - FNV1a hashing voor idempotency
    - Auto-detectie versie, toelichting, overgangsrecht
- ✅ GitHub → Code → Embedding → Supabase pipeline werkend
- ✅ Truncate-node aan begin voor schone re-runs
- ✅ Eerste succesvolle ingest: 28 chunks uit 14 files

### n8n — Chat workflow

- ✅ Webhook entry-point op `POST /cao-chat`
- ✅ Chat Trigger entry-point voor publieke chat-UI
- ✅ Input normalisatie (beide entry-points → gemeenschappelijk schema)
- ✅ Taaldetectie via aparte LLM-call
- ✅ Translate naar NL bij niet-NL queries
- ✅ CAO Agent met strikte grounding-prompt
- ✅ Knowledge_base tool met `match_cao_chunks` query
- ✅ Cohere reranker (top-15 → top-6)
- ✅ Confidence check + Topdesk-fallback (mocked)
- ✅ Translate response terug naar originele taal

### Demo & deliverables

- ✅ 5 use cases gevalideerd
- ✅ Architectuur-document (`CAO-Chatbot-Architectuur.md`)
- ✅ Use cases lijst (`usecases.md`)
- ✅ Sketch-notes voor presentatie (`sketchnotes.md`)
- 🟡 Meertaligheid: stabiel in EN/PL, wankel in DE en sommige andere talen → bewust opgenomen als verbeterpunt

---

## Fase 2 — Productie-waardig (richting echte uitrol)

> Doel: van demo naar systeem dat in een echte werkomgeving kan draaien.

### Content uitbreiden

- ⬜ Volledige CAO ingesten (alle 61 artikelen + 6 bijlagen)
- ⬜ Geautomatiseerde PDF → Markdown pipeline met human-review stap
- ⬜ Versioning per CAO-jaar (2026, 2027, ... als aparte `doc_version`)
- ⬜ Mechanisme voor jaarlijkse update zonder volledige re-ingest

### Retrieval verbeteren

- ⬜ Hybrid search (vector + exacte termen) voor exacte termen
- ⬜ Confidence-scoring op rerank-scores als harde drempel (i.p.v. tekstdetectie)
- ⬜ Neighbor-retrieval: artikel + toelichting altijd samen ophalen via `chunk_group_id`
- ⬜ Query rewriting voor vage vragen (bv. "wat zijn mijn rechten" → context-rijke query)

### Meertaligheid robuust maken

- ⬜ Pre-vertaalde + apart geëmbedde chunks voor top-3 talen (PL, EN, RO of TR — afhankelijk van doelgroep)
- ⬜ Glossarium van juridische termen die NIET vertaald mogen worden
- ⬜ Memory-pollutie tussen talen oplossen (sessie-isolatie per taal)

### Integraties

- ⬜ Echte Topdesk-integratie via REST API
    - Ticket aanmaken met vraag + sessie-context + retrieval-resultaten
    - Ticket-nummer terug in chat-respons
- ⬜ SSO / authenticatie integreren met bestaand HR-systeem
- ⬜ Optioneel: Slack-integratie voor intercedenten

### Veiligheid & privacy
- ⬜ Rate limiting per IP/sessie

### Logging & audit

- ⬜ Audit-trail: koppel elk antwoord aan `chunk_id`s die zijn gebruikt
- ⬜ Logging policy met bewaartermijnen
- ⬜ PII-redactie vóór logging
- ⬜ Dashboard met retrieval-kwaliteit metrics (gem. similarity, fallback-rate, etc.)

### UX

- ⬜ Custom frontend in plaats van n8n Chat Trigger (eigen branding)
- ⬜ Disclaimer bij eerste use ("geen juridisch advies")
- ⬜ Welcome message met voorbeeld-vragen
- ⬜ Feedback-mechanisme (duim omhoog/omlaag per antwoord)
- ⬜ Conversatiegeschiedenis-export voor users

### Operations

- ⬜ Monitoring (n8n executions, Supabase queries, LLM-kosten)
- ⬜ Alerting bij hoge fallback-rate of retrieval-failures
- ⬜ Backup-strategie voor Supabase
- ⬜ Disaster recovery plan
- ⬜ Migratie van n8n self-hosted → managed (n8n Cloud) of vice versa

---

## Fase 3 — Nice to haves (toekomstvisie)

> Niet kritiek, maar zou waarde toevoegen.

- 💡 **Multi-CAO support**: niet alleen ABU-CAO maar ook NBBU, Bouw & Infra, etc. — met toggle in de UI
- 💡 **Pro-actieve notificaties**: bij wijzigingen in de CAO automatisch users informeren (e-mail / push)
- 💡 **Voice-interface** voor op de werkvloer (uitzendkrachten met handen vol)
- 💡 **Klantwoordenboek**: als opdrachtgevers eigen CAO-aanvullingen hebben, die als extra knowledge layer
- 💡 **Vergelijkings-modus**: "wat is het verschil tussen ABU-CAO en NBBU-CAO op punt X?"
- 💡 **Self-service voor HR**: HR upload contract, bot checkt of het CAO-conform is
- 💡 **A/B testing-framework** voor system prompts (welke formulering geeft betere antwoorden)

---

## Open vragen / risico's

- ❓ Welke LLM-provider voor productie? Gemini is goedkoop maar buiten EU. Vertex AI EU is duurder. Mistral is EU maar minder goed in tool-calling.
- ❓ Hoe vaak wordt de CAO geüpdate? Bepaalt of we per jaar of per kwartaal een re-ingest moeten doen.
- ❓ Welke aansprakelijkheid neemt de afnemer voor verkeerde antwoorden? Disclaimers afdoende?
- ❓ Multi-tenancy: één bot voor meerdere uitzendbureaus, of per klant aparte instance?

---