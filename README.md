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

3. Set up the frontend and root dependencies:
```bash
# Install root dependencies (concurrently)
npm install

# Install frontend dependencies
cd frontend
npm install
```

Alternatively, you can use the shorthand command from the root directory:
```bash
npm run install-all
```

### Running the Application

You can run both the frontend and backend with a single command from the root directory:

```bash
npm install  # First time only, to install concurrently
npm start
```

Or from the frontend directory:

```bash
cd frontend
npm start
```

Both methods will start the React frontend (on port 3000) and the Flask backend (on port 5000) concurrently.

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