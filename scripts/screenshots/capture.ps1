param(
  [Parameter(Mandatory)] [string] $TitleContains,
  [Parameter(Mandatory)] [string] $OutFile,
  [int] $Width = 1600,
  [int] $Height = 1000,
  [switch] $ResizeOnly,
  [switch] $Close
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class W {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  public static IntPtr Find(string part) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, p) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (sb.ToString().Contains(part)) { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
[void][W]::SetProcessDPIAware()
$h = [W]::Find($TitleContains)
if ($h -eq [IntPtr]::Zero) { throw "Ventana no encontrada: $TitleContains" }
if ($Close) { [void][W]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero); "closed"; exit 0 }
[void][W]::ShowWindow($h, 9)  # SW_RESTORE
[void][W]::MoveWindow($h, 40, 40, $Width, $Height, $true)
if ($ResizeOnly) { 'resized'; exit 0 }
Start-Sleep -Milliseconds 400
$r = New-Object W+RECT
[void][W]::GetWindowRect($h, [ref]$r)
$w = $r.R - $r.L; $hh = $r.B - $r.T
$cur = New-Object W+POINT
[void][W]::GetCursorPos([ref]$cur)
$inside = $cur.X -ge $r.L -and $cur.X -le $r.R -and $cur.Y -ge $r.T -and $cur.Y -le $r.B
if ($inside) { [void][W]::SetCursorPos($r.R + 40, $r.B + 40); Start-Sleep -Milliseconds 900 }
$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[void][W]::PrintWindow($h, $hdc, 2)  # PW_RENDERFULLCONTENT
$g.ReleaseHdc($hdc); $g.Dispose()
$bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
if ($inside) { [void][W]::SetCursorPos($cur.X, $cur.Y) }
$bmp.Dispose()
"captured $w x $hh"
