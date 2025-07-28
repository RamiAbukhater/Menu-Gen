# 🍽️ Menu Gen - Weekly Menu Generator

A full-stack web application for generating weekly menus from a database of recipes. Perfect for hosting on your local network with a Synology NAS database.

## 🌟 Features

- **Smart Menu Generation**: Generate weekly menus based on your preferences
- **Advanced Filtering**: Filter by protein, cuisine, cook time, and cooking method
- **Weather Integration**: Shows weather forecast for each day of the week
- **Menu Shuffling**: Keep your favorite meals and shuffle the rest
- **Export Options**: Print menus or export to CSV
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Local Network Ready**: Designed for hosting on your home network

## 🏗️ Architecture

- **Frontend**: React.js with modern UI components
- **Backend**: Node.js/Express.js REST API
- **Database**: MySQL (hosted on Synology NAS)
- **Weather API**: OpenWeatherMap integration
- **Print/Export**: Built-in printing and CSV export functionality

## 📊 Database Schema

The application uses a MySQL database with the following structure:

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

### Sample Data

The database comes pre-populated with 100+ meals including:

- **Proteins**: Chicken, Beef, Pork, Fish, Vegetarian, Lamb
- **Cuisines**: American, Arabic, Asian, European, Indian, Italian, Latin
- **Cook Times**: < 30 minutes, 30 minutes, 1 hour, 2 hours, > 2 hours
- **Cooking Methods**: Stovetop, Oven, Grill, Slow Cooker, Pressure Cooker, Wok, etc.

## 🎯 Usage Guide

### 1. Generate a Menu

1. Open the application in your browser
2. Select your preferences:
   - **Protein**: Choose specific proteins or "All Proteins"
   - **Cuisine**: Select cuisine types or "All Cuisines"
   - **Cook Time**: Filter by preparation time
   - **Cooking Method**: Choose cooking methods
3. Click "Generate Weekly Menu"

### 2. Customize Your Menu

1. **Keep Favorite Meals**: Check the "Keep this meal" box for meals you want to keep
2. **Shuffle Others**: Click "Shuffle Unchecked" to generate new meals for unchecked items
3. **View Weather**: Each meal shows the weather forecast for that day

### 3. Export Your Menu

- **Print**: Click the print button for a printer-friendly version
- **Export CSV**: Download your menu as a CSV file for spreadsheet use

## 🛠️ Development

### Project Structure

```
menu-gen/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── App.js         # Main application component
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Global styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Express server
│   ├── package.json
│   └── .env               # Environment variables
├── database/
│   └── schema.sql         # Database schema and sample data
├── package.json           # Root package.json
└── README.md
```

### API Endpoints

- `GET /api/meals` - Get all meals
- `GET /api/meals/filter` - Filter meals by criteria
- `POST /api/menu/generate` - Generate weekly menu
- `GET /api/filters` - Get available filter options
- `POST /api/meals` - Add new meal
- `PUT /api/meals/:id` - Update meal
- `DELETE /api/meals/:id` - Delete meal
- `GET /api/health` - Health check

## 📝 License

This project is licensed under the MIT License.

---

**Happy Menu Planning! 🍽️**
