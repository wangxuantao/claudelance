#!/usr/bin/env bash
# =============================================================================
# setup.sh — HomeLab Network Stack 初始化脚本
# =============================================================================
# 功能:
#   1. 检测并禁用 systemd-resolved 的 53 端口占用
#   2. 创建必要的目录结构
#   3. 生成 Unbound 默认配置
#   4. 禁用系统 DNS 缓存以释放 53 端口
#
# 用法:
#   sudo bash setup.sh [--check|--apply|--restore]
#
#   --check      仅检测 53 端口状态并报告
#   --apply      应用修复 (默认)
#   --restore    恢复 systemd-resolved 配置
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }

MODE="${1:---apply}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVED_CONF="/etc/systemd/resolved.conf"
RESOLVED_CONF_BACKUP="/etc/systemd/resolved.conf.bak.$(date +%Y%m%d%H%M%S)"

# =============================================================================
# Utility functions
# =============================================================================

check_port_53() {
    log_info "检查 53 端口占用..."
    if ss -tulpn 2>/dev/null | grep -q ':53 ' || netstat -tulpn 2>/dev/null | grep -q ':53 '; then
        log_warn "53 端口已被占用:"
        ss -tulpn 2>/dev/null | grep ':53 ' || netstat -tulpn 2>/dev/null | grep ':53 '
        return 1
    else
        log_ok "53 端口空闲"
        return 0
    fi
}

check_systemd_resolved() {
    if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
        local stub=$(systemd-resolve --status 2>/dev/null | grep "DNS Servers" || true)
        log_warn "systemd-resolved 正在运行"
        log_info "当前 DNS 服务器: ${stub:-未知}"
        return 0
    else
        log_ok "systemd-resolved 未运行"
        return 1
    fi
}

# =============================================================================
# Mode: check
# =============================================================================

do_check() {
    echo ""
    echo "=============================================="
    echo "  HomeLab Network Stack — 端口检测"
    echo "=============================================="
    echo ""

    check_systemd_resolved || true
    echo ""
    check_port_53 || true
    echo ""

    if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
        log_info "检测到 DNSStubListener，运行 --apply 可自动修复"
        echo ""
        echo "  修复方案:"
        echo "    1. DNSStubListener=no  → 禁用 resolved stub 监听器"
        echo "    2. 重启 systemd-resolved → 释放 53 端口"
        echo "    3. AdGuard Home 绑定 53 → 接管 DNS"
        echo ""
    fi
}

# =============================================================================
# Mode: apply
# =============================================================================

