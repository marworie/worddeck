// ============================================================
// phonetics.js
// 1) Fonetik Rehberi'nin verisi: Türkçede olmayan ya da farklı okunan İngilizce sesler
// 2) ipaToTurkish(): IPA'yı Türkçe okunuşa çevirir: /əˈbɪl.ə.ti/ → "ı-Bİ-lı-ti"
//    (yaklaşık bir okunuştur; asıl doğru ses için seslendirmeyi dinlemek gerekir)
// ============================================================

// ===== Rehber verisi =====
export const PHONETIC_GROUPS = [
  {
    title: 'Temel işaretler',
    intro: 'Fonetik yazım iki eğik çizgi arasında durur: /…/. Bu işaretler ses değil, okuma talimatıdır.',
    items: [
      { symbol: 'ˈ', tr: 'vurgu', tip: 'Arkasından gelen hece daha güçlü ve uzun söylenir.', word: 'about', ipa: '/əˈbaʊt/' },
      { symbol: 'ˌ', tr: 'ikincil vurgu', tip: 'Daha hafif bir vurgu. Uzun kelimelerde görülür.', word: 'education', ipa: '/ˌed͡ʒʊˈkeɪʃən/' },
      { symbol: 'ː', tr: 'uzun ses', tip: 'Önündeki ünlüyü uzat: iː = "ii".', word: 'see', ipa: '/siː/' },
      { symbol: '.', tr: 'hece sınırı', tip: 'Kelimenin hecelere nereden ayrıldığını gösterir.', word: 'ability', ipa: '/əˈbɪl.ə.ti/' }
    ]
  },
  {
    title: 'Ünlüler',
    intro: 'İngilizcede Türkçeden çok daha fazla ünlü var. En çok karıştırılanlar bunlar.',
    items: [
      { symbol: 'ə', tr: 'ı', tip: 'En sık görülen ses (schwa). Vurgusuz hecelerde, ağız gevşek, kısa bir "ı".', word: 'about', ipa: '/əˈbaʊt/' },
      { symbol: 'ɪ', tr: 'kısa i', tip: 'Türkçe "i"den daha kısa ve gevşek, "ı"ya biraz yakın.', word: 'sit', ipa: '/sɪt/' },
      { symbol: 'iː', tr: 'uzun i', tip: 'Gülümser gibi, uzun bir "ii". sit ile seat farkı budur.', word: 'seat', ipa: '/siːt/' },
      { symbol: 'æ', tr: 'a ile e arası', tip: 'Ağzını "a" der gibi açıp "e" de.', word: 'cat', ipa: '/kæt/' },
      { symbol: 'ʌ', tr: 'kısa a', tip: 'Kısa, düz bir "a". Ağız çok açılmaz.', word: 'cup', ipa: '/kʌp/' },
      { symbol: 'ɑː', tr: 'uzun a', tip: 'Boğazdan gelen derin, uzun bir "aa".', word: 'car', ipa: '/kɑːr/' },
      { symbol: 'ɒ', tr: 'kısa o', tip: 'Ağzı açık, kısa bir "o". İngiliz aksanında duyulur.', word: 'hot', ipa: '/hɒt/' },
      { symbol: 'ɔː', tr: 'uzun o', tip: 'Dudakları yuvarlayarak uzun bir "oo".', word: 'saw', ipa: '/sɔː/' },
      { symbol: 'ʊ', tr: 'kısa u', tip: 'Gevşek, kısa bir "u".', word: 'book', ipa: '/bʊk/' },
      { symbol: 'uː', tr: 'uzun u', tip: 'Dudaklar öne, uzun bir "uu". book ile food farkı budur.', word: 'food', ipa: '/fuːd/' },
      { symbol: 'ɜː', tr: 'ö', tip: 'Türkçe "ö"ye yakın ama dudaklar yuvarlanmaz.', word: 'bird', ipa: '/bɜːd/' },
      { symbol: 'e', tr: 'e', tip: 'Türkçedeki "e" ile hemen hemen aynı.', word: 'bed', ipa: '/bed/' }
    ]
  },
  {
    title: 'Çift ünlüler',
    intro: 'İki ünlünün tek hecede kaynaşması. Birinden diğerine kayarak söylenir.',
    items: [
      { symbol: 'eɪ', tr: 'ey', tip: '"e"den "i"ye kayarak.', word: 'day', ipa: '/deɪ/' },
      { symbol: 'aɪ', tr: 'ay', tip: '"a"dan "i"ye kayarak.', word: 'my', ipa: '/maɪ/' },
      { symbol: 'ɔɪ', tr: 'oy', tip: '"o"dan "i"ye kayarak.', word: 'boy', ipa: '/bɔɪ/' },
      { symbol: 'aʊ', tr: 'au', tip: '"a"dan "u"ya kayarak.', word: 'now', ipa: '/naʊ/' },
      { symbol: 'əʊ', tr: 'ou', tip: '"ı"dan "u"ya kayarak. Amerikan aksanında oʊ diye yazılır.', word: 'go', ipa: '/ɡəʊ/' },
      { symbol: 'ɪə', tr: 'iı', tip: '"i"den "ı"ya kayarak.', word: 'near', ipa: '/nɪə/' },
      { symbol: 'eə', tr: 'eı', tip: '"e"den "ı"ya kayarak.', word: 'hair', ipa: '/heə/' }
    ]
  },
  {
    title: 'Ünsüzler',
    intro: 'Türkçede olmayan ya da farklı yazılan ünsüzler.',
    items: [
      { symbol: 'θ', tr: 't / s arası', tip: 'Dilini üst dişlerinin arasına koy ve üfle. Sesli değil.', word: 'think', ipa: '/θɪŋk/' },
      { symbol: 'ð', tr: 'd / z arası', tip: 'θ ile aynı yer ama boğaz titrer (sesli).', word: 'this', ipa: '/ðɪs/' },
      { symbol: 'ŋ', tr: 'ng', tip: 'Genizden gelen "n". Sondaki "g" ayrıca duyulmaz.', word: 'sing', ipa: '/sɪŋ/' },
      { symbol: 'ʃ', tr: 'ş', tip: 'Türkçe "ş".', word: 'ship', ipa: '/ʃɪp/' },
      { symbol: 'ʒ', tr: 'j', tip: 'Türkçe "j" (garaj).', word: 'vision', ipa: '/ˈvɪʒən/' },
      { symbol: 'tʃ', tr: 'ç', tip: 'Türkçe "ç".', word: 'chair', ipa: '/tʃeə/' },
      { symbol: 'dʒ', tr: 'c', tip: 'Türkçe "c".', word: 'job', ipa: '/dʒɒb/' },
      { symbol: 'j', tr: 'y', tip: 'Dikkat: IPA\'da "j" harfi Türkçe "y" sesidir.', word: 'yes', ipa: '/jes/' },
      { symbol: 'w', tr: 'w', tip: 'Dudakları "u" der gibi yuvarla ve hemen aç. "v" değil!', word: 'water', ipa: '/ˈwɔːtə/' },
      { symbol: 'r / ɹ', tr: 'r', tip: 'Dil damağa değmez, Türkçedeki gibi titremez.', word: 'red', ipa: '/ɹed/' }
    ]
  }
]

