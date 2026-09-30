// Blas de Rosales — la home (sin dependencias)

const WHATSAPP = '5493548632624';

// Nav: línea de abajo cuando se despega del borde
const nav = document.querySelector('[data-nav]');
const marcarNav = () => nav.classList.toggle('is-pegada', window.scrollY > 8);
marcarNav();
window.addEventListener('scroll', marcarNav, { passive: true });

// Carta en pestañas
const lista = document.querySelector('[data-pestanas]');
const pestanas = [...lista.querySelectorAll('[role="tab"]')];
const carta = document.getElementById('carta');

function elegir(pestana, { enfocar = false, subir = false } = {}) {
  pestanas.forEach((p) => {
    const activa = p === pestana;
    p.setAttribute('aria-selected', String(activa));
    p.tabIndex = activa ? 0 : -1;
    document.getElementById(p.getAttribute('aria-controls')).hidden = !activa;
  });
  if (enfocar) pestana.focus();
  pestana.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  // Si se cambia de pestaña con la lista ya pegada arriba, volver al principio de la carta
  if (subir && lista.getBoundingClientRect().top <= nav.offsetHeight + 1) {
    const cuerpo = lista.nextElementSibling;
    window.scrollTo({ top: cuerpo.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - lista.offsetHeight - 24 });
  }
}

pestanas.forEach((p, i) => {
  p.addEventListener('click', () => elegir(p, { subir: true }));
  p.addEventListener('keydown', (e) => {
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: pestanas.length - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    elegir(pestanas[(destino + pestanas.length) % pestanas.length], { enfocar: true, subir: true });
  });
});

// Un enlace a #vinos (o a cualquier sección de la carta) abre esa pestaña
function abrirDesdeHash() {
  const pestana = pestanas.find((p) => `#${p.getAttribute('aria-controls')}` === location.hash);
  if (!pestana) return;
  elegir(pestana);
  carta.scrollIntoView();
}
window.addEventListener('hashchange', abrirDesdeHash);
abrirDesdeHash();

// Reserva: arma el mensaje y abre WhatsApp
const reserva = document.querySelector('[data-reserva]');
const dia = reserva.elements.dia;
const hora = reserva.elements.hora;
const noche = hora.querySelector('[data-noche]');
const aviso = reserva.querySelector('[data-aviso]');
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fechaDe = (valor) => { const [a, m, d] = valor.split('-').map(Number); return new Date(a, m - 1, d); };
dia.min = iso(new Date());
dia.value = iso(new Date());

// Domingo a la noche está cerrado
function revisarDomingo() {
  const domingo = dia.value && fechaDe(dia.value).getDay() === 0;
  noche.disabled = domingo;
  if (domingo && hora.selectedOptions[0].parentElement === noche) hora.value = '13:00';
  aviso.textContent = domingo ? 'Los domingos abrimos sólo al mediodía.' : '';
}
dia.addEventListener('change', revisarDomingo);
revisarDomingo();

// Sugeridor: con las ganas, cuántos son y si alguien no come carne, arma una idea de qué pedir.
// Los platos salen de datos/sugerencias.json (los embebe scripts/pagina.py).
const SUG = JSON.parse(document.getElementById('sugerencias').textContent);
const ganasPor = Object.fromEntries(SUG.ganas.map((g) => [g.id, g]));
const sugerencia = reserva.querySelector('[data-sugerencia]');
const sugLista = reserva.querySelector('[data-sugerencia-lista]');
let vuelta = 0;
let filas = null;

const toma = (lista, i) => lista[i % lista.length];
const cuantos = () => {
  const valor = reserva.elements.personas.value;
  return valor === 'más de 8' ? 9 : Number(valor);
};

function armar() {
  const g = ganasPor[reserva.elements.ganas.value];
  if (!g) return null;
  const n = cuantos();
  const sinCarne = reserva.elements.sin_carne.checked;
  let principales = [];
  let conParrillada = false;
  if (g.para_dos) {
    // A la leña: la parrillada es para dos, así que se cuenta a los que comen carne
    const m = sinCarne ? n - 1 : n;
    if (m === 1) principales.push(toma(g.uno, vuelta));
    if (m > 1) {
      const pares = Math.floor(m / 2);
      let cuanto = ' (una cada dos)';
      if (n < 9) cuanto = pares > 1 ? ` × ${pares} (una cada dos)` : m === n && n === 2 ? ' (para los dos)' : ' (para dos)';
      principales.push({ ...g.para_dos, t: g.para_dos.t + cuanto });
      if (m % 2 && n < 9) principales.push(toma(g.cortes, vuelta));
      conParrillada = true;
    }
    if (sinCarne) principales.push(toma(g.sin_carne, vuelta));
  } else {
    const k = Math.min(n, 3);
    principales = Array.from({ length: k }, (_, i) => toma(g.principales, vuelta * k + i));
    if (sinCarne) {
      const sinRepetir = g.sin_carne.filter((x) => !principales.some((p) => p.t === x.t));
      principales[k - 1] = toma(sinRepetir.length ? sinRepetir : g.sin_carne, vuelta);
    }
  }
  // Para uno, el vino va por copa o en media botella
  const vino = n === 1 && g.copa ? g.copa : toma(g.vinos, vuelta);
  // La parrillada ya trae empanada, provoleta y achuras: al lado, algo que no traiga
  let entrada = [n === 1 ? 'Para empezar' : 'Para compartir', toma(sinCarne ? SUG.compartir_sin_carne : g.compartir, vuelta)];
  if (conParrillada) entrada = ['Para acompañar', toma(sinCarne ? SUG.compartir_sin_carne : g.acompanar, vuelta)];
  return [
    [entrada[0], [entrada[1]]],
    [principales.length > 1 ? 'Principales' : 'Principal', principales],
    ['Vino', [vino]],
    ['Postre', [toma(SUG.postres, vuelta)]],
  ];
}

