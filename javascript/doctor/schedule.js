import { db } from '../config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
  const weekTitle = document.getElementById("week-title");
  const calendarBody = document.getElementById("calendar-body");
  const dayHeaders = document.querySelectorAll(".calendar-table thead th");
  const modal = document.getElementById("appointment-modal");
  const closeModal = document.querySelector(".close");
  const modalName = document.getElementById("modal-name");
  const modalTime = document.getElementById("modal-time");
  const modalService = document.getElementById("modal-service");
  const modalNotes = document.getElementById("modal-notes");

  let today = new Date();
  const doctorId = localStorage.getItem("doctorId");

  // Utility function to format date
  function formatDateToISO(dateInput) {
    const date = new Date(dateInput);
    return date.toISOString().split("T")[0]; // Format to YYYY-MM-DD
  }

  // Utility function to parse date from Firebase string format
  function parseFirebaseDate(dateString) {
    const parts = dateString.split("-");
    // Firebase date format is YYYY-MM-DD
    // Convert to Date object
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  async function fetchAppointmentsForDoctor(doctorId) {
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("doctorID", "==", doctorId));
    const querySnapshot = await getDocs(q);
    let appointments = [];
    querySnapshot.forEach((doc) => {
      appointments.push(doc.data());
    });
    return appointments;
  }

  // Update calendar with appointment data
  async function updateCalendar(startDate) {
    const days = [];
    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

    // Loop through 7 days of the week
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }

    // Update week title
    weekTitle.textContent = `Tuần này: ${formatDateDisplay(days[0])} - ${formatDateDisplay(days[6])}`;

    // Update day headers (e.g., Monday, Tuesday, etc.)
    days.forEach((day, i) => {
      if (dayHeaders[i + 1]) {
        dayHeaders[i + 1].textContent = `${dayNames[day.getDay()]} (${formatDateDisplay(day)})`;
      }
    });

    // Assign data-date attribute to each slot
    const slots = document.querySelectorAll(".time-slot");
    slots.forEach(slot => {
      const col = parseInt(slot.getAttribute("data-col"));
      const time = slot.getAttribute("data-time");

      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        console.warn("Time format invalid:", time);
        return;
      }

      const date = new Date(days[col]);

      // Ensure date is valid before proceeding
      // if (isNaN(date.getTime())) {
      //   console.warn("Invalid date object:", date);
      //   return;
      // }

      const [hourStr, minuteStr] = time.split(":");
      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      // Ensure hour and minute are valid
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        console.warn("Invalid hour or minute:", hourStr, minuteStr);
        return;
      }

      date.setHours(hour);
      date.setMinutes(minute);

      // Check if date is valid after setting the time
      // if (isNaN(date.getTime())) {
      //   console.warn("Date is invalid after setting time:", date);
      //   return;
      // }

      const isoDate = date.toISOString().slice(0, 10); // yyyy-mm-dd
      slot.setAttribute("data-date", isoDate);
    });

    const appointments = await fetchAppointmentsForDoctor(doctorId);

    // Display booked slots
    appointments.forEach((appointment) => {
      const date = appointment.date; // yyyy-mm-dd (from Firestore)
      const time = appointment.time; // hh:mm
    
      // Convert string date into Date object
      const appointmentDate = parseFirebaseDate(date);  // Use parseFirebaseDate function
    
      // Ensure valid date object
      if (isNaN(appointmentDate)) {
        console.warn("Invalid appointment date:", date);
        return;
      }
    
      // Find slot by date and time
      const slot = document.querySelector(`.time-slot[data-date="${date}"][data-time="${time}"]`);
      if (slot) {
        // Thêm class `has-appointment` thay vì `booked`
        slot.classList.add("has-appointment");
        slot.setAttribute("data-booked", "true");
        slot.innerHTML = `
          <span class="appointment-details">
            <strong>${appointment.patientName}</strong><br>
            ${appointment.service}<br>
            ${appointment.note}
          </span>`;
      }
    });
    
    // Add click event to open modal
    slots.forEach(slot => {
      slot.addEventListener("click", function () {
        const slotDate = slot.getAttribute("data-date");
        const slotTime = slot.getAttribute("data-time");
    
        const appointment = appointments.find(
          (a) => a.date === slotDate && a.time === slotTime
        );
    
        if (appointment) {
          modalName.textContent = appointment.patientName;
          modalTime.textContent = `${appointment.time} - Ngày: ${appointment.date ? displayDateVN(appointment.date) : 'Chưa có ngày'}`;
          modalService.textContent = appointment.service;
          modalNotes.textContent = appointment.note;
        } else {
          modalName.textContent = "Chưa có lịch hẹn";
          modalTime.textContent = `${slotTime} - Ngày: ${slotDate ? displayDateVN(slotDate) : 'Chưa có ngày'}`;
          modalService.textContent = "Chưa có thông tin";
          modalNotes.textContent = "Chưa có ghi chú";
        }
    
        modal.style.display = "block";
      });
    });
  }

  closeModal.addEventListener("click", function () {
    modal.style.display = "none";
  });

  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  function formatDateDisplay(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function displayDateVN(dateStr) {
    if (!dateStr) {
      console.error("Invalid date string:", dateStr);
      return "Invalid Date";
    }
    const [yyyy, mm, dd] = dateStr.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  // Initialize calendar with today's date
  updateCalendar(today);
});
