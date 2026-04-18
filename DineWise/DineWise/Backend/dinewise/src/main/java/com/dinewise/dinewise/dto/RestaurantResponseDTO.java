package com.dinewise.dinewise.dto;

public class RestaurantResponseDTO {

    private String name;
    private Double googleRating;
    private Double zomatoRating;
    private Double swiggyRating;
    private Double averageRating;

    private java.util.List<String> zomatoReviews;
    private java.util.List<String> swiggyReviews;

    public RestaurantResponseDTO() {}

    public RestaurantResponseDTO(String name, Double googleRating, Double zomatoRating, Double swiggyRating, Double averageRating) {
        this.name = name;
        this.googleRating = googleRating;
        this.zomatoRating = zomatoRating;
        this.swiggyRating = swiggyRating;
        this.averageRating = averageRating;
        this.zomatoReviews = new java.util.ArrayList<>();
        this.swiggyReviews = new java.util.ArrayList<>();
    }

    public RestaurantResponseDTO(String name, Double googleRating, Double zomatoRating, Double swiggyRating, Double averageRating, java.util.List<String> zomatoReviews, java.util.List<String> swiggyReviews) {
        this.name = name;
        this.googleRating = googleRating;
        this.zomatoRating = zomatoRating;
        this.swiggyRating = swiggyRating;
        this.averageRating = averageRating;
        this.zomatoReviews = zomatoReviews;
        this.swiggyReviews = swiggyReviews;
    }

    public String getName() { return name; }
    public Double getGoogleRating() { return googleRating; }
    public Double getZomatoRating() { return zomatoRating; }
    public Double getSwiggyRating() { return swiggyRating; }
    public Double getAverageRating() { return averageRating; }
    public java.util.List<String> getZomatoReviews() { return zomatoReviews; }
    public java.util.List<String> getSwiggyReviews() { return swiggyReviews; }

    public void setName(String name) { this.name = name; }
    public void setGoogleRating(Double googleRating) { this.googleRating = googleRating; }
    public void setZomatoRating(Double zomatoRating) { this.zomatoRating = zomatoRating; }
    public void setSwiggyRating(Double swiggyRating) { this.swiggyRating = swiggyRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
    public void setZomatoReviews(java.util.List<String> zomatoReviews) { this.zomatoReviews = zomatoReviews; }
    public void setSwiggyReviews(java.util.List<String> swiggyReviews) { this.swiggyReviews = swiggyReviews; }
}