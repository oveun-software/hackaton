import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class Store {
  constructor(directory) {
    mkdirSync(directory, { recursive: true });
    const databasePath = path.join(directory, 'talentlens.sqlite');
    const previousPath = path.join(directory, 'atlas.sqlite');
    if (!existsSync(databasePath) && existsSync(previousPath)) {
      const previous = new DatabaseSync(previousPath);
      previous.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      previous.close();
      renameSync(previousPath, databasePath);
    }
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS records_kind ON records(kind);`);
  }
  list(kind) {
    return this.db.prepare('SELECT body FROM records WHERE kind=? ORDER BY rowid DESC').all(kind).map(r => JSON.parse(r.body));
  }
  get(kind, id) {
    const row = this.db.prepare('SELECT body FROM records WHERE kind=? AND id=?').get(kind, id);
    return row ? JSON.parse(row.body) : null;
  }
  put(kind, item) {
    const record = { ...item, id: item.id || randomUUID(), createdAt: item.createdAt || new Date().toISOString() };
    this.db.prepare('INSERT INTO records(kind,id,body) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body WHERE records.kind=excluded.kind')
      .run(kind, record.id, JSON.stringify(record));
    return record;
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
