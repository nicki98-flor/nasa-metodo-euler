
"use strict";

// =====================================================
// NASA 1962 - SIMULADOR DEL MÉTODO DE EULER
// Modelo:
// dv/dt = A - k*v
// dy/dt = v
// =====================================================

let datosActuales = [];
let parametrosActuales = null;

const $ = id => document.getElementById(id);

function formato(numero, decimales = 3) {
  if (!Number.isFinite(numero)) return "No definido";
  return numero.toLocaleString("es-BO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  });
}

function leerParametros() {
  const ids = ["A", "k", "v0", "y0", "T", "h"];
  const p = {};

  for (const id of ids) {
    const campo = $(id);

    if (!campo.value.trim()) {
      throw new Error("Completa todos los campos.");
    }

    p[id] = Number(campo.value);

    if (!Number.isFinite(p[id])) {
      throw new Error("Ingresa números válidos.");
    }
  }

  if (p.k < 0) {
    throw new Error("La resistencia k no puede ser negativa.");
  }

  if (p.T <= 0 || p.h <= 0) {
    throw new Error("El tiempo y el paso deben ser positivos.");
  }

  if (p.T / (p.h / 4) > 10000) {
    throw new Error(
      "Demasiadas iteraciones. Aumenta h o reduce el tiempo."
    );
  }

  return p;
}

// =====================================================
// SOLUCIÓN ANALÍTICA
// =====================================================

function solucionExacta(t, p) {
  const { A, k, v0, y0 } = p;

  if (k === 0) {
    return {
      v: v0 + A * t,
      y: y0 + v0 * t + 0.5 * A * t * t
    };
  }

  const vLimite = A / k;
  const diferencia = v0 - vLimite;
  const exponencial = Math.exp(-k * t);

  const v = vLimite + diferencia * exponencial;

  // expm1 mejora la precisión cerca de t = 0
  const integral = -Math.expm1(-k * t) / k;
  const y = y0 + vLimite * t + diferencia * integral;

  return { v, y };
}

// =====================================================
// FUNCIONES DE ERROR
// =====================================================

function errorAbsoluto(aproximado, exacto) {
  return Math.abs(exacto - aproximado);
}

function errorPorcentual(aproximado, exacto) {
  if (Math.abs(exacto) < 1e-12) {
    return null;
  }

  return Math.abs((exacto - aproximado) / exacto) * 100;
}

function mostrarPorcentaje(valor) {
  return valor === null ? "—" : formato(valor, 4);
}

// =====================================================
// MÉTODO DE EULER EXPLÍCITO
// =====================================================

function metodoEuler(p, h) {
  const { A, k, v0, y0, T } = p;

  let t = 0;
  let v = v0;
  let y = y0;

  const filas = [];
  let n = 0;

  // Se permite un último paso menor para llegar a T.
  while (true) {
    const exacta = solucionExacta(t, p);
    const aceleracion = A - k * v;

    filas.push({
      n,
      t,
      v,
      y,
      a: aceleracion,
      vExacta: exacta.v,
      yExacta: exacta.y,
      errorVAbs: errorAbsoluto(v, exacta.v),
      errorYAbs: errorAbsoluto(y, exacta.y),
      errorV: errorPorcentual(v, exacta.v),
      errorY: errorPorcentual(y, exacta.y)
    });

    if (t >= T - 1e-12) break;

    const paso = Math.min(h, T - t);

    // Se usan los valores antiguos de ambas variables.
    const nuevaV = v + paso * (A - k * v);
    const nuevaY = y + paso * v;

    t = Math.min(T, t + paso);
    v = nuevaV;
    y = nuevaY;

    n++;
  }

  return filas;
}

// =====================================================
// RESULTADOS PRINCIPALES
// =====================================================

function mostrarResultados(filas) {
  const ultimo = filas[filas.length - 1];

  $("velEuler").textContent = formato(ultimo.v);
  $("altEuler").textContent = formato(ultimo.y);

  $("velExacta").textContent = formato(ultimo.vExacta);
  $("altExacta").textContent = formato(ultimo.yExacta);

  $("errorVel").textContent = mostrarPorcentaje(ultimo.errorV);
  $("errorAlt").textContent = mostrarPorcentaje(ultimo.errorY);
}

// =====================================================
// TABLA DE ITERACIONES
// =====================================================

function mostrarTabla(filas, p) {
  const tbody = $("cuerpoTabla");
  tbody.innerHTML = "";

  const fragmento = document.createDocumentFragment();

  filas.forEach((fila, indice) => {
    const tr = document.createElement("tr");

    const valores = [
      fila.n,
      formato(fila.t, 3),
      formato(fila.a, 4),
      formato(fila.v, 4),
      formato(fila.y, 4),
      mostrarPorcentaje(fila.errorV),
      mostrarPorcentaje(fila.errorY)
    ];

    valores.forEach(valor => {
      const td = document.createElement("td");
      td.textContent = valor;
      tr.appendChild(td);
    });

    tr.addEventListener("click", () => {
      tbody.querySelectorAll("tr").forEach(
        filaHTML => filaHTML.classList.remove("seleccionada")
      );

      tr.classList.add("seleccionada");
      mostrarProcedimiento(filas, indice, p);
    });

    fragmento.appendChild(tr);
  });

  tbody.appendChild(fragmento);

  if (filas.length > 1) {
    tbody.children[1].classList.add("seleccionada");
    mostrarProcedimiento(filas, 1, p);
  }
}

// =====================================================
// OPERACIONES PASO A PASO
// =====================================================

function mostrarProcedimiento(filas, indice, p) {
  const actual = filas[indice];

  if (indice === 0) {
    $("procedimiento").textContent =
      "Iteración 0: condiciones iniciales.";
    return;
  }

  const anterior = filas[indice - 1];
  const paso = actual.t - anterior.t;

  const aceleracion = p.A - p.k * anterior.v;

  $("procedimiento").innerHTML = `
    <h3>Iteración ${indice}</h3>

    <p>
      Intervalo:
      ${formato(anterior.t, 3)} s →
      ${formato(actual.t, 3)} s
    </p>

    <div class="operacion">
      <strong>1. Aceleración</strong><br>
      a = A − k · v<br>
      a = ${formato(p.A, 4)} −
      (${formato(p.k, 4)} × ${formato(anterior.v, 4)})<br>
      <strong>a = ${formato(aceleracion, 4)} m/s²</strong>
    </div>

    <div class="operacion">
      <strong>2. Velocidad</strong><br>
      vₙ₊₁ = vₙ + h(A − kvₙ)<br>
      v = ${formato(anterior.v, 4)} +
      ${formato(paso, 4)} × ${formato(aceleracion, 4)}<br>
      <strong>v = ${formato(actual.v, 4)} m/s</strong>
    </div>

    <div class="operacion">
      <strong>3. Altura</strong><br>
      yₙ₊₁ = yₙ + hvₙ<br>
      y = ${formato(anterior.y, 4)} +
      ${formato(paso, 4)} × ${formato(anterior.v, 4)}<br>
      <strong>y = ${formato(actual.y, 4)} m</strong>
    </div>

    <div class="operacion">
      <strong>4. Errores absolutos</strong><br>
      Error de velocidad =
      ${formato(actual.errorVAbs, 4)} m/s<br>
      Error de altura =
      ${formato(actual.errorYAbs, 4)} m
    </div>
  `;
}

// =====================================================
// COMPARACIÓN DE PASOS
// =====================================================

function compararPasos(p) {
  const pasos = [p.h, p.h / 2, p.h / 4];

  const tbody = $("tablaComparacion");
  tbody.innerHTML = "";

  const resultados = [];

  pasos.forEach(h => {
    const datos = metodoEuler(p, h);
    const ultimo = datos[datos.length - 1];

    resultados.push({ h, datos, ultimo });

    const tr = document.createElement("tr");

    const valores = [
      formato(h, 4),
      datos.length - 1,
      formato(ultimo.v, 4),
      formato(ultimo.y, 4),
      mostrarPorcentaje(ultimo.errorV),
      mostrarPorcentaje(ultimo.errorY)
    ];

    valores.forEach(valor => {
      const td = document.createElement("td");
      td.textContent = valor;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  return resultados;
}

// =====================================================
// DIBUJO DE GRÁFICAS CON CANVAS
// SIN LIBRERÍAS EXTERNAS
// =====================================================

function dibujarGrafica(id, series, tituloY) {
  const canvas = $(id);
  const rect = canvas.getBoundingClientRect();

  const ancho = Math.max(280, Math.floor(rect.width));
  const alto = 290;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(ancho * dpr);
  canvas.height = Math.round(alto * dpr);

  const ctx = canvas.getContext("2d");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, ancho, alto);

  const margen = {
    izquierda: 64,
    derecha: 15,
    arriba: 20,
    abajo: 55
  };

  const w = ancho - margen.izquierda - margen.derecha;
  const altoGraf = alto - margen.arriba - margen.abajo;

  const puntos = series.flatMap(s => s.datos);

  if (!puntos.length) return;

  let minX = Math.min(...puntos.map(p => p.x));
  let maxX = Math.max(...puntos.map(p => p.x));
  let minY = Math.min(...puntos.map(p => p.y));
  let maxY = Math.max(...puntos.map(p => p.y));

  minY = Math.min(0, minY);
  maxY = Math.max(0, maxY);

  if (maxX === minX) maxX = minX + 1;
  if (maxY === minY) maxY = minY + 1;

  const extraY = (maxY - minY) * 0.08;

  maxY += extraY;
  minY -= extraY;

  const xPixel = x =>
    margen.izquierda + ((x - minX) / (maxX - minX)) * w;

  const yPixel = y =>
    margen.arriba + altoGraf -
    ((y - minY) / (maxY - minY)) * altoGraf;

  // Cuadrícula y etiquetas
  ctx.font = "11px Arial";
  ctx.fillStyle = "#746b82";
  ctx.strokeStyle = "#ece6f2";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const valorY = minY + (maxY - minY) * i / 5;
    const py = yPixel(valorY);

    ctx.beginPath();
    ctx.moveTo(margen.izquierda, py);
    ctx.lineTo(ancho - margen.derecha, py);
    ctx.stroke();

    ctx.textAlign = "right";
    ctx.fillText(valorY.toFixed(1), margen.izquierda - 8, py + 4);

    const valorX = minX + (maxX - minX) * i / 5;
    const px = xPixel(valorX);

    ctx.beginPath();
    ctx.moveTo(px, margen.arriba);
    ctx.lineTo(px, margen.arriba + altoGraf);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillText(valorX.toFixed(1), px, alto - 32);
  }

  // Ejes
  ctx.strokeStyle = "#9787aa";
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.moveTo(margen.izquierda, margen.arriba);
  ctx.lineTo(margen.izquierda, margen.arriba + altoGraf);
  ctx.lineTo(ancho - margen.derecha, margen.arriba + altoGraf);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#625673";
  ctx.fillText("Tiempo (s)", ancho / 2, alto - 10);

  // Curvas
  series.forEach(serie => {
    ctx.beginPath();
    ctx.strokeStyle = serie.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";

    serie.datos.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(xPixel(p.x), yPixel(p.y));
      } else {
        ctx.lineTo(xPixel(p.x), yPixel(p.y));
      }
    });

    ctx.stroke();
  });

  // Leyenda
  ctx.font = "11px Arial";

  let leyendaX = margen.izquierda;
  const leyendaY = 12;

  series.forEach(serie => {
    ctx.fillStyle = serie.color;
    ctx.fillRect(leyendaX, leyendaY - 7, 14, 3);

    ctx.fillStyle = "#665c74";
    ctx.textAlign = "left";
    ctx.fillText(serie.nombre, leyendaX + 19, leyendaY);

    leyendaX += ctx.measureText(serie.nombre).width + 38;
  });

  canvas.setAttribute(
    "aria-label",
    `Gráfica de ${tituloY} respecto al tiempo`
  );
}

