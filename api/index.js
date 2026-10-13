import express from 'express';
import 'dotenv/config';

export function createApp({ fetchImpl = fetch, getApiKey = () => process.env.OPENAI_API_KEY } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '128kb' }));
  app.post('/api/chat', async (req, res) => {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > 41 ||
      messages.some((m, i) => !m || m.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
        typeof m.content !== 'string' || !m.content.trim() || m.content.length > (m.role === 'user' ? 4000 : 16000)) ||
      messages.at(-1).role !== 'user') {
      return res.status(400).json({ error: '대화 형식이 올바르지 않습니다. 메시지는 최대 4,000자, 대화는 최대 20회까지 가능합니다.' });
    }
    const apiKey = getApiKey();
    if (!apiKey) return res.status(503).json({ error: '서버에 OPENAI_API_KEY 환경변수를 설정해 주세요.' });
    try {
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ model: 'gpt-4o-mini', store: false, max_completion_tokens: 1000,
          messages: [{ role: 'system', content: '당신은 친절하고 정확한 AI 도우미입니다. 이전 대화의 맥락을 참고하여 답하세요. 사용자의 언어에 맞춰 답하고, 모르는 사실은 솔직히 말하세요.' },
            ...messages.map(({ role, content }) => ({ role, content }))] })
      });
      if (!response.ok) {
        const status = response.status === 429 ? 429 : 502;
        return res.status(status).json({ error: response.status === 429
          ? 'API 사용 한도 또는 요청 제한에 도달했습니다. 사용량을 확인하거나 잠시 후 다시 시도해 주세요.'
          : 'AI 서비스 연결에 실패했습니다. 서버의 API 키와 모델 접근 권한을 확인해 주세요.' });
      }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty response');
      return res.json({ reply });
    } catch (error) {
      return res.status(502).json({ error: error.name === 'TimeoutError'
        ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.' : '답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });
  app.all('/api/chat', (_req, res) => res.status(405).set('Allow', 'POST').json({ error: 'POST 요청만 지원합니다.' }));
  app.use('/api', (_req, res) => res.status(404).json({ error: '존재하지 않는 API입니다.' }));
  app.use((error, _req, res, _next) => res.status(error.type === 'entity.too.large' ? 413 : 400).json({
    error: error.type === 'entity.too.large' ? '요청 크기가 너무 큽니다. 새 대화를 시작해 주세요.' : '올바른 JSON 요청을 보내 주세요.'
  }));
  return app;
}

export default createApp();
