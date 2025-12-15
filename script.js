

const API_URL = 'https://fakestoreapi.com/products?limit=8';
const STORAGE_KEY = 'carrito';

let carrito = [];

// ------------------ Helpers para inyectar header/footer/aside en páginas ------------------
function getBasePath() {
    // Si la ruta actual contiene /pages/ usamos ../ para recursos relativos
    return location.pathname.includes('/pages/') ? '../' : '';
}

function insertCommonLayoutIfMissing() {
    const base = getBasePath();

    // Header
    if (!document.querySelector('header')) {
        const header = document.createElement('header');
        header.innerHTML = `
            <div class="header-inner">
                <div class="brand">
                    <a href="${base}index.html"><img src="${base}assets/img/logoprincipal.png" alt="Logo"></a>
                    <h1>ECO.moda.infantil</h1>
                </div>
                <nav aria-label="principal">
                    <ul>
                        <li><a href="${base}index.html#productos">Productos</a></li>
                        <li><a href="${base}pages/nosotros.html">Nosotros</a></li>
                    </ul>
                </nav>
                <div class="cart-area">
                    <button id="btn-toggle-carrito" aria-expanded="false" aria-controls="carrito-listado">🛒 <span id="contador-carrito">0</span></button>
                </div>
            </div>
        `;
        document.body.insertBefore(header, document.body.firstChild);
    }

    // Aside carrito
    if (!document.getElementById('carrito-listado')) {
        const aside = document.createElement('aside');
        aside.id = 'carrito-listado';
        aside.className = 'carrito-hidden';
        aside.setAttribute('aria-hidden', 'true');
        aside.innerHTML = `
            <div class="carrito-header">
                <h3>Tu carrito</h3>
                <button id="btn-cerrar-carrito" aria-label="Cerrar carrito">✕</button>
            </div>
            <div id="carrito-items"></div>
            <div class="carrito-footer">
                <div class="carrito-total">Total: <strong id="carrito-total">$0.00</strong></div>
                <div class="carrito-actions">
                    <button id="vaciar-carrito" class="btn-danger">Vaciar</button>
                    <button id="checkout" class="btn-primary">Finalizar compra</button>
                </div>
            </div>
        `;
        document.body.appendChild(aside);
    }

    // Footer
    if (!document.querySelector('footer')) {
        const footer = document.createElement('footer');
        footer.innerHTML = `<div class="footer-inner"><p>© 2025 ECO.moda.infantil. Todos los derechos reservados.</p></div>`;
        document.body.appendChild(footer);
    }
}

