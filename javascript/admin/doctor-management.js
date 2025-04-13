import { db } from "../config.js";
import {
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
  const addAccountBtn = document.getElementById("addAccountBtn");
  const table = document.getElementById("doctorTable");

  const headers = ["Tên", "Ngày sinh", "Số điện thoại", "Email", "Mật khẩu"];

  async function loadDoctors() {
    const querySnapshot = await getDocs(collection(db, "doctors"));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const newRow = table.insertRow(-1);

      newRow.insertCell(0).textContent = data.name;
      newRow.insertCell(1).textContent = data.birthdate;
      newRow.insertCell(2).textContent = data.phone;
      newRow.insertCell(3).textContent = data.email;
      newRow.insertCell(4).textContent = data.password;

      const editCell = newRow.insertCell(5);
      const saveCell = newRow.insertCell(6);
      const deleteCell = newRow.insertCell(7);

      editCell.innerHTML = `<button class="btn edit"><i class="fas fa-edit"></i></button>`;
      saveCell.innerHTML = `<button class="btn save"><i class="fas fa-save"></i></button>`;
      deleteCell.innerHTML = `<button class="btn delete"><i class="fas fa-trash-alt"></i></button>`;

      addEditEvent(editCell.querySelector(".edit"));
      addSaveEvent(saveCell.querySelector(".save"));
      addDeleteEvent(deleteCell.querySelector(".delete"));
    });
  }

  function addAccount() {
    const newRow = table.insertRow(-1);

    for (let i = 0; i < 5; i++) {
      const cell = newRow.insertCell(i);
      let inputType = "text";
      if (i === 1) inputType = "date"; // Ngày sinh
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
    button.addEventListener("click", async function () {
      const row = this.closest("tr");
      const cells = row.querySelectorAll("td");
      const emptyFields = [];

      for (let i = 0; i < 5; i++) {
        const input = cells[i].querySelector("input");
        if (!input || input.value.trim() === "") {
          emptyFields.push(headers[i]);
        }
      }

      const phoneInput = cells[2].querySelector("input");
      const phonePattern = /^\d{10}$/;
      if (phoneInput && !phonePattern.test(phoneInput.value.trim())) {
        alert("Số điện thoại phải gồm 10 chữ số.");
        return;
      }
      
      const emailInput = cells[3].querySelector("input");
      if (emailInput && !emailInput.value.includes("@")) {
        alert("Email phải chứa ký tự '@'.");
        return;
      }

      if (emptyFields.length > 0) {
        alert("Các ô sau đang trống: " + emptyFields.join(", "));
        return;
      }

      const name = cells[0].querySelector("input").value.trim();
      const birthdateRaw = cells[1].querySelector("input").value;
      const phone = cells[2].querySelector("input").value.trim();
      const email = cells[3].querySelector("input").value.trim();
      const password = cells[4].querySelector("input").value.trim();

      const birthdateDate = new Date(birthdateRaw);
      const formattedBirthdate = `${birthdateDate.getDate()}/${birthdateDate.getMonth() + 1}/${birthdateDate.getFullYear()}`;

      try {
        await addDoc(collection(db, "doctors"), {
          name,
          birthdate: formattedBirthdate,
          phone,
          email,
          password
        });
        alert("Thêm bác sĩ thành công!");

        cells[0].textContent = name;
        cells[1].textContent = formattedBirthdate;
        cells[2].textContent = phone;
        cells[3].textContent = email;
        cells[4].textContent = password;
      } catch (error) {
        console.error("Lỗi khi thêm bác sĩ:", error);
        alert("Có lỗi xảy ra khi lưu dữ liệu.");
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

  await loadDoctors();
});
