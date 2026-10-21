// ============================================================
// meaning.js
// Otomatik çeviriden gelen Türkçe anlamı ekranda göstermeden önce toparlar.
// "yakışıklı, ve sen daha az değilsin" → "yakışıklı"
// "akşam yemeği;, akşam yemeği"       → "akşam yemeği"
// ============================================================

const MAX_PARTS = 3      // en fazla kaç anlam gösterilsin
const MAX_WORDS = 3      // bir anlam en fazla kaç kelime olabilir (cümle gibi parçalar çöptür)
const MAX_LENGTH = 25

export function cleanMeanings(text) {
  if (!text) return null

  const parts = text
    .split(/[,;]/)
    .map(p => p.trim().replace(/[.!?]+$/, ''))   // sondaki noktalamayı at
    .filter(p => p.length > 0 && p.length <= MAX_LENGTH && p.split(/\s+/).length <= MAX_WORDS)

  // Aynı anlam iki kez yazılmasın (büyük/küçük harf farkı önemsiz)
  const unique = [...new Map(parts.map(p => [p.toLocaleLowerCase('tr'), p])).values()]

  if (unique.length > 0) return unique.slice(0, MAX_PARTS).join(', ')

  // Hiçbir parça kurala uymadıysa en azından ilk parçayı göster (anlam tamamen kaybolmasın)
  return text.split(/[,;]/)[0].trim() || null
}