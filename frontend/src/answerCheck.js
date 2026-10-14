// ============================================================
// answerCheck.js
// Yazılan ve söylenen cevapları kontrol eder.
// Yazmada 1 harflik yazım hatasını (uzun kelimelerde) tolere eder,
// söylemede sesteş kelimeleri (two/too/to) doğru sayar.
// ============================================================

// Küçük harf, baştaki/sondaki boşluk ve noktalama temizliği
const normalize = (s) =>
  (s ?? '').toLowerCase().trim().replace(/[.,!?;:"'’]/g, '').replace(/\s+/g, ' ')

// İki kelime arasındaki "harf farkı" sayısı (Levenshtein mesafesi):
// kaç harf ekleme/silme/değiştirme ile biri diğerine dönüşür
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,                                   // silme
        dp[i][j - 1] + 1,                                   // ekleme
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)  // değiştirme
      )
    }
  }
  return dp[a.length][b.length]
}

// Yazılan cevap: tam eşleşme doğru; 5+ harfli kelimede 1 harf hatası da doğru ama "yazım hatası" notuyla
export function checkTyped(input, answer) {
  const a = normalize(input)
  const b = normalize(answer)
  if (!a) return { correct: false, typo: false }
  if (a === b) return { correct: true, typo: false }
  if (b.length >= 5 && editDistance(a, b) === 1) return { correct: true, typo: true }
  return { correct: false, typo: false }
}

// Ses tanımanın karıştırabileceği sesteş kelimeler
const HOMOPHONES = {
  to: ['two', 'too'], two: ['to', 'too'], too: ['to', 'two'],
  write: ['right'], right: ['write'], know: ['no'], no: ['know'],
  their: ['there'], there: ['their'], hear: ['here'], here: ['hear'],
  see: ['sea'], sea: ['see'], buy: ['by', 'bye'], by: ['buy', 'bye'],
  one: ['won'], won: ['one'], eight: ['ate'], four: ['for'], for: ['four'],
  hour: ['our'], our: ['hour'], weather: ['whether'], whether: ['weather'],
  week: ['weak'], weak: ['week'], meet: ['meat'], meat: ['meet'],
  flour: ['flower'], flower: ['flour'], wear: ['where'], where: ['wear']
}

// Söylenen cevap: tahminlerden herhangi birinde kelime (ya da sesteşi) geçiyorsa doğru
export function checkSpoken(alternatives, answer) {
  const target = normalize(answer)
  const accepted = [target, ...(HOMOPHONES[target] ?? [])]

  return alternatives.some(alt => {
    const heard = normalize(alt)
    const words = heard.split(' ')
    // Tek kelimelik cevaplarda kelime listesinde ara ("the run" → doğru),
    // çok kelimelilerde ("look after") cümlenin içinde ara
    return accepted.some(t => (t.includes(' ') ? heard.includes(t) : words.includes(t)))
  })
}