document.addEventListener("DOMContentLoaded", function () {
  // Lấy nút chuyển hướng (có class "button")
  const logoutButton = document.querySelector(".main-content .button");

  if (logoutButton) {
    logoutButton.addEventListener("click", function (e) {
      e.preventDefault(); // Ngăn hành động mặc định của liên kết
      // Chuyển hướng sang trang đăng nhập
      localStorage.removeItem("doctorId");
      localStorage.removeItem("doctorEmail");
      window.location.href = "../../shared/login.html";
    });
  }
});
