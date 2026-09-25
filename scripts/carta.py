"""Genera carta.html a partir de datos/carta.json.

Para cambiar un plato: editar datos/carta.json y correr  python3 scripts/carta.py
"""
import json
from html import escape
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
datos = json.loads((RAIZ / 'datos/carta.json').read_text(encoding='utf-8'))

FOTOS = {
    'entradas': ('empanadas-pescado.jpg', 'Empanadas y filet de merluza a la romana'),
    'alta-cocina': ('carne-papas.jpg', 'Carne braseada con papas y vegetales'),
    'pescados': ('paella.jpg', 'Paella con langostinos, calamares y mejillones'),
    'pastas': ('sorrentinos-brocoli.jpg', 'Sorrentinos con brócoli y tomates cherry'),
    'lena': ('parrilla-achuras.jpg', 'Chorizos y achuras sobre la parrilla'),
    'vinos': ('vinos-pared.jpg', 'La pared de vinos del salón'),
}

e = lambda t: escape(t, quote=False)


def plato(p):
    clases = 'plato' + (' plato--destacado' if p.get('destacado') else '')
    h = f'<li class="{clases}"><p class="plato__nombre">{e(p["nombre"])}</p>'
    extra = []
    if p.get('descripcion'):
        extra.append(e(p['descripcion'].replace(' | ', ' · ')))
    if p.get('nota'):
        extra.append(f'<em>{e(p["nota"])}</em>')
    if p.get('recomendado') and not p.get('destacado'):
        extra.append('<span class="plato__marca">Recomendado</span>')
    if extra:
        h += f'<p class="plato__desc">{" · ".join(extra)}</p>'
    return h + '</li>'


def vino(v):
    nombre = v['linea'] or v['bodega']
    sub = v['bodega'] if v['linea'] else ''
    h = f'<li class="plato"><p class="plato__nombre">{e(nombre)}'
    if sub:
        h += f' <span class="plato__bodega">{e(sub)}</span>'
    h += f'</p><p class="plato__desc">{e(" · ".join(v["varietales"]))}</p></li>'
    return h


def grupo(g):
    h = ''
    if g['titulo']:
        nota = f' <span class="carta__subnota">{e(g["nota"])}</span>' if g.get('nota') else ''
        h += f'<h3 class="carta__subtitulo">{e(g["titulo"])}{nota}</h3>'
    if 'texto' in g:
        h += f'<p class="carta__armala">{e(g["texto"])}</p><p class="carta__extra">{e(g["extra"])}</p>'
    elif 'platos' in g:
        h += '<ul class="platos">' + ''.join(plato(p) for p in g['platos']) + '</ul>'
    elif 'vinos' in g:
        h += '<ul class="platos">' + ''.join(vino(v) for v in g['vinos']) + '</ul>'
    elif 'lista' in g:
        h += '<ul class="platos platos--lista">' + ''.join(f'<li class="plato"><p class="plato__nombre">{e(x)}</p></li>' for x in g['lista']) + '</ul>'
    return h


def seccion(s):
    h = f'<section id="{s["id"]}" class="carta__seccion" aria-labelledby="t-{s["id"]}">'
    if s['id'] in FOTOS:
        src, alt = FOTOS[s['id']]
        h += f'<figure class="carta__foto"><img src="img/{src}" alt="{escape(alt)}" loading="lazy"></figure>'
    nota = f'<p class="carta__nota">{e(s["nota"])}</p>' if s.get('nota') else ''
    h += f'<div class="carta__cabeza"><h2 id="t-{s["id"]}">{e(s["titulo"])}</h2>{nota}</div>'
    h += ''.join(grupo(g) for g in s['grupos'])
    if s.get('aclaracion'):
        h += f'<p class="carta__aclaracion">{e(s["aclaracion"])}</p>'
    if s.get('frase'):
        h += f'<p class="carta__aclaracion">{e(s["frase"])}</p>'
    return h + '</section>'


indice = ''.join(f'<li><a href="#{s["id"]}">{e(s["titulo"])}</a></li>' for s in datos['secciones'])
cuerpo = '\n'.join(seccion(s) for s in datos['secciones'])

plantilla = (RAIZ / 'scripts/carta.plantilla.html').read_text(encoding='utf-8')
salida = plantilla.replace('<!--INDICE-->', indice).replace('<!--CARTA-->', cuerpo)
(RAIZ / 'carta.html').write_text(salida, encoding='utf-8')
print('carta.html generada:', sum(len(g.get('platos', g.get('vinos', g.get('lista', [])))) for s in datos['secciones'] for g in s['grupos']), 'ítems')
