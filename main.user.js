// ==UserScript==
// @name        DI Website Version
// @namespace   Violentmonkey Scripts
// @match       https://*/*
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.xmlHttpRequest
// @grant       unsafeWindow
// @connect     api.github.com
// @author      Jeff Puckett
// @version 1.12.0
// @description Shows the version of the website with some additonal status and controls
// @homepageURL https://github.com/jpuckett-di/tamper-web-version
// @downloadURL https://raw.githubusercontent.com/jpuckett-di/tamper-web-version/refs/heads/main/main.user.js
// ==/UserScript==
const CURRENT_VERSION_MSP = undefined; // Multi-site platform Git SHA hash (40 hex characters)
const CURRENT_VERSION_SSP = undefined; // Single-site platform Integer (as string) version
const VERSION_SEARCH_NEEDLE = '"version": "';
const VERSION_SEARCH_NEEDLE_LENGTH = 12;
const VERSION_STRING_LENGTH = 40;
const SLUG_SEARCH_NEEDLE = '"slug": "';
const SLUG_SEARCH_NEEDLE_LENGTH = 9;
const STAGING_URL_TEMPLATE = "https://SLUG.staging.ws-staging-232-automode.cars-cloud.com";
const AFF_ADMIN_URL =
  "/wp/wp-admin/admin.php?page=diAuditorDashboard&diafilter[full_name]&diafilter[object_type]=feature_flag";
const QUICK_LINKS = [
  {
    text: "Staging",
    href() {
      const slug = getSlug();
      return slug ? STAGING_URL_TEMPLATE.replace("SLUG", slug) : null;
    },
  },
  { text: "New", href: "/new-vehicles/" },
  {
    text: "Update",
    href: "/wp/wp-admin/edit.php?post_type=inventory&page=inventory_settings&tab=advanced",
  },
  {
    text: "CVV",
    href: "/wp/wp-admin/edit.php?post_type=inventory&page=inventory_settings&tab=vehicle_variables",
  },
  {
    text: "Sort",
    href: "/wp/wp-admin/admin.php?page=dealerinspire-inventory-display&primary-tabs=2&vrp-tabs=4",
  },
  {
    text: "Short",
    href: "/wp/wp-admin/admin.php?page=dealerinspire-inventory-display&primary-tabs=2&vrp-tabs=6",
  },
  { text: "FF", href: "/wp/wp-admin/admin.php?page=feature-flags" },
  { text: "AFF", href: AFF_ADMIN_URL },
  {
    text: "DITM",
    href() {
      const url = new URL(window.location.href);
      url.searchParams.set("ditmdebug", "1");
      return url.href;
    },
  },
];

function resolveQuickLinkHref(spec) {
  return typeof spec.href === "function" ? spec.href() : spec.href;
}

function getQuickLinks() {
  return QUICK_LINKS.flatMap((spec) => {
    const href = resolveQuickLinkHref(spec);
    return href ? [{ text: spec.text, href }] : [];
  });
}
// DI HTML comment banner (footer URL may vary).
const DEALER_INSPIRE_MAST_SIGNATURE =
  "______  _______ _______        _______  ______ _____ __   _ _______  _____  _____  ______ _______";
const CACHE_BREAKER_STATUS_STORAGE_KEY =
  "tamper-web-version-cache-breaker-status";
const CACHE_BREAKER_REDIRECT_URL_STORAGE_KEY =
  "tamper-web-version-cache-breaker-redirect-url";
