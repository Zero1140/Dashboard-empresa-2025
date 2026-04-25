const chat = document.getElementById('chat');
const questionEl = document.getElementById('question');
const sendBtn = document.getElementById('send-btn');
const statusBar = document.getElementById('status-bar');

async function fetchStatus() {
  try {
    const r = await fetch('/status');
    const d = await r.json();
    statusBar.textContent = `${d.total_chunks} fragmentos indexados${d.last_ingestion ? ' · última actualização: ' + new Date(d.last_ingestion).toLocaleDateString() : ''}`;
  } catch {}
}

function appendMessage(role, text, sources = []) {
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  msg.appendChild(bubble);

  if (sources.length > 0) {
    const sourcesEl = document.createElement('div');
    sourcesEl.className = 'sources';
    sources.forEach(s => {
      const chip = document.createElement('a');
      chip.className = 'source-chip';
      chip.href = s.url;
      chip.target = '_blank';
      chip.textContent = `${s.lei} · ${s.artigo}`;
      chip.title = s.titulo || '';
      sourcesEl.appendChild(chip);
    });
    msg.appendChild(sourcesEl);
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  return msg;
}

function appendThinking() {
  const msg = document.createElement('div');
  msg.className = 'msg assistant';
  const bubble = document.createElement('div');
  bubble.className = 'bubble thinking';
  bubble.textContent = 'A consultar legislação...';
  msg.appendChild(bubble);
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  return msg;
}

async function sendQuestion() {
  const question = questionEl.value.trim();
  if (!question) return;

  questionEl.value = '';
  sendBtn.disabled = true;
  appendMessage('user', question);
  const thinking = appendThinking();

  try {
    const response = await fetch('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    thinking.remove();
    appendMessage('assistant', data.answer, data.sources || []);
  } catch (e) {
    thinking.remove();
    appendMessage('assistant', 'Erro ao contactar o servidor. Verifique se a aplicação está a correr.');
  } finally {
    sendBtn.disabled = false;
    questionEl.focus();
  }
}

sendBtn.addEventListener('click', sendQuestion);
questionEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
});

fetchStatus();
