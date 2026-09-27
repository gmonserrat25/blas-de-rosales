// Blas de Rosales — versión Milveintiuno (sin dependencias)

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
  aviso.textContent = 'Abriendo WhatsApp…';
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
});

document.querySelectorAll('[data-anio]').forEach((el) => { el.textContent = new Date().getFullYear(); });
