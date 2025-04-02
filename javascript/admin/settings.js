document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("accountForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Lấy các giá trị trong form
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const email = document.getElementById("email").value;

    // Kiểm tra mật khẩu hiện tại (Giả sử mật khẩu hiện tại là "admin123")
    const correctCurrentPassword = "admin123"; // Đây là mật khẩu giả định cho ví dụ
    if (currentPassword !== correctCurrentPassword) {
      alert("Mật khẩu hiện tại không đúng!");
      return;
    }

    // Kiểm tra mật khẩu mới và xác nhận mật khẩu
    if (newPassword && newPassword !== confirmPassword) {
      alert("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }

    // Hiển thị thông báo thay đổi thành công
    alert("Thông tin tài khoản đã được lưu thành công!");

    // Sau khi lưu, có thể thực hiện gửi thông tin tới backend hoặc cập nhật giao diện
    // Ví dụ: gửi dữ liệu tới backend (đây chỉ là mô phỏng)
    console.log({
      email,
      newPassword: newPassword ? newPassword : "Không thay đổi mật khẩu",
    });

    // Bạn có thể gọi một API để lưu dữ liệu nếu cần.
  });
});
