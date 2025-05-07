from app import app, db
from models import Exercises

def list_all_exercises():
    with app.app_context():
        exercises = Exercises.query.all()
        print("All exercises in the database:")
        for exercise in exercises:
            print(f"ID: {exercise.id}, Name: {exercise.name}, Muscles: {exercise.muscles_involved}")

if __name__ == "__main__":
    list_all_exercises() 