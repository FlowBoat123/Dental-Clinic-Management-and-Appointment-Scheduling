from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
import logging
import re
import os
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import secrets
import string
import json
from flask import redirect, url_for
from service.calendar.google_calendar_service import (
    create_calendar_event, 
    delete_calendar_event,
    get_auth_url, 
    exchange_code_for_credentials, 
    credentials_to_dict
)

load_dotenv()

# Cấu hình logging để ghi ra console
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

logger = logging.getLogger()
logger.setLevel(logging.INFO)

logging.info("Flask logging setup completed!")

app = Flask(__name__)
CORS(app)  # Cho phép cross-origin requests

# URL cơ sở cho OAuth callback (thay đổi khi deploy)
BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")

# ====================== DEEPSEEK API CONFIG ======================
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

if not DEEPSEEK_API_KEY:
    logging.warning("⚠️  DEEPSEEK_API_KEY not found in environment variables")

# Khóa API OpenWeatherMap
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

# ====================== EMAIL CONFIG ======================
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "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")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "hienctcom@gmail.com")
VERIFICATION_LINK_BASE = os.getenv("VERIFICATION_LINK_BASE", "http://localhost:5000")

def get_answer_from_deepseek(question):
    """Gọi Deepseek API để trả lời câu hỏi về nha khoa"""
    try:
        if not DEEPSEEK_API_KEY:
            return "Lỗi: API key chưa được cấu hình. Vui lòng kiểm tra DEEPSEEK_API_KEY."
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        
        system_message = """Bạn là một chuyên gia nha khoa nói tiếng Việt. 
Trả lời các câu hỏi về sức khỏe răng miệng, các bệnh nha khoa, phương pháp điều trị, 
và các cách chăm sóc phòng ngừa. Hãy cung cấp thông tin chính xác, an toàn và hữu ích.

Nếu câu hỏi không liên quan đến nha khoa, hãy lịch sự từ chối trả lời và gợi ý quay lại chủ đề nha khoa."""
        
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": question}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        if result.get("choices") and len(result["choices"]) > 0:
            answer = result["choices"][0]["message"]["content"]
            logging.info(f"✅ Deepseek API response received for question: {question[:50]}...")
            return answer
        else:
            logging.warning("⚠️  No choices in Deepseek response")
            return "Xin lỗi, tôi không thể trả lời câu hỏi này. Vui lòng thử lại."
    
    except requests.Timeout:
        logging.error("❌ Deepseek API timeout")
        return "Lỗi: Yêu cầu tới API đã hết thời gian. Vui lòng thử lại."
    except requests.RequestException as e:
        logging.error(f"❌ Deepseek API error: {str(e)}")
        return f"Lỗi: Không thể kết nối tới API. Chi tiết: {str(e)}"
    except json.JSONDecodeError:
        logging.error("❌ Invalid JSON response from Deepseek API")
        return "Lỗi: Phản hồi từ API không hợp lệ."
    except Exception as e:
        logging.error(f"❌ Unexpected error in get_answer_from_deepseek: {str(e)}")
        return f"Lỗi bất ngờ: {str(e)}"

def get_weather(location):
    if not location:
        return "Bạn muốn biết thời tiết ở đâu?"
    try:
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={OPENWEATHER_API_KEY}&units=metric&lang=vi"
        response = requests.get(weather_url)
        response.raise_for_status()  # Kiểm tra lỗi HTTP
        data = response.json()

        temp = data["main"]["temp"]
        description = data["weather"][0]["description"]
        city = data["name"]

        return f"Thời tiết ở {city} hiện tại: {temp}°C, {description}."
    except requests.RequestException as e:
        return f"Không thể lấy thông tin thời tiết cho {location}. Vui lòng thử lại! Error: {str(e)}"

def convert_day_to_vietnamese(english_day):
    days_mapping = {
        "Monday": "Thứ 2",
        "Tuesday": "Thứ 3",
        "Wednesday": "Thứ 4",
        "Thursday": "Thứ 5",
        "Friday": "Thứ 6",
        "Saturday": "Thứ 7",
        "Sunday": "Chủ nhật"
    }
    return days_mapping.get(english_day, english_day)  # Trả về ngày đã chuyển đổi hoặc giữ nguyên nếu không tìm thấy

