from flask import Flask, flash, render_template, redirect, request, url_for, jsonify, session, Response, send_file, make_response
from forms import LoginForm, SearchForm, RegistrationForm
from flask_migrate import Migrate
from config import Config
from models import User, db, bcrypt, Exercises, UserExercise, ExerciseUpload, WorkoutSchedule, ScheduleCompletion
from shoulder_press import gen_frames as gen_frames_shoulder_press, analyze_shoulder_press_video
from bicep_curls import gen_frames as gen_frames_bicep_curls, analyze_bicep_curls_video
from barbell_squats import gen_frames as gen_frames_barbell_squats, analyze_squat_video
from deadlift import gen_frames as gen_frames_deadlift, analyze_deadlift_video
from lateral_raises import gen_frames as gen_frames_lateral_raises, analyze_lateral_raise_video
import pandas as pd
from dash import Dash, html, dcc, Input, Output
import plotly.graph_objects as go
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc
from datetime import datetime, timedelta
from sqlalchemy import func
from functools import wraps
import os
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import mediapipe as mp
import time
from recommendation_system import WorkoutRecommender
from flask_cors import CORS
import sys
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "https://*.ngrok.io", "https://*.ngrok-free.app"], supports_credentials=True)
app.config.from_object(Config)
db.init_app(app)
bcrypt.init_app(app)
migrate = Migrate(app, db)
quartz = dbc.themes.SKETCHY

# Configure upload folder
UPLOAD_FOLDER = 'uploads/exercises'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Decorator to ensure user is logged in before accessing certain routes
def login_required(f):
    @wraps(f)
    def chck(*args, **kwargs):
        if 'user_id' not in session:
            flash("You need to log in first.", "danger")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return chck

# Dash application for interactive data visualisation
dash_app = Dash(__name__, server=app, external_stylesheets=[quartz], url_base_pathname='/dashboard/')

# Set up layout for the Dash application,
dash_app.layout = dbc.Container([
    dbc.Row(
        dbc.Col(
            html.A("Go Back", href="/mainboard", className="btn btn-lg text-center text-white", style={
                "background-color": "#98ff98",  # Green mint
                "border-radius": "10px",
                "padding": "10px 20px",
                "display": "block",
                "margin": "0 auto",
                "text-decoration": "none",
                "font-size": "24px",
                "width": "200px",
                "box-shadow": "2px 2px 5px rgba(0, 0, 0, 0.3)"
            }),
            width=12
        )
    ),
    dcc.Tabs(id="tabs-example", value='tab-1', children=[
        dcc.Tab(label='Last Workout', value='tab-1'),
        dcc.Tab(label='Progress', value='tab-2'),
    ]),
    html.Div(id='tabs-content')
])

# Callback to dynamically update content based on selected tabs
@dash_app.callback(
    Output('tabs-content', 'children'),
    Input('tabs-example', 'value')
)
def render_content(tab):
    if tab == 'tab-1':
        return dbc.Container([
            dbc.Row([
                dbc.Col(
                    dcc.Dropdown(
                        id='exercise-dropdown',
                        options=[
                            {'label': 'Shoulder Press', 'value': 1},#edit
                            {'label': 'Bicep Curl', 'value': 2},
                            {'label': 'Barbell Squats', 'value': 3},
                            {'label': 'Deadlift', 'value': 4},
                            {'label': 'Lateral Raises', 'value': 5}

                        ],
                        value=1,
                        className='mx-auto',
                        style={'width': '50%'}
                    ),
                    width=6
                )
            ], justify="center"),
            html.Div(id='exercise-output', className="mt-4")
        ])
    elif tab == 'tab-2':
        return dbc.Container([
            dbc.Row(
                dbc.Col(html.H3("Overall Progress", className="text-center my-4"), width=12)
            ),
            dbc.Row([
                dbc.Col(
                    dcc.Graph(id='overall-progress-graph'),
                    width=12
                )
            ]),
            dbc.Row([
                dbc.Col(
                    dcc.Dropdown(
                        id='specific-exercise-dropdown',
                        options=[
                            {'label': 'Shoulder Press', 'value': 1},
                            {'label': 'Bicep Curl', 'value': 2},
                            {'label': 'Barbell Squats', 'value': 3},
                            {'label': 'Deadlift', 'value': 4},
                            {'label': 'Lateral Raises', 'value': 5}
                        ],
                        value=1,
                        className='mx-auto',
                        style={'width': '50%'}
                    ),
                    width=6
                )
            ], justify="center", className="mt-4"),
            dbc.Row([
                dbc.Col(
                    dcc.Graph(id='specific-exercise-progress-graph'),
                    width=12
                )
            ]),
            dbc.Row([
                dbc.Col(
                    dcc.Graph(id='muscles-hit-graph'),  # Later
                    width=12
                )
            ])
        ])


# Callback for the Last Workout Tab
@dash_app.callback(
    Output('exercise-output', 'children'),
    Input('exercise-dropdown', 'value')
)
def update_last_workout(exercise_id):
    last_workout = UserExercise.query.filter_by(user_id=session['user_id'], exercise_id=exercise_id).order_by(
        UserExercise.date.desc()).first()

    if last_workout:
        workout_data = {
            'Date': last_workout.date.strftime("%Y-%m-%d %H:%M:%S"),
            'ROM Score': last_workout.rom_score,
            'TUT Score': round(last_workout.tut_score / last_workout.total_reps, 1),
            'Total Reps': last_workout.total_reps,
            'rom_score': last_workout.rom_score,
            'Count': last_workout.count
        }

        pie_chart = go.Figure(data=[go.Pie(labels=['Efficient Reps', 'Missed Reps'],
                                           values=[workout_data['Total Reps'],
                                                   workout_data['Total Reps'] - workout_data['rom_score']])])
        pie_chart.update_layout(
            title={
                'text': 'Efficiency in Last Workout',
                'font': {
                    'color': 'black'
                }
            },
            legend={
                'font': {
                    'color': 'black'
                }
            },
            paper_bgcolor='rgba(0,0,0,0)'
        )

        return html.Div([
            html.H4(f"Last Workout: {workout_data['Date']}"),
            html.P(f"ROM Score: {workout_data['ROM Score']}"),
            html.P(f"TUT: {workout_data['TUT Score']} sec per rep"),
            html.P(f"Total Reps: {workout_data['Total Reps']}"),
            dcc.Graph(figure=pie_chart)
        ])
    else:
        return html.P("No workout data available.")


