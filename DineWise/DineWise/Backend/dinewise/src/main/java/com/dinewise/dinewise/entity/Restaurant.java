package com.dinewise.dinewise.entity;

import jakarta.persistence.*;

@Entity
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String city;

    private Double googleRating;
    private Double zomatoRating;
    private Double swiggyRating;
    private Double averageRating;

    public Restaurant() {}

    public Restaurant(String name, String city, Double googleRating, Double zomatoRating, Double swiggyRating, Double averageRating) {
        this.name = name;
        this.city = city;
        this.googleRating = googleRating;
        this.zomatoRating = zomatoRating;
        this.swiggyRating = swiggyRating;
        this.averageRating = averageRating;
    }

    public Long getId() { return id; }

    public String getName() { return name; }
    public String getCity() { return city; }
    public Double getGoogleRating() { return googleRating; }
    public Double getZomatoRating() { return zomatoRating; }
    public Double getSwiggyRating() { return swiggyRating; }
    public Double getAverageRating() { return averageRating; }

    public void setName(String name) { this.name = name; }
    public void setCity(String city) { this.city = city; }
    public void setGoogleRating(Double googleRating) { this.googleRating = googleRating; }
    public void setZomatoRating(Double zomatoRating) { this.zomatoRating = zomatoRating; }
    public void setSwiggyRating(Double swiggyRating) { this.swiggyRating = swiggyRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
}