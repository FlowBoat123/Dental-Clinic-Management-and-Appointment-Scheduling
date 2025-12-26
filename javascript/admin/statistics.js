import { db } from '../config.js';
import { collection, getDocs, query, where, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
    const monthSelect = document.getElementById("month-select");
    const yearSelect = document.getElementById("year-select");
    const refreshBtn = document.getElementById("refresh-btn");
    
    // UI Elements
    const totalMonthRevenueEl = document.getElementById("total-month-revenue");
    const totalBillsCountEl = document.getElementById("total-bills-count");
    const monthLabelEl = document.getElementById("month-label");
    const topDoctorNameEl = document.getElementById("top-doctor-name");
    const topDoctorRevenueEl = document.getElementById("top-doctor-revenue");
    
    const doctorStatsBody = document.getElementById("doctor-stats-body");
    const monthlyStatsBody = document.getElementById("monthly-stats-body");
    const yearLabelEl = document.getElementById("year-label");

    // Data Cache
    let allPaidBills = [];
    let doctorsMap = {}; // ID -> Name

    // Initialize Selects
    populateMonths();
    const today = new Date();
    monthSelect.value = today.getMonth(); // 0-11
    yearSelect.value = today.getFullYear();

    // Load Data
    await fetchDoctors();
    await fetchPaidBills();

    // Event Listeners
    monthSelect.addEventListener("change", updateDashboard);
    yearSelect.addEventListener("change", updateDashboard);
    refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        await fetchPaidBills();
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới';
    });

    // --- Functions ---

    function populateMonths() {
        for(let i=0; i<12; i++) {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = `Tháng ${i+1}`;
            monthSelect.appendChild(opt);
        }
    }

    async function fetchDoctors() {
        try {
            const snapshot = await getDocs(collection(db, "doctors"));
            snapshot.forEach(doc => {
                const d = doc.data();
                doctorsMap[doc.id] = d.name || "Bác sĩ ẩn danh";
            });
        } catch (e) {
            console.error("Fetch doctors error:", e);
        }
    }

    async function fetchPaidBills() {
        try {
            // Fetch ONLY paid bills
            const q = query(collection(db, "bills"), where("status", "==", "paid"));
            const snapshot = await getDocs(q);
            
            allPaidBills = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                allPaidBills.push({
                    id: doc.id,
                    ...data,
                    // Parse createdAt to Date object
                    dateObj: new Date(data.paidAt || data.createdAt) 
                });
            });
            
            updateDashboard();

        } catch (e) {
            console.error("Fetch bills error:", e);
            alert("Lỗi tải dữ liệu hóa đơn: " + e.message);
        }
    }

    function updateDashboard() {
        const selectedMonth = parseInt(monthSelect.value);
        const selectedYear = parseInt(yearSelect.value);

        yearLabelEl.textContent = selectedYear;
        monthLabelEl.textContent = `Tháng ${selectedMonth + 1}/${selectedYear}`;

        // 1. Filter for Monthly View (Selected Month & Year)
        const monthBills = allPaidBills.filter(bill => {
            return bill.dateObj.getMonth() === selectedMonth && bill.dateObj.getFullYear() === selectedYear;
        });

        // 2. Filter for Yearly View (All months in Selected Year)
        const yearBills = allPaidBills.filter(bill => {
            return bill.dateObj.getFullYear() === selectedYear;
        });

        // Update Cards
        const totalRevenue = monthBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        totalMonthRevenueEl.textContent = totalRevenue.toLocaleString() + " VND";
        totalBillsCountEl.textContent = monthBills.length;

        // Update Doctor Stats Table
        renderDoctorStats(monthBills, totalRevenue);

        // Update Monthly Stats Table
        renderMonthlyStats(yearBills);
    }

    function renderDoctorStats(bills, totalRevenue) {
        // Group by Doctor
        const stats = {}; // { doctorId: { revenue: 0, count: 0 } }

        bills.forEach(bill => {
            const dId = bill.doctorId;
            if(!stats[dId]) stats[dId] = { revenue: 0, count: 0 };
            stats[dId].revenue += (bill.totalAmount || 0);
            stats[dId].count += 1;
        });

        // Convert to Array & Sort
        const sortedStats = Object.keys(stats).map(dId => ({
            id: dId,
            name: doctorsMap[dId] || dId,
            ...stats[dId]
        })).sort((a, b) => b.revenue - a.revenue);

        // Update Top Doctor Card
        if (sortedStats.length > 0) {
            topDoctorNameEl.textContent = sortedStats[0].name;
            topDoctorRevenueEl.textContent = sortedStats[0].revenue.toLocaleString() + " VND";
        } else {
            topDoctorNameEl.textContent = "-";
            topDoctorRevenueEl.textContent = "-";
        }

        // Render Table
        doctorStatsBody.innerHTML = "";
        if (sortedStats.length === 0) {
            doctorStatsBody.innerHTML = "<tr><td colspan='5'>Không có dữ liệu trong tháng này.</td></tr>";
            return;
        }

        sortedStats.forEach((item, index) => {
            const tr = document.createElement("tr");
            const rankClass = index === 0 ? "rank-1" : (index === 1 ? "rank-2" : (index === 2 ? "rank-3" : ""));
            const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue * 100) : 0;

            tr.innerHTML = `
                <td class="${rankClass}">#${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.count}</td>
                <td style="font-weight: bold;">${item.revenue.toLocaleString()}</td>
                <td>
                    <div class="progress-bar-bg" title="${percentage.toFixed(1)}%">
                        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span style="font-size: 12px; color: #666;">${percentage.toFixed(1)}%</span>
                </td>
            `;
            doctorStatsBody.appendChild(tr);
        });
    }

    function renderMonthlyStats(yearBills) {
        // Init 12 months
        const monthlyData = Array(12).fill(0).map(() => ({ revenue: 0, count: 0 }));

        yearBills.forEach(bill => {
            const mIndex = bill.dateObj.getMonth();
            monthlyData[mIndex].revenue += (bill.totalAmount || 0);
            monthlyData[mIndex].count += 1;
        });

        monthlyStatsBody.innerHTML = "";
        monthlyData.forEach((data, index) => {
            // Only show months that have passed or are current? Or all 12?
            // Let's show all 12
            const tr = document.createElement("tr");
            
            // Highlight selected month
            if (index === parseInt(monthSelect.value)) {
                tr.style.backgroundColor = "#e1f5fe";
            }

            tr.innerHTML = `
                <td>Tháng ${index + 1}</td>
                <td>${data.count > 0 ? data.count : '-'}</td>
                <td>${data.revenue > 0 ? data.revenue.toLocaleString() : '-'}</td>
            `;
            monthlyStatsBody.appendChild(tr);
        });
    }
});
