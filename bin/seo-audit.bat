@echo off
rem SEO Optimizer — Windows çift tıklama başlatıcı (interaktif)
rem Bu betik EXE'yi çalıştırıp işlem bitince pencereyi açık tutar.

title SEO Optimizer
color 0A
chcp 65001 >nul

rem Aynı klasördeki EXE'yi bul
if exist "%~dp0seo-audit-win-x64.exe" (
    set "EXE=%~dp0seo-audit-win-x64.exe"
) else if exist "%~dp0seo-audit.exe" (
    set "EXE=%~dp0seo-audit.exe"
) else (
    echo HATA: seo-audit EXE'si bulunamadı.
    echo Lütfen seo-audit-win-x64.exe dosyasini bu klasore kopyalayin.
    echo.
    pause
    exit /b 1
)

echo ============================================
echo   SEO OPTIMIZER - Yapay Zeka Destekli SEO
echo ============================================
echo.
echo Asagidakilerden birini yapin:
echo   audit <URL>        tam site SEO denetimi (rapor tarayicida acilir)
echo   audit <URL> --pdf  denetim + PDF rapor
echo   compare <URL> <URL2>  rakip karsilastirma
echo   sitemap <URL>      XML sitemap uret
echo   config             AI API anahtari ayarla
echo.
echo Ornek: audit https://example.com
echo.
echo Cikmak icin bos bir satir girip Enter'a basin.
echo ============================================
echo.

:Loop
set "INPUT="
set /p "INPUT=seo-audit> "
if not defined INPUT goto :End
"%EXE%" %INPUT%
echo.
echo -----------------------------
echo Islem bitti. Baska komut girin.
echo -----------------------------
echo.
goto :Loop

:End
echo Gorrusmek uzere!
echo.
pause
