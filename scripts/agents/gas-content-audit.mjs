import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { requestPage, mapBounded, extract } from './audit.mjs';
import { gasSites } from './gas-content-config.mjs';

const decode = (text) => text.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
const blogPath = /\/(blog|blogs|news|articles|guides|resources)(\/|$)/i;
export function linksFromHtml(html, base) {
  const links = new Map();
  // Static HTML inventory only; scripts and browser-only routes are not executed.
  const visible = html.replace(/<!--[^]*?-->|<script\b[^]*?<\/script>|<style\b[^]*?<\/style>/gi, '');
  for (const match of visible.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([^]*?)<\/a>/gi)) {
    try {
      const url = new URL(decode(match[1] ?? match[2] ?? match[3]), base);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) continue;
      url.hash = '';
      const text = decode(match[4].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 200);
      links.set(url.href, { url: url.href, text, contentCandidate: blogPath.test(url.pathname) });
      if (links.size >= 300) break;
    } catch { /* Ignore invalid links, never invent a route. */ }
  }
  return [...links.values()];
}
export async function inspectPage(start, domain, page = requestPage) {
  const result = { requestedUrl: start, redirects: [] };
  try {
    let url = new URL(start);
    for (let hop = 0; hop <= 5; hop++) {
      if (![domain, `www.${domain}`].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Off-domain or unsafe destination blocked');
      const response = await page(url);
      Object.assign(result, { status: response.status, finalUrl: url.href });
      if (response.status >= 300 && response.status < 400 && response.location) {
        const next = new URL(response.location, url);
        result.redirects.push({ from: url.href, to: next.href, status: response.status });
        if (hop === 5) throw new Error('Redirect limit exceeded');
        url = next;
      } else {
        Object.assign(result, extract(response.body), { links: linksFromHtml(response.body, url), observation: response.status >= 200 && response.status < 300 ? 'http-success-content-unverified' : 'http-error' });
        return result;
      }
    }
  } catch (error) { result.observation = 'unavailable'; result.error = error.message; }
  return result;
}
export async function auditDomain(domain, { page = requestPage, maxPages = 6 } = {}) {
  const pages = [];
  const queue = [`https://${domain}/`];
  const seen = new Set();
  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const result = await inspectPage(url, domain, page);
    pages.push(result);
    if (result.observation !== 'http-success-content-unverified') continue;
    for (const link of result.links) {
      const target = new URL(link.url);
      if (link.contentCandidate && !target.search && [domain, `www.${domain}`].includes(target.hostname) && !seen.has(link.url) && !queue.includes(link.url)) queue.push(link.url);
    }
  }
  return { domain, pages, crawlLimit: maxPages, moreDiscoveredPages: queue.length, coverage: 'bounded-static-html-only', duplicateTopicReview: 'manual-review-required' };
}
export async function auditBatch({ sites = gasSites, page = requestPage } = {}) {
  const results = await mapBounded(sites.flatMap(site => site.domains.map(domain => ({ site: site.name, domain }))), 3, async item => ({ ...item, ...await auditDomain(item.domain, { page }) }));
  return { schemaVersion: 1, checkedAt: new Date().toISOString(), formsSubmitted: false, emailDeliveryVerified: false, published: false, sites: sites.map(site => ({ ...site, postsRequested: 2, postStatus: 'not-assessed-by-audit', publishingStatus: site.verifiedSource ? 'pending-review-integration' : 'blocked-pending-verified-source-and-review', observations: results.filter(result => result.site === site.name) })) };
}
export async function main(args = process.argv.slice(2)) {
  if (args.length > 1) throw new Error('Usage: node scripts/agents/gas-content-audit.mjs [output-directory]');
  const output = resolve(args[0] || '/tmp/markett-gas-content-audit');
  const report = await auditBatch();
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/gas-content-audit.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Checked ${report.sites.length} site entries. Static evidence only; nothing published. Report: ${output}/gas-content-audit.json`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
