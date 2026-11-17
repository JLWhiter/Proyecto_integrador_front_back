param(
    [string]$Maven = 'mvn',
    [ValidateSet('h2', 'mysql')][string]$Profile = 'h2',
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
$backendDirectory = Join-Path $projectDirectory 'backend'
$frontendDirectory = Join-Path $projectDirectory 'frontend'
$runDirectory = Join-Path $frontendDirectory '.run'

foreach ($port in @(8080, 5173)) {
    $probe = New-Object System.Net.Sockets.TcpClient
    try {
        $probe.Connect('127.0.0.1', $port)
        throw "El puerto $port ya esta ocupado. No se detendra el proceso existente."
    } catch [System.Net.Sockets.SocketException] {
        # Expected when the port is free.
    } finally { $probe.Dispose() }
}

Push-Location $backendDirectory
try {
    if (-not $SkipBuild) {
        & $Maven compile org.apache.maven.plugins:maven-dependency-plugin:3.10.0:build-classpath '-Dmdep.outputFile=target/classpath.txt'
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el backend' }
    }
    if (-not (Test-Path 'target/classpath.txt')) { throw 'Primero compila sin -SkipBuild' }
    $runtimeClasspath = (Join-Path $backendDirectory 'target/classes') + ';' + (Get-Content target/classpath.txt -Raw).Trim()
} finally { Pop-Location }

if (-not (Test-Path (Join-Path $frontendDirectory 'node_modules/vite/bin/vite.js'))) {
    throw 'Ejecuta npm ci dentro de frontend antes de iniciar'
}
New-Item -ItemType Directory -Force $runDirectory | Out-Null
$javaExecutable = (Get-Command java -ErrorAction Stop).Source
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$backendProcess = $null
$frontendProcess = $null
try {
    $backendProcess = Start-Process -FilePath $javaExecutable -ArgumentList @(
        '-cp', ('"' + $runtimeClasspath + '"'), 'pe.edu.utp.techzone.TechzoneBackendApplication',
        "--spring.profiles.active=$Profile", '--spring.jpa.show-sql=false', '--logging.level.root=INFO'
    ) -WorkingDirectory $backendDirectory -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $backendDirectory 'target/server.log') `
      -RedirectStandardError (Join-Path $backendDirectory 'target/server-error.log')
    $frontendProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @(
        'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'
    ) -WorkingDirectory $frontendDirectory -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $runDirectory 'vite.log') `
      -RedirectStandardError (Join-Path $runDirectory 'vite-error.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        if ($backendProcess.HasExited -or $frontendProcess.HasExited) { throw 'Un servidor termino; revisa los logs' }
        try {
            $null = Invoke-RestMethod 'http://127.0.0.1:8080/api/catalogos/parametros' -TimeoutSec 1
            $null = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5173/' -TimeoutSec 1
            $ready = $true
            break
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw 'Los servidores no respondieron a tiempo; revisa los logs' }
    @{ backend = $backendProcess.Id; frontend = $frontendProcess.Id; profile = $Profile } |
        ConvertTo-Json | Set-Content (Join-Path $runDirectory 'processes.json')
    Write-Output "Proyecto ejecutandose: http://localhost:5173 (API http://localhost:8080/api, perfil $Profile)"
    Write-Output "PID backend: $($backendProcess.Id); PID frontend: $($frontendProcess.Id)"
} catch {
    # Only stop processes created by this invocation.
    if ($frontendProcess -and -not $frontendProcess.HasExited) { $frontendProcess.Kill() }
    if ($backendProcess -and -not $backendProcess.HasExited) { $backendProcess.Kill() }
    throw
}
