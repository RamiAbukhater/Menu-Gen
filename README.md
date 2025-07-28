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

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL server (on Synology NAS or local)
- OpenWeatherMap API key (free tier available)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd menu-gen
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

### 3. Database Setup

1. **On your Synology NAS:**

   - Install MySQL/MariaDB package
   - Create a new database called `menu_gen`
   - Create a database user with appropriate permissions

2. **Import the database schema:**
   ```bash
   mysql -h <your-nas-ip> -u <username> -p < database/schema.sql
   ```

### 4. Environment Configuration

1. **Copy the example environment file:**

   ```bash
   cp server/env.example server/.env
   ```

2. **Edit `server/.env` with your settings:**

   ```env
   # Database Configuration
   DB_HOST=192.168.1.100  # Your Synology NAS IP
   DB_USER=menu_user
   DB_PASSWORD=your_secure_password
   DB_NAME=menu_gen

   # Server Configuration
   PORT=5000

   # Weather API Configuration
   WEATHER_API_KEY=your_openweathermap_api_key
   WEATHER_LAT=40.7128  # Your latitude
   WEATHER_LON=-74.0060 # Your longitude
   ```

### 5. Get OpenWeatherMap API Key

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key
4. Add it to your `.env` file

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Start both frontend and backend
npm run dev

# Or start them separately:
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

### Production Mode

```bash
# Build the frontend
npm run build

# Start the server
cd server
npm start
```

## 🌐 Accessing the Application

- **Development**: http://localhost:3000
- **Production**: http://your-server-ip:5000

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

## 🔧 Configuration Options

### Customizing Weather Location

Edit the `WEATHER_LAT` and `WEATHER_LON` values in your `.env` file:

```env
WEATHER_LAT=40.7128  # Your latitude
WEATHER_LON=-74.0060 # Your longitude
```

### Adding New Meals

You can add new meals through the API or directly in the database:

```sql
INSERT INTO meals (name, protein, cuisine, cook_time, cook_method, source, category)
VALUES ('Your Meal Name', 'Protein Type', 'Cuisine', 'Cook Time', 'Method', 'Source', 'Category');
```

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

## 🔒 Security Considerations

### Environment Variables

- **NEVER commit your `.env` file to version control**
- The `.gitignore` file is configured to exclude `.env` files
- Use `server/env.example` as a template for your environment variables
- Keep your API keys and database credentials secure

### Sensitive Information Protection

- Database passwords and connection strings
- API keys (OpenWeatherMap, etc.)
- Server configuration details
- SSL certificates and private keys

### Best Practices

- Use strong, unique passwords for your database
- Consider using HTTPS in production
- Regularly update dependencies for security patches
- Use environment-specific configuration files
- Never hardcode sensitive information in your source code

### Repository Security

- The `.gitignore` file excludes:
  - `.env` files (environment variables)
  - `node_modules/` (dependencies)
  - Log files and temporary files
  - IDE configuration files
  - Database files and backups
  - SSL certificates and keys

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Check your Synology NAS IP address
   - Verify database credentials
   - Ensure MySQL service is running

2. **Weather Data Not Loading**

   - Verify your OpenWeatherMap API key
   - Check your latitude/longitude coordinates
   - Ensure internet connectivity

3. **Port Already in Use**
   - Change the PORT in your `.env` file
   - Kill processes using the port: `lsof -ti:5000 | xargs kill -9`

### Logs

Check the server console for detailed error messages and debugging information.

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub

---

**Happy Menu Planning! 🍽️**
