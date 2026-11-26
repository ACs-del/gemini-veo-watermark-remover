import { processImage } from '../core/gemini/imageProcessor.js'

export function observeGeminiImages({ enabled = true, onCleaned = () => {} } = {}) {
  const records = new Map()
  const pending = new WeakMap()
  const container = 'generated-image, generated-image-container, image-generation-result, [data-message-id], model-response, .model-response, .response-container'
  function restore(img) {
    const record = records.get(img)
    if (!record) return
    if (img.src === record.url) {
      img.src = record.src
      if (record.srcset !== null) img.setAttribute('srcset', record.srcset)
    }
    records.delete(img)
    URL.revokeObjectURL(record.url)
  }
  async function inspect(img) {
    if (!enabled || !img.isConnected || !img.complete || Math.min(img.naturalWidth, img.naturalHeight) < 128) return
    const src = img.currentSrc || img.src
    if (records.get(img)?.url === img.src || pending.get(img) === src) return
    restore(img)
    if (!img.closest(container) && !/^https:\/\/[\w.-]+\.googleusercontent\.com\//.test(src)) return
    pending.set(img, src)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      let pixels
      try {
        ctx.drawImage(img, 0, 0)
        pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      } catch {
        const res = await fetch(src)
        if (!res.ok) return
        const bitmap = await createImageBitmap(await res.blob())
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      }
      if (!processImage(pixels).processed) return
      ctx.putImageData(pixels, 0, 0)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob || !enabled || !img.isConnected || src !== (img.currentSrc || img.src)) return
      const url = URL.createObjectURL(blob)
      records.set(img, { src: img.src, srcset: img.getAttribute('srcset'), source: src, blob, url })
      img.removeAttribute('srcset')
      img.src = url
      onCleaned()
    } catch (error) {
      console.debug('Gemini image cleanup skipped:', error.message)
    } finally {
      if (pending.get(img) === src) pending.delete(img)
    }
  }
  function scan(node) {
    if (node instanceof HTMLImageElement) inspect(node)
    else node.querySelectorAll?.('img').forEach(inspect)
  }
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLImageElement) inspect(event.target)
  }, true)
  new MutationObserver(changes => {
    for (const change of changes) {
      if (change.type === 'attributes') inspect(change.target)
      for (const node of change.addedNodes) scan(node)
    }
    for (const img of records.keys()) if (!img.isConnected) restore(img)
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset'] })
  document.addEventListener('click', event => {
    const control = event.target.closest?.('a, button, [role="button"]')
    if (!enabled || !control) return
    const scope = control.closest(container)
    const images = [...records.entries()].filter(([img, record]) =>
      control.href ? [record.source, record.src, record.url].includes(control.href) : scope?.contains(img))
    if (images.length !== 1) return
    const record = images[0][1]
    if (control instanceof HTMLAnchorElement) {
      if (control.hasAttribute('download')) control.href = record.url
      return
    }
    const label = [control.ariaLabel, control.title, control.dataset.testid, control.textContent].filter(Boolean).join(' ')
    if (!/image|图片|圖像|画像|imagen|bild/i.test(label) && !control.closest('generated-image, generated-image-container')) return
    if (/download|下载|下載|ダウンロード|descargar|herunterladen/i.test(label)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const link = document.createElement('a')
      link.href = record.url
      link.download = 'gemini-clean.png'
      link.click()
    } else if (/copy|复制|複製|コピー|copiar|kopieren/i.test(label) && navigator.clipboard?.write) {
      event.preventDefault()
      event.stopImmediatePropagation()
      navigator.clipboard.write([new ClipboardItem({ 'image/png': record.blob })]).catch(console.warn)
    }
  }, true)
  scan(document)
  return active => {
    enabled = active
    if (enabled) scan(document)
    else for (const img of records.keys()) restore(img)
  }
}
