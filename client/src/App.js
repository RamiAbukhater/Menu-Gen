import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Printer, RefreshCw, Filter, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

function App() {
  // Backdrop and font options for print customization
  const floralBackdrops = [
    { name: 'Original', gradient: 'white' },
    { name: 'Rose Garden', gradient: 'linear-gradient(135deg, #ffeaa7, #fab1a0, #fd79a8)' },
    { name: 'Lavender Fields', gradient: 'linear-gradient(135deg, #a29bfe, #6c5ce7, #fd79a8)' },
    { name: 'Sunflower Meadow', gradient: 'linear-gradient(135deg, #fdcb6e, #e17055, #fd79a8)' },
    { name: 'Cherry Blossom', gradient: 'linear-gradient(135deg, #fd79a8, #fdcb6e, #e84393)' },
    { name: 'Garden Fresh', gradient: 'linear-gradient(135deg, #00b894, #00cec9, #74b9ff)' }
  ];

  const stylizedFonts = [
    { name: 'Classic', family: 'Georgia, serif' },
    { name: 'Modern', family: '"Helvetica Neue", Arial, sans-serif' },
    { name: 'Elegant', family: '"Times New Roman", serif' },
    { name: 'Casual', family: '"Comic Sans MS", cursive' },
    { name: 'Script', family: '"Brush Script MT", cursive' }
  ];

  // State management - simplified without cuisine
  const [proteinOptions, setProteinOptions] = useState([]);
  const [proteinDistribution, setProteinDistribution] = useState({});
  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [menu, setMenu] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [selectedBackdrop, setSelectedBackdrop] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const printRef = React.useRef();

  // Clean up weather condition strings - handles API inconsistencies
  const normalizeCondition = (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    const first = raw.split(/\s+/)[0].toLowerCase();
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  // Extract only the proteins with actual counts for the API
  const getActiveProteins = () => {
    const activeProteins = {};
    Object.entries(proteinDistribution).forEach(([protein, value]) => {
      const numValue = parseInt(value, 10) || 0;
      if (numValue > 0) {
        activeProteins[protein] = numValue;
      }
    });
    return activeProteins;
  };

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const response = await axios.get('/api/filters');
      const { proteins = [] } = response.data;

      setProteinOptions(proteins);

      const initialDist = {};
      proteins.forEach(protein => {
        initialDist[protein] = '';
      });
      setProteinDistribution(initialDist);
    } catch (error) {
      setError('Failed to load filter options');
    }
  };

  const updateProteinCount = (protein, value) => {
    if (value === '') {
      setProteinDistribution(prev => ({
        ...prev,
        [protein]: ''
      }));
    } else {
      const numValue = Math.max(0, Math.min(7, parseInt(value, 10) || 0));
      setProteinDistribution(prev => ({
        ...prev,
        [protein]: numValue.toString()
      }));
    }
  };

  // Match weather data to each meal by date - using Map for fast lookups
  const attachWeatherByDate = (items, forecast, startIso) => {
    // Build a lookup table so we don't have to search the array every time
    const weatherByDate = new Map();
    (forecast || []).forEach(day => {
      weatherByDate.set(String(day.date), day);
    });

    // Calculate dates for each meal day
    const start = new Date(`${startIso}T00:00:00`);
    return items.map((meal, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = format(date, 'yyyy-MM-dd');

      // Quick lookup instead of searching the whole weather array
      const weatherData = weatherByDate.get(iso);

      return {
        ...meal,
        date: iso,
        weather: weatherData || null
      };
    });
  };

  // Generate a new menu with the selected protein preferences
  const generateMenu = async () => {
    setLoading(true);
    setError('');

    try {
      const requestPayload = {
        proteinDistribution: getActiveProteins(),
        days: 7,
        startDate
      };

      const response = await axios.post('/api/menu/generate', requestPayload);
      let menuItems = response.data || [];

      // Try to get weather data, but don't break if weather API fails
      try {
        const weatherResponse = await axios.get('/api/weather/forecast', {
          params: { days: menuItems.length || 7, startDate }
        });
        const forecast = Array.isArray(weatherResponse.data) ? weatherResponse.data : [];
        menuItems = attachWeatherByDate(menuItems, forecast, startDate);
      } catch (weatherError) {
        // Still show the menu even if weather is unavailable
        menuItems = attachWeatherByDate(menuItems, [], startDate);
      }

      setMenu(menuItems);
      setSelectedMeals({});
    } catch (error) {
      setError('Failed to generate menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Shuffle only the meals that aren't marked as "keep"
  const shuffleMenu = async () => {
    setLoading(true);
    setError('');

    try {
      // Find which meals the user wants to keep vs. replace
      const mealsToShuffleIndexes = menu
        .map((_, index) => index)
        .filter(index => !selectedMeals[index]);

      if (mealsToShuffleIndexes.length === 0) {
        setLoading(false);
        return;
      }

      const shuffleResponse = await axios.post('/api/menu/generate', {
        proteinDistribution: getActiveProteins(),
        days: mealsToShuffleIndexes.length,
        startDate
      });

      const newMenu = [...menu];
      shuffleResponse.data.forEach((newMeal, shuffleIndex) => {
        if (shuffleIndex < mealsToShuffleIndexes.length) {
          const menuIndex = mealsToShuffleIndexes[shuffleIndex];
          newMenu[menuIndex] = {
            ...newMeal,
            date: newMenu[menuIndex].date // Preserve the date
          };
        }
      });

      // Re-fetch weather and attach
      try {
        const weatherResponse = await axios.get('/api/weather/forecast', {
          params: { days: newMenu.length || 7, startDate }
        });
        const forecast = Array.isArray(weatherResponse.data) ? weatherResponse.data : [];
        setMenu(attachWeatherByDate(newMenu, forecast, startDate));
      } catch (weatherError) {
        setMenu(newMenu);
      }
    } catch (error) {
      setError('Failed to shuffle menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMealSelection = (index) => {
    setSelectedMeals(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Map weather conditions to appropriate emoji icons
  const getWeatherIcon = (condition) => {
    const iconMap = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Snow': '❄️',
      'Thunderstorm': '⛈️',
      'Drizzle': '🌦️',
      'Mist': '🌫️',
      'Smoke': '🌫️',
      'Haze': '🌫️',
      'Dust': '🌫️',
      'Fog': '🌫️',
      'Sand': '🌫️',
      'Ash': '🌫️',
      'Squall': '💨',
      'Tornado': '🌪️'
    };
    return iconMap[condition] || '🌤️';
  };

  // Set up printing with custom backdrop and font styling
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Weekly Menu',
    onBeforeGetContent: () => {
      // Apply the selected backdrop and font before printing
      const printSection = printRef.current;
      if (printSection) {
        printSection.style.background = floralBackdrops[selectedBackdrop].gradient;
        // Only change the header font, not the whole menu
        const menuTitle = printSection.querySelector('.menu-title');
        if (menuTitle) {
          menuTitle.style.fontFamily = stylizedFonts[selectedFont].family;
        }
      }
    },
    pageStyle: `
      @page { size: Letter; margin: 0.4in; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .card { box-shadow: none !important; border: none !important; }
      .print-section { padding: 12px !important; border-radius: 8px !important; }
      .menu-content { font-size: 9px !important; gap: 8px !important; }
      .menu-item {
        padding: 4px 8px !important;
        gap: 6px !important;
        break-inside: avoid;
        background: white !important;
        border: 1px solid #ddd !important;
        border-radius: 6px !important;
        margin-bottom: 6px !important;
      }
      .menu-item-header { gap: 8px !important; margin-bottom: 4px !important; }
      .meal-name { font-size: 11px !important; font-weight: bold !important; line-height: 1.2 !important; }
      .meal-details { font-size: 8px !important; gap: 4px !important; }
      .meal-tag { padding: 2px 6px !important; font-size: 7px !important; }
      .meal-detail { font-size: 8px !important; gap: 2px !important; }
      .menu-day { min-width: 70px !important; }
      .day-name { font-size: 12px !important; }
      .day-date { font-size: 9px !important; padding: 1px 4px !important; }
      .weather-info { font-size: 9px !important; gap: 3px !important; }
      .weather-icon { font-size: 10px !important; }
      .menu-print-header { margin-bottom: 10px !important; padding-bottom: 8px !important; }
      .menu-title { font-size: 20px !important; margin-bottom: 3px !important; }
      .menu-date-range { font-size: 11px !important; }
    `
  });

  // Count up how many total days of protein preferences are set
  const getTotalDays = () => {
    return Object.values(proteinDistribution).reduce((sum, value) => {
      const numValue = parseInt(value, 10) || 0;
      return sum + numValue;
    }, 0);
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-8">
          Weekly Menu Generator
        </h1>
        
        {/* Menu Preferences Section */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Filter size={20} />
            Menu Preferences
          </h2>
          
          {/* Start Date */}
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Protein Distribution */}
          <div className="form-group">
            <label>
              Proteins (days per week - optional)
              <span className="protein-total">
                Total: {getTotalDays()} days
              </span>
            </label>
            <div className="protein-grid">
              {proteinOptions.map((protein) => (
                <div className="protein-item" key={protein}>
                  <label className="protein-label">{protein}</label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    className="protein-input"
                    value={proteinDistribution[protein] || ''}
                    placeholder="0"
                    onChange={(e) => updateProteinCount(protein, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button 
              className="btn btn-primary"
              onClick={generateMenu}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Menu'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-card">
            <p>{error}</p>
          </div>
        )}

        {/* Menu Display */}
        {menu.length > 0 && (
          <div className="card">
            <div className="menu-header-controls">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar size={20} />
                Your Weekly Menu
              </h2>
              <div className="menu-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={shuffleMenu}
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                  Shuffle Unchecked
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowPrintPopup(true)}
                >
                  <Printer size={16} />
                  Finish and Print
                </button>
              </div>
            </div>

            <div ref={printRef} className="print-section">
              <div className="menu-print-header">
                <h2 className="menu-title">Weekly Meal Plan</h2>
                <div className="menu-date-range">
                  {(() => {
                    const start = new Date(`${startDate}T00:00:00`);
                    const end = new Date(start);
                    end.setDate(start.getDate() + (menu.length - 1));
                    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
                    return sameMonth
                      ? `${format(start, 'MMMM d')}–${format(end, 'd, yyyy')}`
                      : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
                  })()}
                </div>
              </div>

              <div className="menu-content">
                {menu.map((meal, index) => {
                  // Day names for display
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  // Figure out what day this meal is for
                  const dayDate = meal?.date
                    ? new Date(`${meal.date}T00:00:00`)
                    : new Date(new Date(`${startDate}T00:00:00`).getTime() + index * 24 * 60 * 60 * 1000);
                  
                  const dayName = dayNames[dayDate.getDay()];
                  const date = format(dayDate, 'd');
                  
                  // Extract temperature data - different weather APIs use different field names
                  const w = meal?.weather || null;
                  const tempF = w ? (Number(w.tempF ?? w.temp_f ?? w.temp ?? w.temperatureF ?? w.temperature)) : null;
                  const condition = normalizeCondition(w?.condition || w?.main || w?.summary || '');
                  const hasTemp = Number.isFinite(tempF);

                  return (
                    <div className="menu-item" key={meal.id ?? index}>
                      <div className="menu-item-header">
                        <div className="menu-day">
                          <div className="day-info">
                            <div className="day-name">{dayName}</div>
                            <div className="day-date">{date}</div>
                          </div>
                          <div className="weather-info">
                            <span className="weather-icon">{getWeatherIcon(condition)}</span>
                            <span className="weather-temp">
                              {hasTemp ? `${Math.round(tempF)}°F` : '—'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="keep-checkbox no-print">
                          <input
                            id={`keep-${index}`}
                            type="checkbox"
                            checked={!!selectedMeals[index]}
                            onChange={() => toggleMealSelection(index)}
                          />
                          <label htmlFor={`keep-${index}`}>Keep</label>
                        </div>
                      </div>
                      
                      <div className="meal-info">
                        <div className="meal-name">{meal.name}</div>
                        <div className="meal-details">
                          {meal.protein && (
                            <span className="meal-tag protein-tag">{meal.protein}</span>
                          )}
                          {meal.cuisine && (
                            <span className="meal-tag cuisine-tag">{meal.cuisine}</span>
                          )}
                          {meal.cookTime && (
                            <span className="meal-detail">⏱️ {meal.cookTime}</span>
                          )}
                          {meal.cookMethod && (
                            <span className="meal-detail">🍳 {meal.cookMethod}</span>
                          )}
                          {meal.source && (
                            <span className="meal-detail">📖 {meal.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Print Customization Popup */}
        {showPrintPopup && (
          <div className="print-popup-overlay">
            <div className="print-popup">
              <div className="popup-header">
                <h3>Customize Your Menu</h3>
                <button
                  className="close-popup"
                  onClick={() => setShowPrintPopup(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="popup-content">
                {/* Backdrop Selection */}
                <div className="customization-section">
                  <label>Floral Backdrop</label>
                  <div className="selection-row">
                    <button
                      className="nav-arrow"
                      onClick={() => setSelectedBackdrop(prev =>
                        prev === 0 ? floralBackdrops.length - 1 : prev - 1
                      )}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div
                      className="backdrop-preview"
                      style={{ background: floralBackdrops[selectedBackdrop].gradient }}
                    >
                      <span>{floralBackdrops[selectedBackdrop].name}</span>
                    </div>
                    <button
                      className="nav-arrow"
                      onClick={() => setSelectedBackdrop(prev =>
                        (prev + 1) % floralBackdrops.length
                      )}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {/* Font Selection */}
                <div className="customization-section">
                  <label>Header Font Style</label>
                  <div className="selection-row">
                    <button
                      className="nav-arrow"
                      onClick={() => setSelectedFont(prev =>
                        prev === 0 ? stylizedFonts.length - 1 : prev - 1
                      )}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div
                      className="font-preview"
                      style={{ fontFamily: stylizedFonts[selectedFont].family }}
                    >
                      <span>Weekly Meal Plan</span>
                      <small>{stylizedFonts[selectedFont].name}</small>
                    </div>
                    <button
                      className="nav-arrow"
                      onClick={() => setSelectedFont(prev =>
                        (prev + 1) % stylizedFonts.length
                      )}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="popup-actions">
                <button
                  className="btn btn-primary print-final-btn"
                  onClick={() => {
                    setShowPrintPopup(false);
                    setTimeout(handlePrint, 100); // Small delay to ensure popup closes
                  }}
                >
                  <Printer size={16} />
                  Print Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;