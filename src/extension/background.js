'use strict';

/**
 * Service worker: manages extension state and relays messages between
 * the popup and content scripts.
 */

// Initialise default storage values on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    gvwrEnabled: true,
    gvwrTotalCleaned: 0,
    gvwrSessionCleaned: 0,
  });
});

// Reset session counter when the service worker starts (new browser session)
chrome.storage.local.set({ gvwrSessionCleaned: 0 });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    // Popup toggled the extension on/off — relay to all matching tabs
    case 'gvwr-toggle': {
      chrome.tabs.query(
        { url: ['https://gemini.google.com/*', 'https://aistudio.google.com/*'] },
        (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, message).catch(() => {});
          }
        },
      );
      break;
    }

    // Content script reports a cleaned image
    case 'gvwr-image-cleaned': {
      chrome.storage.local.get(
        { gvwrTotalCleaned: 0, gvwrSessionCleaned: 0 },
        (result) => {
          chrome.storage.local.set({
            gvwrTotalCleaned: result.gvwrTotalCleaned + 1,
            gvwrSessionCleaned: result.gvwrSessionCleaned + 1,
          });
        },
      );
      break;
    }

    // Content script asks for current enabled state
    case 'gvwr-get-state': {
      chrome.storage.local.get({ gvwrEnabled: true }, (result) => {
        sendResponse({ enabled: result.gvwrEnabled });
      });
      return true; // keep channel open for async sendResponse
    }
  }
});
