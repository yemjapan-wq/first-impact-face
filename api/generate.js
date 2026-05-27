export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { neutralB64, smileB64, neutralB64_2, smileB64_2, round } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    let parts = [];

    if (round === 1) {
      parts = [
        {
          text: `あなたは表情心理学・非言語コミュニケーションの専門家です。2枚の写真を分析してください。【1枚目】真顔（力を抜いた自然な表情）【2枚目】笑顔（意識した笑顔）\n\n以下のJSON形式のみで返してください：\n{"neutral_impression":"真顔が相手にどう見えているかを客観的に150文字で","smile_impression":"笑顔の印象を150文字で。安心感・親しみやすさを具体的に","gap":"真顔と笑顔のギャップ分析150文字","improve1":"改善ポイント①。口角・目・眉間など部位レベルで超具体的に","improve2":"改善ポイント②","improve3":"改善ポイント③","score_neutral":65,"score_smile":78,"overall":"総合コメント50文字以内"}`
        },
        { inline_data: { mime_type: 'image/jpeg', data: neutralB64 } },
        { inline_data: { mime_type: 'image/jpeg', data: smileB64 } }
      ];
    } else {
      parts = [
        {
          text: `あなたは表情心理学・非言語コミュニケーションの専門家です。4枚の写真を分析してください。【1枚目】1回目の真顔【2枚目】1回目の笑顔【3枚目】アドバイス後の真顔【4枚目】アドバイス後の笑顔\n\n以下のJSON形式のみで返してください：\n{"neutral_impression":"2回目真顔の印象150文字","smile_impression":"2回目笑顔の印象150文字","gap":"2回目ギャップ分析150文字","improve1":"まだ伸ばせるポイント①超具体的","improve2":"まだ伸ばせるポイント②","improve3":"まだ伸ばせるポイント③","score_neutral":70,"score_smile":85,"overall":"総合コメント50文字以内","change":"1回目から変化した点を150文字で。具体的に称える"}`
        },
        { inline_data: { mime_type: 'image/jpeg', data: neutralB64 } },
        { inline_data: { mime_type: 'image/jpeg', data: smileB64 } },
        { inline_data: { mime_type: 'image/jpeg', data: neutralB64_2 } },
        { inline_data: { mime_type: 'image/jpeg', data: smileB64_2 } }
      ];
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API error: ' + response.status);
    const data = await response.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    let result;
    try { result = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); if (m) result = JSON.parse(m[0]); else throw new Error('No JSON'); }

    if (typeof result.score_neutral !== 'number') result.score_neutral = 60;
    if (typeof result.score_smile !== 'number') result.score_smile = 70;

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
