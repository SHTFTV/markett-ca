import https from 'node:https';
import http from 'node:http';
import { isIP } from 'node:net';
import * as dns from 'node:dns/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectDomains } from './config.mjs';

const TIMEOUT = 10000;
const MAX_BYTES = 512 * 1024;
export function publicAddress(address) {
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0):/i.test(address) && !/^2002:/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 2)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
}
export async function deadline(fn, milliseconds = TIMEOUT) {
  let timer;
  try { return await Promise.race([Promise.resolve().then(fn), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timed out')), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
export async function requestPage(url) {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Unsafe URL');
  const addresses = await deadline(() => dns.lookup(url.hostname, { all: true }));
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error('Non-public DNS destination blocked');
  const chosen = addresses[0];
  return new Promise((resolveResponse, reject) => {
    let timer;
    const req = (url.protocol === 'https:' ? https : http).get(url, {
      headers: { 'user-agent': 'MarkEtt-Public-Portfolio-Audit/1.0', accept: 'text/html', 'accept-encoding': 'identity' },
      lookup: (_hostname, options, callback) => options.all ? callback(null, [chosen]) : callback(null, chosen.address, chosen.family),
    }, (res) => {
      let body = ''; let bytes = 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) req.destroy(new Error('Response exceeds 512 KiB'));
        else body += chunk.toString('utf8');
      });
      res.on('end', () => { clearTimeout(timer); resolveResponse({ status: res.statusCode, location: res.headers.location, body }); });
      res.on('error', reject);
    });
    timer = setTimeout(() => req.destroy(new Error('HTTP timed out')), TIMEOUT);
    req.on('error', (error) => { clearTimeout(timer); reject(error); });
  });
}
export function extract(body) {
  const title = (body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const mailto = [...body.matchAll(/href\s*=\s*["']mailto:([^"'?#\s>]+)/gi)].map((m) => m[1].slice(0, 254));
  return { title, mailto: [...new Set(mailto)].slice(0, 50) };
}
export async function auditSite(domain, { page = requestPage, resolver = dns } = {}) {
  const result = { domain, checkedAt: new Date().toISOString(), http: { redirects: [] }, email: { deliveryVerified: false } };
  await Promise.all([
    (async () => {
      try {
        let url = new URL(`https://${domain}/`);
        for (let hop = 0; hop <= 5; hop++) {
          const response = await page(url);
          result.http.status = response.status;
          result.http.finalUrl = url.href;
          if (response.status >= 300 && response.status < 400 && response.location) {
            const next = new URL(response.location, url);
            result.http.redirects.push({ status: response.status, from: url.href, to: next.href });
            if (![domain, `www.${domain}`].includes(next.hostname) || !['https:', 'http:'].includes(next.protocol) || next.username || next.password || next.port) throw new Error('Redirect outside configured domain blocked; review destination');
            if (hop === 5) throw new Error('Redirect limit exceeded');
            url = next;
          } else {
            Object.assign(result.http, extract(response.body));
            result.http.reachable = response.status >= 200 && response.status < 400;
            break;
          }
        }
      } catch (error) { result.http.error = error.message; }
    })(),
    (async () => {
      const values = await Promise.allSettled([
        deadline(() => resolver.resolveMx(domain)), deadline(() => resolver.resolveTxt(domain)),
      ]);
      result.email.mx = values[0].status === 'fulfilled' ? values[0].value : null;
      result.email.spf = values[1].status === 'fulfilled' ? values[1].value.map((parts) => parts.join('')).filter((record) => /^v=spf1(?:\s|$)/i.test(record)) : null;
      result.email.dnsErrors = values.flatMap((v, i) => v.status === 'rejected' ? [`${i ? 'TXT' : 'MX'}: ${v.reason.code || v.reason.message}`] : []);
      result.email.mailRoutingAdvertised = Boolean(result.email.mx?.some((mx) => mx.exchange && mx.exchange !== '.'));
    })(),
  ]);
  return result;
}
export async function mapBounded(items, limit, fn) {
  let next = 0;
  const output = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) { const index = next++; if (index >= items.length) break; output[index] = await fn(items[index]); }
  }));
  return output;
}
const safe = (value) => String(value ?? '—').replace(/[|\r\n<>]/g, ' ').replace(/&/g, '&amp;');
export function markdown(report) {
  return `# MarkEtt public portfolio audit\n\nBatch: ${report.batch} · ${report.generatedAt}\n\nPublic observations only. HTTP reachability does not prove a finished site. MX/SPF records do not verify forwarding, delivery, replies, forms, or mailbox ownership. No email was sent.\n\n| Domain | HTTP | Title | MX route advertised | SPF records | Review |\n|---|---|---|---|---|---|\n` + report.sites.map((site) => `| ${safe(site.domain)} | ${safe(site.http.status)} | ${safe(site.http.title)} | ${site.email.mailRoutingAdvertised ? 'Yes' : 'No / unknown'} | ${site.email.spf?.length ?? 'unknown'} | ${safe(site.http.error ? `Check unavailable: ${site.http.error}` : (site.http.reachable ? 'Content/forms still unverified' : 'HTTP review needed'))} |`).join('\n') + '\n';
}
export async function main(args = process.argv.slice(2)) {
  const batch = args[0] || 'all';
  if (args.length > 2) throw new Error('Usage: node scripts/agents/audit.mjs [all|insulation|mechanical|interiors] [output-directory]');
  const domains = selectDomains(batch);
  const output = resolve(args[1] || '/tmp/markett-portfolio-audit');
  const sites = await mapBounded(domains, 3, (domain) => auditSite(domain));
  const report = { schemaVersion: 1, batch, generatedAt: new Date().toISOString(), sites };
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/portfolio-audit.json`, JSON.stringify(report, null, 2) + '\n');
  await writeFile(`${output}/portfolio-audit.md`, markdown(report));
  console.log(`Audited ${sites.length} domains. Reports: ${output}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
