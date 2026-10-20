@echo off
REM Archivo de prueba del tema: Batch.
setlocal enabledelayedexpansion

set "SECTOR=Research"
set /a CLEARANCE=5
set AGENTS=Jesse Emily Ahti

:: Comprueba el nivel de acceso.
if %CLEARANCE% GEQ 3 (
    echo Acceso concedido al sector %SECTOR%
) else (
    echo Acceso denegado & exit /b 1
)

for %%A in (%AGENTS%) do (
    set "NAME=%%A"
    echo Agente: !NAME!
)

call :report "OOP-0001" 7
goto :eof

:report
echo Objeto %~1 con amenaza %~2 >> "%TEMP%\bureau.log"
exit /b 0
