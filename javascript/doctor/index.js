import { db } from "../config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
  const doctorId = localStorage.getItem("doctorId");

  if (!doctorId) {
    alert("Không có thông tin bác sĩ, vui lòng đăng nhập lại.");
    window.location.href = "../../shared/login.html";
    return;
  }

  // 👉 Hàm format ngày để so sánh
  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const todayFormatted = formatDate(new Date());

  try {
    // Lấy thông tin bác sĩ
    const doctorSnapshot = await getDocs(collection(db, "doctors"));
    let doctorData = null;

    doctorSnapshot.forEach((doc) => {
      if (doc.id === doctorId) {
        doctorData = { id: doc.id, ...doc.data() };
      }
    });

    if (doctorData) {
      document.getElementById("doctor-name-display").textContent = doctorData.name;
      document.getElementById("doctor-name-welcome").textContent = doctorData.name;
      document.getElementById("doctor-phone").textContent = doctorData.phone;
      document.getElementById("doctor-specialty").textContent = doctorData.specialty;
      document.getElementById("doctor-birthdate").textContent = doctorData.birthdate;
      window.currentDoctorId = doctorData.id;
    } else {
      alert("Không tìm thấy thông tin bác sĩ.");
    }

    // 👉 Truy vấn lịch hẹn theo doctorId và ngày hôm nay
    const appointmentsRef = collection(db, "appointments");
    const appointmentQuery = query(
      appointmentsRef,
      where("doctorID", "==", doctorId),
      where("date", "==", todayFormatted)
    );

    const appointmentSnapshot = await getDocs(appointmentQuery);
    const appointmentList = document.getElementById("appointment-list");
    appointmentList.innerHTML = "";

    appointmentSnapshot.forEach((doc) => {
      const data = doc.data();

      const li = document.createElement("li");
      li.className = "appointment-item";
      li.dataset.name = data.patientName;
      li.dataset.service = data.service;
      li.dataset.note = data.note;

      li.innerHTML = `
        <img src="https://cdn-icons-png.flaticon.com/512/747/747310.png" alt="Calendar Icon" class="appointment-icon" />
        <div class="appointment-info">
          <div class="appointment-time">${data.time}</div>
          <div class="appointment-patient">${data.patientName}</div>
        </div>
      `;

      li.addEventListener("click", function () {
        document.getElementById("modalName").textContent = data.patientName;
        document.getElementById("modalTime").textContent = data.time;
        document.getElementById("modalService").textContent = data.service;
        document.getElementById("modalNote").textContent = data.note;
        document.getElementById("patientModal").style.display = "block";
      });

      appointmentList.appendChild(li);
    });

  } catch (error) {
    console.error("Lỗi khi xử lý dữ liệu:", error);
    alert("Đã xảy ra lỗi khi tải dữ liệu.");
  }

  // Đóng modal
  const closeBtn = document.querySelector(".close-btn");
  const modal = document.getElementById("patientModal");

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });
  }

  window.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // Xử lý sidebar chuyển trang
  const navLinks = document.querySelectorAll(".sidebar ul li a");
  navLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const targetPage = this.getAttribute("href");
      window.location.href = targetPage + `?doctorId=${doctorId}`;
    });
  });
});
