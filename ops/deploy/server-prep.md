# 服务器一次性准备 runbook(SSH 部署目标,前端)

这份文档只描述 **第一次** 把你的 Linux 服务器准备好,好让
`.github/workflows/deploy.yml`(本仓库)能 SSH 上去、`docker compose pull
&& up` 把 frontend 跑起来。

跑过一次之后,日常部署就只是到 fork 仓库的 **Actions 页面点一下
"Run workflow"**。

> 整份文档对应的是 `lscpu` 显示 **amd64 / GenuineIntel / Skylake
> IBRS**、`dpkg --print-architecture = amd64`(Debian/Ubuntu 系)的机器。
> 其他发行版(CentOS/RHEL/Alma 等)把第 1 步换成对应的 `dnf` /
> `yum` 命令即可。

---

## 0. 你要做几次:一次

整份 runbook 是一次性开销。之后所有部署都从 GitHub Actions 触发。

---

## 1. 装 Docker + Compose v2

服务器上需要 Docker Engine 23+ 和 `docker compose`(v2 plugin)。

**Debian/Ubuntu 默认源(最简单)**:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 注意:Ubuntu 24.04 / Debian 12 用 $VERSION_CODENAME,旧版发行为 bookworm/jammy 等
. /etc/os-release && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$ID $VERSION_CODENAME stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

> 你也可以用国内镜像(`download.docker.com` 国内某些云会慢),这里不展开。

装完验证:

```bash
docker --version
docker compose version
docker info | head -20
```

看到 `Server Version: 24.x.x` / `docker compose version 2.x` 就 OK。

---

## 2. 准备一个非 root 的 `deploy` 用户

```bash
sudo useradd -m -s /bin/bash -G docker deploy
sudo passwd -l deploy    # 关掉密码登录(SSH 走 key 认证)

sudo mkdir -p /opt/quantdinger
sudo chown deploy:deploy /opt/quantdinger
sudo chmod 755 /opt/quantdinger
```

切到 deploy 用户去配 SSH:

```bash
sudo -u deploy -i
```

---

## 3. 在 deploy 用户上生成 SSH key

```bash
ssh-keygen -t ed25519 -C "github-deploy" -N "" -f ~/.ssh/github_deploy
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys ~/.ssh/github_deploy
chmod 644 ~/.ssh/github_deploy.pub
```

- `-N ""` 是空 passphrase,这样 GitHub Actions 才能用,这是必须的。
- **`.pub` 留在服务器**,**无 `.pub` 的私钥全文** 粘到 GitHub Secrets(下一步)。

退出 deploy 用户:

```bash
exit
```

---

## 4. 在 fork 仓库 Settings 配 Secrets

打开: `https://github.com/<你的 fork owner>/QuantDinger-Vue/settings/secrets/actions`

点 **New repository secret**,逐个添加:

| Secret name | 内容 |
|---|---|
| `DEPLOY_SSH_KEY` | `~/.ssh/github_deploy` **私钥**全文,包含 `-----BEGIN OPENSSH PRIVATE KEY-----` 和尾部换行 |
| `SERVER_HOST` | 服务器的 IP 或域名,例如 `1.2.3.4` 或 `quantdinger.example.com` |
| `SERVER_USER` | `deploy` |
| `SERVER_PORT` | `22`(默认;改 SSH 端口才需要) |

不需要 `GHCR_PAT` / `DOCKERHUB_TOKEN` 之类的——`GITHUB_TOKEN` 对你自己 fork owner
名下的 GHCR 默认就有 read+write,workflow 已经声明了 `packages: write`。

---

## 5. 首次拉 `docker-compose.ghcr.yml`

> **重要**:这个文件跟 backend 仓库共用。如果你已经为 backend deploy
> 拉过,这里**跳过**。否则:

```bash
sudo -u deploy bash
cd /opt/quantdinger
curl -fsSL "https://raw.githubusercontent.com/<你的 fork owner>/QuantDinger/main/docker-compose.ghcr.yml" \
  -o docker-compose.ghcr.yml
chmod 644 docker-compose.ghcr.yml
```

**关键**:`<你的 fork owner>` 必须跟 fork owner 一致(即 GitHub 用户名),
否则 docker-compose pull 后端镜像时找不到 namespace。

---

## 6. 写 `/opt/quantdinger/.env`

这是前后端**共用**的编排配置。如果已经为 backend deploy 写过,这里**只
追加**缺失的 FRONTEND_IMAGE 一行。

```bash
cd /opt/quantdinger
touch .env

# 把下面这段写进去(把 owner 换成你 fork 的 GitHub 用户名):
cat >> .env <<'EOF'
BACKEND_IMAGE=ghcr.io/<你的 fork owner>/quantdinger-backend
FRONTEND_IMAGE=ghcr.io/<你的 fork owner>/quantdinger-frontend
IMAGE_TAG=manual-latest
FRONTEND_TAG=manual-latest
BACKEND_TAG=manual-latest
EOF

chmod 600 .env
```

