import { db } from "../config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
  const doctorId = localStorage.getItem("doctorId");
  if (!doctorId) {
    alert("Không có thông tin bác sĩ, vui lòng đăng nhập lại.");
    window.location.href = "../../shared/login.html";
    return;
  }

  // format YYYY-MM-DD
  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const todayFormatted = formatDate(new Date());

  try {
    // Lấy data bác sĩ
    const doctorSnapshot = await getDocs(collection(db, "doctors"));
    let doctorData = null;
    doctorSnapshot.forEach(docSnap => {
      if (docSnap.id === doctorId) {
        doctorData = { id: docSnap.id, ...docSnap.data() };
      }
    });

    if (doctorData) {
      // Cập nhật từng phần tử nếu nó tồn tại trong DOM
      const elNameDisp = document.getElementById("doctor-name-display");
      if (elNameDisp) elNameDisp.textContent = doctorData.name;

      const elNameWelcome = document.getElementById("doctor-name-welcome");
      if (elNameWelcome) elNameWelcome.textContent = doctorData.name;

      const elPhone = document.getElementById("doctor-phone");
      if (elPhone) elPhone.textContent = doctorData.phone;

      // Chuyên khoa cố định trong HTML, không gán ở đây
      // const elSpecialty = document.getElementById("doctor-specialty");
      // if (elSpecialty) elSpecialty.textContent = doctorData.specialty;

      const elBirth = document.getElementById("doctor-birthdate");
      if (elBirth) elBirth.textContent = doctorData.birthdate;

      window.currentDoctorId = doctorData.id;
    }

    // Lấy và render lịch hẹn hôm nay cho bác sĩ
    const appointmentsRef = collection(db, "appointments");
    const appointmentQuery = query(
      appointmentsRef,
      where("doctorID", "==", doctorId),
      where("date", "==", todayFormatted)
    );
    const appointmentSnapshot = await getDocs(appointmentQuery);

    const appointmentList = document.getElementById("appointment-list");
    appointmentList.innerHTML = "";

    appointmentSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const li = document.createElement("li");
      li.className = "appointment-item";
      li.dataset.name = data.patientName;
      li.dataset.service = data.service;
      li.dataset.note = data.note;

      const isCompleted = data.status === "completed";
      if (isCompleted) {
        li.classList.add("completed");
      }

      li.innerHTML = `
        <img src="https://cdn-icons-png.flaticon.com/512/747/747310.png"
             alt="Calendar Icon" class="appointment-icon" />
        <div class="appointment-info">
          <div class="appointment-time">${data.time}</div>
          <div class="appointment-patient">${data.patientName}</div>
        </div>
        ${isCompleted ? '<div class="appointment-status completed">Đã hoàn thành</div>' : ''}
      `;
      li.addEventListener("click", () => {
        const modal = document.getElementById("patientModal");
        const mName = document.getElementById("modalName");
        const mTime = document.getElementById("modalTime");
        const mService = document.getElementById("modalService");
        const mNote = document.getElementById("modalNote");
        if (mName) mName.textContent = data.patientName;
        if (mTime) mTime.textContent = data.time;
        if (mService) mService.textContent = data.service;
        if (mNote) mNote.textContent = data.note;
        if (modal) modal.style.display = "block";
      });

      appointmentList.appendChild(li);
    });

  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu:", error);
    alert("Đã xảy ra lỗi khi tải dữ liệu:\n" + error.message);
  }

  // Đóng modal
  const closeBtn = document.querySelector(".close-btn");
  const modal = document.getElementById("patientModal");
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", e => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  // Chuyển trang sidebar kèm doctorId
  document.querySelectorAll(".sidebar ul li a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const href = link.getAttribute("href");
      window.location.href = href + `?doctorId=${doctorId}`;
    });
  });
});
