from app import app, db
from models import Exercises

def update_exercise_names():
    with app.app_context():
        # Map of old exercise names to new ones
        exercise_updates = {
            'Russian Twists': 'Russian Twist',
            'Push-ups': 'Push Up',
            'Pull-ups': 'Pull Up',
            'Lateral Raises': 'Lateral Raise'
        }
        
        for old_name, new_name in exercise_updates.items():
            exercise = Exercises.query.filter_by(name=old_name).first()
            if exercise:
                print(f"Updating '{old_name}' to '{new_name}'")
                exercise.name = new_name
                db.session.commit()
            else:
                print(f"Exercise '{old_name}' not found in the database")

if __name__ == "__main__":
    update_exercise_names() 