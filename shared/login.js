import { db } from "../javascript/config.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const roleToggle = document.getElementById("roleToggle");
  const loginRole = document.getElementById("loginRole");

  // Cập nhật vai trò khi chuyển đổi giữa Admin và Bác sĩ
  if (loginRole && roleToggle) {
    loginRole.textContent = roleToggle.checked ? "Admin" : "Bác sĩ";
  }

  if (roleToggle) {
    roleToggle.addEventListener("change", function () {
      loginRole.textContent = roleToggle.checked ? "Admin" : "Bác sĩ";
    });
  }

  // Xử lý khi form đăng nhập được submit
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const selectedRole = roleToggle.checked ? "admin" : "doctor";
      const email = loginForm.querySelector('input[type="email"]').value.trim();
      const password = loginForm.querySelector('input[type="password"]').value.trim();

      const collectionName = selectedRole === "admin" ? "admins" : "doctors";

      try {
        // Truy vấn dữ liệu từ Firestore
        const q = query(
          collection(db, collectionName),
          where("email", "==", email),
          where("password", "==", password)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // ✅ Đăng nhập thành công
          alert("Đăng nhập thành công!");

          const userDoc = querySnapshot.docs[0];

          // ✅ Lưu vào localStorage để dùng sau
          localStorage.setItem("doctorEmail", email);
          localStorage.setItem("doctorId", userDoc.id);

          // ✅ Chuyển hướng sau khi lưu
          const redirectTo =
            selectedRole === "admin"
              ? "../html/admin/home.html"
              : "../html/doctor/index.html"; // Không cần truyền qua URL nữa

          window.location.href = redirectTo;
        } else {
          alert("Email hoặc mật khẩu không đúng.");
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra đăng nhập:", error);
        alert("Đã xảy ra lỗi khi kiểm tra đăng nhập.");
      }
    });
  }
});
