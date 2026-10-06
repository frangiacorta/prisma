@echo off
setlocal
cd /d "%~dp0"
if exist "Sfera-cava-loop-1440p-60fps.mp4" goto verifica
echo Ricompongo il video originale. Attendi qualche secondo...
copy /b "Sfera-cava-video.part01"+"Sfera-cava-video.part02" "Sfera-cava-loop-1440p-60fps.mp4" >nul
if errorlevel 1 goto errore
:verifica
echo Verifico che il video sia completo...
powershell -NoProfile -Command "$h=(Get-FileHash -LiteralPath 'Sfera-cava-loop-1440p-60fps.mp4' -Algorithm SHA256).Hash; if($h -ne 'd769ec020197f46cfc31f2d08f81abe193f363886e662b0b8bc9edb4cf9f17fd'){exit 1}"
if errorlevel 1 goto errore
echo Video pronto: Sfera-cava-loop-1440p-60fps.mp4
start "" "Sfera-cava-loop-1440p-60fps.mp4"
exit /b 0
:errore
echo ERRORE: scarica ed estrai tutto lo ZIP, poi riprova.
echo Se il video esiste gia ma e incompleto, spostalo prima di riprovare.
pause
exit /b 1
