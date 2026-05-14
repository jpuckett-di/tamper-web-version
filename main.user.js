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
// @version 1.10.0
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
const DEALER_INSPIRE_MAST = `\n  ______  _______ _______        _______  ______ _____ __   _ _______  _____  _____  ______ _______\n  |     \\ |______ |_____| |      |______ |_____/   |   | \\  | |______ |_____]   |   |_____/ |______\n  |_____/ |______ |     | |_____ |______ |    \\_ __|__ |  \\_| ______| |       __|__ |    \\_ |______\n         Visit http://www.dealerinspire.com to Inspire your visitors and turn them into customers.\n`;
const CACHE_BREAKER_STATUS_STORAGE_KEY =
  "tamper-web-version-cache-breaker-status";
const CACHE_BREAKER_REDIRECT_URL_STORAGE_KEY =
  "tamper-web-version-cache-breaker-redirect-url";
const CACHE_BREAKER_AUTHENTICATING = "AUTHENTICATING";
const CACHE_BREAKER_BREAKING = "BREAKING";
const CONTAINER_ID = "tamper-web-version-container";
const GITHUB_PAT_STORAGE_KEY = "tamper-web-version-github-pat";
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

async function loadLiveHistoryData(host) {
  const generation = ++liveHistoryRequestGeneration;
  host.textContent = "";

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
  label.textContent = "DI Dashboard:";
  label.style.cssText =
    "font-weight: bold; margin-top: 4px; text-align: left; width: 100%;";
  host.appendChild(label);

  const pre = document.createElement("pre");
  pre.style.cssText =
    "margin: 4px 0 0; white-space: pre-wrap; max-width: min(520px, 90vw); text-align: left; font-size: 11px;";
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
  // Check multiple possible child nodes for the DI mast
  for (let i = 0; i < document.childNodes.length; i++) {
    if (document.childNodes[i]?.textContent === DEALER_INSPIRE_MAST) {
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

function getLabelColor(version) {
  if (!CURRENT_VERSION_MSP && !CURRENT_VERSION_SSP) {
    return "black";
  }

  if (CURRENT_VERSION_MSP === version || CURRENT_VERSION_SSP === version) {
    return "green";
  }

  return "red";
}

function makeVersionSpan() {
  const version = getVersion();
  const span = document.createElement("span");
  span.textContent = version;
  span.style = `color: ${getLabelColor(version)};`;
  return span;
}

function makeCacheBreakerSpan(message) {
  const span = document.createElement("span");
  span.textContent = message;
  return span;
}

function makeCacheBreakerButton() {
  const button = document.createElement("button");
  button.textContent = "break cache";
  button.style = `
    cursor: pointer;
    margin-left: 5px;
  `;
  button.onclick = authenticate;
  return button;
}

function appendExpandedControlRow(expandedSection, control) {
  const row = document.createElement("div");
  row.style.cssText =
    "display: flex; flex-direction: row; align-items: center; justify-content: flex-start; width: 100%;";
  control.style.marginLeft = "0";
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
  span.style = `margin-left: 5px; font-weight: ${bold ? "bold" : "normal"}; color: ${red ? "red" : "black"};`;
  return span;
}

function copySlugToClipboard() {
  const slug = getSlug();
  if (!slug) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(slug).catch(() => copySlugToClipboardFallback(slug));
    return;
  }
  copySlugToClipboardFallback(slug);
}

function copySlugToClipboardFallback(slug) {
  const ta = document.createElement("textarea");
  ta.value = slug;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function makeCopySlugButton() {
  const slug = getSlug();
  if (!slug) {
    return null;
  }

  const button = document.createElement("button");
  button.textContent = "copy slug";
  button.style = `
    cursor: pointer;
    margin-left: 5px;
  `;
  button.onclick = copySlugToClipboard;
  return button;
}

function makeStagingLink() {
  const slug = getSlug();
  if (!slug) {
    return null;
  }

  const link = document.createElement("a");
  link.href = STAGING_URL_TEMPLATE.replace("SLUG", slug);
  link.textContent = "staging";
  link.target = "_blank";
  link.style = `
    margin-left: 5px;
    color: blue;
    text-decoration: underline;
  `;
  return link;
}

function makeCloseButton() {
  const button = document.createElement("button");
  button.textContent = "×";
  button.style = `
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    margin: 0;
    padding: 0 3px;
    color: #666;
  `;
  button.onclick = function () {
    document.getElementById(CONTAINER_ID)?.remove();
  };
  button.title = "Close version display";
  return button;
}

function createContainer(contents) {
  document.getElementById(CONTAINER_ID)?.remove();
  const div = document.createElement("div");
  div.id = CONTAINER_ID;
  div.style = `
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: 100000;
    background-color: white;
    border: 1px solid black;
    display: flex;
    flex-direction: column;
  `;

  contents.forEach((element) => {
    div.appendChild(element);
  });

  document.body.prepend(div);
}

function createVersionContainer() {
  const summaryRow = document.createElement("div");
  summaryRow.style.cssText = `
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    padding: 4px 6px;
  `;

  const closeButton = makeCloseButton();
  const versionSpan = makeVersionSpan();
  const searchServiceSpan = makeSearchServiceIndicatorSpan();
  searchServiceSpan.style.marginLeft = "0";

  const toggleTitle = "Click to show or hide controls";
  versionSpan.title = toggleTitle;
  versionSpan.style.cursor = "pointer";
  searchServiceSpan.title = toggleTitle;
  searchServiceSpan.style.cursor = "pointer";

  summaryRow.appendChild(closeButton);
  summaryRow.appendChild(versionSpan);
  summaryRow.appendChild(searchServiceSpan);

  const expandedSection = document.createElement("div");
  expandedSection.style.cssText = `
    display: none;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid #ccc;
    padding: 6px;
  `;

  const stagingLink = makeStagingLink();
  if (stagingLink) {
    appendExpandedControlRow(expandedSection, stagingLink);
  }
  const copySlugButton = makeCopySlugButton();
  if (copySlugButton) {
    appendExpandedControlRow(expandedSection, copySlugButton);
  }
  appendExpandedControlRow(expandedSection, makeCacheBreakerButton());

  const liveHistoryHost = document.createElement("div");
  liveHistoryHost.style.cssText =
    "width: 100%; font-size: 12px; text-align: left; color: #333;";
  expandedSection.appendChild(liveHistoryHost);

  let expanded = false;
  function setExpanded(next) {
    expanded = next;
    expandedSection.style.display = expanded ? "flex" : "none";
  }

  function onToggleClick(event) {
    event.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    if (next) {
      loadLiveHistoryData(liveHistoryHost);
    }
  }

  versionSpan.addEventListener("click", onToggleClick);
  searchServiceSpan.addEventListener("click", onToggleClick);

  createContainer([summaryRow, expandedSection]);
}

function createCacheBreakerContainer(message) {
  createContainer([makeCacheBreakerSpan(message)]);
}

if (!handleCacheBreaker() && isDiSite()) {
  createVersionContainer();
}
