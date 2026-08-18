-- ============================================================
--  ふりがな読みのドリフト監視（読み取り専用・いつ流しても安全）
--
--  2026-08-18 の調査で作った検出クエリ。AI が生成した <rt> と
--  reading 欄から、日本語として成立しない読みを拾う。
--  READING_DICTIONARY（src/lib/furigana.ts）に語を足しても、
--  既存行は書き換わらない。増えていないかをここで見る。
--
--  発端: 単語カードの「編集」が へんしゅく と描かれたという報告。
--  実測では へんしゅく は DB に0件、代わりに へんしゅ（長音の脱落）が
--  1件あった。壊れ方は長音の脱落／長音の く 化／別漢字の取り違えの
--  三つで、①②が前者二つ、③が三つ目にあたる。
--
--  実行: Supabase Dashboard → SQL Editor。UPDATE は一切しない。
-- ============================================================


-- ------------------------------------------------------------
-- ① 存在しない音節「ゅく」
--    小書きゅ＋く は し／じ の後にしか現れない（しゅく・じゅく）。
--    それ以外は必ず誤り。「ぼしゅくしている」型を拾う。
--    さらに、しゅく／じゅく であっても語に 宿祝縮粛淑叔塾熟 が
--    含まれないなら、長音「しゅう」が「しゅく」に化けた疑い。
-- ------------------------------------------------------------
select id, diary_date,
       substring(t from '.{0,30}<rt>[^<]*ゅく</rt>.{0,30}') as context
  from (
    select d.id, d.diary_date,
           coalesce(d.corrected_japanese,'') || coalesce(d.natural_japanese,'')
        || coalesce(d.original_text_ruby,'') || coalesce(d.practice_sentence,'')
        || coalesce(d.useful_vocabulary::text,'') || coalesce(d.key_mistakes::text,'')
        || coalesce(d.alternative_words::text,'') as t
      from public.diary_entries d
  ) s
 where t ~ '<rt>[^<]*ゅく</rt>'
   and t !~ '<ruby>[^<]*[宿祝縮粛淑叔塾熟][^<]*<rt>[^<]*ゅく</rt>'
 order by diary_date desc;


-- ------------------------------------------------------------
-- ② 長音「う」の脱落
--    読みが小書きかな（ゃゅょ）で終わること自体は正しい
--    （一緒=いっしょ、彼女=かのじょ、場所=ばしょ）。
--    誤りなのは、本来そこに長音「う」が続く語のとき。
--    自動判定はできないので、候補を出して目で見る前提。
--    2026-08-18 時点の真の誤りは 編集/へんしゅ、牛/ぎゅ、休/きゅ、
--    少/ちょ の4種。それ以外の120種近くは全て正しい読み。
-- ------------------------------------------------------------
select reading, count(*) as occurrences, min(diary_date) as first_seen
  from (
    select d.diary_date,
           (regexp_matches(
              coalesce(d.corrected_japanese,'') || coalesce(d.natural_japanese,'')
           || coalesce(d.original_text_ruby,'') || coalesce(d.practice_sentence,''),
              '<ruby>([^<]*)<rt>([^<]*[ゃゅょ])</rt></ruby>', 'g'))[1] || '|' ||
           (regexp_matches(
              coalesce(d.corrected_japanese,'') || coalesce(d.natural_japanese,'')
           || coalesce(d.original_text_ruby,'') || coalesce(d.practice_sentence,''),
              '<ruby>([^<]*)<rt>([^<]*[ゃゅょ])</rt></ruby>', 'g'))[2] as reading
      from public.diary_entries d
  ) s
 group by reading
 order by occurrences desc;


-- ------------------------------------------------------------
-- ③ 読みが「っ」で終わる
--    促音は語末に立てないので、単独の <rt> としては必ず誤り。
--    ただし 一緒 を 一(いっ)＋緒(しょ) と分割した結果であることが多く、
--    描画上は破綻しないので優先度は低い。2026-08-18 時点で12種。
-- ------------------------------------------------------------
select id, diary_date,
       substring(t from '.{0,25}<rt>[^<]*っ</rt>.{0,25}') as context
  from (
    select d.id, d.diary_date,
           coalesce(d.corrected_japanese,'') || coalesce(d.natural_japanese,'')
        || coalesce(d.original_text_ruby,'') || coalesce(d.practice_sentence,'') as t
      from public.diary_entries d
  ) s
 where t ~ '<rt>[^<]*っ</rt>'
 order by diary_date desc;


-- ------------------------------------------------------------
-- ④ reading 欄（<ruby> ではない側）
--    単語カードが表示するのはこちら。READING_DICTIONARY は
--    <ruby> マークアップにしか効かないので、ここは辞書を足しても
--    直らない。sanitizeReading() の構造チェックだけが通っている。
-- ------------------------------------------------------------
select v ->> 'word' as word, v ->> 'reading' as reading, count(*) as occurrences
  from public.diary_entries d,
       lateral jsonb_array_elements(coalesce(d.useful_vocabulary, '[]'::jsonb)) v
 where v ->> 'reading' ~ 'ゅく'
    or v ->> 'reading' ~ '[ゃゅょ]$'
 group by 1, 2
 order by occurrences desc;
