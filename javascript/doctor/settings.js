document.addEventListener("DOMContentLoaded", function () {
  // --- Avatar update ---
  const avatarContainer = document.getElementById("avatarContainer");
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");

  if (avatarContainer && avatarInput && avatarPreview) {
    avatarContainer.addEventListener("click", function () {
      avatarInput.click();
    });

    avatarInput.addEventListener("change", function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          avatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // --- Toggle đổi mật khẩu ---
  const toggleChangePassword = document.getElementById("toggle-change-password");
  const passwordFields = document.getElementById("password-fields");

  if (toggleChangePassword && passwordFields) {
    toggleChangePassword.addEventListener("change", function () {
      if (this.checked) {
        passwordFields.style.display = "block";
      } else {
        passwordFields.style.display = "none";
        // Xóa giá trị trong các ô mật khẩu khi không đổi
        document.getElementById("current-password").value = "";
        document.getElementById("new-password").value = "";
        document.getElementById("confirm-password").value = "";
        // Xóa thông báo lỗi nếu có
        document.getElementById("error-current-password").innerText = "";
        document.getElementById("error-new-password").innerText = "";
        document.getElementById("error-confirm-password").innerText = "";
      }
    });
  }

  // --- Xử lý sự kiện submit form ---
  const settingsForm = document.getElementById("settingsForm");
  settingsForm.addEventListener("submit", function (e) {
    e.preventDefault(); // Ngăn gửi form để kiểm tra các lỗi

    // Xóa thông báo lỗi cũ
    clearError("fullname");
    clearError("dob");
    clearError("email");
    clearError("phone");
    if (toggleChangePassword.checked) {
      clearError("current-password");
      clearError("new-password");
      clearError("confirm-password");
    }

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

    // Kiểm tra các trường bắt buộc (trừ phần đổi mật khẩu và không có certificates)
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

    // Nếu mọi thứ đều hợp lệ
    if (valid) {
      alert("Thông tin hợp lệ. Form sẽ được gửi.");
      // settingsForm.submit(); // Bật lại nếu muốn thực sự gửi form
    }
  });
});