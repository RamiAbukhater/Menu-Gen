package com.example.meal;

public class Meal {
    private Long id;                 // DB: INT, map to Java Long
    private String name;
    private String protein;
    private String cuisine;
    private String cookTime;         // VARCHAR in DB
    private String cookMethod;
    private String source;

    public Meal() {}

    public Meal(Long id, String name, String protein, String cuisine,
                String cookTime, String cookMethod, String source) {
        this.id = id;
        this.name = name;
        this.protein = protein;
        this.cuisine = cuisine;
        this.cookTime = cookTime;
        this.cookMethod = cookMethod;
        this.source = source;
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProtein() { return protein; }
    public void setProtein(String protein) { this.protein = protein; }

    public String getCuisine() { return cuisine; }
    public void setCuisine(String cuisine) { this.cuisine = cuisine; }

    public String getCookTime() { return cookTime; }
    public void setCookTime(String cookTime) { this.cookTime = cookTime; }

    public String getCookMethod() { return cookMethod; }
    public void setCookMethod(String cookMethod) { this.cookMethod = cookMethod; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
