/* calculator.js — container, bag and desiccant math, plus the transit
   matrix and the stowage diagram.

   The whole thing rests on one idea: a box fills up three different
   ways — weight, cube, floor space — and only the first one to run out
   matters. Everything else in the readout is bookkeeping around that. */

window.Freight = (function () {

  /* ── stowage assumptions ───────────────────────────────────────
     Change these and every figure downstream moves. */

  var BOX = {
    code: '20′ GP',
    payloadMT: 27.0,     // practical payload, not the plate maximum
    cubeM3: 30.0,        // usable cube once the liner and dunnage are in
    tareMT: 2.25
  };

  /* Stow factor: how much more space a packed unit takes than the
     material inside it. Bags are not bricks — they slump, they leave
     voids, and pallets waste the corners. */
  var STOW = {
    jumbo1: 1.12, jumbo125: 1.12, jumbo15: 1.12,
    pp50: 1.18, paper25: 1.18,
    bulk: 1.02
  };

  /* Desiccant poles (1 kg each) per container, by how badly the mineral
     minds moisture. An unlined pack gets two more. */
  var DESICCANT = { low: 4, medium: 6, high: 8 };

  /* ── routes ────────────────────────────────────────────────────
     Transit is port-to-port sailing time, direct or one transhipment.
     It excludes inland haulage, customs and terminal dwell. These are
     planning estimates — replace them with your forwarder's numbers
     before quoting them to a customer. */

  var LOAD_PORTS = [
    { id: 'qasim',      name: 'Port Qasim, PK' },
    { id: 'nhava',      name: 'Nhava Sheva, IN' },
    { id: 'haiphong',   name: 'Haiphong, VN' },
    { id: 'mersin',     name: 'Mersin, TR' },
    { id: 'alexandria', name: 'Alexandria, EG' },
    { id: 'casablanca', name: 'Casablanca, MA' }
  ];

  var DEST_PORTS = [
    { id: 'rotterdam', name: 'Rotterdam, NL' },
    { id: 'antwerp',   name: 'Antwerp, BE' },
    { id: 'hamburg',   name: 'Hamburg, DE' },
    { id: 'houston',   name: 'Houston, US' },
    { id: 'newyork',   name: 'New York, US' },
    { id: 'santos',    name: 'Santos, BR' },
    { id: 'shanghai',  name: 'Shanghai, CN' },
    { id: 'busan',     name: 'Busan, KR' },
    { id: 'jebelali',  name: 'Jebel Ali, AE' },
    { id: 'singapore', name: 'Singapore, SG' }
  ];

  var TRANSIT = {
    qasim:      { rotterdam: 22, antwerp: 23, hamburg: 24, houston: 32, newyork: 28, santos: 33, shanghai: 21, busan: 23, jebelali: 3,  singapore: 12 },
    nhava:      { rotterdam: 23, antwerp: 24, hamburg: 25, houston: 33, newyork: 28, santos: 32, shanghai: 20, busan: 22, jebelali: 4,  singapore: 11 },
    haiphong:   { rotterdam: 32, antwerp: 33, hamburg: 34, houston: 35, newyork: 33, santos: 40, shanghai: 5,  busan: 7,  jebelali: 18, singapore: 6 },
    mersin:     { rotterdam: 14, antwerp: 15, hamburg: 16, houston: 24, newyork: 19, santos: 25, shanghai: 30, busan: 32, jebelali: 14, singapore: 22 },
    alexandria: { rotterdam: 12, antwerp: 13, hamburg: 14, houston: 22, newyork: 17, santos: 23, shanghai: 28, busan: 30, jebelali: 12, singapore: 20 },
    casablanca: { rotterdam: 8,  antwerp: 8,  hamburg: 10, houston: 18, newyork: 13, santos: 17, shanghai: 34, busan: 36, jebelali: 18, singapore: 26 }
  };

  /* ── formatting ────────────────────────────────────────────── */

  function n(v, dp) {
    var s = Number(v).toFixed(dp == null ? 0 : dp);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function portName(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return list[0].name;
  }

  /* ── the plan ──────────────────────────────────────────────── */

  function plan(opts) {
    var tonnage = Math.max(1, Math.round(Number(opts.tonnage) || 1));
    var mineral = Catalog.byId(opts.mineralId) || Catalog.all[0];
    var pack = Catalog.packs[opts.packId] || Catalog.packs.jumbo1;
    var stow = STOW[pack.id] || 1.12;

    var loadPort = portName(LOAD_PORTS, opts.loadId);
    var destPort = portName(DEST_PORTS, opts.destId);
    var transitDays = (TRANSIT[opts.loadId] || {})[opts.destId] || null;

    /* material cube, then the same cube as actually stowed */
    var netCube = tonnage / mineral.density;
    var stowedCube = netCube * stow;

    var p = {
      tonnage: tonnage,
      mineral: mineral,
      pack: pack,
      box: BOX,
      loadPort: loadPort,
      destPort: destPort,
      transitDays: transitDays,
      netCube: netCube,
      stowedCube: stowedCube
    };

    if (pack.bulk) {
      /* No discrete units. The box fills by weight or by cube. */
      var boxesW = tonnage / BOX.payloadMT;
      var boxesV = stowedCube / BOX.cubeM3;
      p.boxes = Math.max(1, Math.ceil(Math.max(boxesW, boxesV)));
      p.limiter = boxesV > boxesW ? 'cube' : 'weight';
      p.perBoxMT = tonnage / p.boxes;
      p.units = 0;
      p.perBox = 0;
      p.lastBoxUnits = 0;
    } else {
      var unitCube = (pack.unitMT / mineral.density) * stow;

      var capWeight = Math.floor(BOX.payloadMT / pack.unitMT);
      var capCube = Math.floor(BOX.cubeM3 / unitCube);
      var capFloor = pack.perBox;

      var perBox = Math.max(1, Math.min(capWeight, capCube, capFloor));
      p.limiter = perBox === capWeight ? 'weight' : (perBox === capCube ? 'cube' : 'floor');

      p.units = Math.ceil(tonnage / pack.unitMT);
      p.perBox = perBox;
      p.boxes = Math.ceil(p.units / perBox);
      p.lastBoxUnits = p.units - (p.boxes - 1) * perBox;
      p.perBoxMT = perBox * pack.unitMT;
      p.unitCube = unitCube;
      p.caps = { weight: capWeight, cube: capCube, floor: capFloor };
    }

    p.payloadUse = (p.perBoxMT / BOX.payloadMT) * 100;

    var poles = DESICCANT[mineral.moistureRisk] || 4;
    if (!pack.lined) poles += 2;
    p.polesPerBox = poles;
    p.desiccantKg = poles * p.boxes;

    /* Shipped tonnage is a whole number of bags, which rarely lands
       exactly on the tonnage asked for. */
    p.shippedMT = pack.bulk ? tonnage : p.units * pack.unitMT;

    return p;
  }

  /* ── the stowage diagram ───────────────────────────────────────
     One block per container, one cell per handling unit inside it —
     a jumbo bag, or a pallet for the sack packings. Cells past the
     end of the cargo are drawn faint, so a part-loaded last box is
     visible at a glance. */

  var DRAW_CAP = 24;

  function cellsFor(p) {
    if (p.pack.bulk) return { per: 20, label: 'tonne blocks', unitLabel: '5% of the load' };
    if (p.pack.perPallet) {
      return {
        per: Math.ceil(p.perBox / p.pack.perPallet),
        label: 'pallets',
        unitLabel: 'pallet of ' + p.pack.perPallet
      };
    }
    return { per: p.perBox, label: 'bags', unitLabel: 'bag' };
  }

  function diagram(p) {
    var spec = cellsFor(p);
    var drawn = Math.min(p.boxes, DRAW_CAP);
    var out = [];

    for (var b = 0; b < drawn; b++) {
      var last = (b === p.boxes - 1);
      var filled = spec.per;

      /* Bulk is split evenly across the boxes, so every block is full.
         Bagged cargo leaves a part-filled last box whenever the bag
         count does not divide by the boxes. */
      if (last && !p.pack.bulk && p.lastBoxUnits < p.perBox) {
        filled = Math.max(1, Math.round((p.lastBoxUnits / p.perBox) * spec.per));
      }

      var cells = [];
      for (var c = 0; c < spec.per; c++) {
        cells.push('<i' + (c >= filled ? ' class="is-part"' : '') + '></i>');
      }
      out.push('<div class="box' + (p.pack.bulk ? ' box--bulk' : '') +
        '" data-tag="' + (b + 1 < 10 ? '0' : '') + (b + 1) + '">' + cells.join('') + '</div>');
    }

    var more = p.boxes - drawn;
    return {
      html: out.join(''),
      spec: spec,
      more: more
    };
  }

  /* ── readout ───────────────────────────────────────────────── */

  /* What actually stopped the load, in the words that fit this packing —
     "the pallets run out of deck" is nonsense for a jumbo bag. */
  function limitText(p) {
    if (p.limiter === 'weight') {
      return 'weight — the box reaches ' + BOX.payloadMT + ' MT before it fills';
    }
    if (p.limiter === 'cube') {
      return 'cube — at ' + p.mineral.density.toFixed(2) + ' t/m³ the box fills before it reaches ' +
        BOX.payloadMT + ' MT';
    }
    return p.pack.perPallet
      ? 'floor space — ' + Math.ceil(p.perBox / p.pack.perPallet) +
        ' pallets fill the deck before weight or cube bite'
      : 'floor space — ' + p.perBox + ' bags floor-load the box before weight or cube bite';
  }

  function figure(dt, dd, small) {
    return '<div class="figure"><dt>' + dt + '</dt><dd>' + dd +
      (small ? ' <small>' + small + '</small>' : '') + '</dd></div>';
  }

  function readout(p) {
    var d = diagram(p);
    var m = p.mineral;

    var figures = [
      figure('Containers', n(p.boxes), '× ' + BOX.code),
      p.pack.bulk
        ? figure('Per container', n(p.perBoxMT, 1), 'MT bulk')
        : figure('Per container', n(p.perBox), p.pack.short),
      p.pack.bulk
        ? figure('Liners', n(p.boxes), 'container liners')
        : figure('Total bags', n(p.units), p.pack.short),
      figure('Shipped', n(p.shippedMT, p.pack.bulk ? 0 : 2), 'MT'),
      figure('Stowed cube', n(p.stowedCube, 1), 'm³'),
      figure('Payload used', n(p.payloadUse, 0) + '%', 'of ' + BOX.payloadMT + ' MT'),
      figure('Desiccant', n(p.desiccantKg), 'kg total'),
      p.transitDays
        ? figure('Transit', n(p.transitDays), 'days at sea')
        : figure('Transit', '—', 'no published rotation')
    ].join('');

    var overshoot = p.shippedMT - p.tonnage;
    var overshootLine = (!p.pack.bulk && Math.abs(overshoot) > 0.001)
      ? ' Whole bags only, so the shipment comes to ' + n(p.shippedMT, 2) +
        ' MT — ' + n(Math.abs(overshoot), 2) + ' MT ' + (overshoot > 0 ? 'over' : 'under') +
        ' the ' + n(p.tonnage) + ' MT asked for.'
      : '';

    return '' +
      '<div class="readout" style="--streak:' + m.streak + '">' +
        '<div class="readout__head">' +
          '<span class="readout__title">' + n(p.tonnage) + ' MT · ' + m.name + '</span>' +
          '<span class="readout__sub">' + p.pack.label + ' · ' + p.loadPort + ' → ' + p.destPort + '</span>' +
        '</div>' +

        '<dl class="figures">' + figures + '</dl>' +

        '<div class="stowage">' +
          '<div class="stowage__label">Stowage · one block per container, one cell per ' +
            d.spec.unitLabel + '</div>' +
          '<div class="boxes">' + d.html + '</div>' +
          '<p class="stowage__legend">' +
            'Limiting factor: ' + limitText(p) + '.' +
            (d.more > 0 ? ' ' + n(d.more) + ' further container' + (d.more > 1 ? 's' : '') + ' not drawn.' : '') +
            overshootLine +
            ' Bulk density taken as ' + m.density.toFixed(2) + ' t/m³ at a stow factor of ' +
            (STOW[p.pack.id] || 1.12).toFixed(2) + '.' +
            ' ' + p.polesPerBox + ' desiccant poles per container for ' + m.moistureRisk +
            ' moisture risk' + (p.pack.lined ? '' : ', raised because the packing has no liner') + '.' +
          '</p>' +
        '</div>' +

        '<p class="stowage__legend">' + m.care + '</p>' +

        '<div class="rfq__acts">' +
          '<button class="solid-btn" id="planToRfq" type="button">Request a quote for this</button>' +
          '<button class="ghost-btn" id="planToChat" type="button">Ask the desk to review it</button>' +
        '</div>' +
      '</div>';
  }

  /* ── plain-text summary, for the RFQ notes and the chat ─────── */

  function summary(p) {
    var lines = [
      p.tonnage + ' MT ' + p.mineral.name + ' (' + p.mineral.formula + ')',
      'Packing:    ' + p.pack.label,
      'Route:      ' + p.loadPort + ' → ' + p.destPort +
        (p.transitDays ? ' · about ' + p.transitDays + ' days at sea' : ''),
      'Containers: ' + p.boxes + ' × ' + BOX.code +
        (p.pack.bulk ? ' at ' + n(p.perBoxMT, 1) + ' MT each'
                     : ' at ' + p.perBox + ' × ' + p.pack.short + ' each'),
      'Cube:       ' + n(p.stowedCube, 1) + ' m³ stowed, ' + n(p.payloadUse, 0) + '% of payload used',
      'Limited by: ' + limitText(p)
    ];
    if (!p.pack.bulk) {
      lines.splice(4, 0, 'Bags:       ' + n(p.units) + ' × ' + p.pack.short +
        ' = ' + n(p.shippedMT, 2) + ' MT shipped');
    }
    lines.push('Desiccant:  ' + p.polesPerBox + ' poles per container, ' + n(p.desiccantKg) + ' kg total');
    lines.push('');
    lines.push('Transit is port-to-port sailing time only — no inland haulage, customs or terminal dwell.');
    return lines.join('\n');
  }

  return {
    box: BOX,
    stow: STOW,
    loadPorts: LOAD_PORTS,
    destPorts: DEST_PORTS,
    transit: TRANSIT,
    plan: plan,
    readout: readout,
    summary: summary,
    limitText: limitText
  };
})();
