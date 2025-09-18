package com.example.meal;

import com.example.meal.dto.MenuGenerateRequest;
import com.example.meal.service.MealService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

/**
 * REST API endpoints for menu generation.
 * Handles HTTP requests and delegates business logic to the service layer.
 */
@RestController
@RequestMapping("/api/menu")
public class MenuController {

    private static final Logger log = LoggerFactory.getLogger(MenuController.class);
    private final MealService mealService;

    public MenuController(MealService mealService) {
        this.mealService = mealService;
    }

    // Generate a menu based on user preferences
    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody MenuGenerateRequest req) {
        log.info("=== MENU GENERATE REQUEST ===");
        log.info("Protein Distribution: {}", req.getProteinDistribution());
        log.info("Days: {}", req.getDays());

        int days = (req.getDays() == null ? 7 : req.getDays());

        try {
            // Let the service handle the complex menu generation logic
            List<Meal> result = mealService.generateMenu(
                    req.getProteinDistribution(),
                    null, // cuisines not implemented yet
                    days
            );

            log.info("Generated {} meals", result.size());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.warn("Validation error: {}", e.getMessage());
            // Return a user-friendly error message instead of a generic 500 error
            return ResponseEntity.badRequest().body(
                Map.of("error", "Too many protein selections",
                       "message", e.getMessage())
            );
        }
    }
}
