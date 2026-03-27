@echo off
cd /d "D:\auto-trade\auto-trade\apps\web"
set VITE_DATA_SOURCE=api
set VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
set VITE_ENABLE_SSE=true
npm.cmd run dev -- --host 127.0.0.1 --port 5173 1>>"D:\auto-trade\auto-trade\.tmp\diag-web-client.out.log" 2>>"D:\auto-trade\auto-trade\.tmp\diag-web-client.err.log"
