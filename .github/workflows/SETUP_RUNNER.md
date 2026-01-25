# Configuração do GitHub Actions Runner Local

Este guia ensina como configurar um runner local (self-hosted) para automatizar deploys quando a branch master for atualizada.

## Pré-requisitos

- Acesso ao servidor onde o wa-api está rodando
- Permissão de administrador no repositório GitHub
- Node.js 22+ e PM2 já instalados
- Git configurado

## Passo 1: Criar o Runner no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** > **Actions** > **Runners**
3. Clique em **New self-hosted runner**
4. Selecione **Linux** como sistema operacional
5. Selecione **x64** como arquitetura
6. Siga os comandos de configuração mostrados

## Passo 2: Configurar o Runner no Servidor

Conecte-se ao servidor e execute os comandos fornecidos pelo GitHub:

```bash
# Navegue até o diretório do projeto
cd /home/pedro/wa-api

# Crie uma pasta para o runner (recomendado fora do projeto)
mkdir -p ~/actions-runner
cd ~/actions-runner

# Baixe o runner (exemplo - use o comando exato do GitHub)
curl -o actions-runner-linux-x64-2.xxx.x.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.xxx.x/actions-runner-linux-x64-2.xxx.x.tar.gz

# Extraia
tar xzf actions-runner-linux-x64-2.xxx.x.tar.gz

# Configure (use o token fornecido pelo GitHub)
./config.sh --url https://github.com/pedropuppim/wa-api \
  --token SEU_TOKEN_PERSONALIZADO

# Para configurar o runner como serviço:
sudo ./svc.sh install
sudo ./svc.sh start
```

## Passo 3: Configurar Permissões

Adicione o usuário do runner ao grupo do usuário principal:

```bash
# Substitua 'runner' pelo usuário criado durante a configuração
# Substitua 'pedro' pelo seu usuário principal
sudo usermod -a -G pedro runner  # Adiciona runner ao grupo pedro
sudo chmod g+rw /home/pedro/wa-api  # Permissão de escrita
```

## Passo 4: Testar a Configuração

1. Certifique-se que o servidor está rodando:
   ```bash
   pm2 status
   ```

2. Faça um commit e push para a branch master

3. Acompanhe o workflow em **Actions** no GitHub

4. Verifique os logs no servidor:
   ```bash
   # Logs do GitHub Actions
   tail -f ~/actions-runner/_diag/*.log
   
   # Logs da aplicação
   pm2 logs wa-api --lines 50
   ```

## Passo 5: Configurar Variáveis de Ambiente (Opcional)

Se necessário, configure variáveis de ambiente para o runner:

```bash
# Edite o arquivo de ambiente do runner
nano ~/actions-runner/.env

# Adicione variáveis necessárias
NODE_ENV=production
PM2_HOME=/home/pedro/.pm2
```

## Solução de Problemas

### Runner não inicia
```bash
# Verifique o status do serviço
sudo ./svc.sh status

# Veja os logs
cat ~/actions-runner/runner.log
```

### Permissão negada durante deploy
```bash
# Verifique as permissões da pasta
ls -la /home/pedro/wa-api

# Ajuste se necessário
sudo chown -R pedro:pedro /home/pedro/wa-api
sudo chmod -R 775 /home/pedro/wa-api
```

### PM2 não encontra o processo
```bash
# Listar processos do PM2
pm2 list

# Se wa-api não estiver listado, recrie com:
pm2 start ecosystem.config.cjs
pm2 save
```

## Estrutura do Workflow

O arquivo `.github/workflows/deploy.yml` executa:

1. **Checkout**: Baixa o código atualizado
2. **Setup Node.js**: Configura Node.js 22 com cache
3. **Install dependencies**: Roda `npm ci` (instalação limpa)
4. **Postinstall**: Executa scripts pós-instalação
5. **Restart**: Roda `npm run prod:restart` via PM2
6. **Check status**: Verifica se o deploy foi bem-sucedido

## Status do Deploy

Quando um push for feito para master:

- O workflow será acionado automaticamente
- Você pode acompanhar em **Actions** no GitHub
- O deploy leva cerca de 30-60 segundos
- Em caso de erro, verifique os logs no servidor

## Segurança

- Nunca commit o token do runner
- Restringa o acesso ao servidor
- Considere usar secrets do GitHub para variáveis sensíveis
- Revogue tokens antigos periodicamente

## Suporte

Se encontrar problemas:
1. Verifique os logs do runner: `~/actions-runner/_diag/`
2. Verifique os logs do PM2: `pm2 logs`
3. Acesse a documentação: https://docs.github.com/en/actions/hosting-your-own-runners

---

## Comandos Úteis

```bash
# Iniciar/Parar/Status do runner
sudo ./svc.sh start
sudo ./svc.sh stop
sudo ./svc.sh status

# Logs do runner
cd ~/actions-runner
tail -f _diag/Runner_*.log

# Logs da aplicação
pm2 logs wa-api --lines 50
pm2 status

# Verificar workflow
gh run list  # GitHub CLI
```