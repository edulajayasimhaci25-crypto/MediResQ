let allDirectoryHospitals = [];

async function loadHospitalDirectory() {
  try {
    const res = await fetch('/api/hospitals/directory');
    const data = await res.json();
    allDirectoryHospitals = data.hospitals || [];

    renderDirectoryTable(allDirectoryHospitals);
  } catch (err) {
    console.error("Failed to load hospital directory:", err);
  }
}

function renderDirectoryTable(hospitals) {
  const tbody = document.getElementById('directoryTableBody');
  const badge = document.getElementById('hospitalBadgeCount');

  badge.innerText = `Total Registered Hospitals: ${hospitals.length}`;

  if (hospitals.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#ef4444; padding:20px;">No matching hospitals found.</td></tr>`;
    return;
  }

  let html = '';
  hospitals.forEach(h => {
    const cardPct = h.diseaseSuccess.cardiology ? `${Math.round(h.diseaseSuccess.cardiology * 100)}%` : 'N/A';
    const oncoPct = h.diseaseSuccess.oncology ? `${Math.round(h.diseaseSuccess.oncology * 100)}%` : 'N/A';

    html += `
      <tr>
        <td style="font-weight: bold; color: #f59e0b;">${h.id}</td>
        <td style="font-weight: bold; color: #f8fafc;">${h.name}</td>
        <td>
          <span class="badge-ward badge-emerg">
            ${h.emergencyWard ? h.emergencyWard.available : h.emergencyBeds} / ${h.emergencyWard ? h.emergencyWard.total : h.totalBeds}
          </span>
        </td>
        <td>
          <span class="badge-ward badge-severe">
            ${h.severeWard ? h.severeWard.available : '--'} / ${h.severeWard ? h.severeWard.total : '--'}
          </span>
        </td>
        <td>
          <span class="badge-ward badge-normal">
            ${h.normalWard ? h.normalWard.available : '--'} / ${h.normalWard ? h.normalWard.total : '--'}
          </span>
        </td>
        <td style="color: #38bdf8;">₹${h.registrationFee}</td>
        <td style="color: #f59e0b;">₹${h.avgCost.toLocaleString()}</td>
        <td style="color: #10b981;">₹${h.minorCost.toLocaleString()}</td>
        <td>${cardPct}</td>
        <td>${oncoPct}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function filterDirectory() {
  const query = document.getElementById('directorySearchInput').value.toLowerCase().trim();
  const filtered = allDirectoryHospitals.filter(h =>
    h.name.toLowerCase().includes(query) ||
    h.id.toLowerCase().includes(query)
  );
  renderDirectoryTable(filtered);
}

window.addEventListener('DOMContentLoaded', () => {
  loadHospitalDirectory();
});