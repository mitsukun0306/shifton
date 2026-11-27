@echo off
chcp 65001 > nul
rem しふとん！ 遠くにあるスマホ（別の Wi-Fi・モバイル通信）で確認するときに使う（ダブルクリックで実行）
rem 同じ Wi-Fi のスマホなら start-phone.cmd のほうが速い。手順は docs\mobile-device-testing.md を参照
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-phone-remote.ps1"
