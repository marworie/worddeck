namespace WordDeck.Services
{
    // Metindeki kelimeyi sözlükteki temel haline çevirir: went → go, running → run, studies → study.
    // Tek bir doğru cevap yerine olası adayları sırayla verir; veritabanında ilk bulunan kullanılır.
    public static class Lemmatizer
    {
        // Düzensiz fiiller: "temel geçmiş üçüncü-hal"
        private const string Verbs =
            "arise arose arisen|awake awoke awoken|be was been|beat beat beaten|become became become|" +
            "begin began begun|bend bent bent|bite bit bitten|bleed bled bled|blow blew blown|" +
            "break broke broken|bring brought brought|build built built|burn burnt burnt|buy bought bought|" +
            "catch caught caught|choose chose chosen|come came come|cost cost cost|cut cut cut|" +
            "deal dealt dealt|dig dug dug|do did done|draw drew drawn|dream dreamt dreamt|" +
            "drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feed fed fed|" +
            "feel felt felt|fight fought fought|find found found|fly flew flown|forbid forbade forbidden|" +
            "forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|get got gotten|" +
            "give gave given|go went gone|grow grew grown|hang hung hung|have had had|hear heard heard|" +
            "hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|kneel knelt knelt|" +
            "know knew known|lay laid laid|lead led led|learn learnt learnt|leave left left|lend lent lent|" +
            "let let let|lie lay lain|light lit lit|lose lost lost|make made made|mean meant meant|" +
            "meet met met|pay paid paid|put put put|quit quit quit|read read read|ride rode ridden|" +
            "ring rang rung|rise rose risen|run ran run|say said said|see saw seen|seek sought sought|" +
            "sell sold sold|send sent sent|set set set|shake shook shaken|shine shone shone|" +
            "shoot shot shot|show showed shown|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|" +
            "sleep slept slept|slide slid slid|speak spoke spoken|spend spent spent|spill spilt spilt|" +
            "spread spread spread|stand stood stood|steal stole stolen|stick stuck stuck|" +
            "strike struck struck|swear swore sworn|sweep swept swept|swim swam swum|swing swung swung|" +
            "take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|" +
            "throw threw thrown|understand understood understood|wake woke woken|wear wore worn|" +
            "weep wept wept|win won won|write wrote written";

        // Kurallara uymayan diğer haller
        private const string Extra =
            "am be|is be|are be|were be|being be|has have|having have|does do|doing do|goes go|" +
            "lying lie|dying die|tying tie|children child|men man|women woman|feet foot|teeth tooth|" +
            "mice mouse|geese goose|wives wife|knives knife|better good|best good|worse bad|worst bad|" +
            "further far|farther far";

        // Başka bir kelimeyle karışan haller: "rose" (gül) → rise olmasın
        private static readonly HashSet<string> Skip = new() { "rose" };

        private static readonly Dictionary<string, string> Irregular = BuildIrregular();

        private static Dictionary<string, string> BuildIrregular()
        {
            var map = new Dictionary<string, string>();
            var rows = Verbs.Split('|');
            var bases = rows.Select(r => r.Split(' ')[0]).ToHashSet();

            foreach (var row in rows)
            {
                var parts = row.Split(' ');
                foreach (var form in parts.Skip(1))
                    if (!bases.Contains(form) && !Skip.Contains(form))   // "lay" kendisi de bir fiil
                        map.TryAdd(form, parts[0]);
            }

            foreach (var row in Extra.Split('|'))
            {
                var parts = row.Split(' ');
                map[parts[0]] = parts[1];
            }
            return map;
        }

        // Metinden gelen ham kelimeyi temizler: "Doesn't" → "does", "John's," → "john"
        public static string Normalize(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "";
            var s = raw.Trim().ToLowerInvariant().Replace('’', '\'');
            s = s.Trim(' ', '"', '“', '”', '\'', '.', ',', '!', '?', ';', ':', '(', ')', '[', ']', '-', '—');

            if (s == "can't") return "can";
            if (s == "won't") return "will";
            if (s.EndsWith("n't")) s = s[..^3];

            foreach (var suffix in new[] { "'s", "'re", "'ve", "'ll", "'d", "'m" })
                if (s.EndsWith(suffix)) { s = s[..^suffix.Length]; break; }

            s = s.Trim('\'');
            return s.Length > 0 && s.All(c => char.IsLetter(c) || c == '-') ? s : "";
        }

        // Olası temel haller, en olasıdan başlayarak
        public static List<string> Candidates(string word)
        {
            var list = new List<string>();
            void Add(string x) { if (x.Length > 0 && !list.Contains(x)) list.Add(x); }

            if (Irregular.TryGetValue(word, out var irregular)) Add(irregular);
            Add(word);
            if (word.Length < 4) return list;

            // Çoğul / 3. tekil şahıs: studies → study, goes → go, cats → cat
            if (word.EndsWith("ies")) { Add(word[..^3] + "y"); Add(word[..^1]); }
            else if (word.EndsWith("ied")) { Add(word[..^3] + "y"); Add(word[..^1]); }   // died → die
            else if (word.EndsWith("es")) { Add(word[..^1]); Add(word[..^2]); }
            else if (word.EndsWith("s") && !word.EndsWith("ss")) Add(word[..^1]);

            if (word.EndsWith("ing") && word.Length >= 5) AddStem(word[..^3], Add);
            if (word.EndsWith("ed")) AddStem(word[..^2], Add);

            // Karşılaştırma: bigger → big, happier → happy, nicest → nice
            string? comp = word.EndsWith("est") ? word[..^3] : word.EndsWith("er") ? word[..^2] : null;
            if (comp != null)
            {
                if (comp.EndsWith('i')) Add(comp[..^1] + "y");
                else AddStem(comp, Add);
            }

            return list;
        }

        // -ing / -ed atıldıktan sonra kalan kök: running → run, liked → like, added → add
        private static void AddStem(string stem, Action<string> add)
        {
            if (stem.Length < 2) return;

            if (stem.Length >= 3 && stem[^1] == stem[^2] && IsConsonant(stem[^1]))
            {
                add(stem);           // added → add
                add(stem[..^1]);     // running → run
            }
            else if (stem.Length <= 2 || IsCvc(stem))
            {
                add(stem + "e");     // liked → like, using → use (us değil)
                add(stem);
            }
            else
            {
                add(stem);           // talked → talk
                add(stem + "e");
            }
        }

        private static bool IsVowel(char c) => "aeiou".Contains(c);
        private static bool IsConsonant(char c) => char.IsLetter(c) && !IsVowel(c);

        // Sessiz-sesli-sessiz ile biten kök (hop, lik, us): sonuna genelde "e" gelir
        private static bool IsCvc(string s) =>
            s.Length >= 3 && IsConsonant(s[^1]) && !"wxy".Contains(s[^1])
            && IsVowel(s[^2]) && IsConsonant(s[^3]);
    }
}