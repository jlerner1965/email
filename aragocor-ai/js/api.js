/* api.js — both engines.

   OFFLINE is the default. It answers out of catalog.js and
   calculator.js: assays, grades, sieve and micron conversion, packing,
   container counts, cargo care and Incoterms. No key, no network.

   LIVE calls Google Gemini with the catalog injected into the system
   instruction, so answers stay inside the published spec ranges instead
   of inventing figures. If a live call fails for any reason the offline
   engine answers instead — the buyer never sees an error where an
   answer should be. */

window.Desk = (function () {

  var ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

  /* ══ shared reference data ═══════════════════════════════════ */

  /* ASTM E11 / ISO 565 nominal openings. */
  var SIEVE = [
    [10, 2000], [16, 1180], [20, 850], [30, 600], [40, 425], [50, 300],
    [60, 250], [70, 212], [80, 180], [100, 150], [120, 125], [140, 106],
    [170, 90], [200, 75], [230, 63], [270, 53], [325, 45], [400, 38],
    [450, 32], [500, 25], [635, 20]
  ];

  var INCOTERMS = {
    EXW: {
      name: 'Ex Works',
      risk: 'At our gate, the moment the goods are placed at your disposal.',
      seller: 'Make the goods available, packed and marked. Nothing else.',
      buyer: 'Loading, export clearance, all carriage, all insurance, import clearance.',
      note: 'The most buyer-heavy term there is. You cannot export-clear in our name, so in practice FCA does what most buyers actually want from EXW.'
    },
    FCA: {
      name: 'Free Carrier',
      risk: 'When the goods are handed to your carrier — loaded at our works, or unloaded at the named place.',
      seller: 'Export clearance and delivery to the named carrier or place.',
      buyer: 'Main carriage, insurance, import clearance and duties.',
      note: 'The right term for containerised cargo. Incoterms 2020 added the option to require an on-board bill of lading under FCA, which fixes the old letter-of-credit problem.'
    },
    FOB: {
      name: 'Free on Board',
      risk: 'When the goods are on board the vessel at the load port.',
      seller: 'Export clearance, terminal handling at origin, loading on board.',
      buyer: 'Ocean freight, insurance, discharge, import clearance and duties.',
      note: 'Sea and inland waterway only. For containers the cargo leaves our control at the terminal gate, days before it is on board — FCA describes that honestly, FOB does not.'
    },
    CFR: {
      name: 'Cost and Freight',
      risk: 'On board at the load port — not at destination, despite the name.',
      seller: 'Export clearance and ocean freight to the named destination port.',
      buyer: 'Insurance, discharge charges where not in the freight, import clearance and duties.',
      note: 'The split between cost and risk is the thing to hold on to: we pay to get it there, you carry the risk from the moment it is loaded.'
    },
    CIF: {
      name: 'Cost, Insurance and Freight',
      risk: 'On board at the load port, exactly as CFR.',
      seller: 'Export clearance, ocean freight and marine insurance to the named destination port.',
      buyer: 'Discharge where not in the freight, import clearance and duties.',
      note: 'The default insurance under Incoterms 2020 is minimum cover — Institute Cargo Clauses (C). If you want all-risks, say ICC (A) on the order and we will price it.'
    },
    DAP: {
      name: 'Delivered at Place',
      risk: 'At the named place, with the goods ready for unloading.',
      seller: 'Everything to the named place: freight, insurance in practice, and all risk until arrival.',
      buyer: 'Unloading, import clearance, duties and taxes.',
      note: 'Import clearance stays with you. If you need us to clear and pay duty as well, that is DDP, and we price it per destination.'
    }
  };

  /* ══ offline engine ══════════════════════════════════════════ */

  function num(v, dp) {
    var s = Number(v).toFixed(dp == null ? 0 : dp);
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }

  function table(head, rows) {
    return '| ' + head.join(' | ') + ' |\n' +
      '| ' + head.map(function () { return '---'; }).join(' | ') + ' |\n' +
      rows.map(function (r) { return '| ' + r.join(' | ') + ' |'; }).join('\n');
  }

  /* ── sections of a mineral profile ─────────────────────────── */

  var SECTIONS = {
    assay: function (m) {
      return '#### Typical assay — ' + m.name + '\n' +
        table(['Component', 'Typical range'], m.assay) + '\n' +
        'Production ranges, not a guarantee. Every shipment travels with its own COA against the agreed specification.';
    },
    grades: function (m) {
      return '#### Grades\n' +
        m.grades.map(function (g) { return '- ' + g; }).join('\n');
    },
    sizes: function (m) {
      return '#### Sizes offered\n' +
        m.sizes.map(function (s) { return '- ' + s; }).join('\n') +
        '\nOther cuts are made to order — tell us the top size and the fines tolerance.';
    },
    packing: function (m) {
      return '#### Packing\n' +
        m.packing.map(function (p) {
          var pk = Catalog.packs[p];
          return '- ' + pk.label + (pk.bulk ? '' : ' — ' + pk.perBox + ' per 20′ GP before weight or cube bite');
        }).join('\n');
    },
    care: function (m) {
      return '#### Cargo care\n' + m.care;
    },
    uses: function (m) {
      return '#### Applications\n' + m.uses;
    },
    freight: function (m) {
      return '#### Freight basis\n' +
        'Bulk density ' + m.density.toFixed(2) + ' t/m³ as packed. ' +
        'A 20′ GP takes ' + Freight.box.payloadMT + ' MT or ' + Freight.box.cubeM3 +
        ' m³, whichever runs out first — ask me for a container count on your tonnage and I will do the split.';
    }
  };

  var SECTION_TESTS = [
    ['assay', /assay|analys|spec\b|specs|specifi|chemistr|chemical|coa\b|composition|purity|impurit|fe2o3|sio2|content/],
    ['grades', /grade|quality|qualities|what.*(offer|supply|available)/],
    ['sizes', /\bsize|mesh|micron|granulo|particle|\bd50\b|\bcut\b|fineness/],
    ['packing', /pack|bag\b|bags|fibc|jumbo|sack|liner|drum|bulk\b/],
    ['care', /care|storage|store|moisture|damp|cake|caking|humid|handling|shelf|stow/],
    ['uses', /\buse\b|uses|application|what.*for|industr|suitable/],
    ['freight', /freight|container|cube|density|stow|shipment|load/]
  ];

  function profile(m, keys) {
    var parts = keys.map(function (k) { return SECTIONS[k](m); });
    parts.push('---\nWant this priced? Press **Request quote** and it goes to the desk with a tracking ID.');
    return parts.join('\n\n');
  }

  /* ── question handlers, first match wins ───────────────────── */

  function meshAnswer(q) {
    var toMicron = /(\d{2,4})\s*(?:#|mesh)/.exec(q);
    var toMesh = /(\d{1,4})\s*(?:µm|um|micron|microns|micrometre|micrometer)/.exec(q);

    if (toMicron) {
      var mesh = Number(toMicron[1]);
      var hit = null;
      for (var i = 0; i < SIEVE.length; i++) if (SIEVE[i][0] === mesh) hit = SIEVE[i][1];
      var body = hit
        ? '**' + mesh + ' mesh = ' + hit + ' µm** (' + (hit / 1000).toFixed(3) + ' mm) on the US standard series.'
        : '**' + mesh + ' mesh ≈ ' + Math.round(14290 / mesh) + ' µm.** That size is not a standard US sieve, ' +
          'so it is the approximation, not a table value — the nearest standard cuts are below.';
      return '#### Sieve conversion\n' + body + '\n\n' +
        table(['Mesh', 'Opening'], nearRows(mesh)) + '\n' +
        'A mesh number is an opening, not a distribution. "200 mesh" in a mineral spec almost always means ' +
        '*passing* 200 mesh with a stated retention — for example ≤ 3% retained on 75 µm. Ask for the ' +
        'retention figure whenever it is not written down.';
    }

    if (toMesh) {
      var um = Number(toMesh[1]);
      var best = SIEVE[0], gap = Infinity;
      SIEVE.forEach(function (r) {
        var d = Math.abs(r[1] - um);
        if (d < gap) { gap = d; best = r; }
      });
      return '#### Sieve conversion\n' +
        '**' + um + ' µm ≈ ' + best[0] + ' mesh** (' + best[1] + ' µm on the US standard series' +
        (gap ? ', the nearest standard cut' : '') + ').\n\n' +
        table(['Mesh', 'Opening'], nearRows(best[0])) + '\n' +
        'Below about 400 mesh, sieving stops being the right measurement. Micronised grades are specified ' +
        'on laser diffraction as D50 and D97 instead.';
    }
    return null;
  }

  function nearRows(mesh) {
    var idx = 0, gap = Infinity;
    SIEVE.forEach(function (r, i) {
      var d = Math.abs(r[0] - mesh);
      if (d < gap) { gap = d; idx = i; }
    });
    return SIEVE.slice(Math.max(0, idx - 2), idx + 3).map(function (r) {
      return [r[0] + ' mesh', r[1] + ' µm'];
    });
  }

  function packFromText(q) {
    if (/\bbulk\b|liner/.test(q) && !/jumbo|fibc|bag/.test(q)) return 'bulk';
    if (/1\.5\s*(?:mt|t\b|tonne|ton)|1500\s*kg/.test(q)) return 'jumbo15';
    if (/1\.25\s*(?:mt|t\b|tonne|ton)|1250\s*kg/.test(q)) return 'jumbo125';
    if (/25\s*kg/.test(q)) return 'paper25';
    if (/50\s*kg/.test(q)) return 'pp50';
    if (/jumbo|fibc|big\s*bag|1\.0\s*(?:mt|t\b)|1\s*(?:mt|tonne|ton)\s*bag/.test(q)) return 'jumbo1';
    return 'jumbo1';
  }

  function portFromText(q, list) {
    var hit = null;
    list.forEach(function (p) {
      var plain = p.name.split(',')[0].toLowerCase();
      if (q.indexOf(plain) !== -1) hit = p.id;
    });
    return hit;
  }

  function containerAnswer(q, mineral) {
    if (!/container|box|boxes|20\s*(?:ft|foot|′|')|how many|fcl/.test(q)) return null;
    var t = /(\d[\d,]*(?:\.\d+)?)\s*(?:mt\b|t\b|tonne|tons?|metric\s*ton)/.exec(q);
    if (!t) return null;

    var tonnage = Number(t[1].replace(/,/g, ''));
    var m = mineral || Catalog.all[0];
    var destId = portFromText(q, Freight.destPorts);
    var loadId = portFromText(q, Freight.loadPorts) || Freight.loadPorts[0].id;

    var p = Freight.plan({
      tonnage: tonnage,
      mineralId: m.id,
      packId: packFromText(q),
      loadId: loadId,
      destId: destId || Freight.destPorts[0].id
    });

    var rows = [
      ['Containers', num(p.boxes) + ' × ' + Freight.box.code],
      ['Per container', p.pack.bulk ? num(p.perBoxMT, 1) + ' MT' : num(p.perBox) + ' × ' + p.pack.short],
      ['Total units', p.pack.bulk ? 'bulk in liner' : num(p.units) + ' × ' + p.pack.short],
      ['Shipped weight', num(p.shippedMT, p.pack.bulk ? 0 : 2) + ' MT'],
      ['Stowed cube', num(p.stowedCube, 1) + ' m³'],
      ['Payload used', num(p.payloadUse, 0) + '%'],
      ['Desiccant', p.polesPerBox + ' poles per box, ' + num(p.desiccantKg) + ' kg total']
    ];
    if (destId) rows.push(['Transit', p.transitDays ? p.transitDays + ' days ' + p.loadPort + ' → ' + p.destPort : 'no published rotation']);

    return '#### ' + num(tonnage) + ' MT ' + m.name + ' — ' + p.pack.label + '\n' +
      table(['', ''], rows) + '\n' +
      'The limit here is ' + Freight.limitText(p) + '.' +
      '\n\nThe **Freight** tab does this with a stowage diagram and a transit estimate, and turns the ' +
      'result straight into a quotation request.';
  }

  function incotermAnswer(q) {
    var found = null;
    Object.keys(INCOTERMS).forEach(function (k) {
      if (new RegExp('\\b' + k.toLowerCase() + '\\b').test(q)) found = k;
    });
    if (!found && !/incoterm/.test(q)) return null;

    if (!found) {
      return '#### Incoterms® 2020 we quote on\n' +
        table(['Term', 'Risk passes', 'We pay to'], Object.keys(INCOTERMS).map(function (k) {
          var t = INCOTERMS[k];
          return [k + ' — ' + t.name, t.risk.replace(/\.$/, ''),
            k === 'EXW' ? 'our gate' : k === 'FCA' ? 'the named carrier' : k === 'FOB' ? 'on board at origin' :
            k === 'DAP' ? 'the named place' : 'the destination port'];
        })) + '\n' +
        'Name a term and I will break it down. For containerised mineral cargo, **FCA** and **CIF** cover ' +
        'almost every case we ship.';
    }

    var t = INCOTERMS[found];
    return '#### ' + found + ' — ' + t.name + ' (Incoterms® 2020)\n' +
      table(['', ''], [
        ['Risk passes', t.risk],
        ['We arrange and pay', t.seller],
        ['You arrange and pay', t.buyer]
      ]) + '\n' + t.note +
      '\n\nWhichever term you pick, name the port or place with it — `' + found +
      ' Rotterdam` is a quotable instruction, `' + found + '` on its own is not.';
  }

  function listAnswer(q) {
    if (!/(what|which).*(mineral|product|supply|sell|offer|range|carry)|catalog|catalogue|list.*(mineral|product)|everything you/.test(q)) return null;
    return '#### The range\n' +
      table(['Mineral', 'Formula', 'Grades', 'Bulk density'], Catalog.all.map(function (m) {
        return [m.name, m.formula, String(m.grades.length), m.density.toFixed(2) + ' t/m³'];
      })) + '\n' +
      'Name any one of them for the assay, the grades and the packing. The **Catalog** tab has the same ' +
      'thing as cards you can filter by application.';
  }

  function careAnswer(q, mineral) {
    if (mineral) return null;   /* a named mineral gets its own care note */
    if (!/care|storage|store|moisture|damp|cake|caking|humid|desiccant|liner|shelf/.test(q)) return null;
    return '#### Cargo care, in general\n' +
      '- **Liners.** Every hygroscopic grade ships in a lined FIBC. Fluorspar acid grade and hydrous ' +
      'kaolin are the two that punish a missing liner hardest.\n' +
      '- **Desiccant.** Four 1 kg poles per 20′ box for a stable cargo, six to eight for a moisture-sensitive ' +
      'one, plus two more if the packing has no liner.\n' +
      '- **Container sweat.** Warm loading air condensing on a cold hull is what actually wets most cargo, ' +
      'not rain. It is worst on long north-bound sailings out of the tropics.\n' +
      '- **Stacking.** FIBCs at 1.0–1.5 MT are single-stacked floor-loaded. Palletised sacks do not ' +
      'double-stack at these weights, which is why palletised loads run out of floor before payload.\n' +
      '- **None of these are dangerous goods.** No IMDG class, no special declaration.\n\n' +
      'Name a mineral and I will give you its specific care note.';
  }

  function offline(text, files) {
    var q = String(text || '').toLowerCase();
    var mineral = Catalog.match(text);
    var note = '';

    if (files && files.length) {
      var names = files.map(function (f) { return f.name; }).join(', ');
      note = '#### Attachment\n' + 'I can see **' + names + '** but the offline engine cannot read documents. ' +
        'Add a Gemini key in **Settings → Intelligence engine** and I will read the COA or lab sheet against ' +
        'the published spec.\n\n---\n\n';
    }

    var answer =
      meshAnswer(q) ||
      containerAnswer(q, mineral) ||
      incotermAnswer(q) ||
      listAnswer(q) ||
      careAnswer(q, mineral);

    if (answer) return note + answer;

    if (mineral) {
      var wanted = SECTION_TESTS.filter(function (pair) { return pair[1].test(q); })
        .map(function (pair) { return pair[0]; });
      if (!wanted.length) wanted = ['assay', 'grades', 'sizes', 'packing', 'uses', 'care'];
      return note + profile(mineral, wanted);
    }

    return note + '#### I did not catch a mineral in that\n' +
      'The offline engine answers on what we actually publish. Try one of these:\n' +
      '- *Typical assay for acid-grade fluorspar*\n' +
      '- *How many 20′ containers for 640 MT of GCC in 1.0 MT bags*\n' +
      '- *Convert 325 mesh to microns*\n' +
      '- *What does CIF Rotterdam actually cover*\n' +
      '- *What minerals do you supply*\n\n' +
      'For open-ended technical questions, or to have a COA read against the spec, add a Gemini key in ' +
      '**Settings → Intelligence engine**.';
  }

  /* ══ live engine ═════════════════════════════════════════════ */

  function systemPrompt() {
    return [
      'You are the sourcing desk for Aragocor Minerals, an industrial minerals supplier.',
      'You are talking to a professional buyer, a technical buyer or a formulator.',
      '',
      'RULES',
      '1. Every figure you give for our products must come from the product data below.',
      '   Never invent an assay, a grade or a density. If a buyer asks for something outside',
      '   the published ranges, say it is outside standard production and offer to put the',
      '   question to the desk.',
      '2. Never quote a price, a freight rate or a delivery date. Prices come from the desk',
      '   against a quotation request.',
      '3. Say plainly that assays are typical production ranges and that every shipment ships',
      '   against its own COA, whenever you give assay figures.',
      '4. Transit times are planning estimates for sailing time only, not schedules.',
      '5. General mineralogy, processing, applications and Incoterms questions are yours to',
      '   answer from your own knowledge. Keep our product figures separate from that.',
      '6. When a buyer sounds ready to transact, point them at Request quote — it raises a',
      '   tracking ID and reaches the desk.',
      '',
      'FORMAT',
      'Short markdown. #### for headings. Pipe tables for assays and comparisons.',
      'Bullet lists over paragraphs. No preamble, no sign-off. Two hundred words is usually',
      'plenty; go longer only when the buyer asked for detail.',
      '',
      'FREIGHT BASIS',
      "20' GP at " + Freight.box.payloadMT + ' MT practical payload and ' + Freight.box.cubeM3 +
        ' m³ usable cube. A load is capped by whichever of weight, cube or floor space runs out first.',
      '',
      Catalog.brief()
    ].join('\n');
  }

  function partsFor(text, files) {
    var parts = [{ text: text || 'Please review the attached document against our published spec.' }];
    (files || []).forEach(function (f) {
      if (f.kind === 'text') {
        parts.push({ text: '\n\n--- attached: ' + f.name + ' ---\n' + f.data });
      } else {
        parts.push({ inline_data: { mime_type: f.mime, data: f.data } });
      }
    });
    return parts;
  }

  function readError(res, body) {
    var msg = 'HTTP ' + res.status;
    try {
      var j = JSON.parse(body);
      if (j.error && j.error.message) msg = j.error.message;
    } catch (e) { /* not JSON — keep the status */ }
    if (res.status === 400 && /API key not valid/i.test(msg)) msg = 'That API key is not valid.';
    if (res.status === 403) msg = 'The key was refused — check it is enabled for the Generative Language API.';
    if (res.status === 429) msg = 'Rate limit or quota reached on this key.';
    return new Error(msg);
  }

  function callLive(text, files, history, s) {
    var contents = (history || []).slice(-12).map(function (turn) {
      return { role: turn.who === 'you' ? 'user' : 'model', parts: [{ text: String(turn.text || '') }] };
    });
    contents.push({ role: 'user', parts: partsFor(text, files) });

    return fetch(ENDPOINT + encodeURIComponent(s.model) + ':generateContent?key=' + encodeURIComponent(s.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt() }] },
        contents: contents,
        generationConfig: { temperature: 0.35, topP: 0.95, maxOutputTokens: 2048 }
      })
    }).then(function (res) {
      return res.text().then(function (body) {
        if (!res.ok) throw readError(res, body);
        var j = JSON.parse(body);

        if (j.promptFeedback && j.promptFeedback.blockReason) {
          throw new Error('The model declined that prompt (' + j.promptFeedback.blockReason + ').');
        }
        var cand = (j.candidates || [])[0];
        if (!cand) throw new Error('The model returned no answer.');

        var out = ((cand.content && cand.content.parts) || [])
          .map(function (p) { return p.text || ''; }).join('').trim();

        if (!out) {
          throw new Error(cand.finishReason === 'MAX_TOKENS'
            ? 'The answer ran past the length limit before any text came back.'
            : 'The model returned an empty answer' +
              (cand.finishReason ? ' (' + cand.finishReason + ')' : '') + '.');
        }
        return out;
      });
    });
  }

  /* ══ public ══════════════════════════════════════════════════ */

  function ask(text, files, history) {
    var s = Store.settings();

    if (s.engine === 'live' && s.apiKey) {
      return callLive(text, files, history, s)
        .then(function (out) { return { text: out, engine: 'live' }; })
        .catch(function (err) {
          return {
            text: offline(text, files) +
              '\n\n---\n*Live answer failed — ' + err.message + ' This came from the offline engine instead.*',
            engine: 'offline'
          };
        });
    }

    return Promise.resolve({ text: offline(text, files), engine: 'offline' });
  }

  /* A GET on the model itself: cheapest call that proves both the key
     and this account's access to the chosen model. */
  function testKey(s) {
    return fetch(ENDPOINT + encodeURIComponent(s.model) + '?key=' + encodeURIComponent(s.apiKey))
      .then(function (res) {
        return res.text().then(function (body) {
          if (!res.ok) throw readError(res, body);
          var j = JSON.parse(body);
          return j.displayName || j.name || s.model;
        });
      })
      .catch(function (err) {
        throw new Error(err.message === 'Failed to fetch'
          ? 'Could not reach Google — check the network.'
          : err.message);
      });
  }

  return {
    ask: ask,
    testKey: testKey,
    offline: offline,
    sieve: SIEVE,
    incoterms: INCOTERMS,
    systemPrompt: systemPrompt
  };
})();