// =====================================================
// GENERACIÓN DE LAS CUATRO GRÁFICAS
// =====================================================

function generarGraficas(filas, p) {
  const exactas = [];

  // Curva exacta con más puntos para que sea suave.
  for (let i = 0; i <= 200; i++) {
    const t = p.T * i / 200;
    const s = solucionExacta(t, p);

    exactas.push({ t, ...s });
  }

  dibujarGrafica("graficaVelocidad", [
    {
      nombre: "Euler",
      color: "#aa92d2",
      datos: filas.map(f => ({ x: f.t, y: f.v }))
    },
    {
      nombre: "Exacta",
      color: "#d990ab",
      datos: exactas.map(f => ({ x: f.t, y: f.v }))
    }
  ], "velocidad");

  dibujarGrafica("graficaAltura", [
    {
      nombre: "Euler",
      color: "#aa92d2",
      datos: filas.map(f => ({ x: f.t, y: f.y }))
    },
    {
      nombre: "Exacta",
      color: "#d990ab",
      datos: exactas.map(f => ({ x: f.t, y: f.y }))
    }
  ], "altura");

  dibujarGrafica("graficaErrorVel", [
    {
      nombre: "Error absoluto",
      color: "#a38aca",
      datos: filas.map(f => ({
        x: f.t,
        y: f.errorVAbs
      }))
    }
  ], "error de velocidad");

  dibujarGrafica("graficaErrorAlt", [
    {
      nombre: "Error absoluto",
      color: "#df9fba",
      datos: filas.map(f => ({
        x: f.t,
        y: f.errorYAbs
      }))
    }
  ], "error de altura");
}

