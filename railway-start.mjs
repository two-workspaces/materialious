// Railway wrapper for materialious-full.
// Unless PUBLIC_REGISTRATION_ALLOWED is set explicitly, sign-ups stay open only
// until ADMIN_USERNAME exists, then the app restarts with them closed.
// SQLite, not Postgres: 1.18.x declares UUIDV4 columns, which only SQLite accepts.
import sqlite3 from 'sqlite3';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dbFile = (process.env.DATABASE_CONNECTION_URI || '').replace(/^sqlite:\/\//, '');
const admin = (process.env.ADMIN_USERNAME || '').trim();
process.env.PUBLIC_ADMIN_USERNAMES ||= admin;
if (dbFile.startsWith('/')) mkdirSync(dbFile.slice(0, dbFile.lastIndexOf('/')) || '/', { recursive: true });

function adminExists() {
	if (!admin) return Promise.resolve(true); // no admin named: never auto-open sign-ups
	return new Promise((resolve) => {
		const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY, (err) => {
			if (err) return resolve(false); // no database yet
			db.get('SELECT 1 FROM Users WHERE username = ?', [admin], (e, row) => {
				db.close();
				resolve(!e && !!row);
			});
		});
	});
}

const gated = process.env.PUBLIC_REGISTRATION_ALLOWED === undefined;
let child;
let stopping = false;

async function start() {
	const env = { ...process.env };
	let open = false;
	if (gated) {
		open = !(await adminExists());
		env.PUBLIC_REGISTRATION_ALLOWED = String(open);
		console.log(open
			? `railway: sign-ups OPEN until "${admin}" registers`
			: 'railway: sign-ups closed (admin exists)');
	}
	child = spawn('node', ['build'], { cwd: '/app', env, stdio: 'inherit' });
	child.on('exit', (code, sig) => {
		if (stopping) return;
		process.exit(code ?? (sig ? 1 : 0));
	});
	while (open && child.exitCode === null) {
		await sleep(5000);
		if (await adminExists()) {
			console.log(`railway: "${admin}" registered, restarting with sign-ups closed`);
			stopping = true;
			child.kill('SIGTERM');
			await new Promise((r) => child.once('exit', r));
			stopping = false;
			return start();
		}
	}
}

for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { stopping = true; child?.kill(s); process.exit(0); });
await start();
