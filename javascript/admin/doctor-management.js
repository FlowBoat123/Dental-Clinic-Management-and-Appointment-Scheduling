document.addEventListener("DOMContentLoaded", function () {
  // Xử lý xóa dòng khi bấm nút "Xóa"
  const deleteButtons = document.querySelectorAll(".delete");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.parentElement.parentElement;
      row.remove();
    });
  });

  // Thêm dòng mới khi bấm "Thêm tài khoản"
  const addAccountBtn = document.getElementById("addAccountBtn");
  addAccountBtn.addEventListener("click", addAccount);

  function addAccount() {
    const table = document.getElementById("doctorTable");
    const newRow = table.insertRow(-1); // Thêm vào cuối bảng

    // Thêm các ô vào dòng mới
    for (let i = 0; i < 5; i++) {
      const cell = newRow.insertCell(i);
      cell.innerHTML = `<input type="text" placeholder="Nhập dữ liệu" />`; // Các ô nhập dữ liệu
    }

    // Thêm nút "Sửa"
    const editCell = newRow.insertCell(5);
    editCell.innerHTML = '<button class="btn edit">&#128295;</button>';

    // Thêm nút "Xóa"
    const deleteCell = newRow.insertCell(6);
    deleteCell.innerHTML = '<button class="btn delete">&#10060;</button>';

    // Thêm sự kiện cho nút xóa và sửa trong dòng mới
    addDeleteEvent();
    addEditEvent();
  }

  // Thêm sự kiện "Xóa" cho các nút mới được thêm vào
  function addDeleteEvent() {
    const deleteButtons = document.querySelectorAll(".delete");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const row = this.parentElement.parentElement;
        row.remove();
      });
    });
  }

  // Thêm sự kiện "Sửa" cho các nút mới được thêm vào
  function addEditEvent() {
    const editButtons = document.querySelectorAll(".edit");
    editButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Logic sửa thông tin bác sĩ (Ví dụ: chuyển các ô thành input để sửa)
        const row = this.parentElement.parentElement;
        const cells = row.querySelectorAll("td");

        // Chuyển các ô thành các ô nhập liệu (input)
        cells.forEach((cell, index) => {
          if (index < 5) {
            const input = document.createElement("input");
            input.type = "text";
            input.value = cell.textContent;
            cell.innerHTML = "";
            cell.appendChild(input);
          }
        });

        // Chỉnh sửa nút "Sửa" thành "Lưu"
        this.innerHTML = "Lưu";
        this.classList.remove("edit");
        this.classList.add("save");

        // Thêm sự kiện lưu khi bấm nút "Lưu"
        this.addEventListener("click", function () {
          cells.forEach((cell, index) => {
            if (index < 5) {
              const input = cell.querySelector("input");
              cell.innerHTML = input.value; // Lưu giá trị sửa vào ô
            }
          });

          // Chỉnh sửa lại nút thành "Sửa"
          this.innerHTML = "&#128295;";
          this.classList.remove("save");
          this.classList.add("edit");
        });
      });
    });
  }

  // Gọi hàm xử lý khi trang được tải xong
  addDeleteEvent();
  addEditEvent();
});
