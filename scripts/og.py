"""Arma assets-src/og/og.html (1200x630) con el logo inline para sacarle captura."""
import re

def interior(ruta):
    s = open(ruta).read()
    caja = re.search(r'viewBox="([^"]+)"', s).group(1)
    cuerpo = re.sub(r'^.*?<svg[^>]*>', '', s, flags=re.S).rsplit('</svg>', 1)[0]
    return caja, cuerpo

caja_r, rombo = interior('img/logo/rombo.svg')
caja_n, nombre = interior('img/logo/nombre.svg')

html = f'''<!doctype html><meta charset="utf-8"><style>
html,body{{margin:0;width:1200px;height:630px;background:#f7f2eb;overflow:hidden}}
body{{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px}}
svg{{fill:#c4302b;display:block}}
</style>
<svg viewBox="{caja_r}" width="230" style="aspect-ratio:632/606">{rombo}</svg>
<svg viewBox="{caja_n}" width="540" style="aspect-ratio:2543/421">{nombre}</svg>
'''
open('assets-src/og/og.html', 'w').write(html)
