import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runScript, tempFolder, writeFile } from './helpers.mjs';

const base64 = (text) => Buffer.from(text).toString('base64');
/** Text stored the way Allure stores an attachment in its single-file report. */
const attachment = (text) => `<script>d("data/attachments/a.txt","${base64(text)}")</script>`;
/** Fake, and assembled here so this file doesn't itself look like it holds a token. */
const FAKE_JWT = ['eyJ', 'fake'.repeat(6), '.', 'fake'.repeat(5), '.', 'fake'.repeat(5)].join('');

function check(t, html, env) {
  const site = tempFolder(t);
  writeFile(site, 'report/index.html', html);
  return runScript('check-site-secrets.mjs', [site], env);
}

const caught = [
  ['a short attachment', attachment('{"password":"fake-value-1"}')],
  ['a capitalised key', attachment('{"Password":"fake-value-1"}')],
  ['an API key', attachment('{"api_key":"fake-value-1"}')],
  ['a form body', attachment('email=a@example.test&password=fake-value-1')],
  ['a query string', attachment('GET /x?token=fake-value-1 HTTP/1.1')],
  ['a bearer token', attachment('Authorization: Bearer fake12345value')],
  ['a lowercase bearer token', attachment('authorization: bearer fake12345value')],
  ['a cookie header', attachment('{"Cookie":"session=fake1"}')],
  ['a JWT', attachment(FAKE_JWT)],
  ['a password hash', attachment(`$2y$10$${'a'.repeat(53)}`)],
  ['nested base64', attachment(base64('{"password":"fake-value-1"}'))],
  ['plain text in the page', '<p>{"password":"fake-value-1"}</p>'],
];
for (const [name, html] of caught) {
  test(`stops the deploy on ${name}`, (t) => {
    assert.equal(check(t, html).status, 1);
  });
}

const SECRET_NAMES = [
  'password', 'token', 'access_token', 'refresh_token', 'client_secret', 'secret', 'apikey', 'api_key',
  'current_password', 'new_password', 'password_confirmation',
  'authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key', 'api-key', 'x-auth-token',
];
for (const name of SECRET_NAMES) {
  test(`stops the deploy on an unmasked ${name} field`, (t) => {
    assert.equal(check(t, attachment(`{"${name}":"fake-value-1"}`)).status, 1);
  });
}

test('a later clean file does not cancel an earlier problem', (t) => {
  for (const [first, second] of [['a', 'b'], ['b', 'a']]) {
    const site = tempFolder(t);
    writeFile(site, `${first}/index.html`, attachment('{"password":"fake-value-1"}'));
    writeFile(site, `${second}/index.html`, '<p>clean</p>');
    assert.equal(runScript('check-site-secrets.mjs', [site]).status, 1);
  }
});

test('reads HTML in nested folders, and names the file', (t) => {
  const site = tempFolder(t);
  writeFile(site, 'deep/down/report/index.html', attachment('{"password":"fake-value-1"}'));
  const { status, output } = runScript('check-site-secrets.mjs', [site]);
  assert.equal(status, 1);
  assert.match(output, /::error::.*report.index\.html contains/);
});

test('skips the decoded bytes of a PNG, whose text it cannot read', (t) => {
  const png = Buffer.concat([Buffer.from([0x89]), Buffer.from('PNG {"password":"fake-value-1"}')]).toString('base64');
  assert.equal(check(t, `<script>d("data/attachments/a.png","${png}")</script>`).status, 0);
});

test('finds the admin password in a page snapshot', (t) => {
  const html = attachment('- textbox "Current Password": fake-admin-value');
  assert.equal(check(t, html, { APP_ADMIN_PASSWORD: 'fake-admin-value' }).status, 1);
});

test('finds the database password', (t) => {
  const html = attachment('connected with fake-db-value');
  assert.equal(check(t, html, { APP_DB_LOCAL: '{"user":"x","password":"fake-db-value"}' }).status, 1);
});

test('names what it found, never the value', (t) => {
  const { output } = check(t, attachment('{"password":"fake-value-1"}'));
  assert.match(output, /an unmasked secret field/);
  assert.doesNotMatch(output, /fake-value-1/);
});

const allowed = [
  ['masked fields', attachment('{"password":"***","Authorization":"Bearer ***","Cookie":"***","token":"[REDACTED]"}')],
  ['prose about bearer tokens', attachment('Uses Bearer authentication for every request.')],
  ["code in Allure's own script", attachment('if(token==a.b-9){x=Token;y} let token=c.d+9,e=F.g(h.i),')],
];
for (const [name, html] of allowed) {
  test(`lets through ${name}`, (t) => {
    assert.equal(check(t, html).status, 0);
  });
}

test('misses a test account password in a snapshot, a known limit it states', (t) => {
  const { status, output } = check(t, attachment('- textbox "Current Password": fake-customer-value'));
  assert.equal(status, 0);
  assert.match(output, /Screenshots are not checked/);
});

test('matches a named value only as a whole word', (t) => {
  const html = attachment('connected with fake-db-value-longer');
  assert.equal(check(t, html, { APP_DB_LOCAL: '{"user":"x","password":"fake-db-value"}' }).status, 0);
});

test('warns about a value too short to search for', (t) => {
  const { status, output } = check(t, '<p>user</p>', { APP_DB_LOCAL: '{"user":"user","password":"fake-db-value"}' });
  assert.equal(status, 0);
  assert.match(output, /Not searching for the database user/);
});

test('invalid database JSON stops it without quoting the value', (t) => {
  const { status, output } = check(t, '<p>page</p>', { APP_DB_LOCAL: 'not-json-fake-value' });
  assert.notEqual(status, 0);
  assert.match(output, /APP_DB_LOCAL is not valid JSON/);
  assert.doesNotMatch(output, /not-json-fake-value/);
});

test('a site with no HTML fails rather than passing', (t) => {
  const site = tempFolder(t);
  assert.notEqual(runScript('check-site-secrets.mjs', [site]).status, 0);
});