const CACHE_BREAKER_AUTHENTICATING = "AUTHENTICATING";
const CACHE_BREAKER_BREAKING = "BREAKING";
const CONTAINER_ID = "tamper-web-version-container";
const CONTAINER_STYLE_ID = "tamper-web-version-styles";
const CONTAINER_CSS = `
#${CONTAINER_ID} {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.35;
  font-weight: normal;
  font-style: normal;
  letter-spacing: normal;
  text-transform: none;
  text-align: left;
  color: #111;
  background: #fff;
  border: 1px solid #333;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}
#${CONTAINER_ID} *,
#${CONTAINER_ID} *::before,
#${CONTAINER_ID} *::after {
  box-sizing: border-box;
}
#${CONTAINER_ID} button,
#${CONTAINER_ID} a {
  font: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}
#${CONTAINER_ID} .twv-summary {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 8px;
}
#${CONTAINER_ID} .twv-expanded {
  display: none;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #ccc;
  padding: 8px;
}
#${CONTAINER_ID} .twv-expanded.is-open {
  display: flex;
}
#${CONTAINER_ID} .twv-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}
#${CONTAINER_ID} .twv-links {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}
#${CONTAINER_ID} .twv-btn {
  appearance: none;
  background: #f0f0f0;
  border: 1px solid #888;
  border-radius: 3px;
  color: #111;
  cursor: pointer;
  margin: 0;
  padding: 4px 10px;
  text-align: center;
  text-decoration: none;
}
#${CONTAINER_ID} .twv-btn:hover {
  background: #e4e4e4;
}
#${CONTAINER_ID} .twv-btn:active {
  background: #d4d4d4;
  border-color: #666;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  transform: translateY(1px);
}
#${CONTAINER_ID} .twv-close {
  appearance: none;
  background: transparent;
  border: none;
  border-radius: 0;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  margin: 0;
  padding: 0 4px;
}
#${CONTAINER_ID} .twv-close:hover {
  background: transparent;
  color: #111;
}
#${CONTAINER_ID} .twv-link {
  color: #06c;
  cursor: pointer;
  text-decoration: underline;
}
#${CONTAINER_ID} .twv-link:hover {
  color: #039;
}
#${CONTAINER_ID} .twv-version,
#${CONTAINER_ID} .twv-search,
#${CONTAINER_ID} .twv-message {
  cursor: default;
}
#${CONTAINER_ID} .twv-version.is-toggle,
#${CONTAINER_ID} .twv-search.is-toggle {
  cursor: pointer;
}
#${CONTAINER_ID} .twv-version--neutral {
  color: #111;
}
#${CONTAINER_ID} .twv-version--ok {
  color: #080;
  font-weight: 600;
}
#${CONTAINER_ID} .twv-version--bad {
  color: #c00;
  font-weight: 600;
}
#${CONTAINER_ID} .twv-search {
  color: #111;
  font-weight: normal;
}
#${CONTAINER_ID} .twv-search--bold {
  font-weight: 700;
}
#${CONTAINER_ID} .twv-search--alert {
  color: #c00;
}
#${CONTAINER_ID} .twv-label {
  font-weight: 700;
  margin-top: 4px;
  width: 100%;
}
#${CONTAINER_ID} .twv-live-history {
  width: 100%;
  font-size: 12px;
  color: #333;
}
#${CONTAINER_ID} .twv-pre {
  margin: 4px 0 0;
  padding: 0;
  white-space: pre-wrap;
  max-width: min(520px, 90vw);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.4;
  color: #111;
  background: transparent;
  border: none;
}
`;
const GITHUB_PAT_STORAGE_KEY = "tamper-web-version-github-pat";

function ensureContainerStyles() {
  if (document.getElementById(CONTAINER_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = CONTAINER_STYLE_ID;
  style.textContent = CONTAINER_CSS;
  document.head.appendChild(style);
}
const SITES_JSON_API_URL =
  "https://api.github.com/repos/carsdotcom/di-websites-live-history/contents/web/sites.json?ref=main";

function pageWindow() {
  return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
}

function githubApiGetSitesJson(url, token) {
  return new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method: "GET",
      url,
      headers: {
        Accept: "application/vnd.github.raw",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      onload(resp) {
        if (resp.status >= 200 && resp.status < 300) {
          try {
            const data = JSON.parse(resp.responseText);
            if (!Array.isArray(data.sites)) {
              reject(new Error('sites.json missing top-level "sites" array'));
              return;
            }
            resolve(data);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(
            new Error(
              `GitHub API HTTP ${resp.status}: ${resp.responseText?.slice(0, 300) ?? ""}`
            )
          );
        }
      },
      onerror() {
        reject(new Error("GitHub API request failed (network)"));
      },
    });
  });
}

function findSiteRecord(sites, slug) {
  return sites.find((s) => s && s.slug === slug) ?? null;
}

function getCcidFromSiteRecord(site) {
  if (!site || site.ccid == null || site.ccid === "") {
    return null;
  }
  return String(site.ccid);
}

