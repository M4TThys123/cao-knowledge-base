# CAO Knowledge Base

Markdown-bron + n8n-workflows + architectuurdocumentatie voor de **CAO Chatbot** — een RAG-prototype dat vragen beantwoordt over de ABU CAO voor Uitzendkrachten 2026-2028.

## 🔗 Live demo

Test de chatbot direct via de publieke chat-UI:

**[https://n8n.srv1594642.hstgr.cloud/webhook/10d81666-f618-4781-8090-fef5eaac1ff7/chat](https://n8n.srv1594642.hstgr.cloud/webhook/10d81666-f618-4781-8090-fef5eaac1ff7/chat)**

## Mappen

| Map | Inhoud |
|---|---|
| `content/` | De CAO als gestructureerde Markdown — één file per artikel, georganiseerd per hoofdstuk. Source-of-truth voor de retrieval. |
| `n8n/` | De twee n8n workflow-exports (ingest + chat agent). Zie `n8n/README.md`. |
| `docs/` | Architectuurbeschrijving, demo use-cases, sketch-notes voor presentatie en roadmap. Begin bij `docs/architechtuur.md`. |

## Bron

Subset van de officiële ABU CAO 2026 (looptijd 1 januari 2026 t/m 31 december 2028). 14 artikelen die de demo-cases dekken — niet de volledige CAO.

## Conventies

- **H1** = hoofdstuk · **H2** = artikel of sub-sectie van een lang artikel · **H3** = blok binnen een chunk
- Lange artikelen splitsen op meerdere H2's met gedeelde `artikel`-meta maar verschillende `subsectie`
- Versies (`huidig` vs `na_wmzf`) zijn aparte H2's, gefilterd op metadata in de Postgres RPC

## Metadata

Elk bestand heeft YAML-frontmatter met defaults. Per H2 staat een ` ```meta ` codeblok:

| Veld | Beschrijving |
|---|---|
| `artikel` | Artikelnummer |
| `versie` | `huidig` of `na_wmzf` |
| `subsectie` | Optioneel, voor opgesplitste artikelen |
| `is_toelichting` | `true` voor toelichtingen |
| `behoort_bij_artikel` | Bij toelichtingen: artikelnummer waar het bij hoort |

## Status

Prototype — 14 artikelen, 5 demo use-cases. Volledige CAO + bijlagen is een productiestap.
