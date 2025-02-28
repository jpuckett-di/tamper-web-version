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

function createLabel() {
  const version = getVersion();
  const span = document.createElement("span");
  span.textContent = version;
  span.style = `
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: 100000;
    background-color: white;
    color: ${getLabelColor(version)};
    border: 1px solid black;
  `;
  document.body.prepend(span);
}

if (isDiSite()) {
  createLabel();
}