// ===== IPA → Türkçe okunuş =====

// Uzun semboller önce gelmeli ki "tʃ", "t" + "ʃ" diye ayrılmasın
const IPA_TO_TR = [
  ['tʃ', 'ç'], ['t͡ʃ', 'ç'], ['dʒ', 'c'], ['d͡ʒ', 'c'],
  ['eɪ', 'ey'], ['aɪ', 'ay'], ['ɔɪ', 'oy'], ['aʊ', 'au'], ['əʊ', 'ou'], ['oʊ', 'ou'],
  ['ɪə', 'iı'], ['eə', 'eı'], ['ʊə', 'uı'],
  ['iː', 'ii'], ['uː', 'uu'], ['ɑː', 'aa'], ['ɔː', 'oo'], ['ɜː', 'öö'],
  ['ɝ', 'ör'], ['ɚ', 'ır'],
  ['ə', 'ı'], ['ɪ', 'i'], ['ɨ', 'ı'], ['ᵻ', 'ı'], ['æ', 'e'], ['ʌ', 'a'], ['ɑ', 'a'], ['ɐ', 'a'],
  ['ɒ', 'o'], ['ɔ', 'o'], ['ʊ', 'u'], ['ɜ', 'ö'], ['ɛ', 'e'], ['ɵ', 'ö'],
  ['θ', 't'], ['ð', 'd'], ['ŋ', 'ng'], ['ʃ', 'ş'], ['ʒ', 'j'], ['j', 'y'],
  ['ɹ', 'r'], ['ɾ', 'r'], ['ɫ', 'l'], ['ɡ', 'g'], ['x', 'h'], ['ʔ', ''], ['ː', '']
]

// Tek bir heceyi Türkçe harflere çevir
function convertSyllable(s) {
  let out = ''
  let i = 0
  while (i < s.length) {
    const match = IPA_TO_TR.find(([ipa]) => s.startsWith(ipa, i))
    if (match) {
      out += match[1]
      i += match[0].length
    } else {
      out += s[i]   // b, d, f, k, l, m, n, p, s, t, v, z gibi harfler Türkçeyle aynı
      i++
    }
  }
  return out
}

export function ipaToTurkish(ipa) {
  if (!ipa) return ''

  const clean = ipa
    .replace(/[/[\]()]/g, '')          // eğik çizgi, köşeli parantez, isteğe bağlı ses parantezleri
    .replace(/[\u0300-\u036f]/g, '')   // birleşik aksan işaretleri (heceli ünsüz vb.)

  // Heceleri ayır: nokta ya da vurgu işareti yeni hece başlatır; vurgulu heceyi işaretle
  const syllables = []
  let current = ''
  let stressNext = false
  let currentStressed = false

  for (const ch of clean) {
    if (ch === '.' || ch === 'ˈ' || ch === 'ˌ') {
      if (current) syllables.push({ text: current, stressed: currentStressed })
      current = ''
      currentStressed = ch === 'ˈ'
      stressNext = false
    } else {
      current += ch
    }
  }
  if (current) syllables.push({ text: current, stressed: currentStressed || stressNext })

  return syllables
    .map(s => {
      const tr = convertSyllable(s.text)
      return s.stressed ? tr.toLocaleUpperCase('tr-TR') : tr   // vurgulu hece BÜYÜK harf
    })
    .join('-')
}