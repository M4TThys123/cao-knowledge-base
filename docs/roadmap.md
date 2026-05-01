# CAO Chatbot — Roadmap

> Status van het prototype en taken richting een productiewaardige flow.
> Laatst bijgewerkt: 2026-05-02

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

## Bekende beperkingen prototype

> Dingen die werken zoals nu gebouwd, maar bewust beperkt zijn voor de demo. Niet noodzakelijk roadmap-items — eerder caveats voor reviewers en handoff.

- **Versie-switching is defensief, niet bidirectioneel.** De RPC filtert default op `versie IN ('huidig', 'n.v.t.')` — `na_wmzf`-chunks worden nooit teruggegeven. Voordeel: bot citeert nooit toekomstige wetgeving. Nadeel: vragen specifiek over post-WMZF kan de bot niet beantwoorden uit retrieval. Drie opties verkend (zie roadmap "Retrieval verbeteren"):
    - **A** — RPC default uit, agent disambigueert via system prompt (simpel, risico op door-elkaar-citeren)
    - **B** — twee aparte `knowledge_base` tools onder de agent (`huidig` / `na_wmzf`), agent kiest. **Aanbevolen**.
    - **C** — pre-classify met LLM-call, dynamische filter
- **`body.language`-parameter wordt genegeerd.** Webhook-input accepteert `language: "nl"|"en"|"auto"` maar de workflow doet altijd taaldetectie. Override-pad nog niet ingebouwd.
- **`Truncate cao_chunks` node heeft geen Postgres-credential.** Twee opties: (1) Postgres-credential aanmaken (Supabase pooler URL → koppelen aan node), (2) node disabled laten + handmatig truncaten via Supabase SQL editor voor re-runs.
- **Topdesk-link in fallback is een placeholder.** Hardcoded `https://uitzendbureau.topdesk.net/tas/public/ssp/` — niet geverifieerd of dat een echte URL is bij een echte afnemer.
- **Live chat-URL is gekoppeld aan n8n webhookId.** Bij workflow-recreate of n8n-migratie verandert de ID en daarmee de publieke link in `README.md` en `architechtuur.md`. Update die op twee plekken bij verandering.

---

## Open vragen / risico's

- ❓ Welke LLM-provider voor productie? Gemini is goedkoop maar buiten EU. Vertex AI EU is duurder. Mistral is EU maar minder goed in tool-calling.
- ❓ Hoe vaak wordt de CAO geüpdate? Bepaalt of we per jaar of per kwartaal een re-ingest moeten doen.
- ❓ Welke aansprakelijkheid neemt de afnemer voor verkeerde antwoorden? Disclaimers afdoende?
- ❓ Multi-tenancy: één bot voor meerdere uitzendbureaus, of per klant aparte instance?

---