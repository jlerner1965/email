/* catalog.js — the product book.

   Everything a buyer sees comes from MINERALS and PACKS. Add an entry
   here and it appears in the catalog panel, both freight dropdowns, the
   RFQ mineral list and the AI's context with no other edits.

   Assays are typical commercial production ranges. Every shipment still
   ships against its own COA. */

window.Catalog = (function () {

  /* ── habits ────────────────────────────────────────────────────
     Six crystal habits, drawn as line art on a 40×40 grid. A mineral
     names one of these in its `habit` field. */

  var HABITS = {
    prismatic: {
      name: 'Prismatic',
      art: '<path d="M13 15 L20 5 L27 15 L27 33 L20 37 L13 33 Z"/>' +
           '<path d="M13 15 L27 15 M20 15 L20 37" opacity=".5"/>'
    },
    tabular: {
      name: 'Tabular',
      art: '<path d="M6 16 L20 9 L34 16 L20 23 Z"/>' +
           '<path d="M6 16 L6 24 L20 31 L34 24 L34 16"/>' +
           '<path d="M20 23 L20 31" opacity=".5"/>'
    },
    cubic: {
      name: 'Cubic',
      art: '<path d="M8 13 L20 7 L32 13 L32 27 L20 33 L8 27 Z"/>' +
           '<path d="M8 13 L20 19 L32 13 M20 19 L20 33" opacity=".55"/>'
    },
    rhombic: {
      name: 'Rhombohedral',
      art: '<path d="M11 12 L26 8 L34 17 L29 30 L14 34 L6 25 Z"/>' +
           '<path d="M11 12 L19 21 L34 17 M19 21 L14 34" opacity=".55"/>'
    },
    platy: {
      name: 'Platy',
      art: '<path d="M6 14 L20 8 L34 14 L20 20 Z"/>' +
           '<path d="M6 21 L20 15 L34 21 L20 27 Z"/>' +
           '<path d="M6 28 L20 22 L34 28 L20 34 Z"/>'
    },
    granular: {
      name: 'Granular',
      art: '<path d="M9 12 L16 8 L22 12 L20 20 L12 21 Z"/>' +
           '<path d="M23 9 L31 12 L32 20 L24 22 L21 14 Z"/>' +
           '<path d="M13 23 L21 22 L27 25 L25 33 L15 32 Z"/>'
    }
  };

  /* ── packing ───────────────────────────────────────────────────
     unitMT     tonnes in one bag / sack
     perBox     handling cap on units in a 20' GP — floor space and door
                width, before weight or cube are considered. The calculator
                takes whichever of the three limits bites first.
     perPallet  sacks on one pallet, for palletised packing. Twenty
                pallets floor-load a 20' GP and they do not double-stack
                at these weights, so perBox is 20 × perPallet. */

  var PACKS = {
    jumbo1:   { id: 'jumbo1',   label: '1.0 MT jumbo bag (FIBC)',         unitMT: 1.000, perBox: 20,  lined: true,  short: '1.0 MT FIBC' },
    jumbo125: { id: 'jumbo125', label: '1.25 MT jumbo bag (FIBC)',        unitMT: 1.250, perBox: 20,  lined: true,  short: '1.25 MT FIBC' },
    jumbo15:  { id: 'jumbo15',  label: '1.5 MT jumbo bag (FIBC)',         unitMT: 1.500, perBox: 18,  lined: true,  short: '1.5 MT FIBC' },
    pp50:     { id: 'pp50',     label: '50 kg PP woven bags, palletised', unitMT: 0.050, perBox: 400, lined: false, short: '50 kg PP',    perPallet: 20 },
    paper25:  { id: 'paper25',  label: '25 kg paper sacks, palletised',   unitMT: 0.025, perBox: 800, lined: false, short: '25 kg paper', perPallet: 40 },
    bulk:     { id: 'bulk',     label: 'Bulk in container liner',         unitMT: 0,     perBox: 0,   lined: true,  short: 'bulk liner',  bulk: true }
  };

  /* ── minerals ──────────────────────────────────────────────────
     density is BULK density in t/m³ as packed, not specific gravity.
     It drives the freight cube, so it matters more than it looks. */

  var MINERALS = [
    {
      id: 'silica',
      name: 'High-purity silica quartz',
      formula: 'SiO₂',
      aka: ['quartz', 'silica sand', 'quartzite', 'glass sand'],
      habit: 'prismatic',
      streak: '#6b7f8c',
      density: 1.45,
      moistureRisk: 'low',
      apps: 'glass container float solar foundry ferrosilicon silicon metal water filtration epoxy filler sandblasting',
      uses: 'Container and float glass, foundry sand, ferrosilicon and silicon metal, filtration media, epoxy and paint filler.',
      strip: [['SiO₂', '≥ 99.5%'], ['Fe₂O₃', '≤ 0.025%'], ['Bulk', '1.45 t/m³']],
      grades: [
        'Glass grade (SiO₂ ≥ 99.5%)',
        'Foundry grade (SiO₂ ≥ 98.5%)',
        'Metallurgical lump (SiO₂ ≥ 99.0%)',
        'Filler grade, ground (SiO₂ ≥ 99.3%)'
      ],
      assay: [
        ['SiO₂', '99.3 – 99.8%'],
        ['Fe₂O₃', '0.010 – 0.035%'],
        ['Al₂O₃', '0.10 – 0.35%'],
        ['TiO₂', '≤ 0.03%'],
        ['CaO', '≤ 0.05%'],
        ['LOI', '≤ 0.25%']
      ],
      sizes: ['Lump 10 – 150 mm', 'Glass sand 0.1 – 0.6 mm', 'Ground 100 / 200 / 325 mesh'],
      packing: ['jumbo1', 'jumbo125', 'pp50', 'bulk'],
      care: 'Ships dry and inert. Hold free moisture under 0.5% for glass grade — wet sand blinds the batch feeders and skews the silica ratio.'
    },
    {
      id: 'feldspar',
      name: 'Potassium feldspar',
      formula: 'KAlSi₃O₈',
      aka: ['feldspar', 'potash feldspar', 'k-feldspar', 'orthoclase', 'microcline'],
      habit: 'prismatic',
      streak: '#a1596b',
      density: 1.50,
      moistureRisk: 'low',
      apps: 'glass container float ceramic tile sanitaryware tableware glaze frit enamel filler welding electrode flux',
      uses: 'Container and flat glass batch, ceramic tile and sanitaryware bodies, glazes and frits, welding electrodes.',
      strip: [['K₂O', '≥ 10.5%'], ['Fe₂O₃', '≤ 0.10%'], ['Bulk', '1.50 t/m³']],
      grades: [
        'Glass grade (Fe₂O₃ ≤ 0.10%)',
        'Ceramic body grade (K₂O ≥ 11%)',
        'Glaze grade, micronised',
        'Standard grade lump'
      ],
      assay: [
        ['SiO₂', '63 – 68%'],
        ['Al₂O₃', '17.5 – 19.5%'],
        ['K₂O', '10.5 – 13.0%'],
        ['Na₂O', '2.0 – 3.5%'],
        ['Fe₂O₃', '0.04 – 0.12%'],
        ['CaO', '≤ 0.6%'],
        ['LOI', '≤ 0.5%']
      ],
      sizes: ['Lump 20 – 150 mm', 'Granular 0 – 500 µm (glass grade)', 'Ground 200 / 325 mesh'],
      packing: ['jumbo1', 'jumbo125', 'pp50', 'bulk'],
      care: 'Inert and stable. The spec that actually moves is iron — one contaminated loader bucket puts Fe₂O₃ past 0.10% and the glass batch comes out off-colour.'
    },
    {
      id: 'barite',
      name: 'Barite',
      formula: 'BaSO₄',
      aka: ['baryte', 'barytes', 'barium sulphate', 'barium sulfate'],
      habit: 'tabular',
      streak: '#96741f',
      density: 2.60,
      moistureRisk: 'low',
      apps: 'drilling mud weighting agent oilfield paint filler radiation shielding brake pads chemical barium rubber',
      uses: 'Drilling-fluid weighting agent to API 13A, radiation-shielding concrete, paint and polymer filler, feedstock for barium chemicals.',
      strip: [['SG', '4.20 – 4.35'], ['BaSO₄', '92 – 97%'], ['Bulk', '2.60 t/m³']],
      grades: [
        'API 13A drilling grade (SG ≥ 4.20)',
        'Chemical grade (BaSO₄ ≥ 96%)',
        'Paint / filler grade, micronised (BaSO₄ ≥ 95%)'
      ],
      assay: [
        ['BaSO₄', '92 – 97%'],
        ['Specific gravity', '4.20 – 4.35'],
        ['Fe₂O₃', '0.3 – 1.2%'],
        ['SiO₂', '1.0 – 3.5%'],
        ['Sol. alkaline earth as Ca', '≤ 250 mg/kg'],
        ['Moisture', '≤ 1.0%']
      ],
      sizes: ['API 200 mesh (≤ 3% retained on 75 µm)', 'Micronised D50 3 – 10 µm', 'Lump 0 – 150 mm'],
      packing: ['jumbo125', 'jumbo15', 'pp50', 'bulk'],
      care: 'Dense and low-cube. A 20′ box weighs out long before it cubes out — load to the payload limit and stop, whatever the door still shows.'
    },
    {
      id: 'fluorspar',
      name: 'Fluorspar',
      formula: 'CaF₂',
      aka: ['fluorite', 'flourspar', 'acid grade fluorspar', 'acidspar', 'metspar'],
      habit: 'cubic',
      streak: '#5c3d91',
      density: 1.55,
      moistureRisk: 'high',
      apps: 'hydrofluoric acid aluminium smelting steel flux ceramic glass enamel welding rod refrigerant fluorochemical',
      uses: 'Hydrofluoric acid and fluorochemicals, steel and aluminium fluxing, ceramic and enamel opacifier, welding-rod coatings.',
      strip: [['CaF₂', '≥ 97%'], ['SiO₂', '≤ 1.0%'], ['Bulk', '1.55 t/m³']],
      grades: [
        'Acid grade (CaF₂ ≥ 97%)',
        'Ceramic grade (CaF₂ 92 – 96%)',
        'Metallurgical grade (CaF₂ 80 – 85%)'
      ],
      assay: [
        ['CaF₂', '80 – 97.5%'],
        ['SiO₂', '0.6 – 2.5%'],
        ['CaCO₃', '0.8 – 1.5%'],
        ['S', '≤ 0.03%'],
        ['P', '≤ 0.02%'],
        ['Moisture', '≤ 0.5% (acid grade ≤ 0.10%)']
      ],
      sizes: ['Acid-grade dried powder ≤ 0.15 mm', 'Ceramic 0 – 1 mm', 'Met-grade lump 10 – 100 mm or briquette'],
      packing: ['jumbo1', 'jumbo125', 'pp50'],
      care: 'Acid grade travels as a fine, sticky powder. Line the bags, add desiccant and keep moisture under 0.10% or it arrives caked solid.'
    },
    {
      id: 'gcc',
      name: 'Ground calcium carbonate',
      formula: 'CaCO₃',
      aka: ['gcc', 'calcium carbonate', 'calcite', 'limestone powder', 'marble powder'],
      habit: 'rhombic',
      streak: '#4c5a66',
      density: 1.30,
      moistureRisk: 'low',
      apps: 'plastic masterbatch pvc pipe profile paint coating paper sealant adhesive rubber filler putty',
      uses: 'PVC pipe and profile, polyolefin masterbatch, decorative paint, paper coating, sealants and adhesives.',
      strip: [['CaCO₃', '≥ 98%'], ['Whiteness', '94 – 97'], ['Bulk', '1.30 t/m³']],
      grades: [
        'Coated (1% stearic acid)',
        'Uncoated filler grade',
        'Ultrafine (D50 ≤ 2 µm)'
      ],
      assay: [
        ['CaCO₃', '98.0 – 99.4%'],
        ['Whiteness (ISO R457)', '94 – 97'],
        ['MgO', '≤ 0.4%'],
        ['Fe₂O₃', '≤ 0.03%'],
        ['Moisture', '≤ 0.2%'],
        ['Oil absorption', '14 – 22 g/100 g']
      ],
      sizes: ['200 / 325 / 600 / 1250 mesh', 'D50 2 / 5 / 10 µm'],
      packing: ['jumbo1', 'jumbo125', 'pp50', 'paper25'],
      care: 'Coated grades are the ones to watch. Keep them under 40 °C in transit — stearate softens, bags slump and the powder loses the free flow the coating was bought for.'
    },
    {
      id: 'talc',
      name: 'Talc',
      formula: 'Mg₃Si₄O₁₀(OH)₂',
      aka: ['talcum', 'steatite', 'soapstone'],
      habit: 'platy',
      streak: '#5a8266',
      density: 0.90,
      moistureRisk: 'low',
      apps: 'polypropylene automotive plastic paint coating ceramic paper cosmetic pharmaceutical filler roofing',
      uses: 'Polypropylene stiffening for automotive, paint extender and anti-sag, ceramic bodies, paper, cosmetics.',
      strip: [['MgO', '30 – 32%'], ['Whiteness', '88 – 95'], ['Bulk', '0.90 t/m³']],
      grades: [
        'Cosmetic grade (talc ≥ 98%)',
        'Polymer grade, micronised',
        'Ceramic grade',
        'Paint grade'
      ],
      assay: [
        ['Talc content', '90 – 98%'],
        ['SiO₂', '58 – 62%'],
        ['MgO', '30 – 32%'],
        ['CaO', '≤ 1.5%'],
        ['Fe₂O₃', '≤ 0.5%'],
        ['Whiteness', '88 – 95'],
        ['LOI', '5.0 – 6.5%']
      ],
      sizes: ['325 mesh', 'D50 3 / 5 / 10 µm', 'Lump'],
      packing: ['jumbo1', 'pp50', 'paper25'],
      care: 'The lightest cargo on the list. Talc runs out of space long before it runs out of payload — expect boxes that close well under 27 MT whatever the packing.'
    },
    {
      id: 'kaolin',
      name: 'Kaolin',
      formula: 'Al₂Si₂O₅(OH)₄',
      aka: ['china clay', 'kaolinite', 'calcined kaolin', 'metakaolin'],
      habit: 'platy',
      streak: '#9c7b4e',
      density: 1.10,
      moistureRisk: 'high',
      apps: 'paper coating filling ceramic sanitaryware tableware refractory paint rubber fiberglass cable compound',
      uses: 'Paper filling and coating, sanitaryware and tableware bodies, refractory shapes, paint extender, cable compounds.',
      strip: [['Al₂O₃', '34 – 39%'], ['Brightness', '78 – 90'], ['Bulk', '1.10 t/m³']],
      grades: [
        'Washed hydrous',
        'Calcined (Al₂O₃ ≥ 42%)',
        'Refractory grade',
        'Paper coating grade'
      ],
      assay: [
        ['Al₂O₃', '34 – 39% (calcined 42 – 45%)'],
        ['SiO₂', '45 – 52%'],
        ['Fe₂O₃', '0.4 – 1.2%'],
        ['TiO₂', '0.3 – 1.5%'],
        ['LOI', '11 – 14% (calcined ≤ 0.8%)'],
        ['Brightness', '78 – 90']
      ],
      sizes: ['Lump', '325 mesh', 'D50 1 – 5 µm'],
      packing: ['jumbo1', 'pp50', 'paper25'],
      care: 'Hygroscopic. Hydrous grades pull moisture straight through a bag wall — liner plus desiccant, or it arrives lumped and off-spec on flow.'
    },
    {
      id: 'bentonite',
      name: 'Bentonite',
      formula: '(Na,Ca)-montmorillonite',
      aka: ['montmorillonite', 'sodium bentonite', 'calcium bentonite', 'drilling clay'],
      habit: 'granular',
      streak: '#7a6a4f',
      density: 0.95,
      moistureRisk: 'medium',
      apps: 'drilling mud foundry green sand civil slurry wall tunnelling pelletising iron ore cat litter wine clarification',
      uses: 'Water-based drilling fluids, foundry green-sand bonding, slurry walls and tunnelling, iron-ore pelletising, absorbents.',
      strip: [['Swell', '24 – 32 ml'], ['Yield', '≥ 90 bbl/t'], ['Bulk', '0.95 t/m³']],
      grades: [
        'API 13A drilling grade (sodium)',
        'Foundry grade, sodium-activated',
        'Calcium bentonite (bleaching / absorbent)',
        'Civil engineering / slurry wall'
      ],
      assay: [
        ['Montmorillonite', '78 – 88%'],
        ['Moisture', '8 – 12%'],
        ['Swelling index', '24 – 32 ml / 2 g'],
        ['Yield', '90 – 110 bbl/t'],
        ['Green compression strength', '55 – 75 kPa'],
        ['pH (2% suspension)', '8.5 – 10.0']
      ],
      sizes: ['200 mesh', '80 mesh', 'Granules 0.5 – 2 mm'],
      packing: ['jumbo125', 'pp50', 'paper25', 'bulk'],
      care: 'Moisture is a specification here, not a defect — 8 to 12% is normal. Below 6% the swelling index drops and the mud yield goes with it.'
    },
    {
      id: 'bauxite',
      name: 'Calcined bauxite',
      formula: 'Al₂O₃',
      aka: ['bauxite', 'refractory bauxite', 'calcined alumina bauxite', 'abrasive bauxite'],
      habit: 'granular',
      streak: '#9d3126',
      density: 1.85,
      moistureRisk: 'low',
      apps: 'refractory castable brick abrasive grinding wheel sandpaper cement welding flux proppant anti-skid road',
      uses: 'Refractory castables and bricks, brown fused alumina, abrasives, high-alumina cement, welding fluxes, anti-skid aggregate.',
      strip: [['Al₂O₃', '85 – 90%'], ['SG', '3.10 – 3.25'], ['Bulk', '1.85 t/m³']],
      grades: [
        'Refractory grade (Al₂O₃ ≥ 87%)',
        'Abrasive grade (Al₂O₃ ≥ 85%)',
        'Cement / welding grade',
        'Raw dried bauxite'
      ],
      assay: [
        ['Al₂O₃', '85 – 90%'],
        ['SiO₂', '4.5 – 6.5%'],
        ['TiO₂', '3.0 – 4.0%'],
        ['Fe₂O₃', '1.2 – 2.0%'],
        ['CaO + MgO', '≤ 0.6%'],
        ['Bulk specific gravity', '3.10 – 3.25'],
        ['Water absorption', '≤ 4%']
      ],
      sizes: ['0 – 1 / 1 – 3 / 3 – 5 mm', '200 / 325 mesh', 'Lump 20 – 120 mm'],
      packing: ['jumbo1', 'jumbo125', 'jumbo15', 'bulk'],
      care: 'Calcined and stable, but it abrades bag seams. Double-stitch the FIBC and keep the lift loops clear of the container corner posts.'
    }
  ];

  /* ── lookup ────────────────────────────────────────────────── */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function byId(id) {
    for (var i = 0; i < MINERALS.length; i++) {
      if (MINERALS[i].id === id) return MINERALS[i];
    }
    return null;
  }

  function haystack(m) {
    return (m.name + ' ' + m.formula + ' ' + m.aka.join(' ') + ' ' +
      m.apps + ' ' + m.uses + ' ' + m.grades.join(' ') + ' ' +
      HABITS[m.habit].name).toLowerCase();
  }

  function filter(q) {
    var needle = String(q || '').trim().toLowerCase();
    if (!needle) return MINERALS.slice();
    var terms = needle.split(/\s+/);
    return MINERALS.filter(function (m) {
      var hay = haystack(m);
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  /* Best mineral named in a free-text question, or null. Only names,
     aliases and formulas count — an application word like "paint" hits
     four minerals and picking one of them would be a guess. */
  function match(text) {
    var s = String(text || '').toLowerCase();
    if (!s) return null;
    var best = null, bestLen = 0;
    MINERALS.forEach(function (m) {
      var keys = [m.name, m.formula].concat(m.aka);
      keys.forEach(function (k) {
        var kl = k.toLowerCase();
        if (kl.length > bestLen && s.indexOf(kl) !== -1) { best = m; bestLen = kl.length; }
      });
    });
    return best;
  }

  /* ── specimen cards ────────────────────────────────────────── */

  function cardHtml(m) {
    var habit = HABITS[m.habit];
    return '' +
      '<article class="specimen" style="--streak:' + m.streak + '">' +
        '<div class="specimen__top">' +
          '<svg class="specimen__habit" viewBox="0 0 40 40" aria-hidden="true" ' +
               'fill="none" stroke="currentColor" stroke-width="1.3" ' +
               'stroke-linejoin="round">' + habit.art + '</svg>' +
          '<div>' +
            '<div class="specimen__name">' + esc(m.name) + '</div>' +
            '<div class="specimen__formula">' + esc(m.formula) + '</div>' +
            '<div class="specimen__habitname">' + esc(habit.name) + ' · ' + m.grades.length + ' grades</div>' +
          '</div>' +
        '</div>' +
        '<dl class="specimen__strip">' +
          m.strip.map(function (cell) {
            return '<div class="specimen__cell"><dt>' + esc(cell[0]) + '</dt>' +
                   '<dd>' + esc(cell[1]) + '</dd></div>';
          }).join('') +
        '</dl>' +
        '<p class="specimen__uses">' + esc(m.uses) + '</p>' +
        '<div class="specimen__acts">' +
          '<button class="ghost-btn" data-ask="' + esc(m.id) + '" type="button">Full spec</button>' +
          '<button class="solid-btn" data-quote="' + esc(m.id) + '" type="button">Request quote</button>' +
        '</div>' +
      '</article>';
  }

  function render(host, q) {
    var list = filter(q);
    host.innerHTML = list.map(cardHtml).join('');
    return list.length;
  }

  /* ── context for the live model ────────────────────────────────
     Injected into the system instruction so live answers stay inside
     the published spec ranges instead of inventing figures. */

  function brief() {
    var lines = MINERALS.map(function (m) {
      return [
        m.name + ' (' + m.formula + ', id: ' + m.id + ')',
        '  also called: ' + m.aka.join(', '),
        '  grades: ' + m.grades.join(' | '),
        '  typical assay: ' + m.assay.map(function (r) { return r[0] + ' ' + r[1]; }).join('; '),
        '  sizes: ' + m.sizes.join(' | '),
        '  packing: ' + m.packing.map(function (p) { return PACKS[p].label; }).join(' | '),
        '  bulk density: ' + m.density.toFixed(2) + ' t/m³',
        '  applications: ' + m.uses,
        '  cargo care: ' + m.care
      ].join('\n');
    });
    return 'ARAGOCOR MINERALS — PUBLISHED PRODUCT DATA\n\n' + lines.join('\n\n');
  }

  return {
    all: MINERALS,
    packs: PACKS,
    habits: HABITS,
    byId: byId,
    match: match,
    filter: filter,
    render: render,
    brief: brief
  };
})();
