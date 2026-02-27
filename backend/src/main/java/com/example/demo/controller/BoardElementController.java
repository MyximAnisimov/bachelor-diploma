package com.example.demo.controller;

import com.example.demo.dto.BoardElementCreateRequest;
import com.example.demo.dto.BoardElementDto;
import com.example.demo.dto.BoardElementUpdateRequest;
import com.example.demo.dto.CopyElementsRequest;
import com.example.demo.dto.CopyElementsResponse;
import com.example.demo.dto.ElementLockRequest;
import com.example.demo.dto.ElementTransformRequest;
import com.example.demo.dto.GroupElementsRequest;
import com.example.demo.dto.GroupElementsResponse;
import com.example.demo.dto.ReorderElementsRequest;
import com.example.demo.dto.UngroupElementsRequest;
import com.example.demo.service.BoardElementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/boards/{boardUuid}/elements")
@RequiredArgsConstructor
public class BoardElementController {

    private final BoardElementService boardElementService;

    @GetMapping
    public List<BoardElementDto> getElements(@PathVariable UUID boardUuid) {
        return boardElementService.getElementsByBoardUuid(boardUuid);
    }

    @PostMapping
    public BoardElementDto createElement(
            @PathVariable UUID boardUuid,
            @RequestBody @Valid BoardElementCreateRequest request
    ) {
        return boardElementService.createElement(boardUuid, request);
    }

    @PutMapping("/{elementId}")
    public BoardElementDto updateElement(
            @PathVariable UUID boardUuid,
            @PathVariable Long elementId,
            @RequestBody @Valid BoardElementUpdateRequest request
    ) {
        return boardElementService.updateElement(boardUuid, elementId, request);
    }

    @PatchMapping("/{elementId}/transform")
    public BoardElementDto transformElement(
            @PathVariable UUID boardUuid,
            @PathVariable Long elementId,
            @RequestBody @Valid ElementTransformRequest request
    ) {
        return boardElementService.transformElement(boardUuid, elementId, request);
    }

    @DeleteMapping("/{elementId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteElement(
            @PathVariable UUID boardUuid,
            @PathVariable Long elementId
    ) {
        boardElementService.deleteElement(boardUuid, elementId);
    }

    @PostMapping("/group")
    public GroupElementsResponse groupElements(
            @PathVariable UUID boardUuid,
            @RequestBody @Valid GroupElementsRequest request
    ) {
        return boardElementService.groupElements(boardUuid, request);
    }

    @PostMapping("/ungroup")
    public void ungroupElements(
            @PathVariable UUID boardUuid,
            @RequestBody @Valid UngroupElementsRequest request
    ) {
        boardElementService.ungroupElements(boardUuid, request);
    }

    @PatchMapping("/reorder")
    public void reorderElements(
            @PathVariable UUID boardUuid,
            @RequestBody @Valid ReorderElementsRequest request
    ) {
        boardElementService.reorderElements(boardUuid, request);
    }

    @PatchMapping("/{elementId}/lock")
    public BoardElementDto lockElement(
            @PathVariable UUID boardUuid,
            @PathVariable Long elementId,
            @RequestBody @Valid ElementLockRequest request
    ) {
        return boardElementService.updateLocks(boardUuid, elementId, request);
    }

    @PostMapping("/copy")
    public CopyElementsResponse copyElements(
            @PathVariable UUID boardUuid,
            @RequestBody @Valid CopyElementsRequest request
    ) {
        return boardElementService.copyElements(boardUuid, request);
    }
}
