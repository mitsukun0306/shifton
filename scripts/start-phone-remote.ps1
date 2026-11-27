# しふとん！ 遠くにあるスマホ（別の Wi-Fi・モバイル通信）で確認するための起動スクリプト
# start-phone-remote.cmd から呼び出す。手順は docs\mobile-device-testing.md を参照
# 外部コマンドの警告表示で止まらないよう Continue にし、失敗は終了コードで確かめる
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$Host.UI.RawUI.WindowTitle = "しふとん！ スマホ版（遠隔）"

function Stop-WithMessage([string]$message) {
  Write-Host ""
  Write-Host $message -ForegroundColor Red
  Read-Host "Enter キーを押すと閉じます"
  exit 1
}

# インストール直後のツールも見つかるよう、PATH を読み込み直す
function Update-PathFromSystem {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "pnpm が見つかりません。PowerShell で npm install -g pnpm@10 を実行してから、もう一度開いてください。"
}
if (-not (Test-Path "apps\mobile\.env")) {
  Stop-WithMessage "apps\mobile\.env がありません。Supabase の URL とキーを設定してから、もう一度開いてください。"
}
if (-not (Test-Path "node_modules")) {
  Write-Host "初回のため、必要なパッケージを入れています..."
  pnpm install
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage "パッケージのインストールに失敗しました。" }
}

# 1. cloudflared（パソコンの Web 版サーバーをインターネットに公開するツール）
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "初回のため、cloudflared を入れています（少し時間がかかります）..."
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  Update-PathFromSystem
  if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Stop-WithMessage "cloudflared を入れられませんでした。このウィンドウを閉じて、もう一度 start-phone-remote.cmd を開いてください。それでもだめなら docs\mobile-device-testing.md の「遠くのスマホで確認する」を見てください。"
  }
}

# 2. @expo/ngrok（スマホ版の開発サーバーをインターネットに公開するツール。Expo が使う）
npm ls -g @expo/ngrok *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "初回のため、@expo/ngrok を入れています..."
  npm install -g @expo/ngrok@^4
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage "@expo/ngrok のインストールに失敗しました。" }
}

# 3. Web 版サーバー（写真の読み取りに使う）を別のウィンドウで起動
Write-Host "写真読み取り用の Web 版サーバーを別のウィンドウで起動します..."
Start-Process cmd -WorkingDirectory $root -ArgumentList "/k", "title しふとん！ Web 版サーバー & pnpm dev:web"

# 4. Web 版サーバーを公開し、発行された URL（https://～.trycloudflare.com）を受け取る
Write-Host "Web 版サーバーをインターネットに公開しています..."
$log = Join-Path $env:TEMP "shifton-cloudflared.log"
Remove-Item $log -ErrorAction SilentlyContinue
$tunnel = Start-Process cloudflared -PassThru -WindowStyle Hidden `
  -ArgumentList "tunnel", "--no-autoupdate", "--url", "http://localhost:3000" `
  -RedirectStandardError $log

try {
  $apiUrl = $null
  for ($i = 0; $i -lt 60 -and -not $apiUrl; $i++) {
    Start-Sleep -Seconds 1
    if ($tunnel.HasExited) { break }
    if (Test-Path $log) {
      $found = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" |
        Select-Object -First 1
      if ($found) { $apiUrl = $found.Matches[0].Value }
    }
  }
  if (-not $apiUrl) {
    Stop-WithMessage "Web 版サーバーを公開できませんでした。インターネットにつながっているか確認して、もう一度開いてください。（記録: $log）"
  }

  # .env より、ここで設定した値が優先される
  $env:EXPO_PUBLIC_API_BASE_URL = $apiUrl
  Write-Host ""
  Write-Host "写真読み取りの接続先: $apiUrl" -ForegroundColor Green
  Write-Host ""
  Write-Host "スマホ版を起動します。しばらくすると QR コードと exp:// で始まる URL が表示されます。"
  Write-Host "  自分の手元にある iPhone : 標準のカメラで QR コードを読み取る"
  Write-Host "  遠くにある iPhone      : exp:// で始まる URL を LINE などで送り、"
  Write-Host "                           iPhone の Safari のアドレス欄に貼り付けて開く"
  Write-Host "終了するときは、このウィンドウで Ctrl + C を押してください（Web 版のウィンドウも閉じてください）。"
  Write-Host ""

  # --clear: 前回 LAN で起動したときの接続先が残らないよう、キャッシュを消してから起動する
  pnpm dev:mobile --tunnel --clear
}
finally {
  if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue }
}
