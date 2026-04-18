package com.dinewise.dinewise.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class GooglePlacesService {

    @Value("${google.places.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public Double getGoogleRating(String name) {

        try {
            String url = "https://maps.googleapis.com/maps/api/place/textsearch/json?query="
                    + name.replace(" ", "%20")
                    + "&key=" + apiKey;

            String response = restTemplate.getForObject(url, String.class);

            JSONObject json = new JSONObject(response);
            JSONArray results = json.getJSONArray("results");

            double bestRating = 0.0;

            for (int i = 0; i < results.length(); i++) {

                JSONObject place = results.getJSONObject(i);

                String placeName = place.optString("name", "").toLowerCase();

                if (placeName.contains(name.toLowerCase())) {
                    if (place.has("rating")) {
                        return place.getDouble("rating");
                    }
                }

                if (place.has("rating")) {
                    double rating = place.getDouble("rating");
                    if (rating > bestRating) {
                        bestRating = rating;
                    }
                }
            }

            return bestRating;

        } catch (Exception e) {
            return 0.0;
        }
    }
}