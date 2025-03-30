document.addEventListener("DOMContentLoaded", function () {
  // --- Cập nhật thông tin bác sĩ ---
  const doctorData = {
    name: "Nguyễn Văn A",
    fullname: "Nguyễn Văn A",
    age: 45,
    specialty: "Nha khoa",
    experience: 20
  };

  // Cập nhật thông tin bác sĩ lên giao diện
  document.getElementById("doctor-name").textContent = doctorData.name;
  document.getElementById("doctor-fullname").textContent = doctorData.fullname;
  document.getElementById("doctor-age").textContent = doctorData.age;

  // --- Xử lý chuyển hướng qua sidebar ---
  const navLinks = document.querySelectorAll(".sidebar ul li a");
  navLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const targetPage = this.getAttribute("href");
      window.location.href = targetPage;
    });
  });

  // --- Xử lý Modal cho lịch khám ---
  const appointmentItems = document.querySelectorAll(".appointment-item");
  const modal = document.getElementById("patientModal");
  const closeBtn = document.querySelector(".close-btn");

  // Các phần tử hiển thị thông tin bệnh nhân trong modal
  const modalName = document.getElementById("modalName");
  const modalAge = document.getElementById("modalAge");
  const modalPhone = document.getElementById("modalPhone");
  const modalTime = document.getElementById("modalTime");
  const modalService = document.getElementById("modalService");
  const modalNote = document.getElementById("modalNote");

  // Khi click vào một lịch khám, cập nhật thông tin và hiển thị modal
  appointmentItems.forEach(function (item) {
    item.addEventListener("click", function () {
      modalName.textContent = item.dataset.name;
      modalAge.textContent = item.dataset.age;
      modalPhone.textContent = item.dataset.phone;
      // Lấy giờ khám từ phần tử .appointment-time bên trong li
      modalTime.textContent = item.querySelector('.appointment-time').textContent;
      modalService.textContent = item.dataset.service;
      modalNote.textContent = item.dataset.note;
      modal.style.display = "block";
    });
  });

  // Khi click vào nút đóng modal, ẩn modal
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });
  }

  // Khi click bên ngoài modal-content, ẩn modal
  window.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