// Inicialización cuando carga el DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Insertar layout común si falta (header/footer/aside)
    insertCommonLayoutIfMissing();

    // Referencias DOM (después de insertar layout)
    const contenedorProductos = document.getElementById('contenedor-productos');
    const carritoListado = document.getElementById('carrito-listado');
    const carritoItemsContainer = document.getElementById('carrito-items');
    const contadorCarrito = document.getElementById('contador-carrito');
    const carritoTotalEl = document.getElementById('carrito-total');
    const btnToggleCarrito = document.getElementById('btn-toggle-carrito');
    const btnCerrarCarrito = document.getElementById('btn-cerrar-carrito');
    const btnVaciarCarrito = document.getElementById('vaciar-carrito');

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // Inicializar carrito desde localStorage
    function inicializarCarrito() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            carrito = raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error('Error leyendo carrito', err);
            carrito = [];
        }
    }

    function guardarCarrito() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
        } catch (err) {
            console.error('Error guardando carrito', err);
        }
    }

    async function cargarYRenderizarProductos() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const productos = await res.json();
            renderizarProductos(productos);
        } catch (err) {
            console.error('No se pudieron cargar los productos', err);
            if (contenedorProductos) contenedorProductos.innerHTML = '<p>Error al cargar productos.</p>';
        }
    }

    function renderizarProductos(productos = []) {
        if (!contenedorProductos) return;
        contenedorProductos.innerHTML = productos.map((p) => {
            const title = escapeHtml(p.title);
            return `
                <article class="producto-card">
                    <div class="producto-img-wrap"><img src="${p.image}" alt="${title}" class="producto-img"></div>
                    <h3 class="producto-title">${title}</h3>
                    <p class="producto-price">$${Number(p.price).toFixed(2)}</p>
                    <div class="producto-actions">
                        <button class="btn-agregar" data-id="${p.id}" data-nombre="${title}" data-precio="${p.price}">Añadir al Carrito</button>
                        <a class="btn-detalle" href="pages/descripcion.html">Ver</a>
                    </div>
                </article>
            `;
        }).join('');
    }

    function agregarProducto(id, nombre, precio) {
        const idStr = String(id);
        const existente = carrito.find((it) => String(it.id) === idStr);
        if (existente) {
            existente.cantidad = Number(existente.cantidad) + 1;
        } else {
            carrito.push({ id: idStr, nombre, precio: Number(precio) || 0, cantidad: 1 });
        }
        guardarCarrito();
        actualizarContadorCarrito();
        renderizarCarrito();
        showToast(`${nombre} añadido al carrito`);
    }

    function eliminarProducto(id) {
        carrito = carrito.filter((it) => String(it.id) !== String(id));
        guardarCarrito();
        actualizarContadorCarrito();
        renderizarCarrito();
    }

    function cambiarCantidad(id, cantidad) {
        const item = carrito.find((it) => String(it.id) === String(id));
        if (!item) return;
        item.cantidad = Math.max(1, Number(cantidad) || 1);
        guardarCarrito();
        actualizarContadorCarrito();
        renderizarCarrito();
    }

    function vaciarCarrito() {
        carrito = [];
        guardarCarrito();
        actualizarContadorCarrito();
        renderizarCarrito();
    }

    function renderizarCarrito() {
        if (!carritoItemsContainer) return;
        if (!carrito || carrito.length === 0) {
            carritoItemsContainer.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío.</p>';
            if (carritoTotalEl) carritoTotalEl.textContent = '$0.00';
            return;
        }

        const html = carrito.map((it) => {
            const subtotal = (it.precio * it.cantidad).toFixed(2);
            return `
                <div class="cart-item" data-id="${it.id}">
                    <div class="cart-item-left">
                        <div class="cart-item-nombre">${escapeHtml(it.nombre)}</div>
                        <div class="cart-item-controls">Cantidad: <input class="cantidad-input" type="number" min="1" value="${it.cantidad}" data-id="${it.id}"></div>
                    </div>
                    <div class="cart-item-right">
                        <div class="cart-item-subtotal">$${subtotal}</div>
                        <button class="btn-eliminar" data-id="${it.id}">Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');

        carritoItemsContainer.innerHTML = html;
        const total = carrito.reduce((acc, it) => acc + it.precio * it.cantidad, 0).toFixed(2);
        if (carritoTotalEl) carritoTotalEl.textContent = `$${total}`;
    }

    function actualizarContadorCarrito() {
        if (!contadorCarrito) return;
        const total = carrito.reduce((acc, it) => acc + Number(it.cantidad), 0);
        contadorCarrito.textContent = String(total);
    }

    function configurarEventosGlobales() {
        // Delegación para botones "Añadir al Carrito"
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('.btn-agregar');
            if (btn) {
                const id = btn.dataset.id;
                const nombre = btn.dataset.nombre || '';
                const precio = btn.dataset.precio || 0;
                agregarProducto(id, nombre, precio);
            }
        });

        // Delegación dentro del contenedor del carrito
        if (carritoItemsContainer) {
            carritoItemsContainer.addEventListener('click', (e) => {
                const btnDel = e.target.closest && e.target.closest('.btn-eliminar');
                if (btnDel) {
                    const id = btnDel.dataset.id;
                    eliminarProducto(id);
                }
            });

            carritoItemsContainer.addEventListener('input', (e) => {
                const input = e.target.closest && e.target.closest('.cantidad-input');
                if (input) {
                    const id = input.dataset.id;
                    const val = parseInt(input.value, 10) || 1;
                    cambiarCantidad(id, Math.max(1, val));
                }
            });
        }

        // Toggle carrito
        if (btnToggleCarrito) {
            btnToggleCarrito.addEventListener('click', () => toggleCarrito());
        }
        if (btnCerrarCarrito) btnCerrarCarrito.addEventListener('click', () => toggleCarrito(false));
        if (btnVaciarCarrito) btnVaciarCarrito.addEventListener('click', () => {
            if (confirm('¿Vaciar el carrito?')) vaciarCarrito();
        });
    }

    function toggleCarrito(forceOpen) {
        if (!carritoListado) return;
        const isVisible = carritoListado.classList.contains('carrito-visible');
        const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isVisible;
        if (shouldOpen) {
            carritoListado.classList.add('carrito-visible');
            carritoListado.setAttribute('aria-hidden', 'false');
            btnToggleCarrito && btnToggleCarrito.setAttribute('aria-expanded', 'true');
        } else {
            carritoListado.classList.remove('carrito-visible');
            carritoListado.setAttribute('aria-hidden', 'true');
            btnToggleCarrito && btnToggleCarrito.setAttribute('aria-expanded', 'false');
        }
    }

    // Toast simple
    function showToast(message, duration = 2000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.right = '1rem';
            container.style.bottom = '1rem';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        toast.style.transition = 'opacity .2s ease, transform .2s ease';
        container.appendChild(toast);
        // Force reflow
        void toast.offsetWidth;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(6px)';
            setTimeout(() => { try { container.removeChild(toast); } catch (e) {} }, 220);
        }, duration);
    }

    // Start
    inicializarCarrito();
    await cargarYRenderizarProductos();
    renderizarCarrito();
    actualizarContadorCarrito();
    configurarEventosGlobales();

    // export for debugging
    window.__ECOM = { agregarProducto, eliminarProducto, cambiarCantidad, vaciarCarrito, carrito };
});