package com.example.meal;

import com.example.meal.service.MealService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MealsController {

    private final MealService mealService;

    public MealsController(MealService mealService) {
        this.mealService = mealService;
    }

    // /api/filters  -> { proteins:[], cuisines:[] }
    @GetMapping("/filters")
    public Map<String, List<String>> getFilters() {
        return mealService.getFilterOptions();
    }

    // Optional CRUD (used by your Add/Update later)
    @GetMapping("/meals")
    public List<Meal> getAllMeals() { return mealService.getAllMeals(); }

    @GetMapping("/meals/{id}")
    public ResponseEntity<Meal> getMeal(@PathVariable Long id) {
        Meal m = mealService.getMealById(id);
        return (m == null) ? ResponseEntity.notFound().build() : ResponseEntity.ok(m);
    }

    @PostMapping("/meals")
    public ResponseEntity<Meal> createMeal(@RequestBody Meal meal) {
        return ResponseEntity.ok(mealService.addMeal(meal));
    }

    @PutMapping("/meals/{id}")
    public ResponseEntity<Meal> updateMeal(@PathVariable Long id, @RequestBody Meal meal) {
        meal.setId(id);
        return ResponseEntity.ok(mealService.updateMeal(meal));
    }

    @DeleteMapping("/meals/{id}")
    public ResponseEntity<Void> deleteMeal(@PathVariable Long id) {
        mealService.deleteMeal(id);
        return ResponseEntity.noContent().build();
    }
}
