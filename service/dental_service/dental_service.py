import csv
import logging

def import_services_from_csv(db, csv_path):
    """
    Reads services from a CSV file and imports them into Firestore 'services' collection.
    """
    try:
        logging.info(f"Starting import from {csv_path}")
        batch = db.batch()
        count = 0
        
        with open(csv_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Map CSV columns to Firestore fields
                # CSV: STT,Tên dịch vụ,Đơn vị,Đơn giá (VND)
                # Firestore: id, name, unit, price
                
                try:
                    service_id = row['STT']
                    name = row['Tên dịch vụ']
                    unit = row['Đơn vị']
                    price_str = row['Đơn giá (VND)'].replace(',', '')
                    price = int(price_str)
                    
                    doc_ref = db.collection('services').document(service_id)
                    batch.set(doc_ref, {
                        'id': service_id,
                        'name': name,
                        'unit': unit,
                        'price': price
                    })
                    count += 1
                except ValueError as e:
                    logging.error(f"Error parsing row {row}: {e}")
                    continue

        batch.commit()
        logging.info(f"Successfully imported {count} services.")
        return count
    except Exception as e:
        logging.error(f"Failed to import services: {e}")
        return 0

def get_services(db):
    """
    Fetches all services from Firestore 'services' collection.
    Returns a list of dictionaries.
    """
    try:
        services_ref = db.collection('services')
        docs = services_ref.stream()
        services = []
        for doc in docs:
            services.append(doc.to_dict())
        
        # Sort by ID numerically if possible
        try:
            services.sort(key=lambda x: int(x.get('id', 0)))
        except ValueError:
            pass # Keep default order if id is not int
            
        return services
    except Exception as e:
        logging.error(f"Error fetching services: {e}")
        return []