async function getGithubPat() {
  let token = await GM.getValue(GITHUB_PAT_STORAGE_KEY, "");
  if (typeof token !== "string") {
    token = "";
  }
  token = token.trim();
  if (token) {
    return token;
  }
  const entered = prompt(
    "GitHub personal access token (read access to carsdotcom/di-websites-live-history):",
    ""
  );
  if (!entered || !String(entered).trim()) {
    return "";
  }
  const trimmed = String(entered).trim();
  await GM.setValue(GITHUB_PAT_STORAGE_KEY, trimmed);
  return trimmed;
}

let liveHistoryRequestGeneration = 0;

async function loadLiveHistoryData(host, copyCcidHost) {
  const generation = ++liveHistoryRequestGeneration;
  host.textContent = "";
  if (copyCcidHost) {
    copyCcidHost.replaceChildren();
  }

  const slug = getSlug();
  if (!slug) {
    host.textContent =
      "Live history: no slug in page head — cannot match sites.json.";
    return;
  }

  let token;
  try {
    token = await getGithubPat();
  } catch (e) {
    if (generation !== liveHistoryRequestGeneration) {
      return;
    }
    host.textContent = `Live history: could not read stored token (${e?.message ?? e})`;
    return;
  }

  if (!token) {
    host.textContent = "Live history: GitHub token required (canceled or empty).";
    return;
  }

  host.textContent = "Live history: loading…";

  let data;
  try {
    data = await githubApiGetSitesJson(SITES_JSON_API_URL, token);
  } catch (e) {
    if (generation !== liveHistoryRequestGeneration) {
      return;
    }
    host.textContent = `Live history: ${e?.message ?? e}`;
    return;
  }

  const match = findSiteRecord(data.sites, slug);
  if (generation !== liveHistoryRequestGeneration) {
    return;
  }

  host.textContent = "";
  if (!match) {
    host.appendChild(
      document.createTextNode(
        `Live history: no sites.json entry for slug "${slug}".`
      )
    );
    return;
  }

  const label = document.createElement("div");
  label.className = "twv-label";
  label.textContent = "DI Dashboard:";
  host.appendChild(label);

  const ccid = getCcidFromSiteRecord(match);
  if (ccid && copyCcidHost) {
    appendExpandedControlRow(copyCcidHost, makeCopyCcidButton(ccid));
  }

  const pre = document.createElement("pre");
  pre.className = "twv-pre";
  pre.textContent = JSON.stringify(match, null, 2);
  host.appendChild(pre);
}

function goBack() {
  createCacheBreakerContainer("going back...");
  const url =
    localStorage.getItem(CACHE_BREAKER_REDIRECT_URL_STORAGE_KEY) ?? "/";
  localStorage.removeItem(CACHE_BREAKER_REDIRECT_URL_STORAGE_KEY);
  localStorage.removeItem(CACHE_BREAKER_STATUS_STORAGE_KEY);
  window.location.assign(url);
}

function authenticate() {
  createCacheBreakerContainer("authenticating...");
  localStorage.setItem(
    CACHE_BREAKER_STATUS_STORAGE_KEY,
    CACHE_BREAKER_AUTHENTICATING
  );
  localStorage.setItem(
    CACHE_BREAKER_REDIRECT_URL_STORAGE_KEY,
    window.location.href
  );
  window.location.assign("/wp/wp-admin/");
}

function isAuthenticating() {
  return (
    localStorage.getItem(CACHE_BREAKER_STATUS_STORAGE_KEY) ===
    CACHE_BREAKER_AUTHENTICATING
  );
}

function getCacheBreakerUrl() {
  return document.querySelector(
    'a[href*="/wp/wp-admin/admin-post.php?action=empty_cache"]'
  )?.href;
}

function logCacheBreakerError(message) {
  console.error(CACHE_BREAKER_STATUS_STORAGE_KEY + " " + message);
}

function breakCache() {
  createCacheBreakerContainer("breaking cache...");

  if (isBreakingCache()) {
    return logCacheBreakerError("already breaking cache. aborting");
  }

  const url = getCacheBreakerUrl();

  if (!url) {
    return logCacheBreakerError("cache breaker url not found");
  }

  localStorage.setItem(
    CACHE_BREAKER_STATUS_STORAGE_KEY,
    CACHE_BREAKER_BREAKING
  );
  window.location.assign(url);
}

