# Automação de Deploy com GitHub Actions

## Visão Geral

O deploy é automatizado via GitHub Actions. Quando houver push na branch `master`, o runner local executará:
- `git pull`
- `npm ci`
- `npm run prod:restart`

## Configuração Rápida (3 passos)

### 1. Configure o Runner no GitHub
- Vá em **Settings > Actions > Runners > New self-hosted runner**
- Selecione **Linux** e **x64**
- **NÃO execute os comandos ainda**, apenas copie o **token**

### 2. Execute o script de configuração
```bash
cd /home/pedro/wa-api
bash scripts/setup-github-runner.sh
```

Digite quando solicitado:
- Usuário do GitHub: `pedropuppim`
- Repositório: `wa-api`
- Token: cole o token copiado do GitHub

### 3. Teste o deploy
```bash
# Faça uma alteração e push
git add .
git commit -m "Teste deploy automático"
git push origin master

# Acompanhe no GitHub: https://github.com/pedropuppim/wa-api/actions
# Ou veja os logs em tempo real:
tail -f ~/actions-runner/_diag/Runner_*.log
```

## Verificando Status

```bash
# Status do runner
sudo ~/actions-runner/svc.sh status

# Status do PM2
pm2 status

# Logs da aplicação
pm2 logs wa-api --lines 50
```

## Solução de Problemas

**Runner offline no GitHub?**
```bash
sudo ~/actions-runner/svc.sh restart
```

**Deploy falhou?**
```bash
# Veja os logs completos
cd ~/actions-runner
./run.sh  # Executa manualmente para debug
```

**Permissão negada?**
```bash
sudo usermod -a -G pedro runner
sudo chmod g+rw /home/pedro/wa-api
```

## Desativação

Para pausar automação temporariamente:
- Vá em **Settings > Actions > Runners** no GitHub
- Clique no runner e selecione **Disable**

## Suporte

Documentação completa: `.github/workflows/SETUP_RUNNER.md`