function mostrarSugerencia() {
  filas = armar();
  sugerencia.hidden = !filas;
  if (!filas) return;
  sugLista.replaceChildren(...filas.map(([titulo, platos]) => {
    const fila = document.createElement('div');
    fila.className = 'sugerencia__fila';
    const dt = document.createElement('dt');
    dt.textContent = titulo;
    const dd = document.createElement('dd');
    platos.forEach((p) => {
      const linea = document.createElement('span');
      linea.textContent = p.t;
      if (p.aviso) {
        const nota = document.createElement('small');
        nota.textContent = p.aviso;
        linea.append(' ', nota);
      }
      dd.append(linea);
    });
    fila.append(dt, dd);
    return fila;
  }));
}

['ganas', 'personas', 'sin_carne'].forEach((campo) => {
  const el = reserva.elements[campo];
  (el instanceof RadioNodeList ? [...el] : [el]).forEach((x) => x.addEventListener('change', mostrarSugerencia));
});
reserva.querySelector('[data-otra]').addEventListener('click', () => { vuelta += 1; mostrarSugerencia(); });

// Mozo virtual: le pregunta a /api/recomendar (una función de Vercel que tiene la key y la carta).
// La charla se guarda acá y se manda entera en cada consulta.
const API = /(^|\.)vercel\.app$|^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? '/api/recomendar'
  : 'https://blas-de-rosales.vercel.app/api/recomendar';
const mozo = document.querySelector('[data-mozo]');
const panel = mozo.querySelector('.mozo__panel');
const abrir = mozo.querySelector('[data-mozo-abrir]');
const charla = mozo.querySelector('[data-charla]');
const pregunta = mozo.querySelector('[data-pregunta]');
const preguntar = mozo.querySelector('[data-preguntar]');
const historial = [];
let pensando = false;

function burbuja(quien, texto) {
  const p = document.createElement('p');
  p.className = `mozo__msg mozo__msg--${quien}`;
  p.textContent = texto;
  charla.append(p);
  charla.scrollTop = charla.scrollHeight;
  return p;
}

async function consultar() {
  const texto = pregunta.value.trim();
  if (!texto || pensando) return;
  pensando = true;
  preguntar.disabled = true;
  pregunta.value = '';
  historial.push({ role: 'user', content: texto });
  burbuja('cliente', texto);
  const espera = burbuja('mozo', 'Pensando…');
  espera.classList.add('mozo__msg--espera');
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensajes: historial }),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok || !datos.respuesta) throw new Error(datos.error || 'sin respuesta');
    historial.push({ role: 'assistant', content: datos.respuesta });
    espera.classList.remove('mozo__msg--espera');
    espera.textContent = datos.respuesta;
  } catch (err) {
    historial.pop();
    espera.classList.remove('mozo__msg--espera');
    espera.classList.add('mozo__msg--error');
    espera.textContent = 'No pudimos consultarlo ahora. Probá con las ideas de la reserva o preguntale al salón.';
  }
  pensando = false;
  preguntar.disabled = false;
  charla.scrollTop = charla.scrollHeight;
}

mozo.querySelector('[data-mozo-form]').addEventListener('submit', (e) => { e.preventDefault(); consultar(); });

// La pestaña flotante abre y cierra el chat; Escape también lo cierra
function alternarMozo(abierto) {
  panel.hidden = !abierto;
  abrir.setAttribute('aria-expanded', String(abierto));
  mozo.classList.toggle('is-abierto', abierto);
  if (abierto) { pregunta.focus({ preventScroll: true }); charla.scrollTop = charla.scrollHeight; } else abrir.focus({ preventScroll: true });
}
abrir.addEventListener('click', () => alternarMozo(panel.hidden));
mozo.querySelectorAll('[data-mozo-cerrar]').forEach((el) => el.addEventListener('click', () => {
  if (!panel.hidden) { panel.hidden = true; abrir.setAttribute('aria-expanded', 'false'); mozo.classList.remove('is-abierto'); }
}));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) alternarMozo(false); });

const enLista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0]);

reserva.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!dia.value) {
    aviso.textContent = 'Elegí el día de la reserva.';
    dia.focus();
    return;
  }
  const fecha = fechaDe(dia.value).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const personas = reserva.elements.personas.value;
  const nombre = reserva.elements.nombre.value.trim();
  const notas = reserva.elements.notas.value.trim();
  let texto = `Hola! Quiero reservar una mesa para ${personas} ${personas === '1' ? 'persona' : 'personas'} el ${fecha} a las ${hora.value}.`;
  if (nombre) texto += `\nA nombre de: ${nombre}`;
  if (notas) texto += `\nAclaraciones: ${notas}`;
  if (filas && reserva.elements.sumar.checked) {
    texto += `\n${personas === '1' ? 'Me' : 'Nos'} tienta: ${enLista(filas.flatMap(([, platos]) => platos.map((p) => p.t)))}.`;
  }
  aviso.textContent = 'Abriendo WhatsApp…';
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
});

document.querySelectorAll('[data-anio]').forEach((el) => { el.textContent = new Date().getFullYear(); });
