import './style.css';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const backendConfigured = Boolean(supabaseUrl && supabaseKey &&
  !supabaseUrl.includes('SEU-PROJETO') && !supabaseKey.includes('SUA_CHAVE'));
const supabase = backendConfigured ? createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

const state = { session: null, profile: null, channel: 'geral', messages: [], channels: [], friends: [], tab: 'chat', busy: false };
const $ = (sel) => document.querySelector(sel);
const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = (s = '?') => [...s.trim()].slice(0, 1).join('').toUpperCase() || '?';
const status = (msg, error = false) => { const el = $('#status'); if (el) { el.textContent = msg; el.className = error ? 'status error' : 'status'; el.hidden = !msg; } };

function renderShell() {
  $('#app').innerHTML = `
    <div class="layout">
      <aside class="rail" aria-label="Navegação principal">
        <a class="mark" href="#" aria-label="MobDisc início">m<span>.</span></a>
        <button class="rail-btn selected" data-tab="chat" aria-label="Chat" title="Chat">#</button>
        <button class="rail-btn" data-tab="friends" aria-label="Amigos" title="Amigos">♧</button>
      </aside>
      <aside class="sidebar" id="sidebar">
        <div class="brand">mob<span>disc</span><small>leve por natureza</small></div>
        <div class="side-heading">CANAIS</div>
        <div id="channel-list"><button class="channel active" data-channel="geral"># geral</button><button class="channel" data-channel="memes"># memes</button><button class="channel" data-channel="games"># games</button></div>
        <form id="channel-form" class="inline-form"><input id="new-channel" maxlength="24" placeholder="Novo canal" aria-label="Nome do novo canal"><button aria-label="Criar canal">+</button></form>
        <div class="side-heading friends-heading">AMIGOS</div>
        <form id="friend-form" class="inline-form"><input id="friend-name" maxlength="32" placeholder="Nome de usuário" aria-label="Nome do amigo"><button aria-label="Adicionar amigo">+</button></form>
        <div id="friend-list" class="friend-list"></div>
        <div class="account-card"><div class="avatar" id="my-avatar">?</div><div class="account-copy"><strong id="my-name">Visitante</strong><small id="my-state">Modo demonstração</small></div><button id="account-btn" class="quiet-btn">Entrar</button></div>
      </aside>
      <main class="main">
        <header class="topbar"><button id="menu-btn" class="menu-btn" aria-label="Abrir menu">☰</button><div><div class="channel-title"># <span id="current-channel">geral</span></div><div class="channel-subtitle">Conversa simples, sem peso extra.</div></div><span class="online-pill"><i></i><span id="online-label">modo local</span></span></header>
        <section id="chat-view" class="chat-view">
          <div class="intro"><div class="intro-icon">✳</div><div><h1>Bem-vindo ao MobDisc</h1><p>Uma comunidade mais leve, até nos celulares modestos.</p></div></div>
          <div id="messages" class="messages" aria-live="polite"></div>
        </section>
        <section id="friends-view" class="friends-view" hidden><h1>Seus amigos</h1><p>Adicione pessoas pelo nome de usuário. No modo demonstração, a lista fica só neste aparelho.</p><div id="friends-large"></div></section>
        <div class="composer-wrap" id="composer-wrap"><form id="message-form" class="composer"><button type="button" id="emoji-btn" class="emoji-btn" aria-label="Inserir emoji">☺</button><input id="message-input" maxlength="1000" autocomplete="off" placeholder="Mensagem em #geral…" aria-label="Mensagem"><button class="send-btn" type="submit">Enviar <span>↗</span></button></form><p class="composer-note" id="composer-note">Modo demonstração: mensagens ficam neste navegador.</p></div>
        <div id="status" class="status" role="status" hidden></div>
      </main>
    </div>
    <dialog id="auth-dialog" class="dialog"><form id="auth-form" method="dialog"><button type="button" class="close-dialog" id="close-dialog" aria-label="Fechar">×</button><div class="brand dialog-brand">mob<span>disc</span></div><h2 id="auth-title">Sua conta MobDisc</h2><p id="auth-description">Entre ou crie uma conta para sincronizar suas conversas.</p><label>Nome de usuário<input id="auth-username" maxlength="24" autocomplete="username" placeholder="ex.: jogador123" required></label><label id="email-label">E-mail<input id="auth-email" type="email" autocomplete="email" placeholder="voce@exemplo.com" required></label><label>Senha<input id="auth-password" type="password" minlength="8" autocomplete="current-password" placeholder="Mínimo de 8 caracteres" required></label><button class="send-btn full" id="auth-submit" type="submit">Entrar</button><button type="button" id="auth-toggle" class="text-btn">Ainda não tem conta? Criar conta</button><p class="dialog-foot">Use uma senha exclusiva. A configuração do backend é necessária para contas reais.</p></form></dialog>
  `;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  $('#menu-btn').addEventListener('click', () => $('#sidebar').classList.toggle('sidebar-open'));
  $('#message-form').addEventListener('submit', sendMessage);
  $('#channel-form').addEventListener('submit', createChannel);
  $('#friend-form').addEventListener('submit', addFriend);
  $('#account-btn').addEventListener('click', () => state.session ? signOut() : openAuth());
  $('#auth-form').addEventListener('submit', authSubmit);
  $('#close-dialog').addEventListener('click', () => $('#auth-dialog').close());
  $('#auth-toggle').addEventListener('click', toggleAuthMode);
  $('#emoji-btn').addEventListener('click', () => { const input = $('#message-input'); input.value += ' 🙂'; input.focus(); });
  $('#channel-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-channel]');
    if (btn) selectChannel(btn.dataset.channel);
  });
}

