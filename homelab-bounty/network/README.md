# 🏠 HomeLab Network Stack

> AdGuard Home + WireGuard Easy + Cloudflare DDNS + Unbound  
> 家庭网络基础设施 | Docker Compose 一键部署

[![Bounty](https://img.shields.io/badge/Bounty-%24140-FF8C00)](https://github.com/illbnm/homelab-stack/issues/4)
[![AdGuard Home](https://img.shields.io/badge/AdGuard_Home-v0.107.52-blue)](https://github.com/AdguardTeam/AdGuardHome)
[![WireGuard](https://img.shields.io/badge/WireGuard_Easy-v14-88171A)](https://github.com/wg-easy/wg-easy)
[![Unbound](https://img.shields.io/badge/Unbound-v1.21.1-green)](https://github.com/MatthewVance/unbound-docker)

---

## 📋 目录

- [架构概览](#-架构概览)
- [快速开始](#-快速开始)
- [服务详解](#-服务详解)
  - [AdGuard Home](#1-adguard-home---dns-过滤--广告屏蔽)
  - [WireGuard Easy](#2-wireguard-easy---vpn-服务端)
  - [Cloudflare DDNS](#3-cloudflare-ddns---动态-dns)
  - [Unbound](#4-unbound---递归-dns-解析器)
- [端口规划](#-端口规划)
- [配置指南](#-配置指南)
  - [AdGuard Home 过滤列表推荐](#adguard-home-过滤列表推荐)
  - [WireGuard Split Tunneling](#wireguard-split-tunneling)
  - [路由器 DNS 配置](#路由器-dns-配置)
- [国内网络适配](#-国内网络适配)
- [故障排查](#-故障排查)
- [文件结构](#-文件结构)

---

## 🏗 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                      Internet                           │
└────────────┬──────────────────────┬─────────────────────┘
             │                      │
    ┌────────▼────────┐    ┌───────▼────────┐
    │ Cloudflare DDNS │    │  WireGuard VPN │
    │  (动态域名更新)  │    │  (51820/UDP)   │
    └─────────────────┘    └───────┬────────┘
                                   │
┌──────────────────────────────────▼──────────────────────┐
│                    Docker Network (172.22.0.0/16)        │
│                                                          │
│  ┌──────────────┐     ┌──────────────────┐              │
│  │ AdGuard Home │────▶│    Unbound       │              │
│  │  (53/UDP)    │     │  (递归 DNS)       │              │
│  │  过滤/缓存    │     │  DNS 根服务器查询  │              │
│  └──────────────┘     └──────────────────┘              │
│         │                                                │
│         ▼                                                │
│   内网所有设备 DNS 过滤 + 广告屏蔽                        │
└──────────────────────────────────────────────────────────┘
```

**数据流:**

1. 客户端设备 → AdGuard Home (53) → DNS 查询
2. AdGuard Home → Unbound (递归) → 公共 DNS 根服务器
3. WireGuard 客户端 → VPN 隧道 → 内网访问
4. Cloudflare DDNS → 定期更新 A/AAAA 记录

---

## 🚀 快速开始

### 前置条件

- Docker Engine 24+ & Docker Compose v2
- 拥有 Cloudflare 托管的域名
- 公网 IP（用于 WireGuard）

### 1. 克隆配置

```bash
git clone <repo-url> homelab-network
cd homelab-network
```

### 2. 配置环境变量

```bash
cp .env.example .env
nano .env
```

**必填项:**

| 变量 | 说明 |
|------|------|
| `WG_HOST` | 你的公网 IP 或域名 |
| `WG_PASSWORD_HASH` | WireGuard Web UI 密码 |
| `CF_API_TOKEN` | Cloudflare API Token |
| `CF_DOMAINS` | 需要 DDNS 的域名 |

### 3. 修复 DNS 端口冲突

```bash
# 检测状态
sudo bash setup.sh --check

# 应用修复（禁用 systemd-resolved 53 端口）
sudo bash setup.sh --apply
```

### 4. 启动服务栈

```bash
docker compose up -d
```

### 5. 验证

```bash
# 检查所有服务健康状态
docker compose ps

# 测试 DNS 解析
dig @127.0.0.1 google.com +short

# AdGuard Home Web UI
curl -sI http://127.0.0.1:3000 | head -1
```

---

## 📦 服务详解

### 1. AdGuard Home — DNS 过滤 + 广告屏蔽

| 项目 | 值 |
|------|-----|
| 镜像 | `docker.m.daocloud.io/adguard/adguardhome:v0.107.52` |
| Web UI | `http://<host>:3000` |
| DNS 端口 | 53 (TCP/UDP) |
| DoT 端口 | 853 (可选) |
| 上游 DNS | Unbound (172.22.0.10) |

**首次设置 (Web UI 引导):**

1. 访问 `http://<SERVER_IP>:3000`
2. 创建管理员账户
3. DNS 设置 → 上游 DNS 服务器: `172.22.0.10`
4. 启用 DNSSEC
5. 应用过滤列表（见下方推荐）

#### AdGuard Home 过滤列表推荐

```
# 中文广告过滤
https://anti-ad.net/easylist.txt
https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt

# 英文通用
https://easylist.to/easylist/easylist.txt
https://easylist.to/easylist/easyprivacy.txt

# 恶意域名
https://urlhaus.abuse.ch/downloads/hostfile/
https://someonewhocares.org/hosts/zero/hosts

# 跟踪器
https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt
```

---

### 2. WireGuard Easy — VPN 服务端

| 项目 | 值 |
|------|-----|
| 镜像 | `ghcr.io/wg-easy/wg-easy:14` |
| Web UI | `http://<host>:51821` |
| VPN 端口 | 51820/UDP |
| 客户端 DNS | AdGuard Home (172.22.0.11) |
| 默认客户端 IP | 10.8.0.x |

**添加客户端:**

1. 访问 `http://<host>:51821` 并使用 `WG_PASSWORD_HASH` 登录
2. 点击 "New Client" 创建新客户端
3. 扫描二维码 或 下载配置文件
4. 在客户端导入配置即可连接

**生成 bcrypt 密码:**

```bash
echo "你的密码" | docker run --rm -i ghcr.io/wg-easy/wg-easy:14 wgpw
```

#### WireGuard Split Tunneling

**全局代理模式 (默认):**

```ini
# .env
WG_ALLOWED_IPS=0.0.0.0/0, ::/0
# 所有流量都走 VPN → 适合隐私保护
```

**Split Tunnel 模式 (推荐家庭使用):**

```ini
# .env
WG_ALLOWED_IPS=172.22.0.0/16, 192.168.0.0/16, 10.0.0.0/8
# 仅内网流量走 VPN → 外网直连，速度更快
```

---

### 3. Cloudflare DDNS — 动态 DNS

| 项目 | 值 |
|------|-----|
| 镜像 | `ghcr.io/favonia/cloudflare-ddns:1.14.0` |
| 更新频率 | 每 5 分钟 |
| 支持协议 | IPv4 + IPv6 双栈 |

**Cloudflare API Token 获取:**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 右上角 → My Profile → API Tokens → Create Token
3. 选择 "Edit zone DNS" 模板
4. 选择目标 Zone → Continue → Create Token
5. 将 Token 填入 `.env` 的 `CF_API_TOKEN`

**多域名配置:**

```bash
# .env - 逗号分隔
CF_DOMAINS=example.com,*.example.com,vpn.example.com
```

---

### 4. Unbound — 递归 DNS 解析器

| 项目 | 值 |
|------|-----|
| 镜像 | `docker.m.daocloud.io/mvance/unbound:1.21.1` |
| 类型 | 递归解析（非转发） |
| DNSSEC | 启用 |
| 缓存 | 100M msg + 200M rrset |

Unbound 作为 AdGuard Home 的唯一上游，直接向 DNS 根服务器查询，不依赖 Google/Cloudflare 等第三方解析器。这确保：

- 最高隐私性：无第三方窥探 DNS 查询
- DNSSEC 验证：防止 DNS 劫持/投毒
- 本地缓存：加速重复查询

---

## 🔌 端口规划

| 端口 | 协议 | 服务 | 说明 |
|------|------|------|------|
| 53 | TCP/UDP | AdGuard Home | DNS 查询 |
| 80 | TCP | AdGuard Home Web UI | 通过 3000 映射 |
| 853 | TCP | AdGuard Home DoT | DNS-over-TLS (可选) |
| 3000 | TCP | AdGuard Home Web UI | 管理界面 |
| 51820 | UDP | WireGuard | VPN 隧道 |
| 51821 | TCP | WireGuard Web UI | VPN 管理 |

**路由器防火墙规则:**

```
WAN → LAN:
  51820/UDP  → <服务器 IP>:51820   # WireGuard
  53/UDP     → <服务器 IP>:53      # DNS (可选，仅在公网 DNS 场景)
  53/TCP     → <服务器 IP>:53      # DNS (可选)
```

---

## 📝 配置指南

### 路由器 DNS 配置

将路由器的 DNS/DHCP 设置指向 AdGuard Home，使所有设备自动获得广告过滤：

**OpenWrt / ImmortalWrt:**

```
Network → DHCP and DNS → DNS forwardings → 172.22.0.11
或 Network → Interfaces → LAN → Use custom DNS servers → <服务器 IP>
```

**AsusWRT / Merlin:**

```
WAN → Internet Connection → DNS Server → <服务器 IP>
LAN → DHCP Server → DNS Server → <服务器 IP>
```

**TP-Link / 普通路由器:**

```
DHCP → DNS 服务器 → 手动 → <服务器 IP>
```

**通用方案 (推荐):**

在路由器 DHCP 选项中下发 DNS：

```
DHCP Option 6 (DNS Server): <AdGuard Home IP>
```

### 验证广告过滤

```bash
# 测试已知广告域名是否被拦截
nslookup doubleclick.net <服务器IP>
# 应返回 0.0.0.0 或 NXDOMAIN

# 测试正常域名解析
nslookup github.com <服务器IP>
# 应返回真实 IP
```

---

## 🇨🇳 国内网络适配

### Docker Hub 加速

本项目 Docker Hub 镜像已默认使用 `docker.m.daocloud.io` 加速：

```yaml
# docker-compose.yml 中已配置
image: docker.m.daocloud.io/adguard/adguardhome:v0.107.52
image: docker.m.daocloud.io/mvance/unbound:1.21.1
```

### ghcr.io 镜像

GitHub Container Registry 镜像在国内可能拉取较慢，可选用以下方案：

**方案 1: 南京大学 GHCR 镜像**

```bash
# 替换 ghcr.io 为 ghcr.nju.edu.cn
docker pull ghcr.nju.edu.cn/wg-easy/wg-easy:14
docker tag ghcr.nju.edu.cn/wg-easy/wg-easy:14 ghcr.io/wg-easy/wg-easy:14
```

**方案 2: 使用代理拉取**

```bash
# 设置 Docker daemon 代理
sudo mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/http-proxy.conf << EOF
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:7890"
Environment="HTTPS_PROXY=http://127.0.0.1:7890"
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker
```

**方案 3: 手动导出导入**

```bash
# 在可访问 ghcr.io 的机器上
docker pull ghcr.io/wg-easy/wg-easy:14
docker save ghcr.io/wg-easy/wg-easy:14 -o wg-easy-14.tar

# 传输到目标服务器后
docker load -i wg-easy-14.tar
```

### DNS 上游配置（国内优化）

在国内环境中，建议在 AdGuard Home 中添加以下并行上游 DNS：

```
# 国内公共 DNS (用于国内域名快速解析)
https://dns.alidns.com/dns-query
https://doh.pub/dns-query

# 国际 DNS (用于被污染域名)
https://dns.cloudflare.com/dns-query
tls://dns.quad9.net
```

> ⚠️ 如果配置了公共上游 DNS，Unbound 的递归解析将被绕过。建议仅在国内直连场景下使用。

---

## 🔧 故障排查

### 53 端口被占用

```bash
# 查看占用 53 端口的进程
sudo ss -tulpn | grep ':53 '

# 常见占用者:
# systemd-resolved → sudo bash setup.sh --apply
# dnsmasq          → sudo systemctl stop dnsmasq && sudo systemctl disable dnsmasq
# named (bind)     → sudo systemctl stop named && sudo systemctl disable named
```

### WireGuard 无法连接

```bash
# 1. 检查端口是否开放
sudo ss -tulpn | grep 51820

# 2. 检查防火墙
sudo ufw status | grep 51820
sudo iptables -L -n | grep 51820

# 3. 查看 wg-easy 日志
docker compose logs wireguard-easy

# 4. 确认 WG_HOST 设置正确
echo $WG_HOST
```

### Cloudflare DDNS 不更新

```bash
# 查看 DDNS 日志
docker compose logs cloudflare-ddns

# 常见问题:
# - CF_API_TOKEN 权限不足 (需要 Zone.DNS Edit)
# - 域名未在 Cloudflare 托管
# - PROXIED=true 时 TTL 固定为 Auto
```

### AdGuard Home 管理界面无法访问

```bash
# 检查容器状态
docker compose ps adguardhome

# 查看日志
docker compose logs adguardhome

# 检查端口映射
docker compose port adguardhome 80
```

### 恢复 systemd-resolved

```bash
sudo bash setup.sh --restore
```

---

## 📁 文件结构

```
homelab-bounty/network/
├── docker-compose.yml   # 服务编排 (4 个镜像，版本锁定)
├── setup.sh             # 初始化脚本 (--check/--apply/--restore)
├── .env.example         # 环境变量模板
├── README.md            # 本文档
├── adguard/             # AdGuard Home 持久化数据
│   ├── conf/            #   配置文件 (自动生成)
│   └── work/            #   过滤规则 + 统计数据
├── wireguard/           # WireGuard 配置 + 客户端数据
└── unbound/             # Unbound 配置
    └── unbound.conf     #   递归 DNS 配置 (自动生成)
```

---

## ✅ 验收标准

- [x] AdGuard Home DNS 解析正常，可过滤广告
- [x] WireGuard 客户端可接入并访问内网服务
- [x] DDNS 成功更新 Cloudflare DNS 记录
- [x] `setup.sh` 正确处理 systemd-resolved 冲突
- [x] README 包含路由器 DNS 配置说明

---

## 📄 License

MIT — 与 homelab-stack 保持一致

---

> Generated for [HomeLab Stack Bounty #4](https://github.com/illbnm/homelab-stack/issues/4)  
> Image versions locked — no `latest` tags  
> CN mirror: `docker.m.daocloud.io`
