Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$dst = Join-Path $root 'screenshots'
New-Item -ItemType Directory -Force -Path $dst | Out-Null

# 源文件 → 输出名 → 目标宽度
$jobs = @(
  @{ src = 'shots\final1-today-c.png';   out = 'today.png';        w = 430 },
  @{ src = 'shots\final3-entry-c.png';   out = 'entry.png';        w = 430 },
  @{ src = 'shots\final2-archive-c.png'; out = 'archive.png';      w = 430 },
  @{ src = 'shots\bg3.png';              out = 'breeds.png';       w = 560 },
  @{ src = 'shots\themes.png';           out = 'themes.png';       w = 1200 },
  @{ src = 'shots\final-mp-today.png';   out = 'mp-today.png';     w = 400 },
  @{ src = 'shots\final-mp-pet.png';     out = 'mp-pet.png';       w = 400 }
)

foreach ($j in $jobs) {
  $from = Join-Path $root $j.src
  if (-not (Test-Path $from)) { "skip $($j.out)"; continue }
  $img = [System.Drawing.Image]::FromFile($from)
  $w = [int]$j.w
  $h = [int][math]::Round($img.Height * ($w / $img.Width))
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $w, $h))
  $g.Dispose()
  $bmp.Save((Join-Path $dst $j.out), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $img.Dispose()
  "{0,-16} {1}x{2}  {3:N0} KB" -f $j.out, $w, $h, ((Get-Item (Join-Path $dst $j.out)).Length / 1KB)
}
