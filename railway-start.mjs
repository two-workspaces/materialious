// Railway wrapper for materialious-full.
// 1. Waits for Postgres and creates the app database if missing.
// 2. Unless PUBLIC_REGISTRATION_ALLOWED is set explicitly, sign-ups stay open
//    only until ADMIN_USERNAME exists, then the app restarts with them closed.
import pg from 'pg';
import { spawn } from 'node:child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uri = new URL(process.env.DATABASE_CONNECTION_URI);
const dbName = decodeURIComponent(uri.pathname.slice(1));
const admin = (process.env.ADMIN_USERNAME || '').trim();
process.env.PUBLIC_ADMIN_USERNAMES ||= admin;

async function query(database, sql, params) {
	const u = new URL(uri);
	u.pathname = '/' + database;
	const c = new pg.Client({ connectionString: u.href });
	await c.connect();
	try {
		return await c.query(sql, params);
	} finally {
		await c.end();
	}
}

for (;;) {
	try {
		const r = await query('postgres', 'SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
		if (!r.rowCount) {
			await query('postgres', `CREATE DATABASE "${dbName.replaceAll('"', '""')}"`);
			console.log(`railway: created database ${dbName}`);
		}
		break;
	} catch (e) {
		console.log('railway: waiting for postgres:', e.message);
		await sleep(2000);
	}
}

async function adminExists() {
	if (!admin) return true; // no admin named: never auto-open sign-ups
	try {
		return (await query(dbName, 'SELECT 1 FROM "Users" WHERE username = $1', [admin])).rowCount > 0;
	} catch {
		return false; // table not created yet
	}
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