function switchTab(tab) {
  state.tab = tab;
  $('#chat-view').hidden = tab !== 'chat';
  $('#friends-view').hidden = tab !== 'friends';
  $('#composer-wrap').hidden = tab !== 'chat';
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('selected', b.dataset.tab === tab));
  if (tab === 'friends') renderFriends();
  $('#sidebar').classList.remove('sidebar-open');
}
function renderChannels() {
  $('#channel-list').innerHTML = state.channels.map(c => `<button class="channel ${c.name === state.channel ? 'active' : ''}" data-channel="${escapeHtml(c.name)}"># ${escapeHtml(c.name)}</button>`).join('');
}
async function selectChannel(name) {
  state.channel = name;
  $('#current-channel').textContent = name;
  $('#message-input').placeholder = `Mensagem em #${name}…`;
  $('#sidebar').classList.remove('sidebar-open');
  renderChannels();
  await loadMessages();
}
async function createChannel(e) {
  e.preventDefault();
  const input = $('#new-channel');
  const name = input.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0,24);
  if (!name) return;
  if (state.channels.some(c => c.name === name)) return status('Esse canal já existe.', true);
  if (supabase && state.session) {
    const { error } = await supabase.from('channels').insert({ name, created_by: state.session.user.id });
    if (error) return status('Não foi possível criar o canal: ' + error.message, true);
    await loadChannels();
  } else {
    state.channels.push({ name }); renderChannels();
  }
  input.value = ''; await selectChannel(name); status(`Canal #${name} criado.`);
}
async function addFriend(e) {
  e.preventDefault();
  const input = $('#friend-name'), username = input.value.trim().replace(/^@/, '');
  if (!username) return;
  if (state.friends.some(f => f.username.toLowerCase() === username.toLowerCase())) return status('Esse amigo já está na lista.', true);
  if (supabase && state.session) {
    const { data: profile, error: lookupError } = await supabase.from('profiles').select('id,username').ilike('username', username).maybeSingle();
    if (lookupError || !profile) return status('Usuário não encontrado. Confira o nome.', true);
    if (profile.id === state.session.user.id) return status('Você não pode adicionar a si mesmo.', true);
    const { error } = await supabase.from('friendships').insert({ user_id: state.session.user.id, friend_id: profile.id });
    if (error) return status('Não foi possível adicionar: ' + error.message, true);
    state.friends.push({ username: profile.username, id: profile.id });
  } else {
    state.friends.push({ username });
  }
  input.value = ''; renderFriendList(); renderFriends(); status(`@${username} adicionado à lista.`);
}
function renderFriendList() {
  $('#friend-list').innerHTML = state.friends.map(f => `<div class="friend-row"><span class="mini-avatar">${escapeHtml(initials(f.username))}</span><span>${escapeHtml(f.username)}</span></div>`).join('');
}
function renderFriends() {
  $('#friends-large').innerHTML = state.friends.length ? state.friends.map(f => `<div class="friend-card"><span class="avatar">${escapeHtml(initials(f.username))}</span><div><strong>${escapeHtml(f.username)}</strong><small>${f.id ? 'Usuário MobDisc' : 'Amigo local'}</small></div></div>`).join('') : '<div class="empty-state">Ainda não há amigos por aqui.<br>Adicione alguém no painel lateral.</div>';
}
function renderMessages() {
  const list = $('#messages');
  list.innerHTML = state.messages.map(m => `<article class="message"><div class="avatar ${m.isMine ? 'mine' : ''}">${escapeHtml(initials(m.username))}</div><div class="message-content"><div class="message-meta"><strong>${escapeHtml(m.username || 'Pessoa')}</strong><time>${escapeHtml(m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : 'agora')}</time></div><p>${escapeHtml(m.content)}</p></div></article>`).join('');
  list.scrollTop = list.scrollHeight;
}
async function loadChannels() {
  if (supabase && state.session) {
    const { data, error } = await supabase.from('channels').select('name').order('name');
    if (!error && data?.length) state.channels = data;
    else if (!state.channels.length) state.channels = [{name:'geral'},{name:'memes'},{name:'games'}];
  }
  renderChannels();
}
async function loadMessages() {
  if (supabase && state.session) {
    const { data, error } = await supabase.from('messages').select('id,content,created_at,user_id,profiles(username),channels(name)').eq('channels.name', state.channel).order('created_at').limit(100);
    if (!error && data) state.messages = data.map(m => ({...m, username:m.profiles?.username || 'Pessoa', isMine:m.user_id === state.session.user.id})).filter(m => m.channels?.name === state.channel);
    else status('Não foi possível carregar mensagens. Confira a configuração do banco.', true);
  } else {
    state.messages = JSON.parse(localStorage.getItem(`mobdisc:messages:${state.channel}`) || '[]');
  }
  renderMessages();
}
async function sendMessage(e) {
  e.preventDefault();
  const input = $('#message-input'), content = input.value.trim();
  if (!content || state.busy) return;
  state.busy = true;
  if (supabase && state.session) {
    const channel = state.channels.find(c => c.name === state.channel);
    const { error } = await supabase.from('messages').insert({ content, user_id: state.session.user.id, channel_name: channel?.name || state.channel });
    if (error) { status('Mensagem não enviada: ' + error.message, true); state.busy = false; return; }
    input.value = ''; await loadMessages();
  } else {
    const messages = JSON.parse(localStorage.getItem(`mobdisc:messages:${state.channel}`) || '[]');
    messages.push({ content, username: state.profile?.username || 'Você', isMine:true, created_at:new Date().toISOString() });
    state.messages = messages.slice(-100);
    localStorage.setItem(`mobdisc:messages:${state.channel}`, JSON.stringify(state.messages));
    input.value = ''; renderMessages();
  }
  state.busy = false;
}
let authMode = 'login';
function openAuth() { if (!supabase) { status('Para contas reais, configure as variáveis Supabase e aplique supabase/schema.sql.', true); return; } $('#auth-dialog').showModal(); }
function toggleAuthMode() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  $('#auth-title').textContent = authMode === 'login' ? 'Sua conta MobDisc' : 'Crie sua conta';
  $('#auth-submit').textContent = authMode === 'login' ? 'Entrar' : 'Criar conta';
  $('#auth-toggle').textContent = authMode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tem conta? Entrar';
  $('#auth-description').textContent = authMode === 'login' ? 'Entre para sincronizar suas conversas.' : 'Escolha um nome e use seu e-mail para começar.';
}
async function authSubmit(e) {
  e.preventDefault();
  if (!supabase) return;
  const username = $('#auth-username').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0,24);
  const email = $('#auth-email').value.trim(), password = $('#auth-password').value;
  if (username.length < 3) return status('O nome deve ter pelo menos 3 letras ou números.', true);
  $('#auth-submit').disabled = true;
  let result;
  if (authMode === 'signup') {
    result = await supabase.auth.signUp({ email, password, options:{ data:{ username } } });
    if (!result.error && result.data.user && result.data.session) {
      const { error } = await supabase.from('profiles').upsert({ id:result.data.user.id, username });
      if (error) status('Conta criada, mas o perfil precisa ser concluído: ' + error.message, true);
    }
  } else {
    result = await supabase.auth.signInWithPassword({ email, password });
  }
  $('#auth-submit').disabled = false;
  if (result.error) return status('Não foi possível autenticar: ' + result.error.message, true);
  if (authMode === 'signup' && !result.data.session) { $('#auth-dialog').close(); return status('Conta iniciada! Confirme o e-mail antes de entrar.'); }
  $('#auth-dialog').close(); await applySession(result.data.session); status('Você entrou no MobDisc!');
}
async function signOut() { if (supabase) await supabase.auth.signOut(); state.session = null; state.profile = null; updateAccount(); status('Você saiu da conta.'); await loadMessages(); }
async function applySession(session) {
  state.session = session;
  if (session && supabase) {
    let { data: profile } = await supabase.from('profiles').select('id,username').eq('id', session.user.id).maybeSingle();
    if (!profile) {
      const proposed = String(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'usuario').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,24);
      const { data } = await supabase.from('profiles').upsert({id:session.user.id, username:proposed},{onConflict:'id'}).select().maybeSingle();
      profile = data;
    }
    state.profile = profile || { username: session.user.email?.split('@')[0] || 'usuário' };
    const { data: friends } = await supabase.from('friendships').select('friend:profiles!friendships_friend_id_fkey(id,username)').eq('user_id', session.user.id);
    state.friends = (friends || []).map(f => f.friend).filter(Boolean);
    await loadChannels(); updateAccount(); renderFriendList(); renderFriends(); await loadMessages();
    $('#online-label').textContent = 'conectado';
    $('#composer-note').textContent = 'Evite compartilhar dados pessoais em canais públicos.';
  } else {
    updateAccount(); $('#online-label').textContent = 'modo local';
  }
}
function updateAccount() {
  const name = state.profile?.username || 'Visitante';
  $('#my-name').textContent = name; $('#my-avatar').textContent = initials(name);
  $('#my-state').textContent = state.session ? 'Conta conectada' : 'Modo demonstração';
  $('#account-btn').textContent = state.session ? 'Sair' : 'Entrar';
}
function start() {
  state.channels = [{name:'geral'},{name:'memes'},{name:'games'}];
  renderShell(); renderChannels(); updateAccount(); renderFriendList(); renderFriends();
  loadMessages();
  if (supabase) {
    supabase.auth.getSession().then(({data}) => applySession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => { applySession(session); });
    // Atualizações leves: consulta somente o canal aberto, a cada 12 segundos.
    window.setInterval(() => { if (state.session && state.tab === 'chat' && !document.hidden) loadMessages(); }, 12000);
  }
}
start();