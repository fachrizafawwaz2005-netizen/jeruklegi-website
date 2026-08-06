// =========================================================================
// UMKM MAP - "Peta Sebaran UMKM"
// Single Leaflet map plotting every micro-business recorded in the QGIS
// UMKM survey (6 category layers: Agribisnis Pangan Lokal, Industri
// Kreatif & Kriya, Jasa & Pelayanan Umum, Layanan Tata Busana, Ritel
// Kebutuhan Harian, Usaha Kuliner Rumahan). Each category keeps its own
// QGIS marker icon so businesses stay visually distinguishable on the map.
// =========================================================================

(function () {
  if (typeof L === 'undefined') return;

  var mapEl = document.getElementById('umkm-map');
  if (!mapEl) return;

  // Village extent (same source QGIS project bounds used on Peta Desa)
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

  var map = L.map('umkm-map', {
    zoomControl: false,
    minZoom: 14,
    maxZoom: 19,
    scrollWheelZoom: true
  }).fitBounds(VILLAGE_BOUNDS);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // ---- Basemaps ----
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

  // ---- BATAS PADUKUHAN JERUKLEGI - two-tone border matching the original
  // QGIS symbology exactly (solid yellow casing + grey dashed overlay) ----
  if (typeof petaDesaData_batasJeruklegi !== 'undefined') {
    L.geoJson(petaDesaData_batasJeruklegi, {
      interactive: false,
      style: function () {
        return {
          color: 'rgba(255,255,0,1.0)',
          weight: 5.0,
          lineCap: 'butt',
          lineJoin: 'miter',
          fill: false
        };
      }
    }).addTo(map);

    L.geoJson(petaDesaData_batasJeruklegi, {
      interactive: false,
      style: function () {
        return {
          color: 'rgba(128,128,128,1.0)',
          weight: 2.0,
          dashArray: '8,4',
          lineCap: 'square',
          lineJoin: 'bevel',
          fill: false
        };
      }
    }).addTo(map);
  }

  // ---- UMKM category layers (icon + data var pulled from assets/data/umkm-*.js) ----
  var categories = [
    { data: 'umkmAgribisnis', icon: 'assets/icons/umkm/AgribisnisPanganLokal_2.svg', label: 'Agribisnis Pangan Lokal' },
    { data: 'umkmIndustriKreatif', icon: 'assets/icons/umkm/IndustriKreatifKriya_3.svg', label: 'Industri Kreatif & Kriya' },
    { data: 'umkmJasaPelayanan', icon: 'assets/icons/umkm/JasaPelayananUmum_4.svg', label: 'Jasa & Pelayanan Umum' },
    { data: 'umkmTataBusana', icon: 'assets/icons/umkm/LayananTataBusana_5.svg', label: 'Layanan Tata Busana' },
    { data: 'umkmRitel', icon: 'assets/icons/umkm/RitelKebutuhanHarian_6.svg', label: 'Ritel Kebutuhan Harian' },
    { data: 'umkmKuliner', icon: 'assets/icons/umkm/UsahaKulinerRumahan_7.svg', label: 'Usaha Kuliner Rumahan' }
  ];

  var overlays = {};

  categories.forEach(function (cat) {
    var geojson = window[cat.data];
    if (typeof geojson === 'undefined') return;

    var icon = L.icon({
      iconUrl: cat.icon,
      iconSize: [24, 24],
      iconAnchor: [12, 22],
      popupAnchor: [0, -20]
    });

    var layer = L.geoJson(geojson, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, { icon: icon });
      },
      onEachFeature: function (feature, layer) {
        var p = feature.properties || {};
        var wilayah = (p.padukuhan ? p.padukuhan : '') + (p.rt ? ' RT ' + p.rt : '') + (p.rw ? ' / RW ' + p.rw : '');
        var koordinat = (p.lintang !== undefined && p.lintang !== null && p.bujur !== undefined && p.bujur !== null)
          ? p.lintang + ', ' + p.bujur
          : '';
        var html = '<span class="pd-popup-title">' + escapeHtml(p.nama || cat.label) + '</span>' +
          '<span class="pd-popup-tag">' + escapeHtml(p.kategori || cat.label) + '</span>' +
          popupRow('Deskripsi', p.deskripsi) +
          popupRow('Wilayah', wilayah.trim()) +
          popupRow('Koordinat', koordinat) +
          (p.foto ? '<div class="pd-popup-photo">' + p.foto + '</div>' : '');
        layer.bindPopup(html, { maxWidth: 260, minWidth: 220 });
      }
    }).addTo(map);

    overlays[cat.label] = layer;
  });

  L.control.layers(
    { 'Satelit': satellite, 'Peta Jalan': streets },
    overlays,
    { position: 'topright', collapsed: true }
  ).addTo(map);
})();
