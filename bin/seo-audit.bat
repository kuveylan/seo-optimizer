@echo off
rem SEO Optimizer — Windows çift tıklama başlatıcı
rem Bu betik, seo-audit EXE'sini çalıştırıp işlem bitince pencereyi açık tutar.
rem Böylece çift tıkladığınızda terminal anında kapanmaz.

rem Aynı klasördeki EXE'yi bul (önce seo-audit-win-x64.exe, sonra seo-audit.exe)
if exist "%~dp0seo-audit-win-x64.exe" (
    "%~dp0seo-audit-win-x64.exe" %*
) else if exist "%~dp0seo-audit.exe" (
    "%~dp0seo-audit.exe" %*
) else (
    echo HATA: seo-audit EXE'si bulunamadı.
    echo Lütfen seo-audit-win-x64.exe dosyasını bu klasöre kopyalayın.
)

echo.
pause
