# CAO Chatbot — Architectuur

### 🔗 Live demo

Test de bot via de publieke chat-UI: **[n8n.srv1594642.hstgr.cloud/webhook/10d81666-…/chat](https://n8n.srv1594642.hstgr.cloud/webhook/10d81666-f618-4781-8090-fef5eaac1ff7/chat)**

### Wat is gebouwd

Een AI-chatagent die vragen beantwoordt over de ABU CAO voor Uitzendkrachten 2026, met focus op de wijzigingen per 1 januari 2026. Bereikbaar via een ingebouwde chat-UI én een externe webhook. Bij twijfel of persoonlijke casuïstiek valt de bot terug op een Topdesk-handover.

Stack: **n8n** (workflows) · **Supabase pgvector** (kennisbank, dim 3072) · **Google Gemini** (embeddings + primary LLM) · **OpenAI-compat endpoint via Abacus** (fallback LLM + taaldetectie/vertaling) · **Cohere rerank-multilingual-v3** (reranking) · **GitHub** (source-of-truth voor Markdown).

### Architectuur op één regel

```
PDF → Markdown (GitHub) → n8n ingest → Supabase pgvector
                                              ↓
User → Chat UI / Webhook → n8n agent (RAG) → Antwoord + Bron
                              └─ bij twijfel → Topdesk-fallback
```

### Hoe het werkt — drie kernkeuzes

### 1. Structuur-bewuste chunking via Markdown

De CAO bevat artikelen in twee versies (huidig en na inwerkingtreding Wet meer zekerheid flexwerkers), toelichtingen, beslisbomen, tabellen en voetnoten. Naïeve PDF-extractie + size-based chunking vernietigt deze structuur.

Daarom een eenmalige preprocessing-stap: PDF → gestructureerde Markdown in een GitHub-repo, met YAML-frontmatter per document en `meta`-blocks per sectie. Headers (`## Artikel 14 - Fase A (na WMZF)`) bepalen de chunk-grenzen. Lange artikelen worden gesplitst op sub-secties zodat retrieval precies vindt wat gevraagd wordt. Schema's (zoals het werkingssfeer-schema op pagina 2) zijn omgezet naar genummerde beslisbomen in tekst — een LLM kan daar doorheen redeneren, een afbeelding niet.

### 2. Metadata-rijke retrieval met versie-filtering

Elke chunk krijgt rijke metadata mee: `artikel_nummer`, `hoofdstuk`, `versie` (`huidig` / `na_wmzf` / `n.v.t.`), `is_overgangsrecht`, `is_toelichting`, `behoort_bij_artikel` en meer.

Een aangepaste Postgres-functie `match_cao_chunks` doet vector search met **default filter `versie IN ('huidig', 'n.v.t.')`** — zo citeert de bot niet per ongeluk uit toekomstige wetsversies. Cohere rerank-multilingual-v3 ranked top-15 → top-6 voor extra precisie op juridische termen.

### 3. Strikte grounding met Topdesk-fallback

De system prompt eist dat elk antwoord uitsluitend op de teruggegeven passages is gebaseerd, met expliciete bronvermelding. Bij onvoldoende dekking of persoonlijke casuïstiek antwoordt de bot met een vaste fallback-zin, die een Switch-node detecteert en doorzet naar een Topdesk-respond (in dit prototype gemockt; in productie via REST API).

Voorbeeld output:

> Fase A duurt **52 gewerkte weken** waarin de uitzendkracht voor dezelfde uitzendonderneming heeft gewerkt. Onderbrekingen tellen niet mee, doorbetaalde vakantieweken wel.
> 
> 
> **Bron:** Hoofdstuk 2 > Artikel 14 - Rechtspositie (huidige versie)
> 

Voor niet-Nederlandstalige gebruikers detecteert een aparte LLM-call de taal, vertaalt de query naar NL voor retrieval, en vertaalt het antwoord terug — met disclaimer dat de Nederlandse CAO-tekst juridisch leidend is.

### Demo — 5 use cases

| # | Vraag | Wat het demonstreert |
| --- | --- | --- |
| 1 | *"Hoe lang duurt fase A?"* | Basis vector search + bronvermelding |
| 2 | *"Wat verandert er per 1 januari 2026 aan vakantiebijslag?"* | Kern van de opdracht: wijzigingen 2026 |
| 3 | *"Hoe lang is fase B?"* | Default versie-filter actief: bot antwoordt 3 jaar (huidig). `na_wmzf`-tekst blijft afgeschermd zolang de wet niet geldt |
| 4 | *"How long does phase A last?"* | Taaldetectie + vertaling EN → NL voor retrieval, NL → EN voor antwoord |
| 5 | *"Mijn werkgever betaalt mijn vakantiebijslag niet, wat nu?"* | Persoonlijke casus → Topdesk-fallback |

### Aannames

- **Subset van 14 artikelen** dekt de demo-cases; productie zou de volledige CAO + bijlagen bevatten.
- **Doelgroep**: uitzendkrachten en intercedenten, geen juristen — beknopte antwoorden in begrijpelijke taal met bronverwijzing voor verdieping.
- **Topdesk** is het bestaande ticketsysteem van de afnemende organisatie; in dit prototype wordt alleen de hand-off gedemonstreerd.
- **Versie-onderscheid** via metadata-filtering, niet via aparte tabellen — schaalt naar volgende CAO-cycli.
- **Embedding-dimensies (3072)** sluiten HNSW/IVFFlat indexen uit; voor de huidige schaal is sequential scan ruim snel genoeg.

### Verbeterpunten voor productie

- **Hybrid search** (vector + BM25) voor betere recall op exacte termen ("artikel 14 lid 2 sub a").
- **Geautomatiseerde PDF-naar-Markdown pipeline** met human-review stap voor jaarlijkse CAO-updates.
- **Echte Topdesk-integratie** via REST API met automatische context-overdracht.
- **Confidence-scoring op rerank-scores** in plaats van alleen tekstdetectie van de fallback-zin.
- **Logging en audit-trail**: koppel elk bot-antwoord aan de gebruikte chunk-IDs voor reproduceerbaarheid.
- **Volledige CAO + bijlagen** ingest in plaats van subset.

### Veiligheid en privacy

**Geïmplementeerd in dit prototype:**

- **Geen juridisch advies, geen persoonlijke casus**: bot verwijst direct door naar Topdesk. Voorkomt aansprakelijkheid en houdt bijzondere persoonsgegevens (gezondheidsklachten, ziekte) buiten de LLM-pipeline.
- **Sessie-isolatie**: unieke `sessionId` per gebruiker; chat-memory lekt niet tussen sessies.
- **Grounding als injection-mitigatie**: system prompt eist citaten uit retrieval, geen vrije generatie. Beperkt impact van eventuele kwaadaardige instructies in passages (in juridische tekst overigens onwaarschijnlijk).

**Voor productie nodig:**

- **Dataresidency**: Supabase EU-region; Google Gemini verwerkt data standaard buiten de EU — voor productie Vertex AI met EU-endpoint of Europese provider.
- **PII-redactie** vóór de LLM-call: BSN-patronen, e-mailadressen en telefoonnummers vervangen door placeholders.
- **Authenticatie en CORS**: API-key op de webhook, Basic Auth op de Chat Trigger, strikte CORS-policy. Prototype draait nu zonder auth voor demo-doeleinden.

---

**Knowledge base repo**: [github.com/M4TThys123/cao-knowledge-base](https://github.com/M4TThys123/cao-knowledge-base) (Markdown-bron). **n8n workflows**: live op de n8n-instance, exports buiten deze repo.