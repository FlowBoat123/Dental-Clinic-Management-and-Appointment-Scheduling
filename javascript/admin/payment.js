import { db } from '../config.js';
import { collection, getDocs, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
    const tableBody = document.getElementById("bills-body");
    const searchInput = document.getElementById("search-input");
    const statusFilter = document.getElementById("status-filter");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const pageInfo = document.getElementById("page-info");

    let allBills = []; // Store all fetched bills
    let doctorsMap = {}; // Map doctorID -> doctorName
    
    // Pagination State
    let currentPage = 1;
    const itemsPerPage = 10;
    let filteredBills = [];

    // 1. Fetch Doctors Logic
    async function fetchDoctors() {
        try {
            const doctorsRef = collection(db, "doctors");
            const snapshot = await getDocs(doctorsRef);
            snapshot.forEach(doc => {
                const data = doc.data();
                doctorsMap[doc.id] = data.name || "Bác sĩ ẩn danh"; // Assuming field 'name' exists
            });
        } catch (e) {
            console.error("Error fetching doctors:", e);
        }
    }

    // 2. Fetch Bills Logic
    async function fetchBills() {
        try {
            tableBody.innerHTML = "<tr><td colspan='6'>Đang tải dữ liệu...</td></tr>";
            
            // Wait for doctors to load first for better UX (or handle async render)
            await fetchDoctors();

            const billsRef = collection(db, "bills");
            const q = query(billsRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);

            allBills = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                allBills.push({
                    id: docSnap.id,
                    ...data,
                    doctorName: doctorsMap[data.doctorId] || data.doctorId || "Unknown"
                });
            });

            // Initial Filter & Render
            applyFilters();

        } catch (e) {
            console.error("Error fetching bills:", e);
            tableBody.innerHTML = `<tr><td colspan='6' style='color:red;'>Lỗi tải dữ liệu: ${e.message}</td></tr>`;
        }
    }

    // 3. Filter Logic
    function applyFilters() {
        const searchText = searchInput.value.toLowerCase().trim();
        const status = statusFilter.value;

        filteredBills = allBills.filter(bill => {
            const matchName = (bill.patientName || "").toLowerCase().includes(searchText);
            const matchDoctor = (bill.doctorName || "").toLowerCase().includes(searchText);
            const matchSearch = matchName || matchDoctor;

            const matchStatus = status === "all" || 
                                (status === "paid" && bill.status === "paid") ||
                                (status === "pending" && bill.status !== "paid");

            return matchSearch && matchStatus;
        });

        // Reset to page 1 on new filter
        currentPage = 1;
        renderPagination();
    }

    // 4. Render & Pagination Logic
    function renderPagination() {
        const totalPages = Math.ceil(filteredBills.length / itemsPerPage) || 1;
        
        // Ensure currentPage is valid
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
        
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredBills.slice(startIndex, endIndex);

        renderTable(pageItems);
    }

    function renderTable(bills) {
        tableBody.innerHTML = "";

        if (bills.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='6'>Không tìm thấy hóa đơn nào.</td></tr>";
            return;
        }

        bills.forEach(bill => {
            const tr = document.createElement("tr");
            
            const dateStr = new Date(bill.createdAt).toLocaleDateString('vi-VN') + " " + new Date(bill.createdAt).toLocaleTimeString('vi-VN');
            const isPaid = bill.status === 'paid';
            const statusClass = isPaid ? 'status-paid' : 'status-pending';
            const statusText = isPaid ? 'Đã thanh toán' : 'Chờ thanh toán';
            
            tr.innerHTML = `
                <td>${bill.patientName}<br><small>${bill.patientPhone || ''}</small></td>
                <td>${dateStr}</td>
                <td>${bill.doctorName}</td>
                <td>${(bill.totalAmount || 0).toLocaleString()}</td>
                <td class="${statusClass}" id="status-${bill.id}">${statusText}</td>
                <td>
                    ${!isPaid ? `<button class="btn btn-paid" id="btn-${bill.id}">Xác nhận đã thu tiền</button>` : ''}
                </td>
            `;
            
            const btn = tr.querySelector("button");
            if(btn) {
                btn.addEventListener("click", () => handleMarkAsPaid(bill.id, btn));
            }

            tableBody.appendChild(tr);
        });
    }

    // 5. Action Logic
    async function handleMarkAsPaid(billId, btnElement) {
        if(!confirm("Xác nhận đã nhận được tiền thanh toán cho hóa đơn này?")) return;

        try {
            btnElement.disabled = true;
            btnElement.textContent = "Đang xử lý...";

            const billRef = doc(db, "bills", billId);
            await updateDoc(billRef, {
                status: 'paid',
                paidAt: new Date().toISOString()
            });

            // Update Local Data (to reflect changes without re-fetching)
            const billIndex = allBills.findIndex(b => b.id === billId);
            if (billIndex !== -1) {
                allBills[billIndex].status = 'paid';
            }

            // Update UI Row directly
            const statusCell = document.getElementById(`status-${billId}`);
            if(statusCell) {
                statusCell.textContent = "Đã thanh toán";
                statusCell.className = "status-paid";
            }
            btnElement.remove();

        } catch (e) {
            console.error(e);
            alert("Lỗi cập nhật trạng thái: " + e.message);
            btnElement.disabled = false;
            btnElement.textContent = "Xác nhận đã thu tiền";
        }
    }

    // Event Listeners
    searchInput.addEventListener("input", applyFilters);
    statusFilter.addEventListener("change", applyFilters);

    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPagination();
        }
    });

    nextBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPagination();
        }
    });

    // Initialize
    fetchBills();
});