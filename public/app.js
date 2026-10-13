const form = document.querySelector('#chat-form');
const input = document.querySelector('#input');
const messagesEl = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const statusEl = document.querySelector('#status');
const send = document.querySelector('#send');
const reset = document.querySelector('#reset');
let messages = [];
let busy = false;

function resize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  document.querySelector('#counter').textContent = `${input.value.length.toLocaleString()} / 4,000`;
}
function addMessage(role, text, pending = false) {
  welcome.hidden = true;
  const row = document.createElement('div');
  row.className = `message ${role}${pending ? ' pending' : ''}`;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '나' : '✦';
  avatar.setAttribute('aria-label', role === 'user' ? '사용자' : 'AI');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.append(avatar, bubble);
  messagesEl.append(row);
  row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return row;
}
function setBusy(value) {
  busy = value;
  send.disabled = value;
  reset.disabled = value;
  input.disabled = value;
  messagesEl.setAttribute('aria-busy', String(value));
  document.querySelectorAll('.suggestions button').forEach(button => { button.disabled = value; });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const content = input.value.trim();
  if (busy || !content) return;
  statusEl.textContent = '';
  // Keep complete user/assistant pairs and the current question (maximum 41 messages).
  const history = [...messages.slice(-40), { role: 'user', content }];
  const userRow = addMessage('user', content);
  input.value = '';
  resize();
  setBusy(true);
  const pending = addMessage('assistant', '생각하고 있어요…', true);
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }), signal: AbortSignal.timeout(55000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '요청에 실패했습니다.');
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('답변이 비어 있습니다. 다시 시도해 주세요.');
    pending.remove();
    addMessage('assistant', data.reply);
    messages = [...history, { role: 'assistant', content: data.reply }];
  } catch (error) {
    pending.remove();
    userRow.remove();
    input.value = content;
    resize();
    welcome.hidden = messages.length > 0;
    statusEl.textContent = error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 전송해 주세요.'
      : error instanceof TypeError ? '서버에 연결할 수 없습니다. 연결 상태를 확인해 주세요.' : error.message;
  } finally {
    setBusy(false);
    input.focus();
  }
});
input.addEventListener('input', resize);
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});
reset.addEventListener('click', () => {
  if (busy) return;
  messages = [];
  messagesEl.querySelectorAll('.message').forEach(row => row.remove());
  welcome.hidden = false;
  statusEl.textContent = '';
  input.value = '';
  resize();
  input.focus();
});
document.querySelectorAll('.suggestions button').forEach(button => button.addEventListener('click', () => {
  if (busy) return;
  input.value = button.textContent;
  resize();
  form.requestSubmit();
}));
