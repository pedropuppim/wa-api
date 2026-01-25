#!/bin/bash

# Script para configurar o GitHub Actions Runner localmente
# Execute: bash scripts/setup-github-runner.sh

set -e

echo "========================================"
echo "Configuração do GitHub Actions Runner"
echo "========================================"
echo ""

# Verifica se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script do diretório raiz do projeto wa-api"
    exit 1
fi

# Pergunta os detalhes
read -p "Usuário do GitHub (ex: pedropuppim): " GITHUB_USER
read -p "Nome do repositório (ex: wa-api): " REPO_NAME
read -p "Token do runner (obtenha em Settings > Actions > Runners > New runner): " RUNNER_TOKEN

if [ -z "$GITHUB_USER" ] || [ -z "$REPO_NAME" ] || [ -z "$RUNNER_TOKEN" ]; then
    echo "❌ Erro: Todos os campos são obrigatórios!"
    exit 1
fi

RUNNER_DIR="$HOME/actions-runner"
REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME"

echo ""
echo "→ Criando diretório do runner em: $RUNNER_DIR"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Detecta versão mais recente
LATEST_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
if [ -z "$LATEST_VERSION" ]; then
    echo "⚠️  Não foi possível detectar a versão mais recente, usando 2.321.0"
    LATEST_VERSION="2.321.0"
fi

echo "→ Baixando runner v$LATEST_VERSION..."
curl -o actions-runner-linux-x64-$LATEST_VERSION.tar.gz -L \
    https://github.com/actions/runner/releases/download/v$LATEST_VERSION/actions-runner-linux-x64-$LATEST_VERSION.tar.gz

echo "→ Extraindo..."
tar xzf actions-runner-linux-x64-$LATEST_VERSION.tar.gz
rm actions-runner-linux-x64-$LATEST_VERSION.tar.gz

echo "→ Configurando runner..."
./config.sh --url "$REPO_URL" --token "$RUNNER_TOKEN" --name "$(hostname)-prod" --unattended

echo ""
echo "→ Instalando como serviço..."
sudo ./svc.sh install
sudo ./svc.sh start

echo ""
echo "✅ Runner configurado com sucesso!"
echo ""
echo "📋 Verificando status..."
sleep 2
sudo ./svc.sh status

echo ""
echo "📋 Próximos passos:"
echo "   1. Verifique se o runner aparece em: https://github.com/$GITHUB_USER/$REPO_NAME/settings/actions/runners"
echo "   2. Faça um teste: git commit --allow-empty -m 'Teste deploy' && git push origin master"
echo "   3. Acompanhe em: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo ""
echo "🔧 Comandos úteis:"
echo "   cd $RUNNER_DIR"
echo "   sudo ./svc.sh status   # Ver status"
echo "   tail -f _diag/Runner_*.log  # Ver logs"
echo "   sudo ./svc.sh stop    # Parar"
echo "   sudo ./svc.sh start   # Iniciar"
echo ""