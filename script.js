const canvas = document.getElementById("main-area");
const layersDiv = document.getElementById("layers");

const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const bgInput = document.getElementById("bg");
const textInput = document.getElementById("text");
const rotateInput = document.getElementById("rotate");
const textWrapper = document.getElementById("text-wrapper");

let selected = null;
let elements = [];

let action = null;         
let resizeDir = null;
let offsetX = 0;
let offsetY = 0;
let isResizing = false;


let startX = 0, startY = 0;
let startW = 0, startH = 0;
let startLeft = 0, startTop = 0;


function createElement(type) {
  const el = {
    id: Date.now(),
    label: type + " " + (elements.filter(e => e.type === type).length + 1),
    type,
    x: 50,
    y: 50,
    width: 120,
    height: 80,
    rotation: 0,
    bg: type === "rect" ? "#ccc" : "transparent",
    text: type === "text" ? "Text" : "",
    z: elements.length
  };

  elements.push(el);
  draw(el);
  select(el);
  save();
}

function draw(data) {
  const div = document.createElement("div");
  div.className = "element";
  div.dataset.id = data.id;
  canvas.appendChild(div);
  update(div, data);

  div.onmousedown = e => {
    e.stopPropagation();
    select(data);
    action = "drag";
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  };
}

function update(div, d) {
  div.style.left = d.x + "px";
  div.style.top = d.y + "px";
  div.style.width = d.width + "px";
  div.style.height = d.height + "px";
  div.style.background = d.bg;
  div.style.transform = `rotate(${d.rotation}deg)`;
  div.style.zIndex = d.z;
  div.textContent = d.type === "text" ? d.text : "";
}

function select(d) {
  clearSelection();
  selected = d;
  const div = getDiv(d.id);
  div.classList.add("selected");
  addHandles(div);
  updateProps();
  renderLayers();
}

function clearSelection() {
  document.querySelectorAll(".element").forEach(el => {
    el.classList.remove("selected");
    el.querySelectorAll(".resize-handle").forEach(h => h.remove());
  });
  selected = null;
}

canvas.addEventListener("mousedown", e => {
  if (e.target === canvas && !isResizing) {
    clearSelection();
  }
});

function addHandles(div) {
  ["tl","tr","bl","br"].forEach(dir => {
    const h = document.createElement("div");


    h.className = `resize-handle handle-${dir}`;

    h.onmousedown = e => {
      e.stopPropagation();
      action = "resize";
      resizeDir = dir;
      isResizing = true;

      startX = e.pageX;
      startY = e.pageY;
      startW = selected.width;
      startH = selected.height;
      startLeft = selected.x;
      startTop = selected.y;
    };

    div.appendChild(h);
  });
}

document.addEventListener("mousemove", e => {
  if (!selected) return;
  const div = getDiv(selected.id);

  if (action === "drag") {
    selected.x = e.pageX - canvas.offsetLeft - offsetX;
    selected.y = e.pageY - canvas.offsetTop - offsetY;
  }

  if (action === "resize") {
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;

    if (resizeDir === "br") {
      selected.width = startW + dx;
      selected.height = startH + dy;
    }

    if (resizeDir === "tr") {
      selected.width = startW + dx;
      selected.height = startH - dy;
      selected.y = startTop + dy;
    }

    if (resizeDir === "bl") {
      selected.width = startW - dx;
      selected.height = startH + dy;
      selected.x = startLeft + dx;
    }

    if (resizeDir === "tl") {
      selected.width = startW - dx;
      selected.height = startH - dy;
      selected.x = startLeft + dx;
      selected.y = startTop + dy;
    }
  }

  update(div, selected);
  updateProps();
});

document.addEventListener("mouseup", () => {
  action = null;
  resizeDir = null;
  isResizing = false;
  save();
});

function updateProps() {
  if (!selected) return;
  widthInput.value = selected.width;
  heightInput.value = selected.height;
  bgInput.value = selected.bg;
  rotateInput.value = selected.rotation;
  textWrapper.style.display = selected.type === "text" ? "block" : "none";
  textInput.value = selected.text || "";
}

widthInput.oninput = () => change("width", +widthInput.value);
heightInput.oninput = () => change("height", +heightInput.value);
bgInput.oninput = () => change("bg", bgInput.value);
textInput.oninput = () => change("text", textInput.value);
rotateInput.oninput = () => change("rotation", +rotateInput.value);

function change(key, val) {
  if (!selected) return;
  selected[key] = val;
  update(getDiv(selected.id), selected);
  save();
}


function renderLayers() {
  layersDiv.innerHTML = "";
  elements
    .slice()
    .sort((a,b)=>b.z-a.z)
    .forEach(el => {
      const d = document.createElement("div");
      d.className = "layer-item" + (selected && el.id === selected.id ? " active" : "");
      d.textContent = el.label;
      d.onclick = () => select(el);
      layersDiv.appendChild(d);
    });
}

document.getElementById("layer-up").onclick = () => {
  if (!selected) return;
  selected.z++;
  renderLayers();
  save();
};

document.getElementById("layer-down").onclick = () => {
  if (!selected) return;
  selected.z--;
  renderLayers();
  save();
};

function save() {
  localStorage.setItem("layout", JSON.stringify(elements));
}

function load() {
  const d = localStorage.getItem("layout");
  if (!d) return;
  elements = JSON.parse(d);
  elements.forEach(draw);
  renderLayers();
}
load();

document.getElementById("export-json").onclick = () => {
  download(JSON.stringify(elements, null, 2), "design.json");
};

document.getElementById("export-html").onclick = () => {
  let html = `<div style="position:relative;width:800px;height:500px;">`;
  elements.forEach(e => {
    html += `<div style="
      position:absolute;
      left:${e.x}px;top:${e.y}px;
      width:${e.width}px;height:${e.height}px;
      background:${e.bg};
      transform:rotate(${e.rotation}deg);
      z-index:${e.z};
    ">${e.text || ""}</div>`;
  });
  html += `</div>`;
  download(html, "design.html");
};

function download(data, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data]));
  a.download = name;
  a.click();
}

function getDiv(id) {
  return document.querySelector(`[data-id="${id}"]`);
}

document.getElementById("add-rect").onclick = () => createElement("rect");
document.getElementById("add-text").onclick = () => createElement("text");
