// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body;
  const userMessage = messages[messages.length - 1].content;

  // Форматируем запрос для Phi-3
  const prompt = `<|user|>${userMessage}<|end|><|assistant|>`;

  try {
    const hfResponse = await fetch(
      'https://router.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HF_API_TOKEN}`
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    const data = await hfResponse.json();
    console.log('HF Response:', data); // 👈 Логгирование ответа

    // Если модель "спит", Hugging Face возвращает error с estimated_time
    if (data.error && data.estimated_time) {
      return res.status(202).json({
        error: 'Модель запускается, подождите 20–30 секунд и повторите.'
      });
    }

    if (data.error) {
      console.error('HF Error:', data);
      return res.status(500).json({ error: 'Ошибка ИИ', details: data.error });
    }

    const rawAnswer = data[0]?.generated_text || '';
    const cleanAnswer = rawAnswer
      .split('<|end|>')[0]
      .replace(/<\|user\|>.*<\|end\|>/g, '')
      .replace(/<\|assistant\|>/g, '')
      .trim();

    res.json({
      choices: [{ message: { content: cleanAnswer || 'Не удалось сформулировать ответ.' } }]
    });

  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).json({
      error: 'Ошибка сервера',
      details: e.message || e.toString()
    });
  }
}
