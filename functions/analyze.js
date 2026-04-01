exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }) };
  }
  let songs;
  try {
    const body = JSON.parse(event.body);
    songs = body.songs;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!songs || typeof songs !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing songs data' }) };
  }
  const GENRES = ['Pop','Rock','Hip-Hop','R&B','Electronic','Jazz','Classical','Country','Latin','Metal','Folk','Indie','Soul','Blues','Reggae','Punk','Alternative','Dance','K-Pop','Other'];
  const prompt = 'You are a music genre classifier. For each song, determine the most fitting genre from ONLY this list: ' + GENRES.join(', ') + '.\n\nRespond with ONLY a valid JSON array, no other text. Format: [{"id":1,"genre":"Pop"},{"id":2,"genre":"Rock"}]\n\nHere are the songs:\n' + songs;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return { statusCode: response.status, body: JSON.stringify({ error: 'Claude API error: ' + response.status }) };
    }
    const data = await response.json();
    const textContent = data.content.find(c => c.type === 'text');
    if (!textContent) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No text response from Claude' }) };
    }
    let jsonStr = textContent.text.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    const results = JSON.parse(jsonStr);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(results) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal server error' }) };
  }
};
