/**
 * CAO Knowledge Base ingest - n8n Code node (TypeVersion 2)
 *
 * Plek in flow: tussen "GitHub Get File Content" (output) en "Supabase vector store insert" (input).
 *
 * INPUT (per item):
 *   {
 *     json: {
 *       path: "content/hoofdstuk-2-rechtspositie/artikel-14-rechtspositie.md",
 *       content: "<base64>",
 *       encoding: "base64"
 *     }
 *   }
 *
 * OUTPUT (één item per H2-chunk):
 *   {
 *     json: {
 *       content:  "[Source: ... | Section: Hoofdstuk X > Artikel Y > ...]\n\n<cleaned section markdown>",
 *       metadata: { doc_key, artikel_nummer, versie, subsectie, bronvermelding, chunk_id, chunk_group_id, ... }
 *     }
 *   }
 *
 * Helpers (inline, geen externe imports):
 *   - fnv1a64(str)              : 64-bit hash voor content/chunk-identificatie (idempotency)
 *   - parseYaml(text)           : mini YAML parser voor frontmatter — bool/int/inline-array coercie
 *   - slugify(s)                : URL-safe identifier
 *   - parseMetaBlock(section)   : extract ```meta``` codeblock met type coercie (bool/int/array)
 *   - removeMetaBlock(section)  : strip ```meta``` codeblock uit sectie-tekst
 *   - splitH1H2(text)           : split body op H1/H2 headings, code-fence aware
 *   - extractHeading(section)   : pak heading van eerste regel
 *   - parseArtikelStr(s)        : "20a" → { nummer: 20, str: "20a" }
 *   - parseVersionHint(s)       : "huidige versie" / "na WMZF" → 'huidig' / 'na_wmzf' / null
 *   - looksLikeSubsection(s)    : detecteer subsectie-keywords (Algemeen, Fase A, Tussenpoos, Overgangsrecht, Uitzondering...)
 *   - versieLabel(v)            : 'huidig' → 'huidige versie', 'na_wmzf' → 'na WMZF', 'n.v.t.' → null
 *
 * Geen async/await, geen fetch — pure sync data-transformatie.
 */

function fnv1a64(str) {
  let h = 0xcbf29ce484222325n;
  const p = 0x100000001b3n;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h ^= BigInt(code & 0xff);
    h = (h * p) & 0xffffffffffffffffn;
    h ^= BigInt((code >>> 8) & 0xff);
    h = (h * p) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

function parseYaml(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  const lines = m[1].split('\n');
  let currentKey = null;
  let currentArrayItem = null;
  for (const line of lines) {
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    if (/^\S/.test(line)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!kv) continue;
      currentKey = kv[1];
      currentArrayItem = null;
      let val = kv[2].trim();
      if (val === '') {
        fm[currentKey] = [];
      } else if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        fm[currentKey] = inner === '' ? [] : inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        if (val === 'true') fm[currentKey] = true;
        else if (val === 'false') fm[currentKey] = false;
        else if (/^-?\d+$/.test(val)) fm[currentKey] = parseInt(val, 10);
        else fm[currentKey] = val;
      }
    } else {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        const rest = trimmed.slice(2).trim();
        const kv = rest.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
        if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
        if (kv) {
          currentArrayItem = {};
          let v = kv[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          currentArrayItem[kv[1]] = v;
          fm[currentKey].push(currentArrayItem);
        } else {
          let v = rest;
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          fm[currentKey].push(v);
        }
      } else if (currentArrayItem) {
        const kv = trimmed.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
        if (kv) {
          let v = kv[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          currentArrayItem[kv[1]] = v;
        }
      }
    }
  }
  return { fm, body: m[2] };
}

function slugify(s) {
  if (!s) return null;
  let r = String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  r = r.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  return r || null;
}

function parseMetaBlock(section) {
  const re = /```meta\s*\n([\s\S]*?)\n```/;
  const m = section.match(re);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (val === '') {
      meta[kv[1]] = '';
    } else if (val === 'true') {
      meta[kv[1]] = true;
    } else if (val === 'false') {
      meta[kv[1]] = false;
    } else if (/^-?\d+$/.test(val)) {
      meta[kv[1]] = parseInt(val, 10);
    } else if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      meta[kv[1]] = inner === '' ? [] : inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      meta[kv[1]] = val;
    }
  }
  return meta;
}

function removeMetaBlock(section) {
  return section.replace(/```meta\s*\n[\s\S]*?\n```\n?/, '').trim();
}

