document.addEventListener("DOMContentLoaded", function () {
  const addAccountBtn = document.getElementById("addAccountBtn");
  const table = document.getElementById("doctorTable");

  const headers = ["Tên", "Ngày sinh", "Số điện thoại", "Email", "Mật khẩu"];

  function addAccount() {
    const newRow = table.insertRow(-1);

    for (let i = 0; i < 5; i++) {
      const cell = newRow.insertCell(i);
      let inputType = "text";
      if (i === 1) inputType = "date"; // Ngày sinh có dạng date
      cell.innerHTML = `<input type="${inputType}" placeholder="Nhập dữ liệu" />`;
    }

    const editCell = newRow.insertCell(5);
    const saveCell = newRow.insertCell(6);
    const deleteCell = newRow.insertCell(7);

    editCell.innerHTML = `<button class="btn edit"><i class="fas fa-edit"></i></button>`;
    saveCell.innerHTML = `<button class="btn save"><i class="fas fa-save"></i></button>`;
    deleteCell.innerHTML = `<button class="btn delete"><i class="fas fa-trash-alt"></i></button>`;

    addEditEvent(editCell.querySelector(".edit"));
    addSaveEvent(saveCell.querySelector(".save"));
    addDeleteEvent(deleteCell.querySelector(".delete"));
  }

  function addEditEvent(button) {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const cells = row.querySelectorAll("td");

      for (let i = 0; i < 5; i++) {
        const currentCell = cells[i];
        const currentValue = currentCell.textContent;

        if (!currentCell.querySelector("input")) {
          const input = document.createElement("input");
          input.type = (i === 1) ? "date" : "text";
          input.value = (i === 1 && isValidDate(currentValue)) ? formatDateForInput(currentValue) : currentValue;
          currentCell.innerHTML = "";
          currentCell.appendChild(input);
        }
      }
    });
  }

  function isValidDate(dateString) {
    const regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    return regex.test(dateString);
  }

  function formatDateForInput(dateString) {
    const [day, month, year] = dateString.split("/");
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  function addSaveEvent(button) {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const cells = row.querySelectorAll("td");
      const emptyFields = [];

      for (let i = 0; i < 5; i++) {
        const input = cells[i].querySelector("input");
        if (!input || input.value.trim() === "") {
          emptyFields.push(headers[i]);
        }
      }

      // Kiểm tra định dạng số điện thoại
      const phoneInput = cells[2].querySelector("input");
      const phonePattern = /^\d{10}$/;
      if (phoneInput && !phonePattern.test(phoneInput.value.trim())) {
        alert("Số điện thoại phải gồm 10 chữ số.");
        return;
      }

      // Kiểm tra định dạng email
      const emailInput = cells[3].querySelector("input");
      if (emailInput && !emailInput.value.includes("@")) {
        alert("Email phải chứa ký tự '@'.");
        return;
      }

      if (emptyFields.length > 0) {
        alert("Các ô sau đang trống: " + emptyFields.join(", "));
        return;
      }

      for (let i = 0; i < 5; i++) {
        const input = cells[i].querySelector("input");
        if (input) {
          if (i === 1 && input.type === "date") {
            const date = new Date(input.value);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            cells[i].textContent = formattedDate;
          } else {
            cells[i].textContent = input.value;
          }
        }
      }
    });
  }

  function addDeleteEvent(button) {
    button.addEventListener("click", function () {
      if (confirm("Bạn có chắc chắn muốn xóa dòng này không?")) {
        const row = this.closest("tr");
        row.remove();
      }
    });
  }

  document.querySelectorAll(".edit").forEach(addEditEvent);
  document.querySelectorAll(".save").forEach(addSaveEvent);
  document.querySelectorAll(".delete").forEach(addDeleteEvent);

  addAccountBtn.addEventListener("click", addAccount);
});
