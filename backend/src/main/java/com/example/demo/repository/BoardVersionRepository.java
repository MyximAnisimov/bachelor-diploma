package com.example.demo.repository;

import com.example.demo.model.BoardVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardVersionRepository extends JpaRepository<BoardVersion, Long> {

    List<BoardVersion> findByBoardIdOrderByCreatedAtDesc(Long boardId);
}
