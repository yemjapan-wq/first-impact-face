export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { neutralB64, smileB64, gender, round, goal } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const NINSO = `【人相学の知識】
眉：一文字眉→真面目で実直な強い意志、三日月眉→周囲から愛される、八の字眉→明るく親しみやすい金回り良い、への字眉→大胆で情熱的、濃い眉→身内縁が厚い、眉間広い→早く運が開け交際範囲広い、眉間狭い→開運遅い
目：大きい目→勘が良く機敏だが神経質、小さい目→意志強く粘り強い堅実、下がり目→親切で優しいお人好し、吊り上がり目（誠意あり）→強い信念と実行力、窪んだ目→消極的だが粘り強い
鼻：鼻筋通っている→清廉で洗練された印象・仕事運安定、鼻翼発達→人情豊かで金運・人間関係に恵まれる、低く小さい鼻→意志薄弱・精神未熟、段鼻→闘争的
口：仰月口（口角上がり）→幸運に恵まれ周囲から愛される、覆舟口（口角下がり）→頑固で孤独、大きい口→度胸と行動力、厚い唇→愛情豊か`;

    const GEM_KEYS = 'diamond/ruby/sapphire/emerald/amethyst/pearl/pink_sapphire/aquamarine/opal/moonstone/topaz/tanzanite/garnet/turquoise/citrine/rose_quartz/lapis/coral/jade/spinel/rutile';

    let parts = [];

    if (round === 'scan') {
      parts = [
        {
          text: `あなたは表情心理学・人相学・非言語コミュニケーションの専門家です。
性別は${gender}です。
1枚目が真顔、2枚目が笑顔の写真です。

${NINSO}

【印象タイプ21種のキー】
${GEM_KEYS}

顔全体（眉・目・鼻・口）を人相学と表情学の観点で分析し、最も近い印象タイプのキーを選んでください。

必ず以下のJSON形式のみで返してください：
{"gem_key":"21種のキーのどれか1つ","current":"今の印象を40文字以内で。強みを肯定的に","shadow":"でも〜に見えることも（20文字以内）","potential":"〇〇すると〜な印象になれる（30文字以内）","eye":"良好 or いい感じ or もう少し","brow":"良好 or いい感じ or もう少し","mouth":"良好 or いい感じ or もう少し"}`
        },
        { inline_data: { mime_type: 'image/jpeg', data: neutralB64 } },
        { inline_data: { mime_type: 'image/jpeg', data: smileB64 } }
      ];
    } else {
      parts = [
        {
          text: `あなたは表情心理学・人相学・非言語コミュニケーションの専門家です。
性別は${gender}です。目指したい印象は「${goal}」です。
1枚目が真顔、2枚目が笑顔です。

${NINSO}

「${goal}」に近づくための具体的な表情改善アドバイスを3つ教えてください。

【条件】
・口角・目元・眉間など部位レベルで超具体的に
・今すぐできる実践的な内容
・${gender}として「${goal}」に見せるための視点
・ポジティブで希望のある言葉

必ず以下のJSON形式のみで返してください：
{"goal_message":"${goal}に近づくあなたへ一言（25文字以内）","point1":"アドバイス①（60文字以内）","point2":"アドバイス②（60文字以内）","point3":"アドバイス③（60文字以内）"}`
        },
        { inline_data: { mime_type: 'image/jpeg', data: neutralB64 } },
        { inline_data: { mime_type: 'image/jpeg', data: smileB64 } }
      ];
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) throw new Error('Gemini error: ' + response.status);
    const data = await response.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    let result;
    try { result = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); if (m) result = JSON.parse(m[0]); else throw new Error('No JSON'); }

    const validKeys = ['diamond','ruby','sapphire','emerald','amethyst','pearl','pink_sapphire',
      'aquamarine','opal','moonstone','topaz','tanzanite','garnet','turquoise',
      'citrine','rose_quartz','lapis','coral','jade','spinel','rutile'];
    if (round === 'scan' && !validKeys.includes(result.gem_key)) result.gem_key = 'pearl';

    const validEval = ['良好','いい感じ','もう少し'];
    ['eye','brow','mouth'].forEach(k => {
      if (!validEval.includes(result[k])) result[k] = 'いい感じ';
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
