let socket;
let map;
let markers = {};
let routeLine = null;
let patientLiveCoords = [12.9650, 77.6000];

const blueAmbulanceIcon = typeof L !== 'undefined' ? new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
}) : null;

const redPatientIcon = typeof L !== 'undefined' ? new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
}) : null;

function haversineCalc(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(2);
}

function initMap() {
  const mapEl = document.getElementById('gisMap');
  if (!mapEl) return;

  map = L.map('gisMap').setView(patientLiveCoords, 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  markers['PATIENT'] = L.marker(patientLiveCoords, { icon: redPatientIcon }).addTo(map).bindPopup('🔴 Patient Location').openPopup();

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(pos => {
      patientLiveCoords = [pos.coords.latitude, pos.coords.longitude];
      markers['PATIENT'].setLatLng(patientLiveCoords);
      map.panTo(patientLiveCoords);
    });
  }
}

function initSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}`);

  socket.onopen = () => {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
      statusEl.innerText = '🟢 ONLINE';
      statusEl.style.color = '#10b981';
    }
  };

  socket.onmessage = (event) => {
    handleLiveEvent(JSON.parse(event.data));
  };
}

async function loadPatientStatusOnReload() {
  try {
    const res = await fetch('/api/patient/status');
    const data = await res.json();

    if (data.latestIncident) {
      const inc = data.latestIncident;
      if (inc.status === 'ACCEPTED') {
        patientLiveCoords = [inc.patientLat, inc.patientLng];
        markers['PATIENT'].setLatLng(patientLiveCoords);

        if (data.ambulance) {
          updateAmbulanceMapPosition(data.ambulance.lat, data.ambulance.lng);
        }

        showResult(`
          <div style="border-left: 5px solid #10b981; padding: 12px; background: #0f172a; border-radius: 6px;">
            <strong style="color: #10b981; font-size: 1rem;">🚑 LIVE EMERGENCY DISPATCH ACTIVE</strong><br><br>
            🏥 Hospital: <b style="color: #38bdf8;">${inc.assignedHospital}</b><br>
            👤 Patient Name: <b>${inc.patientName}</b><br>
            🚑 Dispatched Unit: <b style="color: #f59e0b;">${inc.assignedAmbulance}</b><br>
            📍 Location: <b style="color: #10b981;">[${inc.patientLat.toFixed(4)}, ${inc.patientLng.toFixed(4)}]</b>
          </div>
        `);
      }
    }
  } catch (err) {
    console.error("Error loading status on reload:", err);
  }
}

function updateAmbulanceMapPosition(ambLat, ambLng) {
  if (!map) return;

  if (markers['AMBULANCE']) {
    markers['AMBULANCE'].setLatLng([ambLat, ambLng]);
  } else {
    markers['AMBULANCE'] = L.marker([ambLat, ambLng], { icon: blueAmbulanceIcon }).addTo(map).bindPopup('🚑 Dispatched Ambulance AMB-101 (Blue Marker)').openPopup();
  }

  const points = [[ambLat, ambLng], patientLiveCoords];
  if (routeLine) {
    routeLine.setLatLngs(points);
  } else {
    routeLine = L.polyline(points, { color: '#ef4444', weight: 4, dashArray: '6, 6' }).addTo(map);
  }

  map.fitBounds(L.latLngBounds(points));

  const dist = haversineCalc(ambLat, ambLng, patientLiveCoords[0], patientLiveCoords[1]);
  const distEl = document.getElementById('routeDistText');
  if (distEl) distEl.innerText = `Live Ambulance Distance: ${dist} km`;
}

function handleLiveEvent(data) {
  if (data.topic === 'DRIVER_TELEMETRY') {
    updateAmbulanceMapPosition(data.payload.lat, data.payload.lng);
  } else if (data.topic === 'SOS_STATUS_UPDATED') {
    const payload = data.payload;
    if (payload.status === 'ACCEPTED') {
      const inc = payload.incident;
      patientLiveCoords = [inc.patientLat, inc.patientLng];
      markers['PATIENT'].setLatLng(patientLiveCoords);

      showResult(`
        <div style="border-left: 5px solid #10b981; padding: 12px; background: #0f172a; border-radius: 6px;">
          <strong style="color: #10b981; font-size: 1rem;">🚑 LIVE EMERGENCY DISPATCH ACTIVE</strong><br><br>
          🏥 Accepting Hospital: <b style="color: #38bdf8;">${inc.assignedHospital}</b><br>
          👤 Patient Name: <b>${inc.patientName}</b><br>
          🚑 Assigned Unit: <b style="color: #f59e0b;">${inc.assignedAmbulance}</b><br>
          📍 Location: <b style="color: #10b981;">[${inc.patientLat.toFixed(4)}, ${inc.patientLng.toFixed(4)}]</b>
        </div>
      `);
    }
  } else if (data.topic === 'AMBULANCE_ARRIVED') {
    showResult(`
      <div style="border-left: 5px solid #10b981; padding: 12px; background: #0f172a; border-radius: 6px;">
        <strong style="color: #10b981; font-size: 1rem;">🚑 AMBULANCE HAS ARRIVED AT YOUR EXACT LOCATION!</strong><br><br>
        The emergency team is on site.
      </div>
    `);
  }
}

// ROUTING FOR EMERGENCY VS NON-EMERGENCY OPTIONS
async function processPatientRequest() {
  const nameEl = document.getElementById('patientName');
  const triageEl = document.getElementById('triageType');
  const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : 'John Doe';
  const triage = triageEl ? parseInt(triageEl.value) : 1;

  if (triage === 1 || triage === 2) {
    // OPTIONS 1 & 2: TRIGGER SOS EMERGENCY DISPATCH
    showResult(`
      <div style="border-left: 4px solid #f59e0b; padding: 12px; background: #0f172a; border-radius: 6px;">
        <strong style="color: #f59e0b; font-size: 0.95rem;">⏳ Emergency SOS Request Transmitted!</strong><br><br>
        Transmitting live GPS coordinates [${patientLiveCoords[0].toFixed(4)}, ${patientLiveCoords[1].toFixed(4)}] to Emergency Ward...
      </div>
    `);

    await fetch('/api/emergency/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientName: name, triageType: triage, patientLat: patientLiveCoords[0], patientLng: patientLiveCoords[1] })
    });
  } else if (triage === 3) {
    // OPTION 3: SHOW RANKED LIST OF HOSPITALS BY DISEASE SUCCESS & COST
    fetchOption3Hospitals(name);
  } else if (triage === 4) {
    // OPTION 4: SHOW RANKED LIST OF NEARBY HOSPITALS FOR MINOR ILLNESS
    fetchOption4Hospitals(name);
  }
}

async function fetchOption3Hospitals(patientName) {
  showResult(`<div style="color: #38bdf8;">🔍 Fetching top specialized hospitals for Option 3...</div>`);

  try {
    const res = await fetch(`/api/hospitals/option3-rank?lat=${patientLiveCoords[0]}&lng=${patientLiveCoords[1]}&disease=general`);
    const list = await res.json();
    const topHospitals = list.slice(0, 6);

    let html = `
      <div style="background: #0f172a; padding: 14px; border-radius: 8px; border-left: 5px solid #38bdf8;">
        <h3 style="color: #38bdf8; margin-top: 0;">🏥 Option 3: Top Ranked Specialized Hospitals (6 Facilities Found)</h3>
        <p style="font-size: 0.85rem; color: #94a3b8;">Ranked by Disease Success Rate, Cost Transparency & Specialist Slots</p>
        <div style="display: grid; gap: 10px; margin-top: 12px;">
    `;

    topHospitals.forEach((h, index) => {
      html += `
        <div style="background: #1e293b; padding: 12px; border-radius: 6px; border: 1px solid #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #f8fafc; font-size: 1rem;">#${index + 1} ${h.name}</strong>
            <span style="background: #0369a1; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
              ${h.diseaseSuccessPct}% Success Rate
            </span>
          </div>
          <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 6px;">
            📍 Distance: <b>${h.distanceKm} km</b> | 💳 Reg Fee: <b>₹${h.registrationFee}</b> | 💰 Avg Treatment: <b>₹${h.avgTreatmentCost}</b><br>
            👨‍⚕️ Specialist: <b>${h.assignedDoctor}</b> (Available: ${h.availableSlots.join(', ')})
          </div>
          <button class="btn btn-sm btn-primary" style="margin-top: 8px; width: 100%;" onclick="applyHospitalOption3('${h.id}', '${patientName}')">
            📋 Apply & Pay Registration Fee (₹${h.registrationFee})
          </button>
        </div>
      `;
    });

    html += `</div></div>`;
    showResult(html);
  } catch (err) {
    showResult(`<div style="color: #ef4444;">❌ Failed to load Option 3 hospital list.</div>`);
  }
}

async function fetchOption4Hospitals(patientName) {
  showResult(`<div style="color: #38bdf8;">🔍 Fetching nearby clinics and community centers for Option 4...</div>`);

  try {
    const res = await fetch(`/api/hospitals/option4-rank?lat=${patientLiveCoords[0]}&lng=${patientLiveCoords[1]}`);
    const list = await res.json();
    const topHospitals = list.slice(0, 6);

    let html = `
      <div style="background: #0f172a; padding: 14px; border-radius: 8px; border-left: 5px solid #10b981;">
        <h3 style="color: #10b981; margin-top: 0;">🩺 Option 4: Nearby Clinics & Care Centers (6 Facilities Found)</h3>
        <p style="font-size: 0.85rem; color: #94a3b8;">Ranked by Proximity & Low App Fee Appointment Slots</p>
        <div style="display: grid; gap: 10px; margin-top: 12px;">
    `;

    topHospitals.forEach((h, index) => {
      html += `
        <div style="background: #1e293b; padding: 12px; border-radius: 6px; border: 1px solid #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #f8fafc; font-size: 1rem;">#${index + 1} ${h.name}</strong>
            <span style="background: #059669; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
              ${h.distanceKm} km away
            </span>
          </div>
          <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 6px;">
            📍 Location: <b>Under 1.5km Radius</b> | 🩺 OPD Consultation Fee: <b>₹${h.treatmentCost}</b><br>
            🏥 Available Normal Wards: <b>${h.normalWard.available} / ${h.normalWard.total}</b>
          </div>
          <button class="btn btn-sm btn-success" style="margin-top: 8px; width: 100%;" onclick="applyHospitalOption4('${h.id}', '${patientName}')">
            🎟️ Book OPD Appointment
          </button>
        </div>
      `;
    });

    html += `</div></div>`;
    showResult(html);
  } catch (err) {
    showResult(`<div style="color: #ef4444;">❌ Failed to load Option 4 hospital list.</div>`);
  }
}

async function applyHospitalOption3(hospitalId, patientName) {
  const res = await fetch('/api/hospital/apply-option3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalId, patientName, diseaseType: 'general' })
  });
  const data = await res.json();
  if (data.success) {
    alert(`✅ Application Submitted!\nToken: ${data.registration.tokenNo}\nHospital: ${data.registration.hospitalName}\nScheduled Slot: ${data.registration.scheduledSlot}`);
  }
}

async function applyHospitalOption4(hospitalId, patientName) {
  const res = await fetch('/api/hospital/apply-option4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalId, patientName, diseaseType: 'general' })
  });
  const data = await res.json();
  if (data.success) {
    alert(`✅ OPD Appointment Confirmed!\nToken: ${data.appointment.tokenNo}\nHospital: ${data.appointment.hospitalName}\nScheduled Slot: ${data.appointment.doctorSlot}`);
  }
}

function showResult(html) {
  const el = document.getElementById('patientResult');
  if (el) {
    el.innerHTML = html;
    el.classList.remove('hidden');
  }
}

window.onload = () => {
  initMap();
  initSocket();
  loadPatientStatusOnReload();
};