import type { MiniLesson } from "./types";
import type { Locale } from "./i18n";

type LessonI18n = {
  shortExplanation: string;
  visualImage: string;
  points: string[];
  exampleEnglish: string;
  shortNote: string;
  commonMistakes?: { right: string; note: string }[];
};

// Translations keyed by locale → lesson id.
// English falls back to the original lessons.ts content.
const LESSON_I18N: Partial<Record<Locale, Record<number, LessonI18n>>> = {
  de: {
    1: {
      shortExplanation: "Hiragana ist das Fundament des Japanischen. Jeden Laut der Sprache kann man mit diesen 46 Zeichen schreiben.",
      visualImage: "Stell dir Hiragana als das Alphabet des Japanischen vor – aber statt einzelner Buchstaben ist jedes Zeichen eine ganze Silbe (ein Laut wie 'ka' oder 'mi'). Sobald du alle 46 kennst, kannst du alles, was in Hiragana geschrieben ist, laut vorlesen.",
      points: ["Die 5 Vokale: a(あ) i(い) u(う) e(え) o(お) – jede Silbe endet auf einen dieser Vokale.", "Konsonantenreihen: Jede Reihe fügt einen Konsonanten vor einem Vokal hinzu. Die か-Reihe = ka ki ku ke ko.", "Stimmhafte Laute: Füge ゛(Dakuten) hinzu, um die stimmhafte Version zu erhalten – か→が, さ→ざ, た→だ, は→ば. Füge ゜für p-Laute hinzu: は→ぱ.", "Kombinationslaute (拗音): Ein kleines ゃゅょ nach einem Laut der い-Reihe ergibt eine neue Silbe.", "Lange Vokale (おかあさん) und der doppelte Konsonant っ – ein kleines っ bedeutet eine kurze Pause vor dem nächsten Konsonanten."],
      exampleEnglish: "Ich lerne Japanisch.",
      shortNote: "Beginne mit den 5 Vokalen – sie ändern sich nie, und jeder andere Laut im Japanischen baut auf ihnen auf.",
      commonMistakes: [
        {
          right: "は als Partikel wird immer 'wa' ausgesprochen, nicht 'ha'.",
          note: "Das Partikel は sieht aus wie das Hiragana 'ha', wird aber als Themamarkierer immer 'wa' gelesen. Das verwirrt fast jeden Anfänger.",
        },
        {
          right: "きって (切手) – das kleine っ erzeugt eine Pause, keinen 'tsu'-Laut.",
          note: "Das kleine っ ist eine Pause bzw. ein verdoppelter Konsonant, nicht die Silbe 'tsu'. Ein großes つ zu schreiben verändert das Wort vollständig.",
        },
        {
          right: "ぬ = 'nu', め = 'me' – sie sehen ähnlich aus, sind aber verschiedene Zeichen.",
          note: "Mehrere Hiragana-Paare sehen sich sehr ähnlich (ぬ/め, り/い, わ/れ). Schreibe sie anfangs langsam und sorgfältig.",
        },
      ],
    },
    2: {
      shortExplanation: "Katakana sieht kantiger aus als Hiragana, stellt aber dieselben Laute dar. Es wird hauptsächlich für Fremdwörter und zur Hervorhebung verwendet.",
      visualImage: "Katakana ist Hiraganas geradliniger Zwilling – gleiche Laute, anderes Aussehen. Stell es dir als die 'Fremdwort-Schrift' des Japanischen vor. Wenn du eckige, kantige Zeichen siehst, schaust du auf Katakana.",
      points: ["Dieselben 46 Laute wie Hiragana, nur mit eckigen Strichen geschrieben: ア(a) イ(i) ウ(u) エ(e) オ(o).", "Fremdwörter (外来語): Die meisten aus anderen Sprachen entlehnten Wörter werden in Katakana geschrieben.", "Das Langvokalzeichen ー dehnt den vorangehenden Vokal.", "Besondere Kombinationen für fremde Laute, die es im Hiragana nicht gibt: ファ、ティ、ウィ usw.", "Wird auch verwendet für: Hervorhebung (wie Kursivschrift), Tier- und Pflanzennamen in der Wissenschaft sowie Onomatopoesie."],
      exampleEnglish: "Ich habe Kaffee und Kuchen bestellt.",
      shortNote: "Das Langvokalzeichen ー erscheint nur in Katakana. In Hiragana werden lange Vokale ausgeschrieben (おかあさん).",
      commonMistakes: [
        {
          right: "ソ = 'so', ン = 'n' – ン hat eine kleine Biegung; ソ ist diagonaler. シ = 'shi', ツ = 'tsu'.",
          note: "Diese vier Zeichen sehen sich sehr ähnlich. Vergleiche sie langsam nebeneinander.",
        },
        {
          right: "In Katakana immer ー für lange Vokale verwenden. ✗ コオヒイ → ✓ コーヒー",
          note: "Im Hiragana schreibt man den Vokal aus, aber im Katakana verwendet man IMMER ー.",
        },
        {
          right: "An japanische Laute anpassen: 'McDonald's' → マクドナルド, nicht die englische Aussprache.",
          note: "Japanische Lehnwörter werden an die japanischen Laute angepasst.",
        },
      ],
    },
    3: {
      shortExplanation: "Japanische Sätze sind anders aufgebaut als englische – das Verb steht immer ganz am Ende.",
      visualImage: "Ein japanischer Satz ist ein Zug. Das Themapartikel は ist das Stationsschild vorne. Zeit- und Ortswaggons kommen als nächstes. Der Objektwaggon sitzt kurz vor dem Ende. Das Verb ist die Lokomotive ganz am letzten Platz. Entscheide nicht, was der Satz bedeutet, bevor die Lokomotive angekommen ist.",
      points: ["Grundreihenfolge: Thema → Zeit/Ort → Objekt → Verb. Alles baut auf das Verb am Ende hin.", "Das Verb schließt den Satz immer ab – keine Ausnahmen im Standardjapanisch.", "Das Subjekt wird oft weggelassen, wenn es aus dem Kontext bereits klar ist.", "Adjektive stehen immer direkt vor dem Nomen, das sie beschreiben.", "Füge か am Ende hinzu, um jede Aussage in eine Frage zu verwandeln – keine Änderung der Wortstellung nötig."],
      exampleEnglish: "Ich habe gestern in der Bibliothek ein Buch gelesen.",
      shortNote: "Wenn du dich in einem langen Satz verlierst, spring ans Ende und finde das Verb – es verrät dir, was passiert.",
      commonMistakes: [
        {
          right: "わたしはラーメンを食べました。– Das Verb steht immer am Ende.",
          note: "Englischsprachige setzen das Verb instinktiv nach das Subjekt. Im Japanischen MUSS das Verb am Ende stehen.",
        },
        {
          right: "ラーメンを食べました。– Objekt vor dem Verb.",
          note: "Das Objekt steht immer VOR dem Verb.",
        },
        {
          right: "あなたはがくせいですか？– Die Wortstellung ändert sich bei Fragen nicht.",
          note: "Japanische Fragen haben exakt dieselbe Wortstellung wie Aussagesätze. Nur か am Ende markiert eine Frage.",
        },
      ],
    },
    4: {
      shortExplanation: "Das Partikel は (wa) setzt das Thema des Satzes. Alles danach sagt etwas über dieses Thema aus.",
      visualImage: "は ist ein breiter Scheinwerfer auf einer Bühne. Was auch immer は beleuchtet, wird zum Thema – zur 'Überschrift' des Satzes. Stell dir vor, du sagst 'Was [X] betrifft...' vor dem Rest. Genau das macht は.",
      points: ["は markiert das Thema: 'Was X betrifft...' – der Satz macht dann eine Aussage über X.", "Normalerweise ein は pro Satz – es setzt das Hauptthema für das Folgende.", "は kann が oder を ersetzen, um dieses Wort in die Themaposition zu bringen.", "Kontrast: Die Verwendung von は...は hebt einen Vergleich zwischen zwei Dingen hervor.", "Sobald ein Thema eingeführt wurde, kann es in den folgenden Sätzen weggelassen werden."],
      exampleEnglish: "Ich trinke jeden Morgen Kaffee.",
      shortNote: "は markiert das Thema, nicht unbedingt das grammatikalische Subjekt. Subjekt und Thema sind oft verschieden.",
      commonMistakes: [
        {
          right: "やまださんが来ました。– Neue Informationen verwenden が, nicht は.",
          note: "Bei der Frage 'wer?' oder beim Einführen neuer Informationen verwendet man が. は setzt voraus, dass das Thema bereits bekannt ist.",
        },
        {
          right: "にほんごが　できます。– Gefühle und Fähigkeiten verwenden immer が.",
          note: "Verben wie すき, きらい, できる werden immer mit が verwendet.",
        },
        {
          right: "わたしはきのうこうえんにいきました。– Ein は pro Satz ist in der Regel genug.",
          note: "Mehrere は in einem Satz zu stapeln klingt unnatürlich.",
        },
      ],
    },
    5: {
      shortExplanation: "Partikel sind kleine Wörter, die zeigen, wie jedes Wort mit dem Verb verbunden ist – wie Wegweiser, die jedem Wort sagen, wohin es gehört.",
      visualImage: "を ist ein Pfeil, der ein Ziel trifft: das Ding, das die Handlung direkt berührt. に ist eine auf einer Karte gesteckte Nadel – sie markiert ein Ziel oder einen Zeitpunkt. で ist eine Bühne oder ein Scheinwerfer – es markiert, wo die Handlung stattfindet, oder das Werkzeug, mit dem sie ausgeführt wird.",
      points: ["を = das Ziel der Handlung – das Ding, auf das das Verb einwirkt.", "に = Zielort – wohin man sich begibt oder ankommt.", "に = Zeitpunkt – verbindet die Handlung mit einem bestimmten Moment.", "で = Bühne – der Ort, an dem die Handlung stattfindet.", "で = Werkzeug oder Mittel – womit man etwas tut."],
      exampleEnglish: "Ich habe mit einem Freund in der Schule Brot gegessen.",
      shortNote: "に vs. で: に ist, wo man ankommt oder landet; で ist, wo die Handlung stattfindet.",
      commonMistakes: [
        {
          right: "がっこうで　べんきょうする。– で für den Ort einer Handlung verwenden.",
          note: "に markiert den Zielort. で markiert, wo eine Handlung stattfindet.",
        },
        {
          right: "でんしゃで　いえに　かえる。– に für den Zielort verwenden.",
          note: "でんしゃで (mit dem Zug) und いえに (nach Hause) – jedes Partikel hat seine eigene Aufgabe.",
        },
        {
          right: "さんじに　おきます。– Bestimmte Uhrzeiten benötigen に.",
          note: "Bestimmte Uhrzeiten benötigen に. Relative Zeitwörter wie きのう nehmen kein に.",
        },
      ],
    },
    6: {
      shortExplanation: "Diese fünf Partikel fügen deinen Sätzen Richtung, Zeitspanne, Begleitung und Hinzufügung hinzu.",
      visualImage: "へ ist ein Pfeil, der eine Richtung anzeigt. から ist eine Brücke mit einem Ausgangspunkt. まで ist eine Ziellinie oder ein Stoppschild. と ist ein Pluszeichen, das Personen oder Dinge verbindet. も ist ein 'Ich auch'-Stempel, der sagt 'hier genauso / ebenfalls'.",
      points: ["へ = in eine Richtung gehen – sanfter und poetischer als に.", "から = Ausgangspunkt in Raum oder Zeit.", "から = Grund (weil) – wird nach der Grundform eines Verbs oder Nomens verwendet.", "まで = Endpunkt – 'bis' oder 'so weit wie'.", "と = zusammen mit (Personen) / und (Dinge aufzählen). も = auch / ebenfalls – es ersetzt は, が oder を."],
      exampleEnglish: "Ich bin mit meinem Freund vom Bahnhof zum Park gelaufen.",
      shortNote: "から und まで sind natürliche Partner – 'von X bis Y' = X から Y まで.",
      commonMistakes: [
        {
          right: "えきから　いきます。– Ein Partikel pro Funktion verwenden.",
          note: "から und に können nicht zusammen gestapelt werden.",
        },
        {
          right: "にほんごが　すきだから、まいにち　べんきょうします。– Das Ergebnis muss auf から folgen.",
          note: "Wenn から 'weil' bedeutet, muss es von der Folge/Handlung gefolgt werden.",
        },
        {
          right: "ともだちと　いきました。– と und も haben unterschiedliche Aufgaben.",
          note: "と = mit jemandem. も = 'auch'.",
        },
      ],
    },
    7: {
      shortExplanation: "Sowohl は als auch が können dort erscheinen, wo das Subjekt steht, aber sie beleuchten es auf unterschiedliche Weise.",
      visualImage: "は ist ein breiter, sanfter Bühnenscheinwerfer – er sagt 'wir reden über dieses Thema.' が ist ein Laserpointer – er hebt genau das eine Ding hervor und sagt 'DIESES hier, konkret.' Neue Informationen, Antworten auf Wer-/Was-Fragen und emotionale Aussagen verwenden が.",
      points: ["は = breiter Scheinwerfer (Thema ist bekannt oder bereits eingeführt).", "が = Fokusscheinwerfer (neue Information oder das konkret identifizierte Ding).", "Antworten auf 'wer'- oder 'was'-Fragen verwenden が.", "Gefühle und Fähigkeiten verwenden が: was man mag, möchte oder kann.", "Ein Satz kann gleichzeitig は (Thema) und が (Subjekt) haben."],
      exampleEnglish: "Ich mag Japanisch. (Thema: ich – Fokus: Japanisch)",
      shortNote: "Wenn jemand だれが…? oder なにが…? fragt, nimmt das Antwortwort が – es ist die neue, fokussierte Information.",
      commonMistakes: [
        {
          right: "やまださんが来ました。– Antworten auf Wer-/Was-Fragen verwenden immer が.",
          note: "が sagt direkt 'Yamada-san ist derjenige, der gekommen ist'.",
        },
        {
          right: "にほんごが　すきです。– Gefühle und Fähigkeiten verwenden immer が.",
          note: "すき, きらい, できる werden immer mit が verwendet.",
        },
        {
          right: "むこうに大きいたてものがあります。– Neue, unerwartete Informationen verwenden が.",
          note: "Wenn man auf etwas Neues hinweist, verwendet man が.",
        },
      ],
    },
    8: {
      shortExplanation: "Japanische Nomen ändern sich nicht nach Singular, Plural oder Geschlecht. Füge です am Ende hinzu, um eine höfliche Aussage zu machen.",
      visualImage: "です ist eine höfliche Hülle, die man über ein Nomen oder Adjektiv legt, um 'so ist es' auf formelle Weise zu sagen. Stell es dir wie Geschenkpapier vor – das Nomen darin ändert sich nicht, aber das Paket sieht für höfliche Gespräche angemessen aus.",
      points: ["Nomen + です = 'ist / bin / sind' (höfliches Präsens).", "Vergangenheit: です durch でした ersetzen.", "Verneinung: ではありません (formal) oder じゃないです (informell).", "Frage: か am Ende hinzufügen.", "ですね sucht sanfte Zustimmung ('nicht wahr?'). ですよ bietet neue Informationen an ('weißt du')."],
      exampleEnglish: "Ich bin ein Japanischstudent.",
      shortNote: "です steht immer ganz am Ende. Es ändert sich nicht für ich / du / er / sie – eine Form für alle.",
      commonMistakes: [
        {
          right: "きのうはにちようびでした。– Vergangene Zustände benötigen でした.",
          note: "です beschreibt nur die Gegenwart. Für die Vergangenheit wechselt man zu でした.",
        },
        {
          right: "がくせいではありません / がくせいじゃないです – eine Form wählen.",
          note: "Entweder ではありません oder じゃないです verwenden, niemals mischen.",
        },
        {
          right: "わたしはがくせいです。– In höflichen Kontexten immer です einschließen.",
          note: "Im formellen oder schriftlichen Japanisch ist です erforderlich.",
        },
      ],
    },
    9: {
      shortExplanation: "Das Japanische hat zwei Arten von Adjektiven, die sich auf völlig unterschiedliche Weise verhalten.",
      visualImage: "い-Adjektive sind Gestaltwandler – sie verändern ihre eigene Endung (おおきい → おおきかった). な-Adjektive sind Haftnotizen – sie bleiben genau gleich, müssen aber な ausleihen, um an einem Nomen zu haften (きれいな).",
      points: ["い-Adjektive enden auf い und beschreiben ein Nomen direkt – kein zusätzliches Wort nötig.", "な-Adjektive benötigen な vor einem Nomen.", "い-Adjektiv Vergangenheit: い weglassen, かった hinzufügen.", "い-Adjektiv Verneinung: い weglassen, くない hinzufügen.", "な-Adjektiv Vergangenheit: + でした. Verneinung: + じゃないです."],
      exampleEnglish: "Dieser Film war sehr interessant.",
      shortNote: "い-Adjektive verwenden NIEMALS でした für die Vergangenheit. Der häufigste Fehler: ✗ たのしいでした → ✓ たのしかったです.",
      commonMistakes: [
        {
          right: "たのしかったです。– い-Adjektive haben ihre eigene Vergangenheitsform.",
          note: "でした funktioniert nur mit Nomen und な-Adjektiven.",
        },
        {
          right: "しずかでした。– な-Adjektive verwenden でした.",
          note: "な-Adjektive verwenden でした/じゃないです, niemals かった/くない.",
        },
        {
          right: "ゆうめいじゃないです – じゃない für な-Adjektive verwenden.",
          note: "くない ist ausschließlich für い-Adjektive.",
        },
      ],
    },
    10: {
      shortExplanation: "Japanische Verben fallen in zwei Hauptgruppen, und die Gruppe, zu der ein Verb gehört, bestimmt, wie es in jeder Konjugation verändert wird.",
      visualImage: "Ichidan-Verben sind einfache Eingang-Motoren – man entfernt einfach る. Godan-Verben sind Fünfgang-Getriebe – der letzte Laut wechselt durch fünf Reihen (das ist das 'Godan'). Welchen Motor man hat, bestimmt jede Konjugation, die man je vornehmen wird.",
      points: ["Ichidan (一段 / る-Verben): る entfernen, um den Stamm zu erhalten, der sich nie ändert.", "Godan (五段 / う-Verben): Der letzte u-Reihen-Laut verschiebt sich beim Konjugieren.", "Die る-Falle: Einige Godan-Verben sehen wie Ichidan aus, weil sie auf る enden. Den Vokal vor る prüfen.", "Unregelmäßige Verben (nur zwei): する (tun) und くる (kommen). Diese als Ausnahmen auswendig lernen.", "Die Gruppe bestimmt ALLE Konjugationen – ます-Form, ない-Form, て-Form, た-Form."],
      exampleEnglish: "Ich lese und schreibe jeden Tag Japanisch.",
      shortNote: "Wenn man ein neues Verb lernt, sofort die Gruppe notieren. Sie verändert alles daran, wie das Verb konjugiert wird.",
      commonMistakes: [
        {
          right: "帰らない、帰って – 帰る ist Godan.",
          note: "帰る, 走る, 切る enden auf る, sind aber Godan. Wenn der Vokal vor る NICHT い oder え ist, ist es wahrscheinlich Godan.",
        },
        {
          right: "くる→きます、する→します – beide vollständig unregelmäßig.",
          note: "Diese müssen einzeln auswendig gelernt werden.",
        },
        {
          right: "Beim Lernen eines neuen Verbs immer notieren: Ichidan, Godan oder unregelmäßig.",
          note: "Die Gruppe bestimmt jede Konjugation.",
        },
      ],
    },
    11: {
      shortExplanation: "Die ます-Form ist die höfliche Form jedes Verbs. Sie ist die Standardform beim Sprechen mit Lehrern, Kollegen oder Personen, die man nicht gut kennt.",
      visualImage: "ます ist wie ein Hemd, das man dem Verb überzieht. Dieselbe Handlung, aber jetzt ist sie höflich und präsentabel.",
      points: ["Ichidan: る entfernen, ます hinzufügen.", "Godan: Den letzten Laut in seine い-Reihen-Version verschieben, dann ます hinzufügen.", "Vier wesentliche Formen: ます / ました / ません / ませんでした.", "ましょう = 'Lass uns …' – eine fröhliche Einladung, etwas gemeinsam zu tun.", "Zwei Unregelmäßige: する→します、くる→きます."],
      exampleEnglish: "Ich wache jeden Morgen um 6 Uhr auf.",
      shortNote: "Im Zweifelsfall ます verwenden. Es ist immer höflich und in den meisten Alltagssituationen korrekt.",
      commonMistakes: [
        {
          right: "よむ → よみます – む wechselt zu み (い-Reihe) vor ます.",
          note: "Godan-Verben müssen in die い-Reihe wechseln, bevor ます hinzugefügt wird.",
        },
        {
          right: "くる → きます – くる ist vollständig unregelmäßig.",
          note: "Der Stamm von くる ändert sich vollständig: く→き.",
        },
        {
          right: "ましょう = 'Lass uns!' (bestimmt). ましょうか = 'Sollen wir?'",
          note: "ましょうか fragt nach, ob die andere Person möchte.",
        },
      ],
    },
    12: {
      shortExplanation: "Die Wörterbuchform ist die einfache Grundform eines Verbs. Die ない-Form ist die Verneinung. Beide sind für die Alltagssprache und Grammatikmuster unverzichtbar.",
      visualImage: "Die Wörterbuchform ist das Verb in seinem Ruhezustand. Die ない-Form ist dasselbe Verb mit einem 'NICHT'-Stempel. Godan-Verben wechseln in die あ-Reihe vor ない; Ichidan-Verben lassen nur る weg.",
      points: ["Wörterbuchform: Ichidan-Verben enden auf る, Godan-Verben enden auf einen う-Reihen-Laut.", "Ichidan-Verneinung: る weglassen, ない hinzufügen.", "Godan-Verneinung: Den letzten Laut in die あ-Reihe verschieben, dann ない hinzufügen.", "Unregelmäßige Verneinungen: する→しない、くる→こない. Und: ある→ない.", "Die einfache Form erscheint vor Mustern wie と思う (ich denke…) und かもしれない (vielleicht)."],
      exampleEnglish: "Ich gehe heute nicht zur Schule.",
      shortNote: "Godan-Verneinungen wechseln in die あ-Reihe – nicht die い-Reihe. ✗ いきない → ✓ いかない.",
      commonMistakes: [
        {
          right: "いく → いかない – Godan-Verneinung wechselt in die あ-Reihe.",
          note: "ます verwendet die い-Reihe (いきます), ない verwendet die あ-Reihe (いかない).",
        },
        {
          right: "ある → ない – die Verneinung von ある ist einfach ない.",
          note: "あらない existiert nicht.",
        },
        {
          right: "する → しない – vollständig unregelmäßig.",
          note: "Der Stamm ändert sich zu し.",
        },
      ],
    },
    13: {
      shortExplanation: "Die Vergangenheit markiert eine abgeschlossene Handlung oder einen vergangenen Zustand. Im Japanischen wird die Verb- oder Adjektivendung verändert – es gibt kein separates Wort wie 'tat' oder 'war'.",
      visualImage: "Die Vergangenheit ist wie ein Stempel 'ERLEDIGT' auf einem Kalendertag. Verben bekommen ました (höflich) oder た (einfach). い-Adjektive tauschen das letzte い gegen かった aus. Nomen und な-Adjektive bekommen でした.",
      points: ["Verben (höfliche Vergangenheit): ます → ました.", "Verben (einfache Vergangenheit): te-Form bilden, dann て→た, で→だ.", "い-Adjektive Vergangenheit: い weglassen, かった hinzufügen.", "な-Adjektive und Nomen Vergangenheit: でした hinzufügen.", "Der häufigste Fehler: い-Adjektive mit でした kombinieren."],
      exampleEnglish: "Gestern habe ich mit meinem Freund einen Film geschaut.",
      shortNote: "い-Adjektive haben ihre eigene eingebaute Vergangenheitsform (かった). Niemals mit でした kombinieren.",
      commonMistakes: [
        {
          right: "たのしかったです – い-Adjektive verwenden ihre eigene かった-Endung.",
          note: "でした ist nur für Nomen und な-Adjektive.",
        },
        {
          right: "きれいでした – な-Adjektive verwenden でした.",
          note: "Niemals かった für な-Adjektive.",
        },
        {
          right: "いきませんでした – die höfliche Vergangenheitsverneinung ist ませんでした als eine Einheit.",
          note: "Nicht aus ません + だった zusammenbauen.",
        },
      ],
    },
    14: {
      shortExplanation: "Die て-Form ist eine der wichtigsten Verbformen im Japanischen. Sie verbindet Handlungen, stellt Anfragen und ist der Baustein für Dutzende von Grammatikmustern.",
      visualImage: "Die て-Form zu lernen bedeutet, einen Generalschlüssel zu lernen, der viele Türen öffnet. Bei Ichidan ist es einfach – einfach る durch て ersetzen. Godan-Verben folgen Lautwechselmustern.",
      points: ["Ichidan: る weglassen, て hinzufügen.", "Godan く/ぐ → いて/いで.", "Godan す → して.", "Godan ぬ/ぶ/む → んで.", "Godan る/う/つ → って. Unregelmäßig: する→して、くる→きて. Ausnahme: 行く→行って."],
      exampleEnglish: "Bitte wasch deine Hände vor dem Essen.",
      shortNote: "行く ist die einzige Ausnahme: seine て-Form ist 行って, nicht 行いて.",
      commonMistakes: [
        {
          right: "行く → 行って – die einzige Ausnahme zu く→いて.",
          note: "Alle anderen く-Verben folgen く→いて, aber 行く→行って.",
        },
        {
          right: "飲む → 飲んで – ぬ/ぶ/む werden alle zu んで.",
          note: "んで nicht んて – stimmhaft.",
        },
        {
          right: "する → して – unregelmäßig.",
          note: "Seine て-Form ist して.",
        },
      ],
    },
    15: {
      shortExplanation: "Sobald man die て-Form bilden kann, eröffnet sich ein riesiges Spektrum an natürlichem Japanisch – von Bitten über Erlaubnisse bis hin zu Abfolgen.",
      visualImage: "Die て-Form ist Superkleber. Sie klebt Handlungen zusammen (A て B = erst A, dann B) und klebt an Hilfswörter, um neue Bedeutungen zu erzeugen.",
      points: ["てください = bitte ~ tun (höfliche Bitte).", "てもいいですか = darf ich? / ist es in Ordnung, ~ zu tun?", "てはいけない = darf nicht / verboten.", "てから = nachdem ~ vollständig abgeschlossen ist, dann das Nächste tun.", "Handlungen verketten: A て B て C = A tun, dann B, dann C der Reihe nach."],
      exampleEnglish: "Nachdem du deine Hausaufgaben gemacht hast, darfst du spielen.",
      shortNote: "てから bedeutet 'nachdem X vollständig abgeschlossen ist.' Anders als nur て, das Handlungen verknüpft, ohne den Abschluss zu betonen.",
      commonMistakes: [
        {
          right: "すわってもいいですか – てもいいですか für Erlaubnis anfragen verwenden.",
          note: "てください = Anweisung. てもいいですか = um Erlaubnis bitten.",
        },
        {
          right: "ごはんをたべてから、でかけた – てから verwenden, wenn der Abschluss wichtig ist.",
          note: "てから betont, dass X zuerst vollständig erledigt sein muss.",
        },
        {
          right: "てはいけません – die höfliche Form.",
          note: "Die höfliche Verneinung von いけない ist いけません.",
        },
      ],
    },
    16: {
      shortExplanation: "ている anhängen zeigt eine laufende Handlung oder einen resultierenden Zustand. てある zeigt, dass etwas von jemandem vorbereitet oder eingerichtet wurde.",
      visualImage: "ている ist ein gerade laufender Film oder ein Standbild von dem, was passiert ist. てある ist eine Bühne, die bereits von jemandem aufgebaut wurde: 'es wurde getan, und das Ergebnis ist aus einem Grund hier'.",
      points: ["ている (laufende Handlung): gerade aktiv am Tun.", "ている (resultierender Zustand): Die Handlung ist abgeschlossen, aber das Ergebnis ist noch da.", "てある (vorbereiteter Zustand): Jemand hat es absichtlich getan, und das Ergebnis ist für einen Zweck hier.", "ている konzentriert sich darauf, wer handelt. てある konzentriert sich auf die Situation.", "Häufige ている-'Zustands'-Verben: 結婚している (verheiratet)、知っている (wissen)、住んでいる (wohnen in)."],
      exampleEnglish: "Tee wurde auf den Tisch gestellt (jemand hat ihn vorbereitet).",
      shortNote: "ている fragt 'wer tut / was passiert?' てある fragt 'was wurde vorbereitet?'",
      commonMistakes: [
        {
          right: "よやくがしてあります – てある für absichtliche Vorbereitung.",
          note: "てある verwenden, wenn jemand etwas im Voraus vorbereitet hat.",
        },
        {
          right: "かれを知っています – 知る verwendet ている.",
          note: "知る, 住む verwenden ている in der Gegenwart.",
        },
        {
          right: "Prüfen, ob für statische Zustände ein einfaches Adjektiv besser passt.",
          note: "Wenn keine Handlung den Zustand verursacht hat, das Adjektiv verwenden.",
        },
      ],
    },
    17: {
      shortExplanation: "Diese drei て-Form-Hilfswörter fügen jeweils eine andere Einstellung hinzu – Ausprobieren, Vorbereiten im Voraus oder Abschließen (manchmal mit Bedauern).",
      visualImage: "てみる = einen Zeh ins Wasser tauchen, um es zu testen. ておく = einen Regenschirm vor dem Regen an die Tür stellen. てしまう = die Keksdose ist leer – es ist getan, für besseres oder schlechteres.",
      points: ["てみる = etwas ausprobieren, um zu sehen, was passiert – ein Experiment.", "ておく = etwas im Voraus tun und fertig lassen für später.", "てしまう = vollständig abschließen. Mit Bedauern: 'ich hab's nun getan...'", "てしまう zeigt auch, dass etwas Unbeabsichtigtes passiert ist.", "Umgangssprachliche gesprochene Formen: てしまう → ちゃう oder じゃう."],
      exampleEnglish: "Ich habe mein Gepäck vor der Reise im Voraus gepackt.",
      shortNote: "てみる = testen. ておく = vorbereiten. てしまう = abschließen (manchmal mit Bedauern).",
      commonMistakes: [
        {
          right: "まいにちべんきょうしています – ている für etablierte Gewohnheiten verwenden.",
          note: "てみる impliziert Unsicherheit. Für Gewohnheiten das einfache ている verwenden.",
        },
        {
          right: "ておく = 'Ich werde es im Voraus tun'. てある = 'es wurde bereits getan'.",
          note: "ておく schaut vorwärts; てある betrachtet den aktuellen erledigten Zustand.",
        },
        {
          right: "たべてしまいました – im formellen Japanisch die vollständige Form verwenden.",
          note: "ちゃう/じゃう sind gesprochene Kurzformen.",
        },
      ],
    },
    18: {
      shortExplanation: "Die て-Form mit くる oder いく kombinieren, um die Richtung einer Handlung oder Veränderung zu zeigen – zum Sprecher hin oder vom Sprecher weg.",
      visualImage: "てくる ist etwas, das vom Horizont auf dich zuzieht. ていく ist etwas, das sich von dir in die Ferne bewegt. Beides funktioniert für körperliche Bewegung und abstrakte Veränderungen im Laufe der Zeit.",
      points: ["てくる = Bewegung oder Veränderung, die auf den Sprecher oder den gegenwärtigen Moment zukommt.", "ていく = Bewegung oder Veränderung, die sich vom Sprecher oder in die Zukunft entfernt.", "Körperliche Bewegung mit てくる: gehen, etwas tun, dann zurückkommen.", "Körperliche Bewegung mit ていく: irgendwohin gehen und weiter weg bleiben.", "Abstrakte Veränderung: 増えてきた = hat bis jetzt zugenommen. 増えていく = wird weiter zunehmen."],
      exampleEnglish: "Mein Japanisch ist nach und nach besser geworden.",
      shortNote: "てくる = 'bis jetzt' (rückblickend). ていく = 'von jetzt an' (vorausblickend).",
      commonMistakes: [
        {
          right: "だんだんうまくなってきました – てくる für eine Veränderung, die in der Gegenwart ankommt.",
          note: "てくる = rückblickend auf eine Veränderung, die auf jetzt zuzieht.",
        },
        {
          right: "してきます impliziert, dass man geht, es tut und zurückkommt.",
          note: "してきます = gehen und zurückkommen. していきます = gehen und wegbleiben.",
        },
        {
          right: "Abstrakte Verwendungen sind sehr häufig: わかってきた, へってきた.",
          note: "てくる/ていく funktionieren mit Veränderungsverben wie なる, わかる.",
        },
      ],
    },
    19: {
      shortExplanation: "Sowohl から als auch ので bedeuten 'weil', aber から ist direkter und bestimmter, während ので sanfter und höflicher klingt.",
      visualImage: "から ist eine stabile, direkte Brücke: 'wegen diesem, also das.' ので ist eine Hängebrücke – dieselbe Verbindung, aber sie schwankt sanft.",
      points: ["から = direkter, bestimmter Grund. Natürlich in der Alltagssprache.", "ので = sanfter, höflicher Grund. Bevorzugt in formellen Texten.", "Beide folgen der einfachen Form von Verben und い-Adjektiven.", "な-Adjektive und Nomen: なので verwenden (nicht ですので mitten im Satz).", "Umgangssprachliches から kann am Ende eines Satzes als vollständige Erklärung allein stehen."],
      exampleEnglish: "Ich gehe heute Abend früh schlafen, weil ich morgen einen Test habe.",
      shortNote: "ので klingt objektiver – es ist die sichere Wahl in formellen Situationen.",
      commonMistakes: [
        {
          right: "しずかなので – な-Adjektive benötigen な vor ので.",
          note: "しずかので klingt unnatürlich; immer しずかなので schreiben.",
        },
        {
          right: "いそがしいので – ので in formellen Kontexten verwenden.",
          note: "から klingt bestimmt. In formellen Situationen ist ので sicherer.",
        },
        {
          right: "がくせいなので – なので für Nomen mitten im Satz verwenden.",
          note: "Nomen und な-Adjektive verwenden なので, nicht ですので mitten im Satz.",
        },
      ],
    },
    20: {
      shortExplanation: "Diese alltäglichen Muster ermöglichen es dir zu sagen, was du tun möchtest, jemanden einzuladen mitzumachen und höfliche Bitten zu stellen.",
      visualImage: "たい ist ein Magnet, der dich zu etwas zieht, das du dir wünschst. ましょう ist eine offene Hand, die jemanden einlädt mitzumachen. ませんか ist ein sanftes Klopfen an die Tür: 'Möchtest du...?'",
      points: ["〜たい = ~ tun wollen. An den ます-Stamm anhängen.", "たい konjugiert wie ein い-Adjektiv: たくない (will nicht), たかった (wollte).", "ましょう = 'Lass uns …' – ein fröhlicher gemeinsamer Vorschlag.", "ませんか = 'Möchtest du…?' – eine höfliche, sanfte Einladung.", "〜てください = 'Bitte … tun' – eine höfliche Bitte mit der て-Form."],
      exampleEnglish: "Möchtest du nächstes Mal zusammen japanisch essen gehen?",
      shortNote: "たい geht um dein eigenes Verlangen. ましょう und ませんか geht darum, etwas gemeinsam zu tun.",
      commonMistakes: [
        {
          right: "かれはすしをたべたがっています – たがる für Wünsche dritter Personen verwenden.",
          note: "たい ist für dein eigenes Verlangen. Für andere たがる verwenden.",
        },
        {
          right: "たべたい – たい an den ます-Stamm anhängen, nicht an die Wörterbuchform.",
          note: "たべます → たべ + たい = たべたい.",
        },
        {
          right: "ましょう = bestimmtes 'Lass uns!'. ませんか = sanftes 'Möchtest du?'",
          note: "ませんか überlässt die Entscheidung der anderen Person.",
        },
      ],
    },
  },
  es: {
    1: {
      shortExplanation: "El hiragana es la base del japonés. Todos los sonidos del idioma pueden escribirse con estos 46 caracteres.",
      visualImage: "Piensa en el hiragana como el alfabeto del japonés, pero en lugar de letras sueltas, cada carácter es una sílaba completa (un sonido como 'ka' o 'mi'). Una vez que conozcas los 46, podrás leer en voz alta cualquier cosa escrita en hiragana.",
      points: ["Las 5 vocales: a(あ) i(い) u(う) e(え) o(お) — cada sílaba termina en una de ellas.", "Filas de consonantes: cada fila añade una consonante antes de una vocal. La fila か = ka ki ku ke ko.", "Sonidos sonoros: añade ゛(dakuten) para obtener la versión sonora — か→が, さ→ざ, た→だ, は→ば. Añade ゜para los sonidos p: は→ぱ.", "Sonidos combinados (拗音): una ゃゅょ pequeña después de un sonido de la fila い crea una sílaba nueva.", "Vocales largas (おかあさん) y la consonante doble っ — una っ pequeña indica una pausa breve antes de la siguiente consonante."],
      exampleEnglish: "Estudio japonés.",
      shortNote: "Empieza por las 5 vocales — nunca cambian, y todos los demás sonidos del japonés se construyen sobre ellas.",
      commonMistakes: [
        {
          right: "は como partícula siempre se pronuncia 'wa', no 'ha'.",
          note: "La partícula は parece el hiragana 'ha', pero siempre se lee 'wa' cuando funciona como marcador de tema. Esto confunde a casi todos los principiantes.",
        },
        {
          right: "きって (切手) — la っ pequeña indica una pausa, no un sonido 'tsu'.",
          note: "La っ pequeña es una pausa o consonante doble, no la sílaba 'tsu'. Escribir つ en mayúscula cambia la palabra por completo.",
        },
        {
          right: "ぬ = 'nu', め = 'me' — se parecen pero son caracteres distintos.",
          note: "Varios pares de hiragana son muy parecidos (ぬ/め, り/い, わ/れ). Escríbelos despacio al principio y presta atención a las pequeñas diferencias en la curva.",
        },
      ],
    },
    2: {
      shortExplanation: "El katakana tiene un aspecto más angular que el hiragana, pero representa los mismos sonidos. Se usa principalmente para palabras extranjeras y énfasis.",
      visualImage: "El katakana es el gemelo de líneas rectas del hiragana — mismos sonidos, distinto disfraz. Piensa en él como la 'fuente de palabras extranjeras' del japonés. Cuando veas caracteres angulares y cuadrados, estás mirando katakana.",
      points: ["Los mismos 46 sonidos que el hiragana, escritos con trazos angulares: ア(a) イ(i) ウ(u) エ(e) オ(o).", "Palabras prestadas del extranjero (外来語): la mayoría de las palabras tomadas de otros idiomas se escriben en katakana.", "El signo de vocal larga ー alarga el sonido vocálico anterior.", "Combinaciones especiales para sonidos extranjeros que no existen en hiragana: ファ、ティ、ウィ, etc.", "También se usa para: énfasis (como las cursivas), nombres de animales y plantas en ciencias, y onomatopeyas."],
      exampleEnglish: "Pedí café y pastel.",
      shortNote: "El signo de vocal larga ー solo aparece en katakana. En hiragana, las vocales largas se escriben completas (おかあさん).",
      commonMistakes: [
        {
          right: "ソ = 'so', ン = 'n' — ン tiene una pequeña curva; ソ es más diagonal. シ = 'shi', ツ = 'tsu'.",
          note: "Estos cuatro caracteres son muy parecidos y confunden a casi todos. Compáralos lado a lado despacio.",
        },
        {
          right: "En katakana, siempre usa ー para las vocales largas. ✗ コオヒイ → ✓ コーヒー",
          note: "En hiragana escribes la vocal, pero en katakana SIEMPRE usas ー. Nunca escribas la letra vocal dos veces en katakana.",
        },
        {
          right: "Adáptate a los sonidos japoneses: 'McDonald's' → マクドナルド, no la pronunciación inglesa.",
          note: "Las palabras prestadas al japonés se adaptan a sus sonidos, no se copian directamente. La ortografía en katakana indica la pronunciación japonesa.",
        },
      ],
    },
    3: {
      shortExplanation: "Las oraciones japonesas se construyen de manera diferente al español — el verbo siempre va al final.",
      visualImage: "Una oración japonesa es un tren. El marcador de tema は es el cartel con el nombre de la estación al frente. Los vagones de tiempo y lugar vienen después. El vagón del objeto se sitúa cerca del final. El verbo es el motor en la última posición. No decidas el significado de la oración hasta que llegue el motor.",
      points: ["Orden básico: Tema → Tiempo/Lugar → Objeto → Verbo. Todo se construye hacia el verbo al final.", "El verbo siempre cierra la oración — sin excepciones en el japonés estándar.", "El sujeto suele omitirse cuando ya se entiende por el contexto.", "Los adjetivos siempre van directamente antes del sustantivo que describen.", "Añade か al final para convertir cualquier afirmación en pregunta — no se necesita cambiar el orden de las palabras."],
      exampleEnglish: "Ayer leí un libro en la biblioteca.",
      shortNote: "Si te pierdes en una oración larga, ve al final y busca el verbo — eso te dice qué está pasando.",
      commonMistakes: [
        {
          right: "わたしはラーメンを食べました。— El verbo siempre al final.",
          note: "Los hablantes de español ponen instintivamente el verbo después del sujeto. En japonés, el verbo DEBE ir al último.",
        },
        {
          right: "ラーメンを食べました。— El objeto va antes del verbo.",
          note: "El objeto (aquello sobre lo que recae la acción) siempre va ANTES del verbo. Piensa: 'ramen [を] comí', no 'comí ramen'.",
        },
        {
          right: "あなたはがくせいですか？— El orden de las palabras no cambia en las preguntas.",
          note: "A diferencia del español, las preguntas en japonés tienen exactamente el mismo orden de palabras que las afirmaciones. Solo か al final marca una pregunta.",
        },
      ],
    },
    4: {
      shortExplanation: "La partícula は (wa) establece el tema de la oración. Todo lo que viene después dice algo sobre ese tema.",
      visualImage: "は es un amplio foco de luz en un escenario. Todo sobre lo que cae は se convierte en el tema — el 'titular' de la oración. Imagina que dices 'En cuanto a [X]...' antes del resto. Eso es exactamente lo que hace は.",
      points: ["は marca el tema: 'En cuanto a X...' — la oración hace un comentario sobre X.", "Normalmente un solo は por oración — establece el tema principal para lo que sigue.", "は puede reemplazar が o を para llevar esa palabra a la posición de tema.", "Contraste: usar は...は resalta una comparación entre dos cosas.", "Una vez establecido un tema, puede omitirse en las oraciones que siguen."],
      exampleEnglish: "Tomo café todas las mañanas.",
      shortNote: "は marca el tema, no necesariamente el sujeto gramatical. El sujeto y el tema suelen ser diferentes.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— La información nueva usa が, no は.",
          note: "Al responder '¿quién?' o introducir información nueva, usa が. は asume que el tema ya es conocido.",
        },
        {
          right: "にほんごが　できます。— Los sentimientos y habilidades siempre usan が.",
          note: "Los verbos como すき, きらい, できる, わかる, ほしい siempre se combinan con が para la cosa que te gusta/puedes hacer/deseas.",
        },
        {
          right: "わたしはきのうこうえんにいきました。— Normalmente es suficiente un は por oración.",
          note: "Acumular varios は en una misma oración resulta poco natural. は establece UN solo tema principal. Usa otras partículas para todo lo demás.",
        },
      ],
    },
    5: {
      shortExplanation: "Las partículas son palabras pequeñas que muestran cómo cada palabra se conecta con el verbo — como señales de tráfico que indican a cada palabra adónde ir.",
      visualImage: "を es una flecha que apunta a un objetivo: la cosa a la que la acción llega y toca. に es un alfiler clavado en un mapa — marca un destino o un momento en el tiempo. で es un escenario o foco de luz — marca dónde se desarrolla la acción, o el instrumento usado para realizarla.",
      points: ["を = el objetivo de la acción — la cosa sobre la que actúa el verbo.", "に = destino — hacia donde te diriges o llegas.", "に = punto en el tiempo — vincula la acción a un momento específico.", "で = escenario — el lugar donde se desarrolla la acción.", "で = herramienta o medio — lo que usas para hacer algo."],
      exampleEnglish: "Comí pan con un amigo en la escuela.",
      shortNote: "に vs で: に es donde llegas o aterrizas; で es donde se desarrolla la acción. 学校に行く (ir A la escuela) vs 学校で勉強する (estudiar EN la escuela).",
      commonMistakes: [
        {
          right: "がっこうで　べんきょうする。— Usa で para el lugar donde ocurre una acción.",
          note: "に marca el destino (llegar a algún sitio). で marca dónde se realiza una acción. Si estás haciendo algo ahí (no solo yendo ahí), usa で.",
        },
        {
          right: "でんしゃで　いえに　かえる。— Usa に para el destino al que regresas o llegas.",
          note: "Dos partículas en una oración — でんしゃで (en tren = medio/herramienta) e いえに (a casa = destino). Cada partícula tiene su propio papel.",
        },
        {
          right: "さんじに　おきます。— Las horas específicas necesitan に.",
          note: "Las horas exactas y los días (さんじ, にちようび, ごがつ) necesitan に. Pero las palabras de tiempo relativo como きのう, まいにち, いま NO llevan に.",
        },
      ],
    },
    6: {
      shortExplanation: "Estas cinco partículas añaden dirección, rango, compañía y adición a tus oraciones.",
      visualImage: "へ es una flecha que muestra la dirección. から es un puente con un punto de partida. まで es una línea de llegada o una señal de stop. と es un signo más que une personas o cosas. も es un sello de 'yo también' que dice 'igual aquí / también'.",
      points: ["へ = dirigirse en una dirección — más suave y poético que に.", "から = punto de partida en el espacio o en el tiempo.", "から = razón (porque) — se usa después de la forma simple del verbo o sustantivo.", "まで = punto final — 'hasta' o 'hasta llegar a'.", "と = junto con (personas) / y (enumerar cosas). も = también / igualmente — sustituye a は, が, o を."],
      exampleEnglish: "Caminé con mi amigo desde la estación hasta el parque.",
      shortNote: "から y まで son compañeros naturales — 'desde X hasta Y' = X から Y まで.",
      commonMistakes: [
        {
          right: "えきから　いきます。/ えきに　いきます。— Usa una sola partícula por función.",
          note: "から y に no pueden combinarse. から = punto de partida, に = destino. Elige qué función quieres expresar.",
        },
        {
          right: "にほんごが　すきだから、まいにち　べんきょうします。— El resultado debe seguir a から.",
          note: "Cuando から significa 'porque', debe ir seguido del resultado o la acción. Terminar una oración con だから solo suena incompleto.",
        },
        {
          right: "ともだちと　いきました。/ わたしも　いきました。— と y も tienen funciones distintas.",
          note: "と = con alguien (con quien lo hiciste). も = 'también' (añadiéndote a otros que lo hicieron). No se pueden combinar para el mismo propósito.",
        },
      ],
    },
    7: {
      shortExplanation: "Tanto は como が pueden aparecer donde está el sujeto, pero iluminan con una luz diferente.",
      visualImage: "は es un foco de escenario amplio y suave — dice 'estamos hablando de este tema'. が es un puntero láser — señala la cosa exacta y dice 'ESTA, específicamente'. La información nueva, las respuestas a preguntas de quién/qué y las declaraciones emocionales usan が.",
      points: ["は = foco amplio (el tema es conocido o ya se ha establecido).", "が = foco preciso (información nueva, o la cosa específica que se identifica).", "Las respuestas a preguntas de 'quién' o 'qué' usan が.", "Los sentimientos y habilidades usan が: lo que te gusta, deseas o puedes hacer.", "Una oración puede tener tanto は (tema) como が (sujeto) al mismo tiempo."],
      exampleEnglish: "Me gusta el japonés. (Tema: yo — Foco: japonés)",
      shortNote: "Cuando alguien pregunta だれが…? o なにが…?, la palabra de respuesta lleva が — es la información nueva y enfocada.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— Responder quién/qué siempre usa が.",
          note: "は implica 'en cuanto a Yamada-san…', lo que suena evasivo. が dice directamente 'Yamada-san es quien vino'.",
        },
        {
          right: "にほんごが　すきです。— Los sentimientos y habilidades siempre usan が para la cosa o habilidad.",
          note: "すき, きらい, できる, わかる, ほしい siempre se combinan con が para la cosa que se aprecia/desea/entiende.",
        },
        {
          right: "むこうに大きいたてものがあります。— La información nueva e inesperada usa が.",
          note: "Cuando señalas algo nuevo ('hay un…'), usa が. は implicaría 'ese edificio del que ya estábamos hablando'.",
        },
      ],
    },
    8: {
      shortExplanation: "Los sustantivos japoneses no cambian por número ni género. Añade です al final para hacer una afirmación educada.",
      visualImage: "です es una envoltura educada que colocas sobre cualquier sustantivo o adjetivo para decir 'así es' de manera formal. Piensa en él como papel de regalo — el sustantivo dentro no cambia, pero el paquete queda presentable para una conversación educada.",
      points: ["Sustantivo + です = 'es / soy / son' (presente educado).", "Tiempo pasado: reemplaza です por でした.", "Negativo: ではありません (formal) o じゃないです (informal).", "Pregunta: añade か al final.", "ですね busca un acuerdo amable ('¿verdad?'). ですよ ofrece información nueva ('¿sabes?')."],
      exampleEnglish: "Soy estudiante de japonés.",
      shortNote: "です va siempre al final. No cambia según yo / tú / él / ella — una sola forma vale para todo.",
      commonMistakes: [
        {
          right: "きのうはにちようびでした。— Los estados pasados necesitan でした.",
          note: "です solo describe el presente. Para cualquier cosa en el pasado, cámbialo por でした.",
        },
        {
          right: "がくせいではありません / がくせいじゃないです — elige una sola forma.",
          note: "Usa la forma formal ではありません o la informal じゃないです, pero nunca las mezcles.",
        },
        {
          right: "わたしはがくせいです。— Incluye siempre です en contextos educados.",
          note: "Omitir です está bien en conversaciones informales entre amigos cercanos, pero en japonés formal o escrito, です es obligatorio.",
        },
      ],
    },
    9: {
      shortExplanation: "El japonés tiene dos tipos de adjetivos, y se comportan de manera completamente diferente.",
      visualImage: "Los adjetivos い son cambiantes — modifican su propia terminación (おおきい → おおきかった). Los adjetivos な son como notas adhesivas — permanecen exactamente igual pero necesitan tomar prestado な para pegarse a un sustantivo (きれいな).",
      points: ["Los adjetivos い terminan en い y modifican un sustantivo directamente — sin palabra extra.", "Los adjetivos な necesitan な antes de un sustantivo.", "Pasado del adjetivo い: quita い, añade かった.", "Negativo del adjetivo い: quita い, añade くない.", "Pasado del adjetivo な: + でした. Negativo: + じゃないです."],
      exampleEnglish: "Esta película fue muy interesante.",
      shortNote: "Los adjetivos い NUNCA usan でした para el pasado. El error número 1: ✗ たのしいでした → ✓ たのしかったです.",
      commonMistakes: [
        {
          right: "たのしかったです。— Los adjetivos い tienen su propia forma de pasado: quita い + かった.",
          note: "Este es el error de adjetivo más frecuente. でした solo funciona con sustantivos y adjetivos な.",
        },
        {
          right: "しずかでした。— Los adjetivos な usan でした para el pasado, no かった.",
          note: "きれい, しずか, ゆうめい — todos usan でした/じゃないです, nunca かった/くない.",
        },
        {
          right: "ゆうめいじゃないです / ゆうめいではありません — usa じゃない para los adjetivos な.",
          note: "くない es exclusivo de los adjetivos い. Los adjetivos な usan じゃない(です) para el negativo.",
        },
      ],
    },
    10: {
      shortExplanation: "Los verbos japoneses se dividen en dos grupos principales, y el grupo al que pertenece un verbo determina cómo cambia en todas las conjugaciones.",
      visualImage: "Los verbos ichidan son motores simples de una velocidad — solo quitas る. Los verbos godan son cajas de cambios de cinco velocidades — el sonido final se desplaza por cinco filas (de ahí 'godan'). El motor que tengas determina todas las conjugaciones que harás.",
      points: ["Ichidan (一段 / verbos en る): quita る para obtener el radical, que nunca cambia.", "Godan (五段 / verbos en う): el sonido final en la fila u cambia al conjugar.", "La trampa del る: algunos verbos godan parecen ichidan porque terminan en る. Fíjate en la vocal antes de る.", "Verbos irregulares (solo dos): する (hacer) y くる (venir). Memorízalos como excepciones.", "El grupo determina TODAS las conjugaciones — forma ます, forma ない, forma て, forma た."],
      exampleEnglish: "Leo y escribo en japonés todos los días.",
      shortNote: "Cuando aprendas un verbo nuevo, anota su grupo de inmediato. Cambia todo sobre cómo se conjuga ese verbo.",
      commonMistakes: [
        {
          right: "帰らない、帰って — 帰る es godan.",
          note: "帰る, 走る, 切る, 知る, 入る — todos terminan en る pero son godan. Si la vocal antes de る NO es い o え, lo más probable es que sea godan.",
        },
        {
          right: "くる→きます、する→します — ambos son completamente irregulares.",
          note: "する y くる no siguen las reglas de ningún grupo. Deben memorizarse en cada forma individualmente.",
        },
        {
          right: "Al aprender un verbo nuevo, anota siempre: ¿ichidan, godan o irregular?",
          note: "El grupo determina absolutamente todas las conjugaciones. Adivinar sin conocer el grupo lleva a errores constantes.",
        },
      ],
    },
    11: {
      shortExplanation: "La forma ます es el modo educado de cualquier verbo. Es la forma estándar para hablar con profesores, compañeros de trabajo o personas que no conoces bien.",
      visualImage: "ます es como una camisa de vestir que le pones al verbo. La misma acción, pero ahora es educada y presentable. Cada verbo del diccionario recibe esta misma camisa — solo se pone de manera diferente según sea ichidan o godan.",
      points: ["Ichidan: quita る, añade ます.", "Godan: cambia el sonido final a su versión de la fila い, luego añade ます.", "Cuatro formas esenciales: ます (presente/futuro) / ました (pasado) / ません (negativo) / ませんでした (pasado negativo).", "ましょう = 'Vamos a…' — una invitación alegre a hacer algo juntos.", "Los dos irregulares: する→します、くる→きます."],
      exampleEnglish: "Me despierto a las 6 todas las mañanas.",
      shortNote: "Ante la duda, usa ます. Es siempre educado y correcto en la mayoría de las situaciones cotidianas.",
      commonMistakes: [
        {
          right: "よむ → よみます — む cambia a み (fila い) antes de ます.",
          note: "Los verbos godan deben cambiar el sonido final a la fila い antes de añadir ます. Añadir ます directamente a la forma del diccionario es el error más frecuente.",
        },
        {
          right: "くる → きます — くる es completamente irregular.",
          note: "くる no sigue las reglas godan. El radical cambia por completo: く→き. Memoriza: きます・きません・きました・きませんでした.",
        },
        {
          right: "ましょう = '¡Vamos!' (asertivo). ましょうか = '¿Vamos?' (consultando a la otra persona).",
          note: "ましょう asume que la otra persona estará de acuerdo y suena entusiasta. ましょうか es más suave — comprueba si la otra persona quiere hacerlo.",
        },
      ],
    },
    12: {
      shortExplanation: "La forma del diccionario es la base simple de un verbo. La forma ない es como lo haces negativo. Ambas son esenciales para el habla informal y los patrones gramaticales.",
      visualImage: "La forma del diccionario es el verbo en su estado de reposo — listo para trabajar pero todavía sin vestir. La forma ない es el mismo verbo con un sello de 'NO'. Los verbos godan cambian a la fila あ antes de ない; los verbos ichidan simplemente quitan る.",
      points: ["Forma del diccionario: los verbos ichidan terminan en る, los verbos godan terminan en un sonido de la fila う.", "Negativo ichidan: quita る, añade ない.", "Negativo godan: cambia el sonido final a la fila あ, luego añade ない.", "Negativos irregulares: する→しない、くる→こない. Y: ある→ない (no あらない).", "La forma simple aparece antes de patrones como と思う (creo que…) y かもしれない (quizás)."],
      exampleEnglish: "Hoy no voy a la escuela.",
      shortNote: "Los negativos godan cambian a la fila あ — no a la fila い. Error frecuente: ✗ いきない → ✓ いかない.",
      commonMistakes: [
        {
          right: "いく → いかない — el negativo godan cambia a la fila あ, no a la fila い.",
          note: "ます usa la fila い (いきます), pero ない usa la fila あ (いかない). Las filas son diferentes — no las confundas.",
        },
        {
          right: "ある → ない — el negativo de ある es simplemente ない.",
          note: "ある es un verbo godan, pero su negativo es irregular. あらない no existe en el japonés estándar.",
        },
        {
          right: "する → しない — completamente irregular.",
          note: "El negativo de する es しない, no すない. Su radical cambia a し (no す). Memoriza: しない・しなかった・しなかったです.",
        },
      ],
    },
    13: {
      shortExplanation: "El tiempo pasado marca una acción completada o un estado pasado. En japonés se cambia la terminación del verbo o adjetivo — no hay una palabra separada como 'hizo' o 'fue'.",
      visualImage: "El tiempo pasado es como sellar un día en el calendario con 'HECHO'. Los verbos reciben ました (educado) o た (simple). Los adjetivos い intercambian el い final por かった. Los sustantivos y adjetivos な reciben でした. Tres sellos, una regla para cada tipo.",
      points: ["Verbos (pasado educado): ます → ました.", "Verbos (pasado simple): forma la forma て, luego cambia て→た, で→だ.", "Pasado de los adjetivos い: quita い, añade かった.", "Pasado de los adjetivos な y sustantivos: añade でした.", "El error más frecuente: combinar los adjetivos い con でした."],
      exampleEnglish: "Ayer vi una película con mi amigo.",
      shortNote: "Los adjetivos い tienen su propio tiempo pasado incorporado (かった). Nunca los combines con でした.",
      commonMistakes: [
        {
          right: "たのしかったです — los adjetivos い usan su propia terminación かった.",
          note: "Este es el error de tiempo pasado número 1. でした es solo para sustantivos y adjetivos な.",
        },
        {
          right: "きれいでした — los adjetivos な usan でした.",
          note: "きれい, しずか, ゆうめい y todos los demás adjetivos な usan でした para el tiempo pasado. Nunca かった.",
        },
        {
          right: "いきませんでした — el negativo pasado educado es ませんでした como una unidad.",
          note: "ませんでした es el negativo pasado educado correcto. No intentes construirlo a partir de partes como ません + だった.",
        },
      ],
    },
    14: {
      shortExplanation: "La forma て es una de las formas verbales más importantes del japonés. Conecta acciones, hace peticiones y es el bloque de construcción de docenas de patrones gramaticales.",
      visualImage: "Aprender la forma て es aprender una llave maestra que abre muchas puertas. Con ichidan es fácil — solo cambia る por て. Los verbos godan siguen patrones de cambio de sonido. Piensa en ellos como música: el sonido cambia según el grupo al que pertenece el verbo.",
      points: ["Ichidan: quita る, añade て.", "Godan く/ぐ → いて/いで (la g sonora suaviza la terminación a いで).", "Godan す → して.", "Godan ぬ/ぶ/む → んで.", "Godan る/う/つ → って. Irregular: する→して、くる→きて. Excepción: 行く→行って (no 行いて)."],
      exampleEnglish: "Por favor, lávate las manos antes de comer.",
      shortNote: "行く es la única excepción: su forma て es 行って, no 行いて. Recuérdala por separado.",
      commonMistakes: [
        {
          right: "行く → 行って — esta es la única excepción a la regla く→いて.",
          note: "Todos los demás verbos en く siguen く→いて (書く→書いて), pero 行く es diferente: 行く→行って.",
        },
        {
          right: "飲む → 飲んで、遊ぶ → 遊んで — ぬ/ぶ/む se convierten todos en んで (sonoro).",
          note: "Estas tres terminaciones se convierten en んで, no en んて. La ん nasaliza el sonido y lo hace sonoro.",
        },
        {
          right: "する → して — irregular, debe memorizarse.",
          note: "する no sigue ningún patrón regular. Su forma て es して. Se combina con sustantivos constantemente: べんきょうして, そうじして.",
        },
      ],
    },
    15: {
      shortExplanation: "Una vez que puedes formar la forma て, abre una enorme variedad de japonés natural — desde peticiones hasta permisos y secuencias.",
      visualImage: "La forma て es un pegamento superpotente. Pega acciones entre sí (A て B = primero A, luego B), y se pega a palabras auxiliares para crear nuevos significados (てください, てもいい, etc.). Cuantos más patrones conozcas, más pegamento tendrás.",
      points: ["てください = por favor haz ~ (petición educada).", "てもいいですか = ¿puedo? / ¿está bien hacer ~?", "てはいけない = no debes / prohibido.", "てから = después de terminar ~ completamente, haz lo siguiente.", "Encadenar acciones: A て B て C = haz A, luego B, luego C en secuencia."],
      exampleEnglish: "Después de hacer los deberes, puedes jugar a videojuegos.",
      shortNote: "てから significa 'después de terminar X completamente'. Es diferente de solo て, que enlaza dos acciones en secuencia sin enfatizar la finalización.",
      commonMistakes: [
        {
          right: "すわってもいいですか — usa てもいいですか para pedir permiso.",
          note: "てください es una petición o instrucción ('por favor haz X'). てもいいですか pregunta si está bien hacer algo.",
        },
        {
          right: "ごはんをたべてから、でかけた — usa てから para destacar que X debe estar completamente terminado primero.",
          note: "て simplemente encadena acciones. てから enfatiza que la primera acción debe estar completamente terminada antes de que comience la siguiente.",
        },
        {
          right: "てはいけません — la forma educada es いけません, no いけないです.",
          note: "El negativo educado de いけない es いけません, no いけないです. En la escritura o el habla formal, usa siempre てはいけません.",
        },
      ],
    },
    16: {
      shortExplanation: "Añade ている para mostrar una acción en curso o un estado resultante. てある muestra que algo ha sido preparado o configurado por alguien.",
      visualImage: "ている es una película que se está proyectando ahora mismo (acción en progreso) — o una imagen congelada de lo que ocurrió (estado resultante). てある es un escenario que ya ha sido preparado por alguien: 'se hizo, y el resultado está aquí por una razón'. Desplaza el foco del actor a la situación.",
      points: ["ている (acción en curso): haciendo algo activamente ahora mismo.", "ている (estado resultante): la acción está hecha, pero el resultado sigue aquí.", "てある (estado preparado): alguien lo hizo intencionalmente, y el resultado está aquí con un propósito.", "ている se centra en el sujeto / quién actúa. てある se centra en la situación.", "Verbos de 'estado' frecuentes con ている: 結婚している (casado)、知っている (saber)、住んでいる (vivir en)."],
      exampleEnglish: "El té está puesto sobre la mesa (alguien lo preparó).",
      shortNote: "ている pregunta '¿quién está haciendo / qué está pasando?' てある pregunta '¿qué se ha preparado?' Ambos describen estados presentes pero desde ángulos distintos.",
      commonMistakes: [
        {
          right: "よやくがしてあります — てある para preparaciones intencionales; ている para acciones en curso.",
          note: "Usa てある cuando alguien ha hecho algo con antelación y el resultado importa ahora. ている es para acciones en curso o estados resultantes.",
        },
        {
          right: "かれを知っています — 知る describe el estado resultante de haber aprendido algo.",
          note: "知る, 住む, 結婚する y verbos similares de 'evento único' se usan casi siempre con ている en el presente.",
        },
        {
          right: "El contexto importa: まどが開いています es correcto — pero comprueba si un adjetivo simple encaja mejor.",
          note: "ている para estados resultantes es correcto, pero a veces un adjetivo simple es más natural. Si ninguna acción lo causó, usa el adjetivo.",
        },
      ],
    },
    17: {
      shortExplanation: "Estos tres auxiliares de la forma て añaden cada uno una actitud diferente — probar, preparar con antelación, o completar (a veces con arrepentimiento).",
      visualImage: "てみる = meter el pie en el agua para probarla. ておく = poner el paraguas junto a la puerta antes de que llueva. てしまう = el tarro de galletas está vacío — ya está hecho, para bien o para mal.",
      points: ["てみる = intentar hacer algo para ver qué pasa — un experimento.", "ておく = hacer algo con antelación y dejarlo listo para más tarde.", "てしまう = terminar completamente. Con arrepentimiento: 'fui y lo hice...'", "てしまう también indica que algo ocurrió de manera no intencionada.", "Formas habladas informales: てしまう → ちゃう (después de sonidos た/て) o じゃう (después de sonidos で)."],
      exampleEnglish: "Hice las maletas con antelación antes del viaje.",
      shortNote: "てみる = probar. ておく = preparar. てしまう = completar (a veces con arrepentimiento). El contexto decide qué sensación predomina.",
      commonMistakes: [
        {
          right: "まいにちべんきょうしています — てみる es para probar y descubrir; usa ている para hábitos establecidos.",
          note: "てみる implica incertidumbre sobre el resultado. Para cosas que haces regularmente o conoces bien, lo correcto es el ている simple.",
        },
        {
          right: "ておく = 'lo haré con antelación'. てある = 'ya se ha hecho (por alguien)'.",
          note: "ておく está orientado al futuro: estás a punto de preparar algo. てある es resultado presente: la preparación ya está completa.",
        },
        {
          right: "たべてしまいました — usa la forma completa en japonés formal o escrito.",
          note: "ちゃう/じゃう son contracciones informales del habla. En un diario, correos electrónicos o habla formal, usa siempre la forma completa てしまう.",
        },
      ],
    },
    18: {
      shortExplanation: "Combina la forma て con くる o いく para mostrar la dirección de una acción o cambio — hacia el hablante, o alejándose de él.",
      visualImage: "てくる es algo que se aproxima desde el horizonte hacia ti — 'vino en esta dirección'. ていく es algo que se aleja de ti hacia la distancia — 'va en esa dirección'. Ambos funcionan para el movimiento físico y para los cambios abstractos a lo largo del tiempo.",
      points: ["てくる = movimiento o cambio que se acerca al hablante o al momento presente.", "ていく = movimiento o cambio que se aleja del hablante o hacia el futuro.", "Movimiento físico con てくる: ir, hacer algo y luego volver.", "Movimiento físico con ていく: ir a algún sitio y continuar alejándose.", "Cambio abstracto: 増えてきた = ha ido aumentando hasta ahora. 増えていく = seguirá aumentando."],
      exampleEnglish: "Mi japonés ha ido mejorando gradualmente.",
      shortNote: "てくる = 'hasta ahora' (mirando hacia atrás). ていく = 'a partir de ahora' (mirando hacia adelante). A menudo se combinan para describir un arco completo de cambio.",
      commonMistakes: [
        {
          right: "だんだんうまくなってきました — てくる para un cambio que ha llegado al presente.",
          note: "てくる = mirando hacia atrás el cambio que llega al presente. ていく = mirando hacia adelante. Al describir cómo han mejorado tus habilidades, usa てくる.",
        },
        {
          right: "してきます implica que irás, lo harás y volverás. Si no vas a volver, usa していきます.",
          note: "してきます = ir y volver. していきます = ir y continuar alejándose. Los hablantes de japonés codifican la dirección del regreso en el propio verbo.",
        },
        {
          right: "Los usos abstractos son muy comunes y naturales: わかってきた (empezando a entender), へってきた (disminuyendo últimamente).",
          note: "てくる/ていく no son solo para el movimiento físico. Usarlos con verbos de cambio como なる, わかる, ふえる es natural y muy frecuente.",
        },
      ],
    },
    19: {
      shortExplanation: "Tanto から como ので significan 'porque', pero から es más directo y asertivo, mientras que ので suena más suave y educado.",
      visualImage: "から es un puente sólido y directo: 'por esto, por lo tanto aquello'. ので es un puente colgante — la misma conexión, pero se mece suavemente. ので suena más objetivo y explicativo, como si estuvieras ofreciendo evidencia en lugar de afirmar una causa.",
      points: ["から = razón directa y asertiva. Natural en el habla informal.", "ので = razón suave y educada. Preferida en la escritura formal y al hacer peticiones.", "Ambos siguen la forma simple de los verbos y los adjetivos い.", "Adjetivos な y sustantivos: usa なので (no ですので en medio de una oración).", "El から informal puede aparecer solo al final de una oración como explicación completa."],
      exampleEnglish: "Me acostaré temprano esta noche porque mañana tengo un examen.",
      shortNote: "ので suena más objetivo — es la opción más segura en situaciones formales o al hacer una petición educada.",
      commonMistakes: [
        {
          right: "しずかなので — los adjetivos な necesitan な antes de ので.",
          note: "Los adjetivos な deben conservar su な al conectarse con ので. しずかので suena poco natural; escribe siempre しずかなので.",
        },
        {
          right: "いそがしいので、むりです — usa ので en contextos formales o escritos.",
          note: "から suena asertivo e informal. En correos de trabajo, disculpas formales o peticiones educadas, ので es siempre la opción más segura.",
        },
        {
          right: "がくせいなので — usa なので para sustantivos y adjetivos な en medio de una oración.",
          note: "ですので puede aparecer al inicio de una oración formal como conjunción, pero dentro de una oración, los sustantivos y adjetivos な usan なので.",
        },
      ],
    },
    20: {
      shortExplanation: "Estos patrones cotidianos te permiten decir lo que quieres hacer, invitar a alguien a unirse y hacer peticiones educadas.",
      visualImage: "たい es un imán que te atrae hacia algo que deseas. ましょう es una mano abierta invitando a alguien a unirse. ませんか es un golpe suave en la puerta: '¿Te gustaría...?' ください es una mano que se extiende y pide.",
      points: ["〜たい = quiero hacer ~. Se añade al radical ます (el verbo antes de ます).", "たい se conjuga como un adjetivo い: たくない (no quiero), たかった (quería).", "ましょう = 'Vamos a…' — una sugerencia compartida y animada.", "ませんか = '¿Te gustaría...?' — una invitación educada y suave.", "〜てください = 'Por favor haz…' — una petición educada usando la forma て."],
      exampleEnglish: "¿Te gustaría ir a comer comida japonesa juntos la próxima vez?",
      shortNote: "たい es sobre tu propio deseo. ましょう y ませんか son para hacer algo juntos. Usa ませんか cuando quieras sonar especialmente cálido y sin presionar.",
      commonMistakes: [
        {
          right: "かれはすしをたべたがっています — usa たがる para los deseos en tercera persona.",
          note: "たい es principalmente para expresar el deseo propio en primera persona. Para los deseos de otra persona, usa たがる (たがっている).",
        },
        {
          right: "たべたい — añade たい al radical ます (たべ), no a la forma del diccionario.",
          note: "たい se añade al radical ます: たべます → たべ + たい = たべたい. Nunca a la forma del diccionario.",
        },
        {
          right: "ましょう = '¡Vamos!' asertivo. ませんか = '¿Te gustaría...?' suave.",
          note: "ましょう asume que la otra persona estará de acuerdo. ませんか es una invitación abierta que deja la elección en manos de la otra persona.",
        },
      ],
    },
  },
  fr: {
    1: {
      shortExplanation: "Les hiragana sont la base du japonais. Chaque son de la langue peut être écrit avec ces 46 caractères.",
      visualImage: "Considérez les hiragana comme l'alphabet japonais — mais au lieu de lettres simples, chaque caractère représente une syllabe entière (un son comme « ka » ou « mi »). Une fois que vous connaissez les 46, vous pouvez déchiffrer n'importe quoi écrit en hiragana.",
      points: ["Les 5 voyelles : a(あ) i(い) u(う) e(え) o(お) — chaque syllabe se termine par l'une d'elles.", "Les rangées de consonnes : chaque rangée ajoute une consonne avant une voyelle. La rangée か = ka ki ku ke ko.", "Les sons voisés : ajoutez ゛(dakuten) pour obtenir la version voisée — か→が, さ→ざ, た→だ, は→ば. Ajoutez ゜pour les sons en p : は→ぱ.", "Les sons combinés (拗音) : un petit ゃゅょ après un son de la rangée い crée une nouvelle syllabe.", "Les voyelles longues (おかあさん) et la consonne double っ — un petit っ indique une courte pause avant la consonne suivante."],
      exampleEnglish: "J'étudie le japonais.",
      shortNote: "Commencez par les 5 voyelles — elles ne changent jamais, et tous les autres sons du japonais en découlent.",
      commonMistakes: [
        {
          right: "は en tant que particule se prononce toujours « wa », jamais « ha ».",
          note: "La particule は ressemble au hiragana « ha » mais se lit toujours « wa » quand elle est utilisée comme marqueur de thème. Presque tous les débutants se font piéger par cela.",
        },
        {
          right: "きって (切手) — le petit っ crée une pause, pas un son « tsu ».",
          note: "Le petit っ est une pause / consonne doublée, pas la syllabe « tsu ». Écrire un grand つ change complètement le mot.",
        },
        {
          right: "ぬ = « nu », め = « me » — ils se ressemblent mais sont des caractères différents.",
          note: "Plusieurs paires de hiragana se ressemblent beaucoup (ぬ/め, り/い, わ/れ). Écrivez-les lentement au début et faites attention aux petites différences de courbes.",
        },
      ],
    },
    2: {
      shortExplanation: "Les katakana paraissent plus anguleux que les hiragana, mais ils représentent les mêmes sons. Ils sont principalement utilisés pour les mots étrangers et l'emphase.",
      visualImage: "Les katakana sont le jumeau aux traits droits des hiragana — mêmes sons, costume différent. Considérez-les comme la « police des mots étrangers » du japonais. Quand vous voyez des caractères anguleux et carrés, vous regardez des katakana.",
      points: ["Les mêmes 46 sons que les hiragana, mais écrits avec des traits anguleux : ア(a) イ(i) ウ(u) エ(e) オ(o).", "Les mots d'emprunt étrangers (外来語) : la plupart des mots empruntés à d'autres langues sont écrits en katakana.", "Le signe de voyelle longue ー étire le son de la voyelle précédente.", "Combinaisons spéciales pour les sons étrangers absents des hiragana : ファ、ティ、ウィ, etc.", "Utilisés aussi pour : l'emphase (comme l'italique), les noms d'animaux et de plantes en sciences, et les onomatopées."],
      exampleEnglish: "J'ai commandé un café et un gâteau.",
      shortNote: "Le signe de voyelle longue ー n'apparaît qu'en katakana. En hiragana, les voyelles longues sont écrites en entier (おかあさん).",
      commonMistakes: [
        {
          right: "ソ = « so », ン = « n » — ン a une légère courbe ; ソ est plus diagonal. シ = « shi », ツ = « tsu ».",
          note: "Ces quatre caractères se ressemblent beaucoup et désorientent presque tout le monde. Comparez-les côte à côte lentement.",
        },
        {
          right: "En katakana, utilisez toujours ー pour les voyelles longues. ✗ コオヒイ → ✓ コーヒー",
          note: "En hiragana, vous écrivez la voyelle en entier, mais en katakana, vous utilisez TOUJOURS ー. N'écrivez jamais la lettre-voyelle deux fois en katakana.",
        },
        {
          right: "Adaptez-vous aux sons japonais : « McDonald's » → マクドナルド, pas la prononciation anglaise.",
          note: "Les mots d'emprunt japonais sont adaptés aux sons japonais, non copiés directement. L'orthographe en katakana vous indique la prononciation japonaise.",
        },
      ],
    },
    3: {
      shortExplanation: "Les phrases japonaises sont construites différemment de l'anglais — le verbe vient toujours tout à la fin.",
      visualImage: "Une phrase japonaise est un train. Le marqueur de thème は est le panneau du nom de la gare à l'avant. Les wagons du temps et du lieu viennent ensuite. Le wagon de l'objet se trouve près de l'arrière. Le verbe est le moteur tout à la dernière position. Ne décidez pas ce que la phrase signifie avant que le moteur n'arrive.",
      points: ["Ordre de base : Thème → Temps/Lieu → Objet → Verbe. Tout converge vers le verbe à la fin.", "Le verbe clôt toujours la phrase — sans exception en japonais standard.", "Le sujet est souvent omis lorsqu'il est déjà compris d'après le contexte.", "Les adjectifs viennent toujours directement avant le nom qu'ils décrivent.", "Ajoutez か à la fin pour transformer n'importe quelle affirmation en question — aucun changement d'ordre des mots nécessaire."],
      exampleEnglish: "Hier, j'ai lu un livre à la bibliothèque.",
      shortNote: "Si vous vous perdez dans une longue phrase, sautez à la fin et trouvez le verbe — il vous dit ce qui se passe.",
      commonMistakes: [
        {
          right: "わたしはラーメンを食べました。— Le verbe toujours à la fin.",
          note: "Les anglophones mettent instinctivement le verbe après le sujet. En japonais, le verbe DOIT être en dernier.",
        },
        {
          right: "ラーメンを食べました。— L'objet avant le verbe.",
          note: "L'objet (ce sur quoi porte l'action) vient toujours AVANT le verbe. Pensez : « ramen [を] mangé » et non « mangé ramen ».",
        },
        {
          right: "あなたはがくせいですか？— L'ordre des mots ne change pas pour les questions.",
          note: "Contrairement à l'anglais, les questions japonaises ont exactement le même ordre des mots que les affirmations. Seul か à la fin marque une question.",
        },
      ],
    },
    4: {
      shortExplanation: "La particule は (wa) établit le thème de la phrase. Tout ce qui suit dit quelque chose à propos de ce thème.",
      visualImage: "は est un large projecteur sur une scène. Sur quoi は se pose devient le thème — le « titre » de la phrase. Imaginez dire « En ce qui concerne [X]... » avant le reste. C'est exactement ce que fait は.",
      points: ["は marque le thème : « En ce qui concerne X... » — la phrase fait ensuite un commentaire sur X.", "Généralement un seul は par phrase — il établit le thème principal pour ce qui suit.", "は peut remplacer が ou を pour amener ce mot en position de thème.", "Contraste : utiliser は...は met en évidence une comparaison entre deux choses.", "Une fois un thème établi, il peut être omis dans les phrases qui suivent."],
      exampleEnglish: "Je bois du café chaque matin.",
      shortNote: "は marque le thème, pas nécessairement le sujet grammatical. Le sujet et le thème sont souvent différents.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— Les nouvelles informations utilisent が, pas は.",
          note: "Pour répondre à « qui ? » ou introduire une nouvelle info, utilisez が. は suppose que le thème est déjà connu.",
        },
        {
          right: "にほんごが　できます。— Les sentiments et les capacités utilisent toujours が.",
          note: "Les verbes comme すき, きらい, できる, わかる, ほしい s'associent toujours à が pour la chose que vous aimez/pouvez faire/désirez.",
        },
        {
          right: "わたしはきのうこうえんにいきました。— Un seul は par phrase suffit généralement.",
          note: "Empiler plusieurs は dans une seule phrase est peu naturel. は établit UN seul thème principal. Utilisez d'autres particules pour tout le reste.",
        },
      ],
    },
    5: {
      shortExplanation: "Les particules sont de petits mots qui montrent comment chaque mot se connecte au verbe — comme des panneaux de signalisation indiquant à chaque mot où aller.",
      visualImage: "を est une flèche frappant une cible : la chose que l'action atteint et touche. に est une épingle plantée sur une carte — elle marque une destination ou un moment précis. で est une scène ou un projecteur — il marque l'endroit où l'action se déroule, ou l'outil utilisé pour la réaliser.",
      points: ["を = la cible de l'action — la chose sur laquelle le verbe agit.", "に = destination — là où vous vous dirigez ou arrivez.", "に = repère temporel — relie l'action à un moment précis.", "で = scène — l'endroit où l'action se déroule.", "で = outil ou moyen — ce que vous utilisez pour faire quelque chose."],
      exampleEnglish: "J'ai mangé du pain avec un ami à l'école.",
      shortNote: "に vs で : に est là où vous arrivez ou vous posez ; で est là où l'action se joue. 学校に行く (aller À l'école) vs 学校で勉強する (étudier À l'école).",
      commonMistakes: [
        {
          right: "がっこうで　べんきょうする。— Utilisez で pour l'endroit où une action se déroule.",
          note: "に marque la destination (arriver quelque part). で marque l'endroit où une action se déroule. Si vous y faites quelque chose (pas seulement y aller), utilisez で.",
        },
        {
          right: "でんしゃで　いえに　かえる。— Utilisez に pour la destination où vous rentrez/arrivez.",
          note: "Deux particules dans une même phrase — でんしゃで (par le train = moyen/outil) et いえに (vers la maison = destination). Chaque particule a son propre rôle.",
        },
        {
          right: "さんじに　おきます。— Les horaires précis nécessitent に.",
          note: "Les heures et les jours précis (さんじ, にちようび, ごがつ) nécessitent に. Mais les mots de temps relatifs comme きのう, まいにち, いま ne prennent PAS に.",
        },
      ],
    },
    6: {
      shortExplanation: "Ces cinq particules ajoutent direction, étendue, compagnie et ajout à vos phrases.",
      visualImage: "へ est une flèche indiquant une direction. から est un pont avec un point de départ. まで est une ligne d'arrivée ou un panneau stop. と est un signe plus reliant des personnes ou des choses ensemble. も est un tampon « moi aussi » qui dit « pareil ici / aussi ».",
      points: ["へ = se diriger vers une direction — plus doux et plus poétique que に.", "から = point de départ dans l'espace ou le temps.", "から = raison (parce que) — utilisé après un verbe à la forme simple ou un nom.", "まで = point final — « jusqu'à » ou « aussi loin que ».", "と = ensemble avec (personnes) / et (enumération de choses). も = aussi / également — il remplace は, が, ou を."],
      exampleEnglish: "J'ai marché avec mon ami de la gare jusqu'au parc.",
      shortNote: "から et まで sont des partenaires naturels — « de X à Y » = X から Y まで.",
      commonMistakes: [
        {
          right: "えきから　いきます。/ えきに　いきます。— Utilisez une seule particule par rôle.",
          note: "から et に ne peuvent pas s'empiler. から = point de départ, に = destination. Choisissez le rôle que vous souhaitez exprimer.",
        },
        {
          right: "にほんごが　すきだから、まいにち　べんきょうします。— Le résultat doit suivre から.",
          note: "Quand から signifie « parce que », il doit être suivi du résultat/de l'action. Terminer une phrase par だから seul semble inachevé.",
        },
        {
          right: "ともだちと　いきました。/ わたしも　いきました。— と et も ont des rôles différents.",
          note: "と = avec quelqu'un (avec qui vous l'avez fait). も = « aussi » (s'ajouter à d'autres qui l'ont fait). Ils ne peuvent pas s'empiler pour le même but.",
        },
      ],
    },
    7: {
      shortExplanation: "は et が peuvent tous deux apparaître là où se trouve le sujet, mais ils projettent un type de lumière différent.",
      visualImage: "は est un large projecteur de scène doux — il dit « nous parlons de ce thème. » が est un pointeur laser — il désigne la chose exacte et dit « CELLE-CI, précisément. » Les nouvelles informations, les réponses aux questions qui/quoi et les affirmations émotionnelles utilisent が.",
      points: ["は = large projecteur (le thème est connu ou déjà établi).", "が = projecteur ciblé (nouvelle information, ou la chose spécifique identifiée).", "Les réponses aux questions « qui » ou « quoi » utilisent が.", "Les sentiments et les capacités utilisent が : ce que vous aimez, voulez ou pouvez faire.", "Une phrase peut avoir à la fois は (thème) et が (sujet) en même temps."],
      exampleEnglish: "J'aime le japonais. (Thème : moi — Focus : le japonais)",
      shortNote: "Quand quelqu'un demande だれが…? ou なにが…?, le mot de la réponse prend が — c'est la nouvelle information mise en valeur.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— Répondre à qui/quoi utilise toujours が.",
          note: "は implique « en ce qui concerne Yamada-san... » ce qui semble évasif. が dit directement « c'est Yamada-san qui est venu ».",
        },
        {
          right: "にほんごが　すきです。— Les sentiments et les capacités utilisent toujours が pour la chose/compétence.",
          note: "すき, きらい, できる, わかる, ほしい s'associent toujours à が pour la chose aimée/désirée/comprise.",
        },
        {
          right: "むこうに大きいたてものがあります。— Les informations nouvelles et inattendues utilisent が.",
          note: "Quand vous signalez quelque chose de nouveau (« il y a un... »), utilisez が. は impliquerait « ce bâtiment dont nous parlions déjà ».",
        },
      ],
    },
    8: {
      shortExplanation: "Les noms japonais ne changent pas selon le nombre ou le genre. Ajoutez です à la fin pour faire une affirmation polie.",
      visualImage: "です est un emballage poli que vous glissez sur n'importe quel nom ou adjectif pour dire « c'est ainsi » de façon formelle. Pensez à un emballage cadeau — le nom à l'intérieur ne change pas, mais le paquet paraît convenable pour une conversation polie.",
      points: ["Nom + です = « est / suis / êtes » (présent poli).", "Passé : remplacez です par でした.", "Négatif : ではありません (formel) ou じゃないです (courant).", "Question : ajoutez か à la fin.", "ですね cherche un doux accord (« n'est-ce pas ? »). ですよ apporte une nouvelle information (« tu sais »)."],
      exampleEnglish: "Je suis un étudiant en japonais.",
      shortNote: "です est toujours tout à la fin. Il ne change pas selon je / tu / il / elle — une seule forme convient à tous.",
      commonMistakes: [
        {
          right: "きのうはにちようびでした。— Les états passés nécessitent でした.",
          note: "です décrit uniquement le présent. Pour tout ce qui est dans le passé, remplacez par でした.",
        },
        {
          right: "がくせいではありません / がくせいじゃないです — choisissez une seule forme.",
          note: "Utilisez soit le formel ではありません, soit le courant じゃないです, mais ne les mélangez jamais.",
        },
        {
          right: "わたしはがくせいです。— Incluez toujours です dans les contextes polis.",
          note: "Omettre です convient dans les conversations décontractées entre amis proches, mais en japonais formel ou écrit, です est obligatoire.",
        },
      ],
    },
    9: {
      shortExplanation: "Le japonais possède deux types d'adjectifs, et ils se comportent de manière complètement différente.",
      visualImage: "Les adjectifs en い sont des métamorphes — ils changent leur propre terminaison (おおきい → おおきかった). Les adjectifs en な sont des post-it — ils restent exactement les mêmes mais doivent emprunter な pour s'accrocher à un nom (きれいな).",
      points: ["Les adjectifs en い se terminent par い et modifient un nom directement — aucun mot supplémentaire nécessaire.", "Les adjectifs en な ont besoin de な avant un nom.", "Passé d'un adjectif en い : supprimez い, ajoutez かった.", "Négatif d'un adjectif en い : supprimez い, ajoutez くない.", "Passé d'un adjectif en な : + でした. Négatif : + じゃないです."],
      exampleEnglish: "Ce film était très intéressant.",
      shortNote: "Les adjectifs en い N'utilisent JAMAIS でした pour le passé. L'erreur n°1 : ✗ たのしいでした → ✓ たのしかったです.",
      commonMistakes: [
        {
          right: "たのしかったです。— Les adjectifs en い ont leur propre forme passée : supprimez い + かった.",
          note: "C'est l'erreur la plus courante avec les adjectifs. でした ne fonctionne qu'avec les noms et les adjectifs en な.",
        },
        {
          right: "しずかでした。— Les adjectifs en な utilisent でした pour le passé, pas かった.",
          note: "きれい, しずか, ゆうめい — tous utilisent でした/じゃないです, jamais かった/くない.",
        },
        {
          right: "ゆうめいじゃないです / ゆうめいではありません — utilisez じゃない pour les adjectifs en な.",
          note: "くない est exclusivement pour les adjectifs en い. Les adjectifs en な utilisent じゃない(です) pour le négatif.",
        },
      ],
    },
    10: {
      shortExplanation: "Les verbes japonais se divisent en deux grands groupes, et le groupe auquel appartient un verbe détermine comment il se conjugue à chaque fois.",
      visualImage: "Les verbes ichidan sont de simples moteurs à un rapport — vous supprimez juste る. Les verbes godan sont des boîtes de vitesses à cinq rapports — le son final se déplace à travers cinq rangées (c'est ce que signifie « godan »). Le moteur que vous avez détermine chaque conjugaison que vous ferez jamais.",
      points: ["Ichidan (一段 / verbes en る) : supprimez る pour obtenir le radical, qui ne change jamais.", "Godan (五段 / verbes en う) : le son final en rangée-u change lors de la conjugaison.", "Le piège du る : certains verbes godan ressemblent à des ichidan car ils se terminent par る. Vérifiez la voyelle avant る.", "Verbes irréguliers (seulement deux) : する (faire) et くる (venir). Mémorisez-les comme exceptions.", "Le groupe détermine TOUTES les conjugaisons — forme ます, forme ない, forme て, forme た."],
      exampleEnglish: "Je lis et j'écris en japonais tous les jours.",
      shortNote: "Quand vous apprenez un nouveau verbe, notez immédiatement son groupe. Cela change tout dans sa conjugaison.",
      commonMistakes: [
        {
          right: "帰らない、帰って — 帰る est godan.",
          note: "帰る, 走る, 切る, 知る, 入る — tous se terminent par る mais sont godan. Si la voyelle avant る n'est PAS い ou え, il est très probablement godan.",
        },
        {
          right: "くる→きます、する→します — les deux sont entièrement irréguliers.",
          note: "する et くる ne suivent les règles d'aucun groupe. Ils doivent être mémorisés individuellement dans chaque forme.",
        },
        {
          right: "Quand vous apprenez un nouveau verbe, notez toujours : ichidan, godan ou irrégulier ?",
          note: "Le groupe détermine absolument chaque conjugaison. Deviner sans connaître le groupe entraîne des erreurs constantes.",
        },
      ],
    },
    11: {
      shortExplanation: "La forme ます est le mode poli de n'importe quel verbe. C'est la forme standard pour parler aux professeurs, collègues ou personnes que vous ne connaissez pas bien.",
      visualImage: "ます, c'est comme une chemise habillée que vous enfilez sur le verbe. La même action, mais maintenant elle est polie et présentable. Chaque verbe du dictionnaire reçoit cette même chemise — juste enfilée différemment selon qu'il est ichidan ou godan.",
      points: ["Ichidan : supprimez る, ajoutez ます.", "Godan : faites basculer le son final vers sa version de la rangée い, puis ajoutez ます.", "Quatre formes essentielles : ます (présent/futur) / ました (passé) / ません (négatif) / ませんでした (négatif passé).", "ましょう = « Allons-y... » — une invitation joyeuse à faire quelque chose ensemble.", "Les deux irréguliers : する→します、くる→きます."],
      exampleEnglish: "Je me lève à 6h chaque matin.",
      shortNote: "En cas de doute, utilisez ます. C'est toujours poli et correct dans la plupart des situations quotidiennes.",
      commonMistakes: [
        {
          right: "よむ → よみます — む se déplace vers み (rangée い) avant ます.",
          note: "Les verbes godan doivent faire basculer le son final vers la rangée い avant d'ajouter ます. Ajouter ます directement à la forme du dictionnaire est l'erreur la plus courante.",
        },
        {
          right: "くる → きます — くる est entièrement irrégulier.",
          note: "くる ne suit pas les règles godan. Le radical change complètement : く→き. Mémorisez : きます・きません・きました・きませんでした.",
        },
        {
          right: "ましょう = « Allons-y ! » (affirmatif). ましょうか = « On y va ? » (vérification avec l'autre).",
          note: "ましょう suppose que l'autre personne sera d'accord et sonne enthousiaste. ましょうか est plus doux — il vérifie si l'autre personne le souhaite.",
        },
      ],
    },
    12: {
      shortExplanation: "La forme du dictionnaire est la base simple d'un verbe. La forme ない est la façon de le rendre négatif. Toutes deux sont essentielles pour la parole courante et les structures grammaticales.",
      visualImage: "La forme du dictionnaire est le verbe dans son état de repos — prêt à travailler mais pas encore habillé. La forme ない est le même verbe avec un tampon « NON » dessus. Les verbes godan basculent vers la rangée あ avant ない ; les verbes ichidan suppriment simplement る.",
      points: ["Forme du dictionnaire : les verbes ichidan se terminent par る, les verbes godan se terminent par un son de la rangée う.", "Négatif ichidan : supprimez る, ajoutez ない.", "Négatif godan : faites basculer le son final vers la rangée あ, puis ajoutez ない.", "Négatifs irréguliers : する→しない、くる→こない. Et : ある→ない (pas あらない).", "La forme simple apparaît avant des structures comme と思う (je pense que...) et かもしれない (peut-être)."],
      exampleEnglish: "Je ne vais pas à l'école aujourd'hui.",
      shortNote: "Les négatifs godan basculent vers la rangée あ — pas la rangée い. Erreur courante : ✗ いきない → ✓ いかない.",
      commonMistakes: [
        {
          right: "いく → いかない — le négatif godan bascule vers la rangée あ, pas い.",
          note: "ます utilise la rangée い (いきます), mais ない utilise la rangée あ (いかない). Les rangées sont différentes — ne les confondez pas.",
        },
        {
          right: "ある → ない — le négatif de ある est simplement ない.",
          note: "ある est un verbe godan, mais son négatif est irrégulier. あらない n'existe pas en japonais standard.",
        },
        {
          right: "する → しない — entièrement irrégulier.",
          note: "Le négatif de する est しない, pas すない. Son radical change en し (pas す). Mémorisez : しない・しなかった・しなかったです.",
        },
      ],
    },
    13: {
      shortExplanation: "Le passé marque une action accomplie ou un état passé. Le japonais change la terminaison du verbe ou de l'adjectif — il n'y a pas de mot séparé comme « did » ou « was ».",
      visualImage: "Le temps passé, c'est comme tamponner un jour du calendrier « FAIT. » Les verbes prennent ました (poli) ou た (simple). Les adjectifs en い échangent le dernier い pour かった. Les noms et adjectifs en な prennent でした. Trois tampons, une règle pour chaque type.",
      points: ["Verbes (passé poli) : ます → ました.", "Verbes (passé simple) : faites la forme て, puis changez て→た, で→だ.", "Passé des adjectifs en い : supprimez い, ajoutez かった.", "Passé des adjectifs en な et des noms : ajoutez でした.", "L'erreur la plus courante : associer les adjectifs en い avec でした."],
      exampleEnglish: "Hier, j'ai regardé un film avec mon ami.",
      shortNote: "Les adjectifs en い ont leur propre passé intégré (かった). Ne les associez jamais avec でした.",
      commonMistakes: [
        {
          right: "たのしかったです — les adjectifs en い utilisent leur propre terminaison かった.",
          note: "C'est l'erreur de passé n°1. でした est réservé aux noms et aux adjectifs en な uniquement.",
        },
        {
          right: "きれいでした — les adjectifs en な utilisent でした.",
          note: "きれい, しずか, ゆうめい et tous les autres adjectifs en な utilisent でした pour le passé. Jamais かった.",
        },
        {
          right: "いきませんでした — le passé négatif poli est ませんでした en une seule unité.",
          note: "ませんでした est le passé négatif poli correct. N'essayez pas de le construire à partir de parties comme ません + だった.",
        },
      ],
    },
    14: {
      shortExplanation: "La forme て est l'une des formes verbales les plus importantes en japonais. Elle relie les actions, formule des demandes et est la base de dizaines de structures grammaticales.",
      visualImage: "Apprendre la forme て, c'est apprendre une clé maîtresse qui ouvre de nombreuses portes. Ichidan est facile — échangez simplement る contre て. Les verbes godan suivent des modèles de changement de sons. Pensez à eux comme à de la musique : le son change selon le groupe auquel appartient le verbe.",
      points: ["Ichidan : supprimez る, ajoutez て.", "Godan く/ぐ → いて/いで (le g voisé adoucit la terminaison en いで).", "Godan す → して.", "Godan ぬ/ぶ/む → んで.", "Godan る/う/つ → って. Irréguliers : する→して、くる→きて. Exception : 行く→行って (pas 行いて)."],
      exampleEnglish: "Veuillez vous laver les mains avant de manger.",
      shortNote: "行く est la seule exception : sa forme て est 行って, pas 行いて. Mémorisez-la à part.",
      commonMistakes: [
        {
          right: "行く → 行って — c'est la seule exception à la règle く→いて.",
          note: "Tous les autres verbes en く suivent く→いて (書く→書いて), mais 行く est différent : 行く→行って.",
        },
        {
          right: "飲む → 飲んで、遊ぶ → 遊んで — ぬ/ぶ/む deviennent tous んで (voisé).",
          note: "Ces trois terminaisons deviennent toutes んで, pas んて. Le ん nasalise le son et le rend voisé.",
        },
        {
          right: "する → して — irrégulier, doit être mémorisé.",
          note: "する ne suit aucun modèle régulier. Sa forme て est して. Elle se combine constamment avec des noms : べんきょうして, そうじして.",
        },
      ],
    },
    15: {
      shortExplanation: "Une fois que vous pouvez former la forme て, elle ouvre un vaste éventail de japonais naturel — des demandes aux permissions en passant par les enchaînements.",
      visualImage: "La forme て est de la super-colle. Elle colle les actions ensemble (A て B = d'abord A, puis B), et elle se colle à des mots auxiliaires pour créer de nouveaux sens (てください, てもいい, etc.). Plus vous connaissez de structures, plus vous avez de colle.",
      points: ["てください = veuillez faire ~ (demande polie).", "てもいいですか = est-ce que je peux ? / est-il possible de ~ ?", "てはいけない = il ne faut pas / interdit.", "てから = après avoir terminé ~ complètement, faire la chose suivante.", "Enchaîner les actions : A て B て C = faire A, puis B, puis C en séquence."],
      exampleEnglish: "Après avoir fait vos devoirs, vous pouvez jouer aux jeux vidéo.",
      shortNote: "てから signifie « après avoir complètement terminé X. » C'est différent du simple て, qui relie deux actions en séquence sans insister sur la complétion.",
      commonMistakes: [
        {
          right: "すわってもいいですか — utilisez てもいいですか pour demander la permission.",
          note: "てください est une demande ou une instruction (« veuillez faire X »). てもいいですか demande si c'est acceptable de faire quelque chose.",
        },
        {
          right: "ごはんをたべてから、でかけた — utilisez てから pour insister sur le fait que X doit être entièrement terminé en premier.",
          note: "て enchaîne simplement les actions. てから souligne que la première action doit être complètement terminée avant que la suivante ne commence.",
        },
        {
          right: "てはいけません — la forme polie est いけません, pas いけないです.",
          note: "Le négatif poli de いけない est いけません, pas いけないです. À l'écrit ou dans un discours formel, utilisez toujours てはいけません.",
        },
      ],
    },
    16: {
      shortExplanation: "Attachez ている pour montrer une action en cours ou un état résultant. てある montre que quelque chose a été préparé ou mis en place par quelqu'un.",
      visualImage: "ている est un film qui se joue maintenant (action en cours) — ou une image figée de ce qui s'est passé (état résultant). てある est une scène déjà préparée par quelqu'un : « c'est fait, et le résultat est là pour une raison. » L'accent passe de l'acteur à la situation.",
      points: ["ている (action en cours) : en train de faire activement maintenant.", "ている (état résultant) : l'action est terminée, mais le résultat est encore là.", "てある (état préparé) : quelqu'un l'a fait intentionnellement, et le résultat est là dans un but précis.", "ている se concentre sur le sujet / qui agit. てある se concentre sur la situation.", "Verbes d'« état » courants avec ている : 結婚している (marié)、知っている (savoir)、住んでいる (habiter)."],
      exampleEnglish: "Du thé a été posé sur la table (quelqu'un l'a préparé).",
      shortNote: "ている demande « qui fait / que se passe-t-il ? » てある demande « qu'est-ce qui a été préparé ? » Les deux décrivent des états présents mais sous des angles différents.",
      commonMistakes: [
        {
          right: "よやくがしてあります — てある pour une préparation intentionnelle ; ている pour les actions en cours.",
          note: "Utilisez てある quand quelqu'un a fait quelque chose à l'avance et que le résultat compte maintenant. ている est pour les actions en cours ou les états résultants.",
        },
        {
          right: "かれを知っています — 知る décrit l'état résultant d'avoir appris quelque chose.",
          note: "知る, 住む, 結婚する et les verbes similaires d'« événement unique » sont presque toujours utilisés avec ている au présent.",
        },
        {
          right: "Le contexte compte : まどが開いています est correct — mais vérifiez si un adjectif simple convient mieux.",
          note: "ている pour les états résultants est correct, mais parfois un adjectif simple est plus naturel. Si aucune action ne l'a causé, utilisez l'adjectif.",
        },
      ],
    },
    17: {
      shortExplanation: "Ces trois auxiliaires en て ajoutent chacun une attitude différente — essayer, préparer à l'avance, ou terminer (parfois avec regret).",
      visualImage: "てみる = tremper un orteil dans l'eau pour la tester. ておく = poser un parapluie près de la porte avant qu'il ne pleuve. てしまう = la boîte à biscuits est vide — c'est fait, pour le meilleur ou pour le pire.",
      points: ["てみる = essayer de faire quelque chose pour voir ce qui se passe — une expérience.", "ておく = faire quelque chose à l'avance et le laisser prêt pour plus tard.", "てしまう = terminer complètement. Avec regret : « j'ai fini par le faire... »", "てしまう montre aussi que quelque chose d'involontaire s'est produit.", "Formes orales courantes : てしまう → ちゃう (après les sons た/て) ou じゃう (après les sons で)."],
      exampleEnglish: "J'ai fait mes bagages à l'avance avant le voyage.",
      shortNote: "てみる = tester. ておく = préparer. てしまう = terminer (parfois avec regret). Le contexte décide quel sentiment est le plus fort.",
      commonMistakes: [
        {
          right: "まいにちべんきょうしています — てみる est pour essayer afin de découvrir ; utilisez ている pour les habitudes établies.",
          note: "てみる implique une incertitude sur le résultat. Pour les choses que vous faites régulièrement ou que vous connaissez bien, le simple ている est correct.",
        },
        {
          right: "ておく = « je vais le faire à l'avance ». てある = « c'est déjà fait (par quelqu'un) ».",
          note: "ておく est orienté vers le futur : vous êtes sur le point de préparer quelque chose. てある est un résultat présent : la préparation est déjà accomplie.",
        },
        {
          right: "たべてしまいました — utilisez la forme complète en japonais formel ou écrit.",
          note: "ちゃう/じゃう sont des contractions orales courantes. Dans les journaux, les e-mails ou le discours formel, utilisez toujours la forme complète てしまう.",
        },
      ],
    },
    18: {
      shortExplanation: "Combinez la forme て avec くる ou いく pour montrer la direction d'une action ou d'un changement — vers le locuteur, ou en s'éloignant de lui.",
      visualImage: "てくる, c'est quelque chose qui approche de l'horizon vers vous — « ça vient par ici. » ていく, c'est quelque chose qui s'éloigne de vous vers le lointain — « ça part par là. » Les deux fonctionnent pour le mouvement physique et pour les changements abstraits dans le temps.",
      points: ["てくる = mouvement ou changement qui se rapproche du locuteur ou du moment présent.", "ていく = mouvement ou changement qui s'éloigne du locuteur ou va vers le futur.", "Mouvement physique avec てくる : aller, faire quelque chose, puis revenir.", "Mouvement physique avec ていく : aller quelque part et continuer à s'éloigner.", "Changement abstrait : 増えてきた = a augmenté jusqu'à maintenant. 増えていく = va continuer à augmenter."],
      exampleEnglish: "Mon japonais s'est progressivement amélioré.",
      shortNote: "てくる = « jusqu'à maintenant » (regarder en arrière). ていく = « à partir de maintenant » (regarder en avant). Ils sont souvent associés pour décrire une évolution complète.",
      commonMistakes: [
        {
          right: "だんだんうまくなってきました — てくる pour un changement arrivé jusqu'au présent.",
          note: "てくる = regarder en arrière le changement venant vers maintenant. ていく = regarder vers l'avenir. Pour décrire comment vos compétences se sont améliorées, utilisez てくる.",
        },
        {
          right: "してきます implique que vous allez, faites quelque chose et revenez. Si vous ne revenez pas, utilisez していきます.",
          note: "してきます = aller et revenir. していきます = aller et continuer à s'éloigner. Les Japonais encodent la direction du retour dans le verbe lui-même.",
        },
        {
          right: "Les usages abstraits sont très courants et naturels : わかってきた (commencer à comprendre), へってきた (diminuer dernièrement).",
          note: "てくる/ていく ne sont pas seulement pour le mouvement physique. Les utiliser avec des verbes de changement comme なる, わかる, ふえる est naturel et très courant.",
        },
      ],
    },
    19: {
      shortExplanation: "から et ので signifient tous deux « parce que », mais から est plus direct et affirmatif, tandis que ので semble plus doux et plus poli.",
      visualImage: "から est un pont solide et direct : « à cause de ceci, donc cela. » ので est un pont suspendu — la même connexion, mais il oscille doucement. ので semble plus objectif et explicatif, comme si vous offrez des preuves plutôt qu'affirmer une cause.",
      points: ["から = raison directe et affirmative. Naturel dans la parole courante.", "ので = raison douce et polie. Préféré dans l'écriture formelle et pour les demandes.", "Les deux suivent la forme simple des verbes et des adjectifs en い.", "Adjectifs en な et noms : utilisez なので (pas ですので au milieu d'une phrase).", "から courant peut tenir seul à la fin d'une phrase comme explication complète."],
      exampleEnglish: "Je vais me coucher tôt ce soir parce que j'ai un examen demain.",
      shortNote: "ので semble plus objectif — c'est le choix le plus sûr dans les situations formelles ou pour une demande polie.",
      commonMistakes: [
        {
          right: "しずかなので — les adjectifs en な ont besoin de な avant ので.",
          note: "Les adjectifs en な doivent conserver leur な quand ils se connectent à ので. しずかので semble peu naturel ; écrivez toujours しずかなので.",
        },
        {
          right: "いそがしいので、むりです — utilisez ので dans les contextes formels ou écrits.",
          note: "から sonne affirmatif et courant. Dans les e-mails professionnels, les excuses formelles ou les demandes polies, ので est toujours le choix le plus sûr.",
        },
        {
          right: "がくせいなので — utilisez なので pour les noms et les adjectifs en な au milieu d'une phrase.",
          note: "ですので peut apparaître au début d'une phrase formelle comme conjonction, mais au sein d'une phrase, les noms et les adjectifs en な utilisent なので.",
        },
      ],
    },
    20: {
      shortExplanation: "Ces structures du quotidien vous permettent de dire ce que vous voulez faire, d'inviter quelqu'un à se joindre à vous et de formuler des demandes polies.",
      visualImage: "たい est un aimant qui vous attire vers quelque chose que vous désirez. ましょう est une main ouverte invitant quelqu'un à participer. ませんか est un léger coup à la porte : « Voulez-vous... ? » ください est une main tendue qui demande.",
      points: ["〜たい = vouloir faire ~. S'attache au radical en ます (le verbe avant ます).", "たい se conjugue comme un adjectif en い : たくない (ne pas vouloir), たかった (voulait).", "ましょう = « Allons... » — une suggestion joyeuse partagée.", "ませんか = « Voulez-vous... ? » — une invitation polie et douce.", "〜てください = « Veuillez... » — une demande polie utilisant la forme て."],
      exampleEnglish: "Voulez-vous aller manger de la cuisine japonaise ensemble la prochaine fois ?",
      shortNote: "たい concerne votre propre désir. ましょう et ませんか concernent faire quelque chose ensemble. Utilisez ませんか quand vous voulez paraître particulièrement chaleureux et sans pression.",
      commonMistakes: [
        {
          right: "かれはすしをたべたがっています — utilisez たがる pour les désirs à la troisième personne.",
          note: "たい est principalement pour votre propre désir à la première personne. Pour les désirs de quelqu'un d'autre, utilisez たがる (たがっている).",
        },
        {
          right: "たべたい — attachez たい au radical en ます (たべ), pas à la forme du dictionnaire.",
          note: "たい s'attache au radical en ます : たべます → たべ + たい = たべたい. Jamais à la forme du dictionnaire.",
        },
        {
          right: "ましょう = « Allons-y ! » affirmatif. ませんか = « Voulez-vous... ? » doux.",
          note: "ましょう suppose que l'autre personne sera d'accord. ませんか est une invitation ouverte qui laisse le choix à l'autre personne.",
        },
      ],
    },
  },
  it: {
    1: {
      shortExplanation: "L'hiragana è la base del giapponese. Ogni suono della lingua può essere scritto con questi 46 caratteri.",
      visualImage: "Pensa all'hiragana come all'alfabeto del giapponese — ma invece di singole lettere, ogni carattere è una sillaba intera (un suono come 'ka' o 'mi'). Una volta che conosci tutti i 46, puoi pronunciare qualsiasi cosa scritta in hiragana.",
      points: ["Le 5 vocali: a(あ) i(い) u(う) e(え) o(お) — ogni sillaba termina con una di queste.", "Le file consonantiche: ogni fila aggiunge una consonante prima di una vocale. La fila か = ka ki ku ke ko.", "Suoni sonori: aggiungi ゛(dakuten) per ottenere la versione sonora — か→が, さ→ざ, た→だ, は→ば. Aggiungi ゜per i suoni p: は→ぱ.", "Suoni combinati (拗音): una piccola ゃゅょ dopo un suono della fila い crea una nuova sillaba.", "Vocali lunghe (おかあさん) e la consonante doppia っ — una piccola っ indica una breve pausa prima della consonante successiva."],
      exampleEnglish: "Studio il giapponese.",
      shortNote: "Inizia con le 5 vocali — non cambiano mai, e tutti gli altri suoni del giapponese si basano su di esse.",
      commonMistakes: [
        {
          right: "は come particella si pronuncia sempre 'wa', non 'ha'.",
          note: "La particella は sembra l'hiragana 'ha' ma si legge sempre 'wa' quando è usata come marcatore di tema. Questo inganna quasi tutti i principianti.",
        },
        {
          right: "きって (切手) — la piccola っ crea una pausa, non un suono 'tsu'.",
          note: "La piccola っ è una pausa/consonante doppia, non la sillaba 'tsu'. Scrivere una grande つ cambia completamente la parola.",
        },
        {
          right: "ぬ = 'nu', め = 'me' — si assomigliano ma sono caratteri diversi.",
          note: "Alcune coppie di hiragana si somigliano molto (ぬ/め, り/い, わ/れ). Scrivile lentamente all'inizio e presta attenzione alle piccole differenze nelle curve.",
        },
      ],
    },
    2: {
      shortExplanation: "Il katakana sembra più spigoloso dell'hiragana, ma rappresenta gli stessi suoni. Viene usato principalmente per le parole straniere e per l'enfasi.",
      visualImage: "Il katakana è il gemello dalle linee dritte dell'hiragana — stessi suoni, costume diverso. Pensalo come il 'carattere tipografico delle parole straniere' del giapponese. Quando vedi caratteri squadrati e angolari, stai guardando il katakana.",
      points: ["Gli stessi 46 suoni dell'hiragana, scritti con tratti angolari: ア(a) イ(i) ウ(u) エ(e) オ(o).", "Parole straniere (外来語): la maggior parte delle parole prese da altre lingue sono scritte in katakana.", "Il segno di vocale lunga ー allunga il suono vocalico precedente.", "Combinazioni speciali per suoni stranieri non presenti in hiragana: ファ、ティ、ウィ ecc.", "Usato anche per: enfasi (come il corsivo), nomi di animali e piante in ambito scientifico, e onomatopee."],
      exampleEnglish: "Ho ordinato un caffè e una torta.",
      shortNote: "Il segno di vocale lunga ー appare solo nel katakana. In hiragana, le vocali lunghe sono scritte per esteso (おかあさん).",
      commonMistakes: [
        {
          right: "ソ = 'so', ン = 'n' — ン ha una piccola curva; ソ è più diagonale. シ = 'shi', ツ = 'tsu'.",
          note: "Questi quattro caratteri si assomigliano molto e confondono quasi tutti. Confrontali affiancati lentamente.",
        },
        {
          right: "In katakana, usa sempre ー per le vocali lunghe. ✗ コオヒイ → ✓ コーヒー",
          note: "In hiragana si scrive la vocale per esteso, ma in katakana si usa SEMPRE ー. Non scrivere mai la lettera vocalica due volte in katakana.",
        },
        {
          right: "Adatta ai suoni giapponesi: 'McDonald's' → マクドナルド, non la pronuncia inglese.",
          note: "Le parole straniere in giapponese vengono adattate ai suoni giapponesi, non copiate direttamente. La grafia in katakana indica la pronuncia giapponese.",
        },
      ],
    },
    3: {
      shortExplanation: "Le frasi giapponesi sono costruite diversamente dall'italiano — il verbo viene sempre alla fine.",
      visualImage: "Una frase giapponese è un treno. Il marcatore di tema は è il cartello del nome della stazione in testa. I vagoni del tempo e del luogo vengono dopo. Il vagone dell'oggetto si trova vicino alla coda. Il verbo è il motore all'ultima posizione. Non decidere cosa significa la frase finché non arriva il motore.",
      points: ["Ordine di base: Tema → Tempo/Luogo → Oggetto → Verbo. Tutto converge verso il verbo alla fine.", "Il verbo chiude sempre la frase — nessuna eccezione nel giapponese standard.", "Il soggetto viene spesso omesso quando è già chiaro dal contesto.", "Gli aggettivi precedono sempre direttamente il nome che descrivono.", "Aggiungi か alla fine per trasformare qualsiasi affermazione in una domanda — non serve cambiare l'ordine delle parole."],
      exampleEnglish: "Ieri ho letto un libro in biblioteca.",
      shortNote: "Se ti perdi in una frase lunga, vai alla fine e trova il verbo — quello ti dice cosa sta succedendo.",
      commonMistakes: [
        {
          right: "わたしはラーメンを食べました。— Il verbo va sempre alla fine.",
          note: "Chi parla italiano mette istintivamente il verbo dopo il soggetto. In giapponese, il verbo DEVE essere ultimo.",
        },
        {
          right: "ラーメンを食べました。— L'oggetto prima del verbo.",
          note: "L'oggetto (ciò su cui agisce il verbo) viene sempre PRIMA del verbo. Pensa: 'ramen [を] mangiato' non 'mangiato ramen'.",
        },
        {
          right: "あなたはがくせいですか？— L'ordine delle parole non cambia nelle domande.",
          note: "A differenza dell'italiano, le domande in giapponese hanno lo stesso identico ordine delle affermazioni. Solo か alla fine indica una domanda.",
        },
      ],
    },
    4: {
      shortExplanation: "La particella は (wa) imposta il tema della frase. Tutto ciò che viene dopo dice qualcosa su quel tema.",
      visualImage: "は è un ampio riflettore su un palcoscenico. Qualunque cosa は illumini diventa il tema — il 'titolo' della frase. Immagina di dire 'Per quanto riguarda [X]...' prima del resto. Questo è esattamente ciò che fa は.",
      points: ["は segna il tema: 'Per quanto riguarda X...' — la frase fa poi un commento su X.", "Di solito un solo は per frase — imposta il tema principale per ciò che segue.", "は può sostituire が o を per portare quella parola nella posizione di tema.", "Contrasto: usare は...は evidenzia un confronto tra due cose.", "Una volta stabilito un tema, può essere omesso nelle frasi successive."],
      exampleEnglish: "Bevo caffè ogni mattina.",
      shortNote: "は segna il tema, non necessariamente il soggetto grammaticale. Il soggetto e il tema sono spesso diversi.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— Le informazioni nuove usano が, non は.",
          note: "Quando si risponde a 'chi?' o si introduce una nuova informazione, usa が. は presuppone che il tema sia già noto.",
        },
        {
          right: "にほんごが　できます。— I sentimenti e le abilità usano sempre が.",
          note: "I verbi come すき, きらい, できる, わかる, ほしい si abbinano sempre a が per la cosa che ti piace/sai fare/vuoi.",
        },
        {
          right: "わたしはきのうこうえんにいきました。— Di solito un solo は per frase è sufficiente.",
          note: "Accumulare più は in una sola frase è innaturale. は imposta UN solo tema principale. Usa altre particelle per tutto il resto.",
        },
      ],
    },
    5: {
      shortExplanation: "Le particelle sono piccole parole che mostrano come ogni parola si connette al verbo — come segnali stradali che indicano a ciascuna parola dove andare.",
      visualImage: "を è una freccia che colpisce un bersaglio: la cosa che l'azione raggiunge e tocca. に è uno spillo piantato su una mappa — segna una destinazione o un punto nel tempo. で è un palcoscenico o un riflettore — segna dove l'azione si svolge, o lo strumento usato per farlo.",
      points: ["を = il bersaglio dell'azione — la cosa su cui agisce il verbo.", "に = destinazione — dove si sta andando o si arriva.", "に = punto nel tempo — collega l'azione a un momento specifico.", "で = palcoscenico — il luogo dove si svolge l'azione.", "で = strumento o mezzo — ciò che si usa per fare qualcosa."],
      exampleEnglish: "Ho mangiato il pane con un amico a scuola.",
      shortNote: "に vs で: に è dove arrivi o atterri; で è dove l'azione si svolge. 学校に行く (andare A scuola) vs 学校で勉強する (studiare A scuola, cioè nel luogo).",
      commonMistakes: [
        {
          right: "がっこうで　べんきょうする。— Usa で per il luogo in cui si svolge un'azione.",
          note: "に segna la destinazione (arrivare da qualche parte). で segna dove si svolge un'azione. Se stai facendo qualcosa lì (non solo andando), usa で.",
        },
        {
          right: "でんしゃで　いえに　かえる。— Usa に per la destinazione a cui si ritorna/arriva.",
          note: "Due particelle in una frase — でんしゃで (in treno = mezzo/strumento) e いえに (a casa = destinazione). Ogni particella ha il suo ruolo.",
        },
        {
          right: "さんじに　おきます。— Gli orari specifici richiedono に.",
          note: "Orari precisi e giorni specifici (さんじ, にちようび, ごがつ) richiedono に. Ma le parole di tempo relativo come きのう, まいにち, いま NON prendono に.",
        },
      ],
    },
    6: {
      shortExplanation: "Queste cinque particelle aggiungono direzione, estensione, compagnia e aggiunta alle tue frasi.",
      visualImage: "へ è una freccia che indica una direzione. から è un ponte con un punto di partenza. まで è un traguardo o un segnale di stop. と è un segno più che collega persone o cose insieme. も è un timbro 'anch'io' che dice 'stesso qui / anche.'",
      points: ["へ = si dirige in una direzione — più morbido e poetico di に.", "から = punto di partenza nello spazio o nel tempo.", "から = motivo (perché) — usato dopo la forma piana del verbo o un nome.", "まで = punto finale — 'fino a' o 'fino in fondo a.'", "と = insieme con (persone) / e (elenco di cose). も = anche / pure — si sostituisce a は, が, o を."],
      exampleEnglish: "Ho camminato con il mio amico dalla stazione al parco.",
      shortNote: "から e まで sono compagni naturali — 'da X a Y' = X から Y まで.",
      commonMistakes: [
        {
          right: "えきから　いきます。/ えきに　いきます。— Usa una sola particella per ruolo.",
          note: "から e に non possono sovrapporsi. から = punto di partenza, に = destinazione. Scegli quale ruolo vuoi esprimere.",
        },
        {
          right: "にほんごが　すきだから、まいにち　べんきょうします。— Il risultato deve seguire から.",
          note: "Quando から significa 'perché', deve essere seguito dal risultato/azione. Terminare una frase con だから da solo suona incompleto.",
        },
        {
          right: "ともだちと　いきました。/ わたしも　いきました。— と e も hanno ruoli diversi.",
          note: "と = con qualcuno (con chi l'hai fatto). も = 'anche' (aggiungendo te stesso agli altri che l'hanno fatto). Non possono sovrapporsi per lo stesso scopo.",
        },
      ],
    },
    7: {
      shortExplanation: "Sia は che が possono apparire dove si trova il soggetto, ma proiettano un tipo diverso di luce.",
      visualImage: "は è un ampio riflettore sul palcoscenico — dice 'stiamo parlando di questo tema.' が è un puntatore laser — individua esattamente la cosa e dice 'QUESTA, nello specifico.' Le nuove informazioni, le risposte a domande su chi/cosa, e le affermazioni emotive usano が.",
      points: ["は = riflettore ampio (il tema è noto o è già stato stabilito).", "が = riflettore focalizzato (nuova informazione, o la cosa specifica che viene identificata).", "Le risposte a domande su 'chi' o 'cosa' usano が.", "I sentimenti e le abilità usano が: ciò che ti piace, vuoi, o sai fare.", "Una frase può avere sia は (tema) che が (soggetto) allo stesso tempo."],
      exampleEnglish: "Mi piace il giapponese. (Tema: io — Fuoco: giapponese)",
      shortNote: "Quando qualcuno chiede だれが…? o なにが…?, la parola nella risposta prende が — è la nuova informazione focalizzata.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— Rispondere a chi/cosa usa sempre が.",
          note: "は implica 'per quanto riguarda Yamada-san…' il che suona evasivo. が dice direttamente 'è Yamada-san quello che è venuto'.",
        },
        {
          right: "にほんごが　すきです。— I sentimenti e le abilità usano sempre が per la cosa/abilità.",
          note: "すき, きらい, できる, わかる, ほしい si abbinano sempre a が per la cosa che si apprezza/vuole/comprende.",
        },
        {
          right: "むこうに大きいたてものがあります。— Le informazioni nuove e inaspettate usano が.",
          note: "Quando stai indicando qualcosa di nuovo ('c'è un…'), usa が. は implicherebbe 'quell'edificio di cui stavamo già parlando'.",
        },
      ],
    },
    8: {
      shortExplanation: "I nomi giapponesi non cambiano per singolare, plurale o genere. Aggiungi です alla fine per fare un'affermazione educata.",
      visualImage: "です è un involucro educato che si mette su qualsiasi nome o aggettivo per dire 'è così' in modo formale. Pensalo come carta regalo — il nome all'interno non cambia, ma il pacchetto ha un bell'aspetto per le conversazioni educate.",
      points: ["Nome + です = 'è / sono' (presente educato).", "Passato: sostituisci です con でした.", "Negativo: ではありません (formale) o じゃないです (informale).", "Domanda: aggiungi か alla fine.", "ですね cerca un gentile consenso ('vero?'). ですよ offre nuove informazioni ('sai')."],
      exampleEnglish: "Sono uno studente di giapponese.",
      shortNote: "です va sempre alla fine. Non cambia per io / tu / lui / lei — una forma sola vale per tutti.",
      commonMistakes: [
        {
          right: "きのうはにちようびでした。— Gli stati passati richiedono でした.",
          note: "です descrive solo il presente. Per qualsiasi cosa nel passato, sostituisci con でした.",
        },
        {
          right: "がくせいではありません / がくせいじゃないです — scegli una forma.",
          note: "Usa o la forma formale ではありません o quella informale じゃないです, ma non mescolarle mai.",
        },
        {
          right: "わたしはがくせいです。— Includi sempre です nei contesti educati.",
          note: "Omettere です va bene nel parlato informale tra amici intimi, ma nel giapponese formale o scritto, です è obbligatorio.",
        },
      ],
    },
    9: {
      shortExplanation: "Il giapponese ha due tipi di aggettivi, e si comportano in modi completamente diversi.",
      visualImage: "Gli aggettivi in い sono trasformisti — cambiano la propria desinenza (おおきい → おおきかった). Gli aggettivi in な sono post-it — rimangono esattamente uguali ma hanno bisogno di prendere in prestito な per attaccarsi a un nome (きれいな).",
      points: ["Gli aggettivi in い terminano in い e modificano direttamente un nome — non serve nessuna parola extra.", "Gli aggettivi in な hanno bisogno di な prima di un nome.", "Passato degli aggettivi in い: elimina い, aggiungi かった.", "Negativo degli aggettivi in い: elimina い, aggiungi くない.", "Passato degli aggettivi in な: + でした. Negativo: + じゃないです."],
      exampleEnglish: "Questo film era molto interessante.",
      shortNote: "Gli aggettivi in い NON usano mai でした per il passato. L'errore più comune: ✗ たのしいでした → ✓ たのしかったです.",
      commonMistakes: [
        {
          right: "たのしかったです。— Gli aggettivi in い hanno la propria forma passata: elimina い + かった.",
          note: "Questo è l'errore più comune con gli aggettivi. でした funziona solo con nomi e aggettivi in な.",
        },
        {
          right: "しずかでした。— Gli aggettivi in な usano でした per il passato, non かった.",
          note: "きれい, しずか, ゆうめい — tutti usano でした/じゃないです, mai かった/くない.",
        },
        {
          right: "ゆうめいじゃないです / ゆうめいではありません — usa じゃない per gli aggettivi in な.",
          note: "くない è esclusivo per gli aggettivi in い. Gli aggettivi in な usano じゃない(です) per il negativo.",
        },
      ],
    },
    10: {
      shortExplanation: "I verbi giapponesi si dividono in due gruppi principali, e il gruppo a cui appartiene un verbo determina come cambia in ogni coniugazione.",
      visualImage: "I verbi ichidan sono semplici motori a un rapporto — basta rimuovere る. I verbi godan sono cambi a cinque marce — il suono finale scorre attraverso cinque file (questo è il 'godan'). Quale motore hai determina ogni coniugazione che farai.",
      points: ["Ichidan (一段 / verbi in る): rimuovi る per ottenere il tema, che non cambia mai.", "Godan (五段 / verbi in う): il suono finale nella fila う cambia durante la coniugazione.", "La trappola del る: alcuni verbi godan sembrano ichidan perché terminano in る. Controlla la vocale prima di る.", "Verbi irregolari (solo due): する (fare) e くる (venire). Memorizzali come eccezioni.", "Il gruppo determina TUTTE le coniugazioni — forma ます, forma ない, te-form, ta-form."],
      exampleEnglish: "Ogni giorno leggo e scrivo in giapponese.",
      shortNote: "Quando impari un nuovo verbo, annota subito il suo gruppo. Cambia tutto il modo in cui quel verbo si coniuga.",
      commonMistakes: [
        {
          right: "帰らない、帰って — 帰る è godan.",
          note: "帰る, 走る, 切る, 知る, 入る — terminano tutti in る ma sono godan. Se la vocale prima di る NON è い o え, è molto probabilmente godan.",
        },
        {
          right: "くる→きます、する→します — entrambi sono completamente irregolari.",
          note: "する e くる non seguono le regole di nessun gruppo. Devono essere memorizzati in ogni forma individualmente.",
        },
        {
          right: "Quando impari un nuovo verbo, annota sempre: ichidan, godan o irregolare?",
          note: "Il gruppo determina ogni singola coniugazione. Indovinare senza conoscere il gruppo porta a errori costanti.",
        },
      ],
    },
    11: {
      shortExplanation: "La forma ます è la modalità educata di qualsiasi verbo. È la forma standard per parlare con insegnanti, colleghi o persone che non si conoscono bene.",
      visualImage: "ます è come una camicia elegante che si infila al verbo. La stessa azione, ma ora è educata e presentabile. Ogni verbo nel dizionario riceve questa stessa camicia — indossata in modo diverso a seconda che sia ichidan o godan.",
      points: ["Ichidan: rimuovi る, aggiungi ます.", "Godan: sposta il suono finale alla sua versione nella fila い, poi aggiungi ます.", "Quattro forme essenziali: ます (presente/futuro) / ました (passato) / ません (negativo) / ませんでした (passato negativo).", "ましょう = 'Facciamo …' — un invito allegro a fare qualcosa insieme.", "Irregolari: する→します、くる→きます."],
      exampleEnglish: "Mi sveglio alle 6 ogni mattina.",
      shortNote: "In caso di dubbio, usa ます. È sempre educato e corretto nella maggior parte delle situazioni quotidiane.",
      commonMistakes: [
        {
          right: "よむ → よみます — む si sposta a み (fila い) prima di ます.",
          note: "I verbi godan devono spostare il suono finale alla fila い prima di aggiungere ます. Aggiungere ます direttamente alla forma del dizionario è l'errore più comune.",
        },
        {
          right: "くる → きます — くる è completamente irregolare.",
          note: "くる non segue le regole godan. Il tema cambia completamente: く→き. Memorizza: きます・きません・きました・きませんでした.",
        },
        {
          right: "ましょう = 'Facciamo!' (deciso). ましょうか = 'Facciamo?' (verificando con l'altra persona).",
          note: "ましょう presuppone che l'altra persona sia d'accordo e suona entusiasta. ましょうか è più morbido — verifica se l'altra persona vuole farlo.",
        },
      ],
    },
    12: {
      shortExplanation: "La forma del dizionario è la base piana di un verbo. La forma ない è come si rende negativo. Entrambe sono essenziali per il parlato informale e i pattern grammaticali.",
      visualImage: "La forma del dizionario è il verbo nel suo stato di riposo — pronto a lavorare ma non ancora vestito. La forma ない è lo stesso verbo con un timbro 'NON' sopra. I verbi godan si spostano alla fila あ prima di ない; i verbi ichidan eliminano semplicemente る.",
      points: ["Forma del dizionario: i verbi ichidan terminano in る, i verbi godan terminano in un suono della fila う.", "Negativo ichidan: elimina る, aggiungi ない.", "Negativo godan: sposta il suono finale alla fila あ, poi aggiungi ない.", "Negativi irregolari: する→しない、くる→こない. E: ある→ない (non あらない).", "La forma piana appare prima di pattern come と思う (penso che…) e かもしれない (forse)."],
      exampleEnglish: "Oggi non vado a scuola.",
      shortNote: "I negativi godan si spostano alla fila あ — non alla fila い. Errore comune: ✗ いきない → ✓ いかない.",
      commonMistakes: [
        {
          right: "いく → いかない — il negativo godan si sposta alla fila あ, non い.",
          note: "ます usa la fila い (いきます), ma ない usa la fila あ (いかない). Le file sono diverse — non confonderle.",
        },
        {
          right: "ある → ない — il negativo di ある è semplicemente ない.",
          note: "ある è un verbo godan, ma il suo negativo è irregolare. あらない non esiste nel giapponese standard.",
        },
        {
          right: "する → しない — completamente irregolare.",
          note: "Il negativo di する è しない, non すない. Il suo tema cambia in し (non す). Memorizza: しない・しなかった・しなかったです.",
        },
      ],
    },
    13: {
      shortExplanation: "Il passato segna un'azione completata o uno stato passato. Il giapponese cambia la desinenza del verbo o dell'aggettivo — non c'è una parola separata come 'ho fatto' o 'era'.",
      visualImage: "Il passato è come timbrare un giorno sul calendario con 'FATTO.' I verbi prendono ました (educato) o た (piano). Gli aggettivi in い sostituiscono l'ultimo い con かった. I nomi e gli aggettivi in な prendono でした. Tre timbri, una regola per ogni tipo.",
      points: ["Verbi (passato educato): ます → ました.", "Verbi (passato piano): fai la te-form, poi cambia て→た, で→だ.", "Passato degli aggettivi in い: elimina い, aggiungi かった.", "Passato di aggettivi in な e nomi: aggiungi でした.", "L'errore più comune: usare でした con gli aggettivi in い."],
      exampleEnglish: "Ieri ho guardato un film con il mio amico.",
      shortNote: "Gli aggettivi in い hanno il proprio passato incorporato (かった). Non abbinarli mai a でした.",
      commonMistakes: [
        {
          right: "たのしかったです — gli aggettivi in い usano la propria desinenza かった.",
          note: "Questo è l'errore più comune al passato. でした è solo per nomi e aggettivi in な.",
        },
        {
          right: "きれいでした — gli aggettivi in な usano でした.",
          note: "きれい, しずか, ゆうめい e tutti gli altri aggettivi in な usano でした per il passato. Mai かった.",
        },
        {
          right: "いきませんでした — il passato negativo educato è ませんでした come un'unica unità.",
          note: "ませんでした è il corretto passato negativo educato. Non cercare di costruirlo da parti come ません + だった.",
        },
      ],
    },
    14: {
      shortExplanation: "La te-form è una delle forme verbali più importanti del giapponese. Collega le azioni, formula richieste ed è il mattone fondante di decine di pattern grammaticali.",
      visualImage: "Imparare la te-form è come imparare una chiave maestra che apre molte porte. Ichidan è facile — basta sostituire る con て. I verbi godan seguono pattern di cambio sonoro. Pensali come musica: il suono si sposta in base al gruppo a cui appartiene il verbo.",
      points: ["Ichidan: elimina る, aggiungi て.", "Godan く/ぐ → いて/いで (il g sonoro ammorbidisce la desinenza in いで).", "Godan す → して.", "Godan ぬ/ぶ/む → んで.", "Godan る/う/つ → って. Irregolari: する→して、くる→きて. Eccezione: 行く→行って (non 行いて)."],
      exampleEnglish: "Per favore lavati le mani prima di mangiare.",
      shortNote: "行く è l'unica eccezione: la sua te-form è 行って, non 行いて. Ricordala da sola.",
      commonMistakes: [
        {
          right: "行く → 行って — questa è l'unica eccezione alla regola く→いて.",
          note: "Tutti gli altri verbi in く seguono く→いて (書く→書いて), ma 行く è diverso: 行く→行って.",
        },
        {
          right: "飲む → 飲んで、遊ぶ → 遊んで — ぬ/ぶ/む diventano tutti んで (sonoro).",
          note: "Queste tre desinenze diventano tutte んで, non んて. Il ん nasalizza il suono e lo rende sonoro.",
        },
        {
          right: "する → して — irregolare, deve essere memorizzato.",
          note: "する non segue nessun pattern regolare. La sua te-form è して. Si combina costantemente con i nomi: べんきょうして, そうじして.",
        },
      ],
    },
    15: {
      shortExplanation: "Una volta che sai costruire la te-form, essa apre un'ampia gamma di giapponese naturale — dalle richieste ai permessi alle sequenze.",
      visualImage: "La te-form è super-colla. Incolla le azioni insieme (A て B = prima A, poi B), e si attacca a parole ausiliarie per creare nuovi significati (てください, てもいい, ecc.). Più pattern conosci, più colla hai.",
      points: ["てください = per favore fai ~ (richiesta educata).", "てもいいですか = posso? / va bene fare ~?", "てはいけない = non si deve / vietato.", "てから = dopo aver completato del tutto ~, poi fare la cosa successiva.", "Concatenare azioni: A て B て C = fai A, poi B, poi C in sequenza."],
      exampleEnglish: "Dopo aver fatto i compiti, puoi giocare ai videogiochi.",
      shortNote: "てから significa 'dopo aver completato X del tutto.' È diverso dal semplice て, che collega due azioni in sequenza senza enfatizzare il completamento.",
      commonMistakes: [
        {
          right: "すわってもいいですか — usa てもいいですか per chiedere il permesso.",
          note: "てください è una richiesta o istruzione ('per favore fai X'). てもいいですか chiede se è lecito fare qualcosa.",
        },
        {
          right: "ごはんをたべてから、でかけた — usa てから per sottolineare che X deve essere completato prima.",
          note: "て semplicemente mette in sequenza le azioni. てから enfatizza che la prima azione deve essere completamente terminata prima che inizi la successiva.",
        },
        {
          right: "てはいけません — la forma educata è はいけません, non はいけないです.",
          note: "Il negativo educato di いけない è いけません, non いけないです. Nello scritto o nel parlato formale, usa sempre てはいけません.",
        },
      ],
    },
    16: {
      shortExplanation: "Aggiungi ている per mostrare un'azione in corso o uno stato risultante. てある indica che qualcosa è stato predisposto o preparato da qualcuno.",
      visualImage: "ている è un film che sta girando adesso (azione in corso) — o un fotogramma congelato di ciò che è accaduto (stato risultante). てある è un palcoscenico già allestito da qualcuno: 'è stato fatto, e il risultato è qui per un motivo.' Sposta il fuoco dall'attore alla situazione.",
      points: ["ている (azione in corso): sta attivamente facendo qualcosa adesso.", "ている (stato risultante): l'azione è compiuta, ma il risultato è ancora presente.", "てある (stato preparato): qualcuno l'ha fatto intenzionalmente, e il risultato è qui per uno scopo.", "ている si concentra sul soggetto / su chi agisce. てある si concentra sulla situazione.", "Verbi comuni di 'stato' con ている: 結婚している (sposato)、知っている (sapere)、住んでいる (vivere in)."],
      exampleEnglish: "Il tè è stato messo sul tavolo (qualcuno l'ha preparato).",
      shortNote: "ている chiede 'chi sta facendo / cosa sta succedendo?' てある chiede 'cosa è stato predisposto?' Entrambi descrivono stati presenti ma da angolazioni diverse.",
      commonMistakes: [
        {
          right: "よやくがしてあります — てある per la preparazione intenzionale; ている per le azioni in corso.",
          note: "Usa てある quando qualcuno ha fatto qualcosa in anticipo e il risultato conta adesso. ている è per azioni in corso o stati risultanti.",
        },
        {
          right: "かれを知っています — 知る descrive lo stato risultante dell'aver appreso qualcosa.",
          note: "知る, 住む, 結婚する e verbi simili 'a evento unico' sono quasi sempre usati con ている al presente.",
        },
        {
          right: "Il contesto è importante: まどが開いています è corretto — ma verifica se un semplice aggettivo si adatta meglio.",
          note: "ている per gli stati risultanti è corretto, ma a volte un semplice aggettivo è più naturale. Se nessuna azione l'ha causato, usa l'aggettivo.",
        },
      ],
    },
    17: {
      shortExplanation: "Questi tre ausiliari con la te-form aggiungono ciascuno un atteggiamento diverso — provare, prepararsi in anticipo, o completare (a volte con rimpianto).",
      visualImage: "てみる = immergere un dito nell'acqua per testarla. ておく = mettere un ombrello vicino alla porta prima che piova. てしまう = il barattolo dei biscotti è vuoto — è fatto, nel bene o nel male.",
      points: ["てみる = provare a fare qualcosa per vedere cosa succede — un esperimento.", "ておく = fare qualcosa in anticipo e lasciarlo pronto per dopo.", "てしまう = finire completamente. Con rimpianto: 'sono andato e l'ho fatto...'", "てしまう mostra anche che è successo qualcosa di non voluto.", "Forme parlate informali: てしまう → ちゃう (dopo suoni た/て) o じゃう (dopo suoni で)."],
      exampleEnglish: "Ho fatto i bagagli in anticipo prima del viaggio.",
      shortNote: "てみる = provare. ておく = prepararsi. てしまう = completare (a volte con rimpianto). Il contesto decide quale sensazione è più forte.",
      commonMistakes: [
        {
          right: "まいにちべんきょうしています — てみる è per provare a scoprire; usa ている per le abitudini consolidate.",
          note: "てみる implica incertezza sul risultato. Per cose che fai regolarmente o che conosci bene, il semplice ている è corretto.",
        },
        {
          right: "ておく = 'Lo farò in anticipo'. てある = 'È già stato fatto (da qualcuno)'.",
          note: "ておく è orientato al futuro: stai per preparare qualcosa. てある è risultato presente: la preparazione è già completa.",
        },
        {
          right: "たべてしまいました — usa la forma completa nel giapponese formale o scritto.",
          note: "ちゃう/じゃう sono contrazioni informali del parlato. Nel diario, nelle email o nel parlato formale, usa sempre la forma completa てしまう.",
        },
      ],
    },
    18: {
      shortExplanation: "Combina la te-form con くる o いく per mostrare la direzione di un'azione o cambiamento — verso chi parla, o lontano da chi parla.",
      visualImage: "てくる è qualcosa che si avvicina dall'orizzonte verso di te — 'è venuto in questa direzione.' ていく è qualcosa che si allontana da te verso la distanza — 'sta andando in quella direzione.' Entrambi funzionano per il movimento fisico e per i cambiamenti astratti nel tempo.",
      points: ["てくる = movimento o cambiamento che si avvicina al parlante o al momento presente.", "ていく = movimento o cambiamento che si allontana dal parlante o va nel futuro.", "Movimento fisico con てくる: andare, fare qualcosa, poi tornare.", "Movimento fisico con ていく: andare da qualche parte e continuare ad allontanarsi.", "Cambiamento astratto: 増えてきた = è andato aumentando fino ad ora. 増えていく = continuerà ad aumentare."],
      exampleEnglish: "Il mio giapponese è migliorato gradualmente.",
      shortNote: "てくる = 'fino ad ora' (guardando indietro). ていく = 'da ora in poi' (guardando avanti). Vengono spesso abbinati per descrivere un arco completo di cambiamento.",
      commonMistakes: [
        {
          right: "だんだんうまくなってきました — てくる per il cambiamento che è arrivato al presente.",
          note: "てくる = guardare indietro al cambiamento che si avvicina al presente. ていく = guardare avanti. Per descrivere come sono migliorate le tue abilità, usa てくる.",
        },
        {
          right: "してきます implica che andrai, farai la cosa e tornerai. Se non stai tornando, usa していきます.",
          note: "してきます = andare e tornare. していきます = andare e continuare ad allontanarsi. I parlanti giapponesi codificano la direzione del ritorno nel verbo stesso.",
        },
        {
          right: "Gli usi astratti sono molto comuni e naturali: わかってきた (comincio a capire), へってきた (sta diminuendo ultimamente).",
          note: "てくる/ていく non sono solo per il movimento fisico. Usarli con verbi di cambiamento come なる, わかる, ふえる è naturale e molto comune.",
        },
      ],
    },
    19: {
      shortExplanation: "Sia から che ので significano 'perché', ma から è più diretto e assertivo, mentre ので suona più morbido e educato.",
      visualImage: "から è un ponte solido e diretto: 'per questo motivo, quindi quello.' ので è un ponte sospeso — la stessa connessione, ma oscilla dolcemente. ので suona più obiettivo e esplicativo, come se stessi offrendo prove invece di affermare una causa.",
      points: ["から = motivo diretto e assertivo. Naturale nel parlato informale.", "ので = motivo morbido e educato. Preferito nella scrittura formale e quando si fanno richieste.", "Entrambi seguono la forma piana dei verbi e degli aggettivi in い.", "Aggettivi in な e nomi: usa なので (non ですので nel mezzo di una frase).", "Il から informale può stare da solo alla fine di una frase come spiegazione completa."],
      exampleEnglish: "Andrò a dormire presto stasera perché domani ho un esame.",
      shortNote: "ので suona più obiettivo — è la scelta più sicura nelle situazioni formali o quando si fa una richiesta educata.",
      commonMistakes: [
        {
          right: "しずかなので — gli aggettivi in な hanno bisogno di な prima di ので.",
          note: "Gli aggettivi in な devono mantenere il loro な quando si collegano a ので. しずかので suona innaturale; scrivi sempre しずかなので.",
        },
        {
          right: "いそがしいので、むりです — usa ので in contesti formali o scritti.",
          note: "から suona assertivo e informale. Nelle email di lavoro, nelle scuse formali o nelle richieste educate, ので è sempre la scelta più sicura.",
        },
        {
          right: "がくせいなので — usa なので per nomi e aggettivi in な nel mezzo della frase.",
          note: "ですので può apparire all'inizio di una frase formale come congiunzione, ma all'interno di una frase, i nomi e gli aggettivi in な usano なので.",
        },
      ],
    },
    20: {
      shortExplanation: "Questi pattern quotidiani ti permettono di dire cosa vuoi fare, invitare qualcuno a unirsi a te e fare richieste educate.",
      visualImage: "たい è una calamita che ti attira verso qualcosa che desideri. ましょう è una mano aperta che invita qualcuno a partecipare. ませんか è un gentile colpo alla porta: 'Vorresti...?' ください è una mano tesa che chiede.",
      points: ["〜たい = voglio fare ~ . Attaccalo al tema ます (il verbo prima di ます).", "たい si coniuga come un aggettivo in い: たくない (non voglio), たかった (volevo).", "ましょう = 'Facciamo …' — un allegro suggerimento condiviso.", "ませんか = 'Vorresti…?' — un invito educato e gentile.", "〜てください = 'Per favore fai …' — una richiesta educata usando la te-form."],
      exampleEnglish: "Vorresti andare a mangiare cibo giapponese insieme la prossima volta?",
      shortNote: "たい riguarda il tuo stesso desiderio. ましょう e ませんか riguardano fare qualcosa insieme. Usa ませんか quando vuoi sembrare particolarmente caldo e non insistente.",
      commonMistakes: [
        {
          right: "かれはすしをたべたがっています — usa たがる per i desideri di terze persone.",
          note: "たい è principalmente per il proprio desiderio in prima persona. Per i desideri di qualcun altro, usa たがる (たがっている).",
        },
        {
          right: "たべたい — attacca たい al tema ます (たべ), non alla forma del dizionario.",
          note: "たい si attacca al tema ます: たべます → たべ + たい = たべたい. Mai alla forma del dizionario.",
        },
        {
          right: "ましょう = 'Facciamo!' deciso. ませんか = 'Vorresti…?' gentile.",
          note: "ましょう presuppone che l'altra persona sia d'accordo. ませんか è un invito aperto che lascia la scelta all'altra persona.",
        },
      ],
    },
  },
  ja: {
    1: {
      shortExplanation: "ひらがなは日本語の基礎です。この46文字があれば、日本語のすべての音を書き表すことができます。",
      visualImage: "ひらがなは日本語のアルファベットのようなものですが、一文字ずつ「か」や「み」のように一つの音節（シラブル）を表します。46文字をすべて覚えれば、ひらがなで書かれたものは何でも読めるようになります。",
      points: ["5つの母音：a(あ) i(い) u(う) e(え) o(お) — すべての音節はこのどれかで終わります。", "子音の行：各行は母音の前に子音を加えます。か行 = か・き・く・け・こ。", "濁音：゛（濁点）を加えると濁った音になります — か→が、さ→ざ、た→だ、は→ば。゜を加えるとp音になります：は→ぱ。", "拗音：い段の音のあとに小さいゃゅょを付けると新しい音節になります。", "長母音（おかあさん）と促音っ — 小さいっは次の子音の前で短く息をつめます。"],
      exampleEnglish: "日本語を勉強します。",
      shortNote: "まず5つの母音から始めましょう — 母音は変化しません。日本語のほかのすべての音はこの母音をもとに作られています。",
      commonMistakes: [
        {
          right: "助詞のはは常に「わ」と発音し、「は（ha）」とは読みません。",
          note: "助詞のははひらがなの「は」と同じ字ですが、題目を示す助詞として使うときは常に「わ」と読みます。これはほぼすべての初心者がつまずく点です。",
        },
        {
          right: "きって（切手）— 小さいっは止まる音であり、「つ」の音ではありません。",
          note: "小さいっは一瞬止まる促音（子音を重ねる）であり、「つ」という音節ではありません。大きい「つ」を書くと全く別の単語になります。",
        },
        {
          right: "ぬ＝「nu」、め＝「me」— 似ていますが別の文字です。",
          note: "よく似たひらがなのペアがあります（ぬ/め、り/い、わ/れ）。最初はゆっくり書いて、微妙な曲線の違いに注意しましょう。",
        },
      ],
    },
    2: {
      shortExplanation: "カタカナはひらがなよりも直線的な形をしていますが、表す音は同じです。主に外来語や強調に使われます。",
      visualImage: "カタカナはひらがなの直線的な双子です — 同じ音、違う見た目。「外来語フォント」のようなものです。角張った文字が見えたら、それがカタカナです。",
      points: ["ひらがなと同じ46音を、角張った書き方で表します：ア(a) イ(i) ウ(u) エ(e) オ(o)。", "外来語：他の言語から借用した言葉のほとんどはカタカナで書きます。", "長音符ーは前の母音の音を伸ばします。", "ひらがなにない外来音のための特殊な組み合わせ：ファ、ティ、ウィなど。", "また、強調（斜体のような役割）、動植物の学術名、擬音語にも使われます。"],
      exampleEnglish: "コーヒーとケーキを注文しました。",
      shortNote: "長音符ーはカタカナにしか登場しません。ひらがなでは長母音を文字で書き出します（おかあさん）。",
      commonMistakes: [
        {
          right: "ソ＝「so」、ン＝「n」— ンには小さな曲がりがあり、ソはより斜めです。シ＝「shi」、ツ＝「tsu」。",
          note: "この4文字はとてもよく似ていて、ほぼ全員が混乱します。ゆっくり並べて比べてみましょう。",
        },
        {
          right: "カタカナでは長母音に必ずーを使います。✗ コオヒイ → ✓ コーヒー",
          note: "ひらがなでは母音を書き出しますが、カタカナでは必ずーを使います。カタカナで同じ母音文字を二度書いてはいけません。",
        },
        {
          right: "日本語の音に合わせます：「マクドナルド」は英語の発音そのままではありません。",
          note: "日本語の外来語は日本語の音に合わせて変えられており、そのままコピーはされません。カタカナの綴りが日本語の発音を示しています。",
        },
      ],
    },
    3: {
      shortExplanation: "日本語の文は英語とは異なる構造を持っており、動詞は必ず文の一番最後に来ます。",
      visualImage: "日本語の文は電車のようなものです。は（題目）は先頭の駅名板です。時間・場所の車両が続きます。目的語の車両はその後ろ。動詞は一番最後の機関車です。文の意味は機関車が来るまでわかりません。",
      points: ["基本的な語順：題目 → 時間・場所 → 目的語 → 動詞。すべてが最後の動詞に向かって積み上がります。", "動詞は必ず文の最後に来ます — 標準的な日本語では例外はありません。", "主語は文脈から明らかな場合、省略されることが多いです。", "形容詞は必ず修飾する名詞の直前に置きます。", "文の最後にかを付けるだけで疑問文になります — 語順の変更は不要です。"],
      exampleEnglish: "昨日、図書館で本を読みました。",
      shortNote: "長い文で迷ったら、最後に飛んで動詞を確認しましょう — それが何をしているかを教えてくれます。",
      commonMistakes: [
        {
          right: "わたしはラーメンを食べました。— 動詞は必ず最後。",
          note: "英語話者は本能的に主語の後に動詞を置きます。日本語では動詞は必ず最後でなければなりません。",
        },
        {
          right: "ラーメンを食べました。— 目的語は動詞の前。",
          note: "目的語（動作の対象）は動詞の前に置きます。「ラーメン[を]食べた」というイメージで、「食べた ラーメン」ではありません。",
        },
        {
          right: "あなたはがくせいですか？— 疑問文でも語順は変わりません。",
          note: "英語と違い、日本語の疑問文は平叙文とまったく同じ語順です。語尾にかを付けるだけで疑問文になります。",
        },
      ],
    },
    4: {
      shortExplanation: "助詞は（wa）は文の題目を示します。はの後に来る部分は、その題目について何かを述べます。",
      visualImage: "はは舞台の広いスポットライトです。はが当たったものが題目 — 文の「見出し」になります。「〜については…」と言ってから続きを述べるイメージです。それがまさにはの働きです。",
      points: ["はは題目を示します：「〜については…」— その後の文がXについてのコメントになります。", "通常、文中にはは一つ — これが続く内容の主な題目を設定します。", "ははがやをに置き換えて、その語を題目の位置に持ってくることができます。", "対比：は…はを使うと、二つのものを比較する意味になります。", "一度題目が確立されると、続く文ではその題目を省略できます。"],
      exampleEnglish: "毎朝コーヒーを飲みます。",
      shortNote: "はは題目を示すものであり、必ずしも文法的な主語ではありません。主語と題目は異なることがよくあります。",
      commonMistakes: [
        {
          right: "やまださんが来ました。— 新しい情報にはが、はではなく。",
          note: "「誰が？」という質問に答えるとき、または新情報を導入するときにはがを使います。はは題目がすでに知られていることを前提とします。",
        },
        {
          right: "にほんごが　できます。— 感情・能力には常にがを使います。",
          note: "すき、きらい、できる、わかる、ほしいなどの動詞は、好きなもの・できること・欲しいものに常にがを使います。",
        },
        {
          right: "わたしはきのうこうえんにいきました。— 一文に一つのはが基本。",
          note: "一文に複数のはを重ねるのは不自然です。はは一つの主題を設定します。他のすべてには別の助詞を使いましょう。",
        },
      ],
    },
    5: {
      shortExplanation: "助詞は、それぞれの単語が動詞とどのようにつながるかを示す小さな語です — 各単語の行き先を示す道路標識のようなものです。",
      visualImage: "をは的に向かう矢印：動作が直接及ぶ対象。にはマップに刺すピン — 目的地や時間のポイントを示します。では行動が行われる舞台やスポットライト — 動作が起こる場所、または使う道具を示します。",
      points: ["を ＝ 動作の対象 — 動詞が作用するもの。", "に ＝ 目的地 — 向かう・到着する場所。", "に ＝ 時間のピン — 動作を特定の時点に結びつけます。", "で ＝ 舞台 — 動作が行われる場所。", "で ＝ 手段や道具 — 何かをするために使うもの。"],
      exampleEnglish: "学校で友達とパンを食べました。",
      shortNote: "に対で：には到着する・行き着く場所、では動作が行われる場所。学校に行く（学校へ向かう）vs 学校で勉強する（学校でする）。",
      commonMistakes: [
        {
          right: "がっこうで　べんきょうする。— 動作が行われる場所にはでを使います。",
          note: "には目的地（どこかに到着する）を示します。では動作が行われる場所を示します。ただ行くだけでなく、そこで何かをするならでを使います。",
        },
        {
          right: "でんしゃで　いえに　かえる。— 帰る先の目的地にはにを使います。",
          note: "一文に二つの助詞があります — でんしゃで（電車で＝手段）といえに（家に＝目的地）。それぞれの助詞にそれぞれの役割があります。",
        },
        {
          right: "さんじに　おきます。— 具体的な時刻にはにが必要。",
          note: "具体的な時刻や曜日（さんじ、にちようび、ごがつ）にはにが必要です。しかし、きのう、まいにち、いまのような相対的な時間表現にはには付きません。",
        },
      ],
    },
    6: {
      shortExplanation: "この5つの助詞は、文に方向・範囲・同伴・追加を加えます。",
      visualImage: "へは方向を示す矢印。からは出発点のある橋。まではゴールライン・終点。とは人やものをつなぐプラス記号。もは「私も同じ」と言う「me too」スタンプです。",
      points: ["へ ＝ 方向に向かう — により柔らかく詩的な表現。", "から ＝ 空間または時間の出発点。", "から ＝ 理由（〜だから） — 動詞の普通形または名詞の後に使います。", "まで ＝ 終点 — 「〜まで」または「〜のところまで」。", "と ＝ 〜と一緒に（人）／〜と（ものの列挙）。も ＝ 〜も／〜もまた — は、が、またはをと入れ替えて使います。"],
      exampleEnglish: "駅から公園まで友達と歩きました。",
      shortNote: "からとまでは自然なパートナーです — 「XからYまで」という形で使います。",
      commonMistakes: [
        {
          right: "えきから　いきます。/ えきに　いきます。— 一つの役割に一つの助詞。",
          note: "からとには重ねて使えません。から＝出発点、に＝目的地。どちらの役割を表現したいかを選びましょう。",
        },
        {
          right: "にほんごが　すきだから、まいにち　べんきょうします。— からの後には結果が必要。",
          note: "からが「〜だから」の意味のとき、その後には結果・行動が続く必要があります。だからだけで文を終えると不完全に聞こえます。",
        },
        {
          right: "ともだちと　いきました。/ わたしも　いきました。— とともは役割が異なります。",
          note: "と＝誰かと一緒に（誰とやったか）。も＝「〜も」（やった人たちに自分を加える）。同じ目的に両方を重ねることはできません。",
        },
      ],
    },
    7: {
      shortExplanation: "はとがはどちらも主語の位置に現れますが、当てる光の種類が異なります。",
      visualImage: "はは広くて柔らかい舞台のスポットライト — 「この話題について話しています」というサインです。がはレーザーポインター — まさに「これ」と特定のものを指します。新しい情報、誰が・何がという質問への答え、感情表現にはがを使います。",
      points: ["は ＝ 広いスポットライト（題目がすでに知られているか、設定済みの場合）。", "が ＝ フォーカスのスポットライト（新情報、または特定のものを識別する場合）。", "「誰が」「何が」という質問への答えにはがを使います。", "感情・能力にはがを使います：好きなもの・欲しいもの・できること。", "一文にはとが（主語）の両方が存在することもあります。"],
      exampleEnglish: "日本語が好きです。（題目：私 — フォーカス：日本語）",
      shortNote: "だれが…？やなにが…？という質問に対して、答える語にはがを使います — それが新しく焦点を当てた情報だからです。",
      commonMistakes: [
        {
          right: "やまださんが来ました。— 誰が・何がという答えには常にがを使います。",
          note: "はを使うと「山田さんについては…」という感じで回りくどく聞こえます。がは「来たのは山田さんだ」と直接示します。",
        },
        {
          right: "にほんごが　すきです。— 感情・能力には、好きなもの・スキルに対して常にがを使います。",
          note: "すき、きらい、できる、わかる、ほしいは、好きなもの・欲しいもの・わかることに対して常にがと組み合わせます。",
        },
        {
          right: "むこうに大きいたてものがあります。— 新しい・予想外の情報にはがを使います。",
          note: "何か新しいものを指摘するとき（「〜がある」）はがを使います。はを使うと「すでに話題にしていたあの建物」という意味になります。",
        },
      ],
    },
    8: {
      shortExplanation: "日本語の名詞は単数・複数・性別で変化しません。文の最後にですを付けると丁寧な表現になります。",
      visualImage: "ですはどんな名詞や形容詞にもかぶせられる丁寧なラッパーです。「これがそうです」と改まった形で述べます。プレゼントの包み紙のようなもの — 中身の名詞は変わらず、包みが丁寧な会話にふさわしい見た目になります。",
      points: ["名詞 ＋ です ＝「〜です」（丁寧な現在形）。", "過去形：ですをでしたに変えます。", "否定形：ではありません（丁寧）またはじゃないです（くだけた言い方）。", "疑問文：文末にかを付けます。", "ですねは軽い同意を求めます（「〜ですよね？」）。ですよは新情報を伝えます（「〜ですよ」）。"],
      exampleEnglish: "私は日本語の学生です。",
      shortNote: "ですは必ず文の一番最後に置きます。私・あなた・彼・彼女によって変化しません — 一つの形ですべてに対応します。",
      commonMistakes: [
        {
          right: "きのうはにちようびでした。— 過去の状態にはでしたが必要。",
          note: "ですは現在しか表しません。過去のことには、でしたに変えましょう。",
        },
        {
          right: "がくせいではありません / がくせいじゃないです — どちらか一方を選びます。",
          note: "丁寧なではありませんか、くだけたじゃないですのどちらかを使いますが、混在させてはいけません。",
        },
        {
          right: "わたしはがくせいです。— 丁寧な場面では必ずですを付けます。",
          note: "ですを省くのは親しい友人同士のくだけた会話では問題ありませんが、改まった場面や書き言葉ではですは必須です。",
        },
      ],
    },
    9: {
      shortExplanation: "日本語には2種類の形容詞があり、それぞれまったく異なる使い方をします。",
      visualImage: "い形容詞は変身上手です — 語尾が自ら変化します（おおきい→おおきかった）。な形容詞は付箋のようなもの — 形は変わらず、名詞に貼り付けるときにだけなが必要です（きれいな）。",
      points: ["い形容詞はいで終わり、名詞を直接修飾します — 追加の語は不要。", "な形容詞は名詞の前にながが必要。", "い形容詞の過去形：いを取り、かったを付けます。", "い形容詞の否定形：いを取り、くないを付けます。", "な形容詞の過去形：＋でした。否定形：＋じゃないです。"],
      exampleEnglish: "この映画はとても面白かったです。",
      shortNote: "い形容詞には絶対にでしたを使いません。最もよくある間違い：✗ たのしいでした → ✓ たのしかったです。",
      commonMistakes: [
        {
          right: "たのしかったです。— い形容詞には専用の過去形があります：い→かった。",
          note: "形容詞の誤りで最も多いのがこれです。でしたは名詞とな形容詞にしか使えません。",
        },
        {
          right: "しずかでした。— な形容詞の過去形はでしたを使い、かったではありません。",
          note: "きれい、しずか、ゆうめい — これらはすべてでした／じゃないですを使います。かった／くないは使いません。",
        },
        {
          right: "ゆうめいじゃないです / ゆうめいではありません — な形容詞の否定にはじゃないを使います。",
          note: "くないはい形容詞専用です。な形容詞の否定にはじゃない（です）を使います。",
        },
      ],
    },
    10: {
      shortExplanation: "日本語の動詞は大きく2つのグループに分かれ、どちらのグループに属するかによって、すべての活用の形が決まります。",
      visualImage: "一段動詞はシンプルな一段変速エンジン — るを取るだけです。五段動詞は五段変速のギアボックス — 語尾の音が五つの行を移動します（これが「五段」の意味）。どちらのエンジンかで、これから先のすべての活用が決まります。",
      points: ["一段動詞（る動詞）：るを取って語幹を作ります。語幹は変化しません。", "五段動詞（う動詞）：活用するとき、語尾のう段の音が移動します。", "る動詞の罠：五段動詞の中にも一段に見えるるで終わるものがあります。るの前の母音を確認しましょう。", "不規則動詞（2つだけ）：する（do）とくる（come）。例外として覚えます。", "グループによってすべての活用が決まります — ます形、ない形、て形、た形すべて。"],
      exampleEnglish: "毎日日本語を読んだり書いたりします。",
      shortNote: "新しい動詞を覚えるときは、必ずそのグループを確認しましょう。活用のすべてが変わります。",
      commonMistakes: [
        {
          right: "帰らない、帰って — 帰るは五段動詞。",
          note: "帰る、走る、切る、知る、入る — これらはすべてるで終わりますが五段動詞です。るの前の母音がいまたはえでなければ、五段動詞である可能性が高いです。",
        },
        {
          right: "くる→きます、する→します — どちらも完全な不規則動詞。",
          note: "するとくるはどちらのグループのルールにも従いません。それぞれの形を個別に覚える必要があります。",
        },
        {
          right: "新しい動詞を覚えるときは、必ず確認を：一段、五段、不規則？",
          note: "グループがすべての活用を決めます。グループを知らずに推測すると、常に同じ間違いを繰り返すことになります。",
        },
      ],
    },
    11: {
      shortExplanation: "ます形はどの動詞にも使える丁寧な言い方です。先生・同僚・初対面の人に話すときの標準的な形です。",
      visualImage: "ますは動詞に着せるワイシャツのようなものです。同じ動作でも、これで丁寧で整った印象になります。辞書のすべての動詞にこのシャツを着せます — 一段か五段かによって着せ方が異なります。",
      points: ["一段動詞：るを取り、ますを付けます。", "五段動詞：語尾の音をい段に変え、ますを付けます。", "4つの基本形：ます（現在・未来）/ ました（過去）/ ません（否定）/ ませんでした（過去否定）。", "ましょう ＝「〜しましょう」— 一緒に何かをしようと誘う表現。", "不規則2つ：する→します、くる→きます。"],
      exampleEnglish: "毎朝6時に起きます。",
      shortNote: "迷ったらますを使いましょう。ますは常に丁寧で、日常のほとんどの場面で正しい形です。",
      commonMistakes: [
        {
          right: "よむ → よみます — むはます前にみ（い段）に変わります。",
          note: "五段動詞はますを付ける前に語尾の音をい段に変える必要があります。辞書形に直接ますを付けるのが最もよくある間違いです。",
        },
        {
          right: "くる → きます — くるは完全に不規則です。",
          note: "くるは五段のルールに従いません。語幹が完全に変わります：く→き。覚え方：きます・きません・きました・きませんでした。",
        },
        {
          right: "ましょう＝「〜しましょう！」（積極的）。ましょうか＝「〜しましょうか？」（相手の意向を確認）。",
          note: "ましょうは相手が同意することを前提とした、元気な表現です。ましょうかは柔らかく、相手の意向を確認するニュアンスがあります。",
        },
      ],
    },
    12: {
      shortExplanation: "辞書形は動詞の基本の形です。ない形は否定の言い方です。どちらもくだけた会話と文法パターンに欠かせません。",
      visualImage: "辞書形は動詞の休息状態 — 働く準備はできていますが、まだ整えていない形です。ない形は同じ動詞に「NOT」のスタンプを押したものです。五段動詞はない前にあ段に変わります。一段動詞はるを取るだけです。",
      points: ["辞書形：一段動詞はるで終わり、五段動詞はう段の音で終わります。", "一段動詞の否定形：るを取り、ないを付けます。", "五段動詞の否定形：語尾の音をあ段に変え、ないを付けます。", "不規則な否定形：する→しない、くる→こない。また：ある→ない（あらないではない）。", "普通形はと思う（〜と思う）やかもしれない（〜かもしれない）などのパターンの前に来ます。"],
      exampleEnglish: "今日は学校に行かない。",
      shortNote: "五段動詞の否定はあ段に変わります — い段ではありません。よくある間違い：✗ いきない → ✓ いかない。",
      commonMistakes: [
        {
          right: "いく → いかない — 五段動詞の否定はあ段で、い段ではありません。",
          note: "ます形はい段（いきます）、ない形はあ段（いかない）を使います。行を混同しないようにしましょう。",
        },
        {
          right: "ある → ない — あるの否定形は単純にないです。",
          note: "あるは五段動詞ですが、否定形は不規則です。あらないは標準的な日本語には存在しません。",
        },
        {
          right: "する → しない — 完全に不規則。",
          note: "するの否定形はしないで、すないではありません。語幹がし（すではない）に変わります。覚え方：しない・しなかった・しなかったです。",
        },
      ],
    },
    13: {
      shortExplanation: "過去形は完了した動作や過去の状態を示します。日本語では動詞や形容詞の語尾を変えます — 英語の「did」や「was」のような別の語は不要です。",
      visualImage: "過去形はカレンダーに「完了」のスタンプを押すようなものです。動詞にはました（丁寧）またはた（普通）。い形容詞はいをかったに変えます。名詞とな形容詞にはでした。3種類のスタンプ、それぞれ一つのルール。",
      points: ["動詞（丁寧な過去）：ます → ました。", "動詞（普通の過去）：て形を作り、て→た、で→だに変えます。", "い形容詞の過去形：いを取り、かったを付けます。", "な形容詞・名詞の過去形：でしたを付けます。", "最もよくある間違い：い形容詞にでしたを使うこと。"],
      exampleEnglish: "昨日友達と映画を見ました。",
      shortNote: "い形容詞には独自の過去形（かった）があります。決してでしたと組み合わせてはいけません。",
      commonMistakes: [
        {
          right: "たのしかったです — い形容詞にはかったという語尾があります。",
          note: "これは過去形で最もよくある間違いです。でしたは名詞とな形容詞にのみ使います。",
        },
        {
          right: "きれいでした — な形容詞にはでしたを使います。",
          note: "きれい、しずか、ゆうめいなどすべてのな形容詞は過去形にでしたを使います。かったは使いません。",
        },
        {
          right: "いきませんでした — 丁寧な過去否定はませんでしたを一つのまとまりとして使います。",
          note: "ませんでしたが正しい丁寧な過去否定形です。ません＋だったのように組み合わせて作ろうとしてはいけません。",
        },
      ],
    },
    14: {
      shortExplanation: "て形は日本語で最も重要な動詞の形の一つです。動作をつなぎ、お願いをし、数十の文法パターンの基礎となります。",
      visualImage: "て形を覚えることは、多くの扉を開くマスターキーを手に入れることです。一段動詞は簡単 — るをてに変えるだけ。五段動詞は音の変化のパターンに従います。音楽のように、動詞のグループによって音が変わります。",
      points: ["一段動詞：るを取り、てを付けます。", "五段動詞 く/ぐ → いて/いで（有声音のぐは語尾がいでに柔らかくなります）。", "五段動詞 す → して。", "五段動詞 ぬ/ぶ/む → んで。", "五段動詞 る/う/つ → って。不規則：する→して、くる→きて。例外：行く→行って（行いてではない）。"],
      exampleEnglish: "食べる前に手を洗ってください。",
      shortNote: "行くは唯一の例外です：て形は行って（行いてではない）。単独で覚えましょう。",
      commonMistakes: [
        {
          right: "行く → 行って — これはく→いてのルールの唯一の例外です。",
          note: "他のく動詞はすべてく→いて（書く→書いて）に従いますが、行くだけは異なります：行く→行って。",
        },
        {
          right: "飲む → 飲んで、遊ぶ → 遊んで — ぬ/ぶ/むはすべてんで（有声）になります。",
          note: "この3つの語尾はすべてんで（んてではない）になります。んが音を鼻音化させて有声にします。",
        },
        {
          right: "する → して — 不規則のため、覚えるしかありません。",
          note: "するはどの規則的なパターンにも従いません。て形はして。名詞と頻繁に組み合わさります：べんきょうして、そうじして。",
        },
      ],
    },
    15: {
      shortExplanation: "て形を作れるようになると、お願い・許可・動作の連続など、自然な日本語の表現が大きく広がります。",
      visualImage: "て形は強力な接着剤です。動作をつなぎ（AてB＝まずA、次にB）、補助の語にくっついて新しい意味を作ります（てください、てもいいなど）。パターンを増やすほど、使える接着剤も増えます。",
      points: ["てください ＝ 〜してください（丁寧なお願い）。", "てもいいですか ＝ 〜してもいいですか？（許可を求める）", "てはいけない ＝ 〜してはいけない（禁止）。", "てから ＝ 〜を完全に終えてから、次のことをする。", "動作の連続：AてBてC ＝ A、次にB、次にCという順番で行う。"],
      exampleEnglish: "宿題をしてから、ゲームをしてもいいです。",
      shortNote: "てからは「Xを完全に終えてから」という意味です。単なるてとは異なり、最初の動作の完了を強調します。",
      commonMistakes: [
        {
          right: "すわってもいいですか — 許可を求めるにはてもいいですかを使います。",
          note: "てくださいは依頼・指示です（「〜してください」）。てもいいですかは何かをしてもよいかどうかを確認します。",
        },
        {
          right: "ごはんをたべてから、でかけた — 最初のことを完全に終える必要があることを強調するにはてからを使います。",
          note: "ては動作を単につなぎます。てからは最初の動作が完全に終わってから次が始まることを強調します。",
        },
        {
          right: "てはいけません — 丁寧な形ははいけません（はいけないですではない）。",
          note: "いけないの丁寧な否定はいけません（いけないですではない）。書き言葉や改まった場面では常にてはいけませんを使います。",
        },
      ],
    },
    16: {
      shortExplanation: "ているを付けると、進行中の動作または動作の結果として残っている状態を表します。てあるは誰かが準備・設定したことを示します。",
      visualImage: "ているは今まさに上映中の映画（進行中の動作）、または何かが起きた後の止まった画面（結果の状態）。てあるは誰かがすでにセットした舞台です：「誰かがやって、その結果がここに目的をもって残っている」。行為者ではなく状況に焦点を当てます。",
      points: ["ている（進行中の動作）：今まさに行っている最中。", "ている（結果の状態）：動作は終わったが、その結果がまだここにある。", "てある（準備された状態）：誰かが意図的に行い、その結果が目的をもってここにある。", "ているは主語・誰がしているかに焦点。てあるは状況に焦点。", "ているをよく使う「状態」を表す動詞：結婚している（既婚）、知っている（知っている）、住んでいる（住んでいる）。"],
      exampleEnglish: "テーブルの上にお茶が置いてあります（誰かが準備した）。",
      shortNote: "ているは「誰が〜している？／何が起きている？」を問います。てあるは「何が準備されている？」を問います。どちらも現在の状態を表しますが、角度が異なります。",
      commonMistakes: [
        {
          right: "よやくがしてあります — てあるは意図的な準備に、ているは進行中の動作に使います。",
          note: "てあるは誰かが事前に何かをして、その結果が今重要な意味を持つときに使います。ているは進行中の動作や結果の状態に使います。",
        },
        {
          right: "かれを知っています — 知るは何かを学んだ結果の状態を表します。",
          note: "知る、住む、結婚するなど「一回限りの出来事」を表す動詞は、現在形ではほぼ常にているとともに使います。",
        },
        {
          right: "文脈が重要：まどが開いていますは正しい — ただし、単純な形容詞の方が自然な場合もあります。",
          note: "結果の状態を表すているは正しいですが、動作による原因がない場合は形容詞の方が自然なこともあります。",
        },
      ],
    },
    17: {
      shortExplanation: "この3つのて形の補助語はそれぞれ異なるニュアンスを加えます — 試すこと、事前に準備すること、完了（時に後悔を伴う）。",
      visualImage: "てみるは足先で水温を確かめること。ておくは雨が降る前に傘を玄関に置いておくこと。てしまうはクッキーの瓶が空になってしまった — よくも悪くも、もう終わったこと。",
      points: ["てみる ＝ どうなるか試しにやってみる — 実験のような感覚。", "ておく ＝ 事前にやっておき、後で使えるように準備しておく。", "てしまう ＝ 完全に終える。後悔を伴うことも：「やってしまった…」", "てしまうは意図しないことが起きたことも表します。", "くだけた話し言葉の短縮形：てしまう → ちゃう（た・て音の後）またはじゃう（で音の後）。"],
      exampleEnglish: "旅行の前に荷物を準備しておきました。",
      shortNote: "てみる＝試すこと。ておく＝準備すること。てしまう＝完了すること（時に後悔を伴う）。文脈で最も強いニュアンスが決まります。",
      commonMistakes: [
        {
          right: "まいにちべんきょうしています — てみるは試して確かめるため、習慣にはているを使います。",
          note: "てみるは結果が不確かな時のニュアンスがあります。定期的にやること・よく知っていることには、普通のているが正しいです。",
        },
        {
          right: "ておく＝「事前にやっておく」。てある＝「すでに（誰かが）やってある」。",
          note: "ておくは未来志向：これから何かを準備しようとしています。てあるは現在の結果：準備はすでに完了しています。",
        },
        {
          right: "たべてしまいました — 改まった場面や書き言葉では完全な形を使います。",
          note: "ちゃう/じゃうはくだけた話し言葉の短縮形です。日記・メール・改まった場面では常に完全なてしまうを使います。",
        },
      ],
    },
    18: {
      shortExplanation: "て形にくるまたはいくを組み合わせることで、動作・変化の方向を示します — 話し手に向かう方向か、遠ざかる方向か。",
      visualImage: "てくるは地平線から自分に向かって何かが近づいてくること — 「こちらに来た」。ていくは何かが自分から遠ざかっていくこと — 「あちらへ行く」。どちらも物理的な移動にも、時間の流れの中の抽象的な変化にも使えます。",
      points: ["てくる ＝ 話し手・現在の瞬間に向かって近づく動作または変化。", "ていく ＝ 話し手から遠ざかる・未来に向かう動作または変化。", "物理的な移動でのてくる：行って、何かをして、戻ってくる。", "物理的な移動でのていく：どこかへ行って、そのまま遠ざかる。", "抽象的な変化：増えてきた＝今まで増え続けてきた。増えていく＝これからも増え続ける。"],
      exampleEnglish: "日本語が少しずつうまくなってきました。",
      shortNote: "てくる＝「今まで」（現在を振り返る）。ていく＝「これから」（先を見通す）。変化の全体的な流れを描くためによく対で使われます。",
      commonMistakes: [
        {
          right: "だんだんうまくなってきました — てくるは現在に向かって到達した変化に使います。",
          note: "てくる＝現在に向かって近づいてきた変化を振り返る。ていく＝未来を見通す。スキルの向上を表すにはてくるを使います。",
        },
        {
          right: "してきますは行って戻ることを含意します。戻らない場合はしていきますを使います。",
          note: "してきます＝行って戻ってくる。していきます＝行ってそのまま去る。日本語では動詞自体に戻るかどうかの方向が含まれています。",
        },
        {
          right: "抽象的な使い方はとても自然：わかってきた（わかり始めてきた）、へってきた（最近減ってきた）。",
          note: "てくる/ていくは物理的な移動だけではありません。なる、わかる、ふえるなど変化を表す動詞と組み合わせるのは自然で非常によく使われます。",
        },
      ],
    },
    19: {
      shortExplanation: "からとのではどちらも「〜だから」という意味ですが、からは直接的で断定的、のでは柔らかく丁寧に聞こえます。",
      visualImage: "からは頑丈で直接的な橋：「これだから、したがってそれ」。のでは吊り橋 — 同じつながりですが、やわらかく揺れる感じ。のでは客観的・説明的に聞こえ、原因を主張するよりも根拠を提示しているようなニュアンスです。",
      points: ["から ＝ 直接的・断定的な理由。くだけた会話に自然。", "ので ＝ 柔らかく丁寧な理由。改まった書き言葉や依頼の場面で好まれます。", "どちらも動詞・い形容詞の普通形の後に続きます。", "な形容詞・名詞：なのでを使います（文中でですのでは使わない）。", "くだけた会話のからは文末に単独で完全な説明として使えます。"],
      exampleEnglish: "明日テストがあるから、今夜は早く寝ます。",
      shortNote: "のでの方が客観的に聞こえます — 改まった場面や丁寧なお願いには安全な選択です。",
      commonMistakes: [
        {
          right: "しずかなので — な形容詞はのでの前になが必要。",
          note: "な形容詞はのでにつなぐときのなを残す必要があります。しずかのでは不自然です。常にしずかなのでと書きましょう。",
        },
        {
          right: "いそがしいので、むりです — 改まった場面や書き言葉ではのでを使います。",
          note: "からは直接的でくだけた印象です。ビジネスメール・改まったお詫び・丁寧な依頼では、のでが常に安全な選択です。",
        },
        {
          right: "がくせいなので — 文中の名詞・な形容詞にはなのでを使います。",
          note: "ですのでは改まった文の冒頭に接続詞として使えますが、文中では名詞とな形容詞にはなのでを使います。",
        },
      ],
    },
    20: {
      shortExplanation: "これらの日常的なパターンを使って、やりたいことを言ったり、誰かを誘ったり、丁寧にお願いしたりできます。",
      visualImage: "たいは自分が望むものへと引き寄せる磁石。ましょうは一緒にどうぞと誘う開いた手。ませんかはドアへの優しいノック：「〜しませんか？」。くださいは手を差し伸べてお願いする形です。",
      points: ["〜たい ＝ 〜したい。ます形の語幹（ますの前の形）に付けます。", "たいはい形容詞のように活用します：たくない（したくない）、たかった（したかった）。", "ましょう ＝「〜しましょう」— 元気に一緒に何かをしようと提案する表現。", "ませんか ＝「〜しませんか？」— 丁寧で穏やかな誘いの表現。", "〜てください ＝「〜してください」— て形を使った丁寧な依頼。"],
      exampleEnglish: "今度一緒に日本食を食べに行きませんか？",
      shortNote: "たいは自分自身の望みを表します。ましょうとませんかは一緒に何かをすることについてです。特に温かく押しつけがましくない誘い方をしたいときはませんかを使いましょう。",
      commonMistakes: [
        {
          right: "かれはすしをたべたがっています — 第三者の望みにはたがるを使います。",
          note: "たいは主に自分自身（一人称）の望みに使います。他の人の望みを表すにはたがる（たがっている）を使います。",
        },
        {
          right: "たべたい — たいはます形の語幹（たべ）に付け、辞書形には付けません。",
          note: "たいはます形の語幹に付けます：たべます → たべ ＋ たい ＝ たべたい。辞書形には付けません。",
        },
        {
          right: "ましょう ＝ 積極的な「〜しましょう！」。ませんか ＝ 柔らかな「〜しませんか？」",
          note: "ましょうは相手が同意することを前提とした表現です。ませんかは相手に選択を委ねる、開いた誘いの表現です。",
        },
      ],
    },
  },
  ko: {
    1: {
      shortExplanation: "히라가나는 일본어의 기초입니다. 이 46개의 문자로 일본어의 모든 소리를 표현할 수 있습니다.",
      visualImage: "히라가나를 일본어의 알파벳이라고 생각하세요. 단, 단일 글자 대신 각 문자가 하나의 음절(예: 'ka'나 'mi' 같은 소리)을 나타냅니다. 46개를 모두 익히면 히라가나로 쓰인 모든 것을 소리 내어 읽을 수 있습니다.",
      points: ["5개의 모음: a(あ) i(い) u(う) e(え) o(お) — 모든 음절은 이 중 하나로 끝납니다.", "자음 행: 각 행은 모음 앞에 자음을 붙입니다. か행 = ka ki ku ke ko.", "탁음: ゛(탁점)을 붙이면 탁음이 됩니다 — か→が, さ→ざ, た→だ, は→ば. ゜를 붙이면 p음: は→ぱ.", "결합음(拗音): い행 소리 뒤에 작은 ゃゅょ를 붙이면 새로운 음절이 만들어집니다.", "장모음(おかあさん)과 촉음 っ — 작은 っ는 다음 자음 앞의 짧은 멈춤을 의미합니다."],
      exampleEnglish: "저는 일본어를 공부합니다.",
      shortNote: "먼저 5개의 모음부터 시작하세요. 모음은 변하지 않으며, 일본어의 다른 모든 소리는 이 모음을 기반으로 합니다.",
      commonMistakes: [
        {
          right: "は는 조사로 쓰일 때 항상 'ha'가 아닌 'wa'로 발음합니다.",
          note: "조사 は는 히라가나 'ha'처럼 생겼지만 주제 표시어로 쓰일 때는 항상 'wa'로 읽습니다. 거의 모든 입문자가 실수하는 부분입니다.",
        },
        {
          right: "きって(切手) — 작은 っ는 'tsu' 소리가 아니라 멈춤입니다.",
          note: "작은 っ는 멈춤/겹자음이지, 음절 'tsu'가 아닙니다. 큰 つ로 쓰면 완전히 다른 단어가 됩니다.",
        },
        {
          right: "ぬ = 'nu', め = 'me' — 비슷해 보이지만 다른 문자입니다.",
          note: "여러 히라가나 쌍이 매우 비슷하게 생겼습니다(ぬ/め, り/い, わ/れ). 처음에는 천천히 쓰고 작은 곡선 차이에 주의를 기울이세요.",
        },
      ],
    },
    2: {
      shortExplanation: "가타카나는 히라가나보다 각진 모양이지만 같은 소리를 나타냅니다. 주로 외래어와 강조 표현에 사용됩니다.",
      visualImage: "가타카나는 히라가나의 직선적인 쌍둥이입니다. 같은 소리, 다른 모양입니다. '외래어 전용 글꼴'이라고 생각하세요. 각지고 모난 문자가 보이면 가타카나입니다.",
      points: ["히라가나와 같은 46개의 소리, 다만 각진 획으로 씁니다: ア(a) イ(i) ウ(u) エ(e) オ(o).", "외래어(外来語): 다른 언어에서 차용한 대부분의 단어는 가타카나로 씁니다.", "장모음 부호 ー는 앞의 모음 소리를 늘립니다.", "히라가나에 없는 외국어 소리를 위한 특수 결합: ファ、ティ、ウィ 등.", "강조(이탤릭체처럼), 동식물 이름(과학 분야), 의성어에도 사용됩니다."],
      exampleEnglish: "저는 커피와 케이크를 주문했습니다.",
      shortNote: "장모음 부호 ー는 가타카나에서만 사용됩니다. 히라가나에서는 장모음을 모두 풀어서 씁니다(おかあさん).",
      commonMistakes: [
        {
          right: "ソ = 'so', ン = 'n' — ン은 작은 굴곡이 있고, ソ는 더 대각선입니다. シ = 'shi', ツ = 'tsu'.",
          note: "이 네 문자는 매우 비슷하게 생겨서 거의 모든 사람이 혼동합니다. 천천히 나란히 비교해 보세요.",
        },
        {
          right: "가타카나에서는 장모음에 항상 ー를 사용합니다. ✗ コオヒイ → ✓ コーヒー",
          note: "히라가나에서는 모음을 풀어 쓰지만, 가타카나에서는 항상 ー를 사용합니다. 가타카나에서 모음 글자를 두 번 쓰지 마세요.",
        },
        {
          right: "일본어 소리에 맞게 변환합니다: '맥도날드' → マクドナルド, 영어 발음 그대로가 아닙니다.",
          note: "일본의 외래어는 일본어 소리에 맞게 변환되며, 그대로 복사하지 않습니다. 가타카나 표기가 일본어 발음을 알려줍니다.",
        },
      ],
    },
    3: {
      shortExplanation: "일본어 문장은 영어와 다르게 구성됩니다. 동사는 항상 문장의 맨 끝에 옵니다.",
      visualImage: "일본어 문장은 기차입니다. 주제 표시어 は는 앞에 붙는 역 이름판입니다. 시간과 장소 칸이 그 다음에 옵니다. 목적어 칸은 뒤쪽에 있습니다. 동사는 맨 마지막 위치에 있는 엔진입니다. 엔진이 도착하기 전에는 문장의 의미를 결정하지 마세요.",
      points: ["기본 어순: 주제 → 시간/장소 → 목적어 → 동사. 모든 것이 마지막의 동사를 향해 쌓입니다.", "동사는 항상 문장을 마무리합니다. 표준 일본어에는 예외가 없습니다.", "문맥에서 이미 알 수 있는 경우 주어는 자주 생략됩니다.", "형용사는 항상 수식하는 명사 바로 앞에 옵니다.", "문장 끝에 か를 붙이면 의문문이 됩니다. 어순 변경은 필요하지 않습니다."],
      exampleEnglish: "저는 어제 도서관에서 책을 읽었습니다.",
      shortNote: "긴 문장에서 길을 잃으면 끝으로 건너뛰어 동사를 찾으세요. 무슨 일이 일어나고 있는지 알 수 있습니다.",
      commonMistakes: [
        {
          right: "わたしはラーメンを食べました。— 동사는 항상 끝에.",
          note: "영어 사용자는 본능적으로 주어 다음에 동사를 씁니다. 일본어에서는 동사가 반드시 마지막에 와야 합니다.",
        },
        {
          right: "ラーメンを食べました。— 목적어는 동사 앞에.",
          note: "목적어(행위의 대상)는 항상 동사 앞에 옵니다. '라멘을 먹었다'처럼 생각하세요, '먹었다 라멘'이 아닙니다.",
        },
        {
          right: "あなたはがくせいですか？— 의문문에서도 어순은 바뀌지 않습니다.",
          note: "영어와 달리 일본어 의문문은 평서문과 어순이 동일합니다. 끝에 か만 붙이면 의문문이 됩니다.",
        },
      ],
    },
    4: {
      shortExplanation: "조사 は(wa)는 문장의 주제를 설정합니다. 그 뒤에 오는 모든 것이 그 주제에 대한 설명입니다.",
      visualImage: "は는 무대 위의 넓은 스포트라이트입니다. は가 닿는 대상이 주제, 즉 문장의 '헤드라인'이 됩니다. 나머지 문장 앞에 '~에 대해서 말하자면...'이라고 말하는 것을 상상해 보세요. 그것이 바로 は가 하는 일입니다.",
      points: ["は는 주제를 표시합니다: '~에 대해서 말하자면...' — 그다음 문장이 X에 대한 설명을 합니다.", "보통 문장당 は 하나 — 이후 내용의 주요 주제를 설정합니다.", "は는 が나 を를 대체하여 그 단어를 주제 위치로 가져올 수 있습니다.", "대비: は...は를 사용하면 두 가지를 비교하는 것을 강조합니다.", "주제가 확립되면 이후 문장에서 생략할 수 있습니다."],
      exampleEnglish: "저는 매일 아침 커피를 마십니다.",
      shortNote: "は는 반드시 문법적 주어가 아닌 주제를 표시합니다. 주어와 주제는 종종 다릅니다.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— 새로운 정보에는 は가 아닌 が를 사용합니다.",
          note: "'누가?'라는 질문에 답하거나 새로운 정보를 소개할 때는 が를 사용합니다. は는 주제가 이미 알려져 있다고 전제합니다.",
        },
        {
          right: "にほんごが　できます。— 감정과 능력에는 항상 が를 사용합니다.",
          note: "すき, きらい, できる, わかる, ほしい 같은 동사는 좋아하는/할 수 있는/원하는 대상에 항상 が를 씁니다.",
        },
        {
          right: "わたしはきのうこうえんにいきました。— 문장당 보통 は 하나면 충분합니다.",
          note: "한 문장에 は를 여러 개 쌓는 것은 부자연스럽습니다. は는 하나의 주요 주제를 설정합니다. 나머지에는 다른 조사를 사용하세요.",
        },
      ],
    },
    5: {
      shortExplanation: "조사는 각 단어가 동사와 어떻게 연결되는지를 보여주는 작은 단어입니다. 마치 각 단어가 어디로 가야 할지 알려주는 도로 표지판과 같습니다.",
      visualImage: "を는 목표물에 명중하는 화살입니다. 행위가 닿고 건드리는 대상입니다. に는 지도에 꽂힌 핀입니다. 목적지나 시간의 한 지점을 표시합니다. で는 무대나 스포트라이트입니다. 행위가 일어나는 장소, 또는 사용되는 도구를 표시합니다.",
      points: ["を = 행위의 목표 — 동사가 작용하는 대상.", "に = 목적지 — 향하거나 도착하는 곳.", "に = 시간 핀 — 행위를 특정 시점에 붙입니다.", "で = 무대 — 행위가 일어나는 장소.", "で = 도구나 수단 — 어떤 일을 하는 데 사용하는 것."],
      exampleEnglish: "저는 학교에서 친구와 빵을 먹었습니다.",
      shortNote: "に vs で: に는 도착하거나 목적지로 가는 곳, で는 행위가 펼쳐지는 곳입니다. 学校に行く(학교에 가다) vs 学校で勉強する(학교에서 공부하다).",
      commonMistakes: [
        {
          right: "がっこうで　べんきょうする。— 행위가 일어나는 장소에는 で를 사용합니다.",
          note: "に는 목적지(어딘가에 도착함)를 표시합니다. で는 행위가 일어나는 장소를 표시합니다. 단순히 가는 것이 아니라 그곳에서 무언가를 하는 경우 で를 사용하세요.",
        },
        {
          right: "でんしゃで　いえに　かえる。— 돌아가거나 도착하는 목적지에는 に를 사용합니다.",
          note: "한 문장에 두 조사 — でんしゃで(기차로 = 수단/도구)와 いえに(집으로 = 목적지). 각 조사마다 고유한 역할이 있습니다.",
        },
        {
          right: "さんじに　おきます。— 구체적인 시간에는 に가 필요합니다.",
          note: "구체적인 시각과 요일(さんじ, にちようび, ごがつ)에는 に가 필요합니다. 하지만 きのう, まいにち, いま 같은 상대적 시간 표현에는 に를 쓰지 않습니다.",
        },
      ],
    },
    6: {
      shortExplanation: "이 다섯 조사는 문장에 방향, 범위, 동반, 추가의 의미를 더합니다.",
      visualImage: "へ는 방향을 나타내는 화살표입니다. から는 출발점이 있는 다리입니다. まで는 결승선 또는 정지 표지판입니다. と는 사람이나 사물을 연결하는 더하기 기호입니다. も는 '나도요'라는 도장으로 '같은 경우/역시'를 의미합니다.",
      points: ["へ = 방향으로 향함 — に보다 부드럽고 시적인 표현.", "から = 공간이나 시간의 출발점.", "から = 이유(~이기 때문에) — 평서형 동사나 명사 뒤에 사용.", "まで = 종점 — '~까지' 또는 '~에 이르기까지'.", "と = ~와 함께(사람) / 그리고(사물 나열). も = 역시/~도 — は, が, を를 대체합니다."],
      exampleEnglish: "저는 역에서 공원까지 친구와 함께 걸었습니다.",
      shortNote: "から와 まで는 자연스러운 짝입니다 — 'X에서 Y까지' = X から Y まで.",
      commonMistakes: [
        {
          right: "えきから　いきます。/ えきに　いきます。— 역할당 하나의 조사를 사용합니다.",
          note: "から와 に는 함께 쌓을 수 없습니다. から = 출발점, に = 목적지. 어떤 역할을 표현하고 싶은지 선택하세요.",
        },
        {
          right: "にほんごが　すきだから、まいにち　べんきょうします。— から 뒤에 결과가 와야 합니다.",
          note: "から가 '~이기 때문에'를 의미할 때 반드시 결과/행위가 뒤따라야 합니다. 문장을 だから로만 끝내면 미완성처럼 들립니다.",
        },
        {
          right: "ともだちと　いきました。/ わたしも　いきました。— と와 も는 역할이 다릅니다.",
          note: "と = ~와 함께(같이 한 사람). も = '역시'(같은 행위를 한 다른 사람에 자신을 추가). 같은 목적으로 함께 쌓을 수 없습니다.",
        },
      ],
    },
    7: {
      shortExplanation: "は와 が 둘 다 주어 위치에 나타날 수 있지만, 서로 다른 종류의 빛을 비춥니다.",
      visualImage: "は는 넓고 부드러운 무대 스포트라이트입니다. '우리는 이 주제에 대해 이야기하고 있다'는 의미입니다. が는 레이저 포인터입니다. 정확한 대상을 가리키며 '바로 이것'이라고 말합니다. 새로운 정보, 누가/무엇이라는 질문에 대한 답, 감정적 표현에는 が를 사용합니다.",
      points: ["は = 넓은 스포트라이트(주제가 이미 알려지거나 설정되어 있음).", "が = 집중 스포트라이트(새로운 정보, 또는 특정 대상을 지목).", "'누가' 또는 '무엇이'라는 질문의 답에는 が를 사용합니다.", "감정과 능력에는 が를 사용합니다: 좋아하는 것, 원하는 것, 할 수 있는 것.", "한 문장에 は(주제)와 が(주어)가 동시에 있을 수 있습니다."],
      exampleEnglish: "저는 일본어가 좋습니다. (주제: 나 — 초점: 일본어)",
      shortNote: "누군가 だれが…? 또는 なにが…?라고 물으면, 답하는 단어에 が를 붙입니다. 새롭게 강조되는 정보이기 때문입니다.",
      commonMistakes: [
        {
          right: "やまださんが来ました。— 누가/무엇이라는 질문에 항상 が로 답합니다.",
          note: "は를 사용하면 '야마다 씨에 대해서 말하자면...'처럼 들려 회피하는 것처럼 보입니다. が는 '온 사람은 야마다 씨'라고 직접적으로 말합니다.",
        },
        {
          right: "にほんごが　すきです。— 감정과 능력에는 항상 대상/기술에 が를 사용합니다.",
          note: "すき, きらい, できる, わかる, ほしい는 항상 좋아하는/원하는/이해하는 대상에 が를 씁니다.",
        },
        {
          right: "むこうに大きいたてものがあります。— 새롭고 예상치 못한 정보에는 が를 사용합니다.",
          note: "새로운 것을 가리킬 때('~가 있다')는 が를 사용하세요. は를 쓰면 '우리가 이미 이야기하고 있던 그 건물'이라는 의미가 됩니다.",
        },
      ],
    },
    8: {
      shortExplanation: "일본어 명사는 단수, 복수, 성별에 따라 변하지 않습니다. 끝에 です를 붙여 정중한 문장을 만드세요.",
      visualImage: "です는 명사나 형용사 위에 씌우는 정중한 포장지입니다. 격식 있는 방식으로 '이것은 그렇습니다'라고 말하는 것입니다. 선물 포장지라고 생각하세요. 안의 명사는 변하지 않지만, 포장이 정중한 대화에 어울리게 보입니다.",
      points: ["명사 + です = '~입니다' (정중한 현재형).", "과거형: です를 でした로 바꿉니다.", "부정형: ではありません(격식) 또는 じゃないです(평어).", "의문문: 끝에 か를 붙입니다.", "ですね는 부드러운 동의를 구합니다('그렇죠?'). ですよ는 새로운 정보를 제공합니다('~이라고요')."],
      exampleEnglish: "저는 일본어를 공부하는 학생입니다.",
      shortNote: "です는 항상 맨 끝에 옵니다. 나/너/그/그녀에 따라 변하지 않습니다. 하나의 형태가 모두에게 적용됩니다.",
      commonMistakes: [
        {
          right: "きのうはにちようびでした。— 과거 상태에는 でした가 필요합니다.",
          note: "です는 현재만 나타냅니다. 과거의 것은 でした로 바꾸세요.",
        },
        {
          right: "がくせいではありません / がくせいじゃないです — 하나의 형태를 선택하세요.",
          note: "격식체 ではありません 또는 평어 じゃないです 중 하나를 사용하되, 절대로 섞지 마세요.",
        },
        {
          right: "わたしはがくせいです。— 정중한 상황에서는 항상 です를 포함하세요.",
          note: "친한 친구 사이의 편한 대화에서는 です를 생략해도 되지만, 격식체나 문어체 일본어에서는 です가 필요합니다.",
        },
      ],
    },
    9: {
      shortExplanation: "일본어에는 두 종류의 형용사가 있으며, 각각 완전히 다르게 활용됩니다.",
      visualImage: "い형용사는 변신 능력자입니다. 어미 자체가 변합니다(おおきい → おおきかった). な형용사는 포스트잇입니다. 그 자체는 그대로지만 명사에 붙으려면 な를 빌려야 합니다(きれいな).",
      points: ["い형용사는 い로 끝나며 별도의 단어 없이 명사를 직접 수식합니다.", "な형용사는 명사 앞에 な가 필요합니다.", "い형용사 과거형: い를 떼고 かった를 붙입니다.", "い형용사 부정형: い를 떼고 くない를 붙입니다.", "な형용사 과거: + でした. 부정: + じゃないです."],
      exampleEnglish: "이 영화는 정말 재미있었습니다.",
      shortNote: "い형용사에는 절대로 でした를 사용하지 않습니다. 가장 흔한 실수: ✗ たのしいでした → ✓ たのしかったです.",
      commonMistakes: [
        {
          right: "たのしかったです。— い형용사는 고유한 과거형이 있습니다: い를 떼고 + かった.",
          note: "이것이 가장 흔한 형용사 실수입니다. でした는 명사와 な형용사에만 사용됩니다.",
        },
        {
          right: "しずかでした。— な형용사의 과거형은 かった가 아니라 でした입니다.",
          note: "きれい, しずか, ゆうめい — 모두 でした/じゃないです를 사용하며, かった/くない는 절대 사용하지 않습니다.",
        },
        {
          right: "ゆうめいじゃないです / ゆうめいではありません — な형용사의 부정에는 じゃない를 사용합니다.",
          note: "くない는 오직 い형용사에만 사용됩니다. な형용사의 부정에는 じゃない(です)를 사용합니다.",
        },
      ],
    },
    10: {
      shortExplanation: "일본어 동사는 두 가지 주요 그룹으로 나뉘며, 동사가 속한 그룹에 따라 모든 활용형이 결정됩니다.",
      visualImage: "이치단 동사는 단순한 1단 엔진입니다. る만 제거하면 됩니다. 고단 동사는 5단 기어박스입니다. 마지막 소리가 5개의 행을 거쳐 변합니다(그것이 '고단'입니다). 어떤 엔진을 가지고 있느냐가 앞으로의 모든 활용형을 결정합니다.",
      points: ["이치단(一段 / る동사): る를 제거하면 어간이 되며, 어간은 변하지 않습니다.", "고단(五段 / う동사): 활용 시 마지막 u행 소리가 바뀝니다.", "る함정: 일부 고단 동사는 이치단처럼 보이도록 る로 끝납니다. る 앞의 모음을 확인하세요.", "불규칙 동사(딱 두 개): する(하다)와 くる(오다). 예외로 외우세요.", "그룹이 모든 활용형을 결정합니다 — ます형, ない형, て형, た형 모두."],
      exampleEnglish: "저는 매일 일본어를 읽고 씁니다.",
      shortNote: "새로운 동사를 배울 때 바로 그룹을 확인하세요. 그것이 그 동사의 모든 활용 방식을 결정합니다.",
      commonMistakes: [
        {
          right: "帰らない、帰って — 帰る는 고단 동사입니다.",
          note: "帰る, 走る, 切る, 知る, 入る — 모두 る로 끝나지만 고단 동사입니다. る 앞의 모음이 い나 え가 아니라면 고단일 가능성이 매우 높습니다.",
        },
        {
          right: "くる→きます、する→します — 둘 다 완전 불규칙입니다.",
          note: "する와 くる는 어느 그룹의 규칙도 따르지 않습니다. 각 형태를 개별적으로 외워야 합니다.",
        },
        {
          right: "새로운 동사를 배울 때는 항상 이치단인지, 고단인지, 불규칙인지 확인하세요.",
          note: "그룹이 모든 활용형을 결정합니다. 그룹을 모르고 추측하면 지속적인 오류가 발생합니다.",
        },
      ],
    },
    11: {
      shortExplanation: "ます형은 모든 동사의 정중한 형태입니다. 선생님, 직장 동료, 잘 모르는 사람에게 말할 때의 표준 형태입니다.",
      visualImage: "ます는 동사에 입히는 정장 셔츠와 같습니다. 같은 행위이지만 이제 정중하고 단정하게 보입니다. 사전에 있는 모든 동사에 이 셔츠를 입힐 수 있습니다. 다만 이치단인지 고단인지에 따라 다르게 입힙니다.",
      points: ["이치단: る를 제거하고 ます를 붙입니다.", "고단: 마지막 소리를 い행으로 바꾼 다음 ます를 붙입니다.", "4가지 핵심 형태: ます(현재/미래) / ました(과거) / ません(부정) / ませんでした(과거 부정).", "ましょう = '~합시다' — 함께 무언가를 하자는 활기찬 제안.", "불규칙 두 개: する→します、くる→きます."],
      exampleEnglish: "저는 매일 아침 6시에 일어납니다.",
      shortNote: "확신이 없을 때는 ます를 사용하세요. 대부분의 일상 상황에서 항상 정중하고 올바릅니다.",
      commonMistakes: [
        {
          right: "よむ → よみます — む는 ます 앞에서 み(い행)로 바뀝니다.",
          note: "고단 동사는 ます를 붙이기 전에 마지막 소리를 い행으로 바꿔야 합니다. 사전형에 바로 ます를 붙이는 것이 가장 흔한 오류입니다.",
        },
        {
          right: "くる → きます — くる는 완전 불규칙입니다.",
          note: "くる는 고단 규칙을 따르지 않습니다. 어간이 완전히 바뀝니다: く→き. 외우세요: きます・きません・きました・きませんでした.",
        },
        {
          right: "ましょう = '~합시다!'(적극적). ましょうか = '~할까요?'(상대방 의견 확인).",
          note: "ましょう는 상대방이 동의할 것이라고 전제하며 열정적으로 들립니다. ましょうか는 더 부드러우며 상대방의 의사를 확인합니다.",
        },
      ],
    },
    12: {
      shortExplanation: "사전형은 동사의 기본 형태입니다. ない형은 동사를 부정으로 만드는 방법입니다. 둘 다 평어 회화와 문법 패턴에 필수적입니다.",
      visualImage: "사전형은 동사가 준비 상태에 있는 것입니다. 아직 격식을 갖추지는 않았지만 일할 준비가 되어 있습니다. ない형은 같은 동사에 '부정' 도장이 찍힌 것입니다. 고단 동사는 ない 앞에서 あ행으로 바뀝니다. 이치단 동사는 그냥 る를 떼면 됩니다.",
      points: ["사전형: 이치단 동사는 る로 끝나고, 고단 동사는 う행 소리로 끝납니다.", "이치단 부정: る를 떼고 ない를 붙입니다.", "고단 부정: 마지막 소리를 あ행으로 바꾼 다음 ない를 붙입니다.", "불규칙 부정: する→しない、くる→こない. 그리고: ある→ない(あらない가 아님).", "평서형은 と思う(~라고 생각한다)와 かもしれない(아마) 같은 패턴 앞에 나타납니다."],
      exampleEnglish: "저는 오늘 학교에 가지 않습니다.",
      shortNote: "고단 부정형은 あ행으로 변합니다 — い행이 아닙니다. 흔한 실수: ✗ いきない → ✓ いかない.",
      commonMistakes: [
        {
          right: "いく → いかない — 고단 부정은 い행이 아닌 あ행으로 바뀝니다.",
          note: "ます형은 い행을 사용하지만(いきます), ない형은 あ행을 사용합니다(いかない). 행이 다르므로 혼동하지 마세요.",
        },
        {
          right: "ある → ない — ある의 부정형은 단순히 ない입니다.",
          note: "ある는 고단 동사지만 부정형은 불규칙입니다. あらない는 표준 일본어에 존재하지 않습니다.",
        },
        {
          right: "する → しない — 완전 불규칙입니다.",
          note: "する의 부정형은 しない이며, すない가 아닙니다. 어간이 し(す가 아님)로 바뀝니다. 외우세요: しない・しなかった・しなかったです.",
        },
      ],
    },
    13: {
      shortExplanation: "과거 시제는 완료된 행위나 과거의 상태를 나타냅니다. 일본어는 동사나 형용사의 어미를 바꿉니다. 영어의 'did'나 'was'처럼 별도의 단어가 없습니다.",
      visualImage: "과거 시제는 달력 날짜에 '완료' 도장을 찍는 것과 같습니다. 동사는 ました(정중)나 た(평어)가 됩니다. い형용사는 마지막 い를 かった로 바꿉니다. 명사와 な형용사는 でした가 됩니다. 세 가지 도장, 각 유형마다 하나의 규칙.",
      points: ["동사(정중 과거형): ます → ました.", "동사(평어 과거형): て형을 만든 다음 て→た, で→だ로 바꿉니다.", "い형용사 과거: い를 떼고 かった를 붙입니다.", "な형용사와 명사 과거: でした를 붙입니다.", "가장 흔한 실수: い형용사와 でした를 같이 쓰는 것."],
      exampleEnglish: "어제 친구와 영화를 봤습니다.",
      shortNote: "い형용사에는 자체적인 과거 시제(かった)가 있습니다. 절대로 でした와 함께 사용하지 마세요.",
      commonMistakes: [
        {
          right: "たのしかったです — い형용사는 자체적인 かった 어미를 사용합니다.",
          note: "이것이 가장 흔한 과거 시제 실수입니다. でした는 명사와 な형용사에만 사용됩니다.",
        },
        {
          right: "きれいでした — な형용사는 でした를 사용합니다.",
          note: "きれい, しずか, ゆうめい 및 다른 모든 な형용사는 과거에 でした를 사용합니다. かった는 절대 사용하지 않습니다.",
        },
        {
          right: "いきませんでした — 정중한 과거 부정형은 ませんでした입니다.",
          note: "ませんでした가 올바른 정중한 과거 부정형입니다. ません + だった처럼 조각으로 만들려고 하지 마세요.",
        },
      ],
    },
    14: {
      shortExplanation: "て형은 일본어에서 가장 중요한 동사 형태 중 하나입니다. 행위를 연결하고, 요청을 만들고, 수십 가지 문법 패턴의 기초가 됩니다.",
      visualImage: "て형 만들기는 많은 문을 여는 마스터 키 하나를 배우는 것입니다. 이치단은 쉽습니다. る를 て로 바꾸면 됩니다. 고단 동사는 소리 변화 패턴을 따릅니다. 음악처럼 생각하세요. 동사가 속한 그룹에 따라 소리가 바뀝니다.",
      points: ["이치단: る를 떼고 て를 붙입니다.", "고단 く/ぐ → いて/いで (탁음 g는 어미를 いで로 부드럽게 합니다).", "고단 す → して.", "고단 ぬ/ぶ/む → んで.", "고단 る/う/つ → って. 불규칙: する→して、くる→きて. 예외: 行く→行って(行いて가 아님)."],
      exampleEnglish: "식사 전에 손을 씻어 주세요.",
      shortNote: "行く는 유일한 예외입니다. て형은 行って이며, 行いて가 아닙니다. 단독으로 외워 두세요.",
      commonMistakes: [
        {
          right: "行く → 行って — く→いて 규칙의 유일한 예외입니다.",
          note: "다른 모든 く동사는 く→いて를 따르지만(書く→書いて), 行く는 다릅니다: 行く→行って.",
        },
        {
          right: "飲む → 飲んで、遊ぶ → 遊んで — ぬ/ぶ/む는 모두 んで가 됩니다(탁음).",
          note: "이 세 어미는 모두 んて가 아닌 んで가 됩니다. ん이 소리를 비음화하고 탁음으로 만듭니다.",
        },
        {
          right: "する → して — 불규칙이므로 외워야 합니다.",
          note: "する는 어떤 규칙 패턴도 따르지 않습니다. て형은 して입니다. 명사와 항상 결합됩니다: べんきょうして, そうじして.",
        },
      ],
    },
    15: {
      shortExplanation: "て형을 만들 수 있으면 요청, 허가, 순서 등 자연스러운 일본어의 폭넓은 표현이 가능해집니다.",
      visualImage: "て형은 순간 접착제입니다. 행위들을 연결하고(A て B = 먼저 A, 그다음 B), 보조 단어에 붙어 새로운 의미를 만듭니다(てください, てもいい 등). 더 많은 패턴을 알수록 더 많은 접착제를 갖게 됩니다.",
      points: ["てください = ~해 주세요(정중한 요청).", "てもいいですか = ~해도 될까요? / ~해도 괜찮습니까?", "てはいけない = ~하면 안 됩니다 / 금지.", "てから = ~를 완전히 마친 후, 그다음 것을 합니다.", "행위 연결: A て B て C = A, 그다음 B, 그다음 C 순서로 합니다."],
      exampleEnglish: "숙제를 한 다음에 게임을 해도 됩니다.",
      shortNote: "てから는 'X를 완전히 마친 후'를 의미합니다. 두 행위를 완료 강조 없이 순서대로 연결하는 단순한 て와는 다릅니다.",
      commonMistakes: [
        {
          right: "すわってもいいですか — 허가를 구할 때는 てもいいですか를 사용합니다.",
          note: "てください는 요청이나 지시입니다('X해 주세요'). てもいいですか는 어떤 것을 해도 괜찮은지 묻는 것입니다.",
        },
        {
          right: "ごはんをたべてから、でかけた — X가 완전히 끝나야 함을 강조하려면 てから를 사용합니다.",
          note: "て는 단순히 행위를 순서대로 나열합니다. てから는 첫 번째 행위가 완전히 끝나야 다음이 시작된다는 것을 강조합니다.",
        },
        {
          right: "てはいけません — 정중한 형태는 はいけません이며, はいけないです가 아닙니다.",
          note: "いけない의 정중한 부정형은 いけないです가 아니라 いけません입니다. 글쓰기나 격식체에서는 항상 てはいけません을 사용하세요.",
        },
      ],
    },
    16: {
      shortExplanation: "ている를 붙이면 진행 중인 행위나 결과 상태를 나타냅니다. てある는 누군가에 의해 무언가가 준비되거나 설정되었음을 나타냅니다.",
      visualImage: "ている는 지금 재생 중인 영화(진행 중인 행위)이거나 일어난 일의 정지 화면(결과 상태)입니다. てある는 누군가에 의해 이미 설치된 무대입니다. '누군가가 했고, 그 결과가 이유가 있어서 여기 있다'는 의미입니다. 행위자에서 상황으로 초점이 이동합니다.",
      points: ["ている(진행 중인 행위): 지금 적극적으로 하고 있음.", "ている(결과 상태): 행위는 끝났지만 결과가 아직 여기 있음.", "てある(준비 상태): 누군가가 의도적으로 했고, 결과가 목적을 위해 여기 있음.", "ている는 주체/행위자에 초점. てある는 상황에 초점.", "흔한 ている '상태' 동사: 結婚している(결혼했다)、知っている(알고 있다)、住んでいる(살고 있다)."],
      exampleEnglish: "테이블 위에 차가 놓여 있습니다(누군가가 준비했습니다).",
      shortNote: "ている는 '누가 하고 있는가 / 무슨 일이 일어나고 있는가?'를 묻습니다. てある는 '무엇이 준비되어 있는가?'를 묻습니다. 둘 다 현재 상태를 나타내지만 다른 각도에서 봅니다.",
      commonMistakes: [
        {
          right: "よやくがしてあります — てある는 의도적인 준비에, ている는 진행 중인 행위에 사용합니다.",
          note: "누군가가 미리 무언가를 해 두었고 지금 그 결과가 중요할 때 てある를 사용하세요. ている는 진행 중인 행위나 결과 상태에 사용합니다.",
        },
        {
          right: "かれを知っています — 知る는 무언가를 배운 결과 상태를 나타냅니다.",
          note: "知る, 住む, 結婚する 등 '일회성 사건' 동사는 현재에서 거의 항상 ている와 함께 사용됩니다.",
        },
        {
          right: "문맥이 중요합니다: まどが開いています는 올바릅니다. 하지만 단순 형용사가 더 적합한지 확인하세요.",
          note: "결과 상태에 ている를 쓰는 것은 맞지만, 때로는 단순 형용사가 더 자연스럽습니다. 어떤 행위가 원인이 아니라면 형용사를 사용하세요.",
        },
      ],
    },
    17: {
      shortExplanation: "이 세 가지 て형 보조어는 각각 다른 뉘앙스를 더합니다. 시도, 미리 준비, 완료(때로는 후회)입니다.",
      visualImage: "てみる = 물에 발가락을 담가 테스트해 보는 것. ておく = 비가 오기 전에 문 옆에 우산을 놓아두는 것. てしまう = 쿠키 통이 비어 있다 — 좋든 나쁘든 이미 끝났다.",
      points: ["てみる = 어떻게 되는지 보려고 시도해 보는 것 — 실험.", "ておく = 나중을 위해 미리 무언가를 해 두는 것.", "てしまう = 완전히 끝냄. 후회와 함께: '그만 ~해버렸다...'", "てしまう는 의도하지 않은 일이 일어났음을 나타내기도 합니다.", "구어 단축형: てしまう → ちゃう(た/て 소리 뒤) 또는 じゃう(で 소리 뒤)."],
      exampleEnglish: "여행 전에 미리 짐을 쌌습니다.",
      shortNote: "てみる = 시도. ておく = 준비. てしまう = 완료(때로는 후회). 문맥이 어떤 느낌이 가장 강한지 결정합니다.",
      commonMistakes: [
        {
          right: "まいにちべんきょうしています — てみる는 시도해 보기 위한 것입니다. 정해진 습관에는 ている를 사용하세요.",
          note: "てみる는 결과에 대한 불확실성을 내포합니다. 정기적으로 하거나 이미 잘 아는 것에는 평범한 ている가 맞습니다.",
        },
        {
          right: "ておく = '미리 해 둘 것이다'. てある = '(누군가에 의해) 이미 되어 있다'.",
          note: "ておく는 미래 지향적입니다. 무언가를 준비하려는 것입니다. てある는 현재 결과입니다. 준비가 이미 완료되어 있는 것입니다.",
        },
        {
          right: "たべてしまいました — 격식체나 문어에서는 완전한 형태를 사용하세요.",
          note: "ちゃう/じゃう는 구어 단축형입니다. 일기 쓰기, 이메일, 격식체에서는 항상 완전한 てしまう 형태를 사용하세요.",
        },
      ],
    },
    18: {
      shortExplanation: "て형과 くる 또는 いく를 결합하면 행위나 변화의 방향을 나타낼 수 있습니다. 화자를 향하거나, 화자로부터 멀어지는 방향입니다.",
      visualImage: "てくる는 지평선에서 당신을 향해 다가오는 것입니다. '이쪽으로 왔다'는 의미입니다. ていく는 당신에게서 멀어져 거리 속으로 사라지는 것입니다. '저쪽으로 가고 있다'는 의미입니다. 둘 다 물리적 이동과 시간에 따른 추상적 변화에 적용됩니다.",
      points: ["てくる = 화자 또는 현재 순간을 향해 다가오는 이동이나 변화.", "ていく = 화자 또는 미래를 향해 멀어지는 이동이나 변화.", "てくる 물리적 이동: 가서 무언가를 하고 돌아옴.", "ていく 물리적 이동: 어딘가로 가서 계속 멀어짐.", "추상적 변화: 増えてきた = 지금까지 계속 증가해 왔다. 増えていく = 앞으로도 계속 증가할 것이다."],
      exampleEnglish: "제 일본어 실력이 점점 나아지고 있습니다.",
      shortNote: "てくる = '지금까지'(되돌아보기). ていく = '앞으로'(내다보기). 변화의 전체 흐름을 묘사할 때 종종 함께 사용됩니다.",
      commonMistakes: [
        {
          right: "だんだんうまくなってきました — 현재에 도달한 변화에는 てくる를 사용합니다.",
          note: "てくる = 지금을 향해 다가온 변화를 되돌아보기. ていく = 앞으로 내다보기. 실력이 어떻게 향상되었는지 묘사할 때는 てくる를 사용하세요.",
        },
        {
          right: "してきます는 가서 하고 돌아온다는 의미입니다. 돌아오지 않는다면 していきます를 사용하세요.",
          note: "してきます = 가서 돌아옴. していきます = 가서 계속 멀어짐. 일본어 화자들은 동사 자체에 귀환 여부를 담아 표현합니다.",
        },
        {
          right: "추상적 용법은 매우 자연스럽습니다: わかってきた(이해하기 시작했다), へってきた(최근 줄고 있다).",
          note: "てくる/ていく는 물리적 이동에만 쓰이지 않습니다. なる, わかる, ふえる 같은 변화 동사와 함께 쓰는 것은 자연스럽고 매우 일반적입니다.",
        },
      ],
    },
    19: {
      shortExplanation: "から와 ので는 둘 다 '~이기 때문에'를 의미하지만, から는 더 직접적이고 단호하며, ので는 더 부드럽고 정중하게 들립니다.",
      visualImage: "から는 튼튼하고 직접적인 다리입니다. '이것 때문에, 따라서 저것이다.' ので는 현수교입니다. 같은 연결이지만 부드럽게 흔들립니다. ので는 더 객관적이고 설명적으로 들립니다. 원인을 주장하기보다 근거를 제시하는 것 같습니다.",
      points: ["から = 직접적이고 단호한 이유. 편한 대화에서 자연스럽습니다.", "ので = 부드럽고 정중한 이유. 격식체 문장과 요청 시 선호됩니다.", "둘 다 동사와 い형용사의 평서형 뒤에 옵니다.", "な형용사와 명사: なので를 사용합니다(문장 중간에 ですので는 사용하지 않음).", "편한 から는 문장 끝에 완전한 설명으로 단독으로 쓸 수 있습니다."],
      exampleEnglish: "내일 시험이 있기 때문에 오늘 밤 일찍 자겠습니다.",
      shortNote: "ので는 더 객관적으로 들립니다. 격식체 상황이나 정중한 요청을 할 때 더 안전한 선택입니다.",
      commonMistakes: [
        {
          right: "しずかなので — な형용사는 ので 앞에 な가 필요합니다.",
          note: "な형용사는 ので와 연결할 때 な를 유지해야 합니다. しずかので는 부자연스럽습니다. 항상 しずかなので라고 쓰세요.",
        },
        {
          right: "いそがしいので、むりです — 격식체나 문어에서는 ので를 사용합니다.",
          note: "から는 단호하고 편한 느낌입니다. 비즈니스 이메일, 격식체 사과, 정중한 요청에서는 ので가 항상 더 안전한 선택입니다.",
        },
        {
          right: "がくせいなので — 문장 중간에서 명사와 な형용사에는 なので를 사용합니다.",
          note: "ですので는 격식체 문장의 접속사로 문장 시작 부분에 나올 수 있지만, 문장 내에서 명사와 な형용사는 なので를 사용합니다.",
        },
      ],
    },
    20: {
      shortExplanation: "이 일상적인 패턴들로 하고 싶은 것을 말하고, 누군가를 초대하며, 정중한 요청을 할 수 있습니다.",
      visualImage: "たい는 원하는 것으로 당신을 끌어당기는 자석입니다. ましょう는 함께 하자고 초대하는 열린 손입니다. ませんか는 문을 부드럽게 두드리는 것입니다. '~하시겠어요?' ください는 손을 내밀어 부탁하는 것입니다.",
      points: ["〜たい = ~하고 싶다. ます형의 어간(ます 앞 동사)에 붙입니다.", "たい는 い형용사처럼 활용됩니다: たくない(하고 싶지 않다), たかった(하고 싶었다).", "ましょう = '~합시다' — 활기찬 공유 제안.", "ませんか = '~하시겠어요?' — 정중하고 부드러운 초대.", "〜てください = '~해 주세요' — て형을 사용한 정중한 요청."],
      exampleEnglish: "다음에 같이 일본 음식을 먹으러 가시겠어요?",
      shortNote: "たい는 자신의 욕구에 대한 것입니다. ましょう와 ませんか는 함께 무언가를 하는 것입니다. 특히 따뜻하고 강요하지 않는 느낌을 주고 싶을 때 ませんか를 사용하세요.",
      commonMistakes: [
        {
          right: "かれはすしをたべたがっています — 제3자의 욕구에는 たがる를 사용합니다.",
          note: "たい는 주로 자신의 1인칭 욕구에 사용됩니다. 다른 사람의 욕구에는 たがる(たがっている)를 사용하세요.",
        },
        {
          right: "たべたい — たい는 사전형이 아닌 ます형 어간(たべ)에 붙입니다.",
          note: "たい는 ます형 어간에 붙습니다: たべます → たべ + たい = たべたい. 절대로 사전형에 붙이지 마세요.",
        },
        {
          right: "ましょう = 적극적인 '~합시다!'. ませんか = 부드러운 '~하시겠어요?'",
          note: "ましょう는 상대방이 동의할 것이라고 전제합니다. ませんか는 상대방에게 선택권을 남기는 열린 초대입니다.",
        },
      ],
    },
  },
  zh: {
    1: {
      shortExplanation: "平假名是日语的基础。语言中的每一个音都可以用这46个字符来书写。",
      visualImage: "把平假名想象成日语的字母表——但每个字符不是单个字母，而是一个完整的音节。一旦你掌握了全部46个，就能拼读任何用平假名写的内容。",
      points: ["5个元音：a(あ) i(い) u(う) e(え) o(お)——每个音节都以其中一个结尾。", "辅音行：每行在元音前加一个辅音。か行 = ka ki ku ke ko。", "浊音：加上゛（浊点）——か→が、さ→ざ、た→だ、は→ば。加゜表示p音：は→ぱ。", "组合音（拗音）：い行假名后加小写ゃゅょ，构成新音节。", "长音（おかあさん）和促音っ——小写っ表示短暂停顿。"],
      exampleEnglish: "我学习日语。",
      shortNote: "从5个元音开始——它们永远不变。",
      commonMistakes: [
        {
          right: "は作为助词时，始终发音为'wa'，而非'ha'。",
          note: "助词は看起来像'ha'，但作为主题标记时始终读作'wa'。",
        },
        {
          right: "きって——小写っ表示停顿，不是'tsu'的发音。",
          note: "小写っ是停顿/双辅音，不是'tsu'。",
        },
        {
          right: "ぬ = 'nu'，め = 'me'——它们看起来相似但不同。",
          note: "有几对平假名长得很像。请慢慢书写。",
        },
      ],
    },
    2: {
      shortExplanation: "片假名看起来比平假名更硬朗，但代表相同的发音。主要用于外来词。",
      visualImage: "片假名是平假名的直线孪生兄弟——相同的发音，不同的外观。它是日语中'外来词'的字体。",
      points: ["相同的46个发音，笔画更有棱角：ア(a) イ(i) ウ(u) エ(e) オ(o)。", "外来借词：大多数借用的词语都用片假名书写。", "长音符号ー用于延长前一个元音。", "特殊组合：ファ、ティ、ウィ等。", "也用于强调、科学名称和拟声词。"],
      exampleEnglish: "我点了咖啡和蛋糕。",
      shortNote: "ー只出现在片假名中。平假名用完整的元音来书写长音。",
      commonMistakes: [
        {
          right: "ソ='so'，ン='n'。シ='shi'，ツ='tsu'。",
          note: "这四个看起来相似。请并排比较。",
        },
        {
          right: "片假名中的长音始终用ー表示。",
          note: "片假名中不要把元音写两次。",
        },
        {
          right: "要适应日语发音：McDonald's → マクドナルド。",
          note: "借用词使用日语发音。",
        },
      ],
    },
    3: {
      shortExplanation: "日语句子的构造方式不同——动词始终出现在句子的最末尾。",
      visualImage: "一个日语句子就像一列火车。は是前面的站牌。动词是最后一节的引擎。",
      points: ["基本语序：主题 → 时间/地点 → 宾语 → 动词。", "动词始终在句子末尾。", "当语境清楚时，主语通常被省略。", "形容词直接放在名词前面。", "在句尾加か即可提问——不改变语序。"],
      exampleEnglish: "我昨天在图书馆读了一本书。",
      shortNote: "跳到末尾找动词——它告诉你发生了什么。",
      commonMistakes: [
        {
          right: "动词始终在末尾。",
          note: "日语中动词必须放在最后。",
        },
        {
          right: "宾语在动词之前。",
          note: "宾语放在动词前面。",
        },
        {
          right: "提问时语序不变。",
          note: "只有句尾的か才标记疑问句。",
        },
      ],
    },
    4: {
      shortExplanation: "助词は（wa）用于设定话题。它后面的内容都是对该话题的评论。",
      visualImage: "は就像一盏宽阔的聚光灯——它照到哪里，哪里就成为主角。就像在其余内容之前说'关于[X]……'。",
      points: ["は标记话题：'关于X……'", "通常一个句子只有一个は。", "は可以替换が或を，将某个词变为话题。", "は……は用于突出对比。", "一旦建立话题，后续句子中可以省略。"],
      exampleEnglish: "我每天早上喝咖啡。",
      shortNote: "は标记话题，不一定是语法上的主语。",
      commonMistakes: [
        {
          right: "新信息用が，不用は。",
          note: "は假设话题已经为人所知。",
        },
        {
          right: "感情/能力始终用が。",
          note: "すき、きらい、できる始终与が搭配。",
        },
        {
          right: "一个句子通常有一个は就够了。",
          note: "叠加多个は显得不自然。",
        },
      ],
    },
    5: {
      shortExplanation: "助词是小词，显示每个词与动词之间的关系——就像路标一样。",
      visualImage: "を=指向目标的箭头。に=地图上的大头针（目的地/时间）。で=舞台（地点/工具）。",
      points: ["を = 动作的目标——动词所作用的对象。", "に = 目的地——前往或到达的地方。", "に = 时间点——将动作固定在特定时刻。", "で = 舞台——动作发生的地点。", "で = 工具/手段——使用的事物。"],
      exampleEnglish: "我和朋友在学校吃了面包。",
      shortNote: "に = 到达的地方；で = 动作进行的地方。",
      commonMistakes: [
        {
          right: "动作发生的地点用で。",
          note: "に = 目的地；で = 动作发生的地方。",
        },
        {
          right: "目的地用に。",
          note: "でんしゃで（乘火车）+ いえに（到家）。",
        },
        {
          right: "特定时间需要に。",
          note: "きのう等相对时间词不加に。",
        },
      ],
    },
    6: {
      shortExplanation: "这五个助词表示方向、范围、陪同和追加。",
      visualImage: "へ=方向箭头。から=起点。まで=终点。と=加号。も='我也'的印章。",
      points: ["へ = 方向——比に更柔和。", "から = 起点。", "から = 原因（因为）。", "まで = 终点。", "と = 一起/和。も = 也/还。"],
      exampleEnglish: "我和朋友从车站走到了公园。",
      shortNote: "から和まで = '从X到Y'。",
      commonMistakes: [
        {
          right: "每个角色只用一个助词。",
          note: "から和に不能叠加使用。",
        },
        {
          right: "から后面必须跟结果。",
          note: "から表示'因为'，需要有结果。",
        },
        {
          right: "と和も的作用不同。",
          note: "と = 和某人一起。も = '也'。",
        },
      ],
    },
    7: {
      shortExplanation: "は和が都出现在主语的位置，但它们照亮的是不同的内容。",
      visualImage: "は = 宽阔的聚光灯（话题）。が = 激光笔（特定的、新的信息）。新信息用が。",
      points: ["は = 宽阔的聚光灯（已知话题）。", "が = 焦点（新信息或特定事物）。", "疑问词问'谁/什么' → 答案用が。", "感情/能力用が。", "句子中可以同时有は（话题）和が（主语）。"],
      exampleEnglish: "我喜欢日语。（话题：我——焦点：日语）",
      shortNote: "だれが/なにが的问题 → 答案用が。",
      commonMistakes: [
        {
          right: "回答'谁/什么'时用が。",
          note: "が直接指明答案。",
        },
        {
          right: "感情/能力用が。",
          note: "すき、できる始终用が。",
        },
        {
          right: "新信息用が。",
          note: "指出新事物时 → 用が。",
        },
      ],
    },
    8: {
      shortExplanation: "日语名词没有单复数或性别之分。加上です就能构成礼貌的陈述句。",
      visualImage: "です是套在任何名词上的礼貌包装。就像礼品包装——里面的名词不会改变。",
      points: ["名词 + です = '是'。", "过去式：です → でした。", "否定：ではありません或じゃないです。", "疑问句：加か。", "ですね = 温和的赞同。ですよ = 传达新信息。"],
      exampleEnglish: "我是一名日语学生。",
      shortNote: "です始终在最末尾。对我/你/他/她用同一形式。",
      commonMistakes: [
        {
          right: "过去的状态需要用でした。",
          note: "です = 仅限现在时。",
        },
        {
          right: "选择一种否定形式。",
          note: "不要混用ではありません和じゃないです。",
        },
        {
          right: "在礼貌场合要包含です。",
          note: "正式/书面日语中必须使用。",
        },
      ],
    },
    9: {
      shortExplanation: "日语有两种形容词，它们的变化方式完全不同。",
      visualImage: "い形容词是变形金刚（改变自身的结尾）。な形容词是便利贴（接名词时需要な）。",
      points: ["い形容词直接修饰名词。", "な形容词在名词前需要な。", "い形容词过去式：去掉い，加かった。", "い形容词否定：去掉い，加くない。", "な形容词过去式：+でした。否定：+じゃないです。"],
      exampleEnglish: "这部电影非常有趣。",
      shortNote: "い形容词绝对不用でした。✗たのしいでした→✓たのしかったです。",
      commonMistakes: [
        {
          right: "い形容词：去掉い加かった，构成过去式。",
          note: "でした只用于名词/な形容词。",
        },
        {
          right: "な形容词：过去式用でした。",
          note: "な形容词绝不用かった。",
        },
        {
          right: "な形容词：否定用じゃないです。",
          note: "くない只适用于い形容词。",
        },
      ],
    },
    10: {
      shortExplanation: "动词分为两类。所属类别决定了动词在所有变形中的变化方式。",
      visualImage: "一段动词 = 单档引擎（只需去掉る）。五段动词 = 五档变速箱（末尾发音发生变化）。",
      points: ["一段动词：去掉る得到词干。", "五段动词：词尾う段音发生变化。", "る陷阱：有些五段动词以る结尾。", "不规则动词：只有する和くる。", "类别决定所有变形。"],
      exampleEnglish: "我每天读写日语。",
      shortNote: "学习动词时立刻记下它所属的类别。",
      commonMistakes: [
        {
          right: "帰る是五段动词（帰らない、帰って）。",
          note: "る前的元音不是い/え → 很可能是五段动词。",
        },
        {
          right: "くる→きます、する→します——不规则变化。",
          note: "必须死记硬背。",
        },
        {
          right: "始终判断：一段、五段，还是不规则动词。",
          note: "类别决定每一种变形。",
        },
      ],
    },
    11: {
      shortExplanation: "ます形是礼貌模式。对老师、同事、陌生人使用的标准形式。",
      visualImage: "ます是动词的正装衬衫。同样的动作，现在变得礼貌了。",
      points: ["一段动词：去掉る，加ます。", "五段动词：变为い段，加ます。", "四种形式：ます/ました/ません/ませんでした。", "ましょう = 一起做吧！", "不规则：する→します、くる→きます。"],
      exampleEnglish: "我每天早上6点起床。",
      shortNote: "不确定时，使用ます形。",
      commonMistakes: [
        {
          right: "五段动词：变为い段再加ます。",
          note: "直接在辞书形上加ます是错误的。",
        },
        {
          right: "くる → きます。",
          note: "词干变为き。",
        },
        {
          right: "ましょう=主动提议。ましょうか=询问对方意见。",
          note: "ましょうか更为委婉。",
        },
      ],
    },
    12: {
      shortExplanation: "辞书形 = 动词的基本形。ない形 = 否定形。两者都是日常口语的必备形式。",
      visualImage: "辞书形 = 动词的休息状态。ない = '否定'的印章。五段动词变为あ段；一段动词去掉る。",
      points: ["辞书形：一段动词以る结尾，五段动词以う段结尾。", "一段动词否定：去掉る，加ない。", "五段动词否定：变为あ段，加ない。", "不规则：する→しない、くる→こない、ある→ない。", "普通形用在と思う和かもしれない之前。"],
      exampleEnglish: "我今天不去学校。",
      shortNote: "五段动词否定 → あ段。✗いきない→✓いかない。",
      commonMistakes: [
        {
          right: "五段动词否定 → あ段。",
          note: "ます形=い段；否定形=あ段。",
        },
        {
          right: "ある→ない。",
          note: "あらない并不存在。",
        },
        {
          right: "する→しない。",
          note: "词干变为し。",
        },
      ],
    },
    13: {
      shortExplanation: "过去时态标记已完成的动作。日语通过改变词尾来表示——没有单独的'did'或'was'。",
      visualImage: "过去时 = 盖上'完成'的印章。动词：ました/た。い形容词：把い换成かった。名词/な形容词：+でした。",
      points: ["礼貌过去式：ます→ました。", "普通过去式：用て形，然后て→た、で→だ。", "い形容词过去式：去掉い，加かった。", "な形容词/名词过去式：+でした。", "最常见的错误：い形容词与でした连用。"],
      exampleEnglish: "昨天我和朋友一起看了一部电影。",
      shortNote: "い形容词有自己的过去式（かった），绝不与でした连用。",
      commonMistakes: [
        {
          right: "い形容词用かった。",
          note: "でした只用于名词/な形容词。",
        },
        {
          right: "な形容词：用でした。",
          note: "绝不用かった。",
        },
        {
          right: "いきませんでした——是一个整体。",
          note: "不要从ません+だった来构建。",
        },
      ],
    },
    14: {
      shortExplanation: "て形是最重要的动词形式之一。用于连接动作、提出请求。",
      visualImage: "て形 = 万能钥匙。一段动词：把る换成て。五段动词：按规律进行音变。",
      points: ["一段动词：去掉る，加て。", "五段动词く/ぐ → いて/いで。", "五段动词す → して。", "五段动词ぬ/ぶ/む → んで。", "五段动词る/う/つ→って。例外：行く→行って。"],
      exampleEnglish: "请在吃饭前洗手。",
      shortNote: "行く是例外：行って，不是行いて。",
      commonMistakes: [
        {
          right: "行く→行って（例外）。",
          note: "其他く→いて，但行く→行って。",
        },
        {
          right: "ぬ/ぶ/む→んで（浊音）。",
          note: "用んで，不用んて。",
        },
        {
          right: "する→して。",
          note: "不规则て形。",
        },
      ],
    },
    15: {
      shortExplanation: "て形的用途非常广泛：请求、许可、动作的先后顺序。",
      visualImage: "て形 = 超级胶水。将动作与动作之间，以及动作与助词之间粘合在一起。",
      points: ["てください = 请做～。", "てもいいですか = 我可以做～吗？", "てはいけない = 不可以做～。", "てから = 做完～之后。", "A てB てC = 按顺序进行的动作。"],
      exampleEnglish: "做完作业之后，你可以玩游戏。",
      shortNote: "てから = 完全完成X之后。与单独的て含义不同。",
      commonMistakes: [
        {
          right: "请求许可时用てもいいですか。",
          note: "てください=指令；てもいいですか=请求许可。",
        },
        {
          right: "强调完成时用てから。",
          note: "てから强调先完全完成前一个动作。",
        },
        {
          right: "礼貌形式是てはいけません。",
          note: "不用てはいけないです。",
        },
      ],
    },
    16: {
      shortExplanation: "ている = 正在进行的动作或持续的状态。てある = 由某人事先准备好的。",
      visualImage: "ている = 正在播放的电影，或结果的定格画面。てある = 某人已经布置好的舞台。",
      points: ["ている：现在正在做某事。", "ている：过去动作的结果依然存在。", "てある：某人出于某种目的准备好了。", "ている侧重于动作者；てある侧重于情况。", "常见的ている状态：結婚している、知っている、住んでいる。"],
      exampleEnglish: "桌上已经放好了茶。",
      shortNote: "ている = 谁/什么在发生。てある = 什么已经被准备好。",
      commonMistakes: [
        {
          right: "てある用于有意的准备行为。",
          note: "当某人事先有意准备时，使用てある。",
        },
        {
          right: "知る用ている（知っています）。",
          note: "知る、住む在表示现在状态时用ている。",
        },
        {
          right: "静态状态可能直接用形容词更合适。",
          note: "如果不是动作造成的，使用形容词。",
        },
      ],
    },
    17: {
      shortExplanation: "三个助动词，各有不同的态度：尝试、准备、完成（可能带有遗憾）。",
      visualImage: "てみる = 试探水温。ておく = 下雨前放在门边的雨伞。てしまう = 已经空了的饼干罐。",
      points: ["てみる = 试试看会怎样。", "ておく = 提前做好准备。", "てしまう = 彻底完成（有时带有遗憾）。", "てしまう也表示无意中发生的事。", "口语：てしまう→ちゃう/じゃう。"],
      exampleEnglish: "我提前把行李打包好了。",
      shortNote: "てみる=尝试。ておく=准备。てしまう=完成。",
      commonMistakes: [
        {
          right: "习惯性动作用ている，不用てみる。",
          note: "てみる暗含不确定性。",
        },
        {
          right: "ておく=将要准备。てある=已经准备好。",
          note: "时间线不同。",
        },
        {
          right: "正式写作中使用完整形式てしまう。",
          note: "ちゃう/じゃう是口语缩略形式。",
        },
      ],
    },
    18: {
      shortExplanation: "てくる = 朝向说话者。ていく = 远离说话者。两者都可用于移动和变化。",
      visualImage: "てくる = 从地平线向这里靠近。ていく = 向远处移动。既有具体含义，也有抽象含义。",
      points: ["てくる = 朝向说话者/当前时刻。", "ていく = 远离/走向未来。", "てくる具体用法：去做某事然后回来。", "ていく具体用法：去了之后继续留在那里。", "抽象用法：増えてきた = 到目前为止的变化。増えていく = 未来的走向。"],
      exampleEnglish: "我的日语水平一直在逐渐提高。",
      shortNote: "てくる='到目前为止'。ていく='从现在起'。",
      commonMistakes: [
        {
          right: "到达现在的变化用てくる。",
          note: "てくる=回望过去；ていく=展望未来。",
        },
        {
          right: "してきます = 去做然后回来。",
          note: "していきます = 去了之后继续留在那里。",
        },
        {
          right: "抽象用法很自然：わかってきた。",
          note: "与表示变化的动词搭配使用。",
        },
      ],
    },
    19: {
      shortExplanation: "两者都表示'因为'。から = 直接/肯定的语气。ので = 更柔和/更礼貌。",
      visualImage: "から = 坚固直接的桥梁。ので = 吊桥，同样的连接但更为柔和。",
      points: ["から = 直接说明原因，口语化。", "ので = 礼貌地说明原因，用于正式写作。", "两者都接在动词/い形容词的普通形后面。", "な形容词/名词：使用なので。", "口语中から可以单独使用。"],
      exampleEnglish: "因为明天有考试，我要早点睡觉。",
      shortNote: "在正式场合，ので是更安全的选择。",
      commonMistakes: [
        {
          right: "な形容词在ので前需要加な。",
          note: "しずかので不自然；应使用しずかなので。",
        },
        {
          right: "正式场合用ので。",
          note: "から听起来语气肯定/口语化。",
        },
        {
          right: "名词：用なので（不用ですので接在句中）。",
          note: "がくせいなので，不用がくせいですので。",
        },
      ],
    },
    20: {
      shortExplanation: "表达愿望、邀请他人、提出礼貌请求。",
      visualImage: "たい = 朝向愿望的磁铁。ましょう = 张开的双手表示邀请。ませんか = 轻轻敲门。",
      points: ["たい = 想要做～。接在ます形词干后。", "たい像い形容词一样变形：たくない、たかった。", "ましょう = 一起做吧！（共同参与）", "ませんか = 您想要～吗？（委婉）", "てください = 请做～。"],
      exampleEnglish: "你想一起去吃日本料理吗？",
      shortNote: "たい = 自己的愿望。ましょう/ませんか = 一起做某事。",
      commonMistakes: [
        {
          right: "第三者的愿望用たがる。",
          note: "たい只表示第一人称的愿望。",
        },
        {
          right: "たい接在ます形词干后。",
          note: "不接在辞书形后。",
        },
        {
          right: "ましょう=主动提议。ませんか=委婉邀请。",
          note: "ませんか将选择权留给对方。",
        },
      ],
    },
  },
};

export function getLessonInLocale(lesson: MiniLesson, locale: Locale): MiniLesson {
  if (locale === "en") return lesson;
  const override = LESSON_I18N[locale]?.[lesson.id];
  if (!override) return lesson;
  return {
    ...lesson,
    shortExplanation: override.shortExplanation,
    visualImage: override.visualImage,
    exampleEnglish: override.exampleEnglish,
    shortNote: override.shortNote,
    points: lesson.points.map((pt, i) => ({
      ...pt,
      text: override.points[i] ?? pt.text,
    })),
    commonMistakes: lesson.commonMistakes?.map((m, i) => ({
      wrong: m.wrong,
      right: override.commonMistakes?.[i]?.right ?? m.right,
      note: override.commonMistakes?.[i]?.note ?? m.note,
    })),
  };
}
