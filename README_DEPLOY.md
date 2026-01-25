# 🚀 Automação de Deploy - Instruções Finais

## ✅ Status: Configuração Criada

Todos os arquivos necessários foram criados. Siga os passos abaixo para ativar.

## 📋 Passos para Ativar

### 1. Instale o PM2 (se ainda não instalado)

```bash
npm install -g pm2
pm2 startup  # Siga as instruções para configurar inicialização automática
```

### 2. Inicie o Servidor com PM2

```bash
cd /home/pedro/wa-api
pm2 start ecosystem.config.cjs
pm2 save
pm2 status  # Verifique se está online
```

### 3. Configure o GitHub Runner

```bash
# Execute o script interativo
bash scripts/setup-github-runner.sh
```

Digite quando solicitado:
- **Usuário do GitHub**: `pedropuppim`
- **Repositório**: `wa-api`
- **Token**: Copie o token de **Settings > Actions > Runners > New runner**

### 4. Teste o Deploy

```bash
# Faça um commit de teste
git add .
git commit -m "Teste: deploy automático"
git push origin master

# Acompanhe o progresso
# GitHub: https://github.com/pedropuppim/wa-api/actions
# Ou veja os logs:
tail -f ~/actions-runner/_diag/Runner_*.log
```

## 📁 Arquivos Criados

- `.github/workflows/deploy.yml` - Workflow de deploy
- `.github/workflows/SETUP_RUNNER.md` - Documentação completa
- `scripts/setup-github-runner.sh` - Script de configuração automática
- `scripts/check-deploy-readiness.sh` - Verificador de ambiente
- `DEPLOY_AUTOMATION.md` - Guia rápido

## 🔍 Verificação

Execute o verificador:
```bash
bash scripts/check-deploy-readiness.sh
```

Todos os itens devem estar ✓ antes de ativar.

## 🔔 Notificações

Para receber notificações de deploy no Telegram/Slack:

1. Edite `.github/workflows/deploy.yml`
2. Adicione um step de notificação após o deploy
3. Exemplo para Telegram:
```yaml
- name: Notify Telegram
  if: always()
  run: |
    STATUS=${{ job.status }}
    curl -s -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_TOKEN }}/sendMessage" \
      -d "chat_id=${{ secrets.TELEGRAM_CHAT_ID }}" \
      -d "text=Deploy *$STATUS* - ${{ github.repository }}"
```

## 🔒 Segurança

- O token do runner expira após uso
- Revogue tokens antigos em Settings > Actions > Runners
- Nunca commit tokens ou credenciais
- O runner executa com permissões limitadas

## 🛠️ Manutenção

```bash
# Status do runner
sudo ~/actions-runner/svc.sh status

# Reiniciar runner
sudo ~/actions-runner/svc.sh restart

# Logs da aplicação
pm2 logs wa-api --lines 50

# Desabilitar temporariamente
# GitHub > Settings > Actions > Runners [Disable]
```

## 📞 Suporte

Se tiver problemas:

1. Verifique logs: `~/actions-runner/_diag/*.log`
2. Consulte: `.github/workflows/SETUP_RUNNER.md`
3. Verifique permissões: `ls -la /home/pedro/wa-api`

## ✅ Checklist Final

- [ ] PM2 instalado (`npm install -g pm2`)
- [ ] Servidor rodando (`pm2 status`)
- [ ] Runner configurado (`bash scripts/setup-github-runner.sh`)
- [ ] Token do GitHub válido
- [ ] Teste realizado (`git push`)
- [ ] Deploy funcionando (ver Actions no GitHub)

---

**Pronto para automatizar!** 🎉