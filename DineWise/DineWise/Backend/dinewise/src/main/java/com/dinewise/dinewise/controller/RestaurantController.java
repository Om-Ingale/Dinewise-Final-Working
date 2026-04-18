package com.dinewise.dinewise.controller;

import com.dinewise.dinewise.dto.CompareResponseDTO;
import com.dinewise.dinewise.dto.RestaurantResponseDTO;
import com.dinewise.dinewise.service.RestaurantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/restaurants")
public class RestaurantController {

    @Autowired
    private RestaurantService restaurantService;

    @GetMapping("/search")
    public RestaurantResponseDTO search(
            @RequestParam String name,
            @RequestParam(required = false) String city
    ) {
        return restaurantService.getRatings(name, city);
    }

    @GetMapping("/compare")
    public Object compare(
            @RequestParam String name1,
            @RequestParam String name2,
            @RequestParam(required = false) String city
    ) {

        RestaurantResponseDTO r1 = restaurantService.getRatings(name1, city);
        RestaurantResponseDTO r2 = restaurantService.getRatings(name2, city);

        CompareResponseDTO c1 = restaurantService.generateCategoryRatings(name1, r1.getAverageRating());
        CompareResponseDTO c2 = restaurantService.generateCategoryRatings(name2, r2.getAverageRating());

        return new Object() {
            public CompareResponseDTO restaurant1 = c1;
            public CompareResponseDTO restaurant2 = c2;
        };
    }
}