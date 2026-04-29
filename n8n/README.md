# n8n artefacten

Snapshots van de twee n8n workflows die op de CAO Chatbot draaien. Live workflows staan op de n8n-instance, hier voor archief en review.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `code-node-cao-ingest.js` | JavaScript van de Code node "Parse + Chunk + Enrich" in de ingest workflow. Parseert YAML-frontmatter + per-H2 ` ```meta ` block, splitst op H1/H2 (code-fence aware), bouwt CAO-specifieke metadata (artikel_nummer, versie, subsectie, bronvermelding, etc.). Output: één chunk per H2-sectie, klaar voor de Supabase vector store insert. |
| `cao-ingest-workflow.json` | Initiële export van de ingest workflow (Manual Trigger → Truncate → 4× GitHub list → Merge → Filter → Get → Code → Insert cao_chunks). De live versie kan licht afwijken na latere edits. |
| `cao-chat-workflow.json` | Initiële export van de chat workflow (POST `/cao-chat` webhook). De live workflow heeft inmiddels ook een **Chat Trigger** entry-point + Source Switch — niet in deze export. |
| `test-output-sample.json` | Mentale trace door `artikel-14-rechtspositie.md`: 3 representatieve chunks + traces voor 7 andere files. Bedoeld om de chunking-logica te verifiëren zonder de Code node te draaien. |

## Live workflows

- **CAO KB Ingest v1** — manual trigger, ingest van de Markdown in deze repo naar Supabase `cao_chunks`
- **CAO Chat Agent v1** — webhook + chat-UI, RAG over `cao_chunks` met Cohere reranker, confidence-check, Topdesk-fallback

Voor de actuele node-graphs: open de workflows in de n8n-instance.
