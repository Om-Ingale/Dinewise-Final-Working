package com.dinewise.dinewise.service;

import com.dinewise.dinewise.entity.PlatformRating;
import com.dinewise.dinewise.entity.Restaurant;
import com.dinewise.dinewise.enums.Platform;
import com.dinewise.dinewise.repository.PlatformRatingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ExternalRatingService {

    @Autowired
    private PlatformRatingRepository platformRatingRepository;

    @Autowired
    private GooglePlacesService googlePlacesService;

    @Autowired
    private SerpApiService serpApiService;

    public void saveRatings(Restaurant restaurant, String query) {

        Double google = googlePlacesService.getGoogleRating(query);
        Double zomato = serpApiService.getZomatoRating(query);
        Double swiggy = serpApiService.getSwiggyRating(query);

        savePlatform(Platform.GOOGLE, google, restaurant);
        savePlatform(Platform.ZOMATO, zomato, restaurant);
        savePlatform(Platform.SWIGGY, swiggy, restaurant);
    }

    private void savePlatform(Platform platform, Double base, Restaurant restaurant) {

        double food = round(base + randomOffset());
        double ambience = round(base - randomOffset());
        double service = round(base + (Math.random() - 0.5));

        PlatformRating pr = new PlatformRating(
                platform,
                base,
                food,
                ambience,
                service,
                restaurant
        );

        platformRatingRepository.save(pr);
    }

    private double randomOffset() {
        return Math.random() * 0.6;
    }

    private Double round(Double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}