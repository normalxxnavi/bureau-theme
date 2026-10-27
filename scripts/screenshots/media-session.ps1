# Sesión multimedia de prueba para la captura de la gramola (solo Windows).
# Reproduce en bucle un WAV en silencio y con el volumen a 0, con la canción y
# la portada inventadas de cover.js, para que la gramola tenga algo que leer
# sin tocar la música del usuario. Se cierra sola a los -Seconds segundos.
#   powershell -File media-session.ps1 -Cover cover.png -Wav silence.wav -Title … -Artist … -Album …
param(
  [Parameter(Mandatory)] [string] $Cover,
  [Parameter(Mandatory)] [string] $Wav,
  [Parameter(Mandatory)] [string] $Title,
  [Parameter(Mandatory)] [string] $Artist,
  [Parameter(Mandatory)] [string] $Album,
  [int] $Seconds = 120
)
$ErrorActionPreference = 'Stop'
# Nombre propio de la sesión (la gramola lo enseña como la app que suena).
Add-Type -Namespace Bureau -Name Shell -MemberDefinition '[DllImport("shell32.dll", CharSet = CharSet.Unicode)] public static extern int SetCurrentProcessExplicitAppUserModelID(string id);'
[void][Bureau.Shell]::SetCurrentProcessExplicitAppUserModelID('Bureau.Songmaster')

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Playback.MediaPlayer, Windows.Media, ContentType = WindowsRuntime]
$null = [Windows.Media.Playback.MediaPlaybackItem, Windows.Media, ContentType = WindowsRuntime]
$null = [Windows.Media.Core.MediaSource, Windows.Media.Core, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.RandomAccessStreamReference, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await($op, [Type] $type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  [void]$task.Wait(-1)
  return $task.Result
}

$wavFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Wav).Path)) ([Windows.Storage.StorageFile])
$coverFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Cover).Path)) ([Windows.Storage.StorageFile])
$item = New-Object Windows.Media.Playback.MediaPlaybackItem ([Windows.Media.Core.MediaSource]::CreateFromStorageFile($wavFile))
$props = $item.GetDisplayProperties()
$props.Type = [Windows.Media.MediaPlaybackType]::Music
$props.MusicProperties.Title = $Title
$props.MusicProperties.Artist = $Artist
$props.MusicProperties.AlbumTitle = $Album
$props.Thumbnail = [Windows.Storage.Streams.RandomAccessStreamReference]::CreateFromFile($coverFile)
$item.ApplyDisplayProperties($props)

$player = New-Object Windows.Media.Playback.MediaPlayer
$player.Volume = 0
$player.IsLoopingEnabled = $true
$player.Source = $item
$player.Play()
'playing'
Start-Sleep -Seconds $Seconds
$player.Dispose()