# Callback to the Progress Tab
@dash_app.callback(
    [Output('overall-progress-graph', 'figure'),
     Output('specific-exercise-progress-graph', 'figure'),
     Output('muscles-hit-graph', 'figure')],
    [Input('tabs-example', 'value'),
     Input('specific-exercise-dropdown', 'value')]
)
def update_progress(tab, exercise_id):
    if tab != 'tab-2':
        raise PreventUpdate

    # Overall Progress DataFrame
    overall_data = UserExercise.query.filter_by(user_id=session['user_id']).all()
    overall_df = pd.DataFrame([{
        'date': record.date,
        'rom_score': record.rom_score,
        'tut_score': record.tut_score,
        'rep_number': record.total_reps,
        'count': record.count,
    } for record in overall_data])

    if overall_df.empty:
        return go.Figure(), go.Figure(), go.Figure()

    overall_df['week'] = overall_df['date'].dt.strftime('%Y-%U')
    overall_df['efficiency'] = (overall_df['count'] / overall_df['rep_number']) * 100
    weekly_efficiency_df = overall_df.groupby('week').agg({'efficiency': 'mean'}).reset_index()
    weekly_efficiency_df['wow_improvement'] = weekly_efficiency_df['efficiency'].pct_change() * 100
    wow = f'{weekly_efficiency_df["wow_improvement"].iloc[-1]:.2f}% better than prev. week ⬆️'

    overall_df = overall_df.groupby('date').agg({
        'rom_score': 'mean',
        'tut_score': 'mean',
        'rep_number': 'sum',
        'count': 'sum'
    }).reset_index()

    overall_line_chart = go.Figure()
    overall_line_chart.add_trace(go.Scatter(x=overall_df['date'], y=overall_df['count'],
                                            mode='lines+markers', name='Efficient Reps'))
    overall_line_chart.add_trace(go.Scatter(x=overall_df['date'], y=overall_df['rep_number'],
                                            mode='lines+markers', name='Total Reps'))
    overall_line_chart.add_annotation(
        text=f"WoW Improvement: {wow}",
        xref="paper", yref="paper",
        x=0.5, y=1.1,
        showarrow=False,
        font=dict(
            size=14,
            color="black"
        ),
        align="center",
        bgcolor="white",
        opacity=0.8
    )
    overall_line_chart.update_layout(title='Overall Week-Over-Week Progress',
                                     xaxis_title='Date', yaxis_title='Efficiency')


    specific_data = UserExercise.query.filter_by(exercise_id=exercise_id, user_id=session['user_id']).all()
    specific_df = pd.DataFrame([{
        'date': record.date,
        'rom_score': record.rom_score,
        'tut_score': record.tut_score,
        'rep_number': record.total_reps,
        'count': record.count,
    } for record in specific_data])

    specific_line_chart = go.Figure()
    if not specific_df.empty:
        specific_df = specific_df.groupby('date').agg({
            'rom_score': 'mean',
            'tut_score': 'mean',
            'rep_number': 'sum',
            'count': 'sum'
        }).reset_index()

        specific_line_chart.add_trace(go.Scatter(x=specific_df['date'], y=specific_df['count'],
                                                 mode='lines+markers', name='Efficient Reps'))
        specific_line_chart.add_trace(go.Scatter(x=specific_df['date'], y=specific_df['rep_number'],
                                                 mode='lines+markers', name='Total Reps'))
        specific_line_chart.update_layout(title='Specific Exercise Progress',
                                          xaxis_title='Date', yaxis_title='Efficiency')


    muscle_data = db.session.query(Exercises.muscles_involved, db.func.sum(UserExercise.total_reps)).join(
        UserExercise, Exercises.id == UserExercise.exercise_id).filter(UserExercise.user_id == session['user_id']).group_by(
        Exercises.muscles_involved).all()

    muscle_df = pd.DataFrame(muscle_data, columns=['Muscles Involved', 'Total Reps'])
    muscle_dict = {}

    for muscles, reps in zip(muscle_df['Muscles Involved'], muscle_df['Total Reps']):

        muscle_list = muscles.split(',')

        for muscle in muscle_list:
            muscle = muscle.strip()
            if muscle in muscle_dict:
                muscle_dict[muscle] += reps
            else:
                muscle_dict[muscle] = reps

    muscle_ind_df = pd.DataFrame(list(muscle_dict.items()), columns=['muscle', 'Total Reps'] )
    muscle_ind_df = muscle_ind_df.sort_values(by='Total Reps', ascending=False)
    muscle_bar_chart = go.Figure(data=[
        go.Bar(x=muscle_ind_df['muscle'], y=muscle_ind_df['Total Reps'])
    ])
    muscle_bar_chart.update_layout(title='Muscles Worked', xaxis_title='Muscle Groups', yaxis_title='Total Reps')

    return overall_line_chart, specific_line_chart, muscle_bar_chart


# Flask route to render the Dash dashboard
@app.route("/dash/")
@login_required
def render_dashboard():
    if 'user_id' not in session:
        flash('Please login to access the dashboard', 'error')
        return redirect(url_for('login'))
    return dash_app.index()

# Function to generate frames for real-time video feedback
def gen_frames(exercise, user_id, rep_goal):
    if exercise == 'shoulder_press':
        print('s_press')
        return gen_frames_shoulder_press(user_id, rep_goal)
    elif exercise == 'dumbbell_curls':
        print('b_curls')
        return gen_frames_bicep_curls(user_id, rep_goal)
    elif exercise == 'barbell_squats':
        print('b_squats')
        return gen_frames_barbell_squats(user_id, rep_goal)
    elif exercise == 'deadlift':
        print('dlift')
        return gen_frames_deadlift(user_id, rep_goal)
    elif exercise == 'lateral_raises':
        print('l_raises')
        return gen_frames_lateral_raises(user_id, rep_goal)
    else:
        return None


