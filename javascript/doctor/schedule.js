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
  const completeApptBtn = document.getElementById("complete-appt-btn");
  const syncBtn = document.getElementById("sync-calendar-btn");

  let currentAppointment = null; // Store current appointment for billing

  let today = new Date();
  const doctorId = localStorage.getItem("doctorId");

  // Sync Calendar Event
  if (syncBtn) {
    syncBtn.addEventListener("click", async function() {
      if (!doctorId) {
        alert("Không tìm thấy thông tin bác sĩ. Vui lòng đăng nhập lại.");
        return;
      }

      if (!confirm("Bạn có muốn đồng bộ các lịch hẹn sắp tới lên Google Calendar của email đăng ký không?")) {
        return;
      }

      try {
        syncBtn.disabled = true;
        syncBtn.textContent = "Đang đồng bộ...";

        const response = await fetch("http://localhost:5000/api/doctor/sync-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: doctorId })
        });

        const result = await response.json();

        if (response.ok) {
          alert(result.message);
        } else {
          alert("Lỗi: " + result.message);
        }
      } catch (error) {
        console.error("Sync error:", error);
        alert("Lỗi kết nối tới server.");
      } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = "Đồng bộ Google Calendar";
      }
    });
  }

  // --- BILLING LOGIC START ---

  completeApptBtn.addEventListener("click", function() {
    if (!currentAppointment) return;
    if (!currentAppointment.id) {
        alert("Lỗi: Không tìm thấy ID cuộc hẹn.");
        return;
    }
    // Redirect to separate billing page
    window.location.href = `bill.html?appointmentId=${currentAppointment.id}`;
  });

  // --- BILLING LOGIC END ---


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
        // IMPORTANT: Include doc.id so we can use it for updates
        let data = doc.data();
        data.id = doc.id; 
        appointments.push(data);
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
      slot.innerHTML = ""; // Clear previous content
      slot.classList.remove("has-appointment");
      slot.removeAttribute("data-booked");

      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        console.warn("Time format invalid:", time);
        return;
      }

      const date = new Date(days[col]);

      const [hourStr, minuteStr] = time.split(":");
      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);

      date.setHours(hour);
      date.setMinutes(minute);

      const isoDate = date.toISOString().slice(0, 10); // yyyy-mm-dd
      slot.setAttribute("data-date", isoDate);
    });

    const appointments = await fetchAppointmentsForDoctor(doctorId);

    // Display booked slots
    appointments.forEach((appointment) => {
      const date = appointment.date; 
      const time = appointment.time; 
    
      const appointmentDate = parseFirebaseDate(date);
    
      if (isNaN(appointmentDate)) {
        return;
      }
    
      const slot = document.querySelector(`.time-slot[data-date="${date}"][data-time="${time}"]`);
      if (slot) {
        slot.classList.add("has-appointment");
        slot.setAttribute("data-booked", "true");
        
        let statusBadge = "";
        if (appointment.status === "completed") {
            statusBadge = "<br><span style='color: green; font-weight: bold;'>[Hoàn thành]</span>";
        }
        
        slot.innerHTML = `
          <span class="appointment-details">
            <strong>${appointment.patientName}</strong><br>
            ${appointment.service}
            ${statusBadge}
          </span>`;
      }
    });
    
    // Add click event to open modal
    slots.forEach(slot => {
      // Remove old listeners to prevent duplicates (though forEach on fresh querySelectorAll helps)
      // Best practice: use event delegation on table, but keeping this simple for now.
      
      slot.addEventListener("click", function () {
        const slotDate = slot.getAttribute("data-date");
        const slotTime = slot.getAttribute("data-time");
    
        const appointment = appointments.find(
          (a) => a.date === slotDate && a.time === slotTime
        );
        
        currentAppointment = appointment; // Set global current appointment

        if (appointment) {
          modalName.textContent = appointment.patientName;
          modalTime.textContent = `${appointment.time} - Ngày: ${appointment.date ? displayDateVN(appointment.date) : 'Chưa có ngày'}`;
          modalService.textContent = appointment.service;
          modalNotes.textContent = appointment.note || "Không có";
          
          // Logic for Complete Button
          if (appointment.status === "completed") {
              completeApptBtn.style.display = "none";
              modalName.innerHTML = `${appointment.patientName} <span style="color:green">(Đã hoàn thành)</span>`;
          } else {
              completeApptBtn.style.display = "block";
          }

        } else {
          currentAppointment = null;
          modalName.textContent = "Chưa có lịch hẹn";
          modalTime.textContent = `${slotTime} - Ngày: ${slotDate ? displayDateVN(slotDate) : 'Chưa có ngày'}`;
          modalService.textContent = "Chưa có thông tin";
          modalNotes.textContent = "Chưa có ghi chú";
          completeApptBtn.style.display = "none";
        }
    
        modal.style.display = "block";
      });
    });
  }

  closeModal.addEventListener("click", function () {
    modal.style.display = "none";
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