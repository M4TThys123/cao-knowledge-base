# CAO Knowledge Base

Markdown-bron van een subset van de **ABU CAO voor Uitzendkrachten 2026**, gestructureerd voor RAG-ingest in n8n + Supabase pgvector.

## Bron

`document_pdf.pdf` in de bovenliggende map (officiële ABU CAO 2026, looptijd 1 januari 2026 t/m 31 december 2028).

## Subset

Deze knowledge base bevat geen volledige CAO maar een werkende subset van ~15 artikelen die de demo-cases van het prototype dekken. Volledige lijst zie `prompt.md` in de bovenliggende map.

## Structuur

```
cao-knowledge-base/
└── content/
    ├── hoofdstuk-1-algemeen/
    │   ├── artikel-01-werkingssfeer.md
    │   └── artikel-02-definities.md
    ├── hoofdstuk-2-rechtspositie/
    │   ├── artikel-13-aangaan.md
    │   ├── artikel-14-rechtspositie.md
    │   └── artikel-18-einde.md
    └── ...
```

## Conventies

- **H1** = hoofdstuk
- **H2** = artikel (één artikel = één chunk na ingest)
- **H3** = sub-sectie binnen artikel (telt mee in dezelfde chunk)

Lange artikelen worden over meerdere H2's gesplitst met dezelfde `artikel`-metadata maar verschillende `subsectie`. Versies van artikelen (bv. huidig vs na inwerkingtreding Wet meer zekerheid flexwerkers) zijn aparte H2's met `versie: huidig` of `versie: na_wmzf`.

## Metadata

Elk bestand heeft YAML-frontmatter met defaults voor het hele bestand. Per H2 staat een ` ```meta ` codeblok met artikel-specifieke velden:

| Veld | Beschrijving |
|---|---|
| `artikel` | Artikelnummer |
| `versie` | `huidig` of `na_wmzf` |
| `subsectie` | Optioneel, voor opgesplitste artikelen |
| `is_toelichting` | `true` voor toelichtingen |
| `behoort_bij_artikel` | Bij toelichtingen: artikelnummer waar het bij hoort |

## Status

Wordt incrementeel opgebouwd, artikel voor artikel.
