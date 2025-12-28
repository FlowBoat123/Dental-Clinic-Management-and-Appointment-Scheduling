import { db } from '../config.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
  const doctorId = localStorage.getItem("doctorId");
  const settingsForm = document.getElementById("settingsForm");

  const fullnameInput = document.getElementById("fullname");
  const dobInput = document.getElementById("dob");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");

  // --- Chuyển string yyyy-dd-mm sang yyyy-mm-dd để hiển thị trong input date ---
  function convertToISODate(dateStr) {
    const [year, day, month] = dateStr.split("-");
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // --- Load thông tin bác sĩ vào form ---
  async function prefillDoctorInfo(doctorId) {
    try {
      const doctorRef = doc(db, "doctors", doctorId);
      const doctorSnap = await getDoc(doctorRef);
      if (doctorSnap.exists()) {
        const data = doctorSnap.data();
        console.log("Dữ liệu bác sĩ:", data);

        fullnameInput.value = data.name || "";
        dobInput.value = convertToISODate(data.birthdate || "2000-01-01");
        emailInput.value = data.email || "";
        phoneInput.value = data.phone || "";

        // Check Google Calendar Link Status
        const calendarStatus = document.getElementById("calendar-status");
        if (data.google_calendar_linked) {
            calendarStatus.textContent = "✅ Đã kết nối";
            calendarStatus.style.color = "green";
            document.getElementById("link-calendar-btn").textContent = "Kết nối lại";
        } else {
            calendarStatus.textContent = "⚪ Chưa kết nối";
        }

      } else {
        console.error("Không tìm thấy thông tin bác sĩ.");
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu bác sĩ:", error);
    }
  }

  // Gọi hàm điền trước dữ liệu
  await prefillDoctorInfo(doctorId);

  // --- Xử lý Kết nối Google Calendar ---
  const linkCalendarBtn = document.getElementById("link-calendar-btn");
  if (linkCalendarBtn) {
    linkCalendarBtn.addEventListener("click", function() {
        if (!doctorId) return;
        
        // Mở popup để xác thực OAuth
        const width = 500;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        window.open(
            `http://localhost:5000/auth/google?doctorId=${doctorId}`, 
            "GoogleAuth", 
            `width=${width},height=${height},top=${top},left=${left}`
        );
    });
  }

  // --- Xử lý Submit Form ---
  settingsForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    let valid = true;

    function showError(fieldId, message) {
      const errorSpan = document.getElementById("error-" + fieldId);
      if (errorSpan) errorSpan.innerText = message;
    }

    function clearError(fieldId) {
      const errorSpan = document.getElementById("error-" + fieldId);
      if (errorSpan) errorSpan.innerText = "";
    }

    const name = fullnameInput.value.trim();
    const dob = dobInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    clearError("fullname");
    clearError("dob");
    clearError("email");
    clearError("phone");

    if (!name) {
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
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        showError("phone", "Số điện thoại phải là 10 chữ số.");
        valid = false;
      }
    }

    // Xử lý đổi mật khẩu nếu có
    const toggleChangePassword = document.getElementById("toggle-change-password");
    const changePassword = toggleChangePassword.checked;

    let currentPassword, newPassword, confirmPassword;
    if (changePassword) {
      currentPassword = document.getElementById("current-password").value.trim();
      newPassword = document.getElementById("new-password").value.trim();
      confirmPassword = document.getElementById("confirm-password").value.trim();

      if (!currentPassword) {
        showError("current-password", "Mật khẩu hiện tại không được để trống.");
        valid = false;
      }
      if (!newPassword) {
        showError("new-password", "Mật khẩu mới không được để trống.");
        valid = false;
      }
      if (!confirmPassword) {
        showError("confirm-password", "Xác nhận mật khẩu không được để trống.");
        valid = false;
      }
      if (newPassword !== confirmPassword) {
        showError("confirm-password", "Mật khẩu mới và xác nhận không khớp.");
        valid = false;
      }
    }

    if (valid) {
      try {
        const doctorRef = doc(db, "doctors", doctorId);
        const docSnap = await getDoc(doctorRef);

        if (!docSnap.exists()) {
          throw new Error("Tài liệu bác sĩ không tồn tại.");
        }

        const updateData = {
          name,
          birthdate: dob.split("-").join("-"), // yyyy-mm-dd -> yyyy-dd-mm
          email,
          phone
        };

        if (changePassword) {
          const existingData = docSnap.data();
          if (existingData.password !== currentPassword) {
            showError("current-password", "Mật khẩu hiện tại không đúng.");
            return;
          }
          updateData.password = newPassword;
        }

        await updateDoc(doctorRef, updateData);
        alert("Cập nhật thông tin thành công!");
      } catch (err) {
        console.error("Lỗi khi cập nhật thông tin bác sĩ:", err);
        alert("Có lỗi xảy ra. Vui lòng thử lại.");
      }
    }
  });

  // --- Hiển thị vùng đổi mật khẩu khi tích ---
  document.getElementById("toggle-change-password").addEventListener("change", function () {
    const passwordFields = document.getElementById("password-fields");
    passwordFields.style.display = this.checked ? "block" : "none";
  });
});