// =====================================================
// RESPUESTAS AUTOMÁTICAS DEL DESAFÍO
// =====================================================

function agregarPregunta(contenedor, titulo, respuesta) {
  const div = document.createElement("div");
  div.className = "pregunta";

  const h3 = document.createElement("h3");
  h3.textContent = titulo;

  const p = document.createElement("p");
  p.textContent = respuesta;

  div.append(h3, p);
  contenedor.appendChild(div);
}

function generarRespuestas(p) {
  const contenedor = $("respuestas");
  contenedor.innerHTML = "";

  const tiempos = [5, 10, 15, 20].filter(t => t <= p.T);

  let textoVelocidad = "";
  const filas = datosActuales;

  // Para cada instante se recalcula hasta ese tiempo
  // con el mismo paso, incluyendo uno final reducido.
  tiempos.forEach(t => {
    const datos = metodoEuler({ ...p, T: t }, p.h);
    const final = datos[datos.length - 1];

    textoVelocidad +=
      `A los ${t} s: ${formato(final.v)} m/s. `;
  });

  if (!tiempos.length) {
    const ultimo = filas[filas.length - 1];
    textoVelocidad =
      `Al final de la simulación: ${formato(ultimo.v)} m/s.`;
  }

  agregarPregunta(
    contenedor,
    "1. ¿Cuál es la velocidad aproximada del cohete?",
    textoVelocidad
  );

  const ultimo = filas[filas.length - 1];

  agregarPregunta(
    contenedor,
    "2. ¿Qué altura alcanza el cohete?",
    `A los ${formato(p.T)} segundos, el método de Euler ` +
    `estima una altura de ${formato(ultimo.y)} metros.`
  );

  agregarPregunta(
    contenedor,
    "3. ¿Cómo evolucionan la velocidad y la altura?",
    "La aceleración está dada por A − kv. " +
    "Si es positiva, la velocidad crece; si es negativa, " +
    "disminuye. La altura crece cuando la velocidad es positiva " +
    "y disminuye cuando la velocidad es negativa. " +
    "Las gráficas permiten observar ese comportamiento."
  );

  agregarPregunta(
    contenedor,
    "4. ¿Qué ocurre al disminuir el tamaño de paso?",
    "Para este modelo, al utilizar pasos suficientemente " +
    "pequeños, Euler converge a la solución exacta. " +
    "La tabla comparativa permite verificar cómo cambian " +
    "los errores al usar h, h/2 y h/4."
  );

  agregarPregunta(
    contenedor,
    "5. ¿Qué tan precisa es la aproximación?",
    `Al finalizar, el error absoluto de velocidad es ` +
    `${formato(ultimo.errorVAbs)} m/s y el error absoluto ` +
    `de altura es ${formato(ultimo.errorYAbs)} m. ` +
    `Los errores relativos porcentuales son ` +
    `${mostrarPorcentaje(ultimo.errorV)} % y ` +
    `${mostrarPorcentaje(ultimo.errorY)} %, respectivamente.`
  );
}

