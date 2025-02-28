// ==UserScript==
// @name        DI Website Version
// @namespace   Violentmonkey Scripts
// @match       https://*/*
// @grant       none
// @author      Jeff Puckett
// @description Shows the version of the website
// ==/UserScript==
const CURRENT_VERSION = undefined;
const VERSION_SEARCH_NEEDLE = '"version": "';
const VERSION_SEARCH_NEEDLE_LENGTH = 12;
const VERSION_STRING_LENGTH = 40;
const DEALER_INSPIRE_MAST = `\n  ______  _______ _______        _______  ______ _____ __   _ _______  _____  _____  ______ _______\n  |     \\ |______ |_____| |      |______ |_____/   |   | \\  | |______ |_____]   |   |_____/ |______\n  |_____/ |______ |     | |_____ |______ |    \\_ __|__ |  \\_| ______| |       __|__ |    \\_ |______\n         Visit http://www.dealerinspire.com to Inspire your visitors and turn them into customers.\n`;
const CACHE_BREAKER_STORAGE_KEY = "tamper-web-version-cache-breaker";
const CACHE_BREAKER_AUTHENTICATING = "AUTHENTICATING";
const CACHE_BREAKER_BREAKING = "BREAKING";

function authenticate() {
  localStorage.setItem(CACHE_BREAKER_STORAGE_KEY, CACHE_BREAKER_AUTHENTICATING);
  window.location.assign("/wp/wp-admin/");
}

function breakCache() {
  if (
    localStorage.getItem(CACHE_BREAKER_STORAGE_KEY) === CACHE_BREAKER_BREAKING
  ) {
    console.error(
      CACHE_BREAKER_STORAGE_KEY +
        " already attempting to break cache. aborting to prevent infinite loop"
    );
    return;
  }

  const url = document.querySelector(
    'a[href*="/wp/wp-admin/admin-post.php?action=empty_cache"]'
  )?.href;

  if (!url) {
    console.error(CACHE_BREAKER_STORAGE_KEY + " cache breaker url not found");
    return;
  }

  localStorage.setItem(CACHE_BREAKER_STORAGE_KEY, CACHE_BREAKER_BREAKING);
  window.location.assign(url);
}

function handleCacheBreaker() {
  if (
    localStorage.getItem(CACHE_BREAKER_STORAGE_KEY) ===
    CACHE_BREAKER_AUTHENTICATING
  ) {
    breakCache();
    return true;
  }

  if (
    localStorage.getItem(CACHE_BREAKER_STORAGE_KEY) === CACHE_BREAKER_BREAKING
  ) {
    localStorage.removeItem(CACHE_BREAKER_STORAGE_KEY);
    window.location.assign("/");
    return true;
  }

  return false;
}

function isDiSite() {
  return document.childNodes[1].textContent === DEALER_INSPIRE_MAST;
}

function getVersion() {
  const searchVersionPosition = document.head.innerHTML.search(
    VERSION_SEARCH_NEEDLE
  );

  if (searchVersionPosition === -1) {
    return "version not found";
  }

  const versionPosition = searchVersionPosition + VERSION_SEARCH_NEEDLE_LENGTH;

  return document.head.innerHTML.substring(
    versionPosition,
    versionPosition + VERSION_STRING_LENGTH
  );
}

function getLabelColor(version) {
  if (!CURRENT_VERSION) {
    return "black";
  }

  if (CURRENT_VERSION === version) {
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

function makeCacheBreakerButton() {
  const button = document.createElement("button");
  button.textContent = "break cache";
  button.onclick = authenticate;
  return button;
}

function createContainer() {
  const div = document.createElement("div");
  div.style = `
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: 100000;
    background-color: white;
    border: 1px solid black;
  `;
  div.appendChild(makeVersionSpan());
  div.appendChild(makeCacheBreakerButton());
  document.body.prepend(div);
}

if (!handleCacheBreaker() && isDiSite()) {
  createContainer();
}