# Lưu dữ liệu session
user_sessions = {}
pending_appointments = {}  # Lưu các cuộc hẹn đang chờ xác nhận email

def generate_verification_token():
    """Tạo token xác nhận ngẫu nhiên"""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(32))

def send_verification_email(email, patient_name, date, time, verification_token):
    """Gửi email xác nhận bằng SendGrid"""
    try:
        verification_url = f"{VERIFICATION_LINK_BASE}/confirm-appointment?token={verification_token}"
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }}
                .content {{ background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .header {{ color: #1976d2; text-align: center; }}
                .button {{ display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; text-align: center; }}
                .button:hover {{ background-color: #45a049; }}
                .details {{ margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #1976d2; }}
                .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <div class="header">
                        <h1>🦷 Phòng Khám Nha Khoa An Khánh</h1>
                    </div>
                    <h2>Xác nhận lịch khám của bạn</h2>
                    <p>Chào {patient_name},</p>
                    <p>Cảm ơn bạn đã đặt lịch khám tại phòng khám nha khoa An Khánh.</p>
                    
                    <div class="details">
                        <p><strong>Thông tin lịch khám:</strong></p>
                        <p><strong>Ngày:</strong> {date}</p>
                        <p><strong>Giờ:</strong> {time}</p>
                    </div>
                    
                    <p>Để hoàn tất việc đặt lịch, vui lòng nhấp vào nút bên dưới để xác nhận email của bạn:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">Xác nhận lịch khám</a>
                    </div>
                    
                    <p>Hoặc sao chép và dán liên kết này vào trình duyệt của bạn:</p>
                    <p><a href="{verification_url}">{verification_url}</a></p>
                    
                    <p><strong>Lưu ý:</strong> Link xác nhận này có hiệu lực trong 24 giờ. Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
                    
                    <div class="footer">
                        <p>© 2025 Phòng Khám Nha Khoa An Khánh. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email=SENDGRID_FROM_EMAIL,
            to_emails=email,
            subject="[Xác nhận lịch khám] Phòng Khám Nha Khoa An Khánh",
            html_content=html_content
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        logging.info(f"✅ Email xác nhận đã được gửi tới {email}. Status: {response.status_code}")
        return True
    except Exception as e:
        logging.error(f"❌ Lỗi khi gửi email: {str(e)}")
        return False

def handle_make_appointment(req):
    parameters = req.get("queryResult", {}).get("parameters", {})
    session_id = get_session_id(req)  # Lấy session ID
    date_time = parameters.get("date", "")  # Ví dụ: "2025-07-15T12:00:00+07:00"
    hour_time = parameters.get("hour", "")  # Ví dụ: "2025-03-25T09:00:00+07:00"
    service = parameters.get("service", "")  # Ví dụ: "chung chung"

    logging.info(f"Date time: {date_time}, Hour: {hour_time}, Service: {service}")

    if not date_time or not hour_time:
        return {"fulfillmentText": "Vui lòng cung cấp đầy đủ ngày và giờ để đặt lịch hẹn."}
    if not service:
        return {"fulfillmentText": "Hiện nay phòng khám nha khoa chúng tôi cung cấp 3 dịch vụ chính là trồng răng sứ, nhổ răng và răng thẩm mỹ. Vui lòng chọn 1 trong 3 dịch vụ trên."}

    try:
        # Chuyển đổi định dạng ISO 8601 thành datetime
        date_obj = datetime.fromisoformat(date_time)
        hour_obj = datetime.fromisoformat(hour_time)

        # Lấy ngày và thứ trong tuần
        date_str = date_obj.strftime("%Y-%m-%d")  # "2025-07-15"
        hour_str = hour_obj.strftime("%H:%M")      # "09:00"
        day_of_week = convert_day_to_vietnamese(date_obj.strftime("%A"))      # "Tuesday" (Thứ trong tuần)

        # Kiểm tra giờ có nằm trong khoảng 9:00 - 17:00 không
        hour_minutes = hour_obj.hour * 60 + hour_obj.minute
        start_time = 9 * 60   # 9:00 sáng = 540 phút
        end_time = 17 * 60    # 17:00 chiều = 1020 phút

        if not (start_time <= hour_minutes <= end_time):
            return {"fulfillmentText": "Giờ đặt lịch phải từ 9:00 sáng đến 17:00 chiều. Vui lòng chọn lại giờ khác."}

        # Kiểm tra thời gian có trong tương lai không
        appointment_time_str = f"{date_str} {hour_str}"  # "2025-07-15 09:00"
        appointment_time = datetime.strptime(appointment_time_str, "%Y-%m-%d %H:%M")

        current_time = datetime.now()
        if appointment_time <= current_time:
            return {"fulfillmentText": "Ngày giờ bạn chọn đã qua hoặc không hợp lệ. Vui lòng chọn thời gian trong tương lai."}
    except ValueError as e:
        logging.error(f"Error parsing date/time: {e}")
        return {"fulfillmentText": "Định dạng ngày hoặc giờ không hợp lệ. Vui lòng thử lại."}

    # 🔥 **Kiểm tra xem khung giờ đó đã có ai đặt chưa**
    try:
        appointments_ref = db.collection("appointments")
        query = appointments_ref.where("date", "==", date_str).where("time", "==", hour_str).get()

        if query:
            return {"fulfillmentText": f"⚠️ Giờ {hour_str} ngày {date_str} đã có người đặt lịch. Vui lòng chọn khung giờ khác."}
    except Exception as e:
        logging.error(f"❌ Lỗi khi kiểm tra lịch hẹn: {e}")
        return {"fulfillmentText": "Có lỗi xảy ra khi kiểm tra lịch hẹn. Vui lòng thử lại sau."}

    # Lưu thông tin vào session
    user_sessions[session_id] = {
        "date": date_str,
        "time": hour_str,
        "day": day_of_week,  # Thêm thông tin thứ trong tuần
        "service": service,
        "patientName": None,
        "sdt": None
    }

    logging.info(f"Session data updated: {user_sessions[session_id]}")

    response = (
        f"✅ Đã đặt lịch hẹn cho bạn vào lúc {hour_str} ngày {date_str} "
        f"({day_of_week}) với dịch vụ {service}. "
        f"Vui lòng cung cấp thêm thông tin (tên, số điện thoại) để xác nhận."
    )
    
    return {"fulfillmentText": response}


def get_session_id(req):
    """Trích xuất session ID từ request"""
    session_path = req.get("session", "")
    match = re.search(r'/sessions/(.+)', session_path)
    return match.group(1) if match else "default_session"

@app.route('/webhook', methods=['POST'])
def webhook():
    # Nhận dữ liệu từ Dialogflow
    req = request.get_json(silent=True, force=True)
    intent = req.get('queryResult', {}).get('intent', {}).get('displayName', '')
    question = req.get('queryResult', {}).get('queryText', '')
    parameters = req.get('queryResult', {}).get('parameters', {})
    session_id = get_session_id(req)  # Lấy session ID

    logger.info(f"Received intent: {intent}, Question: {question}")
    # Xử lý intent
    if intent == "dental_info":  # Intent hỏi thông tin nha khoa
        # Gọi Deepseek API để trả lời
        answer = get_answer_from_deepseek(question)
        response = {"fulfillmentText": answer}
    elif intent == "ask_weather":  # Intent hỏi thời tiết
        location = parameters.get('locate', '')  # Lấy tham số 'locate' từ Dialogflow
        weather_response = get_weather(location)
        response = {"fulfillmentText": weather_response}
    elif intent == "make_appointment":
        response = handle_make_appointment(req)
    else:
        response = handle_intent(intent, parameters, question, session_id)

    return jsonify(response)

def handle_intent(intent, parameters, user_message, session_id):
    """Xử lý intent và lưu trạng thái theo session_id"""
    
    # Khởi tạo session nếu chưa có
    # if session_id not in user_sessions:
    #     user_sessions[session_id] = {'patientName': None, 'sdt': None, 'note': []}

    user_data = user_sessions[session_id]
    logging.info(f"Current session data: {user_data}")

    if intent == "ask_personal_info":
        name_data = parameters.get('name', '')  
        sdt = parameters.get('sdt', '')

        # Kiểm tra nếu name là dictionary, lấy giá trị bên trong
        name = name_data.get('name', '') if isinstance(name_data, dict) else name_data  

        if not name:
            return {"fulfillmentText": "Bạn vui lòng cho tôi biết tên của bạn là gì?"}
        if not sdt:
            return {"fulfillmentText": "Bạn vui lòng cung cấp số điện thoại của bạn?"}

        # Kiểm tra xem session_id đã tồn tại trong user_sessions chưa
        if session_id not in user_sessions:
            return {"fulfillmentText": "Lỗi: Chưa có thông tin về ngày, giờ và dịch vụ!"}

        # Cập nhật thông tin người dùng vào session
        user_sessions[session_id]["patientName"] = name
        user_sessions[session_id]["sdt"] = sdt

        # Lấy toàn bộ thông tin đã có
        user_info = user_sessions[session_id]

        logging.info(f"✅ Dữ liệu đầy đủ, chuẩn bị lưu vào database: {user_info}")

        # Lưu vào database
        save_user_to_db(session_id, user_info)

        return {
            "fulfillmentText": "Cảm ơn bạn! Tất cả thông tin đã được lưu. Bạn sẽ nhận được xác nhận lịch hẹn sớm!"
        }

    return {"fulfillmentText": "Tôi không hiểu yêu cầu của bạn."}

import firebase_admin
from firebase_admin import credentials, firestore

# Kết nối Firebase với serviceAccount.json
cred = credentials.Certificate("./serviceAccount.json")  # Đảm bảo file nằm trong thư mục dự án
firebase_admin.initialize_app(cred)

db = firestore.client()  # Kết nối Firestore

def save_user_to_db(session_id, user_data):
    """Cập nhật thông tin đặt lịch vào Firestore nếu tài liệu đã tồn tại"""
    try:
        doc_ref = db.collection("appointments").document(session_id)
        if doc_ref.get().exists:  # Kiểm tra xem tài liệu đã tồn tại chưa
            doc_ref.update(user_data)
            logging.info(f"✅ Dữ liệu đã được cập nhật vào Firestore: {user_data}")
        else:
            logging.warning(f"⚠️ Tài liệu không tồn tại, tạo mới với session_id: {session_id}")
            doc_ref.set(user_data)  # Nếu không tồn tại, tạo mới tài liệu
    except Exception as e:
        logging.error(f"❌ Lỗi khi lưu dữ liệu vào Firestore: {e}")

@app.route('/send-verification-email', methods=['POST'])
def send_verification_email_route():
    """Endpoint để gửi email xác nhận khi bệnh nhân đặt lịch"""
    try:
        data = request.get_json()
        
        patient_name = data.get('patientName', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        date = data.get('date', '').strip()
        time = data.get('time', '').strip()
        day = data.get('day', '').strip()
        service = data.get('service', '').strip()
        note = data.get('note', '').strip()
        
        # Validate dữ liệu
        if not all([patient_name, email, phone, date, time, service]):
            return jsonify({
                "status": "error",
                "message": "Thiếu thông tin bắt buộc"
            }), 400
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({
                "status": "error",
                "message": "Email không hợp lệ"
            }), 400
        
        # Tạo token xác nhận
        verification_token = generate_verification_token()
        
        # Lưu thông tin đơn hàng đang chờ xác nhận
        appointment_data = {
            "patientName": patient_name,
            "email": email,
            "phone": phone,
            "date": date,
            "time": time,
            "day": day,
            "service": service,
            "note": note,
            "verified": False,
            "createdAt": datetime.now().isoformat(),
            "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat()
        }
        
        pending_appointments[verification_token] = appointment_data
        
        # Gửi email xác nhận
        email_sent = send_verification_email(email, patient_name, date, time, verification_token)
        
        if email_sent:
            return jsonify({
                "status": "success",
                "message": "Email xác nhận đã được gửi thành công"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Không thể gửi email, vui lòng thử lại"
            }), 500
            
    except Exception as e:
        logging.error(f"❌ Lỗi trong send_verification_email_route: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Lỗi server: {str(e)}"
        }), 500

@app.route('/confirm-appointment', methods=['GET'])
def confirm_appointment():
    """Endpoint để xác nhận lịch hẹn từ link trong email"""
    try:
        token = request.args.get('token')
        
        if not token or token not in pending_appointments:
            return """
            <html>
            <head><title>Lỗi</title>
            <style>body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }</style>
            </head>
            <body>
            <h1>❌ Token không hợp lệ hoặc đã hết hạn</h1>
            <p>Vui lòng kiểm tra lại link xác nhận trong email.</p>
            </body>
            </html>
            """, 400
        
        appointment_data = pending_appointments[token]
        
        # Kiểm tra xem token có hết hạn chưa
        expires_at = datetime.fromisoformat(appointment_data['expiresAt'])
        if datetime.now() > expires_at:
            del pending_appointments[token]
            return """
            <html>
            <head><title>Lỗi</title>
            <style>body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }</style>
            </head>
            <body>
            <h1>❌ Link xác nhận đã hết hạn</h1>
            <p>Link xác nhận có hiệu lực trong 24 giờ. Vui lòng đặt lịch lại.</p>
            </body>
            </html>
            """, 400
        
        # Lưu vào Firestore
        appointment_data['verified'] = True
        appointment_data['verifiedAt'] = datetime.now().isoformat()
        
        try:
            db.collection("appointments").document(token).set(appointment_data)
            logging.info(f"✅ Lịch hẹn đã được xác nhận cho {appointment_data['email']}")
        except Exception as e:
            logging.error(f"❌ Lỗi khi lưu vào Firestore: {str(e)}")
        
        # Xóa khỏi danh sách chờ xác nhận
        del pending_appointments[token]
        
        # Trả về trang thành công
        return f"""
        <html>
        <head>
            <title>Xác nhận thành công</title>
            <style>
                body {{ font-family: Arial, sans-serif; text-align: center; margin: 50px; }}
                .success {{ color: #4CAF50; }}
                .button {{ display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <h1 class="success">✅ Xác nhận thành công!</h1>
            <p><strong>Bệnh nhân:</strong> {appointment_data['patientName']}</p>
            <p><strong>Ngày khám:</strong> {appointment_data['date']} ({appointment_data['day']})</p>
            <p><strong>Giờ khám:</strong> {appointment_data['time']}</p>
            <p><strong>Dịch vụ:</strong> {appointment_data['service']}</p>
            <p><strong>Email:</strong> {appointment_data['email']}</p>
            <p style="margin-top: 20px; color: #666;">Lịch hẹn của bạn đã được xác nhận. Phòng khám sẽ liên hệ với bạn để xác nhận chi tiết. Cảm ơn bạn!</p>
            <a href="/" class="button">Quay lại trang chủ</a>
        </body>
        </html>
        """, 200
        
    except Exception as e:
        logging.error(f"❌ Lỗi trong confirm_appointment: {str(e)}")
        return """
        <html>
        <head><title>Lỗi</title>
        <style>body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }</style>
        </head>
        <body>
        <h1>❌ Có lỗi xảy ra</h1>
        <p>Vui lòng liên hệ với phòng khám để hỗ trợ.</p>
        </body>
        </html>
        """, 500

# ====================== GOOGLE OAUTH ROUTES ======================

@app.route('/auth/google')
def google_auth():
    """Bắt đầu flow OAuth2. Redirect user tới Google Consent Screen."""
    doctor_id = request.args.get('doctorId')
    if not doctor_id:
        return "Thiếu parameter doctorId", 400
    
    # State parameter dùng để truyền doctorId qua callback
    redirect_uri = f"{BASE_URL}/oauth2callback"
    try:
        auth_url = get_auth_url(redirect_uri, state=doctor_id)
        return redirect(auth_url)
    except FileNotFoundError as e:
        return f"Lỗi cấu hình server: {str(e)}", 500

@app.route('/oauth2callback')
def oauth2callback():
    """Xử lý callback từ Google. Lưu token vào Firestore."""
    code = request.args.get('code')
    doctor_id = request.args.get('state') # Lấy lại doctorId từ state
    
    if not code or not doctor_id:
        return "Thiếu code hoặc doctorId trong callback", 400

    redirect_uri = f"{BASE_URL}/oauth2callback"
    
    try:
        credentials = exchange_code_for_credentials(code, redirect_uri)
        token_dict = credentials_to_dict(credentials)
        
        # Lưu token vào Firestore của bác sĩ
        db.collection("doctors").document(doctor_id).update({
            "google_token": token_dict,
            "google_calendar_linked": True,
            "google_calendar_linked_at": datetime.now().isoformat()
        })
        
        return """
        <html>
        <head><title>Kết nối thành công</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h1 style="color: #4CAF50;">✅ Kết nối Google Calendar thành công!</h1>
            <p>Bạn có thể đóng cửa sổ này và quay lại ứng dụng.</p>
            <script>setTimeout(function(){ window.close(); }, 3000);</script>
        </body>
        </html>
        """
    except Exception as e:
        logging.error(f"❌ OAuth Error: {str(e)}")
        return f"Lỗi kết nối: {str(e)}", 500


@app.route('/assign-doctor', methods=['POST'])
def assign_doctor():
    """
    Endpoint để admin gán bác sĩ cho lịch hẹn.
    """
    try:
        data = request.get_json()
        appointment_id = data.get('appointmentId')
        doctor_id = data.get('doctorId')

        if not appointment_id or not doctor_id:
            return jsonify({"status": "error", "message": "Thiếu appointmentId hoặc doctorId"}), 400

        # 1. Lấy thông tin cuộc hẹn
        doc_ref = db.collection("appointments").document(appointment_id)
        doc_snapshot = doc_ref.get()

        if not doc_snapshot.exists:
            return jsonify({"status": "error", "message": "Không tìm thấy cuộc hẹn"}), 404

        appointment_data = doc_snapshot.to_dict()

        # Check if doctor is already assigned
        old_doctor_id = appointment_data.get('doctorID')
        if old_doctor_id == doctor_id:
            return jsonify({
                "status": "success", 
                "message": "Bác sĩ này đang đảm nhận cuộc hẹn này rồi."
            }), 200

        # Check for previous doctor and remove event
        google_event_id = appointment_data.get('googleEventId')

        if old_doctor_id and old_doctor_id != doctor_id and google_event_id:
            logging.info(f"🔄 Re-assigning from doctor {old_doctor_id} to {doctor_id}. Removing old calendar event...")
            try:
                old_doctor_ref = db.collection("doctors").document(old_doctor_id)
                old_doctor_snap = old_doctor_ref.get()
                if old_doctor_snap.exists:
                    old_token = old_doctor_snap.to_dict().get('google_token')
                    if old_token:
                        logging.info(f"Calling delete_calendar_event for event {google_event_id}")
                        result = delete_calendar_event(google_event_id, old_token)
                        logging.info(f"delete_calendar_event result: {result}")
                    else:
                        logging.warning(f"Old doctor {old_doctor_id} has no google_token. Cannot delete event.")
                else:
                    logging.warning(f"Old doctor {old_doctor_id} not found in DB.")
            except Exception as e:
                logging.error(f"⚠️ Failed to remove event from old doctor's calendar: {e}")

        # 2. Cập nhật doctorID vào Firestore
        doc_ref.update({"doctorID": doctor_id})
        logging.info(f"✅ Đã gán bác sĩ {doctor_id} cho cuộc hẹn {appointment_id}")

        # 3. Lấy Google Token của bác sĩ
        doctor_ref = db.collection("doctors").document(doctor_id)
        doctor_snapshot = doctor_ref.get()
        token_info = None
        
        if doctor_snapshot.exists:
            doctor_data = doctor_snapshot.to_dict()
            token_info = doctor_data.get('google_token')
        
        message = "Đã gán bác sĩ thành công."
        calendar_link = None
        
        if token_info:
            # 4. Tạo sự kiện Google Calendar
            event_result = create_calendar_event(appointment_data, token_info)
            
            if event_result:
                calendar_link = event_result.get('link')
                doc_ref.update({"googleEventId": event_result.get('id')})
                message += " Đã tạo lịch trên Google Calendar."
            else:
                message += " Tuy nhiên, không thể tạo lịch trên Google Calendar (Token có thể hết hạn hoặc lỗi)."
        else:
            message += " Bác sĩ chưa liên kết Google Calendar."

        return jsonify({
            "status": "success",
            "message": message,
            "calendarLink": calendar_link
        }), 200

    except Exception as e:
        logging.error(f"❌ Lỗi trong assign_doctor: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/doctor/sync-calendar', methods=['POST'])
def sync_doctor_calendar():
    """
    Endpoint cho Bác sĩ tự đồng bộ lịch.
    """
    try:
        data = request.get_json()
        doctor_id = data.get('doctorId')
        logging.info(f"🔄 Bắt đầu đồng bộ lịch cho bác sĩ: {doctor_id}")

        if not doctor_id:
            return jsonify({"status": "error", "message": "Thiếu doctorId"}), 400

        # 1. Lấy Token
        doctor_ref = db.collection("doctors").document(doctor_id)
        doctor_snap = doctor_ref.get()
        if not doctor_snap.exists:
             return jsonify({"status": "error", "message": "Không tìm thấy bác sĩ"}), 404
        
        token_info = doctor_snap.to_dict().get('google_token')
        if not token_info:
            logging.warning(f"⚠️ Bác sĩ {doctor_id} chưa có token.")
            return jsonify({"status": "error", "message": "Bạn chưa liên kết Google Calendar. Vui lòng vào Cài đặt để liên kết."}), 400

        # 2. Lấy các cuộc hẹn
        appointments_ref = db.collection("appointments")
        query = appointments_ref.where("doctorID", "==", doctor_id).stream()
        
        count = 0
        errors = 0
        skipped_date = 0
        skipped_exists = 0
        
        current_date_str = datetime.now().strftime("%Y-%m-%d")
        logging.info(f"📅 Ngày hiện tại: {current_date_str}")

        for doc in query:
            appt_data = doc.to_dict()
            appt_id = doc.id
            appt_date = appt_data.get('date')
            
            # Chỉ xử lý các cuộc hẹn từ hôm nay trở đi
            if appt_date < current_date_str:
                skipped_date += 1
                continue

            # Nếu đã có googleEventId thì bỏ qua (tránh trùng)
            if appt_data.get('googleEventId'):
                skipped_exists += 1
                continue

            logging.info(f"⚡ Đang đồng bộ cuộc hẹn: {appt_id} - {appt_date} {appt_data.get('time')}")
            
            # Tạo sự kiện
            event_result = create_calendar_event(appt_data, token_info)
            
            if event_result:
                db.collection("appointments").document(appt_id).update({
                    "googleEventId": event_result.get('id')
                })
                count += 1
                logging.info(f"✅ Đồng bộ thành công: {appt_id}")
            else:
                errors += 1
                logging.error(f"❌ Đồng bộ thất bại: {appt_id}")

        logging.info(f"🏁 Kết quả đồng bộ: Thành công={count}, Lỗi={errors}, Bỏ qua (Qúa khứ)={skipped_date}, Bỏ qua (Đã có)={skipped_exists}")

        return jsonify({
            "status": "success",
            "message": f"Đã đồng bộ thành công {count} lịch hẹn. Lỗi: {errors}. (Bỏ qua {skipped_date + skipped_exists} lịch cũ/trùng)",
            "syncedCount": count,
            "details": {
                "success": count,
                "errors": errors,
                "skipped_past": skipped_date,
                "skipped_exists": skipped_exists
            }
        }), 200

    except Exception as e:
        logging.error(f"❌ Lỗi trong sync_doctor_calendar: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)