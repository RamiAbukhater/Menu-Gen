import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Printer, RefreshCw, Filter, Calendar, Cloud } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

function App() {
  // Only keep proteinDistribution for preferences
  const [proteinDistribution, setProteinDistribution] = useState({});
  const [filterOptions, setFilterOptions] = useState({ proteins: [] });
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMeals, setSelectedMeals] = useState({});
  const printRef = React.useRef();

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get('/api/filters');
      setFilterOptions({ proteins: response.data.proteins });
      // Initialize proteinDistribution with 0 for each protein
      const initialDist = {};
      response.data.proteins.forEach(p => { initialDist[p] = 0; });
      setProteinDistribution(initialDist);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      setError('Failed to load filter options');
    }
  };

  const generateMenu = async () => {
    setLoading(true);
    setError('');
    try {
      // Only send nonzero proteins
      const dist = {};
      Object.entries(proteinDistribution).forEach(([k, v]) => { if (v > 0) dist[k] = v; });
      const response = await axios.post('/api/menu/generate', {
        proteinDistribution: dist,
        days: 7
      });
      setMenu(response.data);
      // Do not reset selectedMeals so checkboxes persist
    } catch (error) {
      console.error('Error generating menu:', error);
      setError('Failed to generate menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shuffleMenu = async () => {
    setLoading(true);
    setError('');
    try {
      // Get meals to keep (checked ones)
      const mealsToKeep = menu.filter((_, index) => selectedMeals[index]);
      const mealsToShuffle = menu.filter((_, index) => !selectedMeals[index]);
      // Generate new meals for the ones to shuffle
      const dist = {};
      Object.entries(proteinDistribution).forEach(([k, v]) => { if (v > 0) dist[k] = v; });
      const shuffleResponse = await axios.post('/api/menu/generate', {
        proteinDistribution: dist,
        days: mealsToShuffle.length
      });
      // Combine kept meals with new shuffled meals
      const newMenu = [...menu];
      let shuffleIndex = 0;
      for (let i = 0; i < newMenu.length; i++) {
        if (!selectedMeals[i] && shuffleResponse.data[shuffleIndex]) {
          newMenu[i] = {
            ...shuffleResponse.data[shuffleIndex],
            date: newMenu[i].date,
            weather: newMenu[i].weather
          };
          shuffleIndex++;
        }
      }
      setMenu(newMenu);
      // Do not reset selectedMeals so checkboxes persist
    } catch (error) {
      console.error('Error shuffling menu:', error);
      setError('Failed to shuffle menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });



  const toggleMealSelection = (index) => {
    setSelectedMeals(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

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

  return (
    <div className="container">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-8">
          🍽️ Weekly Menu Generator
        </h1>
        {/* Protein Distribution Section */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Filter size={20} />
            Menu Preferences
          </h2>
          <div className="grid grid-2">
            {filterOptions.proteins.map(protein => (
              <div className="form-group" key={protein}>
                <label>{protein}</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  className="form-control"
                  value={proteinDistribution[protein] || 0}
                  onChange={e => {
                    const val = Math.max(0, Math.min(7, parseInt(e.target.value) || 0));
                    setProteinDistribution(prev => ({ ...prev, [protein]: val }));
                  }}
                />
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <button 
              className="btn"
              onClick={generateMenu}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Weekly Menu'}
            </button>
          </div>
        </div>
        {error && (
          <div className="card" style={{ background: '#fee', border: '1px solid #fcc' }}>
            <p className="text-center text-red-600">{error}</p>
          </div>
        )}
        {/* Menu Display */}
        {menu.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar size={20} />
                Your Weekly Menu
              </h2>
              <div className="flex gap-2">
                <button 
                  className="btn btn-secondary"
                  onClick={shuffleMenu}
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                  Shuffle Unchecked
                </button>
                <button 
                  className="btn"
                  onClick={handlePrint}
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>
            </div>
            <div ref={printRef} className="print-section">
              <div className="menu-header">
                <h2 className="menu-title">Weekly Meal Plan</h2>
                <div className="menu-date">{format(new Date(), 'MMMM yyyy')}</div>
              </div>
              <div className="menu-content">
                {menu.map((meal, index) => {
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const dayName = dayNames[index];
                  const date = format(new Date(meal.date), 'd');
                  return (
                    <div key={index} className="menu-item">
                      <div className="checkbox-container no-print">
                        <input
                          type="checkbox"
                          checked={selectedMeals[index] || false}
                          onChange={() => toggleMealSelection(index)}
                        />
                        <label>Keep this meal</label>
                      </div>
                      <div className="menu-day">
                        <div className="day-name">{dayName}</div>
                        <div className="day-date">{date}</div>
                      </div>
                      <div className="menu-meal">
                        <div className="meal-name">{meal.name}</div>
                        {meal.protein && <div className="meal-detail">{meal.protein}</div>}
                        {meal.cuisine && <div className="meal-detail">{meal.cuisine}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 