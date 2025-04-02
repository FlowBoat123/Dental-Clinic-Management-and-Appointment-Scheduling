document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const roleToggle = document.getElementById("roleToggle");
  const loginRole = document.getElementById("loginRole");

  // Xử lý chuyển đổi giữa Bác sĩ và Admin
  if (roleToggle) {
    roleToggle.addEventListener("change", function () {
      loginRole.textContent = roleToggle.checked ? "Admin" : "Bác sĩ";
    });
  }

  // Xử lý khi gửi form đăng nhập
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const selectedRole = roleToggle.checked ? "admin" : "doctor";
      console.log("Đăng nhập với tư cách:", selectedRole);

      // Chuyển hướng theo role đã chọn:
      // Nếu chọn admin -> chuyển đến /admin/home.html
      // Nếu chọn doctor -> chuyển đến /doctor/index.html
      if (selectedRole === "admin") {
        window.location.href = "/html/admin/home.html";
      } else {
        window.location.href = "/html/doctor/index.html";
      }
    });
  }
});