# Flask routes for user authentication
@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    try:
        login_form = LoginForm()
        registration_form = RegistrationForm()

        if request.method == 'POST':
            print("POST request received")
            print("Form data:", request.form)
            
            # Check which form was submitted based on the submit button name
            if 'register' in request.form:
                print("Registration form submitted")
                if registration_form.validate_on_submit():
                    print("Registration form validated")
                    # Check if username already exists
                    user = User.query.filter_by(username=registration_form.username.data).first()
                    if user is None:
                        print("Creating new user")
                        new_user = User(
                            username=registration_form.username.data,
                            email=registration_form.email.data
                        )
                        new_user.set_password(registration_form.password.data)
                        db.session.add(new_user)
                        db.session.commit()
                        print("New user created")
                        flash('Registration successful! You can now log in.', 'success')
                        return redirect(url_for('login'))
                    else:
                        print("Username already exists")
                        flash('Username already exists. Please choose a different username.', 'danger')
                else:
                    print("Registration validation failed:", registration_form.errors)
                    for field, errors in registration_form.errors.items():
                        for error in errors:
                            flash(f'{field}: {error}', 'danger')
            
            else:  # Login form submitted
                print("Login form submitted")
                if login_form.validate_on_submit():
                    print("Login form validated")
                    user = User.query.filter_by(username=login_form.username.data).first()
                    print("User found:", user is not None)
                    if user and user.check_password(login_form.password.data):
                        print("Password verified")
                        flash('Login successful!', 'success')
                        session['user_id'] = user.id
                        return redirect(url_for('mainboard'))
                    else:
                        print("Invalid credentials")
                        flash('Invalid username or password.', 'danger')
                else:
                    print("Login validation failed:", login_form.errors)
                    for field, errors in login_form.errors.items():
                        for error in errors:
                            flash(f'{field}: {error}', 'danger')

        return render_template('enter.html', login_form=login_form, registration_form=registration_form)
    except Exception as e:
        print("Error in login route:", str(e))
        import traceback
        print("Traceback:", traceback.format_exc())
        flash('An error occurred. Please try again.', 'danger')
        return render_template('enter.html', login_form=LoginForm(), registration_form=RegistrationForm())


from datetime import datetime, timedelta

# Flask route for homepage
@app.route('/mainboard', methods=['GET', 'POST'])
@login_required
def mainboard():
    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found. Please log in again.', 'error')
        return redirect(url_for('login'))
        
    schedules = WorkoutSchedule.query.filter_by(user_id=session['user_id']).all()
    now = datetime.now()

    # Debug prints
    print(f'Current user_id: {session.get("user_id")}', flush=True)
    print('UserExercise count for this user:', UserExercise.query.filter_by(user_id=session.get('user_id')).count(), flush=True)

    # Check if user has any workout data
    has_data = UserExercise.query.filter_by(user_id=session['user_id']).count() > 0

    # Calculate workout efficiency
    total_exercises = UserExercise.query.filter_by(user_id=session['user_id']).count()
    if total_exercises > 0:
        efficiency = db.session.query(
            func.sum(UserExercise.count) * 100 / func.sum(UserExercise.total_reps)
        ).filter(UserExercise.user_id == session['user_id']).scalar() or 0
    else:
        efficiency = 0

    # Calculate total reps
    total_reps = db.session.query(
        func.sum(UserExercise.count)
    ).filter(UserExercise.user_id == session['user_id']).scalar() or 0

    # Calculate exercises this week
    week_start = now - timedelta(days=now.weekday())
    exercises_this_week = UserExercise.query.filter(
        UserExercise.user_id == session['user_id'],
        UserExercise.date >= week_start
    ).count()

    # Calculate workout streak
    workout_days = db.session.query(
        func.count(func.distinct(func.date(UserExercise.date)))
    ).filter(
        UserExercise.user_id == session['user_id'],
        UserExercise.date >= now - timedelta(days=30)
    ).scalar() or 0

    # Get most performed exercise
    most_performed = db.session.query(
        Exercises.name,
        func.count(UserExercise.id).label('count')
    ).join(UserExercise, UserExercise.exercise_id == Exercises.id).filter(
        UserExercise.user_id == session['user_id']
    ).group_by(Exercises.name).order_by(func.count(UserExercise.id).desc()).first()

    selected_exercise_name = most_performed[0] if most_performed else "No exercises yet"

    # Get alternative exercise suggestion
    if most_performed:
        alternate = Exercises.query.filter(
            Exercises.muscles_involved.like(f"%{most_performed[0]}%"),
            Exercises.name != most_performed[0]
        ).first()
        alternate_message = alternate.name if alternate else "Try a new exercise!"
    else:
        alternate_message = "Start with any exercise!"

    # Calculate streak
    streak = 0
    current_date = now.date()
    while True:
        has_workout = UserExercise.query.filter(
            UserExercise.user_id == session['user_id'],
            func.date(UserExercise.date) == current_date
        ).first() is not None
        
        if not has_workout:
            break

        streak += 1
        current_date -= timedelta(days=1)

    return render_template('mainboard.html', 
                         user=user,
                         schedules=schedules,
                         now=now,
                         efficiency=round(efficiency),
                         total_exercises=total_exercises,
                         exercises_this_week=exercises_this_week,
                         ex_goal=user.ex_goal,
                         streak=streak,
                         workout_days=workout_days,
                         total_reps=total_reps,
                         selected_exercise_name=selected_exercise_name,
                         alternate_message=alternate_message,
                         has_data=has_data)



# Route for profile page
@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    search_form = SearchForm()
    user_id = session.get('user_id')

    user_details = User.query.filter_by(id=user_id).first()

    if user_details:
        username = user_details.username
        ex_goal = user_details.ex_goal
        rep_goal = user_details.rep_goal

    if request.method == 'POST':
        if 'change_password' in request.form:
            new_password = request.form['new_password']
            user_details.set_password(new_password)
            db.session.commit()
            flash('Password updated successfully!', 'success')

        elif 'increase_ex_goal' in request.form:
            user_details.ex_goal += 1
            db.session.commit()

        elif 'decrease_ex_goal' in request.form:
            if user_details.ex_goal > 0:
                user_details.ex_goal -= 1
                db.session.commit()

        elif 'increase_rep_goal' in request.form:
            user_details.rep_goal += 1
            db.session.commit()

        elif 'decrease_rep_goal' in request.form:
            if user_details.rep_goal > 0:
                user_details.rep_goal -= 1
                db.session.commit()

        elif 'delete_account' in request.form:
            db.session.delete(user_details)
            db.session.commit()
            flash('Account deleted successfully!', 'success')
            return redirect(url_for('logout'))

    return render_template('profile.html', search_form=search_form,
                           username=username, ex_goal=ex_goal, rep_goal=rep_goal)

#
'''@app.route('/search_exercises', methods=['GET'])
@login_required
def search_exercises():
    query = request.args.get('query', '').strip()
    if query:
        exercises = Exercises.query.filter(Exercises.name.ilike(f'%{query}%')).all()
        results = [{'name': exercise.name, 'link': exercise.link} for exercise in exercises]
        return jsonify(results)'''

# Route to learn exercise
@app.route('/exercises', methods=['GET', 'POST'])
@login_required
def exercises():
    exercises = Exercises.query.all()
    schedules = WorkoutSchedule.query.filter_by(user_id=session['user_id']).all()
    now = datetime.now()
    
    # Get the selected exercise from the URL parameter
    selected_exercise = request.args.get('exercise')
    video_link = None
    
    # If an exercise is selected, get its YouTube link
    if selected_exercise:
        # Convert underscore to space and capitalize each word to match database format
        formatted_exercise = selected_exercise.replace('_', ' ').title()
        # Use case-insensitive search
        exercise = Exercises.query.filter(func.lower(Exercises.name) == func.lower(formatted_exercise)).first()
        if exercise:
            video_link = exercise.link
    
    return render_template('exercises.html', 
                          exercises=exercises, 
                          schedules=schedules, 
                          now=now,
                          video_link=video_link)

