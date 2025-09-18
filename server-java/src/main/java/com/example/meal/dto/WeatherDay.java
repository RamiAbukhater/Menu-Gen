package com.example.meal.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

public class WeatherDay {
    private LocalDate date;
    @JsonProperty("tempF")
    private int tempF;
    private String condition;
    private String description;

    public WeatherDay() {}
    public WeatherDay(LocalDate date, int tempF, String condition, String description) {
        this.date = date; this.tempF = tempF; this.condition = condition; this.description = description;
    }
    public LocalDate getDate() { return date; }
    public int getTempF() { return tempF; }
    public String getCondition() { return condition; }
    public String getDescription() { return description; }
    public void setDate(LocalDate d){ this.date=d; }
    public void setTempF(int t){ this.tempF=t; }
    public void setCondition(String c){ this.condition=c; }
    public void setDescription(String d){ this.description=d; }
}
