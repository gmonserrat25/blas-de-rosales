// Blas de Rosales — comportamiento del sitio (sin dependencias)

const WHATSAPP = '5493548632624';
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cabecera: sobre la portada va sin logo y en tinta; al salir de la portada, sólida.
const cabecera = document.querySelector('[data-cabecera]');
const portada = document.querySelector('[data-portada]');
const barra = document.querySelector('[data-barra]');
if (portada) {
  // Se calcula en cada scroll (barato) para que nunca quede desfasada.
  const actualizar = () => {
    const fuera = portada.getBoundingClientRect().bottom <= cabecera.offsetHeight;
    cabecera.classList.toggle('is-solida', fuera);
    if (barra) barra.classList.toggle('is-visible', fuera);
  };
  actualizar();
  window.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);
  window.addEventListener('pageshow', actualizar);
} else {
  cabecera.classList.add('is-solida');
}

// Menú en celular
const botonMenu = document.querySelector('[data-menu]');
const navegacion = document.getElementById('navegacion');
function cerrarMenu() {
  navegacion.classList.remove('is-abierta');
  cabecera.classList.remove('is-menu');
  botonMenu.setAttribute('aria-expanded', 'false');
}
botonMenu.addEventListener('click', () => {
  const abierto = navegacion.classList.toggle('is-abierta');
  cabecera.classList.toggle('is-menu', abierto);
  botonMenu.setAttribute('aria-expanded', String(abierto));
});
navegacion.addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

// Reserva: arma el mensaje y abre WhatsApp
const reserva = document.querySelector('[data-reserva]');
if (reserva) {
  const dia = reserva.elements.dia;
  const aviso = reserva.querySelector('[data-aviso]');
  const hoy = new Date();
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dia.min = iso(hoy);
  dia.value = iso(hoy);

  reserva.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!dia.value) {
      aviso.textContent = 'Elegí el día de la reserva.';
      dia.focus();
      return;
    }
    const [a, m, d] = dia.value.split('-').map(Number);
    const fecha = new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const personas = reserva.elements.personas.value;
    const texto = `Hola! Quiero reservar una mesa para ${personas} ${personas === '1' ? 'persona' : 'personas'} el ${fecha} a las ${reserva.elements.hora.value}.`;
    aviso.textContent = 'Abriendo WhatsApp…';
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  });
}

// Carta: marca en el índice la sección que se está leyendo
const enlacesIndice = [...document.querySelectorAll('.indice a')];
if (enlacesIndice.length) {
  const porId = new Map(enlacesIndice.map((a) => [a.hash.slice(1), a]));
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      enlacesIndice.forEach((a) => a.classList.remove('is-actual'));
      const enlace = porId.get(entrada.target.id);
      if (enlace) {
        enlace.classList.add('is-actual');
        const lista = enlace.closest('ul');
        lista.scrollTo({ left: enlace.offsetLeft - lista.clientWidth / 2 + enlace.offsetWidth / 2, behavior: reducirMovimiento ? 'auto' : 'smooth' });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('.carta__seccion[id]').forEach((s) => observador.observe(s));
}

document.querySelectorAll('[data-anio]').forEach((el) => { el.textContent = new Date().getFullYear(); });