// =====================================================
// CONCLUSIONES AUTOMÁTICAS
// =====================================================

function generarConclusiones(p, comparaciones) {
  const contenedor = $("conclusionesTexto");
  contenedor.innerHTML = "";

  const mejorPaso = comparaciones[2];
  const peorPaso = comparaciones[0];

  const ultimo = peorPaso.ultimo;
  const ultimoMejor = mejorPaso.ultimo;

  const conclusiones = [
    `Se aplicó Euler explícito durante ${formato(p.T)} segundos ` +
    `con ${datosActuales.length - 1} iteraciones principales.`,

    `La velocidad final aproximada es ${formato(ultimo.v)} m/s ` +
    `y la altura final aproximada es ${formato(ultimo.y)} m.`,

    `Al reducir el paso de ${formato(p.h, 4)} a ` +
    `${formato(p.h / 4, 4)} segundos, el error absoluto ` +
    `de altura cambió de ${formato(ultimo.errorYAbs)} m ` +
    `a ${formato(ultimoMejor.errorYAbs)} m.`,

    `El modelo es simplificado: considera un movimiento ` +
    `vertical con aceleración neta A y resistencia lineal kv. ` +
    `No representa una trayectoria orbital real.`,

    `La comparación con la solución analítica permite ` +
    `comprobar la precisión numérica y analizar la ` +
    `convergencia del método de Euler.`
  ];

  conclusiones.forEach((texto, i) => {
    const div = document.createElement("div");
    div.className = "conclusion";
    div.textContent = `${i + 1}. ${texto}`;
    contenedor.appendChild(div);
  });
}

