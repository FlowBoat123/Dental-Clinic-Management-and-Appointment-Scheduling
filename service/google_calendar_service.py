import os
import logging
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Configuration
CLIENT_SECRETS_FILE = "client_secret.json"
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

def get_flow(redirect_uri):
    """Creates a Flow instance."""
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise FileNotFoundError(f"❌ '{CLIENT_SECRETS_FILE}' not found. Please download it from Google Cloud Console.")
    
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    return flow

def get_auth_url(redirect_uri, state=None):
    """Generates the authorization URL."""
    flow = get_flow(redirect_uri)
    authorization_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        state=state,
        prompt='consent' # Force consent to ensure we get a refresh token
    )
    return authorization_url

def exchange_code_for_credentials(code, redirect_uri):
    """Exchanges the auth code for credentials."""
    flow = get_flow(redirect_uri)
    flow.fetch_token(code=code)
    return flow.credentials

def credentials_to_dict(credentials):
    """Converts credentials object to a dictionary for storage."""
    return {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

def get_calendar_service(token_info):
    """Builds the Calendar service from stored token info."""
    try:
        creds = Credentials(**token_info)
        service = build('calendar', 'v3', credentials=creds)
        return service
    except Exception as e:
        logging.error(f"❌ Error building Calendar service: {str(e)}")
        return None

def create_calendar_event(appointment_data, token_info):
    """
    Creates an event in Google Calendar using the doctor's credentials.
    
    Args:
        appointment_data (dict): Appointment details.
        token_info (dict): The stored OAuth2 token dictionary for the doctor.
    
    Returns:
        dict: { "id": event_id, "link": html_link } or None
    """
    service = get_calendar_service(token_info)
    if not service:
        return None

    try:
        # Parse date and time
        start_str = f"{appointment_data['date']} {appointment_data['time']}"
        start_dt = datetime.strptime(start_str, "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)

        event = {
            'summary': f"Khám nha khoa: {appointment_data['patientName']}",
            'location': 'Phòng Khám Nha Khoa An Khánh',
            'description': (
                f"Dịch vụ: {appointment_data['service']}\n"
                f"SĐT: {appointment_data.get('phone', 'N/A')}\n"
                f"Email: {appointment_data.get('email', 'N/A')}\n"
                f"Ghi chú: {appointment_data.get('note', '')}"
            ),
            'start': {
                'dateTime': start_dt.isoformat(),
                'timeZone': 'Asia/Ho_Chi_Minh',
            },
            'end': {
                'dateTime': end_dt.isoformat(),
                'timeZone': 'Asia/Ho_Chi_Minh',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 30},
                ],
            },
        }

        # 'primary' refers to the calendar of the authenticated user (the doctor)
        event_result = service.events().insert(calendarId='primary', body=event).execute()
        
        logging.info(f"✅ Google Calendar event created: {event_result.get('htmlLink')}")
        return {
            "id": event_result.get('id'),
            "link": event_result.get('htmlLink')
        }

    except Exception as e:
        logging.error(f"❌ Error creating Google Calendar event: {str(e)}")
        return None