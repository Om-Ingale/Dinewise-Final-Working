package com.dinewise.dinewise.dto;

import jakarta.validation.constraints.NotBlank;

public class RestaurantRequestDTO {

    @NotBlank
    private String name;

    private String city;

    public RestaurantRequestDTO() {}

    public String getName() { return name; }
    public String getCity() { return city; }

    public void setName(String name) { this.name = name; }
    public void setCity(String city) { this.city = city; }
}