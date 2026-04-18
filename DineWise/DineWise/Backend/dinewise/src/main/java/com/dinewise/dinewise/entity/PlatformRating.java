package com.dinewise.dinewise.entity;

import com.dinewise.dinewise.enums.Platform;
import jakarta.persistence.*;

@Entity
public class PlatformRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Platform platform;

    private Double rating;
    private Double food;
    private Double ambience;
    private Double service;

    @ManyToOne
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    public PlatformRating() {}

    public PlatformRating(Platform platform, Double rating, Double food, Double ambience, Double service, Restaurant restaurant) {
        this.platform = platform;
        this.rating = rating;
        this.food = food;
        this.ambience = ambience;
        this.service = service;
        this.restaurant = restaurant;
    }

    public Long getId() { return id; }
    public Platform getPlatform() { return platform; }
    public Double getRating() { return rating; }
    public Double getFood() { return food; }
    public Double getAmbience() { return ambience; }
    public Double getService() { return service; }
    public Restaurant getRestaurant() { return restaurant; }

    public void setPlatform(Platform platform) { this.platform = platform; }
    public void setRating(Double rating) { this.rating = rating; }
    public void setFood(Double food) { this.food = food; }
    public void setAmbience(Double ambience) { this.ambience = ambience; }
    public void setService(Double service) { this.service = service; }
    public void setRestaurant(Restaurant restaurant) { this.restaurant = restaurant; }
}