const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Database connection
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'menu_gen',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Weather API configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'your_openweathermap_api_key';
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Routes

// Get all meals
app.get('/api/meals', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM meals ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Get meals by filters
app.get('/api/meals/filter', async (req, res) => {
  try {
    const { protein, cuisine, cookTime, cookMethod } = req.query;
    let query = 'SELECT * FROM meals WHERE 1=1';
    const params = [];

    if (protein && protein !== 'all') {
      query += ' AND protein = ?';
      params.push(protein);
    }

    if (cuisine && cuisine !== 'all') {
      query += ' AND cuisine = ?';
      params.push(cuisine);
    }

    if (cookTime && cookTime !== 'all') {
      query += ' AND cook_time = ?';
      params.push(cookTime);
    }

    if (cookMethod && cookMethod !== 'all') {
      query += ' AND cook_method = ?';
      params.push(cookMethod);
    }

    query += ' ORDER BY name';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error filtering meals:', error);
    res.status(500).json({ error: 'Failed to filter meals' });
  }
});

// Generate weekly menu
app.post('/api/menu/generate', async (req, res) => {
  try {
    const { proteinDistribution = {}, days = 7 } = req.body;
    // proteinDistribution example: { chicken: 3, beef: 2, veggie: 2 }
    
    // Get all meals
    const [allMeals] = await pool.execute('SELECT * FROM meals');
    
    // Group meals by protein
    const mealsByProtein = {};
    allMeals.forEach(meal => {
      if (!mealsByProtein[meal.protein]) mealsByProtein[meal.protein] = [];
      mealsByProtein[meal.protein].push(meal);
    });

    // Build menu based on proteinDistribution
    let menu = [];
    let usedMealIds = new Set();
    let totalAssigned = 0;
    Object.entries(proteinDistribution).forEach(([protein, count]) => {
      const availableMeals = (mealsByProtein[protein] || []).filter(m => !usedMealIds.has(m.id));
      // Shuffle available meals
      for (let i = availableMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableMeals[i], availableMeals[j]] = [availableMeals[j], availableMeals[i]];
      }
      for (let i = 0; i < count && i < availableMeals.length; i++) {
        menu.push(availableMeals[i]);
        usedMealIds.add(availableMeals[i].id);
        totalAssigned++;
      }
    });
    // Fill remaining days randomly
    if (totalAssigned < days) {
      const remainingMeals = allMeals.filter(m => !usedMealIds.has(m.id));
      // Shuffle
      for (let i = remainingMeals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingMeals[i], remainingMeals[j]] = [remainingMeals[j], remainingMeals[i]];
      }
      for (let i = 0; i < days - totalAssigned && i < remainingMeals.length; i++) {
        menu.push(remainingMeals[i]);
        usedMealIds.add(remainingMeals[i].id);
      }
    }
    // If still not enough meals, repeat random meals
    while (menu.length < days && allMeals.length > 0) {
      const randomMeal = allMeals[Math.floor(Math.random() * allMeals.length)];
      menu.push(randomMeal);
    }
    // Shuffle final menu
    for (let i = menu.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [menu[i], menu[j]] = [menu[j], menu[i]];
    }
    menu = menu.slice(0, days);

    // Get weather data for the week
    const weatherData = await getWeeklyWeather(days);
    // Generate dates for the week (start from today)
    const dates = generateWeekDates(days);
    // Attach date and weather to each menu item
    const menuWithMeta = menu.map((meal, index) => ({
      ...meal,
      date: dates[index],
      weather: weatherData[index] || null
    }));
    res.json(menuWithMeta);
  } catch (error) {
    console.error('Error generating menu:', error);
    res.status(500).json({ error: 'Failed to generate menu' });
  }
});

// Get weather data for a week (now accepts days param)
async function getWeeklyWeather(days = 7) {
  try {
    const lat = process.env.WEATHER_LAT || '40.7128';
    const lon = process.env.WEATHER_LON || '-74.0060';
    const response = await axios.get(
      `${WEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
    );
    // OpenWeatherMap returns 3-hour intervals, so 8 per day
    const dailyData = response.data.list.filter((item, index) => index % 8 === 0);
    const weatherData = [];
    for (let i = 0; i < days; i++) {
      if (dailyData[i]) {
        // Convert Celsius to Fahrenheit
        const tempC = dailyData[i].main.temp;
        const tempF = Math.round((tempC * 9) / 5 + 32);
        weatherData.push({
          temp: tempF,
          condition: dailyData[i].weather[0].main,
          description: dailyData[i].weather[0].description,
          icon: dailyData[i].weather[0].icon
        });
      } else {
        // If not enough data, repeat last available
        weatherData.push(weatherData[weatherData.length - 1] || null);
      }
    }
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather:', error);
    // Repeat last known or null for all
    return Array(days).fill(null);
  }
}

// Generate dates for the current week (now starts from today)
function generateWeekDates(days = 7) {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Add a new meal
app.post('/api/meals', async (req, res) => {
  try {
    const { name, protein, cuisine, cookTime, cookMethod, source, category } = req.body;
    
    const query = `
      INSERT INTO meals (name, protein, cuisine, cook_time, cook_method, source, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(query, [
      name, protein, cuisine, cookTime, cookMethod, source, category
    ]);
    
    res.json({ id: result.insertId, message: 'Meal added successfully' });
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Update a meal
app.put('/api/meals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, protein, cuisine, cookTime, cookMethod, source, category } = req.body;
    
    const query = `
      UPDATE meals 
      SET name = ?, protein = ?, cuisine = ?, cook_time = ?, cook_method = ?, source = ?, category = ?
      WHERE id = ?
    `;
    
    await pool.execute(query, [
      name, protein, cuisine, cookTime, cookMethod, source, category, id
    ]);
    
    res.json({ message: 'Meal updated successfully' });
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

// Delete a meal
app.delete('/api/meals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM meals WHERE id = ?', [id]);
    
    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Get unique values for filters
app.get('/api/filters', async (req, res) => {
  try {
    const [proteins] = await pool.execute('SELECT DISTINCT protein FROM meals WHERE protein IS NOT NULL ORDER BY protein');
    const [cuisines] = await pool.execute('SELECT DISTINCT cuisine FROM meals WHERE cuisine IS NOT NULL ORDER BY cuisine');
    const [cookTimes] = await pool.execute('SELECT DISTINCT cook_time FROM meals WHERE cook_time IS NOT NULL ORDER BY cook_time');
    const [cookMethods] = await pool.execute('SELECT DISTINCT cook_method FROM meals WHERE cook_method IS NOT NULL ORDER BY cook_method');
    
    res.json({
      proteins: proteins.map(row => row.protein),
      cuisines: cuisines.map(row => row.cuisine),
      cookTimes: cookTimes.map(row => row.cook_time),
      cookMethods: cookMethods.map(row => row.cook_method)
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}); 