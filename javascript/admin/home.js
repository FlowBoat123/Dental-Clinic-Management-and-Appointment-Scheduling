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
  
  // Prevent duplicate clicks global flag
  let isAssigning = false;

  doctors.forEach(doctor => {
    const li = document.createElement("li");
    li.textContent = doctor.name;
    li.style.cursor = "pointer";
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";

    li.addEventListener("click", async () => {
      if (isAssigning) return; // Block double clicks
      isAssigning = true;

      // Visual feedback
      const originalText = li.textContent;
      li.textContent = `${originalText} (Đang xử lý...)`;
      li.style.color = "#888";
      li.style.cursor = "not-allowed";
      doctorList.style.pointerEvents = "none"; // Disable all list items

      await assignDoctor(selectedAppointmentId, doctor.id);
      
      // Cleanup (though renderAppointments will likely blow this away)
      modal.style.display = "none";
      doctorList.style.pointerEvents = "auto";
      isAssigning = false;
      
      await renderAppointments();
    });
    doctorList.appendChild(li);
  });
  modal.style.display = "block";
}

// Assign doctor to appointment via Backend API (to trigger Google Calendar)
async function assignDoctor(appointmentId, doctorId) {
  try {
    // Assuming backend is running on localhost:5000
    // In production, replace this with the actual backend URL
    const response = await fetch("http://localhost:5000/assign-doctor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ appointmentId, doctorId })
    });

    const result = await response.json();
    
    if (response.ok) {
      alert(result.message);
    } else {
      console.error("Server error:", result);
      alert("Lỗi khi gán bác sĩ: " + (result.message || "Unknown error"));
    }
  } catch (error) {
    console.error("Network error:", error);
    alert("Không thể kết nối tới server. Vui lòng kiểm tra backend.");
  }
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
