let elementosGlobal = [];
  let encabezadosGlobal = [];
  let registrosFiltradosGlobal = [];
  let paginaActual = 1;
  const registrosPorPagina = 10;
  let mapaElementos = null;
  let marcadoresMapa = [];
  let vistaActual = "tabla";

  const COL = {
    ID_ELEMENTO: "ID_ELEMENTO",
    FECHA_REGISTRO: "FECHA_HORA_REGISTRO",
    FECHA: "FECHA",
    CIRCUITO: "CIRCUITO",
    CIRCUITO_TXT: "CIRCUITO_TXT",
    DIRECCION: "DIRECCION",
    PRIORIDAD: "PRIORIDAD",
    MATERIAL: "MATERIAL/ALTURA",
    ESTADO: "ESTADO",
    SECTOR: "SECTOR",
    FILE: "FILE",
    FOTO_DANO: "FOTO_DAÑO",
    FOTO_DANO_2: "FOTO_DAÑO_2",
    FOTO_PANORAMICA: "FOTO_PANORAMICA",
    FOTO_ESTRUCTURA: "FOTO_ESTRUCTURA",
    FOTO_CAMBIO_1: "FOTO_CAMBIO_1",
    FOTO_CAMBIO_2: "FOTO_CAMBIO_2",
    FOTO_CAMBIO_3: "FOTO_CAMBIO_3",
    LATITUDE: "LATITUDE",
    LONGITUDE: "LONGITUDE"
  };

  document.addEventListener("DOMContentLoaded", function() {
    validarSesion();
    cargarElementos();
  });

  function validarSesion() {
    const usuario = sessionStorage.getItem("usuario");
    const tipoUsuario = sessionStorage.getItem("tipo_usuario");
    const sector = sessionStorage.getItem("sector");

    if (!usuario) {
      window.location.href = "index.html";
      return;
    }

    document.getElementById("nombreUsuario").textContent = usuario || "";
    document.getElementById("tipoUsuario").textContent = tipoUsuario || "";
    document.getElementById("nombreSector").textContent = sector || "";

    document.getElementById("sidebarUsuario").textContent = usuario || "";
    document.getElementById("sidebarTipo").textContent = tipoUsuario || "";
    document.getElementById("sidebarSector").textContent = sector || "";
  }

  function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("collapsed");
    document.getElementById("main").classList.toggle("expanded");
  }

  function apiJSONP(params) {
    return new Promise((resolve, reject) => {
      const callbackName = "jsonp_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
      params.callback = callbackName;

      const query = new URLSearchParams(params).toString();
      const script = document.createElement("script");

      window[callbackName] = function(data) {
        resolve(data);
        script.remove();
        delete window[callbackName];
      };

      script.onerror = function() {
        reject(new Error("Error conectando con Apps Script"));
        script.remove();
        delete window[callbackName];
      };

      script.src = CONFIG.URL_APPS_SCRIPT + "?" + query;
      document.body.appendChild(script);
    });
  }

  async function cargarElementos() {
    try {
      mostrarMensajeTabla("Cargando elementos...");

      const data = await apiJSONP({
        action: "obtenerElementos"
      });

      if (!data.ok) {
        mostrarMensajeTabla(data.error || "No se pudieron cargar los elementos.", true);
        return;
      }

      const sectorLogin = String(sessionStorage.getItem("sector") || "")
  .trim()
  .toUpperCase();

elementosGlobal = (data.registros || []).filter(reg => {
  const sectorRegistro = obtenerValor(reg, COL.SECTOR)
    .trim()
    .toUpperCase();

  return !sectorLogin || sectorRegistro === sectorLogin;
});
      encabezadosGlobal = data.encabezados || [];

      llenarFiltros();
      actualizarResumen();
      renderizarTabla();

    } catch (error) {
      mostrarMensajeTabla("Error de conexión con Apps Script.", true);
    }
  }

  function llenarFiltros() {
    llenarSelect("filtroPrioridad", obtenerUnicosPorSector(COL.PRIORIDAD), "Todas");
    llenarSelect("filtroCircuito", obtenerUnicosCircuito(), "Todos");
    llenarSelect("filtroMaterial", obtenerUnicosMaterial(), "Todos");
  }

  function llenarSelect(idSelect, valores, textoDefault) {
    const select = document.getElementById(idSelect);
    select.innerHTML = `<option value="ALL">${textoDefault}</option>`;

    valores.forEach(valor => {
      if (valor) {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
      }
    });
  }

  function obtenerUnicosPorSector(nombreColumna) {
    const set = new Set();
    const sectorLogin = String(sessionStorage.getItem("sector") || "").trim().toUpperCase();

    elementosGlobal.forEach(reg => {
      const regSector = obtenerValor(reg, COL.SECTOR).trim().toUpperCase();
      if (sectorLogin && regSector !== sectorLogin) return;

      const valor = obtenerValor(reg, nombreColumna);
      if (valor) set.add(valor);
    });

    return Array.from(set).sort();
  }

  function obtenerCircuitoMostrar(reg) {
    return obtenerValor(reg, COL.CIRCUITO_TXT) || obtenerValor(reg, COL.CIRCUITO);
  }

  function obtenerUnicosCircuito() {
    const set = new Set();
    const sectorLogin = String(sessionStorage.getItem("sector") || "").trim().toUpperCase();

    elementosGlobal.forEach(reg => {
      const regSector = obtenerValor(reg, COL.SECTOR).trim().toUpperCase();
      if (sectorLogin && regSector !== sectorLogin) return;

      const valor = obtenerCircuitoMostrar(reg);
      if (valor) set.add(valor);
    });

    return Array.from(set).sort();
  }

  function obtenerUnicosMaterial() {
    const set = new Set();
    const sectorLogin = String(sessionStorage.getItem("sector") || "").trim().toUpperCase();

    elementosGlobal.forEach(reg => {
      const regSector = obtenerValor(reg, COL.SECTOR).trim().toUpperCase();
      if (sectorLogin && regSector !== sectorLogin) return;

      const valor = obtenerValor(reg, COL.MATERIAL);
      if (valor) set.add(valor);
    });

    return Array.from(set).sort();
  }

  function obtenerRegistrosFiltrados() {
    const estado = document.getElementById("filtroEstado").value;
    const prioridad = document.getElementById("filtroPrioridad").value;
    const circuito = document.getElementById("filtroCircuito").value;
    const material = document.getElementById("filtroMaterial").value;
    const idElemento = document.getElementById("filtroIdElemento").value.trim().toUpperCase();
    const fechaDesde = document.getElementById("fechaDesde").value;
    const fechaHasta = document.getElementById("fechaHasta").value;

    const sectorLogin = String(sessionStorage.getItem("sector") || "").trim().toUpperCase();

    let registros = elementosGlobal.filter(reg => {
      const regSector = obtenerValor(reg, COL.SECTOR).toUpperCase();
      const regEstado = obtenerValor(reg, COL.ESTADO).toUpperCase();
      const regPrioridad = obtenerValor(reg, COL.PRIORIDAD);
      const regMaterial = obtenerValor(reg, COL.MATERIAL);
      const regCircuito = obtenerCircuitoMostrar(reg);
      const regId = obtenerValor(reg, COL.ID_ELEMENTO).toUpperCase();

      const fechaBase =
        obtenerValor(reg, COL.FECHA_REGISTRO) ||
        obtenerValor(reg, COL.FECHA);

      const regFecha = convertirFechaInput(fechaBase);

      if (sectorLogin && regSector && regSector !== sectorLogin) return false;
      if (estado !== "ALL" && regEstado !== estado) return false;
      if (prioridad !== "ALL" && regPrioridad !== prioridad) return false;
      if (circuito !== "ALL" && regCircuito !== circuito) return false;
      if (material !== "ALL" && regMaterial !== material) return false;
      if (idElemento && !regId.includes(idElemento)) return false;
      if (fechaDesde && regFecha && regFecha < fechaDesde) return false;
      if (fechaHasta && regFecha && regFecha > fechaHasta) return false;

      return true;
    });

    registros.sort((a, b) => {
      const fa = convertirFechaInput(obtenerValor(a, COL.FECHA_REGISTRO) || obtenerValor(a, COL.FECHA));
      const fb = convertirFechaInput(obtenerValor(b, COL.FECHA_REGISTRO) || obtenerValor(b, COL.FECHA));
      return fb.localeCompare(fa);
    });

    return registros;
  }

  function renderizarTabla(resetPagina = true) {
    const tbody = document.getElementById("tablaElementos");

    if (resetPagina) paginaActual = 1;

    const registros = obtenerRegistrosFiltrados();
    registrosFiltradosGlobal = registros;
    if (vistaActual === "mapa") renderizarMapa();

    if (registros.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="mensaje-tabla">No hay registros para mostrar.</td></tr>`;
      actualizarFooter(0, 0, 0);
      return;
    }

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const paginaRegistros = registros.slice(inicio, fin);

    tbody.innerHTML = "";

    paginaRegistros.forEach(reg => {
      const id = obtenerValor(reg, COL.ID_ELEMENTO);
      const fechaBase = obtenerValor(reg, COL.FECHA_REGISTRO) || obtenerValor(reg, COL.FECHA);
      const fecha = formatearFecha(fechaBase);
      const circuito = obtenerCircuitoMostrar(reg);
      const material = obtenerValor(reg, COL.MATERIAL);
      const direccion = obtenerValor(reg, COL.DIRECCION);
      const prioridad = obtenerValor(reg, COL.PRIORIDAD);
      const estado = obtenerValor(reg, COL.ESTADO);
      const file = obtenerValor(reg, COL.FILE);
      const lat = obtenerValor(reg, COL.LATITUDE);
      const lng = obtenerValor(reg, COL.LONGITUDE);

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="col-id">${escaparHtml(id)}</td>
        <td class="col-fecha">${escaparHtml(fecha)}</td>
        <td class="col-circuito">${escaparHtml(circuito)}</td>
        <td class="col-material">${escaparHtml(material)}</td>
        <td class="col-direccion">${escaparHtml(direccion)}</td>
        <td class="col-prioridad">${badgePrioridad(prioridad)}</td>
        <td class="col-estado">${badgeEstado(estado)}</td>
        <td class="col-acciones">
          <div class="acciones-td">
            <button class="btn-icon btn-pdf" onclick="abrirPDF('${escaparAtributo(file)}')">
              <i class="fas fa-file-pdf"></i> PDF
            </button>

            <button class="btn-icon btn-maps" onclick="abrirMaps('${escaparAtributo(lat)}','${escaparAtributo(lng)}')">
              <i class="fas fa-map-marker-alt"></i> MAPS
            </button>

            ${
              String(estado).trim().toUpperCase() === "EJECUTADO"
                ? `<span class="estado-ok" title="Elemento ejecutado"></span>`
                : `<button class="btn-icon btn-ejecutar" onclick="ejecutarElemento('${escaparAtributo(id)}')">
                    <i class="fas fa-check"></i> EJECUTAR
                   </button>`
            }
            ${botonEliminarElemento(id)}
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
    actualizarFooter(registros.length, inicio + 1, Math.min(fin, registros.length));
  }

  function actualizarFooter(total, inicio, fin) {
    const info = document.getElementById("infoRegistros");
    const totalPaginas = Math.max(1, Math.ceil(total / registrosPorPagina));

    info.textContent = total === 0
      ? "Mostrando 0 elementos"
      : `Mostrando ${inicio} a ${fin} de ${total} elementos`;

    document.getElementById("paginaActual").textContent = paginaActual;
    document.getElementById("btnPrev").disabled = paginaActual <= 1;
    document.getElementById("btnNext").disabled = paginaActual >= totalPaginas;
  }

  function cambiarPagina(direccion) {
    const totalPaginas = Math.max(1, Math.ceil(registrosFiltradosGlobal.length / registrosPorPagina));
    const nuevaPagina = paginaActual + direccion;

    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;

    paginaActual = nuevaPagina;
    renderizarTabla(false);
  }

  function actualizarResumen() {
    const sectorLogin = String(sessionStorage.getItem("sector") || "").trim().toUpperCase();

    let pendiente = 0;
    let ejecutado = 0;
    let total = 0;
    const circuitos = new Set();

    elementosGlobal.forEach(reg => {
      const regSector = obtenerValor(reg, COL.SECTOR).toUpperCase();
      const estado = obtenerValor(reg, COL.ESTADO).toUpperCase();
      const circuito = obtenerCircuitoMostrar(reg);

      if (sectorLogin && regSector && regSector !== sectorLogin) return;

      total++;

      if (circuito) circuitos.add(circuito);
      if (estado === "PENDIENTE") pendiente++;
      if (estado === "EJECUTADO") ejecutado++;
    });

    document.getElementById("totalPendiente").textContent = pendiente;
    document.getElementById("totalEjecutado").textContent = ejecutado;
    document.getElementById("totalElementos").textContent = total;
    document.getElementById("totalCircuitos").textContent = circuitos.size;
    document.getElementById("ultimaActualizacion").textContent = obtenerFechaHoraActual();
  }

  function obtenerValor(reg, nombreColumna) {
    if (!reg || !reg.obj) return "";
    const valor = reg.obj[nombreColumna];
    if (valor === null || valor === undefined) return "";
    return String(valor).trim();
  }

  function badgePrioridad(prioridad) {
    const p = String(prioridad || "").trim().toUpperCase();
    let clase = "";

    if (p === "URGENTE") clase = "badge-urgente";
    else if (p === "ALTA") clase = "badge-alta";
    else if (p === "MEDIA") clase = "badge-media";
    else if (p === "BAJA") clase = "badge-baja";

    return `<span class="badge ${clase}">${escaparHtml(prioridad || "")}</span>`;
  }

  function badgeEstado(estado) {
    const e = String(estado || "").trim().toUpperCase();
    let clase = "";

    if (e === "PENDIENTE") clase = "badge-pendiente";
    else if (e === "EJECUTADO") clase = "badge-ejecutado";

    return `<span class="badge ${clase}">${escaparHtml(estado || "")}</span>`;
  }

async function abrirPDF(file) {
  if (!file) {
    alert("Este registro no tiene PDF.");
    return;
  }

  if (file.startsWith("http")) {
    window.open(file, "_blank");
    return;
  }

  try {
    const data = await apiJSONP({
      action: "obtenerUrlPdfDrive",
      ruta: file
    });

    if (data.ok && data.url) {
      window.open(data.url, "_blank");
    } else {
      alert(data.error || "No se encontró el PDF.");
    }

  } catch (error) {
    alert("Error buscando el PDF en Drive.");
  }
}

function abrirMaps(lat, lng) {
  if (!lat || !lng) {
    alert("Este registro no tiene coordenadas.");
    return;
  }

  const url = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
  window.open(url, "_blank");
}

async function ejecutarElemento(id) {
  if (!id) {
    alert("No se recibió ID del elemento.");
    return;
  }

  if (!confirm("¿Desea marcar este elemento como EJECUTADO?")) {
    return;
  }

  try {
    const data = await apiJSONP({
      action: "ejecutarElemento",
      id: id
    });

    if (data.ok) {
      const reg = elementosGlobal.find(r => obtenerValor(r, COL.ID_ELEMENTO) === id);
      if (reg && reg.obj) reg.obj[COL.ESTADO] = "EJECUTADO";
      actualizarResumen();
      renderizarTabla(false);
      if (vistaActual === "mapa") {
        renderizarMapa();
        seleccionarElementoMapa(id);
      }
      alert("Elemento ejecutado correctamente.");
    } else {
      alert(data.error || "No se pudo ejecutar el elemento.");
    }

  } catch (error) {
    alert("Error actualizando el estado.");
  }
}

  function limpiarFiltros() {
    document.getElementById("filtroEstado").value = "ALL";
    document.getElementById("filtroPrioridad").value = "ALL";
    document.getElementById("filtroCircuito").value = "ALL";
    document.getElementById("filtroMaterial").value = "ALL";
    document.getElementById("filtroIdElemento").value = "";
    document.getElementById("fechaDesde").value = "";
    document.getElementById("fechaHasta").value = "";

    renderizarTabla();
  }

  function exportarTablaFiltrada() {
    const registros = registrosFiltradosGlobal.length
      ? registrosFiltradosGlobal
      : obtenerRegistrosFiltrados();

    if (!registros.length) {
      alert("No hay datos filtrados para exportar.");
      return;
    }

    if (typeof XLSX === "undefined") {
      alert("No se cargó la librería de Excel. Revisa tu conexión o el CDN XLSX.");
      return;
    }

    const encabezados = encabezadosGlobal.length
      ? encabezadosGlobal
      : Object.keys(registros[0].obj || {});

    const filas = registros.map(reg => {
      const fila = {};
      encabezados.forEach(h => {
        fila[h] = obtenerValor(reg, h);
      });
      return fila;
    });

    const ws = XLSX.utils.json_to_sheet(filas, { header: encabezados });
    ws["!cols"] = encabezados.map(h => ({ wch: Math.min(Math.max(String(h).length + 4, 14), 35) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ELEMENTOS_DE_RED");

    const sector = sessionStorage.getItem("sector") || "SECTOR";
    const fecha = new Date().toISOString().substring(0, 10);

    XLSX.writeFile(wb, `Elementos_Red_${sector}_${fecha}.xlsx`);
  }


  function abrirModalPostes() {
    const contenedor = document.getElementById("contenidoPostes");
    const modal = document.getElementById("modalPostes");

    const datos = obtenerPendientesPorMaterial();

    if (!datos.length) {
      contenedor.innerHTML = '<div class="mensaje-tabla">No hay postes pendientes para mostrar.</div>';
    } else {
      const max = Math.max(...datos.map(d => d.total));
      contenedor.innerHTML = datos.map(d => {
        const ancho = max ? Math.round((d.total / max) * 100) : 0;
        return `
          <div class="bar-row" onclick="aplicarFiltroMaterial('${escaparAtributo(d.material)}')">
            <div class="bar-label">${escaparHtml(d.material)}</div>
            <div class="bar-count">${d.total}</div>
            <div class="bar-bg"><div class="bar-fill" style="width:${ancho}%"></div></div>
          </div>
        `;
      }).join("") + '<div class="modal-note">Solo se muestran registros PENDIENTES del sector actual. Clic en una barra para filtrar.</div>';
    }

    modal.classList.add("show");
  }

  function cerrarModalPostes(event) {
    if (event && event.target.id !== "modalPostes") return;
    document.getElementById("modalPostes").classList.remove("show");
  }

  function obtenerPendientesPorMaterial() {
    const sectorLogin = String(sessionStorage.getItem("sector") || "").trim().toUpperCase();
    const mapa = {};

    elementosGlobal.forEach(reg => {
      const regSector = obtenerValor(reg, COL.SECTOR).toUpperCase();
      const estado = obtenerValor(reg, COL.ESTADO).toUpperCase();
      const material = obtenerValor(reg, COL.MATERIAL) || "SIN MATERIAL";

      if (sectorLogin && regSector !== sectorLogin) return;
      if (estado !== "PENDIENTE") return;

      mapa[material] = (mapa[material] || 0) + 1;
    });

    return Object.keys(mapa)
      .map(material => ({ material, total: mapa[material] }))
      .sort((a, b) => b.total - a.total);
  }

  function aplicarFiltroMaterial(material) {
    cerrarModalPostes();
    document.getElementById("filtroEstado").value = "PENDIENTE";
    document.getElementById("filtroMaterial").value = material;
    renderizarTabla();
  }


  function mostrarVistaTabla() {
    vistaActual = "tabla";
    document.getElementById("panelFiltros").style.display = "block";
    document.getElementById("panelTabla").style.display = "block";
    document.getElementById("panelMapa").classList.remove("show");
    activarNav("navDashboard");
  }

  function mostrarVistaMapa() {
    vistaActual = "mapa";
    document.getElementById("panelFiltros").style.display = "block";
    document.getElementById("panelTabla").style.display = "none";
    document.getElementById("panelMapa").classList.add("show");
    activarNav("navMapa");
    renderizarMapa();
    setTimeout(() => {
      if (mapaElementos) mapaElementos.invalidateSize();
    }, 250);
  }

  function activarNav(idActivo) {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    const activo = document.getElementById(idActivo);
    if (activo) activo.classList.add("active");
  }

  function obtenerConfigMapaSector() {
    const sector = String(sessionStorage.getItem("sector") || "").trim().toUpperCase();
    const mapas = window.MAPAS_SECTOR || {
      "JUTICALPA": { nombre:"Mapa base Juticalpa", lat:14.958349515262615, lng:-86.14916699999998, zoom:11 },
      "CATACAMAS": { nombre:"Mapa base Catacamas", lat:14.8391, lng:-85.8954, zoom:11 },
      "CHOLUTECA": { nombre:"Mapa base Choluteca", lat:13.3003, lng:-87.1908, zoom:11 },
      "TEGUCIGALPA": { nombre:"Mapa base Tegucigalpa", lat:14.0723, lng:-87.1921, zoom:11 },
      "DANLI": { nombre:"Mapa base Danlí", lat:14.0333, lng:-86.5833, zoom:11 },
      "TOCOA": { nombre:"Mapa base Tocoa", lat:15.6833, lng:-86.0000, zoom:11 },
      "LA CEIBA": { nombre:"Mapa base La Ceiba", lat:15.7797, lng:-86.7931, zoom:11 },
      "COMAYAGUA": { nombre:"Mapa base Comayagua", lat:14.4514, lng:-87.6375, zoom:11 }
    };
    return mapas[sector] || { nombre:`Mapa base ${sector || "Sector"}`, lat:14.8, lng:-86.5, zoom:8 };
  }

  function renderizarMapa() {
    if (typeof L === "undefined") {
      document.getElementById("detalleMapa").innerHTML = `
        <div class="element-detail-card">
          <div class="element-detail-header"><h3>No cargó el mapa</h3><small>Revise la conexión a internet o el CDN de Leaflet.</small></div>
        </div>`;
      return;
    }

    const cfg = obtenerConfigMapaSector();
    const registros = obtenerRegistrosFiltrados().filter(reg => {
      const lat = parseFloat(obtenerValor(reg, COL.LATITUDE).replace(",", "."));
      const lng = parseFloat(obtenerValor(reg, COL.LONGITUDE).replace(",", "."));
      return Number.isFinite(lat) && Number.isFinite(lng);
    });

    document.getElementById("mapaResumenTexto").textContent = `${cfg.nombre} · ${registros.length} elementos con GPS`;

    if (!mapaElementos) {
      mapaElementos = L.map("mapaElementos", {
        zoomControl:true,
        preferCanvas:true
      }).setView([cfg.lat, cfg.lng], cfg.zoom || 11);

      L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        maxZoom:22,
        attribution:"Google Satellite"
      }).addTo(mapaElementos);

      cargarMapaBaseSector(cfg);
    } else {
      mapaElementos.setView([cfg.lat, cfg.lng], cfg.zoom || 11);
    }

    marcadoresMapa.forEach(m => mapaElementos.removeLayer(m));
    marcadoresMapa = [];

    const bounds = [];

    registros.forEach(reg => {
      const lat = parseFloat(obtenerValor(reg, COL.LATITUDE).replace(",", "."));
      const lng = parseFloat(obtenerValor(reg, COL.LONGITUDE).replace(",", "."));
      const prioridad = obtenerValor(reg, COL.PRIORIDAD).trim().toUpperCase();
      const id = obtenerValor(reg, COL.ID_ELEMENTO);
      const circuito = obtenerCircuitoMostrar(reg);
      const material = obtenerValor(reg, COL.MATERIAL);
      const markerClass = obtenerClaseMarcadorPrioridad(prioridad);

      const icon = L.divIcon({
        className:"",
        html:`<div class="custom-marker ${markerClass}"></div>`,
        iconSize:[20,20],
        iconAnchor:[10,10]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(mapaElementos);
      marker.bindPopup(`
        <div class="map-popup-title">${escaparHtml(id)}</div>
        <div class="map-popup-text">${escaparHtml(circuito)}<br>${escaparHtml(material)}</div>
        <button class="map-popup-btn" onclick="seleccionarElementoMapa('${escaparAtributo(id)}')">Ver datos y fotos</button>
      `);
      marker.on("click", () => seleccionarElementoMapa(id));
      marcadoresMapa.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length) {
      mapaElementos.fitBounds(bounds, { padding:[35,35], maxZoom:15 });
    }
  }

  function seleccionarElementoMapa(id) {
    const reg = elementosGlobal.find(r => obtenerValor(r, COL.ID_ELEMENTO) === id);
    if (!reg) return;

    const fechaBase = obtenerValor(reg, COL.FECHA_REGISTRO) || obtenerValor(reg, COL.FECHA);
    const lat = obtenerValor(reg, COL.LATITUDE);
    const lng = obtenerValor(reg, COL.LONGITUDE);
    const estado = obtenerValor(reg, COL.ESTADO);
    const fotos = obtenerFotosElemento(reg);

    document.getElementById("detalleMapa").innerHTML = `
      <div class="element-detail-card">
        <div class="element-detail-header">
          <h3>${escaparHtml(id || "Elemento")}</h3>
          <small>${escaparHtml(formatearFecha(fechaBase) || "Sin fecha")}</small>
        </div>

        <div class="detail-section">
          <div class="detail-row"><span>ID</span><strong>${escaparHtml(id)}</strong></div>
          <div class="detail-row"><span>Circuito</span><strong>${escaparHtml(obtenerCircuitoMostrar(reg))}</strong></div>
          <div class="detail-row"><span>Material</span><strong>${escaparHtml(obtenerValor(reg, COL.MATERIAL))}</strong></div>
          <div class="detail-row"><span>Prioridad</span><strong>${badgePrioridad(obtenerValor(reg, COL.PRIORIDAD))}</strong></div>
          <div class="detail-row"><span>Estado</span><strong>${badgeEstado(estado)}</strong></div>
          <div class="detail-row"><span>Dirección</span><strong>${escaparHtml(obtenerValor(reg, COL.DIRECCION))}</strong></div>
        </div>

        <div class="detail-section">
          <div class="photo-grid">
            ${fotos.map(f => renderFotoMiniatura(f, id)).join("")}
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-icon btn-maps" onclick="abrirMaps('${escaparAtributo(lat)}','${escaparAtributo(lng)}')">
            <i class="fas fa-map-marker-alt"></i> MAPS
          </button>
          ${String(estado).trim().toUpperCase() === "EJECUTADO"
            ? `<span class="estado-ok" title="Elemento ejecutado"></span>`
            : `<button class="btn-icon btn-ejecutar" onclick="ejecutarElemento('${escaparAtributo(id)}')"><i class="fas fa-check"></i> EJECUTAR</button>`
          }
          ${botonEliminarElemento(id)}
        </div>
      </div>
    `;

    setTimeout(cargarMiniaturasDetalle, 0);
  }

  function obtenerFotosElemento(reg) {
    return [
      { titulo:"Daño", url:obtenerValor(reg, COL.FOTO_DANO) },
      { titulo:"Daño 2", url:obtenerValor(reg, COL.FOTO_DANO_2) },
      { titulo:"Panorámica", url:obtenerValor(reg, COL.FOTO_PANORAMICA) },
      { titulo:"Estructura", url:obtenerValor(reg, COL.FOTO_ESTRUCTURA) },
      { titulo:"Cambio 1", url:obtenerValor(reg, COL.FOTO_CAMBIO_1) },
      { titulo:"Cambio 2", url:obtenerValor(reg, COL.FOTO_CAMBIO_2) },
      { titulo:"Cambio 3", url:obtenerValor(reg, COL.FOTO_CAMBIO_3) }
    ].filter(f => f.url);
  }

  function renderFotoMiniatura(foto, id) {
    if (!foto.url) {
      return `<div class="photo-thumb photo-empty">Sin foto<label>${escaparHtml(foto.titulo)}</label></div>`;
    }

    const ruta = String(foto.url || "").trim();
    const esUrl = /^https?:\/\//i.test(ruta);
    const srcInicial = esUrl ? ruta : "";
    const textoCarga = esUrl ? "" : `<div class="foto-loading">Cargando...</div>`;

    return `
      <div class="photo-thumb" onclick="abrirImagenGrandeDesdeRuta('${escaparAtributo(ruta)}','${escaparAtributo(foto.titulo)} - ${escaparAtributo(id)}')">
        ${textoCarga}
        <img class="foto-appsheet" data-ruta="${escaparHtml(ruta)}" src="${escaparHtml(srcInicial)}" alt="${escaparHtml(foto.titulo)}" onerror="this.style.display='none'; this.parentElement.classList.add('photo-empty');">
        <label>${escaparHtml(foto.titulo)}</label>
      </div>
    `;
  }

  async function cargarMiniaturasDetalle() {
    const imgs = document.querySelectorAll(".foto-appsheet");

    for (const img of imgs) {
      const ruta = img.getAttribute("data-ruta") || "";
      if (!ruta || /^https?:\/\//i.test(ruta)) continue;

      try {
        const data = await apiJSONP({
          action:"obtenerUrlImagen",
          ruta:ruta
        });

        const loader = img.parentElement.querySelector(".foto-loading");
        if (loader) loader.remove();

        if (data.ok && data.miniatura) {
          img.src = data.miniatura;
          img.style.display = "block";
          img.setAttribute("data-url-final", data.url || data.miniatura);
        } else {
          img.style.display = "none";
          img.parentElement.classList.add("photo-empty");
          img.parentElement.insertAdjacentHTML("afterbegin", "No se pudo cargar");
        }
      } catch (error) {
        const loader = img.parentElement.querySelector(".foto-loading");
        if (loader) loader.textContent = "Sin acceso";
      }
    }
  }

  async function abrirImagenGrandeDesdeRuta(ruta, titulo) {
    if (!ruta) return;

    if (/^https?:\/\//i.test(ruta)) {
      abrirImagenGrande(ruta, titulo);
      return;
    }

    try {
      const data = await apiJSONP({
        action:"obtenerUrlImagen",
        ruta:ruta
      });

      if (data.ok && (data.url || data.miniatura)) {
        abrirImagenGrande(data.url || data.miniatura, titulo);
      } else {
        alert(data.error || "No se pudo abrir la foto.");
      }
    } catch (error) {
      alert("Error abriendo la foto.");
    }
  }

  function abrirImagenGrande(url, titulo) {
    if (!url) return;
    document.getElementById("tituloImagenGrande").innerHTML = `<i class="fas fa-image"></i> ${escaparHtml(titulo || "Foto del elemento")}`;
    document.getElementById("imagenGrande").src = url;
    document.getElementById("modalImagen").classList.add("show");
  }

  function cerrarImagenGrande(event) {
    if (event && event.target.id !== "modalImagen") return;
    document.getElementById("modalImagen").classList.remove("show");
    document.getElementById("imagenGrande").src = "";
  }


  function obtenerClaseMarcadorPrioridad(prioridad) {
    const p = String(prioridad || "").trim().toUpperCase();
    if (p === "URGENTE") return "marker-urgente";
    if (p === "ALTA") return "marker-alta";
    if (p === "MEDIA") return "marker-media";
    return "marker-baja";
  }

  let capaMapaBaseSector = null;

  function cargarMapaBaseSector(cfg) {
    if (!mapaElementos || !cfg || !cfg.mid) return;
    if (typeof omnivore === "undefined") {
      console.warn("Leaflet omnivore no está disponible para cargar KML del mapa base.");
      return;
    }

    try {
      if (capaMapaBaseSector) {
        mapaElementos.removeLayer(capaMapaBaseSector);
        capaMapaBaseSector = null;
      }

      const kmlUrl = "https://www.google.com/maps/d/u/0/kml?mid=" + encodeURIComponent(cfg.mid) + "&forcekml=1";
      capaMapaBaseSector = omnivore.kml(kmlUrl)
        .on("ready", function() {
          capaMapaBaseSector.addTo(mapaElementos);
        })
        .on("error", function(err) {
          console.warn("No se pudo cargar el mapa base del sector.", err);
        });
    } catch (error) {
      console.warn("Error cargando mapa base del sector", error);
    }
  }

  function esUsuarioAdminEliminar() {
    const idTipo = String(sessionStorage.getItem("id_tipous") || "").trim();
    const tipo = String(sessionStorage.getItem("tipo_usuario") || "").trim().toUpperCase();
    return idTipo === "1" || tipo === "1" || tipo.includes("INGENIERO") || tipo.includes("ADMIN");
  }

  function botonEliminarElemento(id) {
    if (!esUsuarioAdminEliminar()) return "";
    return `<button class="btn-icon btn-eliminar" onclick="eliminarElemento('${escaparAtributo(id)}')" title="Eliminar elemento"><i class="fas fa-trash"></i></button>`;
  }

  async function eliminarElemento(id) {
    if (!id) {
      alert("No se recibió ID del elemento.");
      return;
    }

    const palabra = prompt("ATENCIÓN\n\nPara eliminar este elemento escriba:\n\nELIMINAR");

    if (palabra !== "ELIMINAR") {
      alert("Operación cancelada.");
      return;
    }

    if (!confirm("¿Confirma eliminar definitivamente este elemento?")) {
      return;
    }

    try {
      const data = await apiJSONP({
        action:"eliminarElemento",
        id:id
      });

      if (data.ok) {
        elementosGlobal = elementosGlobal.filter(r => obtenerValor(r, COL.ID_ELEMENTO) !== id);
        actualizarResumen();
        renderizarTabla(false);
        if (vistaActual === "mapa") renderizarMapa();
        document.getElementById("detalleMapa").innerHTML = `
          <div class="element-detail-card">
            <div class="element-detail-header"><h3>Elemento eliminado</h3><small>${escaparHtml(id)}</small></div>
            <div class="detail-section"><div class="mensaje-tabla">La fila fue eliminada de Google Sheet.</div></div>
          </div>`;
        alert("Elemento eliminado correctamente.");
      } else {
        alert(data.error || "No se pudo eliminar el elemento.");
      }
    } catch (error) {
      alert("Error eliminando el elemento.");
    }
  }

  function cerrarSesion() {
    sessionStorage.clear();
    window.location.href = "index.html";
  }

  function mostrarMensajeTabla(mensaje, error = false) {
    const tbody = document.getElementById("tablaElementos");
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="mensaje-tabla ${error ? "mensaje-error" : ""}">
          ${escaparHtml(mensaje)}
        </td>
      </tr>
    `;
  }

  function formatearFecha(valor) {
    const fechaInput = convertirFechaInput(valor);
    if (!fechaInput) return valor || "";

    const partes = fechaInput.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function convertirFechaInput(valor) {
    if (!valor) return "";

    valor = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      return valor.substring(0, 10);
    }

    const partes = valor.split(/[\/\s:]+/);

    if (partes.length >= 3) {
      let dia = partes[0].padStart(2, "0");
      let mes = partes[1].padStart(2, "0");
      let anio = partes[2];

      if (anio.length === 2) anio = "20" + anio;

      return `${anio}-${mes}-${dia}`;
    }

    return "";
  }

  function obtenerFechaHoraActual() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, "0");
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const anio = ahora.getFullYear();
    const hora = String(ahora.getHours()).padStart(2, "0");
    const min = String(ahora.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  }

  function escaparHtml(texto) {
    return String(texto ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escaparAtributo(texto) {
    return String(texto ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, " ");
  }