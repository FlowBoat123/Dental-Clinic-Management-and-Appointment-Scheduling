# 🦷 Dental Clinic Management & Appointment Scheduling

Ứng dụng web hỗ trợ phòng khám nha khoa quản lý bệnh nhân, đặt lịch hẹn và tích hợp chatbot AI để người dùng có thể hỏi thông tin hoặc đặt lịch bằng văn bản hoặc giọng nói.

## 📌 Mục lục
- [Giới thiệu](#giới-thiệu)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt & chạy thử](#cài-đặt--chạy-thử)
- [Triển khai](#triển-khai)
- [Góp ý & hỗ trợ](#góp-ý--hỗ-trợ)
- [License](#license)

---

## Giới thiệu

Dự án giúp phòng khám nha khoa:
- Quản lý thông tin bệnh nhân
- Đặt và tra cứu lịch hẹn khám
- Tương tác tự động với người dùng thông qua chatbot AI

Toàn bộ logic chạy phía frontend (HTML/CSS/JS) kết nối trực tiếp với Firebase và Google Dialogflow, **không cần backend riêng (Node.js)**.

---

## Tính năng chính

- ✅ Giao diện HTML/CSS/JavaScript thuần, dễ triển khai
- ✅ Mỗi trang HTML đi kèm một file JavaScript để xử lý logic riêng
- ✅ Xác thực người dùng bằng Firebase Authentication
- ✅ Quản lý bệnh nhân và lịch hẹn bằng Firebase Database
- ✅ Chatbot AI tích hợp Google Dialogflow Messenger
  - Giao tiếp bằng văn bản hoặc giọng nói (mic)
  - Đặt lịch, hỏi thông tin dịch vụ, giờ làm việc, v.v.

---

## Công nghệ sử dụng

| Thành phần      | Công nghệ                                  |
|-----------------|--------------------------------------------|
| Frontend        | HTML, CSS, JavaScript                      |
| Quản lý người dùng | Firebase Authentication                 |
| Cơ sở dữ liệu   | Firebase Realtime Database / Firestore     |
| AI Chatbot      | Google Dialogflow + Dialogflow Messenger   |
| Nhận diện giọng nói | Web Speech API (trình duyệt hỗ trợ)    |
| Triển khai      | [Render](https://render.com) hoặc GitHub Pages |

---

## Cài đặt & chạy thử

### Yêu cầu
- Trình duyệt hiện đại (Chrome, Firefox, Edge)
- Kết nối internet để dùng Firebase và Dialogflow

### Cách chạy local
```bash
git clone https://github.com/FlowBoat123/Dental-Clinic-Management-and-Appointment-Scheduling.git
cd Dental-Clinic-Management-and-Appointment-Scheduling

# Mở index.html bằng trình duyệt
```

## Triển khai

Trang web đã được triển khai tại:

👉 [https://btl-cnpm-7nfa.onrender.com/]


---

## Góp ý & hỗ trợ

- Nếu có vấn đề, hãy mở [issue](https://github.com/FlowBoat123/Dental-Clinic-Management-and-Appointment-Scheduling/issues)
- Đóng góp pull request luôn được chào đón!

---
