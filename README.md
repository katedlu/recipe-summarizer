# Recipe Summarizer

A web application that extracts and displays recipe information from cooking websites.

## Features

- Extract recipe data from popular cooking websites
- Display ingredients, instructions, timing, and images
- Modern React frontend with TypeScript
- Python Flask backend with recipe-scrapers

## Tech Stack

**Frontend:**
- React with TypeScript
- Modern responsive design
- Fetch API for HTTP requests

**Backend:**
- Python Flask
- recipe-scrapers library for parsing
- CORS enabled for frontend communication

## Project Structure

```
recipe-summarizer/
├── README.md
├── .gitignore
├── backend/
│   ├── app.py                 # Flask server
│   ├── requirements.txt       # Python dependencies
│   └── venv/                  # Python virtual environment
└── frontend/
    ├── package.json           # Node.js dependencies
    ├── package-lock.json      # Dependency lock file
    ├── public/                # Static assets
    ├── src/
    │   ├── App.tsx           # Main React component
    │   ├── App.css           # Application styles
    │   └── ...               # Other React files
    └── ...
```

## Getting Started

### Prerequisites
- Node.js and npm
- Python 3.7+
- Git

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd recipe-summarizer
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\Activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

3. Set up the frontend:
```bash
cd frontend
npm install
```

### Running the Application

To run both the frontend and backend concurrently:

```bash
cd frontend
npm start
```

This will start both the React frontend (on port 3000) and the Flask backend (on port 5000) using a single command.

Alternatively, you can run them separately:

1. Start the backend server:
```bash
cd backend
.\venv\Scripts\Activate  # Windows
python app.py
```

2. Start the frontend development server:
```bash
cd frontend
npm run start-frontend
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter a recipe URL from a supported cooking website
2. Click "Parse Recipe" to extract the recipe data
3. View the parsed ingredients, instructions, and additional information

## Supported Websites

This application uses the `recipe-scrapers` library which supports 300+ cooking websites including:
- AllRecipes
- Food Network
- BBC Good Food
- Serious Eats
- And many more!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).