import { db } from '../config.js';
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
  // --- Avatar update ---
  const avatarContainer = document.getElementById("avatarContainer");
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");

  const doctorId = localStorage.getItem("doctorId");

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

  // --- Hiển thị các lịch hẹn của bác sĩ ---
  async function displayAppointments(doctorId) {
    const appointments = await fetchAppointmentsForDoctor(doctorId);
    const appointmentList = document.getElementById("appointment-list");

    // Xóa danh sách lịch hẹn cũ
    appointmentList.innerHTML = "";

    appointments.forEach((appointment) => {
      const listItem = document.createElement("li");
      listItem.textContent = `Bệnh nhân: ${appointment.patientName}, Giờ khám: ${appointment.time}`;
      appointmentList.appendChild(listItem);
    });
  }

  // Gọi hàm để hiển thị các lịch hẹn của bác sĩ
  displayAppointments(doctorId);

  // --- Cập nhật thông tin bác sĩ ---
  const settingsForm = document.getElementById("settingsForm");
  settingsForm.addEventListener("submit", async function (e) {
    e.preventDefault(); // Ngăn gửi form để kiểm tra các lỗi

    let valid = true;

    // Hàm hiển thị và xóa lỗi
    function showError(fieldId, message) {
      const errorSpan = document.getElementById("error-" + fieldId);
      if (errorSpan) {
        errorSpan.innerText = message;
      }
    }
    function clearError(fieldId) {
      const errorSpan = document.getElementById("error-" + fieldId);
      if (errorSpan) {
        errorSpan.innerText = "";
      }
    }

    // Lấy giá trị các ô (cắt khoảng trắng)
    const fullname = document.getElementById("fullname").value.trim();
    const dob = document.getElementById("dob").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // Kiểm tra các trường bắt buộc
    if (!fullname) {
      showError("fullname", "Họ và tên không được để trống.");
      valid = false;
    }
    if (!dob) {
      showError("dob", "Ngày sinh không được để trống.");
      valid = false;
    }
    if (!email) {
      showError("email", "Email không được để trống.");
      valid = false;
    } else {
      // Kiểm tra định dạng email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError("email", "Email không đúng định dạng.");
        valid = false;
      }
    }
    if (!phone) {
      showError("phone", "Số điện thoại không được để trống.");
      valid = false;
    } else {
      // Kiểm tra số điện thoại là 10 chữ số
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        showError("phone", "Số điện thoại phải là dãy số gồm 10 chữ số.");
        valid = false;
      }
    }

    // Nếu checkbox đổi mật khẩu được chọn thì kiểm tra các ô mật khẩu
    const toggleChangePassword = document.getElementById("toggle-change-password");
    if (toggleChangePassword.checked) {
      const currentPassword = document.getElementById("current-password").value.trim();
      const newPassword = document.getElementById("new-password").value.trim();
      const confirmPassword = document.getElementById("confirm-password").value.trim();

      if (!currentPassword) {
        showError("current-password", "Mật khẩu hiện tại không được để trống.");
        valid = false;
      }
      if (!newPassword) {
        showError("new-password", "Mật khẩu mới không được để trống.");
        valid = false;
      }
      if (!confirmPassword) {
        showError("confirm-password", "Xác nhận mật khẩu mới không được để trống.");
        valid = false;
      }
      if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        showError("confirm-password", "Mật khẩu mới và xác nhận không khớp.");
        valid = false;
      }
    }

    // Nếu mọi thứ hợp lệ, cập nhật thông tin vào Firestore
    if (valid) {
      try {
        const doctorRef = doc(db, "doctors", doctorId);
        await updateDoc(doctorRef, {
          fullname: fullname,
          dob: dob,
          email: email,
          phone: phone
        });
        alert("Thông tin bác sĩ đã được cập nhật.");
      } catch (error) {
        console.error("Lỗi khi cập nhật thông tin bác sĩ: ", error);
        alert("Có lỗi xảy ra. Vui lòng thử lại.");
      }
    }
  });
});
