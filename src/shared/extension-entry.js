import { observeGeminiImages } from './pageImages.js'
const toggle = observeGeminiImages({
  enabled: false,
  onCleaned: () => chrome.runtime.sendMessage({ type: 'gvwr-image-cleaned' }).catch(() => {}),
})
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.gvwrEnabled) toggle(changes.gvwrEnabled.newValue)
})
chrome.storage.local.get({ gvwrEnabled: true }).then(state => toggle(state.gvwrEnabled))
