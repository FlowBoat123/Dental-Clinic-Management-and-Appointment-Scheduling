document.addEventListener("DOMContentLoaded", function () {
  // Xử lý xác nhận đăng xuất
  window.confirmLogout = function () {
    // Bạn có thể thêm mã để thực hiện đăng xuất ở đây, ví dụ:
    // Xóa session hoặc token, sau đó chuyển hướng người dùng.
    alert("Đăng xuất thành công!");
    window.location.href = "/shared/login.html"; // Chuyển hướng về trang chủ sau khi đăng xuất.
  };

  // Xử lý hủy bỏ đăng xuất
  window.cancelLogout = function () {
    window.location.href = "home.html"; // Quay lại trang chủ nếu hủy bỏ.
  };
});
