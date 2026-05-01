

# Sketch-notes — CAO Chatbot demo

> Talking-points voor presentatie. Volg in volgorde of pak per blok.
> Detail in: **CAO-Chatbot-Architectuur.md**

---

## ① Het probleem

```
   PDF van CAO          juridische taal       wijzigingen
   (40+ pagina's)  →    + verschillende    →  per 1-1-2026
                        versies artikelen
```

- ABU CAO 2026 → grote pdf, complexe structuur
- HR-medewerkers / uitzendkrachten → **veel vragen**
- Nu: alles handmatig opzoeken
- Wens: **vraag stellen → antwoord + bron**

---

## ② Wat ik heb gebouwd

```
                    ┌────────────────┐
   Vraag  ────────► │   CAO Chatbot  │ ────►  Antwoord
                    │     (n8n)      │        + bronvermelding
                    └────────────────┘
                            │
                            ▼
                    bij twijfel → Topdesk
```

- Chat-UI **én** webhook (twee ingangen)
- Antwoord altijd met **bron** (artikel + lid)
- Niet weten? → ticket via Topdesk
- Stack: **n8n** + **Supabase** + **Gemini** + **Cohere**

---

## ③ Waarom dit zo werkt → 3 keuzes

### 🧱 Keuze 1 — Slimme chunks

```
   PDF  →  Markdown  →  per artikel = 1 chunk
                        + metadata (versie, hoofdstuk)
```

- PDF heeft schema's, tabellen, voetnoten → kapot bij naive split
- **Eerst PDF → Markdown** (eenmalig, in GitHub repo)
- Splits op `## Artikel X` headers
- Lange artikelen → opsplitsen op fase A/B/C

> "Naive chunking zou de juridische context vernietigen."

### 🎯 Keuze 2 — Versie-filter

```
   Artikel 14 huidig  ─┐
                        ├──► filter: versie = "huidig"
   Artikel 14 na WMZF ─┘    (default)
```

- Sommige artikelen hebben **2 versies** (nu vs na nieuwe wet)
- Bot pakt **alleen huidige versie** — `na_wmzf` blijft afgeschermd
- Gerealiseerd via **metadata-filter** in Postgres RPC
- Bidirectionele switch (vraag specifiek over toekomst) is een productie-uitbreiding (zie roadmap)

> "Voorkomt dat de bot per ongeluk uit een wet citeert die nog niet geldt."

### 🚦 Keuze 3 — Strikte grounding + fallback

```
   antwoord  ─┐
              ├──► alleen op basis van retrieval
   bron      ─┘    NOOIT verzinnen

   twijfel?  ────► "Maak ticket aan in Topdesk"
```

- Geen hallucinatie → **groundend op CAO-tekst**
- Elk antwoord eindigt met **Bron: Hoofdstuk X > Artikel Y**
- Persoonlijke casus / juridisch advies → **direct doorverwijzen**

> "Liever doorverwijzen dan iets verzinnen — zeker bij juridisch."

---

## ④ Demo

```
┌─ 1. Hoe lang duurt fase A?           [warming up]
│
├─ 2. Wat is een uitzendbeding?        [definities]
│
├─ 3. Hoe lang is fase B?              [default versie-filter]
│
├─ 4. Wijziging vakantiebijslag 2026?  [kern opdracht]
│
├─ 5. How long does phase A last?      [meertalig]
│
└─ 6. Werkgever betaalt niet?          [→ Topdesk]
```

> 6 vragen, ~10 min. Refereer naar **usecases.md** voor backup-vragen.

> ⚠️ Versie-switch ("en na de WMZF?") niet meer in demo — bidirectionele override zit niet in dit prototype. Zie `roadmap.md` → "Bekende beperkingen" voor de drie geplande opties.

---

## ⑤ Wat zou ik doen voor productie?

```
   nu (prototype)        →    productie
   ─────────────              ──────────
   14 artikelen          →    hele CAO + bijlagen
   handmatige Markdown   →    auto-pipeline + review
   Topdesk mock          →    echte API-call
   runtime vertaling     →    pre-vertaalde chunks
   alleen vector search  →    hybrid (BM25 + vector)
```

Plus:
- 🔒 **Privacy**: PII-redactie, EU-region, geen juridisch advies
- 📋 **Logging**: chunk-IDs per antwoord (audit trail)
- 🔑 **Auth**: API-key op webhook, Basic Auth op chat-UI

---

## 🎤 Sluittekst

> *"Het prototype laat zien dat de architectuur werkt voor de 5 use cases.
> Het is bewust een subset — niet de hele CAO — omdat de opdracht vroeg
> om mijn gedachtegang en architectuur, niet om een productie-bot.
> De keuzes zijn schaalbaar: meer artikelen toevoegen is alleen een
> nieuwe Markdown-file in GitHub + een rerun van de ingest workflow."*

---

## 💡 Tijdens demo onthouden

- Nieuwe **sessionId** per demo-blok (anders memory-pollutie)
- Bij meertalig: één werkende taal kiezen vooraf
- Bot antwoordt **traag** bij eerste vraag (cold start) → eerste vraag van tevoren stellen
- Refereer naar architectuur-doc bij diepe vragen