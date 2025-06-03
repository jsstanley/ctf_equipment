/* ----------------- CONFIG ------------------- */
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbx4C2dMX4T85zpzHlRF20fEj9PHdrhnpO7WenWYbgpyqFpWQg2aXJigO25URLBEwahD/exec";
/* -------------------------------------------- */

const ctf    = document.getElementById("ctf");
const sList  = document.getElementById("sessionList");
const area   = document.getElementById("formArea");
const saveBt = document.getElementById("save");
const overlay= document.getElementById("overlay");

let equip = {}, inputs = [], current = null;

/* Load equipment JSON + build session nav */
fetch("session_equipment.json")
  .then(r => r.json())
  .then(js => {
    equip = js;
    Object.keys(equip).forEach((sess,i) => {
      const li = document.createElement("li");
      li.textContent = sess;
      li.dataset.sess = sess;
      if (i===0) li.classList.add("active");
      sList.appendChild(li);
    });
    current = Object.keys(equip)[0];
    buildForm(current);
  });

/* Navigation click handler */
sList.addEventListener("click", e => {
  if (e.target.tagName !== "LI") return;
  switchSession(e.target.dataset.sess);
});

/* Build numeric inputs for a session */
function buildForm(sess) {
  area.innerHTML = "";
  inputs = [];
  (equip[sess] || []).forEach(item => {
    const id = "q_"+btoa(item).slice(0,6);
    const row = document.createElement("label");
    row.innerHTML = `<span>${titleCase(item)}</span>
                     <input id="${id}" type="number" min="0">`;
    area.appendChild(row);
    inputs.push([item,id]);
  });
  checkReady();
}

/* Save button state when name typed */
ctf.addEventListener("input", checkReady);

/* Save + auto-advance */
saveBt.addEventListener("click", () => {
  if (!ready()) return alert("Enter your name first.");
  overlay.classList.add("show");
  const rows = inputs.map(([item,id]) => ({
    ctf: ctf.value.trim(),
    session: current,
    equipment: item,
    quantity: Number(document.getElementById(id).value)||""
  }));
  fetch(SHEET_ENDPOINT,{method:"POST",body:JSON.stringify(rows),mode:"no-cors"})
    .then(() => {
      markDone(current);
      const next = nextIncomplete();
      if (next) switchSession(next);     // jump to next session
      else alert("All sessions completed, thank you!");
    })
    .finally(()=> overlay.classList.remove("show"));
});

/* Helpers -------------------------------------------------------------- */
function checkReady() {
  saveBt.disabled = !(ctf.value.trim() && inputs.length);
}

function ready(){ return ctf.value.trim() && inputs.length; }

function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

function switchSession(sess){
  current = sess;
  document.querySelectorAll("nav li").forEach(li=>{
    li.classList.toggle("active", li.dataset.sess===sess);
  });
  buildForm(sess);
}

function markDone(sess){
  const li = [...sList.children].find(li=>li.dataset.sess===sess);
  if (li){ li.classList.add("done"); li.classList.remove("active"); }
}

function nextIncomplete(){
  const list = [...sList.children];
  const idx  = list.findIndex(li=>li.dataset.sess===current);
  for (let i=idx+1;i<list.length;i++) if(!list[i].classList.contains("done")) return list[i].dataset.sess;
  for (let i=0;i<idx;i++) if(!list[i].classList.contains("done")) return list[i].dataset.sess;
  return null;
}