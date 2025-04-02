document.addEventListener("DOMContentLoaded", function () {
  const viewButtons = document.querySelectorAll(".view");
  viewButtons.forEach((button) => {
    button.addEventListener("click", function () {
      alert("Hiển thị thông tin chi tiết!");
    });
  });

  const chooseButtons = document.querySelectorAll(".choose");
  chooseButtons.forEach((button) => {
    button.addEventListener("click", function () {
      alert("Chọn bác sĩ trực!");
    });
  });

  // Xử lý chuyển trang khi click vào sidebar
  document.querySelectorAll(".sidebar a").forEach((link) => {
    link.addEventListener("click", function (event) {
      event.preventDefault(); // Ngăn chặn load lại trang mặc định
      window.location.href = this.getAttribute("href");
    });
  });
});
