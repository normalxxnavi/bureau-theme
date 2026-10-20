# Archivo de prueba del tema: PowerShell.
#Requires -Version 5.1
using namespace System.Collections.Generic

<#
.SYNOPSIS
    Registra un Objeto de Poder en la Agencia.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^OOP-\d{4}$')]
    [string] $Code,

    [ValidateRange(1, 9)]
    [int] $Threat = 1
)

enum Sector { Research = 1; Containment; Maintenance }

class ObjectOfPower {
    [string] $Code
    [int] $Threat
    hidden [double] $Resonance = 0.0

    ObjectOfPower([string] $code, [int] $threat) {
        $this.Code = $code
        $this.Threat = $threat
    }

    [string] ToString() { return "$($this.Code) [$($this.Threat)]" }
}

function Test-Containment {
    param([ObjectOfPower] $Item)
    if ($Item.Threat -gt 5 -and $Item.Resonance -ge 0.5) {
        Write-Warning "Brecha en $($Item.Code)"
        return $false
    }
    return $true
}

$registry = [List[ObjectOfPower]]::new()
$registry.Add([ObjectOfPower]::new($Code, $Threat))
$registry | Where-Object { $_.Threat -ge 3 } | ForEach-Object {
    Write-Host ("{0} -> {1}" -f $_.Code, (Test-Containment $_)) -ForegroundColor Red
}
$env:BUREAU_SECTOR = [Sector]::Research
