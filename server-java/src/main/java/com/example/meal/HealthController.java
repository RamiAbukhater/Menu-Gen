package com.example.meal;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:3000"}) // Next.js dev
public class HealthController {
  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "OK", "timestamp", Instant.now().toString());
  }
}
