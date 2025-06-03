// ---------- CONFIG -------------------------------------------------------
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbx4C2dMX4T85zpzHlRF20fEj9PHdrhnpO7WenWYbgpyqFpWQg2aXJigO25URLBEwahD/exec";
// ------------------------------------------------------------------------

const ctf   = document.getElementById("ctf");
const sess  = document.getElementById("session");
const area  = document.getElementById("formArea");
const save  = document.getElementById("send");

let equip = {}, inputs = [];

fetch("session_equipment.json")
  .then(r => r.json())
  .then(js => {
    equip = js;
    Object.keys(equip).forEach(s =>
      sess.insertAdjacentHTML("beforeend", `<option>${s}</option>`));
  });

sess.addEventListener("change", buildForm);
ctf .addEventListener("input", () => save.disabled = !ready());

function buildForm(){
  area.innerHTML = "";
  inputs = [];
  (equip[sess.value] || []).forEach(item => {
    const id = "q_"+btoa(item).slice(0,6);
    area.insertAdjacentHTML("beforeend",
      `<label>${item.charAt(0).toUpperCase()+item.slice(1)}
         <input id="${id}" type="number" min="0">
       </label>`);
    inputs.push([item, id]);
  });
  save.disabled = !ready();
}

function ready(){ return ctf.value.trim() && sess.value; }

save.addEventListener("click", () => {
  if (!ready()) return alert("Enter name & session first");
  const rows = inputs.map(([item, id]) => ({
    ctf: ctf.value.trim(),
    session: sess.value,
    equipment: item,
    quantity: Number(document.getElementById(id).value)||""
  }));
  fetch(SHEET_ENDPOINT,{method:"POST",body:JSON.stringify(rows),mode:"no-cors"})
    .then(()=>alert("Saved!"));
});