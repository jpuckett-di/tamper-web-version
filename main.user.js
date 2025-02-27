// ==UserScript==
// @name        DI Website Version
// @namespace   Violentmonkey Scripts
// @match       https://*/*
// @grant       none
// @author      Jeff Puckett
// @description Shows the version of the website
// ==/UserScript==
const VERSION_SEARCH_NEEDLE = '"version": "';
const VERSION_SEARCH_NEEDLE_LENGTH = 12;
const VERSION_STRING_LENGTH = 40;

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

function createLabel() {
  const span = document.createElement("span");
  span.style = "position: absolute; top: 0px; left: 0px; z-index: 100000; background-color:#fff; color: black; border: 1px solid black;";
  span.textContent = getVersion();
  document.body.prepend(span);
}

createLabel();
