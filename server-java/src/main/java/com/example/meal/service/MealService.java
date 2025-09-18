package com.example.meal.service;

import com.example.meal.Meal;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

/**
 * Service for generating meal plans based on user preferences.
 * Handles the complex logic of balancing protein requirements while ensuring variety.
 */
@Service
public class MealService {

    private static final Logger log = LoggerFactory.getLogger(MealService.class);

    private final JdbcTemplate jdbc;
    // Reusable mapper for converting database rows to Meal objects
    private final BeanPropertyRowMapper<Meal> mealRowMapper =
            new BeanPropertyRowMapper<>(Meal.class);

    public MealService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------- DATABASE OPERATIONS ----------------------

    // Get all meals from the database
    public List<Meal> getAllMeals() {
        return jdbc.query("""
                SELECT id, name, protein, cuisine,
                       cook_time AS cookTime, cook_method AS cookMethod, source
                  FROM meals
                """, mealRowMapper);
    }

    public Meal getMealById(Long id) {
        List<Meal> rows = jdbc.query("""
                SELECT id, name, protein, cuisine,
                       cook_time AS cookTime, cook_method AS cookMethod, source
                  FROM meals
                 WHERE id = ?
                """, mealRowMapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Meal addMeal(Meal meal) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO meals (name, protein, cuisine, cook_time, cook_method, source)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, safe(meal.getName()));
            ps.setString(2, safe(meal.getProtein()));
            ps.setString(3, safe(meal.getCuisine()));
            ps.setString(4, safe(meal.getCookTime()));
            ps.setString(5, safe(meal.getCookMethod()));
            ps.setString(6, safe(meal.getSource()));
            return ps;
        }, kh);
        Number key = kh.getKey();
        if (key != null) meal.setId(key.longValue());
        return meal;
    }

    public Meal updateMeal(Meal meal) {
        jdbc.update("""
                UPDATE meals
                   SET name = ?, protein = ?, cuisine = ?,
                       cook_time = ?, cook_method = ?, source = ?
                 WHERE id = ?
                """,
                safe(meal.getName()),
                safe(meal.getProtein()),
                safe(meal.getCuisine()),
                safe(meal.getCookTime()),
                safe(meal.getCookMethod()),
                safe(meal.getSource()),
                meal.getId());
        return getMealById(meal.getId());
    }

    public void deleteMeal(Long id) {
        jdbc.update("DELETE FROM meals WHERE id = ?", id);
    }

    // Get available filter options by checking what's actually in the database
    public Map<String, List<String>> getFilterOptions() {
        // Check what protein types we have and how many of each
        List<Map<String, Object>> allProteins = jdbc.queryForList("""
                SELECT protein, COUNT(*) as count
                FROM meals
                GROUP BY protein
                ORDER BY protein
                """);
        
        log.info("=== ALL PROTEIN VALUES IN DATABASE ===");
        for (Map<String, Object> row : allProteins) {
            String protein = (String) row.get("protein");
            Integer count = ((Number) row.get("count")).intValue();
            log.info("Protein: '{}' (length: {}, count: {})", 
                    protein, protein != null ? protein.length() : 0, count);
        }
        
        List<String> proteins = jdbc.queryForList("""
                SELECT DISTINCT TRIM(protein) AS val
                  FROM meals
                 WHERE protein IS NOT NULL AND TRIM(protein) <> ''
                 ORDER BY TRIM(protein)
                """, String.class);
        
        Map<String, List<String>> out = new HashMap<>();
        out.put("proteins", proteins);
        out.put("cuisines", new ArrayList<>()); // Empty list for backward compatibility
        
        log.info("=== CLEANED PROTEIN OPTIONS ===");
        for (String protein : proteins) {
            log.info("Available protein: '{}' (normalized: '{}')", protein, norm(protein));
        }
        
        return out;
    }

    // ---------------------- MENU GENERATION ----------------------

    /**
     * Generate a weekly menu that tries to match the user's protein preferences.
     * Uses a multi-step approach: satisfy constraints first, then fill remaining days.
     */
    @Transactional(readOnly = true)
    public List<Meal> generateMenu(Map<String, Integer> proteinDistribution,
                                   List<String> selectedCuisines, // Ignored for current implementation
                                   int days) {

        log.info("=== GENERATE MENU START ===");
        log.info("Input proteinDistribution: {}", proteinDistribution);
        log.info("Input days: {}", days);

        // Let's see what proteins are actually available in the database
        debugDatabaseProteins();

        // Use proteins exactly as provided (no normalization)
        log.info("Processing protein distribution without normalization: {}", proteinDistribution);

        // Calculate protein total and validate
        int proteinTotal = proteinDistribution != null ?
            proteinDistribution.values().stream().mapToInt(Integer::intValue).sum() : 0;

        // Validate that total protein selections don't exceed 7
        if (proteinTotal > 7) {
            throw new IllegalArgumentException("Total protein selections cannot exceed 7. Current total: " + proteinTotal);
        }

        // Always target the requested number of days (typically 7)
        int targetDays = days;
        log.info("Target days: {} (protein total: {}, requested days: {})", targetDays, proteinTotal, days);

        // Track our results and make sure we don't duplicate meals
        List<Meal> result = new ArrayList<>();
        Set<Long> usedIds = new HashSet<>();  // Fast lookup to avoid duplicate meals

        // Step 1: Try to satisfy the protein requirements first
        if (proteinDistribution != null && !proteinDistribution.isEmpty()) {
            log.info("Processing protein preferences...");

            // Go through each protein type the user wants
            for (Map.Entry<String, Integer> entry : proteinDistribution.entrySet()) {
                String protein = entry.getKey();
                Integer count = entry.getValue();

                // Skip null or zero values
                if (protein == null || count == null || count <= 0) {
                    continue;
                }

                log.info("=== PROCESSING PROTEIN: '{}' (need {} meals) ===", protein, count);

                List<Meal> proteinMeals = queryByProteinExact(protein);
                log.info("Found {} meals for protein '{}'", proteinMeals.size(), protein);
                
                if (proteinMeals.isEmpty()) {
                    log.warn("NO MEALS FOUND for protein: '{}'", protein);
                    log.warn("Let me check what's actually in the database for similar proteins...");
                    checkSimilarProteins(protein);
                    continue;
                }
                
                // Randomize the meal order so we get variety
                Collections.shuffle(proteinMeals);

                // Pick the requested number of meals for this protein
                int added = 0;
                for (Meal meal : proteinMeals) {
                    if (added >= count) break;
                    // Make sure we haven't already used this meal
                    if (meal.getId() != null && usedIds.add(meal.getId())) {
                        result.add(meal);
                        added++;
                        log.info("✓ Added meal: '{}' (id: {}, protein: '{}')",
                                meal.getName(), meal.getId(), meal.getProtein());
                    }
                }
                
                log.info("Result: Added {}/{} meals for protein '{}'", added, count, protein);
            }
        } else {
            log.info("No protein distribution specified, will use random meals");
        }

        // Step 2: Fill any remaining days with random meals
        if (result.size() < targetDays) {
            int needed = targetDays - result.size();
            log.info("Need {} more meals, filling with random options...", needed);

            List<Meal> allMeals = queryAllMeals();
            // Shuffle to get variety in our random picks
            Collections.shuffle(allMeals);
            
            int added = 0;
            for (Meal meal : allMeals) {
                if (added >= needed) break;
                if (meal.getId() != null && usedIds.add(meal.getId())) {
                    result.add(meal);
                    added++;
                    log.info("Filled slot with: '{}' (protein: {})", meal.getName(), meal.getProtein());
                }
            }
            
            log.info("Filled {} additional slots", added);
        }

        // Step 3: Final shuffle and trim to exact number needed
        Collections.shuffle(result);  // Mix up the order so it's not predictable
        if (result.size() > targetDays) {
            // Trim down to exactly what we need
            result = new ArrayList<>(result.subList(0, targetDays));
        }
        
        log.info("=== FINAL MENU SUMMARY ===");
        log.info("Total meals: {}", result.size());
        // Count up what we actually ended up with for debugging
        Map<String, Integer> finalCounts = new HashMap<>();
        for (Meal m : result) {
            String protein = m.getProtein();
            finalCounts.put(protein, finalCounts.getOrDefault(protein, 0) + 1);
        }
        log.info("Final protein distribution: {}", finalCounts);
        
        for (int i = 0; i < result.size(); i++) {
            Meal m = result.get(i);
            log.info("  {}. {} (id: {}, protein: '{}', cuisine: '{}')", 
                    i+1, m.getName(), m.getId(), m.getProtein(), m.getCuisine());
        }
        log.info("=== GENERATE MENU END ===");
        
        return result;
    }

    // ---------------------- Debug Methods ----------------------
    
    private void debugDatabaseProteins() {
        log.info("=== DATABASE PROTEIN DEBUG ===");
        List<Meal> allMeals = queryAllMeals();
        Set<String> uniqueProteins = new HashSet<>();
        
        for (Meal meal : allMeals) {
            String protein = meal.getProtein();
            uniqueProteins.add(protein);
            log.info("Meal '{}' has protein: '{}' (normalized: '{}')", 
                    meal.getName(), protein, norm(protein));
        }
        
        log.info("Unique proteins in database: {}", uniqueProteins);
    }
    
    private void checkSimilarProteins(String searchProtein) {
        log.info("Checking for proteins similar to '{}'...", searchProtein);
        
        List<String> allProteins = jdbc.queryForList("""
                SELECT DISTINCT protein
                FROM meals 
                WHERE protein IS NOT NULL
                """, String.class);
                
        for (String dbProtein : allProteins) {
            String normalizedDb = norm(dbProtein);
            if (normalizedDb.contains(searchProtein.toLowerCase()) || 
                searchProtein.toLowerCase().contains(normalizedDb)) {
                log.info("Similar protein found: '{}' (normalized: '{}')", dbProtein, normalizedDb);
            }
        }
    }

    // ---------------------- SQL helpers ----------------------

    private List<Meal> queryAllMeals() {
        return jdbc.query("""
                SELECT id, name, protein, cuisine,
                       cook_time AS cookTime, cook_method AS cookMethod, source
                  FROM meals
                """, mealRowMapper);
    }

    private List<Meal> queryByProteinExact(String protein) {
        log.info("=== SQL QUERY DEBUG ===");
        log.info("Searching for exact protein: '{}'", protein);

        List<Meal> meals = jdbc.query("""
                SELECT id, name, protein, cuisine,
                       cook_time AS cookTime, cook_method AS cookMethod, source
                  FROM meals
                 WHERE protein = ?
                """, mealRowMapper, protein);

        log.info("Found {} meals for exact protein match: '{}'", meals.size(), protein);

        return meals;
    }

    private List<Meal> queryByProteinNormalized(String proteinNorm) {
        log.info("=== SQL QUERY DEBUG ===");
        log.info("Searching for normalized protein: '{}'", proteinNorm);

        // Let's see what the actual SQL comparison looks like
        List<Map<String, Object>> debugResults = jdbc.queryForList("""
                SELECT id, name, protein, LOWER(TRIM(protein)) as normalized_protein
                FROM meals
                WHERE LOWER(TRIM(protein)) = ?
                """, proteinNorm);

        log.info("Debug query results:");
        for (Map<String, Object> row : debugResults) {
            log.info("  ID: {}, Name: '{}', Original Protein: '{}', Normalized: '{}'",
                    row.get("id"), row.get("name"), row.get("protein"), row.get("normalized_protein"));
        }

        List<Meal> meals = jdbc.query("""
                SELECT id, name, protein, cuisine,
                       cook_time AS cookTime, cook_method AS cookMethod, source
                  FROM meals
                 WHERE LOWER(TRIM(protein)) = ?
                """, mealRowMapper, proteinNorm);

        log.info("Actual meal objects returned: {}", meals.size());

        return meals;
    }

    // ---------------------- Helper methods ----------------------

    private static Map<String, Integer> normalizeProteins(Map<String, Integer> in) {
        Map<String, Integer> out = new LinkedHashMap<>();
        if (in == null) {
            return out;
        }
        
        for (Map.Entry<String, Integer> e : in.entrySet()) {
            String key = e.getKey();
            Integer value = e.getValue();
            
            if (key == null || value == null || value <= 0) {
                continue;
            }
            
            String normalizedKey = norm(key);
            if (!normalizedKey.isEmpty()) {
                out.put(normalizedKey, out.getOrDefault(normalizedKey, 0) + value);
            }
        }
        
        return out;
    }

    private static String norm(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }

    private static String safe(String s) { 
        return s == null ? "" : s; 
    }
}