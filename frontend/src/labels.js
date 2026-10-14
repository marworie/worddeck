// Uygulamanın birden fazla yerinde kullanılan Türkçe etiketler

// Kelime türleri
export const POS_TR = {
  noun: 'isim',
  verb: 'fiil',
  adjective: 'sıfat',
  adverb: 'zarf',
  preposition: 'edat',
  pronoun: 'zamir',
  conjunction: 'bağlaç',
  determiner: 'belirleyici',
  'modal verb': 'yardımcı fiil',
  number: 'sayı',
  interjection: 'ünlem'
}

export const posTr = (pos) => POS_TR[pos?.toLowerCase()] ?? pos

// Zor kelime durumları (backend'deki HardState ile aynı sayılar)
export const HARD_STATES = {
  1: { label: 'Zor', className: 'state-hard' },
  2: { label: 'Güçleniyor', className: 'state-strengthening' },
  3: { label: 'Ustalaşıldı', className: 'state-mastered' }
}

// Soru tipleri
export const QUESTION_TYPES_TR = {
  choice: 'Çoktan seçmeli',
  cloze: 'Boşluk doldurma',
  typing: 'Yazma',
  listening: 'Dinleme',
  speaking: 'Söyleme'
}