@echo off
rem SEO Optimizer - Windows cift tiklamali baslatici (interaktif)
rem Bu betik EXE'yi calistirip islem bitince pencereyi acik tutar.
rem Kullanici audit <URL> gibi komutlari yazip Enter'a basar.

title SEO Optimizer
color 0A
chcp 65001 >nul
cd /d "%~dp0"

rem Ayni klasordeki EXE dosyasinin tam yolunu bul
set "EXE_PATH=%~dp0seo-audit-win-x64.exe"
if not exist "%EXE_PATH%" set "EXE_PATH=%~dp0seo-audit.exe"

if not exist "%EXE_PATH%" (
    echo HATA: seo-audit EXE'si bulunamadi.
    echo Lutfen seo-audit-win-x64.exe dosyasini bu klasore kopyalayin.
    echo.
    pause
    exit /b 1
)

echo ============================================
echo   SEO OPTIMIZER - Yapay Zeka Destekli SEO
echo ============================================
echo.
echo Asagidakilerden birini yapin:
echo   audit ^<URL^>           tam site SEO denetimi (rapor tarayicida acilir)
echo   audit ^<URL^> --pdf     denetim + PDF rapor
echo   compare ^<URL^> ^<URL2^>   rakip karsilastirma
echo   sitemap ^<URL^>         XML sitemap uret
echo   config                AI API anahtari ayarla
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
"%EXE_PATH%" %INPUT%
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
