import { db } from '../config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const appointmentId = urlParams.get('appointmentId');
    const doctorId = localStorage.getItem("doctorId");

    if (!appointmentId) {
        alert("Thiếu ID cuộc hẹn.");
        window.location.href = "schedule.html";
        return;
    }

    if (!doctorId) {
        alert("Vui lòng đăng nhập.");
        window.location.href = "logout.html";
        return;
    }

    const loadingMsg = document.getElementById("loading-message");
    const billingForm = document.getElementById("billing-form");
    const patientNameEl = document.getElementById("patient-name");
    const bookedServiceEl = document.getElementById("booked-service");
    const apptNoteEl = document.getElementById("appt-note");
    const servicesTbody = document.getElementById("services-tbody");
    const totalAmountEl = document.getElementById("total-amount");
    const submitBtn = document.getElementById("submit-btn");
    const cancelBtn = document.getElementById("cancel-btn");

    let servicesData = [];
    let currentAppointment = null;

    // Load Data
    try {
        // 1. Fetch Appointment Details
        const apptRef = doc(db, "appointments", appointmentId);
        const apptSnap = await getDoc(apptRef);

        if (!apptSnap.exists()) {
            alert("Không tìm thấy cuộc hẹn.");
            window.location.href = "schedule.html";
            return;
        }

        currentAppointment = apptSnap.data();
        currentAppointment.id = apptSnap.id;

        // Verify Doctor
        if (currentAppointment.doctorID !== doctorId) {
            alert("Bạn không có quyền truy cập cuộc hẹn này.");
            window.location.href = "schedule.html";
            return;
        }

        // Check if already completed
        if (currentAppointment.status === "completed") {
            alert("Cuộc hẹn này đã hoàn thành.");
            window.location.href = "schedule.html";
            return;
        }

        // Display Info
        patientNameEl.textContent = currentAppointment.patientName;
        bookedServiceEl.textContent = currentAppointment.service;
        apptNoteEl.textContent = currentAppointment.note || "Không có";

        // 2. Fetch Services
        const response = await fetch("http://localhost:5000/api/services");
        const resData = await response.json();

        if (resData.status === "success") {
            servicesData = resData.data;
            renderServicesTable(servicesData);
            loadingMsg.style.display = "none";
            billingForm.style.display = "block";
        } else {
            throw new Error(resData.message);
        }

    } catch (e) {
        console.error(e);
        alert("Lỗi tải dữ liệu: " + e.message);
        window.location.href = "schedule.html";
    }

    // Render Table
    function renderServicesTable(services) {
        servicesTbody.innerHTML = "";
        
        services.forEach(service => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td><input type="checkbox" class="service-check" value="${service.id}" data-price="${service.price}"></td>
                <td>${service.name}</td>
                <td>${service.unit}</td>
                <td>${service.price.toLocaleString()}</td>
                <td><input type="number" class="qty-input" value="1" min="1" disabled></td>
                <td class="row-total">0</td>
            `;

            const checkbox = tr.querySelector(".service-check");
            const qtyInput = tr.querySelector(".qty-input");
            const rowTotal = tr.querySelector(".row-total");

            // Events
            checkbox.addEventListener("change", function() {
                qtyInput.disabled = !this.checked;
                updateRowTotal(checkbox, qtyInput, rowTotal);
                calculateGrandTotal();
            });

            qtyInput.addEventListener("input", function() {
                updateRowTotal(checkbox, qtyInput, rowTotal);
                calculateGrandTotal();
            });
            
            // Add click on row to toggle checkbox
            tr.addEventListener("click", function(e) {
                if (e.target !== checkbox && e.target !== qtyInput) {
                    checkbox.click();
                }
            });

            servicesTbody.appendChild(tr);
        });
    }

    function updateRowTotal(checkbox, qtyInput, rowTotalEl) {
        if (checkbox.checked) {
            const price = parseInt(checkbox.getAttribute("data-price"));
            const qty = parseInt(qtyInput.value) || 0;
            const total = price * qty;
            rowTotalEl.textContent = total.toLocaleString();
        } else {
            rowTotalEl.textContent = "0";
        }
    }

    function calculateGrandTotal() {
        let total = 0;
        const checkboxes = document.querySelectorAll(".service-check:checked");
        
        checkboxes.forEach(cb => {
            const price = parseInt(cb.getAttribute("data-price"));
            const row = cb.closest("tr");
            const qty = parseInt(row.querySelector(".qty-input").value) || 0;
            total += price * qty;
        });
        
        totalAmountEl.textContent = total.toLocaleString();
    }

    // Buttons
    cancelBtn.addEventListener("click", function() {
        if(confirm("Hủy bỏ tạo hóa đơn và quay lại lịch làm việc?")) {
            window.location.href = "schedule.html";
        }
    });

    submitBtn.addEventListener("click", async function() {
        const selectedServices = [];
        const checkboxes = document.querySelectorAll(".service-check:checked");
        
        checkboxes.forEach(cb => {
            const row = cb.closest("tr");
            const qty = parseInt(row.querySelector(".qty-input").value) || 1;
            selectedServices.push({
                id: cb.value,
                quantity: qty
            });
        });

        if (selectedServices.length === 0) {
            if(!confirm("Bạn chưa chọn dịch vụ nào. Xác nhận hoàn thành mà không tính phí thêm?")) return;
        } else {
            if(!confirm("Xác nhận hoàn thành cuộc hẹn và tạo hóa đơn?")) return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Đang xử lý...";

        try {
            const payload = {
                appointmentId: appointmentId,
                doctorId: doctorId,
                services: selectedServices
            };
            
            const response = await fetch("http://localhost:5000/api/doctor/complete-appointment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert("Thành công! Hóa đơn đã được tạo.");
                window.location.href = "schedule.html";
            } else {
                alert("Lỗi: " + result.message);
                submitBtn.disabled = false;
                submitBtn.textContent = "Xác nhận & Lưu hóa đơn";
            }

        } catch (e) {
            console.error(e);
            alert("Lỗi kết nối server.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Xác nhận & Lưu hóa đơn";
        }
    });

});