function splitH1H2(text) {
  const lines = text.split('\n');
  let inFence = false;
  let current = [];
  const chunks = [];
  for (const line of lines) {
    if (/^(```|~~~)/.test(line.trim())) inFence = !inFence;
    const isH = !inFence && /^#{1,2}\s+/.test(line) && !/^#{3,}\s+/.test(line);
    if (isH && current.length > 0) {
      const c = current.join('\n').trim();
      if (c) chunks.push(c);
      current = [];
    }
    current.push(line);
  }
  const tail = current.join('\n').trim();
  if (tail) chunks.push(tail);
  return chunks;
}

function extractHeading(section) {
  const first = (section.split('\n')[0] || '').trim();
  const m = first.match(/^(#{1,2})\s+(.*)$/);
  if (!m) return { level: null, text: null };
  return { level: m[1].length, text: m[2].trim() };
}

function parseArtikelStr(s) {
  const m = String(s).trim().match(/^(\d+)([a-z]?)$/i);
  if (!m) return { nummer: null, str: String(s) };
  return { nummer: parseInt(m[1], 10), str: m[1] + (m[2] || '').toLowerCase() };
}

function parseVersionHint(s) {
  if (!s) return null;
  const v = String(s).toLowerCase().trim();
  if (v === 'huidig' || v === 'huidige' || v === 'huidige versie') return 'huidig';
  if (v === 'na_wmzf' || v === 'na wmzf' || v === 'na de wmzf') return 'na_wmzf';
  return null;
}

function looksLikeSubsection(s) {
  if (!s) return false;
  const t = String(s).trim();
  const known = ['Algemeen', 'Fase A', 'Fase B', 'Fase C', 'Tussenpoos', 'Overgangsrecht'];
  if (known.indexOf(t) !== -1) return true;
  if (/^Uitzondering(\s|$)/i.test(t)) return true;
  return false;
}

function versieLabel(v) {
  if (v === 'huidig') return 'huidige versie';
  if (v === 'na_wmzf') return 'na WMZF';
  return null;
}

const items = $input.all();
const out = [];
const now = new Date().toISOString();

for (const item of items) {
  const source = item.json.path || 'unknown.md';
  const base64 = item.json.content || '';
  const encoding = item.json.encoding || 'base64';
  const text = encoding === 'base64'
    ? Buffer.from(base64, 'base64').toString('utf-8')
    : base64;

  const contentHash = fnv1a64(text);
  const { fm, body } = parseYaml(text);

  if (!fm.doc_key) throw new Error('Missing doc_key in ' + source);
  if (fm.parent_hoofdstuk === undefined || fm.parent_hoofdstuk === null) throw new Error('Missing parent_hoofdstuk in ' + source);
  if (!fm.parent_hoofdstuk_titel) throw new Error('Missing parent_hoofdstuk_titel in ' + source);

  const docKey = fm.doc_key;
  const defaultVersie = fm.default_versie || 'huidig';
  const hoofdstuk = fm.parent_hoofdstuk;
  const hoofdstukTitel = fm.parent_hoofdstuk_titel;

  const sections = splitH1H2(body);

  let h1Text = null;
  for (const s of sections) {
    const h = extractHeading(s);
    if (h.level === 1) { h1Text = h.text; break; }
  }
  if (!h1Text) h1Text = fm.doc_title || docKey;

  // Pre-scan: bouw artikelTitelMap (str → titel) en versionsByArtikel (str → Set<versie>)
  // Zo weet de bronvermelding-builder of er meerdere versies van hetzelfde artikel zijn.
  const artikelTitelMap = new Map();
  const versionsByArtikel = new Map();
  for (const s of sections) {
    const h = extractHeading(s);
    if (!h.text || h.level !== 2) continue;
    const m = h.text.match(/^Artikel\s+(\d+[a-z]?)\s*-\s*(.+?)(?:\s*\((.+?)\))?$/i);
    if (!m) continue;
    const parsed = parseArtikelStr(m[1]);
    const groep2 = m[2].trim();
    const groep3 = m[3] ? m[3].trim() : null;
    const sectionMeta = parseMetaBlock(s);
    const vHint = parseVersionHint(groep3);
    const v = (sectionMeta && sectionMeta.versie) || vHint || defaultVersie;
    if (!looksLikeSubsection(groep2) && !artikelTitelMap.has(parsed.str)) {
      artikelTitelMap.set(parsed.str, groep2);
    }
    if (!versionsByArtikel.has(parsed.str)) versionsByArtikel.set(parsed.str, new Set());
    versionsByArtikel.get(parsed.str).add(v);
  }

  let chunkIndex = 0;
  for (const sectionRaw of sections) {
    const heading = extractHeading(sectionRaw);
    if (heading.level === 1) continue; // skip hoofdstuk-heading
    if (!heading.text) continue;

    const meta = parseMetaBlock(sectionRaw);
    const cleaned = removeMetaBlock(sectionRaw);

    // Skip lege secties (alleen heading, geen body)
    const bodyAfterHeading = cleaned.split('\n').slice(1).join('\n').trim();
    if (!bodyAfterHeading) continue;

    const headingText = heading.text;
    const isToelichting = /^Toelichting\b/i.test(headingText) || (meta && meta.is_toelichting === true);

    // Heading parsing: "Artikel X - Titel (parenthetical)"
    const artikelMatch = headingText.match(/^Artikel\s+(\d+[a-z]?)\s*-\s*(.+?)(?:\s*\((.+?)\))?$/i);
    let artikelNummer = null;
    let artikelStr = null;
    let groep2 = null;
    let groep3 = null;
    if (artikelMatch) {
      const parsed = parseArtikelStr(artikelMatch[1]);
      artikelNummer = parsed.nummer;
      artikelStr = parsed.str;
      groep2 = artikelMatch[2].trim();
      groep3 = artikelMatch[3] ? artikelMatch[3].trim() : null;
    }

    // Override of fallback artikel-info uit meta-block
    if (meta && meta.artikel !== undefined && meta.artikel !== '') {
      const parsed = parseArtikelStr(String(meta.artikel));
      if (parsed.nummer !== null) artikelNummer = parsed.nummer;
      if (parsed.str) artikelStr = parsed.str;
    }

    // Toelichting: behoort_bij_artikel verplicht
    let behoortBijArtikel = null;
    if (isToelichting) {
      if (!meta || meta.behoort_bij_artikel === undefined) {
        throw new Error('Toelichting "' + headingText + '" in ' + source + ' mist behoort_bij_artikel in meta-block');
      }
      behoortBijArtikel = parseInt(String(meta.behoort_bij_artikel), 10);
      if (artikelNummer === null) artikelNummer = behoortBijArtikel;
      if (artikelStr === null) artikelStr = String(behoortBijArtikel);
    } else if (meta && meta.behoort_bij_artikel !== undefined) {
      behoortBijArtikel = parseInt(String(meta.behoort_bij_artikel), 10);
    }

    // Versie (prio: meta → groep3 hint → frontmatter default → 'huidig')
    let versie = null;
    if (meta && meta.versie) {
      versie = String(meta.versie);
    } else if (groep3) {
      versie = parseVersionHint(groep3);
    }
    if (!versie) versie = defaultVersie;
    if (['huidig', 'na_wmzf', 'n.v.t.'].indexOf(versie) === -1) {
      throw new Error('Invalid versie "' + versie + '" in ' + source + ' section "' + headingText + '"');
    }

    // Subsectie (canonical key — voor filtering in metadata)
    let subsectie = null;
    if (meta && meta.subsectie) {
      subsectie = String(meta.subsectie);
    } else if (groep2 && looksLikeSubsection(groep2)) {
      subsectie = groep2;
    }

    // Subsectie display label (voor bronvermelding — leesbare vorm)
    let subsectieDisplay = null;
    if (groep2 && looksLikeSubsection(groep2)) {
      const groep3IsVersion = groep3 && parseVersionHint(groep3) !== null;
      if (groep3 && !groep3IsVersion) {
        // groep3 is contextueel label (bv. artikel 36a), voeg toe achter groep2
        subsectieDisplay = groep2 + ' (' + groep3 + ')';
      } else {
        subsectieDisplay = groep2;
      }
    }
    if (!subsectieDisplay && subsectie) {
      // Fallback: humanize meta.subsectie
      let h = String(subsectie).replace(/_/g, ' ');
      subsectieDisplay = h.charAt(0).toUpperCase() + h.slice(1);
    }

    // Artikel titel (prio: frontmatter → pre-scan map → groep2 fallback)
    let artikelTitel = null;
    if (artikelNummer !== null) {
      if (fm['artikel_titel_' + artikelNummer]) {
        artikelTitel = fm['artikel_titel_' + artikelNummer];
      } else if (artikelStr && artikelTitelMap.has(artikelStr)) {
        artikelTitel = artikelTitelMap.get(artikelStr);
      } else if (groep2) {
        artikelTitel = groep2;
      }
    }

    // Geldigheidstermijn (uit meta of afgeleid van versie)
    let geldigVanaf = (meta && meta.geldig_vanaf) ? String(meta.geldig_vanaf) : null;
    let geldigTot = (meta && meta.geldig_tot) ? String(meta.geldig_tot) : null;
    if (versie === 'huidig' && !geldigTot) geldigTot = 'inwerkingtreding_wmzf';
    if (versie === 'na_wmzf' && !geldigVanaf) geldigVanaf = 'inwerkingtreding_wmzf';

    // Booleans
    const isOvergangsrecht = (meta && meta.is_overgangsrecht === true) ||
                             /^Artikel\s+\d+[a-z]?\s*-\s*Overgangsrecht/i.test(headingText) ||
                             (subsectie === 'Overgangsrecht' || subsectie === 'overgangsrecht');
    const bevatTabel = !!(meta && meta.bevat_tabel === true);
    const bevatSchema = !!(meta && (meta.bevat_schema === true || meta.is_schema === true));

    // Verwijst naar
    let verwijstNaar = [];
    if (meta && meta.verwijst_naar !== undefined) {
      verwijstNaar = Array.isArray(meta.verwijst_naar)
        ? meta.verwijst_naar
        : [String(meta.verwijst_naar)];
    }

    // chunk_group_id: artikel-X-versie cluster
    const chunkGroupId = artikelNummer !== null
      ? docKey + '::artikel-' + (artikelStr || artikelNummer) + '-' + versie
      : docKey + '::' + (slugify(headingText) || ('section-' + chunkIndex));

    // Bronvermelding (breadcrumb)
    let bronvermelding;
    const vLabel = versieLabel(versie);
    if (isToelichting && artikelNummer !== null) {
      const toelichtingTitel = headingText.replace(/\s*\([^)]*\)\s*$/, '').trim();
      bronvermelding = 'Hoofdstuk ' + hoofdstuk + ' > Artikel ' + (artikelStr || artikelNummer) + ' > ' + toelichtingTitel;
    } else if (!artikelMatch && artikelNummer !== null) {
      // Special section (schema/bijlage) - heading gebruiken zoals geschreven
      bronvermelding = 'Hoofdstuk ' + hoofdstuk + ' > Artikel ' + (artikelStr || artikelNummer) + ' > ' + headingText;
    } else if (subsectieDisplay && artikelNummer !== null) {
      const suffix = vLabel ? ' (' + vLabel + ')' : '';
      bronvermelding = 'Hoofdstuk ' + hoofdstuk + ' > Artikel ' + (artikelStr || artikelNummer) + ' > ' + subsectieDisplay + suffix;
    } else if (artikelNummer !== null && artikelTitel) {
      const versions = versionsByArtikel.get(artikelStr);
      const includeVersie = versions && versions.size > 1 && vLabel;
      const suffix = includeVersie ? ' (' + vLabel + ')' : '';
      bronvermelding = 'Hoofdstuk ' + hoofdstuk + ' > Artikel ' + (artikelStr || artikelNummer) + ' - ' + artikelTitel + suffix;
    } else {
      // Fallback (geen artikel info) — alleen hoofdstuk + heading
      bronvermelding = 'Hoofdstuk ' + hoofdstuk + ' > ' + headingText;
    }

    // section_path: hiërarchie voor display/debug
    const sectionPath = [hoofdstukTitel, headingText];

    // parent_section: slug van heading
    const parentSection = slugify(headingText) || ('section-' + chunkIndex);

    // Hashes & ID
    const chunkHash = fnv1a64(cleaned);
    const chunkId = docKey + ':' + contentHash.slice(0, 12) + ':' + chunkIndex;

    // Content prefix
    const prefix = '[Source: ' + source + ' | Section: ' + bronvermelding + ']\n\n';
    const finalContent = prefix + cleaned;

    const metadata = {
      // Identifiers
      doc_key: docKey,
      doc_title: fm.doc_title || h1Text,
      source: source,
      chunk_id: chunkId,
      chunk_index: chunkIndex,
      chunk_group_id: chunkGroupId,
      chunk_hash: chunkHash,
      content_hash: contentHash,

      // CAO-specifiek
      artikel_nummer: artikelNummer,
      artikel_str: artikelStr,
      artikel_titel: artikelTitel,
      hoofdstuk: hoofdstuk,
      hoofdstuk_titel: hoofdstukTitel,
      subsectie: subsectie,
      versie: versie,
      geldig_vanaf: geldigVanaf,
      geldig_tot: geldigTot,
      is_overgangsrecht: isOvergangsrecht,
      is_toelichting: isToelichting,
      behoort_bij_artikel: behoortBijArtikel,
      bevat_tabel: bevatTabel,
      bevat_schema: bevatSchema,
      verwijst_naar: verwijstNaar,

      // Heading info
      parent_section: parentSection,
      section_path: sectionPath,
      heading_level: heading.level,
      heading_text: headingText,
      bronvermelding: bronvermelding,

      // Optional frontmatter passthrough
      topic: fm.topic || null,
      tags: fm.tags || [],
      doc_version: fm.doc_version || null,
      looptijd_start: fm.looptijd_start || null,
      looptijd_eind: fm.looptijd_eind || null,
      access_level: (meta && meta.access_level) || fm.default_access_level || 'public',

      // Embedding model info
      model_name: 'gemini-embedding-001',
      model_dim: 3072,

      // Raw content (zonder prefix) - voor debug/inspectie
      content_raw: cleaned,

      // Timestamps
      created_at: now,
      updated_at: now
    };

    out.push({ json: { content: finalContent, metadata: metadata } });
    chunkIndex++;
  }
}

return out;
