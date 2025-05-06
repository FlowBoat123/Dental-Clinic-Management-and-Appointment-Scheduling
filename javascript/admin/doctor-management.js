import { db } from "../config.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
  const addAccountBtn = document.getElementById("addAccountBtn");
  const tableBody = document.querySelector("#doctorTable tbody");
  const headers = ["Tên", "Ngày sinh", "Số điện thoại", "Email", "Mật khẩu"];

  async function loadDoctors() {
    tableBody.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "doctors"));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const newRow = tableBody.insertRow(-1);
      newRow.dataset.id = docSnap.id;

      newRow.insertCell(0).textContent = data.name;
      newRow.insertCell(1).textContent = data.birthdate;
      newRow.insertCell(2).textContent = data.phone;
      newRow.insertCell(3).textContent = data.email;
      newRow.insertCell(4).textContent = data.password;

      const editCell = newRow.insertCell(5);
      const saveCell = newRow.insertCell(6);
      const deleteCell = newRow.insertCell(7);

      editCell.innerHTML = `<button class=\"btn edit\"><i class=\"fas fa-edit\"></i></button>`;
      saveCell.innerHTML = `<button class=\"btn save\"><i class=\"fas fa-save\"></i></button>`;
      deleteCell.innerHTML = `<button class=\"btn delete\"><i class=\"fas fa-trash-alt\"></i></button>`;

      addEditEvent(editCell.querySelector(".edit"));
      addSaveEvent(saveCell.querySelector(".save"));
      addDeleteEvent(deleteCell.querySelector(".delete"));
    });
  }

  function addAccount() {
    const newRow = tableBody.insertRow(-1);
    newRow.dataset.id = "";

    for (let i = 0; i < 5; i++) {
      const cell = newRow.insertCell(i);
      const inputType = i === 1 ? "date" : "text";
      cell.innerHTML = `<input type=\"${inputType}\" placeholder=\"Nhập dữ liệu\" />`;
    }

    const editCell = newRow.insertCell(5);
    const saveCell = newRow.insertCell(6);
    const deleteCell = newRow.insertCell(7);

    editCell.innerHTML = `<button class=\"btn edit\"><i class=\"fas fa-edit\"></i></button>`;
    saveCell.innerHTML = `<button class=\"btn save\"><i class=\"fas fa-save\"></i></button>`;
    deleteCell.innerHTML = `<button class=\"btn delete\"><i class=\"fas fa-trash-alt\"></i></button>`;

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
        const text = currentCell.textContent;
        if (!currentCell.querySelector("input")) {
          const input = document.createElement("input");
          input.type = i === 1 && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)
            ? "date"
            : i === 1 ? "date" : "text";
          input.value = input.type === "date" ? formatDateForInput(text) : text;
          currentCell.innerHTML = "";
          currentCell.appendChild(input);
        }
      }
    });
  }

  function addSaveEvent(button) {
    button.addEventListener("click", async function () {
      const row = this.closest("tr");
      // Nếu không trong trạng thái sửa (không có input), thoát
      const inputs = row.querySelectorAll("input");
      if (inputs.length === 0) return;
  
      const cells = row.querySelectorAll("td");
      const emptyFields = [];
  
      // Kiểm tra ô trống
      for (let i = 0; i < 5; i++) {
        const input = cells[i].querySelector("input");
        if (!input || input.value.trim() === "") {
          emptyFields.push(headers[i]);
        }
      }
      if (emptyFields.length) {
        alert("Các ô sau đang trống: " + emptyFields.join(", "));
        return;
      }
  
      // Validate số điện thoại
      const phoneVal = cells[2].querySelector("input").value.trim();
      if (!/^\d{10}$/.test(phoneVal)) {
        alert("Số điện thoại phải gồm 10 chữ số.");
        return;
      }
      // Validate email
      const emailVal = cells[3].querySelector("input").value.trim();
      if (!emailVal.includes("@")) {
        alert("Email phải chứa ký tự '@'.");
        return;
      }
  
      // Lấy dữ liệu sau khi đã kiểm tra
      const name = cells[0].querySelector("input").value.trim();
      const birthRaw = cells[1].querySelector("input").value;
      const birthFormatted = formatDateForDisplay(birthRaw);
      const phone = phoneVal;
      const email = emailVal;
      const password = cells[4].querySelector("input").value.trim();
  
      const payload = { name, birthdate: birthFormatted, phone, email, password };
      try {
        const id = row.dataset.id;
        if (id) {
          await updateDoc(doc(db, "doctors", id), payload);
        } else {
          const newDoc = await addDoc(collection(db, "doctors"), payload);
          row.dataset.id = newDoc.id;
        }
        // Ghi đè giá trị lên cell và loại bỏ input
        for (let i = 0; i < 5; i++) {
          cells[i].textContent = [name, birthFormatted, phone, email, password][i];
        }
        alert("Lưu thành công!");
      } catch (err) {
        console.error(err);
        alert("Lỗi khi lưu dữ liệu.");
      }
    });
  }
  

  function addDeleteEvent(button) {
    button.addEventListener("click", async function () {
      if (confirm("Bạn có chắc chắn muốn xóa thông tin Bác Sĩ này không?")) {
        const row = this.closest("tr");
        const id = row.dataset.id;
        if (id) {
          try {
            await deleteDoc(doc(db, "doctors", id));
          } catch (e) {
            console.error("Lỗi xóa Firestore:", e);
            alert("Xóa trên server thất bại.");
            return;
          }
        }
        row.remove();
      }
    });
  }

  function formatDateForInput(displayDate) {
    const [d, m, y] = displayDate.split("/");
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  function formatDateForDisplay(rawDate) {
    const dt = new Date(rawDate);
    return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`;
  }

  addAccountBtn.addEventListener("click", addAccount);
  await loadDoctors();
});
