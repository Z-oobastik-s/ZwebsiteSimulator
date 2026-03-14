@echo off
setlocal EnableDelayedExpansion

rem Work from script directory (project root)
cd /d "%~dp0."

set "REPO_URL=https://github.com/Z-oobastik-s/ZwebsiteSimulator.git"
set "BRANCH=main"

echo.
echo ======================================
echo   GitHub Upload Script
echo ======================================
echo.
echo Working dir: %CD%
echo.

echo [1/7] Checking token...
if not exist "github-token.txt" (
    echo [ERROR] File github-token.txt not found!
    pause
    exit /b 1
)
set /p GITHUB_TOKEN=<github-token.txt
if "%GITHUB_TOKEN%"=="" (
    echo [ERROR] Token is empty!
    pause
    exit /b 1
)
echo [OK] Token loaded
echo.

echo [2/7] Checking Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git not installed! Get it: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo [OK] Git found
echo.

echo [3/7] Init repo...
if not exist ".git" (
    git init -b %BRANCH%
    echo [OK] Repo created
) else (
    echo [OK] Repo exists
)
echo.

echo [3.5/7] Config user name and email...
git config user.name >nul 2>&1
if %errorlevel% neq 0 (
    git config user.name "Zoobastiks"
)
git config user.email >nul 2>&1
if %errorlevel% neq 0 (
    git config user.email "zoobastiks@example.com"
)
echo [OK] User configured
echo.

echo [4/7] Check .gitignore...
if exist ".gitignore" (
    echo [OK] .gitignore exists
) else (
    echo [WARNING] .gitignore not found!
)
echo.

echo [5/7] Setup remote...
set "REPO_URL_WITH_TOKEN=https://%GITHUB_TOKEN%@github.com/Z-oobastik-s/ZwebsiteSimulator.git"
git remote | findstr "origin" >nul 2>&1
if %errorlevel% equ 0 (
    git remote set-url origin "%REPO_URL_WITH_TOKEN%"
    echo [OK] Remote updated
) else (
    git remote add origin "%REPO_URL_WITH_TOKEN%"
    echo [OK] Remote added
)
echo.

echo [6/7] Update files and commit...
if not exist ".gitattributes" (
    set "GITATTR=* text=auto eol=lf"
    echo !GITATTR!> .gitattributes
    echo [OK] .gitattributes created
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "& {$ext = @('.html','.htm','.js','.css','.json','.md','.txt','.xml','.svg','.yml','.yaml','.csv','.gitignore','.gitattributes'); $files = (git ls-files 2>$null) | Where-Object { $_ -and (Test-Path $_) -and ($ext -contains [IO.Path]::GetExtension($_)) }; $mode = if (Test-Path .sync-mode) { (Get-Content .sync-mode -Raw).Trim() } else { 'add' }; foreach ($f in $files) { try { $c = [IO.File]::ReadAllText($f); if ($mode -eq 'add') { $c = $c + [char]10 } else { $c = $c.TrimEnd([char]13,[char]10) + [char]10 }; [IO.File]::WriteAllText($f, $c) } catch {} }; $next = if ($mode -eq 'add') { 'trim' } else { 'add' }; Set-Content -Path .sync-mode -Value $next -NoNewline }"
echo [OK] Files updated for commit
git add -A
git reset HEAD scripts/*.bat 2>nul
git reset HEAD scripts/*.sh 2>nul
git reset HEAD serve.bat 2>nul
git reset HEAD serve.sh 2>nul
git reset HEAD SEO_SETUP.md 2>nul
git add index.html .gitignore .gitattributes LICENSE README.md robots.txt sitemap.xml 2>nul
git add assets/ lessons/ scripts/ cyberpunk/ 2>nul
if exist googled350aa406ac3b68d.html git add googled350aa406ac3b68d.html 2>nul

for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"
if not defined HAS_CHANGES (
    echo [OK] No changes, commit skipped
) else (
    git status --short
    git commit -m "Update: %date% %time%"
    if %errorlevel% equ 0 (
        echo [OK] Commit created
    ) else (
        echo [WARNING] Commit problem
    )
)
echo.

echo [7/7] Push to GitHub (force)...
for /f "tokens=*" %%a in ('git branch --show-current') do set "CURRENT_BRANCH=%%a"
if not defined CURRENT_BRANCH (
    git branch -M %BRANCH%
    set "CURRENT_BRANCH=%BRANCH%"
)
if /I not "%CURRENT_BRANCH%"=="%BRANCH%" (
    git branch -M %BRANCH%
    set "CURRENT_BRANCH=%BRANCH%"
)

echo Pushing to GitHub, branch %BRANCH%...
git push -u origin %BRANCH% --force
set "PUSH_SUCCESS=%errorlevel%"

if %PUSH_SUCCESS% equ 0 (
    echo.
    echo [SUCCESS] Pushed to GitHub!
    echo Repo: https://github.com/Z-oobastik-s/ZwebsiteSimulator
    echo.
) else (
    echo.
    echo [ERROR] Push failed!
    echo Check: token, repo rights, network.
    echo.
    pause
    exit /b 1
)

echo Removing token from config...
git remote set-url origin "%REPO_URL%"
echo [OK] Done
echo.
echo ======================================
echo   Upload complete!
echo ======================================
echo.
pause
