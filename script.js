/* ----------------- CONFIG ------------------- */
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbx4C2dMX4T85zpzHlRF20fEj9PHdrhnpO7WenWYbgpyqFpWQg2aXJigO25URLBEwahD/exec";
/* -------------------------------------------- */

const ctf    = document.getElementById("ctf");
const savedName = localStorage.getItem("ctf_name");
if (savedName) ctf.value = savedName;
const sList  = document.getElementById("sessionList");
const area   = document.getElementById("formArea");
const saveBt = document.getElementById("save");
const submitBt = document.getElementById("submitAll");
const overlay= document.getElementById("overlay");

let equip = {}, inputs = [], current = null;
let storedResponses = JSON.parse(localStorage.getItem("ctf_responses") || "{}");

/* Load equipment JSON + build session nav */
fetch("session_equipment.json")
  .then(r => r.json())
  .then(js => {
    equip = js;
    Object.keys(equip).forEach((sess,i) => {
      const li = document.createElement("li");
      li.textContent = sess;
      li.dataset.sess = sess;
      sList.appendChild(li);
    });
    current = localStorage.getItem("current_session") || Object.keys(equip)[0];
    document.querySelectorAll("#sessionList li").forEach(li => {
      li.classList.toggle("active", li.dataset.sess === current);
    });
    buildForm(current);

    // After buildForm(current);
    Object.keys(storedResponses).forEach((sessDone) => {
      const liDone = [...sList.children].find((li) => li.dataset.sess === sessDone);
      if (liDone) {
        liDone.classList.add("done");
      }
    });
    // Enable Submit All if all sessions completed
    const allSessions = Object.keys(equip);
    if (allSessions.every(s => storedResponses[s])) {
      submitBt.disabled = false;
    }

    sList.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (li && li.dataset.sess) {
        document.querySelectorAll("#sessionList li").forEach(el => el.classList.remove("active"));
        li.classList.add("active");
        switchSession(li.dataset.sess);
      }
    });
  });

/* Build table with Equipment | Consumable | Quantity for a session */
function buildForm(sess) {
  inputs = [];
  document.getElementById("sessionTitle").textContent = sess;
  area.innerHTML = "";

  const table = document.createElement("table");
  table.className = "equipment-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Equipment</th>
        <th>Consumable?</th>
        <th>Quantity</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  // Retrieve any stored data for this session
  const savedData = storedResponses[sess] || [];

  (equip[sess] || []).forEach((itemObj) => {
    const { equipment, consumable } = itemObj;
    const idQty = "qt_" + btoa(equipment).slice(0, 6);
    const idCons = "cs_" + btoa(equipment).slice(0, 6);

    // Determine previously saved values
    const found = savedData.find(([e]) => e === equipment) || [equipment, 0, consumable];
    const [ , savedQty, savedCons ] = found;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${titleCase(equipment)}</td>
      <td style="text-align: center;">
        <input id="${idCons}" type="checkbox" ${savedCons ? "checked" : ""}>
      </td>
      <td><input id="${idQty}" type="number" min="0" placeholder="0" value="${savedQty}"></td>
    `;
    tbody.appendChild(row);
    inputs.push([equipment, idQty, idCons]);
  });

  area.appendChild(table);

  // Auto-save on any change in quantity or consumable checkbox
  inputs.forEach(([equipName, qtyId, consId]) => {
    const qtyEl = document.getElementById(qtyId);
    const consEl = document.getElementById(consId);
    const saveCurrentSession = () => {
      const data = inputs.map(([e, qId, cId]) => [
        e,
        Number(document.getElementById(qId).value) || 0,
        document.getElementById(cId).checked
      ]);
      storedResponses[current] = data;
      localStorage.setItem("ctf_responses", JSON.stringify(storedResponses));
    };
    qtyEl.addEventListener("input", saveCurrentSession);
    consEl.addEventListener("change", saveCurrentSession);
  });

  checkReady();
}

/* Enable Save button only when inputs exist */
ctf.addEventListener("input", () => {
  localStorage.setItem("ctf_name", ctf.value);
  checkReady();
});

saveBt.addEventListener("click", () => {
  const data = inputs.map(([equipName, qtyId, consId]) => {
    const quantity = Number(document.getElementById(qtyId).value) || 0;
    const isConsumable = document.getElementById(consId).checked;
    return [equipName, quantity, isConsumable];
  });

  storedResponses[current] = data;
  localStorage.setItem("ctf_responses", JSON.stringify(storedResponses));

  markDone(current);
  const next = nextIncomplete();
  if (next) switchSession(next);
  else {
    alert("All sessions completed. Please submit all responses.");
    submitBt.disabled = false;
  }
});

/* Submit all stored responses to Google Sheet */
submitBt.addEventListener("click", () => {
  if (!ctf.value.trim()) {
    return alert("Please enter your name before submitting all responses.");
  }
  overlay.classList.add("show");
  const rows = [];

  Object.entries(storedResponses).forEach(([sess, dataArr]) => {
    dataArr.forEach(([equipName, quantity, consumable]) => {
      rows.push({
        name: ctf.value.trim(),
        session: sess,
        equipment: equipName,
        consumable: consumable,
        quantity: quantity
      });
    });
  });

  fetch(SHEET_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(rows),
    headers: { "Content-Type": "application/json" }
  }).then(() => {
    overlay.classList.remove("show");
    alert("All responses submitted!");
    localStorage.removeItem("ctf_responses");
    submitBt.disabled = true;
  }).catch(err => {
    console.error(err);
    overlay.classList.remove("show");
    alert("Submission failed. Try again.");
  });
});

/* Helpers */
function checkReady() {
  saveBt.disabled = inputs.length === 0;
}

function ready() {
  return ctf.value.trim() && inputs.length;
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function switchSession(sess) {
  current = sess;
  localStorage.setItem("current_session", sess);
  // Reload storedResponses from localStorage in case it changed
  storedResponses = JSON.parse(localStorage.getItem("ctf_responses") || "{}");
  document.querySelectorAll("#sessionList li").forEach(li => {
    li.classList.toggle("active", li.dataset.sess === sess);
  });
  buildForm(sess);
}

function markDone(sess) {
  const li = [...sList.children].find(li => li.dataset.sess === sess);
  if (li) {
    li.classList.add("done");
    li.classList.remove("active");
  }
}

function nextIncomplete() {
  const list = [...sList.children];
  const idx  = list.findIndex(li => li.dataset.sess === current);
  for (let i = idx + 1; i < list.length; i++) {
    if (!list[i].classList.contains("done")) return list[i].dataset.sess;
  }
  for (let i = 0; i < idx; i++) {
    if (!list[i].classList.contains("done")) return list[i].dataset.sess;
  }
  return null;
}