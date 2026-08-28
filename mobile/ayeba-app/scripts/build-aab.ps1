# Génère le keystore upload (1ère fois) puis build AAB Play Store

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$android = Join-Path $root "android"
$keystore = Join-Path $root "ayeba-upload.keystore"
$props = Join-Path $android "keystore.properties"

# Trouver Java (Android Studio JBR ou PATH)
$java = $null
$candidates = @(
  "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr\bin\keytool.exe",
  "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
  "C:\Program Files\Java\*\bin\keytool.exe"
)
foreach ($c in $candidates) {
  $hit = Get-ChildItem $c -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($hit) { $java = $hit.FullName; break }
}
if (-not $java) { $java = (Get-Command keytool -ErrorAction SilentlyContinue).Source }
if (-not $java) {
  Write-Error "Java keytool introuvable. Installe Android Studio puis relance."
  exit 1
}

if (-not (Test-Path $keystore)) {
  Write-Host "Création keystore $keystore"
  & $java -genkeypair -v `
    -keystore $keystore `
    -alias ayeba `
    -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass ayeba2026 -keypass ayeba2026 `
    -dname "CN=Ayeba, OU=Mobile, O=Ayeba, L=Kinshasa, ST=Kinshasa, C=CD"
}

if (-not (Test-Path $props)) {
  @"
storePassword=ayeba2026
keyPassword=ayeba2026
keyAlias=ayeba
storeFile=../ayeba-upload.keystore
"@ | Set-Content $props -Encoding UTF8
}

Push-Location $android
try {
  .\gradlew.bat bundleRelease
  $aab = "app\build\outputs\bundle\release\app-release.aab"
  if (Test-Path $aab) {
    $dest = Join-Path $root "AYEBA-1.0.0.aab"
    Copy-Item $aab $dest -Force
    Write-Host ""
    Write-Host "=== FICHIER PLAY STORE ==="
    Write-Host $dest
    Write-Host "=========================="
  } else {
    Write-Error "Build terminé mais AAB introuvable."
    exit 1
  }
} finally {
  Pop-Location
}
