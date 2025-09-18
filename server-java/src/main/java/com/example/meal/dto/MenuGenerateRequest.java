package com.example.meal.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

public class MenuGenerateRequest {
    @JsonProperty("proteinDistribution")
    private Map<String, Integer> proteinDistribution; // {"Chicken":2, ...}
    @JsonProperty("days")
    private Integer days;                              // 7
    @JsonProperty("startDate")
    private String startDate;                          // "YYYY-MM-DD" (client uses it; service ignores)

    public Map<String, Integer> getProteinDistribution() { return proteinDistribution; }
    public void setProteinDistribution(Map<String, Integer> proteinDistribution) { this.proteinDistribution = proteinDistribution; }

    public Integer getDays() { return days; }
    public void setDays(Integer days) { this.days = days; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    @Override
    public String toString() {
        return "MenuGenerateRequest{" +
                "proteinDistribution=" + proteinDistribution +
                ", days=" + days +
                ", startDate='" + startDate + '\'' +
                '}';
    }
}