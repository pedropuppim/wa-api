# WhatsApp Web API

API REST para envio e recebimento de mensagens WhatsApp com dashboard de controle.

## Requisitos

- Node.js 22+
- NPM ou Yarn

## Instalacao

```bash
# Clonar o repositorio
cd wa-api

# Instalar dependencias
npm install

# Copiar arquivo de configuracao
cp .env.example .env

# Editar o arquivo .env com suas configuracoes
```

## Configuracao

Edite o arquivo `.env` com suas configuracoes:

```env
# Servidor
APP_PORT=3000
APP_HOST=0.0.0.0

# Autenticacao do Dashboard
DASH_USER=admin
DASH_PASS=sua_senha_segura

# Sessao
SESSION_SECRET=sua_chave_secreta_minimo_16_caracteres

# WhatsApp
WHATSAPP_CLIENT_ID=main

# Webhook (recebe mensagens)
WEBHOOK_URL=https://seu-servidor.com/webhook
WEBHOOK_TOKEN=token_do_webhook

# API (envio de mensagens)
API_TOKEN=token_da_api

# URL Base
BASE_URL=http://localhost:3000
```

## Executando

```bash
# Producao
npm start

# Desenvolvimento (com hot reload)
npm run dev
```

## Dashboard Web

Acesse `http://localhost:3000/login` para acessar o dashboard.

O dashboard permite:
- Visualizar status da conexao do WhatsApp
- Escanear QR Code para autenticacao
- Reiniciar a sessao do WhatsApp

## API REST

### Autenticacao

Todas as rotas da API requerem o header:
```
Authorization: Bearer <API_TOKEN>
```

### GET /api/status

Retorna o status da conexao do WhatsApp.

**Resposta:**
```json
{
  "status": "READY",
  "qrAvailable": false,
  "lastError": null
}
```

Valores possiveis de status:
- `DISCONNECTED` - Desconectado
- `CONNECTING` - Conectando
- `QR_REQUIRED` - Aguardando scan do QR Code
- `READY` - Pronto para enviar mensagens

### POST /api/send

Envia uma mensagem. Retorna erro 409 se o WhatsApp nao estiver com status READY.

#### Mensagem de Texto

```json
{
  "to": "5511999999999",
  "type": "text",
  "text": "Ola, tudo bem?"
}
```

#### Imagem via URL

```json
{
  "to": "5511999999999",
  "type": "image",
  "caption": "Legenda opcional",
  "image": {
    "source": "url",
    "url": "https://exemplo.com/imagem.jpg"
  }
}
```

#### Imagem via Base64

```json
{
  "to": "5511999999999",
  "type": "image",
  "caption": "Legenda opcional",
  "image": {
    "source": "base64",
    "data": "BASE64_DATA",
    "mimetype": "image/jpeg",
    "filename": "foto.jpg"
  }
}
```

#### Audio

```json
{
  "to": "5511999999999",
  "type": "audio",
  "audio": {
    "source": "url",
    "url": "https://exemplo.com/audio.mp3"
  },
  "asPtt": false
}
```

**Resposta de sucesso:**
```json
{
  "ok": true,
  "id": "message_id",
  "to": "5511999999999@c.us",
  "type": "text"
}
```

## Webhook

O sistema envia um POST para `WEBHOOK_URL` sempre que uma mensagem e recebida.

**Headers:**
```
Authorization: Bearer <WEBHOOK_TOKEN>
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "message.received",
  "timestamp": "2026-01-17T12:34:56.000Z",
  "instance": "main",
  "message": {
    "id": "message_id",
    "from": "5511999999999@c.us",
    "to": "5511888888888@c.us",
    "body": "texto da mensagem",
    "type": "chat",
    "hasMedia": false,
    "isGroup": false,
    "chatId": "5511999999999@c.us"
  },
  "contact": {
    "name": "Nome do Contato",
    "pushname": "Nome no WhatsApp",
    "number": "5511999999999"
  }
}
```

Para mensagens com midia, um segundo evento `message.media` e enviado com o campo `media`:
```json
{
  "media": {
    "mimetype": "image/jpeg",
    "filename": "foto.jpg",
    "base64": "BASE64_DATA"
  }
}
```

## Estrutura do Projeto

```
wa-api/
├── src/
│   ├── server.js              # Bootstrap da aplicacao
│   ├── config/
│   │   └── env.js             # Validacao de ambiente
│   ├── whatsapp/
│   │   └── client.js          # Cliente WhatsApp
│   ├── routes/
│   │   ├── web.js             # Rotas do dashboard
│   │   ├── auth.js            # Autenticacao
│   │   ├── status.js          # API de status
│   │   └── send.js            # API de envio
│   ├── services/
│   │   └── webhook.js         # Servico de webhook
│   ├── middlewares/
│   │   ├── auth.js            # Middleware de sessao
│   │   └── apiToken.js        # Middleware de token
│   └── validators/
│       └── sendMessage.validator.js
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── dashboard.js
├── views/
│   ├── login.html
│   └── dashboard.html
├── .env.example
├── package.json
└── README.md
```

## Seguranca

- Use senhas fortes para `DASH_PASS`, `SESSION_SECRET`, `WEBHOOK_TOKEN` e `API_TOKEN`
- Em producao, configure HTTPS
- O rate limit esta configurado para 100 requisicoes/minuto na API
- O rate limit de login esta configurado para 10 tentativas/15 minutos

## Licenca

ISC
