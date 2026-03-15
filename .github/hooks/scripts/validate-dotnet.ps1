$ErrorActionPreference = 'Stop'

function Write-HookResult {
    param(
        [string]$SystemMessage,
        [string]$StopReason,
        [int]$ExitCode = 0
    )

    $payload = [ordered]@{ continue = $true }
    if ($SystemMessage) {
        $payload.systemMessage = $SystemMessage
    }
    if ($StopReason) {
        $payload.stopReason = $StopReason
    }

    $payload | ConvertTo-Json -Compress | Write-Output
    exit $ExitCode
}

function Invoke-DotNetCommand {
    param(
        [string]$Label,
        [string[]]$Arguments
    )

    $stdoutPath = [System.IO.Path]::GetTempFileName()
    $stderrPath = [System.IO.Path]::GetTempFileName()

    try {
        $process = Start-Process -FilePath $dotnetCommand.Source -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        $stdout = Get-Content -Raw $stdoutPath
        $stderr = Get-Content -Raw $stderrPath
    }
    finally {
        Remove-Item $stdoutPath, $stderrPath -ErrorAction SilentlyContinue
    }

    if ($stdout -and $stdout.Trim().Length -gt 0) {
        [Console]::Error.WriteLine($stdout.TrimEnd())
    }

    if ($stderr -and $stderr.Trim().Length -gt 0) {
        [Console]::Error.WriteLine($stderr.TrimEnd())
    }

    if ($process.ExitCode -ne 0) {
        Write-HookResult -StopReason "validate-dotnet hook failed during $Label." -ExitCode 2
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
Set-Location $repoRoot

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCommand) {
    Write-HookResult -SystemMessage 'validate-dotnet hook skipped: git is not available.'
}

$solutionPath = Join-Path $repoRoot 'Tenax.slnx'
if (-not (Test-Path $solutionPath)) {
    Write-HookResult -SystemMessage 'validate-dotnet hook skipped: Tenax.slnx was not found.'
}

$dotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnetCommand) {
    Write-HookResult -SystemMessage 'validate-dotnet hook skipped: dotnet SDK is not available.'
}

$trackedChanges = @()
try {
    $trackedChanges = @(git diff --name-only --relative HEAD 2>$null)
}
catch {
    $trackedChanges = @()
}

$untrackedChanges = @()
try {
    $untrackedChanges = @(git ls-files --others --exclude-standard 2>$null)
}
catch {
    $untrackedChanges = @()
}

$allChanges = @($trackedChanges + $untrackedChanges | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Sort-Object -Unique)
$dotnetChangePattern = '^(src/|tests/|.*\.(cs|csproj|props|targets|sln|slnx)$|Directory\.Build\.(props|targets)|global\.json|nuget\.config)$'
$hasDotnetChanges = $allChanges | Where-Object { ($_ -replace '\\', '/') -match $dotnetChangePattern } | Select-Object -First 1

if (-not $hasDotnetChanges) {
    Write-HookResult -SystemMessage 'validate-dotnet hook skipped: no .NET-relevant workspace changes detected.'
}

$formatArgs = @('format', $solutionPath, '--no-restore')
$buildArgs = @('build', $solutionPath, '--nologo', '--no-restore')

Invoke-DotNetCommand -Label 'dotnet format' -Arguments $formatArgs

Invoke-DotNetCommand -Label 'dotnet build' -Arguments $buildArgs

Write-HookResult -SystemMessage 'validate-dotnet hook ran dotnet format and dotnet build successfully.'