package com.example.demo.repository;

import com.example.demo.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardRepository extends JpaRepository<Board, Long> {

    Optional<Board> findByUuid(UUID uuid);

    List<Board> findAllByOwnerId(Long ownerId);
}