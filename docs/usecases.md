# CAO Chatbot — Demo Use Cases

Deze pagina bevat alle vragen voor de live demo. Elke vraag staat in een code-block zodat je 'm met één klik kunt kopiëren.

---

## Use Case 1 — Basis feitelijke vraag

**Wat het demonstreert:** vector search + grounding + bronvermelding.

### Hoofdvraag

```
Hoe lang duurt fase A?
```

### Backup-vragen

```
Wat is een uitzendbeding?
```

```
Wat zijn de verplichtingen van een uitzendkracht bij ziekmelding?
```

---

## Use Case 2 — Wijzigingen per 1 januari 2026

**Wat het demonstreert:** kern van de opdracht — bot pakt overgangsrecht-chunks.

### Hoofdvraag

```
Wat verandert er per 1 januari 2026 aan vakantiebijslag?
```

### Backup-vragen

```
Welke overgangsregels gelden er in 2026?
```

```
Wat is het verschil tussen de oude en nieuwe vakantiedagen-regeling?
```

---

## Use Case 3 — Versie-filter (defensief)

**Wat het demonstreert:** metadata-filtering schermt toekomstige wetgeving af — bot citeert standaard alleen de huidige versie. Voorkomt dat de bot uit een wet citeert die nog niet geldt.

### Hoofdvraag (default = huidige versie)

```
Hoe lang is fase B?
```

> Verwacht antwoord: 3 jaar (huidige versie), met bron Hoofdstuk 2 > Artikel 14.

### Backup-vraag

```
Wat verandert er aan fase B?
```

> De bot kan deze beantwoorden vanuit de system prompt context (waarin de WMZF-wijziging benoemd wordt), maar citeert geen `na_wmzf`-tekst — die is afgeschermd.

### ⚠️ Bekende beperking

Bidirectionele versie-override (vraag specifiek over post-WMZF en bot pakt `na_wmzf`-chunks) zit **niet** in dit prototype. Drie opties verkend in `roadmap.md` ("Bekende beperkingen prototype"). Aanbevolen voor productie: optie B (twee aparte `knowledge_base` tools, agent kiest).

---

## Use Case 4 — Meertaligheid

**Wat het demonstreert:** taaldetectie + vertaling van/naar Nederlands met behoud van juridische termen.

> **Let op:** meertaligheid is onstabiel. Niet alle talen geven consistent goede resultaten op juridische termen. Test van tevoren welke voor jouw demo werken en kies daar 1-2 favorieten uit. Gebruik per taal een **verse `sessionId`** om memory-pollutie tussen talen te voorkomen.

### Top tier — meestal stabiel

#### Engels

```
How long does phase A last?
```

```
What changes about vacation pay in 2026?
```

#### Duits

```
Wie lange dauert Phase A?
```

```
Was sind die Pflichten eines Leiharbeiters?
```

#### Frans

```
Combien de temps dure la phase A?
```

```
Quelles sont les obligations d'un intérimaire?
```

#### Spaans

```
¿Cuánto dura la fase A?
```

```
¿Qué cambia respecto a las vacaciones en 2026?
```

#### Italiaans

```
Quanto dura la fase A?
```

```
Quali sono i diritti di un lavoratore interinale?
```

### Mid tier — meestal goed, soms wankel

#### Pools

```
Jak długo trwa faza A?
```

```
Jakie są prawa pracownika tymczasowego?
```

#### Portugees

```
Quanto tempo dura a fase A?
```

```
Quais são as mudanças em 2026?
```

#### Roemeens

```
Cât durează faza A?
```

```
Care sunt drepturile unui lucrător temporar?
```

#### Turks

```
Faz A ne kadar sürer?
```

```
Geçici işçinin hakları nelerdir?
```

#### Bulgaars

```
Колко дълго продължава фаза А?
```

```
Какви са правата на временния работник?
```

### Lower tier — minder voorspelbaar

#### Hongaars

```
Meddig tart az A fázis?
```

```
Mik a kölcsönzött munkavállaló kötelezettségei?
```

#### Tsjechisch

```
Jak dlouho trvá fáze A?
```

```
Jaké jsou povinnosti pracovníka agentury?
```

#### Slowaaks

```
Ako dlho trvá fáza A?
```

```
Aké sú práva dočasného pracovníka?
```

#### Litouws

```
Kiek trunka A fazė?
```

```
Kokios yra laikinojo darbuotojo teisės?
```

### Buiten Europa — extra moeilijkheidsgraad

#### Arabisch

```
كم تستمر المرحلة أ؟
```

```
ما هي حقوق العامل المؤقت؟
```

#### Mandarijn

```
A 阶段持续多久？
```

```
临时工人的权利是什么？
```

#### Hindi

```
फ़ेज़ A कितने समय तक चलता है?
```

```
अस्थायी कर्मचारी के अधिकार क्या हैं?
```

#### Japans

```
フェーズAはどのくらい続きますか？
```

```
派遣労働者の権利は何ですか？
```

---

## Use Case 5 — Topdesk-fallback

**Wat het demonstreert:** bot herkent z'n grenzen en verwijst door — geen verzonnen antwoorden.

### Hoofdvraag (persoonlijke casus)

```
Mijn werkgever betaalt mijn vakantiebijslag niet, wat nu?
```

### Backup-vragen

```
Kan ik mijn uitzendbureau aanklagen wegens contractbreuk?
```

```
Hoeveel vakantiedagen krijg ik bij FNV?
```

---

## Aanbevolen demo-volgorde

Voor een live demo van ~10 minuten, zes vragen achter elkaar:

| Stap | Vraag | Use case |
|---|---|---|
| 1 | Hoe lang duurt fase A? | UC1 — warming up |
| 2 | Wat is een uitzendbeding? | UC1 — definities |
| 3 | Hoe lang is fase B? | UC3 — default versie-filter |
| 4 | Wat verandert er per 1 januari 2026 aan vakantiebijslag? | UC2 — kern opdracht |
| 5 | How long does phase A last? | UC4 — meertalig |
| 6 | Mijn werkgever betaalt mijn vakantiebijslag niet, wat nu? | UC5 — fallback |

> Originele "vraag 4 — versie-override" verwijderd: bidirectionele versie-switching zit niet in dit prototype (zie `roadmap.md` → "Bekende beperkingen prototype").

**Tip:** gebruik per demo-fragment een **verse `sessionId`** om memory-pollutie tussen talen te voorkomen.

```