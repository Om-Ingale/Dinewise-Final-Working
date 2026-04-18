package com.dinewise.dinewise.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SerpApiService {

    @Value("${serp.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public Double getZomatoRating(String name) {
        return fetchRating(name + " zomato rating", "zomato");
    }

    public Double getSwiggyRating(String name) {
        return fetchRating(name + " swiggy rating", "swiggy");
    }

    private Double fetchRating(String query, String platform) {

        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);

            String url = "https://serpapi.com/search.json?q="
                    + encodedQuery
                    + "&api_key=" + apiKey;

            String response = restTemplate.getForObject(url, String.class);

            JSONObject json = new JSONObject(response);

            if (!json.has("organic_results")) {
                return 0.0;
            }

            JSONArray results = json.getJSONArray("organic_results");

            Pattern pattern = Pattern.compile("[3-5]\\.\\d");

            Double fallback = null;

            for (int i = 0; i < results.length(); i++) {

                JSONObject result = results.getJSONObject(i);

                String source = result.optString("source", "").toLowerCase();

                if (!source.contains(platform)) continue;

                if (result.has("rich_snippet")) {

                    JSONObject rich = result.getJSONObject("rich_snippet");

                    if (rich.has("top")) {

                        JSONObject top = rich.getJSONObject("top");

                        if (top.has("detected_extensions")) {

                            JSONObject ext = top.getJSONObject("detected_extensions");

                            if (ext.has("rating")) {

                                double rating = ext.getDouble("rating");

                                if (rating >= 3.0 && rating <= 4.8) {
                                    return rating;
                                }
                            }
                        }
                    }
                }

                String snippet = result.optString("snippet", "").toLowerCase();

                Matcher matcher = pattern.matcher(snippet);

                if (matcher.find()) {

                    double rating = Double.parseDouble(matcher.group());

                    if (rating >= 3.0 && rating <= 4.8) {
                        if (fallback == null) {
                            fallback = rating;
                        }
                    }
                }
            }

            return fallback != null ? fallback : 0.0;

        } catch (Exception e) {
            return 0.0;
        }
    }
}