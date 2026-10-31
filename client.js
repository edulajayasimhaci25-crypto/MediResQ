/**
 * MEDIRESQ DAY 2 CLIENT TERMINAL (4 PORTAL TESTER)
 */

const WebSocket = require('ws');
const http = require('http');
const readline = require('readline');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log(`[SOCKET CONNECTED] Listening for live emergency events...`);
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log(`\n📡 [LIVE WEBSOCKET EVENT] ${event.topic}`);
  console.log(JSON.stringify(event.payload, null, 2));
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function sendPost(path, body, callback) {
  const data = JSON.stringify(body);
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => callback(JSON.parse(responseData)));
  });
  req.write(data);
  req.end();
}

function showClientMenu() {
  console.log(`\n======================================================`);
  console.log(`      MEDIRESQ DAY 2 MULTI-PORTAL CLI INTERFACE       `);
  console.log(`======================================================`);
  console.log(`1. [PATIENT PORTAL] Trigger Type 1 Emergency (Accident + Police Signal)`);
  console.log(`2. [PATIENT PORTAL] Trigger Type 2 Emergency (Heart Attack / Stroke)`);
  console.log(`3. [PATIENT PORTAL] Fetch Type 3 Doctor Quality vs Cost Ranking`);
  console.log(`4. [DRIVER PORTAL]  Stream Live Driver GPS Coordinates`);
  console.log(`5. [POLICE PORTAL]  Query Accident Log`);
  console.log(`6. Exit`);
  rl.question('Select Action (1-6): ', handleChoice);
}

function handleChoice(c) {
  switch (c.trim()) {
    case '1':
      sendPost('/api/emergency/trigger', { patientLat: 12.9650, patientLng: 77.6000, triageType: 1, patientName: 'John Doe' }, (res) => {
        console.log(`\n[PATIENT PORTAL RES]`, res);
        showClientMenu();
      });
      break;
    case '2':
      sendPost('/api/emergency/trigger', { patientLat: 12.9650, patientLng: 77.6000, triageType: 2, patientName: 'Jane Smith' }, (res) => {
        console.log(`\n[PATIENT PORTAL RES]`, res);
        showClientMenu();
      });
      break;
    case '3':
      http.get('http://localhost:3000/api/hospitals/type3-rank', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          console.table(JSON.parse(raw));
          showClientMenu();
        });
      });
      break;
    case '4':
      let lat = 12.9700, lng = 77.5900;
      console.log(`\n[DRIVER PORTAL] Streaming 3 GPS updates via API...`);
      let count = 0;
      const timer = setInterval(() => {
        count++;
        lat += 0.002;
        lng += 0.002;
        sendPost('/api/ambulance/telemetry', { ambulanceId: 'AMB-101', lat, lng }, (res) => {
          console.log(` -> Driver GPS Sent: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        });
        if (count >= 3) {
          clearInterval(timer);
          setTimeout(showClientMenu, 1000);
        }
      }, 1000);
      break;
    case '5':
      http.get('http://localhost:3000/api/police/alerts', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          console.log(`\n[POLICE PORTAL LOGS]`, JSON.parse(raw));
          showClientMenu();
        });
      });
      break;
    case '6':
      process.exit(0);
      break;
    default:
      showClientMenu();
  }
}

showClientMenu();