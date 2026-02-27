package com.example.demo.repository;

import com.example.demo.model.Board;
import com.example.demo.model.ElementGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ElementGroupRepository extends JpaRepository<ElementGroup, Long> {

    Optional<ElementGroup> findByUuidAndBoardUuid(UUID groupUuid, UUID boardUuid);
}
