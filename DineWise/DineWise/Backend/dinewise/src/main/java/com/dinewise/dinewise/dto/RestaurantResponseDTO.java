package com.dinewise.dinewise.dto;

public class RestaurantResponseDTO {

    private String name;
    private Double googleRating;
    private Double zomatoRating;
    private Double swiggyRating;
    private Double averageRating;

    public RestaurantResponseDTO() {}

    public RestaurantResponseDTO(String name, Double googleRating, Double zomatoRating, Double swiggyRating, Double averageRating) {
        this.name = name;
        this.googleRating = googleRating;
        this.zomatoRating = zomatoRating;
        this.swiggyRating = swiggyRating;
        this.averageRating = averageRating;
    }

    public String getName() { return name; }
    public Double getGoogleRating() { return googleRating; }
    public Double getZomatoRating() { return zomatoRating; }
    public Double getSwiggyRating() { return swiggyRating; }
    public Double getAverageRating() { return averageRating; }

    public void setName(String name) { this.name = name; }
    public void setGoogleRating(Double googleRating) { this.googleRating = googleRating; }
    public void setZomatoRating(Double zomatoRating) { this.zomatoRating = zomatoRating; }
    public void setSwiggyRating(Double swiggyRating) { this.swiggyRating = swiggyRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
}