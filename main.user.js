// ==UserScript==
// @name        DI Website Version
// @namespace   Violentmonkey Scripts
// @match       https://*/*
// @grant       none
// @author      Jeff Puckett
// @version 1.4.0
// @description Shows the version of the website
// @homepageURL https://github.com/jpuckett-di/tamper-web-version
// @downloadURL https://raw.githubusercontent.com/jpuckett-di/tamper-web-version/refs/heads/main/main.user.js
// ==/UserScript==
const CURRENT_VERSION = undefined;
const VERSION_SEARCH_NEEDLE = '"version": "';
const VERSION_SEARCH_NEEDLE_LENGTH = 12;
const VERSION_STRING_LENGTH = 40;
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
  button.onclick = function() {
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
  createContainer([makeCloseButton(), makeVersionSpan(), makeCacheBreakerButton()]);
}

function createCacheBreakerContainer(message) {
  createContainer([makeCacheBreakerSpan(message)]);
}

if (!handleCacheBreaker() && isDiSite()) {
  createVersionContainer();
}