# Route for leaderboard
@app.route('/leaderboard', methods=['GET', 'POST'])
@login_required
def leaderboard():
    search_form = SearchForm()
    view = request.form.get('view', 'total_exercises')


    highest_exercises = db.session.query(
        User.id,
        User.username,
        func.count(UserExercise.id).label('exercise_count')
    ).join(User, User.id == UserExercise.user_id).group_by(User.id).order_by(func.count(UserExercise.id).desc()).all()


    highest_reps = db.session.query(
        User.id,
        User.username,
        func.sum(UserExercise.count).label('total_reps')
    ).join(User, User.id == UserExercise.user_id).group_by(User.id).order_by(func.sum(UserExercise.count).desc()).all()

    return render_template('leaderboard.html', leaderboard_data=highest_exercises if view == 'total_exercises'
    else highest_reps, view=view, search_form=search_form)


@app.route('/workout')
@login_required
def workout():
    search_form = SearchForm()
    return render_template('exercises.html', search_form=search_form)

# Routes to start exercise
# Temp page to re-direct to exercise page
@app.route('/start/<exercise>')
@login_required
def start(exercise):
    try:
        # Always get rep goal from query parameters if present
        rep_goal = request.args.get('rep_goal', type=int)
        if not rep_goal or rep_goal < 1:
            user = User.query.get(session['user_id'])
            rep_goal = user.rep_goal if user and user.rep_goal else 7

        # Get the exercise from the database
        exercise_record = Exercises.query.filter_by(name=exercise.replace('_', ' ').title()).first()
        if not exercise_record:
            flash('Exercise not found', 'error')
            return redirect(url_for('exercises'))

        print(f"DEBUG: Rendering start.html with rep_goal={rep_goal}")
        return render_template('start.html',
                             exercise=exercise,
                             user_id=session['user_id'],
                             rep_goal=rep_goal)
    except Exception as e:
        print(f"Error in start: {str(e)}")
        flash('Error starting exercise', 'error')
        return redirect(url_for('exercises'))

# Actual Exercise Page
@app.route('/start_page/<exercise>')
@login_required
def start_page(exercise):
    try:
        # Get the exercise from the database
        exercise_record = Exercises.query.filter_by(name=exercise.replace('_', ' ').title()).first()
        if not exercise_record:
            flash('Exercise not found', 'error')
            return redirect(url_for('exercises'))

        # Get user's profile
        user = User.query.get(session['user_id'])
        if not user:
            flash('User not found', 'error')
            return redirect(url_for('exercises'))

        # Get user's last workout for this exercise
        last_workout = UserExercise.query.filter_by(
            user_id=session['user_id'],
            exercise_id=exercise_record.id
        ).order_by(UserExercise.date.desc()).first()

        # Set default rep goal based on user's profile rep_goal or last workout, default to 7
        default_reps = user.rep_goal if user.rep_goal else (last_workout.total_reps if last_workout else 7)

        return render_template('start_page.html',
                             exercise=exercise,
                             exercise_id=exercise_record.id,
                             default_reps=default_reps,
                             last_workout=last_workout)
    except Exception as e:
        print(f"Error in start_page: {str(e)}")
        flash('Error loading exercise page', 'error')
        return redirect(url_for('exercises'))

# Video feed linked to start.html
@app.route('/video_feed/<exercise>/<int:user_id>/<int:rep_goal>')
def video_feed(exercise, user_id, rep_goal):
    try:
        # Convert exercise name to match the function names
        exercise_map = {
            'shoulder_press': 'shoulder_press',
            'bicep_curls': 'bicep_curls',
            'barbell_squats': 'barbell_squats',
            'deadlift': 'deadlift',
            'lateral_raises': 'lateral_raises'
        }
        
        exercise_key = exercise_map.get(exercise)
        if not exercise_key:
            flash('Invalid exercise selected', 'error')
            return redirect(url_for('exercises'))

        if exercise_key == 'barbell_squats':
            return Response(gen_frames_barbell_squats(user_id, rep_goal),
                          mimetype='multipart/x-mixed-replace; boundary=frame')
        elif exercise_key == 'shoulder_press':
            return Response(gen_frames_shoulder_press(user_id, rep_goal),
                          mimetype='multipart/x-mixed-replace; boundary=frame')
        elif exercise_key == 'bicep_curls':
            return Response(gen_frames_bicep_curls(user_id, rep_goal),
                          mimetype='multipart/x-mixed-replace; boundary=frame')
        elif exercise_key == 'deadlift':
            return Response(gen_frames_deadlift(user_id, rep_goal),
                          mimetype='multipart/x-mixed-replace; boundary=frame')
        elif exercise_key == 'lateral_raises':
            return Response(gen_frames_lateral_raises(user_id, rep_goal),
                          mimetype='multipart/x-mixed-replace; boundary=frame')
        else:
            flash('Invalid exercise selected', 'error')
            return redirect(url_for('exercises'))
    except Exception as e:
        print(f"Error in video feed: {str(e)}")
        flash('Error starting exercise. Please try again.', 'error')
        return redirect(url_for('exercises'))

# Route to logout
@app.route('/logout')
@login_required
def logout():
    session.clear()
    flash('You have been logged out.', 'success')
    return redirect(url_for('login'))

