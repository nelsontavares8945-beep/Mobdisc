
import "./style.css";

const app = document.querySelector("#app");

app.innerHTML = `
  <header class="topbar">
    <div class="logo">Mob<span>Disc</span></div>
    <button id="menuBtn" aria-label="Abrir menu">☰</button>
  </header>

  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <h3>SEUS CANAIS</h3>
      <button class="channel active" data-channel="geral"># geral</button>
      <button class="channel" data-channel="memes"># memes</button>
      <button class="channel" data-channel="games"># games</button>
      <h3>AMIGOS</h3>
      <p class="muted">Sua lista de amigos</p>
      <button id="addFriend">＋ Adicionar amigo</button>
    </aside>

    <main class="chat">
      <div class="chat-head">
        <div>
          <h2 id="channelName"># geral</h2>
          <p class="muted">Bem-vindo ao MobDisc</p>
        </div>
        <span class="online">● Online</span>
      </div>

      <div id="messages" class="messages"></div>

      <form id="messageForm" class="composer">
        <input id="messageInput" maxlength="500"
          placeholder="Escreva uma mensagem..." autocomplete="off" />
        <button type="submit">Enviar</button>
      </form>
      <p class="muted hint">Mensagens salvas neste aparelho.</p>
    </main>
  </div>
`;

const messagesEl = document.querySelector("#messages");
const input = document.querySelector("#messageInput");
let channel = "geral";

function loadMessages() {
  try {
    return JSON.parse(localStorage.getItem("mobdisc-" + channel) || "[]");
  } catch {
    return [];
  }
}

function renderMessages() {
  messagesEl.replaceChildren();
  loadMessages().forEach((item) => {
    const message = document.createElement("article");
    message.className = "message";

    const author = document.createElement("strong");
    author.textContent = item.author;

    const content = document.createElement("p");
    content.textContent = item.text;

    const time = document.createElement("small");
    time.textContent = item.time;

    message.append(author, content, time);
    messagesEl.append(message);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

document.querySelector("#messageForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const list = loadMessages();
  list.push({
    author: localStorage.getItem("mobdisc-name") || "Você",
    text,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  });

  localStorage.setItem("mobdisc-" + channel, JSON.stringify(list.slice(-200)));
  input.value = "";
  renderMessages();
});

document.querySelectorAll(".channel").forEach((button) => {
  button.addEventListener("click", () => {
    channel = button.dataset.channel;
    document.querySelectorAll(".channel").forEach((b) => {
      b.classList.toggle("active", b === button);
    });
    document.querySelector("#channelName").textContent = "# " + channel;
    document.querySelector("#sidebar").classList.remove("open");
    renderMessages();
  });
});

document.querySelector("#menuBtn").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("open");
});

document.querySelector("#addFriend").addEventListener("click", () => {
  const name = prompt("Qual é o nome do seu amigo?");
  if (name && name.trim()) {
    alert("Anote o nome do seu amigo: " + name.trim() +
      ". A lista online será configurada depois.");
  }
});

if (!localStorage.getItem("mobdisc-name")) {
  const name = prompt("Como você quer ser chamado no MobDisc?");
  if (name && name.trim()) {
    localStorage.setItem("mobdisc-name", name.trim().slice(0, 30));
  }
}

renderMessages();
      
