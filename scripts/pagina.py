"""Genera index.html (la home) a partir de datos/carta.json y datos/sugerencias.json.

La carta va adentro de la página, en pestañas. Para cambiar un plato: editar
datos/carta.json y correr  python3 scripts/pagina.py.
Las ideas de "qué pedir" de la reserva salen de datos/sugerencias.json: si un plato
o un vino de ahí no está en la carta, el script se frena y dice cuál.
"""
import json
from html import escape
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
datos = json.loads((RAIZ / 'datos/carta.json').read_text(encoding='utf-8'))
plantilla = (RAIZ / 'scripts/pagina.plantilla.html').read_text(encoding='utf-8')

# Nombres cortos para las pestañas
PESTANAS = {
    'ensaladas': 'Ensaladas',
    'pescados': 'Pescados',
    'pastas': 'Pastas',
    'postres': 'Postres y café',
    'bebidas': 'Bebidas',
}
INICIAL = 'entradas'

e = lambda t: escape(t, quote=False)


def plato(p):
    marca = '<span class="plato__marca">Recomendado</span>' if p.get('recomendado') else ''
    h = f'<li class="plato"><p class="plato__cabeza"><span class="plato__nombre">{e(p["nombre"])}</span>{marca}</p>'
    desc = []
    if p.get('descripcion'):
        desc.append(e(p['descripcion'].replace(' | ', ' · ')))
    if p.get('nota'):
        desc.append(f'<em>{e(p["nota"])}</em>')
    if desc:
        h += f'<p class="plato__desc">{" · ".join(desc)}</p>'
    return h + '</li>'


def vino(v):
    nombre = v['linea'] or v['bodega']
    sub = f' <span class="plato__bodega">{e(v["bodega"])}</span>' if v['linea'] else ''
    return (f'<li class="plato"><p class="plato__cabeza"><span class="plato__nombre">{e(nombre)}{sub}</span></p>'
            f'<p class="plato__desc">{e(" · ".join(v["varietales"]))}</p></li>')


def recuadro(p):
    """La especialidad de la casa, fuera de la lista."""
    return ('<div class="recuadro"><p class="recuadro__para">Para dos</p><div>'
            f'<h4>{e(p["nombre"])}</h4><p>{e(p["descripcion"])}.</p></div></div>')


def grupo(g):
    h = '<section class="grupo">'
    if g['titulo']:
        h += f'<div class="grupo__cabeza"><h3>{e(g["titulo"])}</h3><span></span></div>'
    if g.get('nota'):
        h += f'<p class="grupo__nota">{e(g["nota"])}</p>'
    if 'texto' in g:
        h += f'<p class="grupo__texto">{e(g["texto"])}</p><p class="grupo__nota">{e(g["extra"])}</p>'
    elif 'platos' in g:
        h += '<ul class="platos">' + ''.join(plato(p) for p in g['platos'] if not p.get('destacado') or 'Parrillada' not in p['nombre']) + '</ul>'
    elif 'vinos' in g:
        h += '<ul class="platos">' + ''.join(vino(v) for v in g['vinos']) + '</ul>'
    elif 'lista' in g:
        h += '<ul class="platos platos--lista">' + ''.join(f'<li class="plato"><p class="plato__cabeza"><span class="plato__nombre">{e(x)}</span></p></li>' for x in g['lista']) + '</ul>'
    return h + '</section>'


tabs, paneles = [], []
for s in datos['secciones']:
    sel = s['id'] == INICIAL
    estado = 'aria-selected="true"' if sel else 'aria-selected="false" tabindex="-1"'
    tabs.append(f'<button class="pestana" type="button" role="tab" id="tab-{s["id"]}" aria-controls="{s["id"]}" '
                f'{estado}>{e(PESTANAS.get(s["id"], s["titulo"]))}</button>')
    oculto = '' if sel else ' hidden'
    h = f'<div class="panel" role="tabpanel" id="{s["id"]}" aria-labelledby="tab-{s["id"]}"{oculto}>'
    if s.get('nota'):
        h += f'<p class="panel__nota">{e(s["nota"])}.</p>'
    parrillada = [p for g in s['grupos'] for p in g.get('platos', []) if p.get('destacado') and 'Parrillada' in p['nombre']]
    if parrillada:
        h += recuadro(parrillada[0])
    h += ''.join(grupo(g) for g in s['grupos'])
    if s.get('aclaracion'):
        h += f'<p class="grupo__nota panel__aclaracion">{e(s["aclaracion"])}</p>'
    if s.get('frase'):
        h += f'<p class="panel__frase">{e(s["frase"])}</p>'
    paneles.append(h + '</div>')

