'use strict';

const toggleEl = document.getElementById('gvwr-toggle');
const statusEl = document.getElementById('gvwr-status');
const cleanedCountEl = document.getElementById('gvwr-cleaned-count');
const sessionCountEl = document.getElementById('gvwr-session-count');

function updateStatusText(enabled) {
  statusEl.textContent = enabled ? 'Enabled' : 'Disabled';
  statusEl.style.color = enabled ? '#2e7d32' : '#888';
}

// Load persisted state and stats
chrome.storage.local.get(
  { gvwrEnabled: true, gvwrTotalCleaned: 0, gvwrSessionCleaned: 0 },
  (result) => {
    toggleEl.checked = result.gvwrEnabled;
    updateStatusText(result.gvwrEnabled);
    cleanedCountEl.textContent = result.gvwrTotalCleaned;
    sessionCountEl.textContent = result.gvwrSessionCleaned;
  },
);

toggleEl.addEventListener('change', () => {
  const enabled = toggleEl.checked;
  chrome.storage.local.set({ gvwrEnabled: enabled });
  updateStatusText(enabled);

  // Notify all matching content scripts of the state change
  chrome.runtime.sendMessage({ type: 'gvwr-toggle', enabled });
});
