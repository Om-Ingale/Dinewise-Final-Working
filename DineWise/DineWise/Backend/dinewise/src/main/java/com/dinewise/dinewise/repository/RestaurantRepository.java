package com.dinewise.dinewise.repository;

import com.dinewise.dinewise.entity.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    Optional<Restaurant> findByNameAndCity(String name, String city);
}