import google.auth
from google.cloud import firestore

def main():
    try:
        credentials, project = google.auth.default()
        print(f"Using project: {project}")
        db = firestore.Client(project="ecotrace-app-123", credentials=credentials)

        factors = {
            "transport": {
                "car_gasoline": 0.192,
                "car_ev": 0.05,
                "bus": 0.082,
                "train": 0.041,
                "bicycle": 0.0,
                "walking": 0.0
            },
            "diet": {
                "vegan": 2.5,
                "vegetarian": 3.2,
                "pescatarian": 3.9,
                "meat_average": 5.6,
                "meat_heavy": 7.2
            },
            "energy": {
                "electricity_kwh": 0.385,
                "natural_gas_kwh": 0.203
            },
            "flights": {
                "short_haul": 250,
                "long_haul": 800
            }
        }

        doc_ref = db.collection("emissionFactors").document("v1")
        doc_ref.set(factors)
        print("Seeded emissionFactors/v1 successfully.")
    except Exception as e:
        print(f"Error seeding data: {e}")

if __name__ == "__main__":
    main()
