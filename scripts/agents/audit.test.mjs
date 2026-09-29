import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { auditSite, publicAddress, mapBounded, deadline } from './audit.mjs';
import { selectDomains } from './config.mjs';
const resolver = { resolveMx: async () => [{ priority: 10, exchange: 'mail.example.com' }], resolveTxt: async () => [['v=spf1 ', '-all'], ['unrelated']] };
test('local HTTP responses and DNS stubs: redirects, title, deduped mailto, no delivery claim', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/') { res.writeHead(302, { location: '/home' }); res.end(); }
    else res.end('<title> Test Site </title><a href="mailto:hello@example.com?subject=x">Mail</a><a href="mailto:hello@example.com">Again</a>');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const page = async (url) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${url.pathname}`, { redirect: 'manual' });
      return { status: response.status, location: response.headers.get('location'), body: await response.text() };
    };
    const site = await auditSite('example.com', { page, resolver });
    assert.equal(site.http.status, 200); assert.equal(site.http.redirects.length, 1);
    assert.equal(site.http.title, 'Test Site'); assert.deepEqual(site.http.mailto, ['hello@example.com']);
    assert.deepEqual(site.email.spf, ['v=spf1 -all']); assert.equal(site.email.deliveryVerified, false);
  } finally { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
});
test('blocks unsafe destinations, invalid batch, and external redirect', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1', '2001:db8::1']) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
  assert.throws(() => selectDomains('https://localhost/'), /Unknown batch/);
  let calls = 0;
  const result = await auditSite('example.com', { resolver, page: async () => { calls++; return { status: 302, location: 'http://169.254.169.254/' }; } });
  assert.equal(calls, 1); assert.match(result.http.error, /blocked/);
});
test('DNS errors are unknown, null MX is not a route, HTTP failures survive', async () => {
  const result = await auditSite('example.com', { page: async () => { throw new Error('unavailable'); }, resolver: { resolveMx: async () => [{ priority: 0, exchange: '.' }], resolveTxt: async () => { throw Object.assign(new Error('no data'), { code: 'ENODATA' }); } } });
  assert.equal(result.email.mailRoutingAdvertised, false); assert.equal(result.email.spf, null);
  assert.deepEqual(result.email.dnsErrors, ['TXT: ENODATA']); assert.equal(result.http.error, 'unavailable');
});
test('bounded concurrency preserves order and deadline rejects', async () => {
  let active = 0; let peak = 0;
  const results = await mapBounded([1, 2, 3, 4, 5], 2, async (value) => {
    peak = Math.max(peak, ++active); await new Promise((r) => setTimeout(r, 5)); active--; return value * 2;
  });
  assert.equal(peak, 2); assert.deepEqual(results, [2, 4, 6, 8, 10]);
  await assert.rejects(deadline(() => new Promise(() => {}), 5), /Timed out/);
});