// =====================================================
// EXPORTACIÓN CSV
// =====================================================

function exportarCSV() {
  if (!datosActuales.length) return;

  const encabezados = [
    "Iteracion",
    "Tiempo",
    "Aceleracion",
    "Velocidad Euler",
    "Altura Euler",
    "Velocidad Exacta",
    "Altura Exacta",
    "Error Absoluto Velocidad",
    "Error Absoluto Altura",
    "Error Porcentual Velocidad",
    "Error Porcentual Altura"
  ];

  const lineas = datosActuales.map(f => [
    f.n,
    f.t,
    f.a,
    f.v,
    f.y,
    f.vExacta,
    f.yExacta,
    f.errorVAbs,
    f.errorYAbs,
    f.errorV ?? "",
    f.errorY ?? ""
  ].join(";"));

  const contenido = "\uFEFF" +
    [encabezados.join(";"), ...lineas].join("\r\n");

  const blob = new Blob([contenido], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = "NASA_1962_Resultados_Euler.csv";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);
}

// =====================================================
// EJECUCIÓN PRINCIPAL
// =====================================================

function calcular() {
  try {
    $("mensaje").textContent = "";

    const p = leerParametros();

    const filas = metodoEuler(p, p.h);

    // Evitar mostrar resultados numéricos desbordados.
    const validos = filas.every(f =>
      Number.isFinite(f.v) &&
      Number.isFinite(f.y) &&
      Number.isFinite(f.vExacta) &&
      Number.isFinite(f.yExacta)
    );

    if (!validos) {
      throw new Error(
        "Los valores producen resultados demasiado grandes. " +
        "Reduce el paso o modifica los parámetros."
      );
    }

    const comparaciones = compararPasos(p);

    datosActuales = filas;
    parametrosActuales = p;

    mostrarResultados(filas);
    mostrarTabla(filas, p);
    generarGraficas(filas, p);
    generarRespuestas(p);
    generarConclusiones(p, comparaciones);

  } catch (error) {
    $("mensaje").textContent = error.message;
  }
}

// =====================================================
// EVENTOS
// =====================================================

$("formulario").addEventListener("submit", event => {
  event.preventDefault();
  calcular();
});

$("reiniciar").addEventListener("click", () => {
  $("A").value = 20;
  $("k").value = 0.1;
  $("v0").value = 0;
  $("y0").value = 0;
  $("T").value = 20;
  $("h").value = 1;

  calcular();
});

$("exportar").addEventListener("click", exportarCSV);

// Redibujar gráficas al cambiar el tamaño de la ventana.
let resizePendiente = false;

window.addEventListener("resize", () => {
  if (resizePendiente) return;

  resizePendiente = true;

  requestAnimationFrame(() => {
    resizePendiente = false;

    if (datosActuales.length && parametrosActuales) {
      generarGraficas(datosActuales, parametrosActuales);
    }
  });
});

// Primera simulación automática al abrir la página.
calcular();