do_apply() {
    echo ""
    echo "=============================================="
    echo "  HomeLab Network Stack — 一键部署"
    echo "=============================================="
    echo ""

    # --- Step 1: Check if running as root ---
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行: sudo bash setup.sh --apply"
        exit 1
    fi

    # --- Step 2: Handle systemd-resolved ---
    log_info "Step 1/5: 处理 systemd-resolved..."
    if check_systemd_resolved; then
        # Backup current config
        cp "$RESOLVED_CONF" "$RESOLVED_CONF_BACKUP"
        log_ok "已备份到: $RESOLVED_CONF_BACKUP"

        # Disable DNSStubListener
        if grep -q "^DNSStubListener=" "$RESOLVED_CONF" 2>/dev/null; then
            sed -i 's/^DNSStubListener=.*/DNSStubListener=no/' "$RESOLVED_CONF"
        elif grep -q "^#DNSStubListener=" "$RESOLVED_CONF" 2>/dev/null; then
            sed -i 's/^#DNSStubListener=.*/DNSStubListener=no/' "$RESOLVED_CONF"
        else
            echo "DNSStubListener=no" >> "$RESOLVED_CONF"
        fi

        # Also set a fallback DNS so the system can resolve before AdGuard is up
        if ! grep -q "^DNS=" "$RESOLVED_CONF" 2>/dev/null; then
            echo "DNS=1.1.1.1 8.8.8.8" >> "$RESOLVED_CONF"
        fi
        if ! grep -q "^FallbackDNS=" "$RESOLVED_CONF" 2>/dev/null; then
            echo "FallbackDNS=1.0.0.1 8.8.4.4" >> "$RESOLVED_CONF"
        fi

        log_ok "已禁用 DNSStubListener"

        # Restart
        systemctl restart systemd-resolved
        log_ok "已重启 systemd-resolved"
    fi

    # --- Step 3: Verify port 53 is free ---
    log_info "Step 2/5: 验证 53 端口..."
    sleep 2
    if check_port_53; then
        log_ok "53 端口已释放，AdGuard Home 可以绑定"
    else
        log_warn "53 端口仍被占用，请手动检查: ss -tulpn | grep ':53 '"
        log_info "常见解决方案:"
        echo "  a) 停止 dnsmasq:   sudo systemctl stop dnsmasq && sudo systemctl disable dnsmasq"
        echo "  b) 停止 named:     sudo systemctl stop named && sudo systemctl disable named"
        echo "  c) 修改 AdGuard 端口: 编辑 docker-compose.yml 将 53 改为 5353"
    fi

    # --- Step 4: Create directories ---
    log_info "Step 3/5: 创建数据目录..."
    mkdir -p "$SCRIPT_DIR/adguard/work"
    mkdir -p "$SCRIPT_DIR/adguard/conf"
    mkdir -p "$SCRIPT_DIR/wireguard"
    mkdir -p "$SCRIPT_DIR/unbound"
    log_ok "目录创建完成"

    # --- Step 5: Generate Unbound config ---
    log_info "Step 4/5: 生成 Unbound 递归解析配置..."
    if [[ ! -f "$SCRIPT_DIR/unbound/unbound.conf" ]]; then
        cat > "$SCRIPT_DIR/unbound/unbound.conf" << 'UNBOUND_EOF'
server:
    # 监听所有接口
    interface: 0.0.0.0
    port: 53
    # 允许列表 (私有网络)
    access-control: 127.0.0.0/8 allow
    access-control: 10.0.0.0/8 allow
    access-control: 172.16.0.0/12 allow
    access-control: 192.168.0.0/16 allow
    access-control: 172.22.0.0/16 allow
    # 递归配置
    do-ip4: yes
    do-ip6: yes
    do-udp: yes
    do-tcp: yes
    # 隐私
    qname-minimisation: yes
    hide-identity: yes
    hide-version: yes
    # 性能
    num-threads: 2
    msg-cache-size: 100m
    rrset-cache-size: 200m
    # 预取
    prefetch: yes
    prefetch-key: yes
    # DNSSEC
    auto-trust-anchor-file: "/opt/unbound/etc/unbound/root.key"
    val-log-level: 2
    # 上游根服务器
    root-hints: "/opt/unbound/etc/unbound/root.hints"
    # 缓存
    cache-min-ttl: 300
    cache-max-ttl: 86400
    # 日志
    verbosity: 1
    use-syslog: no
UNBOUND_EOF
        log_ok "Unbound 配置已生成: unbound/unbound.conf"
    else
        log_info "unbound.conf 已存在，跳过"
    fi

    # --- Step 6: Check .env ---
    log_info "Step 5/5: 检查环境变量..."
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        if [[ -f "$SCRIPT_DIR/.env.example" ]]; then
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
            log_warn ".env 文件已从 .env.example 创建，请编辑填入你的信息:"
            echo ""
            echo "  必填:"
            echo "    WG_HOST          你的公网 IP 或域名 (用于 WireGuard)"
            echo "    WG_PASSWORD_HASH  Web UI 密码 (用 wg-easy 生成 bcrypt hash)"
            echo "    CF_API_TOKEN      Cloudflare API Token"
            echo "    CF_DOMAINS        你的域名 (多域名用逗号分隔)"
            echo ""
        fi
    else
        log_ok ".env 文件已存在"
    fi

    echo ""
    echo "=============================================="
    log_ok "初始化完成！"
    echo "=============================================="
    echo ""
    echo "  下一步:"
    echo "    1. 编辑 .env 填入你的配置"
    echo "    2. docker compose up -d"
    echo "    3. AdGuard Home:  http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<SERVER_IP>'):3000"
    echo "    4. WireGuard UI:  http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo '<SERVER_IP>'):51821"
    echo ""
}

# =============================================================================
# Mode: restore
# =============================================================================

do_restore() {
    echo ""
    echo "=============================================="
    echo "  恢复 systemd-resolved 配置"
    echo "=============================================="
    echo ""

    if [[ $EUID -ne 0 ]]; then
        log_error "需要 root 权限"
        exit 1
    fi

    # Find latest backup
    local latest_backup=$(ls -t /etc/systemd/resolved.conf.bak.* 2>/dev/null | head -1)
    if [[ -z "$latest_backup" ]]; then
        log_warn "未找到备份文件"
        log_info "手动恢复: 编辑 /etc/systemd/resolved.conf，设置 DNSStubListener=yes"
        exit 1
    fi

    cp "$latest_backup" "$RESOLVED_CONF"
    log_ok "已从 $latest_backup 恢复配置"

    systemctl restart systemd-resolved
    log_ok "已重启 systemd-resolved"

    echo ""
    log_ok "恢复完成，53 端口已归还给 systemd-resolved"
}

# =============================================================================
# Main
# =============================================================================

case "$MODE" in
    --check)
        do_check
        ;;
    --apply)
        do_apply
        ;;
    --restore)
        do_restore
        ;;
    *)
        echo "用法: $0 [--check|--apply|--restore]"
        echo ""
        echo "  --check    仅检测 53 端口状态"
        echo "  --apply    应用修复 + 初始化 (默认)"
        echo "  --restore  恢复 systemd-resolved 到原始状态"
        exit 1
        ;;
esac
