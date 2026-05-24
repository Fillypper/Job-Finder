# 🚀 Job Hunter Bot

O **Job Hunter Bot** é um bot de monitoramento e raspagem (scraping) automática de vagas de emprego, desenvolvido em **Node.js** e **TypeScript**. O bot monitora plataformas populares (como LinkedIn e Gupy), aplica filtros inteligentes de geolocalização, nível de experiência e modalidade de trabalho, e notifica instantaneamente o usuário através de mensagens ricas no **Telegram**.

Ideal para desenvolvedores que querem automatizar sua busca por emprego ou demonstrar habilidades práticas em arquitetura back-end com raspagem de dados, automação e integrações.

---

## 🛠️ Tecnologias Utilizadas

* **Runtime:** [Node.js (v22+)](https://nodejs.org/)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/) (compilado para ESM)
* **Raspagem de Dados:** [Cheerio](https://cheerio.js.org/) (parsing de HTML de alta performance)
* **Notificação & Chatbot:** [Telegram Bot API](https://core.telegram.org/bots/api)
* **Agendamento de Tarefas:** [node-cron](https://www.npmjs.com/package/node-cron)
* **Gerenciamento de Estado:** Persistência em arquivos JSON locais para evitar notificações duplicadas.

---

## ✨ Funcionalidades Principais

* **🕷️ Multi-fonte Scraping:** Monitoramento paralelo de múltiplos portais de vagas sem necessidade de APIs oficiais.
* **🎯 Filtros Inteligentes:** Regras granulares configuráveis para focar apenas em vagas que batem com seu perfil (ex: Júnior/Estágio, Híbrido/Presencial na sua região).
* **🤖 Notificações Real-time no Telegram:** Mensagens estruturadas com link direto de inscrição, título da vaga, empresa, modalidade e data.
* **⏱️ Execução Agendada (Cron):** Rotinas automáticas de varredura executadas em intervalos customizáveis (ex: a cada 30 minutos).
* **💾 Persistência de Estado (Seen Jobs):** O bot rastreia as vagas já enviadas para que você nunca receba a mesma vaga duas vezes.

---

## 📁 Estrutura do Projeto

```text
├── data/                  # Estado persistido do bot (ignorado no git)
├── src/
│   ├── scrapers/          # Estratégias de raspagem para cada portal (LinkedIn, Gupy)
│   ├── config.ts          # Definições de ambiente e constantes
│   ├── index.ts           # Ponto de entrada da aplicação
│   ├── settings.ts        # Gerenciamento de configurações e filtros
│   ├── setup.ts           # Script interativo de configuração inicial
│   ├── storage.ts         # Persistência local de vagas visualizadas
│   └── telegram.ts        # Integração e escuta do Bot do Telegram
├── .env.example           # Modelo de variáveis de ambiente
├── tsconfig.json          # Configuração do compilador TypeScript
└── package.json           # Dependências e scripts do projeto
```

---

## 🚀 Como Executar o Projeto Localmente

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/job-hunter-bot.git
cd job-hunter-bot
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Abra o arquivo `.env` e preencha com o seu token do Telegram (obtido através do `@BotFather`) e seu Chat ID.

> 💡 **Não sabe o seu Chat ID?** 
> Basta preencher o `TELEGRAM_BOT_TOKEN`, mandar qualquer mensagem para o seu bot no Telegram e rodar:
> ```bash
> npm run setup
> ```
> O script interativo irá capturar e exibir o seu `TELEGRAM_CHAT_ID` na tela!

### 4. Executar o Projeto

* **Modo Desenvolvimento (Auto-reload):**
  ```bash
  npm run dev
  ```
* **Executar Apenas Uma Varredura (Single Run):**
  ```bash
  npm run once
  ```
* **Listar Filtros Ativos no Console:**
  ```bash
  npm run list
  ```
* **Build & Produção:**
  ```bash
  npm run build
  npm start
  ```

---

## ☁️ Hospedagem (Deploy)

Este bot está estruturado de forma ideal para rodar de forma contínua em servidores leves e serviços de container como **Square Cloud**, VPS Hetzner, Heroku ou Docker Compose.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
