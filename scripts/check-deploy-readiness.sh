#!/bin/bash

# Script para verificar se o ambiente está pronto para deploy automático

echo "=========================================="
echo "Verificação de Prontidão para Deploy"
echo "=========================================="
echo ""

ERRORS=0

# 1. Verificar Node.js
echo "✓ Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "  Node.js encontrado: $NODE_VERSION"
    
    # Verificar versão (deve ser >= 22)
    NODE_MAJOR=$(node -v | cut -d. -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 22 ]; then
        echo "  ✓ Versão compatível"
    else
        echo "  ✗ Versão incompatível (requer 22+)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ✗ Node.js não encontrado"
    ERRORS=$((ERRORS + 1))
fi

# 2. Verificar PM2
echo ""
echo "✓ Verificando PM2..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo "  PM2 encontrado: v$PM2_VERSION"
else
    echo "  ✗ PM2 não encontrado (instale com: npm install -g pm2)"
    ERRORS=$((ERRORS + 1))
fi

# 3. Verificar processo wa-api
echo ""
echo "✓ Verificando processo wa-api..."
pm2 show wa-api &> /dev/null
if [ $? -eq 0 ]; then
    echo "  ✓ Processo wa-api encontrado no PM2"
    pm2 status wa-api | tail -n +2
else
    echo "  ⚠ Processo wa-api não encontrado"
    echo "    Execute: pm2 start ecosystem.config.cjs && pm2 save"
fi

# 4. Verificar Git
echo ""
echo "✓ Verificando Git..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo "  $GIT_VERSION"
else
    echo "  ✗ Git não encontrado"
    ERRORS=$((ERRORS + 1))
fi

# 5. Verificar repositório remoto
echo ""
echo "✓ Verificando repositório remoto..."
REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null)
if [ -n "$REMOTE_URL" ]; then
    echo "  ✓ Repositório configurado: $REMOTE_URL"
else
    echo "  ✗ Repositório remoto não configurado"
    ERRORS=$((ERRORS + 1))
fi

# 6. Verificar package.json
echo ""
echo "✓ Verificando package.json..."
if [ -f "package.json" ]; then
    echo "  ✓ package.json encontrado"
    
    # Verificar scripts necessários
    if grep -q '"prod:restart"' package.json; then
        echo "  ✓ Script 'prod:restart' encontrado"
    else
        echo "  ✗ Script 'prod:restart' não encontrado"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q '"postinstall"' package.json; then
        echo "  ✓ Script 'postinstall' encontrado"
    else
        echo "  ✗ Script 'postinstall' não encontrado"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ✗ package.json não encontrado"
    ERRORS=$((ERRORS + 1))
fi

# 7. Verificar PM2 ecosystem
echo ""
echo "✓ Verificando ecosystem.config.cjs..."
if [ -f "ecosystem.config.cjs" ]; then
    echo "  ✓ ecosystem.config.cjs encontrado"
else
    echo "  ✗ ecosystem.config.cjs não encontrado"
    ERRORS=$((ERRORS + 1))
fi

# 8. Verificar variáveis de ambiente
echo ""
echo "✓ Verificando variáveis de ambiente..."
if [ -f ".env" ]; then
    echo "  ✓ Arquivo .env encontrado"
    
    # Verifica variáveis essenciais
    if grep -q "APP_PORT" .env; then
        echo "  ✓ APP_PORT definida"
    fi
    if grep -q "API_TOKEN" .env; then
        echo "  ✓ API_TOKEN definida"
    fi
    if grep -q "DASH_USER" .env; then
        echo "  ✓ DASH_USER definida"
    fi
else
    echo "  ✗ Arquivo .env não encontrado"
    ERRORS=$((ERRORS + 1))
fi

# 9. Verificar workflow
echo ""
echo "✓ Verificando workflow do GitHub Actions..."
if [ -f ".github/workflows/deploy.yml" ]; then
    echo "  ✓ Workflow deploy.yml encontrado"
else
    echo "  ✗ Workflow não encontrado"
    ERRORS=$((ERRORS + 1))
fi

# Resultado final
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ Ambiente pronto para deploy automático!"
    echo ""
    echo "Próximos passos:"
    echo "  1. Configure o runner: bash scripts/setup-github-runner.sh"
    echo "  2. Teste com um commit/push"
    echo "  3. Acompanhe em: https://github.com/pedropuppim/wa-api/actions"
else
    echo "❌ Encontrados $ERRORS problema(s)"
    echo ""
    echo "Corrija os erros acima antes de prosseguir."
fi
echo "=========================================="

exit $ERRORS
