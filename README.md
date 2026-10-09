# MobDisc — MVP leve para celular

Protótipo de chat com tema verde/preto, canais, lista de amigos e fluxo de autenticação opcional via Supabase. Feito com JavaScript sem framework de interface para reduzir o peso inicial.

## Requisitos
- Node.js 20.19+ ou 22.12+
- Conta Supabase (opcional para demonstração; necessária para contas e sincronização reais)

## Executar localmente
```bash
npm install
npm run dev
```
Abra o endereço mostrado pelo Vite. Sem variáveis Supabase, o site entra em modo demonstração: mensagens e canais ficam no `localStorage` desse navegador; amigos ficam apenas na memória da página. Não há sincronização entre aparelhos.

## Ativar backend Supabase
1. Crie um projeto Supabase.
2. Abra SQL Editor e execute `supabase/schema.sql`.
3. Em Authentication, configure e-mail/senha e a confirmação de e-mail conforme sua política.
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL e chave pública do projeto.
5. Reinicie `npm run dev`.

**Nunca coloque `service_role` no frontend.** A chave `anon`/publishable pode ser usada no navegador somente com RLS habilitado e políticas revisadas. Antes de publicar, faça testes de autorização e revise as políticas.

## O que funciona neste MVP
- Interface responsiva para celular e desktop.
- Envio e renderização de mensagens no modo local.
- Canais locais e amigos de demonstração.
- Estrutura de login/criação de conta com Supabase.
- Tabelas e políticas RLS iniciais para perfis, canais, mensagens e lista de amigos.
- Consulta periódica de mensagens quando autenticado (a cada 12 segundos, com a aba visível).

## Limitações atuais — não é ainda um Discord completo
- Mensagens privadas entre amigos não estão implementadas; amigos são uma lista.
- Atualização de mensagens é por consulta periódica, não WebSocket/Realtime.
- Não há moderação, denúncia, bloqueio, upload, chamada de voz, notificações push nem recuperação de conta personalizada.
- O esquema de políticas é uma base de desenvolvimento; valide segurança, spam, permissões e regras de comunidade antes de abrir ao público.
- A consulta de mensagens usa um limite de 100 e canais públicos para usuários autenticados. Para comunidades privadas, adicione memberships e políticas RLS por servidor/canal.
- A criação de conta pode exigir confirmação de e-mail antes do login, dependendo das configurações do Supabase.

## Plano de implementação sugerido
1. **MVP local** (feito): interface enxuta, canais e mensagens locais.
2. **Contas e sincronização**: configurar Supabase, revisar RLS, testar cadastro/login em dois aparelhos.
3. **Chat em tempo real**: ativar Supabase Realtime para `messages`; trocar polling por subscriptions após medir consumo.
4. **Amizades de verdade**: solicitações pendentes, aceitar/recusar, bloqueio e mensagens privadas com regras de acesso por participantes.
5. **Servidores**: tabelas `servers`, `server_members` e `channels` ligados por `server_id`; permissões por função e convite.
6. **Otimização**: paginação de histórico, limite de tamanho, carregamento sob demanda, compressão/cache, teste em Android de 2 GB RAM e rede lenta.
7. **Lançamento seguro**: proteção contra spam, moderação, logs sem conteúdo sensível, política de privacidade, termos, backups e monitoramento.

## Testes manuais antes de publicar
- [ ] Cadastro, confirmação de e-mail, login, logout e sessão persistente.
- [ ] Duas contas em dois navegadores trocam mensagens no mesmo canal.
- [ ] Usuário A não pode editar o perfil de B ou fingir ser B ao enviar mensagem.
- [ ] Testar nome de usuário duplicado e entrada malformada.
- [ ] Testar viewport de 320 px, teclado móvel, orientação horizontal e conexão instável.
- [ ] Confirmar que nenhuma chave secreta está no bundle publicado.