- `BACKEND_IMAGE`:之前为 backend deploy 设过,**别删**
- `FRONTEND_IMAGE`:本次新加,把它指向你的 fork,前端 deploy 会重写
  `IMAGE_TAG` / `FRONTEND_TAG`
- `IMAGE_TAG` / `FRONTEND_TAG` / `BACKEND_TAG`:deploy workflow 会自动覆盖

---

## 7. (可选)前端私仓镜像地址

> **重要**:本 workflow 是 QuantDinger-Vue **前端**仓库的 deploy。Vue
> 仓库的 Dockerfile build 出来的镜像只装这个前端。如果你的 fork 在
> 另外前端 repo,改下 UI 镜像:**完全没改 build step**(同一份
> `.github/workflows/deploy.yml` 就行)。

不需要做任何事 — 你已经 fork 了 QuantDinger-Vue 本仓库。

---

## 8. 首次启动整个 stack(只启 postgres / redis / backend / frontend)

> **注意**:如果 backend deploy 已经把 postgres / redis / backend 起来了,这里
> 只启 frontend 即可:

```bash
cd /opt/quantdinger
sudo -u deploy docker compose -f docker-compose.ghcr.yml up -d frontend

# 看 health
sudo -u deploy docker compose -f docker-compose.ghcr.yml ps frontend
```

期望 `frontend` 状态 `Up`(nginx 启动快,几乎立刻 healthy)。

如果你之前**没有**起 postgres / redis,迁就先用 backend 那边的安装流程。

---

## 9. 第一次 GitHub Actions Run workflow 演练

打开 fork repo → **Actions** → 选 **Build and deploy frontend to
personal server** → **Run workflow** → 选 `main` branch:

- `image_tag`: **留空**(自动 `manual-<short-sha>`)
- `host`: **留空**
- `deploy_dir`: **留空**(默认 `/opt/quantdinger`)
- `prune`: 不勾
- `dry_run`: ✅ **勾上**

点绿色按钮。

期望:
- **Build & push frontend image** 步骤绿(7~15 分钟,视 GHA runner 网络)。
- **Confirm image is reachable in GHCR** 步骤绿(说明 GHCR 上有
  `manual-xxxxxxx` 这个 tag)。
- workflow 提早结束,**SSH 没有跑**。

成功后,在 https://github.com/<你的 fork owner>?tab=packages 能看到
`quantdinger-frontend / manual-xxxxxxx` 这个包。

---

## 10. 真实部署

第二次 Run workflow,这次 `dry_run` **不勾**。SSH 现在上场。

跑完后:

```bash
sudo -u deploy docker compose -f /opt/quantdinger/docker-compose.ghcr.yml ps frontend
```

应看到 `quantdinger-frontend` 状态 `Up`,时间是你刚才点 Run 之后没几
分钟内。

如果你**之前**已经在 `/opt/quantdinger/.env` 把 FRONTEND_PORT 设成
`0.0.0.0:8888`(或类似),浏览器访问 `http://<SERVER_IP>:8888` 应该看到
你的前端。如果 FRONTEND_PORT 还是默认 `127.0.0.1:8888`,只能从 server
本地 curl,不能从外部访问。

---

## 故障兜底

- **SSH connect timeout**:多半是 `SERVER_HOST` 写错、服务器防火墙挡了
  `22`、或者 `SERVER_PORT` 跟 sshd 配置对不上。先 `ssh deploy@<host>`(你的
  开发机)通电话下。
- **`Permission denied (publickey)`**:`DEPLOY_SSH_KEY` 粘错(漏换行)、或
  `~/.ssh/authorized_keys` 没那把 pubkey。
- **`manifest unknown`**:你 `image_tag` 输入了一个 GHCR 上没推过的 tag。
  留空让 workflow 自动算。
- **前端容器 exit**:`docker compose logs frontend | tail -50` 看 — 大概率是
  nginx 启动失败、BACKEND_URL 写错。

---

## 关键文件 map(给以后自己看的备忘)

| 文件 | 谁管 |
|---|---|
| `/opt/quantdinger/.env` | workflow 写 `IMAGE_TAG` / `FRONTEND_TAG` 等,你写 `BACKEND_IMAGE` / `FRONTEND_IMAGE` 等 |
| `/opt/quantdinger/docker-compose.ghcr.yml` | workflow 自动下载;你修改可永久保留 |
| `~/.ssh/github_deploy` | 私钥,**永远不要上传到任何仓库** |
| `~/.ssh/github_deploy.pub` | 公钥,留在服务器 `~/.ssh/authorized_keys` |