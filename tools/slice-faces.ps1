Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$src = [System.Drawing.Image]::FromFile((Join-Path $root 'shots\faces-grid.png'))
$keys = Get-Content (Join-Path $root 'shots\faces-manifest.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$outDir = Join-Path $root 'mp\assets\faces'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$cell = 400   # 200 * 2 (device scale)
$cols = 8
$size = 200
$total = 0
for ($i = 0; $i -lt $keys.Count; $i++) {
  $r = [math]::Floor($i / $cols); $c = $i % $cols
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $dst = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $srcRect = New-Object System.Drawing.Rectangle ($c * $cell), ($r * $cell), $cell, $cell
  $g.DrawImage($src, $dst, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $path = Join-Path $outDir ($keys[$i].key + '.png')
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $total += (Get-Item $path).Length
}
$src.Dispose()
"files=$($keys.Count) totalKB=$([math]::Round($total / 1024, 1))"
