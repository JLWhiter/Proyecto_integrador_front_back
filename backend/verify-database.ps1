param([string]$Maven = 'mvn')
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & $Maven test-compile org.apache.maven.plugins:maven-dependency-plugin:3.10.0:build-classpath '-Dmdep.outputFile=target/classpath.txt'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar la prueba' }
    $integrationClasspath = 'target/test-classes;target/classes;' + (Get-Content target/classpath.txt -Raw).Trim()
    & java -cp $integrationClasspath pe.edu.utp.techzone.DatabaseIntegrationCheck
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la prueba de integracion' }
    & java -cp $integrationClasspath pe.edu.utp.techzone.ApiPeruIntegrationCheck
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la prueba HTTP de API Peru' }
} finally {
    Pop-Location
}
