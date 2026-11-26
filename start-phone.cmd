@echo off
chcp 65001 > nul
rem しふとん！ スマホ実機での確認をまとめて起動する（ダブルクリックで実行）
rem 手順の詳細は docs\mobile-device-testing.md を参照
title しふとん！ スマホ版
cd /d "%~dp0"

where pnpm > nul 2>&1
if errorlevel 1 (
  echo pnpm が見つかりません。PowerShell で npm install -g pnpm@10 を実行してから、もう一度開いてください。
  pause
  exit /b 1
)

if not exist "apps\mobile\.env" (
  echo apps\mobile\.env がありません。Supabase の URL とキーを設定してから、もう一度開いてください。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 初回のため、必要なパッケージを入れています...
  call pnpm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo 写真読み取り用の Web 版サーバーを別のウィンドウで起動します...
start "しふとん！ Web 版サーバー" cmd /k pnpm dev:web

echo.
echo スマホ版を起動します。QR コードが表示されたら、スマホで読み取ってください。
echo   iPhone  : 標準のカメラで読み取る
echo   Android : Expo Go の「Scan QR code」で読み取る
echo 終了するときは、両方のウィンドウで Ctrl + C を押すか、ウィンドウを閉じてください。
echo.
call pnpm dev:mobile
pause
