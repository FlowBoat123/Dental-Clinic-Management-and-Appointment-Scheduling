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

let doctors = [];
let selectedAppointmentId = null;

// Fetch doctors
async function fetchDoctors() {
  const snapshot = await getDocs(collection(db, "doctors"));
  doctors = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Fetch appointments and render
async function renderAppointments() {
  const snapshot = await getDocs(collection(db, "appointments"));
  tableBody.innerHTML = ""; // Clear existing rows

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${data.patientName}</td>
      <td>${data.date} ${data.time}</td>
      <td>
        <button class="btn view">Xem thêm</button>
      </td>
      <td>
        <button class="btn choose" data-id="${docSnap.id}">
          ${data.doctorID || "Choose"}
        </button>
      </td>
    `;

    // "Xem thêm" click
    tr.querySelector(".view").addEventListener("click", () => {
      alert(`Ghi chú: ${data.note || "Không có"}\nDịch vụ: ${data.service}`);
    });

    // "Choose" click
    tr.querySelector(".choose").addEventListener("click", () => {
      selectedAppointmentId = docSnap.id;
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
    li.style.cursor = "pointer";
    li.addEventListener("click", async () => {
      await assignDoctor(selectedAppointmentId, doctor.id);
      modal.style.display = "none";
      renderAppointments(); // refresh UI
    });
    doctorList.appendChild(li);
  });

  modal.style.display = "block";
}

// Assign doctor to appointment
async function assignDoctor(appointmentId, doctorId) {
  const appointmentRef = doc(db, "appointments", appointmentId);
  await updateDoc(appointmentRef, {
    doctorID: doctorId
  });
}

// Close modal
closeModal.addEventListener("click", () => {
  modal.style.display = "none";
});

// Init
(async () => {
  await fetchDoctors();
  await renderAppointments();
})();