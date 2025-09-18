# 🍽️ Menu Gen - Weekly Menu Generator

A full-stack web application that helps you plan weekly meals with smart protein distribution and weather integration. Built with React and Spring Boot, it solves the common problem of deciding what to eat while ensuring dietary variety.

## 🌟 What It Does

- **Smart Menu Planning**: Set how many chicken, fish, vegetarian meals etc. you want per week
- **Weather Integration**: See the forecast for each meal day (perfect for planning grilling vs. comfort food)
- **Beautiful Printing**: Choose from floral backgrounds and fonts to print your weekly menu
- **Flexible Shuffling**: Keep the meals you like, shuffle the rest
- **Mobile Friendly**: Works on any device for quick meal planning

## 🛠️ How It's Built

**Frontend (React)**: Built with modern React hooks and functional components. I used Maps and Sets to make data lookups really fast (O(1) time complexity), especially when matching weather data to meal dates. The state management handles multiple user interactions smoothly without unnecessary re-renders.

**Backend (Java Spring Boot)**: The core is a multi-step algorithm that solves the constraint satisfaction problem of protein distribution. It first satisfies user requirements, then fills remaining slots with variety. Uses HashSet to prevent duplicate meals and Collections.shuffle() for unbiased randomization.

**Database (MySQL)**: Simple but effective schema with proper indexing on the protein column for fast filtering. Connection pooling keeps performance smooth even with multiple simultaneous requests.

**Weather Integration**: Pulls forecast data from Open-Meteo API with smart fallback handling when the service is unavailable.

## 📊 Database Schema

The application uses a MySQL database with optimized meal storage:

```sql
CREATE TABLE meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    protein VARCHAR(100),
    cuisine VARCHAR(100),
    cook_time VARCHAR(100),
    cook_method VARCHAR(100),
    source VARCHAR(255),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### What's In The Database

I populated it with 100+ diverse meals covering different proteins (chicken, beef, fish, vegetarian), cuisines (American, Asian, Italian, Latin), and cook times (quick 30-minute weeknight meals to longer weekend projects). The variety ensures the algorithm can always find good matches for user preferences.

## 🎯 How To Use It

### Planning Your Week

1. **Pick Your Start Date**: When does your meal week begin?
2. **Set Protein Preferences**: Want 3 chicken meals and 2 fish? Just set the numbers
3. **Generate**: The algorithm finds meals that match your preferences
4. **Shuffle**: Don't like a suggestion? Keep the ones you want and shuffle the rest

### Printing Your Menu

I built a custom print system with a popup interface that lets you customize the look:

- **6 Backdrop Options**: Beautiful floral gradients or clean white background
- **5 Font Styles**: From classic serif to fun script fonts
- **Single Page Layout**: CSS optimizations ensure everything fits on one page
- **Weather Included**: Shows the forecast for each meal day

### Smart Features

- **Weather Integration**: Automatically fetches forecasts so you can plan accordingly
- **No Duplicates**: Uses HashSet data structure to ensure you never get the same meal twice in a week
- **Flexible Constraints**: Want exactly 2 chicken meals? Or just "some chicken"? Both work
- **Error Handling**: Graceful fallbacks when weather APIs are down or constraints can't be met

## 🛠️ Development Setup

### Project Structure

```
menu-gen/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── index.js       # Application entry point
│   │   └── index.css      # Styling and responsive design
│   └── package.json
├── server-java/           # Spring Boot backend
│   ├── src/main/java/com/example/meal/
│   │   ├── MenuController.java    # REST endpoints
│   │   ├── MealService.java       # Business logic
│   │   └── WeatherService.java    # Weather integration
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── application-local.properties
│   └── pom.xml
├── server/                # Legacy Node.js server (deprecated)
└── README.md
```

### Getting It Running

**Backend (Spring Boot)**:
```bash
cd server-java
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

**Frontend (React)**:
```bash
cd client
npm install
npm start
```

Then visit http://localhost:3000 to use the app.

### Configuration

You'll need to set up your database connection in `application-local.properties`:

```properties
# Your MySQL database
spring.datasource.url=jdbc:mysql://localhost:3307/menu_gen
spring.datasource.username=your_username
spring.datasource.password=your_password

# Weather location (uses free Open-Meteo API)
weather.lat=37.322529  # Your latitude
weather.lon=-122.042261  # Your longitude
```

## 🎨 Print Customization Features

### Backdrop Options
- **Original**: Clean white background for professional printing
- **Rose Garden**: Warm pink and peach gradient
- **Lavender Fields**: Purple and blue tones
- **Sunflower Meadow**: Golden yellow and orange hues
- **Cherry Blossom**: Pink and coral spring colors
- **Garden Fresh**: Green and blue nature theme

### Font Styles
- **Classic**: Georgia serif for traditional elegance
- **Modern**: Helvetica Neue for clean contemporary look
- **Elegant**: Times New Roman for formal occasions
- **Casual**: Comic Sans for family-friendly menus
- **Script**: Brush Script for artistic flair

## 🌤️ Weather Integration

Built with the Open-Meteo API to automatically fetch weather forecasts for your meal planning week:
- Daily high temperatures
- Weather condition icons
- Smart data merging so you can plan grilling vs. comfort food based on forecast

## 🔧 API Endpoints

- `GET /api/filters` - Get available filter options
- `POST /api/menu/generate` - Generate weekly menu with protein distribution
- `GET /api/weather/forecast` - Get weather forecast for date range

## 📝 License

This project is open source and available under the MIT License.

---

**Happy Menu Planning! 🍽️**