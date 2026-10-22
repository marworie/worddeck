// ============================================================
// reader.js
// Okuyucu yardımcıları: metni kelimelere böler, kelimeyi backend'deki
// Lemmatizer.Normalize ile aynı şekilde temizler.
// ============================================================

// "Doesn't" → "does", "John's," → "john" (backend ile aynı kurallar)
export function normalizeWord(raw) {
  let s = raw.toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, '')
  if (s === "can't") return 'can'
  if (s === "won't") return 'will'
  if (s.endsWith("n't")) s = s.slice(0, -3)
  for (const suffix of ["'s", "'re", "'ve", "'ll", "'d", "'m"]) {
    if (s.endsWith(suffix)) { s = s.slice(0, -suffix.length); break }
  }
  s = s.replace(/^'+|'+$/g, '')
  return /^[a-z-]+$/.test(s) ? s : ''
}

// Paragrafı kelime ve aradaki işaretler olarak böler
export function tokenize(text) {
  return text.split(/([A-Za-z’'-]+)/).filter(Boolean).map(part => {
    const key = /[A-Za-z]/.test(part) ? normalizeWord(part) : ''
    return { text: part, word: key !== '', key }
  })
}

// Hikayedeki tüm farklı kelimeler (backend'e tek seferde gönderilir)
export function uniqueWords(pages) {
  const set = new Set()
  for (const page of pages) {
    for (const t of tokenize(page)) if (t.word) set.add(t.key)
  }
  return [...set]
}