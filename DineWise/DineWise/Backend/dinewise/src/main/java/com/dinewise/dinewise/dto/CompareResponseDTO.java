package com.dinewise.dinewise.dto;

public class CompareResponseDTO {

    private String name;
    private Double food;
    private Double ambience;
    private Double service;
    private Double overall;

    public CompareResponseDTO() {}

    public CompareResponseDTO(String name, Double food, Double ambience, Double service, Double overall) {
        this.name = name;
        this.food = food;
        this.ambience = ambience;
        this.service = service;
        this.overall = overall;
    }

    public String getName() { return name; }
    public Double getFood() { return food; }
    public Double getAmbience() { return ambience; }
    public Double getService() { return service; }
    public Double getOverall() { return overall; }
}