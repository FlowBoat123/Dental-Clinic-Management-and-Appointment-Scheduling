import { db } from "../config.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM elements
const tableBody = document.querySelector("#appointments-table tbody");
const modal = document.getElementById("doctor-modal");
const doctorList = document.getElementById("doctor-list");
const closeModal = document.querySelector(".modal .close");
const cancelModal = document.querySelector(".modal .cancel");

let doctors = [];
let selectedAppointmentId = null;

// Fetch doctors
async function fetchDoctors() {
  const snapshot = await getDocs(collection(db, "doctors"));
  doctors = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

// Helper: get doctor name by ID
function getDoctorName(doctorId) {
  const doctor = doctors.find(d => d.id === doctorId);
  return doctor ? doctor.name : null;
}

// Fetch appointments and render
async function renderAppointments() {
  const snapshot = await getDocs(collection(db, "appointments"));
  const items = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    items.push({ id: docSnap.id, ...data });
  });

  // Separate unassigned and assigned
  const unassigned = items.filter(item => !item.doctorID);
  const assigned = items.filter(item => item.doctorID);

  // Render unassigned first, then assigned
  tableBody.innerHTML = "";
  [...unassigned, ...assigned].forEach(item => {
    const tr = document.createElement("tr");
    if (!item.doctorID) tr.classList.add("unassigned");

    const displayName = item.doctorID ? getDoctorName(item.doctorID) : "Chọn";

    tr.innerHTML = `
      <td>${item.patientName}</td>
      <td>${item.date} ${item.time}</td>
      <td><button class="btn view">Xem thêm</button></td>
      <td><button class="btn choose" data-id="${item.id}">${displayName}</button></td>
    `;

    // Events
    tr.querySelector(".view").addEventListener("click", () => {
      alert(`Ghi chú: ${item.note || "Không có"}\nDịch vụ: ${item.service}`);
    });
    tr.querySelector(".choose").addEventListener("click", () => {
      selectedAppointmentId = item.id;
      showDoctorModal();
    });

    tableBody.appendChild(tr);
  });
}

// Show modal with doctor list
function showDoctorModal() {
  doctorList.innerHTML = "";
  doctors.forEach(doctor => {
    const li = document.createElement("li");
    li.textContent = doctor.name;
    li.addEventListener("click", async () => {
      await assignDoctor(selectedAppointmentId, doctor.id);
      modal.style.display = "none";
      await renderAppointments();
    });
    doctorList.appendChild(li);
  });
  modal.style.display = "block";
}

// Assign doctor to appointment
async function assignDoctor(appointmentId, doctorId) {
  await updateDoc(doc(db, "appointments", appointmentId), { doctorID: doctorId });
}

// Close modal via both close buttons
[closeModal, cancelModal].forEach(el =>
  el.addEventListener("click", () => {
    modal.style.display = "none";
  })
);

// Init
(async () => {
  await fetchDoctors();
  await renderAppointments();
})();
