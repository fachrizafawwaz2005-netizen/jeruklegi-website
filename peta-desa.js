// =========================================================================
// PETA DESA - Interactive Village Maps
// Two independent Leaflet maps built from the QGIS-exported GIS layers:
//
//   Map 1 - "Peta Administrasi Desa" (#peta-desa-map)
//     RT boundaries, village boundary, roads, local roads, bridges,
//     rivers, and public facilities (Fasilitas Umum). Layer visibility
//     for "Batas RT" and "Fasilitas Umum" is controlled by the Map 1
//     layer panel checkboxes.
//
//   Map 2 - "Peta Lahan Pertanian" (#peta-desa-map-2)
//     Agricultural land only. Layer visibility for "Lahan Pertanian" is
//     controlled by the Map 2 layer panel checkbox.
//
// Both maps default to the Esri World Imagery satellite basemap, with a
// built-in Leaflet layers control letting users switch to a street map.
// =========================================================================

(function () {
  if (typeof L === 'undefined') return;

  // Village extent (derived from the source QGIS project bounds)
  var VILLAGE_BOUNDS = [
    [-7.872029983898591, 110.6512356461313],
    [-7.856669152939975, 110.68038452672171]
  ];

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function popupRow(label, value) {
    if (value === null || value === undefined || value === '') return '';
    return '<div class="pd-popup-row"><b>' + escapeHtml(label) + ':</b> ' + escapeHtml(value) + '</div>';
  }

  // -----------------------------------------------------------------------
  // Polygon label placement - replicates QGIS's "RT 1", "RT 2"... labels
  // that print inside each RT boundary. Leaflet has no built-in polygon
  // labeller, so this computes a proper area-weighted centroid (falling
  // back to the largest ring of a MultiPolygon) and drops a permanent
  // text label there.
  // -----------------------------------------------------------------------
  function ringCentroid(ring) {
    var twiceArea = 0, x = 0, y = 0;
    for (var i = 0, len = ring.length - 1; i < len; i++) {
      var p0 = ring[i], p1 = ring[i + 1];
      var cross = p0[0] * p1[1] - p1[0] * p0[1];
      twiceArea += cross;
      x += (p0[0] + p1[0]) * cross;
      y += (p0[1] + p1[1]) * cross;
    }
    if (twiceArea === 0) {
      // Degenerate ring (e.g. a line) - just average the points.
      var sx = 0, sy = 0, n = ring.length;
      for (var j = 0; j < n; j++) { sx += ring[j][0]; sy += ring[j][1]; }
      return { lng: sx / n, lat: sy / n, area: 0 };
    }
    var area = twiceArea / 2;
    return { lng: x / (3 * twiceArea), lat: y / (3 * twiceArea), area: Math.abs(area) };
  }

  function polygonLabelPoint(geometry) {
    var polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
    var best = null;
    polygons.forEach(function (rings) {
      if (!rings || !rings[0]) return;
      var c = ringCentroid(rings[0]);
      if (!best || c.area > best.area) best = c;
    });
    return best ? L.latLng(best.lat, best.lng) : null;
  }

  function addPolygonLabels(geojsonData, group, pane, className) {
    if (!geojsonData || !geojsonData.features) return;
    geojsonData.features.forEach(function (feature) {
      if (!feature.geometry) return;
      var latlng = polygonLabelPoint(feature.geometry);
      if (!latlng) return;
      var text = (feature.properties && feature.properties.RT) || '';
      if (!text) return;
      L.marker(latlng, {
        pane: pane,
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: className,
          html: '<span>' + escapeHtml(text) + '</span>',
          iconSize: null
        })
      }).addTo(group);
    });
  }

  // -----------------------------------------------------------------------
  // Basemaps - shared factory so both maps get identical satellite/street
  // tile layers and an identical layers-switcher control.
  // -----------------------------------------------------------------------
  function addBasemaps(map) {
    var satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19
      }
    ).addTo(map);

    var streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    L.control.layers(
      { 'Satelit': satellite, 'Peta Jalan': streets },
      null,
      { position: 'topright', collapsed: true }
    ).addTo(map);
  }

  function bindToggle(checkbox, group, map, initiallyOn) {
    if (!checkbox) return;
    if (initiallyOn) {
      group.addTo(map);
    }
    checkbox.addEventListener('change', function () {
      if (checkbox.checked) {
        group.addTo(map);
      } else {
        map.removeLayer(group);
      }
    });
  }

  // =========================================================================
  // MAP 1 - PETA ADMINISTRASI DESA
  // =========================================================================
  var mapEl1 = document.getElementById('peta-desa-map');
  if (mapEl1) {
    var map1 = L.map('peta-desa-map', {
      zoomControl: false,
      minZoom: 14,
      maxZoom: 19,
      scrollWheelZoom: true
    }).fitBounds(VILLAGE_BOUNDS);

    L.control.zoom({ position: 'bottomright' }).addTo(map1);
    addBasemaps(map1);

    // Panes to control draw order of the merged GIS layers
    map1.createPane('paneSungai'); map1.getPane('paneSungai').style.zIndex = 410;
    map1.createPane('paneJalan'); map1.getPane('paneJalan').style.zIndex = 420;
    map1.createPane('paneBatas'); map1.getPane('paneBatas').style.zIndex = 430;
    map1.createPane('paneLabelRT'); map1.getPane('paneLabelRT').style.zIndex = 440;
    map1.createPane('paneFasum'); map1.getPane('paneFasum').style.zIndex = 450;

    // ---- RIVERS (Sungai) - always visible, base hydrology context ----
    if (typeof petaDesaData_sungai !== 'undefined') {
      L.geoJson(petaDesaData_sungai, {
        pane: 'paneSungai',
        interactive: false,
        style: function () {
          return {
            color: 'rgba(0,190,220,1.0)',
            weight: 1,
            fillColor: 'rgba(204,255,255,0.85)',
            fillOpacity: 0.85
          };
        }
      }).addTo(map1);
    }

    // ---- ROADS (Jalan + Jalan Lokal) and BRIDGES (Jembatan) - always visible ----
    function roadCasingStyle(weight) {
      return { pane: 'paneJalan', color: 'rgba(0,0,0,0.55)', weight: weight, opacity: 1 };
    }
    function roadFillStyle(weight) {
      return { pane: 'paneJalan', color: 'rgba(255,135,102,1.0)', weight: weight, opacity: 1 };
    }

    if (typeof petaDesaData_jalan !== 'undefined') {
      L.geoJson(petaDesaData_jalan, { pane: 'paneJalan', interactive: false, style: function () { return roadCasingStyle(4); } }).addTo(map1);
      L.geoJson(petaDesaData_jalan, { pane: 'paneJalan', interactive: false, style: function () { return roadFillStyle(2); } }).addTo(map1);
    }
    if (typeof petaDesaData_jalanLokal !== 'undefined') {
      L.geoJson(petaDesaData_jalanLokal, { pane: 'paneJalan', interactive: false, style: function () { return roadCasingStyle(2.5); } }).addTo(map1);
      L.geoJson(petaDesaData_jalanLokal, { pane: 'paneJalan', interactive: false, style: function () { return roadFillStyle(1.5); } }).addTo(map1);
    }
    if (typeof petaDesaData_jembatan !== 'undefined') {
      L.geoJson(petaDesaData_jembatan, {
        pane: 'paneJalan',
        interactive: false,
        style: function () { return { color: 'rgba(0,235,255,1.0)', weight: 3 }; }
      }).addTo(map1);
    }

    // ---- BATAS RT + BATAS PADUKUHAN (toggleable group: "Batas RT") ----
    var batasGroup = L.layerGroup();

    if (typeof petaDesaData_batasJeruklegi !== 'undefined') {
      L.geoJson(petaDesaData_batasJeruklegi, {
        pane: 'paneBatas',
        interactive: false,
        style: function () {
          return {
            color: 'rgba(217,60,40,0.9)',
            weight: 2.5,
            dashArray: '9,5',
            fill: false
          };
        }
      }).addTo(batasGroup);
    }

    if (typeof petaDesaData_batasRT !== 'undefined') {
      var rtLayer = L.geoJson(petaDesaData_batasRT, {
        pane: 'paneBatas',
        style: function () {
          return {
            color: 'rgba(200,180,20,0.9)',
            weight: 2,
            fillColor: 'rgba(236,219,21,0.12)',
            fillOpacity: 0.12
          };
        },
        onEachFeature: function (feature, layer) {
          var rt = feature.properties && feature.properties.RT;
          layer.bindPopup('<span class="pd-popup-title">' + escapeHtml(rt || 'Batas RT') + '</span>' + popupRow('Wilayah', 'Padukuhan Jeruklegi'));
          layer.on({
            mouseover: function (e) { e.target.setStyle({ fillOpacity: 0.35 }); },
            mouseout: function (e) { rtLayer.resetStyle(e.target); }
          });
        }
      }).addTo(batasGroup);

      // Secondary dashed line style layer, matching the original two-tone
      // qgis2web border symbology (solid RT color + grey dashed overlay).
      L.geoJson(petaDesaData_batasRT, {
        pane: 'paneBatas',
        interactive: false,
        style: function () {
          return { color: 'rgba(153,153,153,0.9)', weight: 1, dashArray: '4,2', fill: false };
        }
      }).addTo(batasGroup);

      // Permanent "RT 1", "RT 2"... text labels, placed at each polygon's
      // centroid - matches the labelling QGIS shows on the desktop project.
      addPolygonLabels(petaDesaData_batasRT, batasGroup, 'paneLabelRT', 'pd-rt-label');
    }

    // ---- FASILITAS UMUM (toggleable group) - merges Fasilitas Umum,
    // Infrastruktur, Pendidikan, Keagamaan, and Pemerintahan layers,
    // each keeping its original QGIS marker icon/colour for identification. ----
    var fasumIcons = {
      FasilitasUmum: L.icon({ iconUrl: 'assets/icons/FasilitasUmum_4.svg', iconSize: [22, 22], iconAnchor: [11, 20], popupAnchor: [0, -18] }),
      Infrastruktur: L.icon({ iconUrl: 'assets/icons/Infrastruktur_5.svg', iconSize: [22, 22], iconAnchor: [11, 20], popupAnchor: [0, -18] }),
      Pendidikan: L.icon({ iconUrl: 'assets/icons/Pendidikan_6.svg', iconSize: [22, 22], iconAnchor: [11, 20], popupAnchor: [0, -18] }),
      Keagamaan: L.icon({ iconUrl: 'assets/icons/Keagamaan_7.svg', iconSize: [22, 22], iconAnchor: [11, 20], popupAnchor: [0, -18] }),
      Pemerintahan: L.icon({ iconUrl: 'assets/icons/Pemerintahan_8.svg', iconSize: [22, 22], iconAnchor: [11, 20], popupAnchor: [0, -18] })
    };
    var fallbackFasumIcon = L.icon({
      iconUrl: 'assets/icon-fasilitas-umum.png',
      iconSize: [24, 24],
      iconAnchor: [12, 22],
      popupAnchor: [0, -20]
    });

    var fasumGroup = (typeof petaDesaData_fasum !== 'undefined')
      ? L.geoJson(petaDesaData_fasum, {
          pane: 'paneFasum',
          pointToLayer: function (feature, latlng) {
            var group = feature.properties && feature.properties._group;
            var icon = fasumIcons[group] || fallbackFasumIcon;
            return L.marker(latlng, { icon: icon });
          },
          onEachFeature: function (feature, layer) {
            var p = feature.properties || {};
            var html = '<span class="pd-popup-title">' + escapeHtml(p.Nama || 'Fasilitas Umum') + '</span>' +
              (p.Kategori ? '<span class="pd-popup-tag">' + escapeHtml(p.Kategori) + '</span>' : '') +
              (p.LINK ? '<div class="pd-popup-photo">' + p.LINK + '</div>' : '');
            layer.bindPopup(html, { maxWidth: 260, minWidth: 220 });
          }
        })
      : L.layerGroup();

    // ---- Map 1 layer panel checkbox wiring ----
    bindToggle(document.getElementById('layer-toggle-batasrt'), batasGroup, map1, true);
    bindToggle(document.getElementById('layer-toggle-fasum'), fasumGroup, map1, false);
  }

  // =========================================================================
  // MAP 2 - PETA LAHAN PERTANIAN
  // =========================================================================
  var mapEl2 = document.getElementById('peta-desa-map-2');
  if (mapEl2) {
    var map2 = L.map('peta-desa-map-2', {
      zoomControl: false,
      minZoom: 14,
      maxZoom: 19,
      scrollWheelZoom: true
    }).fitBounds(VILLAGE_BOUNDS);

    L.control.zoom({ position: 'bottomright' }).addTo(map2);
    addBasemaps(map2);

    map2.createPane('paneLahan');
    map2.getPane('paneLahan').style.zIndex = 440;

    var lahanIcon = L.icon({
      iconUrl: 'assets/icon-lahan-pertanian.png',
      iconSize: [26, 28],
      iconAnchor: [13, 26],
      popupAnchor: [0, -24]
    });

    var lahanGroup = (typeof petaDesaData_lahan !== 'undefined')
      ? L.geoJson(petaDesaData_lahan, {
          pane: 'paneLahan',
          pointToLayer: function (feature, latlng) {
            return L.marker(latlng, { icon: lahanIcon });
          },
          onEachFeature: function (feature, layer) {
            var p = feature.properties || {};
            var html = '<span class="pd-popup-title">' + escapeHtml(p.nama_lahan || 'Lahan Pertanian') + '</span>' +
              '<span class="pd-popup-tag">Lahan Pertanian</span>' +
              popupRow('Tanaman', p.tanaman) +
              popupRow('Tumpang sari', p.tumpang_sari) +
              popupRow('Potensi hama', p.potensi_hama) +
              popupRow('Penanganan hama', p.penanganan_hama) +
              popupRow('Pengolahan', p.pengolahan);
            layer.bindPopup(html);
          }
        })
      : L.layerGroup();

    bindToggle(document.getElementById('layer-toggle-lahan'), lahanGroup, map2, true);
  }
})();