function isBreakingCache() {
  return (
    localStorage.getItem(CACHE_BREAKER_STATUS_STORAGE_KEY) ===
    CACHE_BREAKER_BREAKING
  );
}

function handleCacheBreaker() {
  if (isAuthenticating()) {
    breakCache();
    return true;
  }

  if (isBreakingCache()) {
    goBack();
    return true;
  }

  return false;
}

function isDiSite() {
  for (let i = 0; i < document.childNodes.length; i++) {
    const text = document.childNodes[i]?.textContent;
    if (!text) {
      continue;
    }
    if (text.includes(DEALER_INSPIRE_MAST_SIGNATURE)) {
      return true;
    }
  }

  return false;
}

function getVersion() {
  const searchVersionPosition = document.head.innerHTML.search(
    VERSION_SEARCH_NEEDLE
  );

  if (searchVersionPosition === -1) {
    return "version not found";
  }

  const versionPosition = searchVersionPosition + VERSION_SEARCH_NEEDLE_LENGTH;

  // First, try to extract a git SHA (40 hex characters)
  const potentialSha = document.head.innerHTML.substring(
    versionPosition,
    versionPosition + VERSION_STRING_LENGTH
  );

  if (/^[0-9a-f]{40}$/i.test(potentialSha)) {
    return potentialSha;
  }

  // Next, try to extract an integer version (find the closing quote)
  const closingQuotePos = document.head.innerHTML.indexOf('"', versionPosition);
  if (closingQuotePos !== -1) {
    const versionStr = document.head.innerHTML.substring(
      versionPosition,
      closingQuotePos
    );
    if (/^\d+$/.test(versionStr)) {
      return versionStr;
    }
  }

  // Fallback to current behavior (return 40 chars from version position)
  return potentialSha;
}

function getDomain() {
  const domain = window.location.hostname;
  return domain || null;
}

function getSlug() {
  const searchSlugPosition = document.head.innerHTML.search(SLUG_SEARCH_NEEDLE);

  if (searchSlugPosition === -1) {
    return null;
  }

  const slugPosition = searchSlugPosition + SLUG_SEARCH_NEEDLE_LENGTH;
  const closingQuotePos = document.head.innerHTML.indexOf('"', slugPosition);

  if (closingQuotePos === -1) {
    return null;
  }

  return document.head.innerHTML.substring(slugPosition, closingQuotePos);
}

function getVersionClassName(version) {
  if (!CURRENT_VERSION_MSP && !CURRENT_VERSION_SSP) {
    return "twv-version--neutral";
  }

  if (CURRENT_VERSION_MSP === version || CURRENT_VERSION_SSP === version) {
    return "twv-version--ok";
  }

  return "twv-version--bad";
}

function makeVersionSpan() {
  const version = getVersion();
  const span = document.createElement("span");
  span.className = `twv-version ${getVersionClassName(version)}`;
  span.textContent = version;
  return span;
}

function makeCacheBreakerSpan(message) {
  const span = document.createElement("span");
  span.className = "twv-message";
  span.textContent = message;
  return span;
}

function makeCacheBreakerButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "twv-btn";
  button.textContent = "Break Cache";
  button.onclick = authenticate;
  return button;
}

function appendExpandedControlRow(expandedSection, control) {
  const row = document.createElement("div");
  row.className = "twv-row";
  row.appendChild(control);
  expandedSection.appendChild(row);
}

function makeSearchServiceIndicatorSpan() {
  const span = document.createElement("span");
  const w = pageWindow();
  const searchServiceEnabled = w.SEARCH_SERVICE?.enabled === "1";
  const override = w.SEARCH_PROVIDER_OVERRIDE?.provider;
  span.textContent = searchServiceEnabled ? "SS" : "A";
  const bold =
    (override === "search-service" && searchServiceEnabled) ||
    (override === "algolia" && !searchServiceEnabled);
  const red =
    (override === "search-service" && !searchServiceEnabled) ||
    (override === "algolia" && searchServiceEnabled);
  span.className = `twv-search${bold ? " twv-search--bold" : ""}${red ? " twv-search--alert" : ""}`;
  return span;
}

function copyTextToClipboard(text) {
  if (!text) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => copyTextToClipboardFallback(text));
    return;
  }
  copyTextToClipboardFallback(text);
}

