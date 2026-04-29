# n8n workflows

- **`CAO KB Ingest v1.json`** — leest de Markdown in deze repo, chunked op H2, embeddet en schrijft naar Supabase `cao_chunks`.
- **`CAO Chat Agent v1.json`** — chat-agent met taaldetectie, RAG over `cao_chunks` en Topdesk-fallback. Bereikbaar via webhook + Chat Trigger.