# ---------- sugerencias para la reserva ----------
sug = json.loads((RAIZ / 'datos/sugerencias.json').read_text(encoding='utf-8'))
platos_carta = [(p, g) for s in datos['secciones'] for g in s['grupos'] for p in g.get('platos', [])]
vinos_carta = [v for s in datos['secciones'] for g in s['grupos'] for v in g.get('vinos', [])]
faltan = []


def sug_plato(ref):
    nombre, _, desc = (x.strip() for x in ref.partition('·'))
    for p, g in platos_carta:
        if p['nombre'] == nombre and (not desc or p.get('descripcion', '').startswith(desc)):
            h = {'t': f'{nombre} {desc[0].lower()}{desc[1:]}' if desc else nombre}
            if 'disponibilidad' in (p.get('nota', '') + g.get('nota', '')).lower():
                h['aviso'] = 'sujeto a disponibilidad'
            return h
    faltan.append(ref)


def sug_vino(ref):
    ref, _, texto = (x.strip() for x in ref.partition('='))
    linea, _, varietal = (x.strip() for x in ref.partition('·'))
    if not any(linea in (v['linea'], v['bodega']) and varietal in v['varietales'] for v in vinos_carta):
        faltan.append(ref)
    return {'t': texto or f'{linea} {varietal}'}


ganas = []
for g in sug['ganas']:
    r = {'id': g['id'], 'etiqueta': g['etiqueta']}
    for k in ('compartir', 'acompanar', 'principales', 'uno', 'cortes', 'sin_carne'):
        if k in g:
            r[k] = [sug_plato(x) for x in g[k]]
    if 'para_dos' in g:
        r['para_dos'] = sug_plato(g['para_dos'])
    r['vinos'] = [sug_vino(x) for x in g['vinos']]
    if 'copa' in g:
        r['copa'] = sug_vino(g['copa'])
    ganas.append(r)
sugerencias = {
    'ganas': ganas,
    'compartir_sin_carne': [sug_plato(x) for x in sug['compartir_sin_carne']],
    'postres': [sug_plato(x) for x in sug['postres']],
}
if faltan:
    raise SystemExit('En datos/sugerencias.json hay cosas que no están en la carta:\n  ' + '\n  '.join(dict.fromkeys(faltan)))

chips = [f'<label class="opcion opcion--texto"><input type="radio" name="ganas" value="{g["id"]}"><span>{e(g["etiqueta"])}</span></label>'
         for g in ganas]
json_sug = json.dumps(sugerencias, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

html = (plantilla.replace('{{PESTANAS}}', '\n        '.join(tabs)).replace('{{PANELES}}', '\n      '.join(paneles))
        .replace('{{GANAS}}', '\n              '.join(chips)).replace('{{SUGERENCIAS}}', json_sug))
(RAIZ / 'index.html').write_text(html, encoding='utf-8')
print('index.html generada')


# La carta en texto plano para el asistente (api/recomendar.js): la IA sólo puede recomendar lo que figura acá.
def linea_plato(p):
    t = p['nombre']
    if p.get('descripcion'):
        t += f" ({p['descripcion']})"
    if p.get('nota'):
        t += f" [{p['nota']}]"
    if p.get('recomendado'):
        t += ' [recomendado de la casa]'
    return '- ' + t


carta = []
for s in datos['secciones']:
    carta.append(f"## {s['titulo']}" + (f" ({s['nota']})" if s.get('nota') else ''))
    for g in s['grupos']:
        if g.get('titulo'):
            carta.append(f"### {g['titulo']}")
        for p in g.get('platos', []):
            carta.append(linea_plato(p))
        for v in g.get('vinos', []):
            nombre = v['bodega'] + (f" {v['linea']}" if v['linea'] and v['linea'] != v['bodega'] else '')
            carta.append(f"- {nombre}: {', '.join(v['varietales'])}")
        for x in g.get('lista', []):
            carta.append(f'- {x}')
        for k in ('texto', 'extra'):
            if g.get(k):
                carta.append(g[k])
        if g.get('nota'):
            carta.append(f"({g['nota']})")
    if s.get('aclaracion'):
        carta.append(s['aclaracion'])
(RAIZ / 'api').mkdir(exist_ok=True)
(RAIZ / 'api/_carta.js').write_text(
    '// Lo genera scripts/pagina.py desde datos/carta.json: no se edita a mano.\n'
    'module.exports = ' + json.dumps('\n'.join(carta), ensure_ascii=False) + ';\n', encoding='utf-8')
print('api/_carta.js generado')