function copyTextToClipboardFallback(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function copySlugToClipboard() {
  copyTextToClipboard(getSlug());
}

function copyDomainToClipboard() {
  copyTextToClipboard(getDomain());
}

function copyCcidToClipboard(ccid) {
  return function () {
    copyTextToClipboard(ccid);
  };
}

function makeCopySlugButton() {
  const slug = getSlug();
  if (!slug) {
    return null;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "twv-btn";
  button.textContent = `Copy Slug ${slug}`;
  button.onclick = copySlugToClipboard;
  return button;
}

function makeCopyDomainButton() {
  const domain = getDomain();
  if (!domain) {
    return null;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "twv-btn";
  button.textContent = `Copy Domain ${domain}`;
  button.onclick = copyDomainToClipboard;
  return button;
}

function makeCopyCcidButton(ccid) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "twv-btn";
  button.textContent = `Copy CCID ${ccid}`;
  button.onclick = copyCcidToClipboard(ccid);
  return button;
}

function makeQuickLink(text, href) {
  const link = document.createElement("a");
  link.className = "twv-link";
  link.href = href;
  link.textContent = text;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function makeQuickLinksRow() {
  const links = getQuickLinks();
  if (!links.length) {
    return null;
  }

  const row = document.createElement("div");
  row.className = "twv-links";

  for (const { text, href } of links) {
    row.appendChild(makeQuickLink(text, href));
  }

  return row;
}

function makeCloseButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "twv-close";
  button.textContent = "×";
  button.onclick = function () {
    document.getElementById(CONTAINER_ID)?.remove();
  };
  button.title = "Close version display";
  return button;
}

function createContainer(contents) {
  ensureContainerStyles();
  document.getElementById(CONTAINER_ID)?.remove();
  const div = document.createElement("div");
  div.id = CONTAINER_ID;

  contents.forEach((element) => {
    div.appendChild(element);
  });

  document.body.prepend(div);
}

function createVersionContainer() {
  const summaryRow = document.createElement("div");
  summaryRow.className = "twv-summary";

  const closeButton = makeCloseButton();
  const versionSpan = makeVersionSpan();
  const searchServiceSpan = makeSearchServiceIndicatorSpan();

  const toggleTitle = "Click to show or hide controls";
  versionSpan.title = toggleTitle;
  versionSpan.classList.add("is-toggle");
  searchServiceSpan.title = toggleTitle;
  searchServiceSpan.classList.add("is-toggle");

  summaryRow.appendChild(closeButton);
  summaryRow.appendChild(versionSpan);
  summaryRow.appendChild(searchServiceSpan);

  const expandedSection = document.createElement("div");
  expandedSection.className = "twv-expanded";

  const quickLinksRow = makeQuickLinksRow();
  if (quickLinksRow) {
    expandedSection.appendChild(quickLinksRow);
  }
  appendExpandedControlRow(expandedSection, makeCacheBreakerButton());
  const copySlugButton = makeCopySlugButton();
  if (copySlugButton) {
    appendExpandedControlRow(expandedSection, copySlugButton);
  }
  const copyDomainButton = makeCopyDomainButton();
  if (copyDomainButton) {
    appendExpandedControlRow(expandedSection, copyDomainButton);
  }

  const copyCcidHost = document.createElement("div");
  expandedSection.appendChild(copyCcidHost);

  const liveHistoryHost = document.createElement("div");
  liveHistoryHost.className = "twv-live-history";
  expandedSection.appendChild(liveHistoryHost);

  let expanded = false;
  function setExpanded(next) {
    expanded = next;
    expandedSection.classList.toggle("is-open", expanded);
  }

  function onToggleClick(event) {
    event.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    if (next) {
      loadLiveHistoryData(liveHistoryHost, copyCcidHost);
    }
  }

  versionSpan.addEventListener("click", onToggleClick);
  searchServiceSpan.addEventListener("click", onToggleClick);

  createContainer([summaryRow, expandedSection]);
}

function createCacheBreakerContainer(message) {
  const row = document.createElement("div");
  row.className = "twv-summary";
  row.appendChild(makeCacheBreakerSpan(message));
  createContainer([row]);
}

if (!handleCacheBreaker() && isDiSite()) {
  createVersionContainer();
}
