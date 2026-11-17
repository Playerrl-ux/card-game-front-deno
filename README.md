# Card Game — Frontend

Interface web em tempo real para o jogo de cartas multiplayer, construída com React, TypeScript e WebSockets.

---

## 🔗 Sobre o Projeto

Este repositório contém exclusivamente a aplicação **Frontend** do projeto. Ele se comunica via WebSockets com o servidor backend que gerencia o estado das salas, partidas, jogadores e regras de negócio.

- **Repositório do Backend:** [Link do Projeto Backend](https://github.com/Playerrl-ux/card-game-deno)

---

## 🛠️ Stack Tecnológica

- **[React 18](https://react.dev/)** — Biblioteca para construção da interface de usuário em componentes reutilizáveis.
- **[TypeScript](https://www.typescriptlang.org/)** — Tipagem estática rigorosa para payloads, eventos e contratos de comunicação.
- **[Vite](https://vitejs.dev/)** — Build tool e dev server ultra-rápido com HMR (Hot Module Replacement).
- **[Tailwind CSS](https://tailwindcss.com/)** — Estilização moderna através de utility-first CSS.
- **[Zustand](https://github.com/pmndrs/zustand)** — Gerenciamento global de estado previsível, leve e sem boilerplate.
- **[Framer Motion](https://www.framer.com/motion/)** — Animações declarativas e fluidas para cartas, turnos e modais.
- **[Lucide React](https://lucide.dev/)** — Conjunto de ícones leves e consistentes.
- **[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)** — Efeito visual comemorativo para vitória de partidas.
- **WebSockets** — Comunicação bidirecional síncrona em tempo real orientada a eventos.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- **Node.js** (versão 18 ou superior)
- Gerenciador de pacotes **npm** (ou **pnpm** / **yarn**)
- Servidor Backend em execução (para a experiência completa do jogo)

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/card-game-frontend.git
cd card-game-frontend
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em [http://localhost:5173](http://localhost:5173).

---

## 📦 Scripts Disponíveis

| Comando           | Descrição                                                    |
| ----------------- | ------------------------------------------------------------ |
| `npm run dev`     | Inicia o servidor local de desenvolvimento na porta `5173`   |
| `npm run build`   | Valida tipagem com `tsc` e gera a build otimizada em `dist/` |
| `npm run preview` | Pré-visualiza localmente a build de produção gerada          |

---

## 🎮 Funcionalidades Principais

- **Lobby e Criação de Salas**: Criação e entrada em salas públicas/privadas com suporte a bots e jogadores reais.
- **Configurações Customizáveis de Partida**: Regras de 7 troca de mão, 0 rotaciona baralhos, acúmulo de cartas de compra, contra-ataque de jump-in e regras de blefe no +4.
- **Mecânica de UNO**: Declaração de UNO antes do descarte da penúltima carta e botão de acusação para punir jogadores que esquecerem de dizer UNO.
- **Feedback Visual & Sonoro**: Efeitos sonoros sintetizados para descarte, compra, alertas de turno, avisos e celebração de vitória.

## Assets:

Os assets das cartas e do fundo vieram desse artista:[https://alexder.itch.io/uno-card-game-asset-pack]
