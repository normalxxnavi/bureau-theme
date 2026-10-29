# Bureau prompt for PowerShell (Windows PowerShell 5.1 and PowerShell 7).
# CONTROL theme for VS Code - https://github.com/Normalxxnavi/bureau-theme
#
# The extension copies this file to its data folder and loads it from the Bureau
# terminal profile (or from your profile.ps1, if you install the prompt outside
# VS Code). Before each prompt it reads prompt.conf, next to it, so the changes
# you make in VS Code apply at once. With style=off it gives your prompt back.
#
# ASCII only: Windows PowerShell reads scripts without a BOM in the ANSI code
# page, so every other character is written as [char] codes.

# Not $__BureauPrompt: the lines in profile.ps1 keep the path of this script in
# $__bureauPrompt, and PowerShell names ignore case.
if (-not (Test-Path variable:global:__BureauState)) {
  $global:__BureauState = @{
    Dir = $(if ($PSScriptRoot) { $PSScriptRoot } else { $env:BUREAU_PROMPT_DIR })
    Original = $function:prompt
    LastId = -1
    Ok = $true
    Code = 0
    Fails = 0
    Stopped = $false
    DurationMs = 0
    Transient = $false
    Framed = $false
    FrameStart = [datetime]::MinValue
    ReadLine = $null
    Conf = @{}
    ConfStamp = [datetime]::MinValue
    ExtraLines = 0
    HasGit = [bool](Get-Command git -CommandType Application -ErrorAction SilentlyContinue)
    Os = $(if ($PSVersionTable.PSVersion.Major -lt 6 -or $IsWindows) { 'windows' } elseif ($IsMacOS) { 'macos' } else { 'linux' })
  }
  # Loaded in the middle of a session: the last command is not a new one.
  foreach ($__bureauH in @(Get-History -Count 1)) { $global:__BureauState.LastId = $__bureauH.Id }
  Remove-Variable __bureauH -ErrorAction SilentlyContinue
  if (Get-Command Get-PSReadLineOption -ErrorAction SilentlyContinue) {
    $global:__BureauState.ExtraLines = (Get-PSReadLineOption).ExtraPromptLineCount
  }

  # prompt.conf, read again only when it changes.
  function global:__BureauConf {
    $s = $global:__BureauState
    if (-not $s.Dir) { return $s.Conf }
    $file = [IO.Path]::Combine($s.Dir, 'prompt.conf')
    try {
      $stamp = [IO.File]::GetLastWriteTimeUtc($file)
      if ($stamp -ne $s.ConfStamp) {
        $c = @{}
        foreach ($line in [IO.File]::ReadAllLines($file)) {
          if ($line -match '^\s*([A-Za-z]+)\s*=\s*([A-Za-z0-9]*)\s*$') { $c[$Matches[1]] = $Matches[2] }
        }
        $s.Conf = $c
        $s.ConfStamp = $stamp
      }
    } catch { }
    $s.Conf
  }

  $global:__BureauGlyphs = @{
    controlPoints = [char]0xE1B0; house = [char]0xE1B1; command = [char]0xE1B2; apple = [char]0xE1B3
    tux = [char]0xE1B4; tuxMop = [char]0xE1B5; folder = [char]0xE1B6; branch = [char]0xE1B7
    time = [char]0xE1B8; error = [char]0xE1B9; clear = [char]0xE1BA; anomaly = [char]0xE1BB
    alert = [char]0xE1BC; incursion = [char]0xE1BD; board = [char]0xE1BE; classified = [char]0xE1BF
  }

  # Git: branch, commits ahead/behind and changed files. Only inside a repository
  # (no git process in other folders). Without core.fsmonitor: in a repository
  # you did not create (an archive you extracted), its .git/config could name a
  # program that git status would run on every prompt.
  function global:__BureauGit([string]$dir) {
    $d = $dir
    while ($d) {
      if ([IO.Directory]::Exists([IO.Path]::Combine($d, '.git')) -or [IO.File]::Exists([IO.Path]::Combine($d, '.git'))) { break }
      $parent = [IO.Path]::GetDirectoryName($d)
      if ($parent -eq $d) { $d = $null } else { $d = $parent }
    }
    if (-not $d) { return $null }
    $out = & git -c core.fsmonitor= --no-optional-locks status --porcelain=v2 --branch 2>$null
    if (-not $out) { return $null }
    $git = @{ Branch = ''; Ahead = 0; Behind = 0; Changes = 0 }
    $oid = ''
    foreach ($l in @($out)) {
      if ($l.StartsWith('# branch.head ')) { $git.Branch = $l.Substring(14) }
      elseif ($l.StartsWith('# branch.oid ')) { $oid = $l.Substring(13) }
      elseif ($l.StartsWith('# branch.ab ')) {
        if ($l -match '\+(\d+) -(\d+)') { $git.Ahead = [int]$Matches[1]; $git.Behind = [int]$Matches[2] }
      }
      elseif (-not $l.StartsWith('#')) { $git.Changes++ }
    }
    if ($git.Branch -eq '(detached)' -and $oid.Length -ge 7) { $git.Branch = $oid.Substring(0, 7) }
    if (-not $git.Branch) { return $null }
    $git
  }

  function global:__BureauDuration([double]$ms, [string]$lang) {
    $sec = $ms / 1000
    if ($sec -lt 10) {
      $t = ([Math]::Floor($sec * 10) / 10).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture)
      if ($lang -eq 'es') { $t = $t.Replace('.', ',') }
      return "$t s"
    }
    if ($sec -lt 60) { return ('{0} s' -f [int][Math]::Floor($sec)) }
    return ('{0} min {1} s' -f [int][Math]::Floor($sec / 60), [int][Math]::Floor($sec % 60))
  }

  # Visible width: without escape sequences (each icon takes one cell; a space
  # always follows it).
  function global:__BureauWidth([string]$text) {
    ($text -replace "$([char]27)\[[0-9;]*m", '').Length
  }

  # The prompt for some data. Separate from `prompt` so that it can be tested
  # with made-up data (test/prompt.test.js).
  function global:__BureauRender([hashtable]$d, [hashtable]$conf) {
    $e = [char]27
    $g = $global:__BureauGlyphs
    $theme = $conf['theme']
    $A = $(if ($theme -eq 'resonant') { '36' } else { '31' })
    $L = $(if ($theme -eq 'resonant') { '36' } elseif ($theme -eq 'black') { '97' } else { '31' })
    $icons = $conf['icons'] -ne '0'
    $lang = $conf['lang']
    $chev = [string][char]0x203A
    $sq = [string][char]0x25A0
    $c = { param($code, $text) "$e[$($code)m$text$e[0m" }
    $bold = { param($text) "$e[1m$text$e[22m" }
    $ic = { param($name) if ($icons) { "$($g[$name]) " } else { '' } }

    $osName = $(switch ($d.Os) { 'macos' { $conf['macos'] } 'linux' { $conf['linux'] } default { $conf['windows'] } })
    if (-not $g.ContainsKey([string]$osName)) {
      $osName = $(switch ($d.Os) { 'macos' { 'command' } 'linux' { 'tux' } default { 'controlPoints' } })
    }
    # Every icon carries the space behind it: the drawing fills both cells, centred.
    $os = $(if ($icons) { "$($g[$osName]) " } else { 'FBC' })
    $errIcon = $(if ($icons) { "$($g['error']) " } else { "$([char]0x00D7) " })

    $gitText = ''
    $countText = ''
    if ($d.Git) {
      $gitText = $d.Git.Branch
      $counts = @()
      if ($d.Git.Ahead) { $counts += "$([char]0x2191)$($d.Git.Ahead)" }
      if ($d.Git.Behind) { $counts += "$([char]0x2193)$($d.Git.Behind)" }
      if ($d.Git.Changes) { $counts += "~$($d.Git.Changes)" }
      $countText = $counts -join ' '
      if ($countText) { $gitText += " $countText" }
    }
    $dur = $(if ($d.DurationMs -ge 2000) { __BureauDuration $d.DurationMs $lang } else { '' })
    $ok = $d.Ok
    $mark = $(if ($ok) { $L } else { '91' })
    $style = $conf['style']

    if ($d.Transient) {
      $bar = ' ' * [Math]::Min([Math]::Max($d.Path.Length, 8), 32)
      $first = $(if ($icons) { (& $c '90' $g['classified']) + ' ' } else { '' }) + (& $c '7' $bar)
      if ($style -eq 'dossier') { return "$first`n" + (& $c '90' ([string][char]0x2514 + [char]0x2500)) + (& $c $L $sq) + ' ' }
      if ($style -eq 'alertLevel') { return "$first`n" + (& $c $L $chev) + ' ' }
      return $first + ' ' + (& $c $L $chev) + ' '
    }

    switch ($style) {
      'signage' {
        $s = (& $c "7;$A" " $os ") + ' ' + (& $c '7' " $(& $ic 'folder')$($d.Path) ")
        if ($gitText) { $s += ' ' + (& $c '7;33' " $(& $ic 'branch')$gitText ") }
        if ($dur) { $s += ' ' + (& $c '7;34' " $(& $ic 'time')$dur ") }
        if (-not $ok) { $s += ' ' + (& $c '7;91' " $errIcon$($d.Code) ") }
        return $s + ' ' + (& $c $mark $chev) + ' '
      }
      'dossier' {
        $open = (& $c '90' ([string][char]0x2500 + '['))
        $close = (& $c '90' ']')
        $s = (& $c '90' ([string][char]0x250C + [char]0x2500 + '[')) + (& $c $A $os) + $close + $open + "$(& $ic 'folder')$($d.Path)" + $close
        if ($gitText) { $s += $open + (& $c '33' "$(& $ic 'branch')$gitText") + $close }
        if ($dur) { $s += $open + (& $c '34' "$(& $ic 'time')$dur") + $close }
        if (-not $ok) { $s += $open + (& $c '91' "$errIcon$($d.Code)") + $close }
        return "$s`n" + (& $c '90' ([string][char]0x2514 + [char]0x2500)) + (& $c $mark $sq) + ' '
      }
      'controlPoint' {
        $s = $(if ($ok) { & $c $L $sq } else { & $c '91' ([string][char]0x25A1) })
        if ($icons) { $s += ' ' + (& $c '90' $g['folder']) }
        $s += ' ' + (& $bold $d.Leaf)
        if ($gitText) { $s += ' ' + (& $c '33' "$(& $ic 'branch')$gitText") }
        if ($dur) { $s += ' ' + (& $c '34' "$(& $ic 'time')$dur") }
        if ($ok) { $s += ' ' + (& $c $L $chev) } else { $s += ' ' + (& $c '91' "$errIcon$($d.Code) $chev") }
        return $s + ' '
      }
      'board' {
        $s = $(if ($icons) { (& $c $L $g['board']) + ' ' } else { '' })
        $s += (& $c $L '<<') + (& $bold $d.Leaf.ToUpperInvariant()) + (& $c $L '>>')
        if ($d.Git) {
          $s += ' ' + (& $c '33' "$(& $ic 'branch')($($d.Git.Branch.ToUpperInvariant()).)")
          if ($countText) { $s += ' ' + (& $c '90' "($countText.)") }
        }
        if ($dur) { $s += ' ' + (& $c '34' "$(& $ic 'time')($($dur.ToUpperInvariant()).)") }
        if (-not $ok) { $s += ' ' + (& $c '91' "$errIcon(ERROR $($d.Code).) ($($d.Code).)") }
        return $s + ' ' + (& $c $mark $chev) + ' '
      }
      'alertLevel' {
        $left = $(if ($icons) { (& $c '90' $g['folder']) + ' ' } else { '' }) + (& $bold $d.Path)
        if ($gitText) { $left += '  ' + (& $c '33' "$(& $ic 'branch')$gitText") }
        $es = $lang -eq 'es'
        if ($ok) { $lv = @('32', 'clear', $(if ($es) { 'DESPEJADO' } else { 'CLEAR' })) }
        elseif ($d.Stopped) { $lv = @('33', 'anomaly', $(if ($es) { 'ANOMAL' + [char]0x00CD + 'A' } else { 'ANOMALY' })) }
        elseif ($d.Fails -ge 3) { $lv = @('91', 'incursion', ($(if ($es) { 'INCURSI' + [char]0x00D3 + 'N DEL SISEO' } else { 'HISS INCURSION' }) + " $([char]0x00B7) $($d.Code)")) }
        else { $lv = @('91', 'alert', ($(if ($es) { 'ALERTA' } else { 'ALERT' }) + " $([char]0x00B7) $($d.Code)")) }
        $right = $(if ($dur) { (& $c '34' "$(& $ic 'time')$dur") + ' ' } else { '' })
        $right += (& $c "7;$($lv[0])" " $(& $ic $lv[1])$($lv[2]) ") + ' ' + $d.Time
        $fill = $d.Width - (__BureauWidth $left) - (__BureauWidth $right) - 3
        if ($fill -ge 1) { $line = $left + ' ' + (& $c '90' ([string][char]0x2500 * $fill)) + ' ' + $right } else { $line = $left + '  ' + $right }
        return "$line`n" + (& $c $mark $chev) + ' '
      }
    }
    return 'PS> '
  }

  # The header and closing line of each command (frame=1): the header when you
  # press Enter (in PSConsoleHostReadLine, as VS Code's shell integration does),
  # the closing line before the next prompt. Not for cd, cls, exit...
  function global:__BureauFrameWanted([string]$line) {
    if (-not $line.Trim()) { return $false }
    if ($line -match '[;|&]') { return $true }
    $first = @($line.Trim() -split '\s+')[0]
    $first -notin @('cd', 'chdir', 'sl', 'Set-Location', 'pushd', 'popd', 'Push-Location', 'Pop-Location', 'cls', 'clear', 'Clear-Host', 'exit')
  }

  # The header, -- [] command ---- 14:32 -- (separate so that it can be tested
  # with made-up data).
  function global:__BureauFrameHead([string]$line, [int]$width, [string]$time, [hashtable]$conf) {
    $e = [char]27
    $theme = $conf['theme']
    $L = $(if ($theme -eq 'resonant') { '36' } elseif ($theme -eq 'black') { '97' } else { '31' })
    $rule = [string][char]0x2500
    $rows = @($line -split "`r?`n")
    $cmd = ($rows[0] -replace '[\x00-\x1f\x7f]', ' ').Trim()
    if ($rows.Count -gt 1) { $cmd += ' ' + [char]0x2026 }
    $max = [Math]::Max($width - 19, 10)
    if ($cmd.Length -gt $max) { $cmd = $cmd.Substring(0, $max - 1) + [char]0x2026 }
    $s = "$e[90m$($rule * 2)$e[0m $e[$($L)m$([char]0x25A0)$e[0m "
    $c = 0
    if ($cmd) { $s += "$e[1m$cmd$e[22m "; $c = $cmd.Length + 1 }
    $fill = [Math]::Max($width - 15 - $c, 1)
    $s + "$e[90m$($rule * $fill) $time $($rule * 2)$e[0m"
  }

  # The closing line, -- DONE . 4.2 s -----.
  function global:__BureauFrameFoot([hashtable]$d, [int]$width, [hashtable]$conf) {
    $e = [char]27
    $g = $global:__BureauGlyphs
    $es = $conf['lang'] -eq 'es'
    if ($d.Ok) { $color = '32'; $icon = 'clear'; $label = $(if ($es) { 'COMPLETADO' } else { 'DONE' }) }
    elseif ($d.Stopped) { $color = '33'; $icon = 'anomaly'; $label = $(if ($es) { 'INTERRUMPIDO' } else { 'INTERRUPTED' }) }
    else { $color = '91'; $icon = 'error'; $label = $(if ($es) { 'FALLO' } else { 'FAILED' }) }
    $mark = $(if ($conf['icons'] -ne '0') { "$($g[$icon]) " } elseif (-not $d.Ok) { "$([char]0x00D7) " } else { '' })
    $dot = " $([char]0x00B7) "
    $info = ''
    if (-not $d.Ok -and -not $d.Stopped) { $info += $dot + $(if ($es) { 'c' + [char]0x00F3 + 'digo' } else { 'code' }) + " $($d.Code)" }
    $info += $dot + (__BureauDuration $d.DurationMs $conf['lang'])
    $rule = [string][char]0x2500
    $fill = [Math]::Max($width - 5 - $mark.Length - $label.Length - $info.Length, 1)
    "$e[90m$($rule * 2)$e[0m $e[1;$($color)m$mark$label$e[0m$e[90m$info $($rule * $fill)$e[0m"
  }

  # The header, as soon as you press Enter.
  function global:__BureauFrameStart([string]$line) {
    $s = $global:__BureauState
    $s.Framed = $false
    $conf = __BureauConf
    if ($conf['frame'] -eq '0' -or [string]$conf['style'] -notin @('signage', 'dossier', 'controlPoint', 'board', 'alertLevel')) { return }
    if (-not (__BureauFrameWanted $line)) { return }
    try { $width = $Host.UI.RawUI.WindowSize.Width } catch { $width = 0 }
    if (-not $width) { $width = 80 }
    $s.Framed = $true
    $s.FrameStart = [datetime]::UtcNow
    Write-Host (__BureauFrameHead $line $width ((Get-Date).ToString('HH:mm')) $conf)
  }

  # What the prompt shows: the folder, Git and the result of the last command.
  function global:__BureauData([bool]$ok, $code) {
    $s = $global:__BureauState
    $h = Get-History -Count 1
    $new = $h -and $h.Id -ne $s.LastId
    # A line with a header that did not get to run (it did not parse) counts too.
    if ($new -or $s.Framed) {
      if ($new) { $s.LastId = $h.Id }
      $s.Ok = $ok
      $s.Stopped = (-not $ok) -and $new -and ([string]$h.ExecutionStatus -eq 'Stopped')
      if ($ok) { $s.Code = 0; $s.Fails = 0 }
      else {
        $s.Code = $(if ($code -is [int] -and $code -ne 0) { $code } else { 1 })
        $s.Fails++
      }
      $s.DurationMs = $(if ($new) { ($h.EndExecutionTime - $h.StartExecutionTime).TotalMilliseconds } else { ([datetime]::UtcNow - $s.FrameStart).TotalMilliseconds })
    } else { $s.DurationMs = 0 }

    $loc = $ExecutionContext.SessionState.Path.CurrentLocation
    $fs = $loc.Provider.Name -eq 'FileSystem'
    $p = $(if ($fs) { $loc.ProviderPath } else { $loc.Path })
    $full = $p
    if ($HOME -and $p.StartsWith($HOME, [StringComparison]::OrdinalIgnoreCase) -and ($p.Length -eq $HOME.Length -or [string]$p[$HOME.Length] -in @('\', '/'))) {
      $p = '~' + $p.Substring($HOME.Length)
    }
    $leaf = @($p -split '[\\/]' | Where-Object { $_ })
    $leaf = $(if ($leaf.Count) { $leaf[-1] } else { $p })
    try { $width = $Host.UI.RawUI.WindowSize.Width } catch { $width = 0 }
    if (-not $width) { $width = 80 }
    @{
      Os = $s.Os
      Path = $p
      Leaf = $leaf
      Git = $(if ($fs -and $s.HasGit) { __BureauGit $full } else { $null })
      Ok = $s.Ok
      Code = $s.Code
      Fails = $s.Fails
      Stopped = $s.Stopped
      DurationMs = $s.DurationMs
      Width = $width
      Time = (Get-Date).ToString('HH:mm')
      Transient = $s.Transient
    }
  }

  function global:prompt {
    $ok = $?
    $code = $global:LASTEXITCODE
    $s = $global:__BureauState
    $conf = __BureauConf
    $style = [string]$conf['style']
    if ($style -notin @('signage', 'dossier', 'controlPoint', 'board', 'alertLevel')) {
      $s.Framed = $false
      $global:LASTEXITCODE = $code
      if ($s.Original) { return & $s.Original }
      return "PS $($ExecutionContext.SessionState.Path.CurrentLocation)$('>' * ($NestedPromptLevel + 1)) "
    }
    try {
      if (-not $s.ReadLine) { __BureauWrapReadLine }
      $d = __BureauData $ok $code
      if ($s.Framed) {
        $s.Framed = $false
        Write-Host (__BureauFrameFoot $d $d.Width $conf)
        # The closing line already says how long it took.
        $d.DurationMs = 0
      }
      $text = __BureauRender $d $conf
    } catch {
      $s.Framed = $false
      $text = "PS $($ExecutionContext.SessionState.Path.CurrentLocation)> "
    }
    $s.Transient = $false
    # PSReadLine needs to know how many lines the prompt has to redraw it.
    $lines = $(if ($style -in @('dossier', 'alertLevel')) { 1 } else { 0 })
    if ($lines -ne $s.ExtraLines -and (Get-Command Set-PSReadLineOption -ErrorAction SilentlyContinue)) {
      Set-PSReadLineOption -ExtraPromptLineCount $lines
      $s.ExtraLines = $lines
    }
    $global:LASTEXITCODE = $code
    $text
  }

  # Classified: on Enter the prompt is redrawn with a redaction bar before the
  # command runs (only if Enter still does what PSReadLine does by default).
  $__bureauEnter = $null
  if (Get-Module PSReadLine) {
    # -Chord appeared in PSReadLine 2.1; Windows PowerShell comes with 2.0.
    try { $__bureauEnter = @(Get-PSReadLineKeyHandler -Chord Enter -ErrorAction Stop)[0].Function }
    catch { $__bureauEnter = @(Get-PSReadLineKeyHandler -Bound | Where-Object { $_.Key -eq 'Enter' })[0].Function }
  }
  if ($__bureauEnter -eq 'AcceptLine') {
    Set-PSReadLineKeyHandler -Chord Enter -BriefDescription 'BureauClassified' -Description 'Bureau prompt: redacts the prompt of the command you run (Classified)' -ScriptBlock {
      $conf = __BureauConf
      if ($conf['classified'] -eq '1' -and [string]$conf['style'] -in @('signage', 'dossier', 'controlPoint', 'board', 'alertLevel')) {
        $parseErrors = $null
        [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$null, [ref]$null, [ref]$parseErrors, [ref]$null)
        if (-not $parseErrors -or $parseErrors.Count -eq 0) {
          $global:__BureauState.Transient = $true
          # PSReadLine redraws the prompt with the console encoding: in Windows
          # PowerShell that is an OEM code page without the icons, so UTF-8 only
          # while it redraws.
          $encoding = [Console]::OutputEncoding
          # The shell integration of older VS Code versions (1.93...) would take
          # this redraw for the end of the previous command, with no exit code:
          # with -1 it skips it, as before the first command.
          $vscode = Test-Path variable:global:__LastHistoryId
          if ($vscode) { $lastId = $global:__LastHistoryId; $global:__LastHistoryId = -1 }
          try {
            if ($encoding.CodePage -ne 65001) { [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false) }
            [Microsoft.PowerShell.PSConsoleReadLine]::InvokePrompt()
          } finally {
            if ([Console]::OutputEncoding.CodePage -ne $encoding.CodePage) { [Console]::OutputEncoding = $encoding }
            if ($vscode) { $global:__LastHistoryId = $lastId }
          }
        }
      }
      [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
    }
  }
  Remove-Variable __bureauEnter -ErrorAction SilentlyContinue

  # The header of each command: PSReadLine gives the line you run here. Wrapped
  # now, before VS Code's shell integration wraps it in turn, or at the first
  # prompt if PSReadLine is not loaded yet.
  function global:__BureauWrapReadLine {
    $s = $global:__BureauState
    if ($s.ReadLine -or -not (Test-Path function:PSConsoleHostReadLine)) { return }
    $s.ReadLine = $function:PSConsoleHostReadLine
    function global:PSConsoleHostReadLine {
      $line = & $global:__BureauState.ReadLine
      try { __BureauFrameStart $line } catch { }
      $line
    }
  }
  __BureauWrapReadLine

  # Bureau colours for Git: git includes bureau.gitconfig, next to this script
  # (the extension writes in it only the colours your Git configuration does not
  # set, and nothing with them off).
  if ($global:__BureauState.Dir) {
    $__bureauGc = [IO.Path]::Combine($global:__BureauState.Dir, 'bureau.gitconfig')
    $__bureauN = $(if ([string]$env:GIT_CONFIG_COUNT -match '^\d+$') { [int]$env:GIT_CONFIG_COUNT } else { 0 })
    $__bureauI = 0
    while ($__bureauI -lt $__bureauN -and [Environment]::GetEnvironmentVariable("GIT_CONFIG_VALUE_$__bureauI") -ne $__bureauGc) { $__bureauI++ }
    if ($__bureauI -eq $__bureauN) {
      [Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$__bureauN", 'include.path')
      [Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$__bureauN", $__bureauGc)
      $env:GIT_CONFIG_COUNT = [string]($__bureauN + 1)
    }
    Remove-Variable __bureauGc, __bureauN, __bureauI -ErrorAction SilentlyContinue
  }

  # The Board style greets you with one of its messages when the terminal opens.
  $__bureauConf = __BureauConf
  if ($__bureauConf['style'] -eq 'board') {
    $__bureauLine = $env:BUREAU_BOARD_LINE
    if (-not $__bureauLine -and $global:__BureauState.Dir) {
      $__bureauFile = [IO.Path]::Combine($global:__BureauState.Dir, 'board.txt')
      if ([IO.File]::Exists($__bureauFile)) {
        $__bureauLines = @([IO.File]::ReadAllLines($__bureauFile, [Text.Encoding]::UTF8) | Where-Object { $_ })
        if ($__bureauLines.Count) { $__bureauLine = $__bureauLines[(Get-Random -Maximum $__bureauLines.Count)] }
      }
    }
    if ($__bureauLine) {
      $__bureauText = $__bureauLine.Trim()
      if ($__bureauText.StartsWith('<<') -and $__bureauText.EndsWith('>>')) { $__bureauText = $__bureauText.Substring(2, $__bureauText.Length - 4) }
      $__bureauL = $(if ($__bureauConf['theme'] -eq 'resonant') { '36' } elseif ($__bureauConf['theme'] -eq 'black') { '97' } else { '31' })
      $__bureauE = [char]27
      $__bureauIcon = $(if ($__bureauConf['icons'] -ne '0') { "$__bureauE[$($__bureauL)m$($global:__BureauGlyphs['board'])$__bureauE[0m " } else { '' })
      Write-Host "$__bureauIcon$__bureauE[$($__bureauL)m<<$__bureauE[0m$__bureauE[1m$__bureauText$__bureauE[22m$__bureauE[$($__bureauL)m>>$__bureauE[0m"
      Write-Host ''
    }
    Remove-Variable __bureauLine, __bureauFile, __bureauLines, __bureauText, __bureauL, __bureauE, __bureauIcon -ErrorAction SilentlyContinue
  }
  Remove-Variable __bureauConf -ErrorAction SilentlyContinue
  $env:BUREAU_BOARD_LINE = $null
}

# VS Code shell integration (command decorations, sticky scroll...): the Bureau
# profile starts PowerShell with its own arguments, so VS Code does not inject
# it and it is loaded here, after the prompt, so that it wraps it.
if ($env:BUREAU_VSCODE_SI -and $env:TERM_PROGRAM -eq 'vscode') {
  $__bureauSi = $env:BUREAU_VSCODE_SI
  $env:BUREAU_VSCODE_SI = $null
  if (Test-Path -LiteralPath $__bureauSi) {
    try { . $__bureauSi } catch { try { Invoke-Expression ([IO.File]::ReadAllText($__bureauSi)) } catch { } }
  }
  Remove-Variable __bureauSi -ErrorAction SilentlyContinue
}
