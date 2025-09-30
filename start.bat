@echo off
chcp 65001 > nul

echo =================================================
echo      INICIALIZADOR DA APLICACAO
echo =================================================
echo.
echo Este script ira iniciar o servidor de desenvolvimento
echo e abrir a aplicacao no seu navegador.
echo.
echo Mantenha esta janela aberta para que o servidor
echo continue rodando.
echo.

REM Define a porta. Padrão 8000 se não estiver no .env
set PORT=8000
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if /i "%%a"=="PORT" set PORT=%%b
    )
)

echo -- Iniciando o servidor na porta %PORT%... --
echo.

REM Inicia o servidor em uma nova janela para não bloquear o script
start "Servidor Node.js" npm run dev

echo Aguardando o servidor iniciar...
timeout /t 10 /nobreak > nul

echo -- Abrindo a aplicacao no navegador... --
start http://localhost:%PORT%

echo.
echo =================================================
echo      Servidor iniciado.
echo =================================================
echo.
echo A janela do servidor foi aberta separadamente.
echo Voce pode fechar esta janela agora.
echo.
pause > nul