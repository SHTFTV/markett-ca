import test from 'node:test';
import assert from 'node:assert/strict';
import { linksFromHtml, inspectPage, auditDomain, auditBatch } from './gas-content-audit.mjs';

test('static links exclude scripts, unsafe schemes and duplicates', () => {
  const links = linksFromHtml(`<script>"<a href='/blog/fake'>fake</a>"</script><a href='/blog/a#top'>A &amp; B</a><a href='/blog/a'>Duplicate</a><a href=mailto:a@example.com>Mail</a><a href='https://other.example/news'>Other</a>`, 'https://example.com');
  assert.equal(links.length, 2);
  assert.equal(links[0].url, 'https://example.com/blog/a');
  assert.equal(links[1].contentCandidate, true);
});
test('off-domain redirect recorded but never followed', async () => {
  let calls = 0;
  const result = await inspectPage('https://example.com/', 'example.com', async () => { calls++; return { status: 302, location: 'http://127.0.0.1/' }; });
  assert.equal(calls, 1);
  assert.equal(result.observation, 'unavailable');
  assert.equal(result.redirects.length, 1);
});
test('crawl finds linked article, records title, respects bounds and does not fetch external or query links', async () => {
  const calls = [];
  const result = await auditDomain('example.com', { maxPages: 2, page: async url => {
    calls.push(url.href);
    return { status: 200, body: `<title>Example</title><a href='/blog/a'>Article</a><a href='/blog/b'>Another</a><a href='/blog?q=action'>Query</a><a href='https://other.example/blog/x'>External</a>` };
  } });
  assert.deepEqual(calls, ['https://example.com/', 'https://example.com/blog/a']);
  assert.equal(result.pages[1].title, 'Example');
  assert.equal(result.moreDiscoveredPages, 1);
});
test('network failures and HTTP errors are distinct, unknown domain makes no request', async () => {
  assert.equal((await auditDomain('example.com', { page: async () => { throw new Error('DNS unavailable'); } })).pages[0].error, 'DNS unavailable');
  assert.equal((await auditDomain('example.com', { page: async () => ({ status: 404, body: '<title>Not found</title>' }) })).pages[0].observation, 'http-error');
  const batch = await auditBatch({ sites: [{ name: 'Canada Gas', domains: [], mapping: 'unknown-domain' }], page: async () => { throw new Error('Must not request'); } });
  assert.deepEqual(batch.sites[0].observations, []);
  assert.equal(batch.published, false);
});
