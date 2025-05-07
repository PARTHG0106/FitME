# FitME - AI-Powered Gym Tracking Application

FitME is an innovative gym tracking application that uses artificial intelligence to help users perform exercises correctly and track their fitness progress. The application features real-time pose estimation, exercise form correction, and personalized workout recommendations.

## Features

- **AI-Powered Exercise Form Detection**
  - Real-time pose estimation
  - Form correction feedback
  - Exercise repetition counting

- **User Authentication**
  - Email/Password registration
  - Google Sign-In integration
  - Secure session management

- **Exercise Library**
  - Comprehensive collection of exercises
  - Animated GIF demonstrations
  - Detailed form instructions

- **Personalized Dashboard**
  - Progress tracking
  - Exercise history
  - Performance analytics

- **Workout Recommendations**
  - AI-based exercise suggestions
  - Personalized workout plans
  - Difficulty level adaptation

## Technology Stack

### Frontend
- React.js
- Chakra UI
- Framer Motion
- TensorFlow.js (for pose estimation)

### Backend
- Flask (Python)
- SQLAlchemy
- OpenCV
- MediaPipe

### Authentication
- JWT
- Google OAuth 2.0

### Database
- SQLite

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn
- Webcam (for exercise tracking)

### Installation

1. Clone the repository
```bash
git clone https://github.com/PARTHG0106/FitME.git
cd FitME
```

2. Set up the Python virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Install frontend dependencies
```bash
npm install
```

4. Set up environment variables
Create a `.env` file in the root directory and add:
```
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

5. Initialize the database
```bash
python init_db.py
```

### Running the Application

1. Start the Flask backend
```bash
python run_locally.py
```

2. Start the React frontend (in a separate terminal)
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Features in Detail

### Exercise Form Detection
- Uses TensorFlow.js and MediaPipe for real-time pose estimation
- Provides instant feedback on exercise form
- Counts repetitions automatically

### Workout Tracking
- Records exercise sets, reps, and weights
- Tracks progress over time
- Generates performance analytics

### Personalized Recommendations
- AI-powered exercise suggestions based on user performance
- Adapts difficulty levels based on progress
- Provides variety in workout routines


## Contact

Parth Gupta - [@PARTHG0106](https://github.com/PARTHG0106)

Project Link: [https://github.com/PARTHG0106/FitME](https://github.com/PARTHG0106/FitME) 
