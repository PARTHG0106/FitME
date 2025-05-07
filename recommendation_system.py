from models import UserExercise, Exercises, db
from datetime import datetime, timedelta
import numpy as np
from sqlalchemy import func

class WorkoutRecommender:
    def __init__(self, user_id):
        self.user_id = user_id
        self.muscle_groups = {
            'chest': ['push-ups', 'bench press'],
            'back': ['deadlift', 'pull-ups'],
            'legs': ['barbell squats', 'lunges'],
            'shoulders': ['shoulder press', 'lateral raises'],
            'arms': ['bicep curls', 'tricep extensions']
        }
    
    def get_user_history(self, days=30):
        """Get user's exercise history for the last N days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        history = UserExercise.query.filter(
            UserExercise.user_id == self.user_id,
            UserExercise.date >= cutoff_date
        ).all()
        return history
    
    def analyze_muscle_balance(self):
        """Analyze which muscle groups need more attention"""
        history = self.get_user_history()
        print(f"[DEBUG] All UserExercise.exercise_id for user {self.user_id}: {[w.exercise_id for w in history]}")
        all_exercises = Exercises.query.all()
        print(f"[DEBUG] All Exercises in DB: {[{'id': e.id, 'name': e.name} for e in all_exercises]}")
        muscle_workouts = {group: 0 for group in self.muscle_groups.keys()}
        total_workouts = 0
        for workout in history:
            exercise = Exercises.query.get(workout.exercise_id)
            if not exercise:
                continue  # Skip if the exercise does not exist
            print(f"[DEBUG] Found exercise in history: id={workout.exercise_id}, name='{exercise.name}'")
            found = False
            for muscle, exercises in self.muscle_groups.items():
                if exercise.name.lower() in [e.lower() for e in exercises]:
                    muscle_workouts[muscle] += 1
                    found = True
            if found:
                total_workouts += 1
        print(f"[DEBUG] muscle_workouts: {muscle_workouts}")
        print(f"[DEBUG] total_workouts: {total_workouts}")
        # Avoid division by zero
        if total_workouts == 0:
            print(f"[DEBUG] Returning all zeros for muscle balance")
            return {muscle: {'percent': 0.0, 'count': 0} for muscle in self.muscle_groups.keys()}
        result = {muscle: {'percent': (count / total_workouts) * 100, 'count': count} for muscle, count in muscle_workouts.items()}
        print(f"[DEBUG] muscle_balance result: {result}")
        return result
    
    def get_recommendations(self):
        """Generate personalized workout recommendations"""
        muscle_balance = self.analyze_muscle_balance()
        # Find the most neglected muscle groups
        min_ratio = min([v['percent'] for v in muscle_balance.values()])
        neglected_muscles = [muscle for muscle, v in muscle_balance.items() 
                           if v['percent'] <= min_ratio * 1.2]  # 20% tolerance
        recommendations = []
        for muscle in neglected_muscles:
            exercises = self.muscle_groups[muscle]
            recommendations.extend(exercises)
        return {
            'focus_areas': neglected_muscles,
            'recommended_exercises': recommendations,
            'muscle_balance': muscle_balance
        }
    
    def get_progression_recommendation(self, exercise_id):
        """Suggest progression based on past performance"""
        exercise_history = UserExercise.query.filter(
            UserExercise.user_id == self.user_id,
            UserExercise.exercise_id == exercise_id
        ).order_by(UserExercise.date.desc()).limit(5).all()
        
        if not exercise_history:
            return None
        
        # Calculate average ROM score and reps
        rom_scores = [record.rom_score for record in exercise_history]
        reps = [record.total_reps for record in exercise_history]
        
        avg_rom = np.mean(rom_scores)
        avg_reps = np.mean(reps)
        
        # Progression logic based on ROM score and reps
        if avg_rom >= 0.8 and avg_reps >= 12:  # Good form and high reps
            return {
                'suggestion': 'Increase difficulty',
                'current_avg_rom': round(avg_rom * 100, 1),
                'current_avg_reps': round(avg_reps, 1),
                'recommendation': 'Try increasing reps or adding resistance'
            }
        elif avg_rom < 0.6 or avg_reps <= 8:  # Poor form or low reps
            return {
                'suggestion': 'Maintain or decrease difficulty',
                'current_avg_rom': round(avg_rom * 100, 1),
                'current_avg_reps': round(avg_reps, 1),
                'recommendation': 'Focus on form and consistency'
            }
        else:
            return {
                'suggestion': 'Maintain current level',
                'current_avg_rom': round(avg_rom * 100, 1),
                'current_avg_reps': round(avg_reps, 1),
                'recommendation': 'Keep working at this level'
            } 