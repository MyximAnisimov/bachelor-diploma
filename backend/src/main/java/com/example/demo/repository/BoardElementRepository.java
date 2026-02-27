package com.example.demo.repository;

import com.example.demo.model.Board;
import com.example.demo.model.BoardElement;
import com.example.demo.model.ElementGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BoardElementRepository extends JpaRepository<BoardElement, Long> {

    List<BoardElement> findAllByBoard(Board board);

    List<BoardElement> findAllByGroup(ElementGroup group);

    @Query("select max(e.zIndex) from BoardElement e where e.board = :board")
    Integer findMaxZIndexByBoard(Board board);
}