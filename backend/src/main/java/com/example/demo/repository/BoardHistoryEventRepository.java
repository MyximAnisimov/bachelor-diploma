package com.example.demo.repository;

import com.example.demo.model.BoardHistoryEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardHistoryEventRepository extends JpaRepository<BoardHistoryEvent, Long> {

}
