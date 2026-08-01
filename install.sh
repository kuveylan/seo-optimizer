#!/usr/bin/env bash
# =============================================================
#  SEO Optimizer — Kurulum Betiği  (© 2026 kuveylan, MIT)
#
#  Bu betik bağımlılıkları kurar ve .env'yi hazırlar.
#  CLI'ı çalıştırmak için global kurulum GEREKMEZ:
#    node bin/seo-audit.js audit https://example.com
#
#  Not: Windows PowerShell kullanıyorsanız aşağıdaki komutları
#  doğrudan çalıştırın (install.sh yalnızca bash içindir):
#    npm install
#    node bin/seo-audit.js config
#    node bin/seo-audit.js audit https://example.com
# =============================================================
set -e

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

echo -e "\n${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}║${NC}   ${BOLD}SEO OPTIMIZER${NC} ${DIM}— kurulum${NC}   ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════${NC}\n"

# ── Node.js kontrolü ──
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js bulunamadı.${NC}"
    echo -e "${YELLOW}   Önce Node.js 18+ kurun: https://nodejs.org${NC}"
    exit 1
fi
NODE_VER=$(node -v | sed 's/v//')
echo -e "${GREEN}✓${NC} Node.js ${BOLD}${NODE_VER}${NC} bulundu"

# ── Proje dizinine gir ──
cd "$(dirname "$0")" 2>/dev/null || cd "$(pwd)"

# ── Bağımlılıklar ──
echo -e "${YELLOW}▶ Bağımlılıklar kuruluyor (npm install)...${NC}"
if ! npm install --no-audit --no-fund 2>&1 | tail -3; then
    echo -e "${RED}❌ npm install başarısız oldu.${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Bağımlılıklar hazır"

echo -e "\n${GREEN}✔ Kurulum tamamlandı!${NC}"
echo -e "${BOLD}  1. AI raporu için:${NC} node bin/seo-audit.js config   ${DIM}(anahtarınızı girin)${NC}"
echo -e "${BOLD}  2. CLI kullanım:${NC} node bin/seo-audit.js audit https://example.com"
echo -e "${DIM}  Web arayüzü:  npm start  →  http://localhost:3000${NC}\n"