@app.route('/upload_exercise', methods=['GET', 'POST'])
@login_required
def upload_exercise():
    if request.method == 'POST':
        if 'video' not in request.files:
            flash('No video file part', 'error')
            return redirect(request.url)
        
        video_file = request.files['video']
        if video_file.filename == '':
            flash('No selected video file', 'error')
            return redirect(request.url)
        
        if not allowed_file(video_file.filename):
            flash('Invalid file format. Supported formats: mp4, mov, avi', 'error')
            return redirect(request.url)
        
        exercise_type = request.form.get('exercise_type')
        notes = request.form.get('notes', '')
        
        # Save uploaded video
        video_filename = f"{exercise_type}_{int(time.time())}.mp4"
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(video_path), exist_ok=True)
        
        video_file.save(video_path)
        
        # Analyze the video based on exercise type
        analysis_result = None
        if exercise_type == 'bicep_curl':
            analysis_result = analyze_bicep_curls_video(video_path)
        elif exercise_type == 'squat':
            analysis_result = analyze_squat_video(video_path)
        elif exercise_type == 'shoulder_press':
            analysis_result = analyze_shoulder_press_video(video_path)
        elif exercise_type == 'deadlift':
            analysis_result = analyze_deadlift_video(video_path)
        elif exercise_type == 'lateral_raise':
            analysis_result = analyze_lateral_raise_video(video_path)
            
        if not analysis_result or 'error' in analysis_result:
            flash('Error analyzing video: ' + analysis_result.get('error', 'Unknown error'), 'error')
            return redirect(url_for('upload_exercise'))
            
        # Get the analyzed video path from the result
        analyzed_filename = analysis_result.get('video_path', f"analyzed_{video_filename}")
            
        # Save exercise data
        exercise = ExerciseUpload(
            user_id=session['user_id'],
            exercise_type=exercise_type,
            video_path=analyzed_filename,
            feedback='\n'.join(analysis_result.get('feedback', [])),
            notes=notes
        )
        db.session.add(exercise)
        db.session.commit()
        
        flash('Exercise video uploaded and analyzed successfully!', 'success')
        return redirect(url_for('upload_exercise'))
        
    # Get user's analyzed videos
    analyzed_videos = ExerciseUpload.query.filter_by(user_id=session['user_id']).order_by(ExerciseUpload.created_at.desc()).all()
    return render_template('upload_exercise.html', analyzed_videos=analyzed_videos)

