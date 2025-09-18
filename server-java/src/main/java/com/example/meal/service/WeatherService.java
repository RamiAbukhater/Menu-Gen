package com.example.meal.service;

import com.example.meal.dto.WeatherDay;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
public class WeatherService {
    private static final Logger log = LoggerFactory.getLogger(WeatherService.class);

    @Value("${weather.lat:}")
    private String latProp;

    @Value("${weather.lon:}")
    private String lonProp;

    @Value("${weather.tz:America/Los_Angeles}")
    private String tzProp;

    // Allowed: "midday" (default), "max", "min", "mean"
    @Value("${weather.temp:midday}")
    private String tempMode;

    // Treat as sunny if cloud cover <= this %
    private static final int SUNNY_CLOUD_THRESHOLD = 35;

    private static final double DEFAULT_LAT = 37.3382;   // San Jose, CA
    private static final double DEFAULT_LON = -121.8863;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    /** Backward-compat entry point */
    public List<WeatherDay> getDailyForecast(int days) {
        return getDailyForecast(days, null);
    }

    /** Honors chosen startDate (may be null → today in configured tz). ALWAYS returns. */
    public List<WeatherDay> getDailyForecast(int days, LocalDate startOverride) {
        final int d = Math.max(1, Math.min(days, 14)); // clamp 1..14

        final ZoneId zone = safeZoneId(tzProp);
        final LocalDate start = (startOverride != null) ? startOverride : LocalDate.now(zone);
        final LocalDate end = start.plusDays(d - 1);

        final double lat = parseOrDefault(latProp, DEFAULT_LAT);
        final double lon = parseOrDefault(lonProp, DEFAULT_LON);

        final String tempPref = safeLower(tempMode); // midday|max|min|mean
        final boolean useMidday = tempPref.isEmpty() || tempPref.equals("midday") || tempPref.equals("daytime");

        final String tempDailyField = switch (tempPref) {
            case "min" -> "temperature_2m_min";
            case "mean", "avg", "average" -> "temperature_2m_mean";
            // default branch won't be used if useMidday=true, but include for fallback:
            default -> "temperature_2m_max";
        };

        final String tzForUrl = encodeTimezone(zone.getId());
        final String url = String.format(
                "https://api.open-meteo.com/v1/forecast?latitude=%f&longitude=%f"
                        + "&daily=%s,weathercode"
                        + "&hourly=weathercode,cloudcover,temperature_2m"
                        + "&temperature_unit=fahrenheit"
                        + "&timezone=%s"
                        + "&start_date=%s&end_date=%s",
                lat, lon, tempDailyField, tzForUrl, start, end
        );

        log.info("WeatherService: lat={}, lon={}, tz={}, tempMode={}, start={}, end={}",
                lat, lon, zone.getId(), tempPref, start, end);
        log.info("WeatherService: GET {}", url);

        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url)).GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                log.warn("Open-Meteo non-2xx status: {}", res.statusCode());
                return stubForecast(d, start);
            }

            JsonNode root = mapper.readTree(res.body());

            // Daily series
            JsonNode daily = root.path("daily");
            JsonNode dates = daily.path("time");
            JsonNode tempsDaily = daily.path(tempDailyField);
            JsonNode dailyCodes = daily.path("weathercode");

            // Hourly series
            JsonNode hourly = root.path("hourly");
            JsonNode hourlyTimes = hourly.path("time");
            JsonNode hourlyCodes = hourly.path("weathercode");
            JsonNode hourlyClouds = hourly.path("cloudcover");
            JsonNode hourlyTemps = hourly.path("temperature_2m");

            List<WeatherDay> out = new ArrayList<>();
            int n = Math.min(Math.min(dates.size(), tempsDaily.size()), dailyCodes.size());

            for (int i = 0; i < Math.min(n, d); i++) {
                LocalDate date = LocalDate.parse(dates.get(i).asText());

                // Default values from daily series
                int dailyTempF = (int) Math.round(tempsDaily.get(i).asDouble());
                int code = dailyCodes.get(i).asInt();

                // Try to pick the sunniest mid-day hour (11–15) and use that hour both for icon + temp
                MiddayPick pick = pickSunniestMidday(date, hourlyTimes, hourlyCodes, hourlyClouds, hourlyTemps);
                Integer tempMidday = (pick != null) ? pick.tempF : null;
                if (pick != null) code = pick.code; // icon based on sunniest hour
                int tempF = (useMidday && tempMidday != null) ? tempMidday : dailyTempF;

                // Map to your icon categories with sunny bias when clouds are low
                String condition = mapWmoToConditionWithSunBias(code, (pick != null) ? pick.cloudCover : null);
                String description = mapWmoToDescription(code);

                out.add(new WeatherDay(date, tempF, condition, description));

                if (pick != null) {
                    log.info("WX {}: temp={}°F (hour {}), code={}, clouds={}%% → condition={}",
                            date, tempF, pick.hour, code, pick.cloudCover, condition);
                } else {
                    log.info("WX {}: temp={}°F (daily {}), code={} → condition={}",
                            date, tempF, tempDailyField, code, condition);
                }
            }

            while (out.size() < d) {
                out.add(new WeatherDay(start.plusDays(out.size()), 72, "Clear", "clear sky"));
            }

            if (!out.isEmpty()) {
                WeatherDay first = out.get(0);
                log.info("WeatherService: first day {} => {}°F, {}, desc='{}'",
                        first.getDate(), first.getTempF(), first.getCondition(), first.getDescription());
            }
            return out;

        } catch (Exception e) {
            log.error("Open-Meteo error: {}", e.toString());
            return stubForecast(d, start);
        }
    }

    /** Pick the 11–15 local hour with the LOWEST cloud cover; capture its code and temperature (°F). */
    private static MiddayPick pickSunniestMidday(LocalDate date, JsonNode hourlyTimes, JsonNode hourlyCodes,
                                                 JsonNode hourlyClouds, JsonNode hourlyTemps) {
        if (hourlyTimes.isMissingNode() || hourlyCodes.isMissingNode()) return null;

        String dIso = date.toString();
        List<Integer> idxs = new ArrayList<>();
        for (int i = 0; i < hourlyTimes.size(); i++) {
            String t = hourlyTimes.get(i).asText();
            if (!t.startsWith(dIso + "T")) continue;
            String hh = (t.length() >= 13) ? t.substring(11, 13) : "";
            if ("11".equals(hh) || "12".equals(hh) || "13".equals(hh) || "14".equals(hh) || "15".equals(hh)) {
                idxs.add(i);
            }
        }
        if (idxs.isEmpty()) return null;

        int bestIdx = -1, bestCloud = 101;
        for (int i : idxs) {
            int cc = 50;
            if (!hourlyClouds.isMissingNode() && hourlyClouds.size() == hourlyTimes.size()
                    && hourlyClouds.get(i).isNumber()) {
                cc = hourlyClouds.get(i).asInt();
            }
            if (cc < bestCloud) {
                bestCloud = cc;
                bestIdx = i;
            }
        }
        if (bestIdx == -1) bestIdx = idxs.get(0); // fallback

        String hour = hourlyTimes.get(bestIdx).asText();
        int code = hourlyCodes.get(bestIdx).asInt();
        int cloud = bestCloud;
        Integer tempF = null;
        if (!hourlyTemps.isMissingNode() && hourlyTemps.size() == hourlyTimes.size()
                && hourlyTemps.get(bestIdx).isNumber()) {
            tempF = (int) Math.round(hourlyTemps.get(bestIdx).asDouble());
        }
        return new MiddayPick(hour, code, cloud, tempF);
    }

    private static final class MiddayPick {
        final String hour;     // e.g. "2025-09-02T12:00"
        final int code;        // WMO code
        final int cloudCover;  // 0..100
        final Integer tempF;   // may be null if hourly temp missing
        MiddayPick(String hour, int code, int cloudCover, Integer tempF) {
            this.hour = hour; this.code = code; this.cloudCover = cloudCover; this.tempF = tempF;
        }
    }

    // ---- helpers & mappings ----

    private static ZoneId safeZoneId(String id) {
        try { return ZoneId.of(id); } catch (Exception e) { return ZoneId.systemDefault(); }
    }
    private static double parseOrDefault(String s, double def) {
        if (s == null) return def;
        String t = s.trim();
        if (t.isEmpty()) return def;
        try { return Double.parseDouble(t); } catch (NumberFormatException e) { return def; }
    }
    private static String encodeTimezone(String tz) { return tz.replace("/", "%2F").replace(" ", "%20"); }
    private static String safeLower(String s) { return s == null ? "" : s.trim().toLowerCase(); }

    private static List<WeatherDay> stubForecast(int days, LocalDate start) {
        List<WeatherDay> out = new ArrayList<>(days);
        for (int i = 0; i < days; i++) out.add(new WeatherDay(start.plusDays(i), 72, "Clear", "clear sky"));
        return out;
    }

    /** Sunny bias mapping: keep precip/fog as-is; otherwise use cloud threshold to choose Clear vs Clouds. */
    private static String mapWmoToConditionWithSunBias(int code, Integer cloudCover) {
        if (code == 45 || code == 48) return "Mist"; // fog
        if (code >= 51 && code <= 57) return "Drizzle";
        if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
        if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "Snow";
        if (code == 95 || code == 96 || code == 99) return "Thunderstorm";
        int cc = (cloudCover == null) ? 50 : Math.max(0, Math.min(100, cloudCover));
        return (cc <= SUNNY_CLOUD_THRESHOLD) ? "Clear" : "Clouds";
    }

    private static String mapWmoToDescription(int code) {
        return switch (code) {
            case 0 -> "clear sky";
            case 1 -> "mainly clear";
            case 2 -> "partly cloudy";
            case 3 -> "overcast";
            case 45, 48 -> "fog";
            case 51, 53, 55 -> "drizzle";
            case 56, 57 -> "freezing drizzle";
            case 61, 63, 65 -> "rain";
            case 66, 67 -> "freezing rain";
            case 71, 73, 75 -> "snow";
            case 77 -> "snow grains";
            case 80, 81, 82 -> "rain showers";
            case 85, 86 -> "snow showers";
            case 95 -> "thunderstorm";
            case 96, 99 -> "thunderstorm with hail";
            default -> "cloudy";
        };
    }
}
