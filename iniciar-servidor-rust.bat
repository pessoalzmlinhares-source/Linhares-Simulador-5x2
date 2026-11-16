@echo off
cd /d "%~dp0"
where cargo >nul 2>nul
if errorlevel 1 (echo Rust/Cargo nao instalado. Para usar sem instalar, execute ABRIR_PROGRAMA.bat & pause & exit /b 1)
cargo run --release
pause