@app.route('/delete-analyzed-video/<int:upload_id>', methods=['POST'])
@login_required
def delete_analyzed_video(upload_id):
    upload = ExerciseUpload.query.get_or_404(upload_id)
    # Ensure the user can only delete their own videos
    if upload.user_id != session['user_id']:
        return jsonify({'error': 'Unauthorized access'}), 403
    try:
        # Delete the video file
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], upload.video_path)
        if os.path.exists(video_path):
            os.remove(video_path)
        # Delete the database record
        db.session.delete(upload)
        db.session.commit()
        return jsonify({'message': 'Video deleted successfully!'})
    except Exception as e:
        print(f"Error deleting video: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error deleting video'}), 500

@app.route('/schedule', methods=['GET'])
@login_required
def schedule():
    exercises = Exercises.query.all()
    schedules = WorkoutSchedule.query.filter_by(user_id=session['user_id']).all()
    now = datetime.now()
    return render_template('schedule.html', exercises=exercises, schedules=schedules, now=now)

@app.route('/add_schedule', methods=['POST'])
@login_required
def add_schedule():
    exercise_id = request.form.get('exercise_id')
    day_of_week = int(request.form.get('day_of_week'))
    sets = int(request.form.get('sets'))
    reps = int(request.form.get('reps'))
    
    new_schedule = WorkoutSchedule(
        user_id=session['user_id'],
        exercise_id=exercise_id,
        day_of_week=day_of_week,
        sets=sets,
        reps=reps
    )
    
    db.session.add(new_schedule)
    db.session.commit()
    
    flash('Exercise added to schedule successfully!', 'success')
    return redirect(url_for('schedule'))

@app.route('/delete_schedule/<int:schedule_id>', methods=['POST', 'DELETE'])
@login_required
def delete_schedule(schedule_id):
    schedule = WorkoutSchedule.query.get_or_404(schedule_id)
    
    if schedule.user_id != session['user_id']:
        flash('Unauthorized access', 'error')
        return redirect(url_for('schedule'))
    
    db.session.delete(schedule)
    db.session.commit()
    
    flash('Exercise removed from schedule successfully!', 'success')
    return redirect(url_for('schedule'))

@app.route('/update_schedule_status/<int:schedule_id>', methods=['POST'])
@login_required
def update_schedule_status(schedule_id):
    try:
        data = request.get_json()
        schedule = WorkoutSchedule.query.get_or_404(schedule_id)
        
        # Verify user owns this schedule
        if schedule.user_id != session['user_id']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        # Get the current week's start date
        current_date = datetime.now()
        week_start = current_date - timedelta(days=current_date.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

        # Check if there's a completion record for this schedule in the current week
        completion = ScheduleCompletion.query.filter(
            ScheduleCompletion.schedule_id == schedule_id,
            ScheduleCompletion.completed_at >= week_start
        ).first()

        if data['is_completed']:
            if not completion:
                # Create new completion record for this week
                completion = ScheduleCompletion(
                    schedule_id=schedule_id,
                    completed_at=current_date
                )
                db.session.add(completion)
        else:
            if completion:
                # Remove completion record for this week
                db.session.delete(completion)
        
        db.session.commit()
        return jsonify({'success': True})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Route to get schedule completion status
@app.route('/get_schedule_status/<int:schedule_id>')
@login_required
def get_schedule_status(schedule_id):
    try:
        schedule = WorkoutSchedule.query.get_or_404(schedule_id)
        
        # Verify user owns this schedule
        if schedule.user_id != session['user_id']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        # Get the current week's start date
        current_date = datetime.now()
        week_start = current_date - timedelta(days=current_date.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

        # Check if there's a completion record for this week
        completion = ScheduleCompletion.query.filter(
            ScheduleCompletion.schedule_id == schedule_id,
            ScheduleCompletion.completed_at >= week_start
        ).first()

        return jsonify({
            'success': True,
            'is_completed': completion is not None
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/download-analyzed-video/<int:upload_id>')
@login_required
def download_analyzed_video(upload_id):
    upload = ExerciseUpload.query.get_or_404(upload_id)
    # Ensure the user can only download their own videos
    if upload.user_id != session['user_id']:
        return jsonify({'error': 'Unauthorized access'}), 403
    try:
        # Full path to the video file
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], upload.video_path)
        video_path = os.path.normpath(video_path)
        # Check if file exists
        if not os.path.exists(video_path):
            print(f"ERROR: File does not exist: {video_path}")
            return jsonify({'error': 'Video file not found'}), 404
        # Print file size for debugging
        print(f"Sending file: {video_path}, size: {os.path.getsize(video_path)} bytes")
        # Check if download parameter is provided
        download = request.args.get('download', 'false') == 'true'
        # Determine file size
        file_size = os.path.getsize(video_path)
        # Map exercise_type to a human-readable filename
        name_map = {
            'squat': 'barbell_squats',
            'bicep_curl': 'bicep_curls',
            'shoulder_press': 'shoulder_press',
            'deadlift': 'deadlift',
            'lateral_raise': 'lateral_raises'
        }
        filename = f"{name_map.get(upload.exercise_type, upload.exercise_type)}_analyzed.mp4"
        response = send_file(
            video_path,
            mimetype='video/mp4',
            as_attachment=download,
            download_name=filename if download else None
        )
        # Add Content-Length header
        response.headers['Content-Length'] = file_size
        return response
    except Exception as e:
        print(f"Error serving video: {str(e)}")
        return jsonify({'error': 'Error serving video'}), 500

@app.route('/recommendations')
@login_required
def recommendations():
    recommender = WorkoutRecommender(session['user_id'])
    recommendations = recommender.get_recommendations()
    
    # Check if user has any workout data
    has_data = UserExercise.query.filter_by(user_id=session['user_id']).count() > 0
    
    # Get progression recommendations for each exercise
    progression_recommendations = {}
    for exercise in Exercises.query.all():
        progression = recommender.get_progression_recommendation(exercise.id)
        if progression:
            progression_recommendations[exercise.name] = progression
    
    return render_template('recommendations.html',
                         recommendations=recommendations,
                         progression_recommendations=progression_recommendations,
                         muscle_groups=recommender.muscle_groups,
                         has_data=has_data)

@app.route('/api/dashboard')
@login_required
def api_dashboard():
    user_id = session['user_id']
    print(f"DASHBOARD DEBUG: user_id from session = {user_id}")
    user = User.query.get(user_id)
    now = datetime.now()

    # Calculate start of the week (Monday)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    # Count workouts completed this week
    workouts_this_week = UserExercise.query.filter(
        UserExercise.user_id == user_id,
        UserExercise.date >= week_start
    ).count()

    # Total workouts
    total_workouts = UserExercise.query.filter_by(user_id=user_id).count()

    # Efficiency
    if total_workouts > 0:
        efficiency = db.session.query(
            func.sum(UserExercise.count) * 100 / func.sum(UserExercise.total_reps)
        ).filter(UserExercise.user_id == user_id).scalar() or 0
    else:
        efficiency = 0

    # Progress change (weekly progress)
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start
    workouts_last_week = UserExercise.query.filter(
        UserExercise.user_id == user_id,
        UserExercise.date >= last_week_start,
        UserExercise.date < last_week_end
    ).count()
    weekly_progress = 0
    if workouts_last_week > 0:
        weekly_progress = int(((workouts_this_week - workouts_last_week) / workouts_last_week) * 100)
    elif workouts_this_week > 0:
        weekly_progress = 100

    # Workout streak (consecutive days with at least one workout)
    streak = 0
    current_date = now.date()
    while True:
        has_workout = UserExercise.query.filter(
            UserExercise.user_id == user_id,
            func.date(UserExercise.date) == current_date
        ).first() is not None
        if not has_workout:
            break
        streak += 1
        current_date -= timedelta(days=1)

    # Monthly activity (workouts this month)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_activity = UserExercise.query.filter(
        UserExercise.user_id == user_id,
        UserExercise.date >= month_start
    ).count()

    # Lifetime reps
    lifetime_reps = db.session.query(func.sum(UserExercise.total_reps)).filter(UserExercise.user_id == user_id).scalar() or 0

    # Weekly goal from profile
    weekly_goal = user.ex_goal if user else 0

    # Recent activity (last 10 workouts)
    recent = UserExercise.query.filter_by(user_id=user_id).order_by(UserExercise.date.desc()).limit(10).all()
    recent_activity = []
    for r in recent:
        exercise = Exercises.query.get(r.exercise_id)
        recent_activity.append({
            'date': r.date.strftime('%Y-%m-%d %H:%M'),
            'exercise': exercise.name if exercise else 'Unknown',
            'duration': getattr(r, 'duration', 0),
        })

    return jsonify({
        'total_workouts': total_workouts,
        'efficiency': round(efficiency),
        'goals_achieved': workouts_this_week,
        'progress_change': weekly_progress,
        'workout_streak': streak,
        'monthly_activity': monthly_activity,
        'lifetime_reps': lifetime_reps,
        'weekly_goal': weekly_goal,
        'recent_activity': recent_activity
    })

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Registration successful!'}), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    # Handle Google authentication
    if data.get('googleAuth'):
        email = data.get('email')
        google_id = data.get('googleId')
        name = data.get('name')

        if not email or not google_id:
            return jsonify({'error': 'Missing required Google authentication data'}), 400

        # Check if user exists with Google ID
        user = User.query.filter_by(google_id=google_id).first()
        
        if not user:
            # Check if user exists with the same email
            user = User.query.filter_by(email=email).first()
            if user:
                # Update existing user with Google info
                user.google_id = google_id
                user.is_google_user = True
                if name and not user.name:
                    user.name = name
            else:
                # Create new user
                user = User(
                    email=email,
                    google_id=google_id,
                    is_google_user=True,
                    name=name,
                    username=email.split('@')[0]  # Use email prefix as username
                )
                db.session.add(user)
            
            db.session.commit()

        session['user_id'] = user.id
        session['is_google_user'] = True
        return jsonify({
            'message': 'Google login successful!',
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
        }), 200

    # Handle regular email/password login
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    
    # Check if user exists and is not a Google user
    if not user or user.is_google_user:
        return jsonify({'error': 'Invalid credentials'}), 401
        
    # Only check password for non-Google users
    if not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    session['user_id'] = user.id
    return jsonify({'message': 'Login successful!'}), 200

@app.route('/api/exercises')
def api_exercises():
    # Get all exercises without filtering
    exercises = Exercises.query.all()
    
    # Prepare the response with image URLs and keys
    name_to_key = {
        'Barbell Squats': 'barbell_squats',
        'Bicep Curls': 'bicep_curls',
        'Shoulder Press': 'shoulder_press',
        'Deadlift': 'deadlift',
        'Lateral Raises': 'lateral_raises',
    }
    exercise_list = []
    for ex in exercises:
        # Get corresponding image URL
        image_filename = ex.name.lower().replace(' ', '_') + '.gif'
        image_url = url_for('static', filename=f'images/exercises/{image_filename}')
        exercise_list.append({
            'id': ex.id,
            'name': ex.name,
            'muscles_involved': ex.muscles_involved,
            'link': ex.link,
            'image_url': image_url,
            'key': name_to_key.get(ex.name, None)
        })
    
    return jsonify(exercise_list)

@app.route('/api/profile')
def api_profile():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    response_data = {
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'email': user.email,
        'height': getattr(user, 'height', None),
        'weight': getattr(user, 'weight', None),
        'goal': getattr(user, 'goal', None),
        'profile_picture': getattr(user, 'profile_picture', None),
        'rep_goal': getattr(user, 'rep_goal', None),
        'ex_goal': getattr(user, 'ex_goal', None)
    }
    
    print('Profile data retrieved:', response_data, file=sys.stderr)
    return jsonify(response_data)

@app.route('/api/profile/stats')
def api_profile_stats():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    total_workouts = UserExercise.query.filter_by(user_id=user_id).count()
    calories_burned = 0  # Placeholder
    goals_achieved = 0  # Placeholder
    return jsonify({
        'total_workouts': total_workouts,
        'calories_burned': calories_burned,
        'goals_achieved': goals_achieved
    })

@app.route('/api/leaderboard')
def api_leaderboard():
    current_username = session.get('username')
    # Total exercises leaderboard
    total_exercises = db.session.query(
        User.username,
        db.func.count(UserExercise.id).label('exercise_count')
    ).join(UserExercise, User.id == UserExercise.user_id).group_by(User.id).order_by(db.func.count(UserExercise.id).desc()).all()
    total_exercises_list = [
        {
            'username': row[0],
            'exercise_count': row[1],
            'is_current_user': (row[0] == current_username)
        } for row in total_exercises
    ]
    # Total reps leaderboard
    total_reps = db.session.query(
        User.username,
        db.func.sum(UserExercise.count).label('total_reps')
    ).join(UserExercise, User.id == UserExercise.user_id).group_by(User.id).order_by(db.func.sum(UserExercise.count).desc()).all()
    total_reps_list = [
        {
            'username': row[0],
            'total_reps': int(row[1] or 0),
            'is_current_user': (row[0] == current_username)
        } for row in total_reps
    ]
    return jsonify({
        'total_exercises': total_exercises_list,
        'total_reps': total_reps_list
    })

@app.route('/api/schedule')
@login_required
def api_schedule():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    schedules = WorkoutSchedule.query.filter_by(user_id=user_id).all()
    # Get the current week's start date
    current_date = datetime.now()
    week_start = current_date - timedelta(days=current_date.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    result = []
    for s in schedules:
        # Check if there's a completion record for this schedule in the current week
        completion = ScheduleCompletion.query.filter(
            ScheduleCompletion.schedule_id == s.id,
            ScheduleCompletion.completed_at >= week_start
        ).first()
        exercise = Exercises.query.get(s.exercise_id)
        result.append({
            'id': s.id,
            'exercise_id': s.exercise_id,
            'exercise_name': exercise.name if exercise else 'Unknown',
            'day_of_week': s.day_of_week,
            'sets': s.sets,
            'reps': s.reps,
            'is_completed': completion is not None
        })
    return jsonify({'schedules': result})

@app.route('/api/recommendations')
@login_required
def api_recommendations():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    recommender = WorkoutRecommender(user_id)
    recs = recommender.get_recommendations()
    # recs: {focus_areas, recommended_exercises, muscle_balance}
    # Build muscle_groups for frontend
    muscle_groups = []
    for muscle, data in recs['muscle_balance'].items():
        muscle_groups.append({
            'name': muscle,
            'percent': data['percent'],
            'count': data['count']
        })
    # Build recommendations by muscle group
    recommendations = {}
    for muscle in recommender.muscle_groups:
        recommendations[muscle] = recommender.muscle_groups[muscle]
    # Progression recommendations
    progression_recommendations = {}
    for exercise in Exercises.query.all():
        progression = recommender.get_progression_recommendation(exercise.id)
        if progression:
            progression_recommendations[exercise.name] = {
                'rom': progression['current_avg_rom'],
                'reps': progression['current_avg_reps'],
                'suggestion': progression['suggestion'],
                'recommendation': progression['recommendation']
            }
    return jsonify({
        'muscle_groups': muscle_groups,
        'recommendations': recommendations,
        'focus_areas': recs['focus_areas'],
        'progression_recommendations': progression_recommendations
    })

@app.route('/api/analyzed_videos')
def api_analyzed_videos():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    videos = ExerciseUpload.query.filter_by(user_id=user_id).all()
    return jsonify([
        {
            'id': v.id,
            'exercise_type': v.exercise_type,
            'video_path': v.video_path,
            'feedback': v.feedback,
            'notes': v.notes,
            'created_at': v.created_at.isoformat() if hasattr(v, 'created_at') else None
        }
        for v in videos
    ])

@app.route('/api/profile/update', methods=['POST'])
def api_profile_update():
    user_id = session.get('user_id')
    print('api_profile_update called', file=sys.stderr)
    if not user_id:
        print('Not logged in', file=sys.stderr)
        return jsonify({'error': 'Not logged in'}), 401
    user = User.query.get(user_id)
    data = request.get_json()
    print('Received data:', data, file=sys.stderr)
    if not user or not data:
        print('User not found or no data', file=sys.stderr)
        return jsonify({'error': 'User not found or no data'}), 400
    try:
        # Validate and update fields only if changed and present
        if 'name' in data and data['name'] and data['name'] != user.name:
            user.name = data['name']
        if 'height' in data and data['height'] not in (None, ''):
            try:
                user.height = float(data['height'])
            except Exception as e:
                print('Invalid height:', e, file=sys.stderr)
        if 'weight' in data and data['weight'] not in (None, ''):
            try:
                user.weight = float(data['weight'])
            except Exception as e:
                print('Invalid weight:', e, file=sys.stderr)
        if 'goal' in data and data['goal'] is not None:
            user.goal = data['goal']
        if 'rep_goal' in data and data['rep_goal'] is not None:
            try:
                user.rep_goal = int(data['rep_goal'])
            except Exception as e:
                print('Invalid rep_goal:', e, file=sys.stderr)
        if 'ex_goal' in data and data['ex_goal'] is not None:
            try:
                user.ex_goal = int(data['ex_goal'])
            except Exception as e:
                print('Invalid ex_goal:', e, file=sys.stderr)
        db.session.commit()
        print('Profile updated successfully', file=sys.stderr)
        # Return updated profile data
        return jsonify({
            'id': user.id,
            'username': user.username,
            'name': user.name,
            'email': user.email,
            'height': getattr(user, 'height', None),
            'weight': getattr(user, 'weight', None),
            'goal': getattr(user, 'goal', None),
            'profile_picture': getattr(user, 'profile_picture', None),
            'rep_goal': getattr(user, 'rep_goal', None),
            'ex_goal': getattr(user, 'ex_goal', None),
            'message': 'Profile updated'
        })
    except Exception as e:
        print('Exception in profile update:', e, file=sys.stderr)
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/change-password', methods=['POST'])
def api_profile_change_password():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    user = User.query.get(user_id)
    data = request.get_json()
    if not user or not data:
        return jsonify({'error': 'User not found or no data'}), 400
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({'error': 'No new password provided'}), 400
    user.set_password(new_password)
    db.session.commit()
    return jsonify({'message': 'Password updated'})

@app.route('/api/upload_exercise', methods=['POST'])
def api_upload_exercise():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401

    if 'video' not in request.files:
        return jsonify({'error': 'No video file part'}), 400
    
    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': 'No selected video file'}), 400
    
    if not allowed_file(video_file.filename):
        return jsonify({'error': 'Invalid file format. Supported formats: mp4, mov, avi'}), 400
    
    exercise_type = request.form.get('exercise_type')
    notes = request.form.get('notes', '')

    print('DEBUG: exercise_type:', exercise_type)
    
    # Save uploaded video
    video_filename = f"{exercise_type}_{int(time.time())}.mp4"
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
    print('DEBUG: video_path:', video_path)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(video_path), exist_ok=True)
    
    video_file.save(video_path)
    
    # Analyze the video based on exercise type
    analysis_result = None
    if exercise_type == 'bicep_curl':
        analysis_result = analyze_bicep_curls_video(video_path)
    elif exercise_type == 'squat':
        analysis_result = analyze_squat_video(video_path)
    elif exercise_type == 'shoulder_press':
        analysis_result = analyze_shoulder_press_video(video_path)
    elif exercise_type == 'deadlift':
        analysis_result = analyze_deadlift_video(video_path)
    elif exercise_type == 'lateral_raise':
        analysis_result = analyze_lateral_raise_video(video_path)

    print('DEBUG: analysis_result:', analysis_result)
    
    if not analysis_result:
        return jsonify({'error': 'Error analyzing video: Unknown error (analysis_result is None)'}), 500
    if 'error' in analysis_result:
        return jsonify({'error': 'Error analyzing video: ' + analysis_result.get('error', 'Unknown error')}), 500
    
    # Get the analyzed video path from the result
    analyzed_filename = analysis_result.get('video_path', f"analyzed_{video_filename}")
    
    # Save exercise data
    exercise = ExerciseUpload(
        user_id=user_id,
        exercise_type=exercise_type,
        video_path=analyzed_filename,
        feedback='\n'.join(analysis_result.get('feedback', [])),
        notes=notes
    )
    db.session.add(exercise)
    db.session.commit()
    
    return jsonify({
        'message': 'Exercise video uploaded and analyzed successfully!',
        'analysis': analysis_result
    })

@app.route('/api/profile/picture', methods=['POST'])
def api_profile_picture():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'profile_picture' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['profile_picture']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
        return jsonify({'error': 'Invalid file type'}), 400

    # Save the file
    filename = f"profile_{user_id}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}"
    save_path = os.path.join('uploads', 'profile_pictures')
    os.makedirs(save_path, exist_ok=True)
    file_path = os.path.join(save_path, filename)
    file.save(file_path)

    # Update user profile_picture field (store relative path)
    user.profile_picture = f"/{file_path.replace(os.sep, '/')}"
    db.session.commit()

    return jsonify({'profile_picture_url': user.profile_picture})

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    # Allow specific origins
    allowed_origins = ['http://localhost:5173']
    # Also allow any ngrok domains
    if origin and ('ngrok.io' in origin or 'ngrok-free.app' in origin):
        allowed_origins.append(origin)
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

# Add a global error handler to ensure CORS headers on error responses
@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    print('Exception:', e)
    print(traceback.format_exc())
    response = make_response({'error': str(e)}, 500)
    
    origin = request.headers.get('Origin')
    # Allow specific origins
    allowed_origins = ['http://localhost:5173']
    # Also allow any ngrok domains
    if origin and ('ngrok.io' in origin or 'ngrok-free.app' in origin):
        allowed_origins.append(origin)
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

@app.route('/api/add_schedule', methods=['POST'])
@login_required
def api_add_schedule():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON data'}), 400

    exercise_id = data.get('exercise_id')
    day_of_week = int(data.get('day_of_week'))
    sets = int(data.get('sets'))
    reps = int(data.get('reps'))

    new_schedule = WorkoutSchedule(
        user_id=session['user_id'],
        exercise_id=exercise_id,
        day_of_week=day_of_week,
        sets=sets,
        reps=reps
    )

    db.session.add(new_schedule)
    db.session.commit()

    return jsonify({'message': 'Exercise added to schedule successfully!'})

@app.route('/api/schedule/today')
@login_required
def api_schedule_today():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in'}), 401
    # Use Sunday=0, Monday=1, ..., Saturday=6
    today = (datetime.now().weekday() + 1) % 7
    schedules = WorkoutSchedule.query.filter_by(user_id=user_id, day_of_week=today).all()
    result = []
    for s in schedules:
        exercise = Exercises.query.get(s.exercise_id)
        result.append({
            'id': s.id,
            'exercise_id': s.exercise_id,
            'exercise_name': exercise.name if exercise else 'Unknown',
            'sets': s.sets,
            'reps': s.reps
        })
    return jsonify({'today': result})

@app.route('/api/update_schedule_status/<int:schedule_id>', methods=['POST'])
@login_required
def api_update_schedule_status(schedule_id):
    return update_schedule_status(schedule_id)

@app.route('/api/delete_schedule/<int:schedule_id>', methods=['DELETE'])
@login_required
def api_delete_schedule(schedule_id):
    try:
        schedule = WorkoutSchedule.query.get_or_404(schedule_id)
        if schedule.user_id != session['user_id']:
            return jsonify({'error': 'Unauthorized access'}), 403
        # Delete related ScheduleCompletion records first
        ScheduleCompletion.query.filter_by(schedule_id=schedule_id).delete()
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'message': 'Exercise removed from schedule successfully!'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/google-auth', methods=['POST'])
def google_auth():
    try:
        # Get the token from the request
        token = request.json.get('token')
        if not token:
            return jsonify({'error': 'No token provided'}), 400

        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(),
            os.getenv('GOOGLE_CLIENT_ID')
        )

        # Get user info from the token
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')

        # Check if user exists
        user = User.query.filter_by(google_id=google_id).first()
        
        if not user:
            # Check if user exists with the same email
            user = User.query.filter_by(email=email).first()
            if user:
                # Update existing user with Google info
                user.google_id = google_id
                user.is_google_user = True
                if not user.profile_picture:
                    user.profile_picture = picture
                if not user.name:
                    user.name = name
            else:
                # Create new user
                user = User(
                    email=email,
                    google_id=google_id,
                    is_google_user=True,
                    name=name,
                    profile_picture=picture,
                    username=email.split('@')[0]  # Use email prefix as username
                )
                db.session.add(user)
            
            db.session.commit()

        # Create session
        session['user_id'] = user.id
        session['is_google_user'] = True

        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'profile_picture': user.profile_picture
            }
        }), 200

    except ValueError as e:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.debug = True  # Enable debug mode
    app.run()