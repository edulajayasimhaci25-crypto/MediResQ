const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('medical_qa.db');

// Create high-speed indexed search table
db.exec(`
  CREATE TABLE IF NOT EXISTS qa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    solution TEXT NOT NULL
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS qa_fts USING fts5(question, solution, content='qa', content_rowid='id');
`);

console.log("Database initialized. Ready to import Q&A data.");

function bulkImport(qaArray) {
  const insertStmt = db.prepare('INSERT INTO qa (question, solution) VALUES (?, ?)');
  const insertFtsStmt = db.prepare('INSERT INTO qa_fts (rowid, question, solution) VALUES (?, ?, ?)');

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const info = insertStmt.run(item.question, item.solution);
      insertFtsStmt.run(info.lastInsertRowid, item.question, item.solution);
    }
  });

  insertMany(qaArray);
  console.log(`Successfully indexed ${qaArray.length} items!`);
}

// UNCOMMENT & REPLACE WITH YOUR FILE NAME (JSON or CSV):
// const data = JSON.parse(fs.readFileSync('your_100k_dataset.json', 'utf8'));
// bulkImport(data);