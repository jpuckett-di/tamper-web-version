// ==UserScript==
// @name        DI Website Version
// @namespace   Violentmonkey Scripts
// @match       https://*/*
// @grant       none
// @author      Jeff Puckett
// @version 1.6.0
// @description Shows the version of the website
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
    margin-right: 5px;
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
  `;

  contents.forEach((element) => {
    div.appendChild(element);
  });

  document.body.prepend(div);
}

function createVersionContainer() {
  const elements = [makeCloseButton(), makeVersionSpan()];
  const stagingLink = makeStagingLink();
  if (stagingLink) {
    elements.push(stagingLink);
  }
  elements.push(makeCacheBreakerButton());
  createContainer(elements);
}

function createCacheBreakerContainer(message) {
  createContainer([makeCacheBreakerSpan(message)]);
}

if (!handleCacheBreaker() && isDiSite()) {
  createVersionContainer();
}
