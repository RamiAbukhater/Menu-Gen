package com.example.meal;

import com.example.meal.dto.WeatherDay;
import com.example.meal.service.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin(origins = {"http://localhost:3000"})
public class WeatherController {

    private final WeatherService weatherService;

    @Autowired
    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    // GET /api/weather/forecast?days=7&startDate=2025-09-02
    @GetMapping("/forecast")
    public List<WeatherDay> forecast(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate
    ) {
        return weatherService.getDailyForecast(days, startDate);
    }
}
