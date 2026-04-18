package com.dinewise.dinewise.service;

import com.dinewise.dinewise.dto.CompareResponseDTO;
import com.dinewise.dinewise.dto.RestaurantResponseDTO;
import com.dinewise.dinewise.entity.Restaurant;
import com.dinewise.dinewise.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class RestaurantService {

    @Autowired
    private GooglePlacesService googlePlacesService;

    @Autowired
    private SerpApiService serpApiService;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private ExternalRatingService externalRatingService;

    public RestaurantResponseDTO getRatings(String name, String city) {

        Optional<Restaurant> existing = restaurantRepository.findByNameAndCity(name, city);

        if (existing.isPresent()) {
            Restaurant r = existing.get();
            return new RestaurantResponseDTO(
                    r.getName(),
                    r.getGoogleRating(),
                    r.getZomatoRating(),
                    r.getSwiggyRating(),
                    r.getAverageRating()
            );
        }

        String query = (city != null && !city.isEmpty())
                ? name + " " + city
                : name;

        Double google = googlePlacesService.getGoogleRating(query);
        Double zomato = serpApiService.getZomatoRating(query);
        Double swiggy = serpApiService.getSwiggyRating(query);

        zomato = fixMissing(zomato, google, swiggy);
        swiggy = fixMissing(swiggy, google, zomato);

        if (swiggy > 4.8) {
            swiggy = fixMissing(0.0, google, zomato);
        }

        double avg = calculateAverage(google, zomato, swiggy);

        google = round(google);
        zomato = round(zomato);
        swiggy = round(swiggy);
        avg = round(avg);

        Restaurant restaurant = new Restaurant(
                name,
                city,
                google,
                zomato,
                swiggy,
                avg
        );

        Restaurant saved = restaurantRepository.save(restaurant);

        externalRatingService.saveRatings(saved, query);

        return new RestaurantResponseDTO(name, google, zomato, swiggy, avg);
    }

    private Double fixMissing(Double value, Double a, Double b) {

        if (value != null && value > 0) return value;

        if (a != null && a > 0 && b != null && b > 0) {
            return (a + b) / 2;
        }

        if (a != null && a > 0) return a;
        if (b != null && b > 0) return b;

        return 0.0;
    }

    private double calculateAverage(Double g, Double z, Double s) {

        double sum = 0;
        int count = 0;

        if (g != null && g > 0) {
            sum += g;
            count++;
        }

        if (z != null && z > 0) {
            sum += z;
            count++;
        }

        if (s != null && s > 0) {
            sum += s;
            count++;
        }

        return count == 0 ? 0.0 : sum / count;
    }

    private Double round(Double val) {
        if (val == null) return 0.0;
        return Math.round(val * 10.0) / 10.0;
    }

    public CompareResponseDTO generateCategoryRatings(String name, Double base) {

        double food = round(base + randomOffset());
        double ambience = round(base - randomOffset());
        double service = round(base + (Math.random() - 0.5));

        return new CompareResponseDTO(name, food, ambience, service, round(base));
    }

    private double randomOffset() {
        return (Math.random() * 0.6);
    }
}