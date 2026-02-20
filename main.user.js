// ==UserScript==
// @name        DI Website Version
// @namespace   Violentmonkey Scripts
// @match       https://*/*
// @grant       none
// @author      Jeff Puckett
// @version 1.7.1
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
const SEARCH_PROVIDER_STORAGE_KEY = "tamper-web-version-search-provider";
const SEARCH_PROVIDER_ALGOLIA = "algolia";
const SEARCH_PROVIDER_OFF = "off";
const SEARCH_PROVIDER_SEARCH_SERVICE = "search_service";

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

function getSearchProvider() {
  const v = localStorage.getItem(SEARCH_PROVIDER_STORAGE_KEY);
  if (v === SEARCH_PROVIDER_ALGOLIA || v === SEARCH_PROVIDER_OFF || v === SEARCH_PROVIDER_SEARCH_SERVICE) {
    return v;
  }
  return SEARCH_PROVIDER_OFF;
}

function setSearchProvider(value) {
  localStorage.setItem(SEARCH_PROVIDER_STORAGE_KEY, value);
}

function getInventorySearchProviderHeaderValue() {
  const provider = getSearchProvider();
  if (provider === SEARCH_PROVIDER_ALGOLIA) return "algolia";
  if (provider === SEARCH_PROVIDER_SEARCH_SERVICE) return "search-service";
  return null;
}

function isRequestToPrimaryDomain(url) {
  try {
    const requestOrigin = new URL(url, location.href).origin;
    return requestOrigin === location.origin;
  } catch {
    return false;
  }
}

function installRequestHeaderInterceptor() {
  const headerName = "inventory-search-provider";

  const nativeXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new nativeXHR();
    let requestUrl = "";
    const origOpen = xhr.open;
    xhr.open = function (method, url, ...rest) {
      requestUrl = typeof url === "string" ? url : String(url);
      return origOpen.apply(this, [method, url, ...rest]);
    };
    const origSend = xhr.send;
    xhr.send = function (...args) {
      const value = getInventorySearchProviderHeaderValue();
      if (value && isRequestToPrimaryDomain(requestUrl)) {
        xhr.setRequestHeader(headerName, value);
      }
      return origSend.apply(this, args);
    };
    return xhr;
  };

  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url;
    const value = getInventorySearchProviderHeaderValue();
    if (value && url && isRequestToPrimaryDomain(url)) {
      init = init || {};
      const headers = new Headers(init.headers);
      headers.set(headerName, value);
      init = { ...init, headers };
    }
    return nativeFetch(input, init);
  };
}

function getSearchProviderLabelState() {
  const searchServiceEnabled = window.SEARCH_SERVICE?.enabled === "1";
  const text = searchServiceEnabled ? "SS" : "A";
  const provider = getSearchProvider();
  const toggleMatchesWindow =
    (searchServiceEnabled && provider === SEARCH_PROVIDER_SEARCH_SERVICE) ||
    (!searchServiceEnabled && provider === SEARCH_PROVIDER_ALGOLIA);
  const mismatch = !toggleMatchesWindow && provider !== SEARCH_PROVIDER_OFF;
  return {
    text,
    bold: toggleMatchesWindow,
    color: mismatch ? "red" : "black",
  };
}

function applySearchProviderLabelState(span) {
  const state = getSearchProviderLabelState();
  span.textContent = state.text;
  span.style.fontWeight = state.bold ? "bold" : "normal";
  span.style.color = state.color;
}

function makeSearchProviderDropdown(updateLabelSpan, closeDropdown) {
  const provider = getSearchProvider();
  const wrap = document.createElement("div");
  wrap.style = `
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f8f8f8;
  `;
  const labels = [
    [SEARCH_PROVIDER_ALGOLIA, "Algolia"],
    [SEARCH_PROVIDER_OFF, "Off"],
    [SEARCH_PROVIDER_SEARCH_SERVICE, "Search Service"],
  ];
  labels.forEach(([value, label]) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.dataset.provider = value;
    btn.style = `
      padding: 2px 8px;
      font-size: 12px;
      cursor: pointer;
      border: 1px solid #ccc;
      background: ${provider === value ? "#e0e0e0" : "#fff"};
      font-weight: ${provider === value ? "bold" : "normal"};
    `;
    btn.onclick = () => {
      setSearchProvider(value);
      updateLabelSpan();
      wrap.querySelectorAll("button").forEach((b) => {
        b.style.background = b.dataset.provider === value ? "#e0e0e0" : "#fff";
        b.style.fontWeight = b.dataset.provider === value ? "bold" : "normal";
      });
      closeDropdown();
    };
    wrap.appendChild(btn);
  });
  return wrap;
}

function makeSearchServiceIndicatorSpan() {
  const wrapper = document.createElement("span");
  wrapper.style = "margin-left: 5px; position: relative; display: inline-block;";

  const label = document.createElement("span");
  label.style = "cursor: pointer; user-select: none;";
  applySearchProviderLabelState(label);

  let dropdown = null;

  function closeOnClickOutside(e) {
    if (wrapper.contains(e.target)) return;
    if (dropdown) dropdown.remove();
    dropdown = null;
    document.removeEventListener("click", closeOnClickOutside);
  }

  label.onclick = (e) => {
    e.stopPropagation();
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
      document.removeEventListener("click", closeOnClickOutside);
      return;
    }
    dropdown = document.createElement("div");
    dropdown.style = `
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 2px;
      z-index: 100001;
    `;
    const closeDropdown = () => {
      if (dropdown) dropdown.remove();
      dropdown = null;
      document.removeEventListener("click", closeOnClickOutside);
    };
    dropdown.appendChild(
      makeSearchProviderDropdown(
        () => applySearchProviderLabelState(label),
        closeDropdown
      )
    );
    wrapper.appendChild(dropdown);
    document.addEventListener("click", closeOnClickOutside);
  };

  wrapper.appendChild(label);
  return wrapper;
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
  const elements = [
    makeCloseButton(),
    makeVersionSpan(),
    makeSearchServiceIndicatorSpan(),
  ];
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

installRequestHeaderInterceptor();

if (!handleCacheBreaker() && isDiSite()) {
  createVersionContainer();
}
