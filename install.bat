@echo off
chcp 65001 > nul

echo =================================================
echo      INSTALADOR DE DEPENDENCIAS DA APLICACAO
echo =================================================
echo.
echo Este script ira baixar e instalar todas as
echo dependencias necessarias para rodar o projeto.
echo Este processo pode levar alguns minutos.
echo.
echo Pressione qualquer tecla para comecar...
pause > nul
echo.
echo -- Iniciando instalacao com npm... --
echo.

npm install

echo.
echo -- Verificacao final das dependencias principais... --
npm list --depth=0
echo.
echo =================================================
echo      INSTALACAO CONCLUIDA!
echo =================================================
echo.
echo Pressione qualquer tecla para fechar esta janela.
pause > nul